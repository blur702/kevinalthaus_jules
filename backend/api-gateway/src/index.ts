import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { appConfig, isProduction } from '@/utils/config';
import { logger, createContextLogger } from '@/utils/logger';
import { corsMiddleware } from '@/middleware/cors';
import { correlationMiddleware } from '@/middleware/correlation';
import { rateLimitMiddleware } from '@/middleware/rate-limit';
import { errorHandler, notFoundHandler, setupGlobalErrorHandlers } from '@/middleware/error-handler';
import { setupGracefulShutdown, shutdownMiddleware } from '@/utils/graceful-shutdown';

// Import routes
import healthRoutes from '@/routes/health';
import proxyRoutes from '@/routes/proxy';

// Setup global error handlers
setupGlobalErrorHandlers();

// Create Express application
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// Compression middleware
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
}));

// Trust proxy for accurate client IP
app.set('trust proxy', 1);

// Remove powered by header
app.disable('x-powered-by');

// Request correlation middleware (must be first)
app.use(correlationMiddleware);

// Create graceful shutdown handler
let gracefulShutdown: any;

// Shutdown middleware to reject requests during shutdown
app.use((req, res, next) => {
  if (gracefulShutdown) {
    return shutdownMiddleware(gracefulShutdown)(req, res, next);
  }
  next();
});

// CORS middleware
app.use(corsMiddleware);

// Request logging
app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      logger.info(message.trim(), { component: 'http' });
    },
  },
  skip: (req) => {
    // Skip health check endpoints in production
    return isProduction() && (req.url === '/health' || req.url === '/live' || req.url === '/ready');
  },
}));

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for webhook verification if needed
    (req as any).rawBody = buf;
  },
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Rate limiting (apply globally)
app.use(rateLimitMiddleware);

// API routes
app.use('/', healthRoutes);
app.use('/', proxyRoutes);

// Root endpoint
app.get('/', (req, res) => {
  const customReq = req as any;
  
  res.json({
    service: 'Shell Platform API Gateway',
    version: process.env.npm_package_version || '1.0.0',
    environment: appConfig.nodeEnv,
    correlationId: customReq.correlationId,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    links: {
      health: '/health',
      ready: '/ready',
      status: '/status',
      docs: '/docs', // Future API documentation endpoint
    },
  });
});

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(appConfig.port, () => {
  const contextLogger = createContextLogger({
    correlationId: 'server-startup',
    method: 'STARTUP',
    url: `http://localhost:${appConfig.port}`,
    ip: 'localhost',
  });

  contextLogger.info('🚀 API Gateway server started successfully', {
    port: appConfig.port,
    environment: appConfig.nodeEnv,
    nodeVersion: process.version,
    pid: process.pid,
    timestamp: new Date().toISOString(),
  });

  // Setup graceful shutdown after server starts
  gracefulShutdown = setupGracefulShutdown(server, {
    timeout: 30000, // 30 seconds
    signals: ['SIGTERM', 'SIGINT'],
    onShutdown: async () => {
      const shutdownLogger = createContextLogger({
        correlationId: 'server-shutdown',
        method: 'SHUTDOWN',
        url: `http://localhost:${appConfig.port}`,
        ip: 'localhost',
      });

      shutdownLogger.info('Running custom shutdown procedures');

      // Add any custom cleanup logic here
      // e.g., close database connections, flush logs, etc.
      
      shutdownLogger.info('Custom shutdown procedures completed');
    },
  });

  // Log service configuration
  contextLogger.info('Service configuration loaded', {
    corsOrigins: appConfig.corsOrigins,
    rateLimitWindow: appConfig.rateLimitWindow,
    rateLimitRequests: appConfig.rateLimitRequests,
    circuitBreakerTimeout: appConfig.circuitBreakerTimeout,
    circuitBreakerThreshold: appConfig.circuitBreakerThreshold,
    logLevel: appConfig.logLevel,
  });
});

// Handle server errors
server.on('error', (error: NodeJS.ErrnoException) => {
  const contextLogger = createContextLogger({
    correlationId: 'server-error',
    method: 'ERROR',
    url: `http://localhost:${appConfig.port}`,
    ip: 'localhost',
  });

  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof appConfig.port === 'string' 
    ? `Pipe ${appConfig.port}` 
    : `Port ${appConfig.port}`;

  switch (error.code) {
    case 'EACCES':
      contextLogger.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      contextLogger.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      contextLogger.error('Server error occurred', error);
      throw error;
  }
});

// Handle server close
server.on('close', () => {
  const contextLogger = createContextLogger({
    correlationId: 'server-close',
    method: 'CLOSE',
    url: `http://localhost:${appConfig.port}`,
    ip: 'localhost',
  });

  contextLogger.info('HTTP server closed');
});

export default app;