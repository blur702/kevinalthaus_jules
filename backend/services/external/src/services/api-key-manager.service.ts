import { ApiKey, RateLimitConfig } from '@/types/api-key.types';
import { toErrorWithMessage } from '@/types/express.types';
import { logger, logSecurity } from '@/utils/logger';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';

// API Key model schema
const apiKeySchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  key: { type: String, unique: true, required: true },
  hashedKey: { type: String, required: true },
  apiConfigId: { type: String, required: true },
  userId: { type: String, required: true },
  permissions: [{
    resource: { type: String, required: true },
    actions: [{ type: String, enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }],
    conditions: { type: mongoose.Schema.Types.Mixed }
  }],
  rateLimit: {
    requests: { type: Number, default: 1000 },
    window: { type: Number, default: 60000 },
    burst: { type: Number, default: 100 },
    skipSuccessfulRequests: { type: Boolean, default: false },
    skipFailedRequests: { type: Boolean, default: false }
  },
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date },
  lastUsed: { type: Date },
  usageCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const ApiKeyModel = mongoose.model('ApiKey', apiKeySchema);

export class ApiKeyManager {
  private rateLimiters = new Map<string, RateLimiterMemory>();
  private keyCache = new Map<string, ApiKey>();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.setupCleanupJob();
  }

  private setupCleanupJob() {
    // Clean up expired keys every hour
    setInterval(async () => {
      try {
        await this.cleanupExpiredKeys();
        this.cleanupCache();
      } catch (error) {
        logger.error('API key cleanup error:', error);
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  async generateApiKey(
    name: string,
    apiConfigId: string,
    userId: string,
    permissions: ApiPermission[],
    rateLimit?: Partial<RateLimitConfig>,
    expiresAt?: Date
  ): Promise<ApiKey> {
    try {
      // Generate secure API key
      const keyBytes = crypto.randomBytes(32);
      const key = `sk_${keyBytes.toString('hex')}`;
      const hashedKey = this.hashApiKey(key);

      const apiKey: Partial<ApiKey> = {
        id: new mongoose.Types.ObjectId().toString(),
        name,
        key, // Store plain key temporarily for response
        hashedKey,
        apiConfigId,
        userId,
        permissions,
        rateLimit: {
          requests: 1000,
          window: 60000,
          burst: 100,
          skipSuccessfulRequests: false,
          skipFailedRequests: false,
          ...rateLimit
        },
        isActive: true,
        expiresAt,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const savedKey = await ApiKeyModel.create(apiKey);
      
      // Set up rate limiter for this key
      if (savedKey.rateLimit) {
        this.setupRateLimiter(savedKey.id, savedKey.rateLimit);
      }

      logSecurity('api_key_created', userId, {
        keyId: savedKey.id,
        name,
        apiConfigId,
        permissions: permissions.length
      });

      logger.info(`API key created: ${name} for user ${userId}`);

      // Remove plain key from saved object for security
      const result = savedKey.toObject() as ApiKey;
      delete (result as any).key; // Remove plain key for security
      
      // But return it in the response for the user to save
      return {
        ...result,
        key, // Include plain key only in the initial response
      };
    } catch (error) {
      logger.error('API key generation error:', error);
      throw new Error(`Failed to generate API key: ${toErrorWithMessage(error).message}`);
    }
  }

  async validateApiKey(key: string): Promise<{
    isValid: boolean;
    apiKey?: ApiKey;
    rateLimitResult?: RateLimiterRes;
    error?: string;
  }> {
    try {
      if (!key || !key.startsWith('sk_')) {
        return { isValid: false, error: 'Invalid API key format' };
      }

      // Check cache first
      const cachedKey = this.getCachedKey(key);
      if (cachedKey) {
        return await this.checkRateLimit(cachedKey);
      }

      // Hash the key to look up in database
      const hashedKey = this.hashApiKey(key);
      const apiKey = await ApiKeyModel.findOne({ 
        hashedKey,
        isActive: true,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      });

      if (!apiKey) {
        logSecurity('invalid_api_key_used', undefined, { key: key.substring(0, 10) + '...' });
        return { isValid: false, error: 'Invalid or expired API key' };
      }

      // Cache the key
      const apiKeyDoc = apiKey.toObject() as ApiKey;
      this.setCachedKey(key, apiKeyDoc);

      // Update usage statistics
      await this.updateKeyUsage(apiKeyDoc.id);

      return await this.checkRateLimit(apiKeyDoc);
    } catch (error) {
      logger.error('API key validation error:', error);
      return { isValid: false, error: 'Key validation failed' };
    }
  }

  private async checkRateLimit(apiKey: ApiKey): Promise<{
    isValid: boolean;
    apiKey: ApiKey;
    rateLimitResult?: RateLimiterRes;
    error?: string;
  }> {
    try {
      if (!apiKey.rateLimit) {
        return { isValid: true, apiKey };
      }
      const rateLimiter = this.getRateLimiter(apiKey.id, apiKey.rateLimit);
      const rateLimitResult = await rateLimiter.consume(apiKey.id);

      return {
        isValid: true,
        apiKey,
        rateLimitResult
      };
    } catch (rateLimitResult) {
      if (rateLimitResult instanceof Error) {
        logger.error('Rate limiter error:', rateLimitResult);
        return { isValid: false, apiKey, error: 'Rate limit check failed' };
      }

      // Rate limit exceeded
      logSecurity('api_key_rate_limited', apiKey.userId, {
        keyId: apiKey.id,
        remainingPoints: (rateLimitResult as any)?.remainingPoints || 0,
        resetTime: new Date(Date.now() + ((rateLimitResult as any)?.msBeforeNext || 0))
      });

      return {
        isValid: false,
        apiKey,
        rateLimitResult: rateLimitResult as RateLimiterRes,
        apiKey,
        rateLimitResult,
        error: 'Rate limit exceeded'
      };
    }
  }

  async checkPermission(
    apiKey: ApiKey,
    resource: string,
    action: string,
    context?: Record<string, any>
  ): Promise<boolean> {
    try {
      const permission = apiKey.permissions.find(p => 
        this.matchesResource(p.resource, resource) && 
        p.actions.includes(action as any)
      );

      if (!permission) {
        return false;
      }

      // Check conditions if present
      if (permission.conditions && context) {
        return this.evaluateConditions(permission.conditions, context);
      }

      return true;
    } catch (error) {
      logger.error('Permission check error:', error);
      return false;
    }
  }

  private matchesResource(pattern: string, resource: string): boolean {
    // Support wildcard matching
    if (pattern.includes('*')) {
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*');
      return new RegExp(`^${regexPattern}$`).test(resource);
    }
    
    return pattern === resource;
  }

  private evaluateConditions(conditions: Record<string, any>, context: Record<string, any>): boolean {
    // Simple condition evaluation - can be extended for complex scenarios
    for (const [key, expectedValue] of Object.entries(conditions)) {
      const contextValue = context[key];
      
      if (Array.isArray(expectedValue)) {
        if (!expectedValue.includes(contextValue)) {
          return false;
        }
      } else if (expectedValue !== contextValue) {
        return false;
      }
    }
    
    return true;
  }

  async rotateApiKey(keyId: string, userId: string): Promise<ApiKey> {
    try {
      const existingKey = await ApiKeyModel.findOne({ id: keyId, userId, isActive: true });
      if (!existingKey) {
        throw new Error('API key not found');
      }

      // Generate new key
      const keyBytes = crypto.randomBytes(32);
      const newKey = `sk_${keyBytes.toString('hex')}`;
      const hashedKey = this.hashApiKey(newKey);

      // Update the key
      existingKey.key = newKey;
      existingKey.hashedKey = hashedKey;
      existingKey.updatedAt = new Date();
      
      await existingKey.save();

      // Clear cache
      this.clearCachedKey(existingKey.id);

      logSecurity('api_key_rotated', userId, { keyId });

      logger.info(`API key rotated: ${keyId} for user ${userId}`);

      const result = existingKey.toObject() as ApiKey;
      return {
        ...result,
        key: newKey, // Include new key in response
      };
    } catch (error) {
      logger.error('API key rotation error:', error);
      throw new Error(`Failed to rotate API key: ${toErrorWithMessage(error).message}`);
    }
  }

  async revokeApiKey(keyId: string, userId: string): Promise<void> {
    try {
      const result = await ApiKeyModel.updateOne(
        { id: keyId, userId },
        { 
          isActive: false, 
          updatedAt: new Date() 
        }
      );

      if (result.matchedCount === 0) {
        throw new Error('API key not found');
      }

      // Clear cache and rate limiter
      this.clearCachedKey(keyId);
      this.rateLimiters.delete(keyId);

      logSecurity('api_key_revoked', userId, { keyId });

      logger.info(`API key revoked: ${keyId} for user ${userId}`);
    } catch (error) {
      logger.error('API key revocation error:', error);
      throw new Error(`Failed to revoke API key: ${toErrorWithMessage(error).message}`);
    }
  }

  async listUserApiKeys(userId: string): Promise<Array<Omit<ApiKey, 'key' | 'hashedKey'>>> {
    try {
      const keys = await ApiKeyModel.find(
        { userId, isActive: true },
        { key: 0, hashedKey: 0 } // Exclude sensitive fields
      );

      return keys.map(key => key.toObject());
    } catch (error) {
      logger.error('List API keys error:', error);
      throw new Error('Failed to list API keys');
    }
  }

  async getApiKeyMetrics(keyId: string): Promise<{
    usageCount: number;
    lastUsed?: Date;
    rateLimit: {
      current: number;
      limit: number;
      remaining: number;
      resetTime: Date;
    };
  }> {
    try {
      const apiKey = await ApiKeyModel.findOne({ id: keyId });
      if (!apiKey || !apiKey.rateLimit) {
        throw new Error('API key not found or rate limit not configured');
      }

      const rateLimiter = this.rateLimiters.get(keyId);
      let rateLimitInfo = {
        current: 0,
        limit: apiKey.rateLimit.requests,
        remaining: apiKey.rateLimit.requests,
        resetTime: new Date(Date.now() + apiKey.rateLimit.window),
      };

      if (rateLimiter) {
        const res = await rateLimiter.get(keyId);
        if (res) {
          rateLimitInfo = {
            current: res.totalPoints || 0,
            limit: apiKey.rateLimit.requests,
            remaining: res.remainingPoints || 0,
            resetTime: new Date(Date.now() + (res.msBeforeNext || 0)),
          };
        }
      }

      return {
        usageCount: apiKey.usageCount,
        lastUsed: apiKey.lastUsed,
        rateLimit: rateLimitInfo,
      };
    } catch (error) {
      logger.error('API key metrics error:', error);
      throw new Error('Failed to get API key metrics');
    }
  }

  private hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  private setupRateLimiter(keyId: string, rateLimit: RateLimitConfig) {
    const rateLimiter = new RateLimiterMemory({
      points: rateLimit.requests,
      duration: Math.floor(rateLimit.window / 1000), // Convert to seconds
      blockDuration: Math.floor(rateLimit.window / 1000),
    });

    this.rateLimiters.set(keyId, rateLimiter);
  }

  private getRateLimiter(keyId: string, rateLimit: RateLimitConfig): RateLimiterMemory {
    if (!this.rateLimiters.has(keyId)) {
      this.setupRateLimiter(keyId, rateLimit);
    }
    
    return this.rateLimiters.get(keyId)!;
  }

  private getCachedKey(key: string): ApiKey | undefined {
    const hashedKey = this.hashApiKey(key);
    return this.keyCache.get(hashedKey);
  }

  private setCachedKey(key: string, apiKey: ApiKey) {
    const hashedKey = this.hashApiKey(key);
    this.keyCache.set(hashedKey, apiKey);
    
    // Set expiry
    setTimeout(() => {
      this.keyCache.delete(hashedKey);
    }, this.cacheExpiry);
  }

  private clearCachedKey(keyId: string) {
    // Find and remove from cache by keyId
    for (const [hashedKey, apiKey] of this.keyCache.entries()) {
      if (apiKey.id === keyId) {
        this.keyCache.delete(hashedKey);
        break;
      }
    }
  }

  private cleanupCache() {
    // Cache cleanup is handled by setTimeout in setCachedKey
    logger.debug(`API key cache size: ${this.keyCache.size}`);
  }

  private async updateKeyUsage(keyId: string) {
    try {
      await ApiKeyModel.updateOne(
        { id: keyId },
        { 
          $inc: { usageCount: 1 },
          lastUsed: new Date()
        }
      );
    } catch (error) {
      logger.warn('Failed to update key usage:', error);
    }
  }

  private async cleanupExpiredKeys() {
    try {
      const result = await ApiKeyModel.updateMany(
        {
          isActive: true,
          expiresAt: { $lt: new Date() }
        },
        {
          isActive: false,
          updatedAt: new Date()
        }
      );

      if (result.matchedCount > 0) {
        logger.info(`Deactivated ${result.matchedCount} expired API keys`);
      }
    } catch (error) {
      logger.error('Failed to cleanup expired keys:', error);
    }
  }
}