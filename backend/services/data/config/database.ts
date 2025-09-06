import { DataSource, DataSourceOptions } from 'typeorm';
import { RedisOptions } from 'ioredis';

export interface DatabaseConfig {
  database: DataSourceOptions;
  redis: RedisOptions;
}

export const databaseConfig: DatabaseConfig = {
  database: {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'dataservice',
    
    // Connection pooling optimized for production
    extra: {
      connectionLimit: 20,
      acquireTimeout: 60000,
      timeout: 60000,
      reconnect: true,
      charset: 'utf8mb4_unicode_ci',
      
      // Connection pool configuration
      min: 2,
      max: 20,
      idle: 10000,
      acquire: 60000,
      evict: 1000,
      
      // Performance optimizations
      statement_timeout: 30000,
      query_timeout: 30000,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
      
      // SSL configuration for production
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false
    },
    
    // Entity and migration paths
    entities: ['dist/entities/*.js'],
    migrations: ['dist/migrations/*.js'],
    subscribers: ['dist/subscribers/*.js'],
    
    // Logging configuration
    logging: process.env.NODE_ENV === 'development' ? 'all' : ['error', 'warn'],
    logger: 'advanced-console',
    
    // Caching configuration
    cache: {
      type: 'redis',
      options: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_CACHE_DB || '1'),
      },
      duration: 30000, // 30 seconds default cache duration
    },
    
    // Schema synchronization (disable in production)
    synchronize: process.env.NODE_ENV !== 'production',
    dropSchema: false,
    
    // Performance settings
    maxQueryExecutionTime: 1000, // Log slow queries > 1s
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_SESSION_DB || '0'),
    
    // Connection settings
    connectTimeout: 10000,
    lazyConnect: true,
    keepAlive: 30000,
    
    // Retry configuration
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: 3,
    
    // Connection pool
    family: 4,
    keyPrefix: 'dataservice:',
  }
};

export class DatabaseManager {
  private static instance: DatabaseManager;
  private dataSource: DataSource;
  private isConnected: boolean = false;

  private constructor() {}

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  async initialize(): Promise<DataSource> {
    if (this.isConnected && this.dataSource?.isInitialized) {
      return this.dataSource;
    }

    this.dataSource = new DataSource(databaseConfig.database);
    
    try {
      await this.dataSource.initialize();
      this.isConnected = true;
      
      console.log('Database connection established successfully');
      
      // Set up connection event handlers
      this.setupConnectionHandlers();
      
      return this.dataSource;
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  }

  private setupConnectionHandlers(): void {
    // Monitor connection health
    setInterval(async () => {
      try {
        await this.dataSource.query('SELECT 1');
      } catch (error) {
        console.error('Database health check failed:', error);
        await this.reconnect();
      }
    }, 30000); // Check every 30 seconds
  }

  async reconnect(): Promise<void> {
    try {
      if (this.dataSource?.isInitialized) {
        await this.dataSource.destroy();
      }
      
      this.isConnected = false;
      await this.initialize();
    } catch (error) {
      console.error('Database reconnection failed:', error);
      throw error;
    }
  }

  getDataSource(): DataSource {
    if (!this.isConnected || !this.dataSource?.isInitialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.dataSource;
  }

  async close(): Promise<void> {
    if (this.dataSource?.isInitialized) {
      await this.dataSource.destroy();
      this.isConnected = false;
    }
  }
}

export default DatabaseManager.getInstance();