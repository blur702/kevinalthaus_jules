import Redis, { RedisOptions } from 'ioredis';
import { databaseConfig } from './database';

export class RedisManager {
  private static instance: RedisManager;
  private client: Redis;
  private isConnected: boolean = false;

  private constructor() {}

  static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  async initialize(): Promise<Redis> {
    if (this.isConnected && this.client) {
      return this.client;
    }

    const options: RedisOptions = {
      ...databaseConfig.redis,
      
      // Advanced configuration for production
      enableAutoPipelining: true,
      lazyConnect: true,
      
      // Retry configuration
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      
      // Connection events
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        return err.message.includes(targetError);
      },
    };

    this.client = new Redis(options);

    // Set up event handlers
    this.setupEventHandlers();

    try {
      await this.client.ping();
      this.isConnected = true;
      console.log('Redis connection established successfully');
      return this.client;
    } catch (error) {
      console.error('Redis connection failed:', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      console.log('Redis connected');
      this.isConnected = true;
    });

    this.client.on('ready', () => {
      console.log('Redis ready for commands');
    });

    this.client.on('error', (error) => {
      console.error('Redis error:', error);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      console.log('Redis connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      console.log('Redis reconnecting...');
    });

    this.client.on('end', () => {
      console.log('Redis connection ended');
      this.isConnected = false;
    });
  }

  getClient(): Redis {
    if (!this.isConnected || !this.client) {
      throw new Error('Redis not initialized. Call initialize() first.');
    }
    return this.client;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const client = this.getClient();
    const serializedValue = JSON.stringify(value);
    
    if (ttl) {
      await client.setex(key, ttl, serializedValue);
    } else {
      await client.set(key, serializedValue);
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    const client = this.getClient();
    const value = await client.get(key);
    
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch {
      return value as unknown as T;
    }
  }

  async del(key: string): Promise<number> {
    const client = this.getClient();
    return await client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const client = this.getClient();
    const result = await client.exists(key);
    return result === 1;
  }

  async setex(key: string, seconds: number, value: any): Promise<void> {
    const client = this.getClient();
    const serializedValue = JSON.stringify(value);
    await client.setex(key, seconds, serializedValue);
  }

  async ttl(key: string): Promise<number> {
    const client = this.getClient();
    return await client.ttl(key);
  }

  async keys(pattern: string): Promise<string[]> {
    const client = this.getClient();
    return await client.keys(pattern);
  }

  async flushPattern(pattern: string): Promise<number> {
    const client = this.getClient();
    const keys = await client.keys(pattern);
    
    if (keys.length === 0) {
      return 0;
    }

    return await client.del(...keys);
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  // Cache helper methods
  async cacheQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
    ttl: number = 300 // 5 minutes default
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute query and cache result
    const result = await queryFn();
    await this.setex(key, ttl, result);
    
    return result;
  }

  generateCacheKey(prefix: string, ...params: (string | number)[]): string {
    return `${prefix}:${params.join(':')}`;
  }
}

export default RedisManager.getInstance();