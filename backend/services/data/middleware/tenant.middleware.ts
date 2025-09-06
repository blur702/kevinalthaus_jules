import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

export interface TenantInfo {
  id: string;
  name: string;
  domain?: string;
  settings: Record<string, any>;
  isActive: boolean;
  subscriptionLevel: 'basic' | 'premium' | 'enterprise';
  features: string[];
}

export interface TenantRequest extends Request {
  tenant?: TenantInfo;
  user?: {
    id: string;
    tenantId: string;
    permissions: string[];
    roles: string[];
  };
}

export class TenantMiddleware {
  // Middleware to extract and validate tenant information
  static extractTenant() {
    return async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        let tenantId: string | undefined;

        // Try multiple sources for tenant ID
        tenantId = req.headers['x-tenant-id'] as string ||
                   req.query.tenantId as string ||
                   req.user?.tenantId;

        // Extract from subdomain if using subdomain-based multi-tenancy
        if (!tenantId && req.headers.host) {
          const host = req.headers.host;
          const subdomain = host.split('.')[0];
          
          // Skip common subdomains
          if (!['www', 'api', 'app'].includes(subdomain)) {
            tenantId = await TenantMiddleware.getTenantIdBySubdomain(subdomain);
          }
        }

        if (!tenantId) {
          throw new UnauthorizedError('Tenant ID is required');
        }

        // Validate and load tenant information
        const tenant = await TenantMiddleware.loadTenant(tenantId);
        
        if (!tenant) {
          throw new ForbiddenError('Invalid tenant');
        }

        if (!tenant.isActive) {
          throw new ForbiddenError('Tenant account is inactive');
        }

        req.tenant = tenant;
        
        // Store in response locals for use in other middleware
        res.locals.tenantId = tenantId;
        res.locals.tenant = tenant;

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  // Middleware to check tenant-specific permissions
  static checkTenantPermissions(requiredPermissions: string[] = []) {
    return (req: TenantRequest, res: Response, next: NextFunction): void => {
      try {
        const tenant = req.tenant;
        const user = req.user;

        if (!tenant || !user) {
          throw new UnauthorizedError('Authentication required');
        }

        // Check if user belongs to the tenant
        if (user.tenantId !== tenant.id) {
          throw new ForbiddenError('User does not belong to this tenant');
        }

        // Check required permissions
        if (requiredPermissions.length > 0) {
          const hasPermission = requiredPermissions.some(permission =>
            user.permissions.includes(permission) ||
            user.permissions.includes('*') ||
            user.roles.some(role => TenantMiddleware.roleHasPermission(role, permission))
          );

          if (!hasPermission) {
            throw new ForbiddenError(
              `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`
            );
          }
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  // Middleware to check subscription-based features
  static checkSubscriptionFeature(feature: string) {
    return (req: TenantRequest, res: Response, next: NextFunction): void => {
      try {
        const tenant = req.tenant;

        if (!tenant) {
          throw new UnauthorizedError('Tenant information required');
        }

        // Check if the tenant's subscription includes the feature
        if (!tenant.features.includes(feature)) {
          throw new ForbiddenError(
            `Feature '${feature}' is not available in your subscription plan`
          );
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  // Middleware to apply tenant-specific rate limiting
  static rateLimitByTenant() {
    const tenantLimits = new Map<string, { requests: number; resetTime: number }>();

    return (req: TenantRequest, res: Response, next: NextFunction): void => {
      try {
        const tenant = req.tenant;
        const now = Date.now();

        if (!tenant) {
          throw new UnauthorizedError('Tenant information required');
        }

        const tenantId = tenant.id;
        const currentLimit = tenantLimits.get(tenantId);
        
        // Get rate limit based on subscription level
        const limits = TenantMiddleware.getRateLimits(tenant.subscriptionLevel);
        const windowMs = 60 * 1000; // 1 minute window

        if (!currentLimit || now > currentLimit.resetTime) {
          // Reset or initialize limit
          tenantLimits.set(tenantId, {
            requests: 1,
            resetTime: now + windowMs
          });
        } else {
          // Check if limit exceeded
          if (currentLimit.requests >= limits.requestsPerMinute) {
            res.status(429).json({
              success: false,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: `Rate limit exceeded. Maximum ${limits.requestsPerMinute} requests per minute.`
              },
              meta: {
                resetTime: new Date(currentLimit.resetTime).toISOString()
              }
            });
            return;
          }

          // Increment counter
          currentLimit.requests++;
          tenantLimits.set(tenantId, currentLimit);
        }

        // Add rate limit headers
        res.set({
          'X-RateLimit-Limit': limits.requestsPerMinute.toString(),
          'X-RateLimit-Remaining': (limits.requestsPerMinute - (currentLimit?.requests || 1)).toString(),
          'X-RateLimit-Reset': Math.ceil((currentLimit?.resetTime || now + windowMs) / 1000).toString()
        });

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  // Middleware to validate tenant-specific API quota
  static checkApiQuota() {
    return async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        const tenant = req.tenant;

        if (!tenant) {
          throw new UnauthorizedError('Tenant information required');
        }

        // Check API usage quota
        const usage = await TenantMiddleware.getApiUsage(tenant.id);
        const quotaLimits = TenantMiddleware.getQuotaLimits(tenant.subscriptionLevel);

        if (usage.monthlyRequests >= quotaLimits.monthlyRequests) {
          throw new ForbiddenError(
            'Monthly API quota exceeded. Please upgrade your subscription.'
          );
        }

        if (usage.storageUsed >= quotaLimits.storageLimit) {
          throw new ForbiddenError(
            'Storage quota exceeded. Please upgrade your subscription or delete some data.'
          );
        }

        // Add quota headers
        res.set({
          'X-Quota-Limit': quotaLimits.monthlyRequests.toString(),
          'X-Quota-Used': usage.monthlyRequests.toString(),
          'X-Quota-Remaining': (quotaLimits.monthlyRequests - usage.monthlyRequests).toString()
        });

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  // Helper methods
  private static async getTenantIdBySubdomain(subdomain: string): Promise<string | undefined> {
    // In production, this would query a database
    // For now, return a mock implementation
    const subdomainToTenantMap = new Map([
      ['tenant1', 'tenant-uuid-1'],
      ['tenant2', 'tenant-uuid-2'],
      ['demo', 'demo-tenant-uuid'],
    ]);

    return subdomainToTenantMap.get(subdomain);
  }

  private static async loadTenant(tenantId: string): Promise<TenantInfo | null> {
    // In production, this would query a database
    // Mock implementation for demonstration
    const mockTenants = new Map<string, TenantInfo>([
      ['tenant-uuid-1', {
        id: 'tenant-uuid-1',
        name: 'Acme Corp',
        domain: 'acme.com',
        settings: { timezone: 'UTC', currency: 'USD' },
        isActive: true,
        subscriptionLevel: 'enterprise',
        features: ['advanced_search', 'bulk_operations', 'analytics', 'api_access']
      }],
      ['tenant-uuid-2', {
        id: 'tenant-uuid-2',
        name: 'Demo Company',
        domain: 'demo.com',
        settings: { timezone: 'EST', currency: 'USD' },
        isActive: true,
        subscriptionLevel: 'premium',
        features: ['advanced_search', 'bulk_operations', 'api_access']
      }]
    ]);

    return mockTenants.get(tenantId) || null;
  }

  private static roleHasPermission(role: string, permission: string): boolean {
    // Define role-permission mappings
    const rolePermissions = new Map<string, string[]>([
      ['admin', ['*']], // Admin has all permissions
      ['manager', [
        'read', 'create', 'update', 'delete',
        'bulk_create', 'bulk_update', 'view_stats'
      ]],
      ['editor', ['read', 'create', 'update']],
      ['viewer', ['read']],
    ]);

    const permissions = rolePermissions.get(role) || [];
    return permissions.includes(permission) || permissions.includes('*');
  }

  private static getRateLimits(subscriptionLevel: string) {
    const limits = {
      basic: { requestsPerMinute: 100, requestsPerHour: 1000 },
      premium: { requestsPerMinute: 500, requestsPerHour: 10000 },
      enterprise: { requestsPerMinute: 2000, requestsPerHour: 50000 },
    };

    return limits[subscriptionLevel as keyof typeof limits] || limits.basic;
  }

  private static getQuotaLimits(subscriptionLevel: string) {
    const quotas = {
      basic: { monthlyRequests: 10000, storageLimit: 1024 * 1024 * 100 }, // 100MB
      premium: { monthlyRequests: 100000, storageLimit: 1024 * 1024 * 1000 }, // 1GB
      enterprise: { monthlyRequests: 1000000, storageLimit: 1024 * 1024 * 10000 }, // 10GB
    };

    return quotas[subscriptionLevel as keyof typeof quotas] || quotas.basic;
  }

  private static async getApiUsage(tenantId: string): Promise<{
    monthlyRequests: number;
    storageUsed: number;
  }> {
    // In production, this would query usage metrics from database/analytics
    // Mock implementation
    return {
      monthlyRequests: Math.floor(Math.random() * 5000),
      storageUsed: Math.floor(Math.random() * 50 * 1024 * 1024), // Random usage up to 50MB
    };
  }
}

// Export middleware functions for easier use
export const extractTenant = TenantMiddleware.extractTenant;
export const checkTenantPermissions = TenantMiddleware.checkTenantPermissions;
export const checkSubscriptionFeature = TenantMiddleware.checkSubscriptionFeature;
export const rateLimitByTenant = TenantMiddleware.rateLimitByTenant;
export const checkApiQuota = TenantMiddleware.checkApiQuota;