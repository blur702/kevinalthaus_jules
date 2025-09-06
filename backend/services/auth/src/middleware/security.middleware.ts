import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { logger, SecurityEventType } from '../utils/logger.utils';
import { CryptoUtils } from '../utils/crypto.utils';
import { ValidationUtils } from '../utils/validation.utils';

// Initialize Redis client for rate limiting
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3
});

/**
 * Security headers middleware using Helmet
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameSrc: ["'none'"],
      sandbox: ['allow-forms', 'allow-scripts', 'allow-same-origin'],
      reportUri: process.env.CSP_REPORT_URI || '/api/csp-report',
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: parseInt(process.env.HSTS_MAX_AGE || '31536000'),
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true
});

/**
 * Rate limiter for general requests
 */
export const generalRateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rl:general:',
  points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000,
  blockDuration: 60,
  execEvenly: true
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authRateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rl:auth:',
  points: parseInt(process.env.RATE_LIMIT_LOGIN_MAX || '5'),
  duration: 900, // 15 minutes
  blockDuration: 1800, // 30 minutes
  execEvenly: false
});

/**
 * Rate limiting middleware wrapper
 */
export const rateLimitMiddleware = (limiter: RateLimiterRedis, customKey?: (req: Request) => string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = customKey ? customKey(req) : req.ip || 'unknown';
      
      await limiter.consume(key);
      
      next();
    } catch (rejRes: any) {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 60;
      
      logger.logSecurityEvent({
        type: SecurityEventType.RATE_LIMIT_EXCEEDED,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        details: {
          path: req.path,
          method: req.method,
          remainingPoints: rejRes.remainingPoints || 0,
          retryAfterSeconds: secs
        }
      });

      res.set({
        'Retry-After': String(secs),
        'X-RateLimit-Limit': String(limiter.points),
        'X-RateLimit-Remaining': String(rejRes.remainingPoints || 0),
        'X-RateLimit-Reset': new Date(Date.now() + rejRes.msBeforeNext).toISOString()
      });

      res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: secs
      });
    }
  };
};

/**
 * Slowdown middleware for gradual rate limiting
 */
export const slowDownMiddleware = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Start slowing down after 50 requests
  delayMs: (hits) => hits * 100, // Add 100ms delay per request after threshold
  maxDelayMs: 5000, // Maximum delay of 5 seconds
  skipSuccessfulRequests: true,
  keyGenerator: (req) => req.ip || 'unknown'
});

/**
 * Input sanitization middleware
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Sanitize query parameters
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        const value = req.query[key] as string;
        
        // Check for SQL injection
        if (ValidationUtils.containsSQLInjectionPatterns(value)) {
          logger.logSecurityEvent({
            type: SecurityEventType.SQL_INJECTION_ATTEMPT,
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('user-agent') || 'unknown',
            details: {
              field: `query.${key}`,
              value: CryptoUtils.maskSensitiveData(value),
              path: req.path
            }
          });

          res.status(400).json({
            error: 'Invalid input detected',
            code: 'INVALID_INPUT'
          });
          return;
        }

        // Sanitize XSS
        req.query[key] = ValidationUtils.sanitizeInput(value);
      }
    }
  }

  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    const sanitizeObject = (obj: any): any => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          // Check for SQL injection
          if (ValidationUtils.containsSQLInjectionPatterns(obj[key])) {
            logger.logSecurityEvent({
              type: SecurityEventType.SQL_INJECTION_ATTEMPT,
              ipAddress: req.ip || 'unknown',
              userAgent: req.get('user-agent') || 'unknown',
              details: {
                field: `body.${key}`,
                value: CryptoUtils.maskSensitiveData(obj[key]),
                path: req.path
              }
            });

            res.status(400).json({
              error: 'Invalid input detected',
              code: 'INVALID_INPUT'
            });
            return false;
          }

          // Check for NoSQL injection
          if (ValidationUtils.containsNoSQLInjectionPatterns(obj[key])) {
            logger.logSecurityEvent({
              type: SecurityEventType.XSS_ATTEMPT,
              ipAddress: req.ip || 'unknown',
              userAgent: req.get('user-agent') || 'unknown',
              details: {
                field: `body.${key}`,
                value: CryptoUtils.maskSensitiveData(obj[key]),
                path: req.path
              }
            });

            res.status(400).json({
              error: 'Invalid input detected',
              code: 'INVALID_INPUT'
            });
            return false;
          }

          // Sanitize the input
          obj[key] = ValidationUtils.sanitizeInput(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          if (!sanitizeObject(obj[key])) {
            return false;
          }
        }
      }
      return true;
    };

    if (!sanitizeObject(req.body)) {
      return;
    }
  }

  next();
};

/**
 * CORS configuration with security in mind
 */
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.logSecurityEvent({
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        ipAddress: 'unknown',
        userAgent: 'unknown',
        details: {
          reason: 'CORS violation',
          origin,
          allowedOrigins
        }
      });
      
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 204
};

/**
 * Request size limiting
 */
export const requestSizeLimit = {
  json: '1mb',
  urlencoded: { extended: true, limit: '1mb' }
};

/**
 * Security monitoring middleware
 */
export const securityMonitoring = (req: Request, res: Response, next: NextFunction): void => {
  // Add request ID for tracking
  const requestId = req.get('X-Request-ID') || CryptoUtils.generateNonce();
  res.set('X-Request-ID', requestId);

  // Monitor suspicious patterns
  const userAgent = req.get('user-agent') || '';
  const suspiciousAgents = ['sqlmap', 'nikto', 'scanner', 'nessus', 'metasploit'];
  
  if (suspiciousAgents.some(agent => userAgent.toLowerCase().includes(agent))) {
    logger.logSecurityEvent({
      type: SecurityEventType.SUSPICIOUS_ACTIVITY,
      ipAddress: req.ip || 'unknown',
      userAgent,
      details: {
        reason: 'Suspicious user agent detected',
        path: req.path,
        requestId
      }
    });
  }

  // Track request timing
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.logPerformance(
      `${req.method} ${req.path}`,
      duration,
      {
        statusCode: res.statusCode,
        requestId
      }
    );
  });

  next();
};

/**
 * IP whitelist/blacklist middleware
 */
export const ipFilter = (whitelist: string[] = [], blacklist: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIp = req.ip || 'unknown';
    
    // Check blacklist first
    if (blacklist.length > 0 && blacklist.includes(clientIp)) {
      logger.logSecurityEvent({
        type: SecurityEventType.PERMISSION_DENIED,
        ipAddress: clientIp,
        userAgent: req.get('user-agent') || 'unknown',
        details: {
          reason: 'IP blacklisted',
          path: req.path
        }
      });
      
      res.status(403).json({
        error: 'Access denied',
        code: 'IP_BLOCKED'
      });
      return;
    }
    
    // Check whitelist if configured
    if (whitelist.length > 0 && !whitelist.includes(clientIp)) {
      logger.logSecurityEvent({
        type: SecurityEventType.PERMISSION_DENIED,
        ipAddress: clientIp,
        userAgent: req.get('user-agent') || 'unknown',
        details: {
          reason: 'IP not whitelisted',
          path: req.path
        }
      });
      
      res.status(403).json({
        error: 'Access denied',
        code: 'IP_NOT_ALLOWED'
      });
      return;
    }
    
    next();
  };
};