import { Router, Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, Options as ProxyOptions } from 'http-proxy-middleware';
import { serviceConfig } from '@/utils/config';
import { CustomRequest, ProxyConfig } from '@/types';
import { createCircuitBreaker, getCircuitBreaker } from '@/utils/circuit-breaker';
import { createContextLogger } from '@/utils/logger';
import { ServiceUnavailableError, TimeoutError } from '@/utils/errors';
import { authenticateToken, optionalAuth } from '@/middleware/auth';
import { authRateLimitMiddleware } from '@/middleware/rate-limit';

const router = Router();

// Create circuit breakers for each service
const createServiceProxy = (serviceName: string, config: typeof serviceConfig.auth) => {
  const logger = createContextLogger({
    correlationId: 'proxy-setup',
    method: 'SETUP',
    url: config.url,
    ip: 'internal',
  });

  // Proxy action wrapped with circuit breaker
  const proxyAction = async (req: Request, res: Response): Promise<void> => {
    return new Promise((resolve, reject) => {
      const customReq = req as CustomRequest;
      
      const proxyOptions: ProxyOptions = {
        target: config.url,
        changeOrigin: true,
        timeout: config.timeout,
        proxyTimeout: config.timeout,
        pathRewrite: {
          [`^${config.path}`]: '', // Remove the service prefix
        },
        
        // Add correlation ID to forwarded requests
        onProxyReq: (proxyReq, req, res) => {
          const customReq = req as CustomRequest;
          
          // Forward correlation ID
          proxyReq.setHeader('X-Correlation-ID', customReq.correlationId);
          proxyReq.setHeader('X-Request-ID', customReq.correlationId);
          
          // Forward user context if available
          if (customReq.user) {
            proxyReq.setHeader('X-User-ID', customReq.user.id);
            proxyReq.setHeader('X-User-Email', customReq.user.email);
            proxyReq.setHeader('X-User-Roles', JSON.stringify(customReq.user.roles));
            proxyReq.setHeader('X-Session-ID', customReq.user.sessionId);
          }
          
          // Forward real IP
          const forwarded = req.headers['x-forwarded-for'] as string;
          const realIp = req.headers['x-real-ip'] as string;
          const clientIp = forwarded?.split(',')[0] || realIp || req.ip || req.connection.remoteAddress;
          
          if (clientIp) {
            proxyReq.setHeader('X-Forwarded-For', clientIp);
            proxyReq.setHeader('X-Real-IP', clientIp);
          }

          logger.debug('Proxying request', {
            correlationId: customReq.correlationId,
            service: serviceName,
            method: req.method,
            path: req.path,
            target: config.url,
            userId: customReq.user?.id,
          });
        },

        // Handle successful proxy responses
        onProxyRes: (proxyRes, req, res) => {
          const customReq = req as CustomRequest;
          
          // Forward correlation ID in response
          res.setHeader('X-Correlation-ID', customReq.correlationId);
          res.setHeader('X-Request-ID', customReq.correlationId);
          
          // Add service identifier
          res.setHeader('X-Proxied-By', 'api-gateway');
          res.setHeader('X-Service', serviceName);

          logger.info('Proxy response received', {
            correlationId: customReq.correlationId,
            service: serviceName,
            statusCode: proxyRes.statusCode,
            responseTime: Date.now() - customReq.startTime,
          });

          resolve();
        },

        // Handle proxy errors
        onError: (err, req, res) => {
          const customReq = req as CustomRequest;
          
          logger.error('Proxy error occurred', err, {
            correlationId: customReq.correlationId,
            service: serviceName,
            target: config.url,
            method: req.method,
            path: req.path,
          });

          if (err.message.includes('timeout')) {
            reject(new TimeoutError(serviceName, config.timeout, customReq.correlationId));
          } else if (err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND')) {
            reject(new ServiceUnavailableError(
              `${serviceName} is currently unavailable`,
              customReq.correlationId
            ));
          } else {
            reject(err);
          }
        },
      };

      // Create proxy middleware
      const proxy = createProxyMiddleware(proxyOptions);
      proxy(req, res, (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  };

  // Create circuit breaker for this service
  const circuitBreaker = createCircuitBreaker(serviceName, config, proxyAction);

  // Return middleware that uses circuit breaker
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const customReq = req as CustomRequest;
    
    try {
      // Execute proxy action through circuit breaker
      await circuitBreaker.fire(req, res);
    } catch (error) {
      next(error);
    }
  };
};

// Auth service proxy - apply rate limiting for auth endpoints
router.use(
  '/auth/*',
  authRateLimitMiddleware,
  optionalAuth, // Optional auth for login/register endpoints
  createServiceProxy('auth-service', serviceConfig.auth)
);

// Data service proxy - requires authentication
router.use(
  '/data/*',
  authenticateToken,
  createServiceProxy('data-service', serviceConfig.data)
);

// File service proxy - requires authentication
router.use(
  '/files/*',
  authenticateToken,
  createServiceProxy('file-service', serviceConfig.files)
);

// External service proxy - requires authentication
router.use(
  '/external/*',
  authenticateToken,
  createServiceProxy('external-service', serviceConfig.external)
);

// Health check endpoint for proxy status
router.get('/proxy/health', (req: Request, res: Response) => {
  const customReq = req as CustomRequest;
  
  const services = Object.keys(serviceConfig).map(serviceName => {
    const breaker = getCircuitBreaker(`${serviceName}-service`);
    
    return {
      name: serviceName,
      status: breaker?.opened ? 'circuit-open' : 
              breaker?.halfOpen ? 'circuit-half-open' : 'healthy',
      stats: breaker?.stats || null,
    };
  });

  res.json({
    status: 'ok',
    correlationId: customReq.correlationId,
    services,
    timestamp: new Date().toISOString(),
  });
});

export default router;