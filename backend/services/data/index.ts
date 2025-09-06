import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createDataServiceRoutes } from './routes';
import DatabaseManager from './config/database';
import RedisManager from './config/redis';
import { handleError } from './middleware/error.middleware';

export class DataService {
  private app: Express;
  private port: number;
  private databaseManager: typeof DatabaseManager;
  private redisManager: typeof RedisManager;

  constructor(port: number = 3000) {
    this.app = express();
    this.port = port;
    this.databaseManager = DatabaseManager;
    this.redisManager = RedisManager;
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
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

    // CORS configuration
    this.app.use(cors({
      origin: this.getAllowedOrigins(),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-Tenant-ID',
        'X-Request-ID',
        'If-Match',
        'If-None-Match',
      ],
      exposedHeaders: [
        'ETag',
        'X-Cache',
        'X-Cache-Key',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
        'X-Quota-Limit',
        'X-Quota-Used',
        'X-Quota-Remaining',
      ],
    }));

    // Body parsing middleware
    this.app.use(express.json({ 
      limit: '10mb',
      strict: true,
    }));
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: '10mb',
    }));

    // Compression middleware
    this.app.use(compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      threshold: 1024, // Only compress responses > 1KB
    }));

    // Request logging middleware
    this.app.use((req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(
          `${req.method} ${req.path} ${res.statusCode} - ${duration}ms - ${req.ip}`
        );
      });

      next();
    });

    // Health check middleware (before other routes)
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
      });
    });
  }

  private setupRoutes(): void {
    // Mount the main data service routes
    this.app.use('/api/data', createDataServiceRoutes());

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Data Service API',
        version: '1.0.0',
        description: 'Production-ready data service with CRUD operations and advanced features',
        endpoints: {
          api: '/api/data',
          health: '/health',
          docs: '/api/data/docs',
        },
        features: [
          'Multi-tenancy support',
          'Field-level permissions',
          'Audit trail',
          'Query optimization',
          'Response caching with Redis',
          'Connection pooling',
          'Bulk operations',
          'Advanced search',
          'Soft deletes for GDPR compliance',
          'ETags for caching',
          'Rate limiting',
          'API quota management',
        ],
        timestamp: new Date().toISOString(),
      });
    });
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use(handleError());
  }

  private getAllowedOrigins(): string[] {
    const origins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    
    // Add common development origins
    if (process.env.NODE_ENV === 'development') {
      origins.push(
        'http://localhost:3001',
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001'
      );
    }

    return origins;
  }

  public async start(): Promise<void> {
    try {
      // Initialize database connection
      console.log('Initializing database connection...');
      await this.databaseManager.initialize();
      
      // Initialize Redis connection
      console.log('Initializing Redis connection...');
      await this.redisManager.initialize();

      // Start the server
      this.app.listen(this.port, () => {
        console.log(`🚀 Data Service running on port ${this.port}`);
        console.log(`📚 API Documentation: http://localhost:${this.port}/api/data/docs`);
        console.log(`🔍 Health Check: http://localhost:${this.port}/health`);
        console.log(`📊 Cache Stats: http://localhost:${this.port}/api/data/cache/stats`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      });

      // Graceful shutdown handling
      this.setupGracefulShutdown();

    } catch (error) {
      console.error('Failed to start Data Service:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);

      try {
        // Close database connections
        await this.databaseManager.close();
        console.log('Database connections closed.');

        // Close Redis connections
        await this.redisManager.close();
        console.log('Redis connections closed.');

        console.log('Graceful shutdown completed.');
        process.exit(0);
      } catch (error) {
        console.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });
  }

  public getApp(): Express {
    return this.app;
  }
}

// Export for use in other modules
export default DataService;

// Export all the main components for modular use
export { createDataServiceRoutes } from './routes';
export { ResourceService } from './services/resource.service';
export { ResourceRepository } from './repositories/resource.repository';
export { ResourceController } from './controllers/resource.controller';
export { Resource } from './entities/sample-resource.entity';
export { BaseEntity } from './entities/base.entity';
export { AuditLog } from './entities/audit-log.entity';
export { DatabaseManager } from './config/database';
export { RedisManager } from './config/redis';

// For direct execution
if (require.main === module) {
  const port = parseInt(process.env.PORT || '3000');
  const dataService = new DataService(port);
  dataService.start();
}