import 'reflect-metadata';
import express, { Application, Request, Response, NextFunction } from 'express';
import { createConnection } from 'typeorm';
import cors from 'cors';
import session from 'express-session';
import connectRedis from 'connect-redis';
import Redis from 'ioredis';
import { 
  securityHeaders, 
  corsOptions, 
  rateLimitMiddleware,
  generalRateLimiter,
  authRateLimiter,
  sanitizeInput,
  securityMonitoring,
  requestSizeLimit
} from './middleware/security.middleware';
import { authenticate, authorize, optionalAuth } from './middleware/auth.middleware';
import { AuthController } from './controllers/auth.controller';
import { logger } from './utils/logger.utils';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Express application
const app: Application = express();
const PORT = process.env.PORT || 3001;

// Redis client for sessions
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0')
});

// Configure session store
const RedisStore = connectRedis(session);
const sessionConfig: session.SessionOptions = {
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || 'change-this-secret-in-production',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: parseInt(process.env.COOKIE_MAX_AGE || '86400000'),
    sameSite: 'strict'
  },
  name: 'sessionId'
};

/**
 * Initialize database connection
 */
async function initializeDatabase(): Promise<void> {
  try {
    await createConnection({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'auth_user',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE || 'auth_db',
      entities: [__dirname + '/models/*.model.{js,ts}'],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      extra: {
        max: parseInt(process.env.DB_POOL_SIZE || '20'),
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '20000'),
        idleTimeoutMillis: 10000
      }
    });
    
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Database connection failed', error);
    process.exit(1);
  }
}

/**
 * Configure middleware
 */
function configureMiddleware(): void {
  // Security headers
  app.use(securityHeaders);
  
  // CORS
  app.use(cors(corsOptions));
  
  // Body parsing with size limits
  app.use(express.json({ limit: requestSizeLimit.json }));
  app.use(express.urlencoded(requestSizeLimit.urlencoded));
  
  // Session management
  app.use(session(sessionConfig));
  
  // Security monitoring
  app.use(securityMonitoring);
  
  // Input sanitization
  app.use(sanitizeInput);
  
  // General rate limiting
  app.use(rateLimitMiddleware(generalRateLimiter));
  
  // Trust proxy for accurate IP addresses
  app.set('trust proxy', 1);
}

/**
 * Configure routes
 */
function configureRoutes(): void {
  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({ 
      status: 'healthy', 
      service: 'auth-service',
      timestamp: new Date().toISOString()
    });
  });

  // Public authentication routes with strict rate limiting
  app.post('/api/auth/register', 
    rateLimitMiddleware(authRateLimiter, req => req.ip + ':register'),
    AuthController.register
  );
  
  app.post('/api/auth/login',
    rateLimitMiddleware(authRateLimiter, req => req.ip + ':login'),
    AuthController.login
  );
  
  app.post('/api/auth/logout',
    authenticate,
    AuthController.logout
  );
  
  app.post('/api/auth/refresh',
    rateLimitMiddleware(authRateLimiter, req => req.ip + ':refresh'),
    (req, res) => {
      // Implement refresh token logic
      res.json({ message: 'Token refresh endpoint - to be implemented' });
    }
  );
  
  app.post('/api/auth/verify-email',
    (req, res) => {
      // Implement email verification logic
      res.json({ message: 'Email verification endpoint - to be implemented' });
    }
  );
  
  app.post('/api/auth/forgot-password',
    rateLimitMiddleware(authRateLimiter, req => req.ip + ':password-reset'),
    (req, res) => {
      // Implement forgot password logic
      res.json({ message: 'Forgot password endpoint - to be implemented' });
    }
  );
  
  app.post('/api/auth/reset-password',
    rateLimitMiddleware(authRateLimiter, req => req.ip + ':password-reset'),
    (req, res) => {
      // Implement reset password logic
      res.json({ message: 'Reset password endpoint - to be implemented' });
    }
  );

  // Protected routes
  app.get('/api/auth/profile',
    authenticate,
    (req, res) => {
      res.json({ message: 'Profile endpoint - to be implemented' });
    }
  );
  
  app.put('/api/auth/profile',
    authenticate,
    (req, res) => {
      res.json({ message: 'Update profile endpoint - to be implemented' });
    }
  );

  // 2FA routes
  app.post('/api/auth/2fa/setup',
    authenticate,
    (req, res) => {
      res.json({ message: '2FA setup endpoint - to be implemented' });
    }
  );
  
  app.post('/api/auth/2fa/verify',
    authenticate,
    (req, res) => {
      res.json({ message: '2FA verify endpoint - to be implemented' });
    }
  );
  
  app.post('/api/auth/2fa/disable',
    authenticate,
    (req, res) => {
      res.json({ message: '2FA disable endpoint - to be implemented' });
    }
  );

  // Admin routes
  app.get('/api/admin/users',
    authenticate,
    authorize('admin'),
    (req, res) => {
      res.json({ message: 'Admin users endpoint - to be implemented' });
    }
  );

  // CSP violation reporting endpoint
  app.post('/api/csp-report', express.json({ type: 'application/csp-report' }), (req, res) => {
    logger.warn('CSP Violation', req.body);
    res.status(204).end();
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: 'The requested resource does not exist',
      path: req.path
    });
  });

  // Error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled error', err, {
      path: req.path,
      method: req.method,
      ip: req.ip
    });

    // Don't leak error details in production
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
      });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: err.message,
        stack: err.stack
      });
    }
  });
}

/**
 * Graceful shutdown handler
 */
function setupGracefulShutdown(): void {
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, starting graceful shutdown`);
    
    try {
      // Close server
      server.close(() => {
        logger.info('HTTP server closed');
      });
      
      // Close Redis connection
      await redisClient.quit();
      logger.info('Redis connection closed');
      
      // Flush logs
      await logger.flush();
      
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', error);
    shutdown('uncaughtException');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', { reason, promise });
    shutdown('unhandledRejection');
  });
}

/**
 * Start the application
 */
async function startApplication(): Promise<void> {
  try {
    // Initialize database
    await initializeDatabase();
    
    // Configure middleware
    configureMiddleware();
    
    // Configure routes
    configureRoutes();
    
    // Setup graceful shutdown
    setupGracefulShutdown();
    
    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`Auth service started on port ${PORT}`, {
        environment: process.env.NODE_ENV,
        nodeVersion: process.version,
        pid: process.pid
      });
      
      // Log security configuration
      logger.info('Security configuration', {
        bcryptRounds: process.env.BCRYPT_ROUNDS,
        sessionTimeout: process.env.COOKIE_MAX_AGE,
        rateLimitWindow: process.env.RATE_LIMIT_WINDOW_MS,
        maxLoginAttempts: process.env.MAX_LOGIN_ATTEMPTS,
        corsOrigin: process.env.CORS_ORIGIN,
        httpsOnly: process.env.NODE_ENV === 'production'
      });
    });
    
    // Store server reference for graceful shutdown
    (global as any).server = server;
    
  } catch (error) {
    logger.error('Failed to start application', error);
    process.exit(1);
  }
}

// Start the application
startApplication();

// Export app for testing
export default app;