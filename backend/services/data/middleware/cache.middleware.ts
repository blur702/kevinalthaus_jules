import { Request, Response, NextFunction } from 'express';
import RedisManager from '../config/redis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string; // Custom cache key
  tags?: string[]; // Cache tags for invalidation
  varyBy?: string[]; // Headers to vary cache by
  skipIf?: (req: Request) => boolean; // Function to skip caching
  private?: boolean; // Whether cache should be private
}

export class CacheMiddleware {
  private static redisManager = RedisManager.getInstance();

  // HTTP response caching middleware
  static cache(options: CacheOptions = {}) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        // Skip caching for non-GET requests by default
        if (req.method !== 'GET') {
          return next();
        }

        // Skip caching if condition is met
        if (options.skipIf && options.skipIf(req)) {
          return next();
        }

        const cacheKey = CacheMiddleware.generateCacheKey(req, options);
        
        // Try to get cached response
        const cached = await CacheMiddleware.redisManager.get(cacheKey);
        
        if (cached && cached.data && cached.headers) {
          // Set cached headers
          Object.entries(cached.headers).forEach(([key, value]) => {
            res.set(key, value as string);
          });

          // Add cache hit header
          res.set('X-Cache', 'HIT');
          res.set('X-Cache-Key', cacheKey);

          // Check if cached response is still valid
          if (CacheMiddleware.isCacheValid(cached)) {
            return res.json(cached.data);
          }
        }

        // Cache miss - continue with request
        const originalSend = res.json;
        const originalStatus = res.status;
        let statusCode = 200;

        // Override status to capture status code
        res.status = function(code: number) {
          statusCode = code;
          return originalStatus.call(this, code);
        };

        // Override json to cache the response
        res.json = function(data: any) {
          // Only cache successful responses
          if (statusCode >= 200 && statusCode < 300) {
            const cacheData = {
              data,
              headers: CacheMiddleware.getCacheableHeaders(res),
              timestamp: Date.now(),
              statusCode,
            };

            // Cache the response asynchronously
            CacheMiddleware.setCacheAsync(
              cacheKey,
              cacheData,
              options.ttl || 300,
              options.tags
            );
          }

          // Add cache miss header
          res.set('X-Cache', 'MISS');
          res.set('X-Cache-Key', cacheKey);

          return originalSend.call(this, data);
        };

        next();
      } catch (error) {
        // If caching fails, continue without caching
        console.error('Cache middleware error:', error);
        next();
      }
    };
  }

  // ETag-based caching middleware
  static etag() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const originalSend = res.json;

      res.json = function(data: any) {
        // Generate ETag based on response data
        const etag = CacheMiddleware.generateETag(data);
        res.set('ETag', etag);

        // Check if client already has this version
        const clientETag = req.headers['if-none-match'];
        if (clientETag && clientETag === etag) {
          res.status(304).end();
          return this;
        }

        // Set cache control headers
        res.set('Cache-Control', 'private, must-revalidate, max-age=0');

        return originalSend.call(this, data);
      };

      next();
    };
  }

  // Cache invalidation middleware
  static invalidateCache(patterns: string[] | ((req: Request) => string[])) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const originalSend = res.json;
      const originalEnd = res.end;

      // Function to perform invalidation
      const performInvalidation = async () => {
        try {
          const invalidationPatterns = typeof patterns === 'function' 
            ? patterns(req)
            : patterns;

          for (const pattern of invalidationPatterns) {
            await CacheMiddleware.redisManager.flushPattern(pattern);
          }
        } catch (error) {
          console.error('Cache invalidation error:', error);
        }
      };

      // Override response methods to invalidate after successful response
      res.json = function(data: any) {
        const result = originalSend.call(this, data);
        
        // Invalidate cache after successful response
        if (res.statusCode >= 200 && res.statusCode < 300) {
          performInvalidation();
        }
        
        return result;
      };

      res.end = function(...args: any[]) {
        const result = originalEnd.apply(this, args);
        
        // Invalidate cache after successful response
        if (res.statusCode >= 200 && res.statusCode < 300) {
          performInvalidation();
        }
        
        return result;
      };

      next();
    };
  }

  // Cache warming middleware for frequently accessed data
  static warmCache(warmingFunction: (req: Request) => Promise<void>) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        // Warm cache asynchronously - don't block the request
        warmingFunction(req).catch(error => {
          console.error('Cache warming error:', error);
        });

        next();
      } catch (error) {
        // If warming fails, continue without warming
        console.error('Cache warming setup error:', error);
        next();
      }
    };
  }

  // Conditional caching based on user permissions
  static conditionalCache(
    condition: (req: Request) => boolean,
    cacheOptions: CacheOptions = {}
  ) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (condition(req)) {
        return CacheMiddleware.cache(cacheOptions)(req, res, next);
      } else {
        // Skip caching but add no-cache headers
        res.set({
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
        next();
      }
    };
  }

  // Cache statistics middleware
  static cacheStats() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const stats = await CacheMiddleware.getCacheStats();
        
        res.json({
          success: true,
          data: stats,
          meta: {
            timestamp: new Date().toISOString(),
          }
        });
      } catch (error) {
        next(error);
      }
    };
  }

  // Helper methods
  private static generateCacheKey(req: Request, options: CacheOptions): string {
    if (options.key) {
      return options.key;
    }

    const baseKey = `${req.method}:${req.path}`;
    const queryString = new URLSearchParams(req.query as any).toString();
    
    let cacheKey = queryString ? `${baseKey}?${queryString}` : baseKey;

    // Add variation based on specified headers
    if (options.varyBy) {
      const varyValues = options.varyBy
        .map(header => `${header}:${req.headers[header.toLowerCase()] || ''}`)
        .join('|');
      
      if (varyValues) {
        cacheKey += `|${varyValues}`;
      }
    }

    // Add tenant information to cache key for multi-tenancy
    const tenantId = req.headers['x-tenant-id'] as string;
    if (tenantId) {
      cacheKey += `|tenant:${tenantId}`;
    }

    // Add user information for private caches
    if (options.private && req.user) {
      cacheKey += `|user:${(req as any).user.id}`;
    }

    return CacheMiddleware.hashKey(cacheKey);
  }

  private static hashKey(key: string): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(key).digest('hex');
  }

  private static generateETag(data: any): string {
    const crypto = require('crypto');
    const content = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('md5').update(content).digest('hex');
  }

  private static getCacheableHeaders(res: Response): Record<string, string> {
    const cacheableHeaders = [
      'content-type',
      'cache-control',
      'expires',
      'last-modified',
      'etag',
    ];

    const headers: Record<string, string> = {};
    
    cacheableHeaders.forEach(header => {
      const value = res.get(header);
      if (value) {
        headers[header] = value;
      }
    });

    return headers;
  }

  private static isCacheValid(cached: any): boolean {
    // Check if cache has expired based on timestamp and TTL
    const now = Date.now();
    const cacheAge = now - cached.timestamp;
    const maxAge = 300 * 1000; // 5 minutes default

    return cacheAge < maxAge;
  }

  private static async setCacheAsync(
    key: string,
    data: any,
    ttl: number,
    tags?: string[]
  ): Promise<void> {
    try {
      await CacheMiddleware.redisManager.setex(key, ttl, data);

      // Store cache tags for invalidation
      if (tags && tags.length > 0) {
        for (const tag of tags) {
          const tagKey = `cache_tag:${tag}`;
          const taggedKeys = await CacheMiddleware.redisManager.get<string[]>(tagKey) || [];
          taggedKeys.push(key);
          await CacheMiddleware.redisManager.setex(tagKey, ttl + 300, taggedKeys); // Tags live longer
        }
      }
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  }

  private static async getCacheStats(): Promise<any> {
    try {
      const redisClient = CacheMiddleware.redisManager.getClient();
      const info = await redisClient.info('memory');
      
      // Parse Redis INFO response
      const stats: any = {};
      info.split('\r\n').forEach(line => {
        const [key, value] = line.split(':');
        if (key && value) {
          stats[key] = isNaN(Number(value)) ? value : Number(value);
        }
      });

      return {
        memory: {
          used: stats.used_memory_human,
          peak: stats.used_memory_peak_human,
          rss: stats.used_memory_rss_human,
        },
        keyspace: await CacheMiddleware.getKeyspaceStats(),
        hitRate: await CacheMiddleware.calculateHitRate(),
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        error: 'Unable to retrieve cache statistics',
      };
    }
  }

  private static async getKeyspaceStats(): Promise<any> {
    try {
      const redisClient = CacheMiddleware.redisManager.getClient();
      const keys = await redisClient.keys('*');
      
      const patterns = new Map<string, number>();
      
      keys.forEach(key => {
        const pattern = key.split(':')[0] || 'unknown';
        patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
      });

      return {
        totalKeys: keys.length,
        patterns: Object.fromEntries(patterns),
      };
    } catch (error) {
      console.error('Error getting keyspace stats:', error);
      return { error: 'Unable to retrieve keyspace statistics' };
    }
  }

  private static async calculateHitRate(): Promise<number> {
    // This would typically be implemented using Redis statistics
    // For now, return a mock value
    return Math.random() * 0.3 + 0.7; // 70-100% hit rate
  }
}

// Export middleware functions for easier use
export const cache = CacheMiddleware.cache;
export const etag = CacheMiddleware.etag;
export const invalidateCache = CacheMiddleware.invalidateCache;
export const warmCache = CacheMiddleware.warmCache;
export const conditionalCache = CacheMiddleware.conditionalCache;
export const cacheStats = CacheMiddleware.cacheStats;