import { Request, Response, NextFunction } from 'express';
import { TenantMiddleware, TenantRequest } from '../../../../backend/services/data/middleware/tenant.middleware';
import { UnauthorizedError, ForbiddenError } from '../../../../backend/services/data/utils/errors';

// Mock request and response objects
const createMockRequest = (overrides: Partial<TenantRequest> = {}): TenantRequest => ({
  headers: {},
  query: {},
  user: {
    id: 'user-123',
    tenantId: 'tenant-123',
    permissions: ['read', 'write'],
    roles: ['editor'],
  },
  ...overrides,
} as TenantRequest);

const createMockResponse = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res;
};

const mockNext: NextFunction = jest.fn();

// Mock the static methods
const mockLoadTenant = jest.spyOn(TenantMiddleware as any, 'loadTenant');
const mockGetTenantIdBySubdomain = jest.spyOn(TenantMiddleware as any, 'getTenantIdBySubdomain');
const mockGetApiUsage = jest.spyOn(TenantMiddleware as any, 'getApiUsage');

describe('TenantMiddleware', () => {
  let req: TenantRequest;
  let res: Response;

  beforeEach(() => {
    jest.clearAllMocks();
    req = createMockRequest();
    res = createMockResponse();
  });

  describe('extractTenant', () => {
    const middleware = TenantMiddleware.extractTenant();

    it('should extract tenant ID from headers', async () => {
      const mockTenant = {
        id: 'tenant-123',
        name: 'Test Tenant',
        isActive: true,
        subscriptionLevel: 'premium' as const,
        features: ['feature1', 'feature2'],
      };

      req.headers['x-tenant-id'] = 'tenant-123';
      mockLoadTenant.mockResolvedValue(mockTenant);

      await middleware(req, res, mockNext);

      expect(req.tenant).toEqual(mockTenant);
      expect(res.locals.tenantId).toBe('tenant-123');
      expect(res.locals.tenant).toEqual(mockTenant);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should extract tenant ID from query parameters', async () => {
      const mockTenant = {
        id: 'tenant-456',
        name: 'Query Tenant',
        isActive: true,
        subscriptionLevel: 'basic' as const,
        features: ['basic_features'],
      };

      req.query.tenantId = 'tenant-456';
      mockLoadTenant.mockResolvedValue(mockTenant);

      await middleware(req, res, mockNext);

      expect(req.tenant).toEqual(mockTenant);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should extract tenant ID from user context', async () => {
      const mockTenant = {
        id: 'tenant-789',
        name: 'User Tenant',
        isActive: true,
        subscriptionLevel: 'enterprise' as const,
        features: ['advanced_features'],
      };

      req.user!.tenantId = 'tenant-789';
      mockLoadTenant.mockResolvedValue(mockTenant);

      await middleware(req, res, mockNext);

      expect(req.tenant).toEqual(mockTenant);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should extract tenant ID from subdomain', async () => {
      const mockTenant = {
        id: 'tenant-subdomain',
        name: 'Subdomain Tenant',
        isActive: true,
        subscriptionLevel: 'premium' as const,
        features: ['subdomain_features'],
      };

      req.headers.host = 'mytenant.example.com';
      mockGetTenantIdBySubdomain.mockResolvedValue('tenant-subdomain');
      mockLoadTenant.mockResolvedValue(mockTenant);

      await middleware(req, res, mockNext);

      expect(mockGetTenantIdBySubdomain).toHaveBeenCalledWith('mytenant');
      expect(req.tenant).toEqual(mockTenant);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should throw UnauthorizedError if no tenant ID found', async () => {
      // No tenant ID in any source
      delete req.user;

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(UnauthorizedError)
      );
    });

    it('should throw ForbiddenError for invalid tenant', async () => {
      req.headers['x-tenant-id'] = 'invalid-tenant';
      mockLoadTenant.mockResolvedValue(null);

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(ForbiddenError)
      );
    });

    it('should throw ForbiddenError for inactive tenant', async () => {
      const inactiveTenant = {
        id: 'tenant-123',
        name: 'Inactive Tenant',
        isActive: false,
        subscriptionLevel: 'basic' as const,
        features: [],
      };

      req.headers['x-tenant-id'] = 'tenant-123';
      mockLoadTenant.mockResolvedValue(inactiveTenant);

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(ForbiddenError)
      );
    });

    it('should skip common subdomains', async () => {
      req.headers.host = 'www.example.com';

      await middleware(req, res, mockNext);

      expect(mockGetTenantIdBySubdomain).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(
        expect.any(UnauthorizedError)
      );
    });
  });

  describe('checkTenantPermissions', () => {
    beforeEach(() => {
      req.tenant = {
        id: 'tenant-123',
        name: 'Test Tenant',
        isActive: true,
        subscriptionLevel: 'premium' as const,
        features: ['feature1'],
        settings: {},
      };
    });

    it('should pass with sufficient permissions', async () => {
      const middleware = TenantMiddleware.checkTenantPermissions(['read']);
      
      req.user = {
        id: 'user-123',
        tenantId: 'tenant-123',
        permissions: ['read', 'write'],
        roles: ['editor'],
      };

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass with wildcard permissions', async () => {
      const middleware = TenantMiddleware.checkTenantPermissions(['admin_action']);
      
      req.user = {
        id: 'user-123',
        tenantId: 'tenant-123',
        permissions: ['*'],
        roles: ['admin'],
      };

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should pass with role-based permissions', async () => {
      const middleware = TenantMiddleware.checkTenantPermissions(['read']);
      
      req.user = {
        id: 'user-123',
        tenantId: 'tenant-123',
        permissions: [],
        roles: ['viewer'], // viewer role should have read permission
      };

      // Mock roleHasPermission to return true for viewer role
      jest.spyOn(TenantMiddleware as any, 'roleHasPermission')
        .mockReturnValue(true);

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should throw UnauthorizedError if no tenant', async () => {
      const middleware = TenantMiddleware.checkTenantPermissions(['read']);
      
      req.tenant = undefined;

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(UnauthorizedError)
      );
    });

    it('should throw UnauthorizedError if no user', async () => {
      const middleware = TenantMiddleware.checkTenantPermissions(['read']);
      
      req.user = undefined;

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(UnauthorizedError)
      );
    });

    it('should throw ForbiddenError if user does not belong to tenant', async () => {
      const middleware = TenantMiddleware.checkTenantPermissions(['read']);
      
      req.user = {
        id: 'user-123',
        tenantId: 'different-tenant',
        permissions: ['read'],
        roles: ['editor'],
      };

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(ForbiddenError)
      );
    });

    it('should throw ForbiddenError for insufficient permissions', async () => {
      const middleware = TenantMiddleware.checkTenantPermissions(['admin_action']);
      
      req.user = {
        id: 'user-123',
        tenantId: 'tenant-123',
        permissions: ['read'],
        roles: ['viewer'],
      };

      // Mock roleHasPermission to return false
      jest.spyOn(TenantMiddleware as any, 'roleHasPermission')
        .mockReturnValue(false);

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(ForbiddenError)
      );
    });

    it('should pass when no permissions required', async () => {
      const middleware = TenantMiddleware.checkTenantPermissions([]);
      
      req.user = {
        id: 'user-123',
        tenantId: 'tenant-123',
        permissions: [],
        roles: [],
      };

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('checkSubscriptionFeature', () => {
    beforeEach(() => {
      req.tenant = {
        id: 'tenant-123',
        name: 'Test Tenant',
        isActive: true,
        subscriptionLevel: 'premium' as const,
        features: ['advanced_search', 'bulk_operations'],
        settings: {},
      };
    });

    it('should pass if tenant has the required feature', async () => {
      const middleware = TenantMiddleware.checkSubscriptionFeature('advanced_search');

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should throw ForbiddenError if tenant does not have the feature', async () => {
      const middleware = TenantMiddleware.checkSubscriptionFeature('enterprise_feature');

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(ForbiddenError)
      );
    });

    it('should throw UnauthorizedError if no tenant', async () => {
      const middleware = TenantMiddleware.checkSubscriptionFeature('any_feature');
      
      req.tenant = undefined;

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(UnauthorizedError)
      );
    });
  });

  describe('rateLimitByTenant', () => {
    beforeEach(() => {
      req.tenant = {
        id: 'tenant-123',
        name: 'Test Tenant',
        isActive: true,
        subscriptionLevel: 'premium' as const,
        features: [],
        settings: {},
      };
    });

    it('should pass within rate limits', async () => {
      const middleware = TenantMiddleware.rateLimitByTenant();

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Limit': expect.any(String),
          'X-RateLimit-Remaining': expect.any(String),
          'X-RateLimit-Reset': expect.any(String),
        })
      );
    });

    it('should return 429 when rate limit exceeded', async () => {
      const middleware = TenantMiddleware.rateLimitByTenant();

      // Simulate multiple requests to exceed rate limit
      for (let i = 0; i < 600; i++) {
        await middleware(req, res, mockNext);
        if (res.status.mock.calls.length > 0) {
          break;
        }
      }

      // Eventually should hit rate limit
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'RATE_LIMIT_EXCEEDED',
          }),
        })
      );
    });

    it('should throw UnauthorizedError if no tenant', async () => {
      const middleware = TenantMiddleware.rateLimitByTenant();
      
      req.tenant = undefined;

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(UnauthorizedError)
      );
    });
  });

  describe('checkApiQuota', () => {
    beforeEach(() => {
      req.tenant = {
        id: 'tenant-123',
        name: 'Test Tenant',
        isActive: true,
        subscriptionLevel: 'premium' as const,
        features: [],
        settings: {},
      };
    });

    it('should pass within quota limits', async () => {
      const middleware = TenantMiddleware.checkApiQuota();

      mockGetApiUsage.mockResolvedValue({
        monthlyRequests: 5000,
        storageUsed: 50 * 1024 * 1024, // 50MB
      });

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-Quota-Limit': expect.any(String),
          'X-Quota-Used': expect.any(String),
          'X-Quota-Remaining': expect.any(String),
        })
      );
    });

    it('should throw ForbiddenError when monthly requests quota exceeded', async () => {
      const middleware = TenantMiddleware.checkApiQuota();

      mockGetApiUsage.mockResolvedValue({
        monthlyRequests: 200000, // Exceeds premium limit
        storageUsed: 50 * 1024 * 1024,
      });

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Monthly API quota exceeded'),
        })
      );
    });

    it('should throw ForbiddenError when storage quota exceeded', async () => {
      const middleware = TenantMiddleware.checkApiQuota();

      mockGetApiUsage.mockResolvedValue({
        monthlyRequests: 5000,
        storageUsed: 2 * 1024 * 1024 * 1024, // 2GB, exceeds premium limit
      });

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Storage quota exceeded'),
        })
      );
    });

    it('should throw UnauthorizedError if no tenant', async () => {
      const middleware = TenantMiddleware.checkApiQuota();
      
      req.tenant = undefined;

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(UnauthorizedError)
      );
    });
  });

  describe('helper methods', () => {
    describe('getRateLimits', () => {
      it('should return correct limits for basic subscription', () => {
        const limits = (TenantMiddleware as any).getRateLimits('basic');
        expect(limits).toEqual({
          requestsPerMinute: 100,
          requestsPerHour: 1000,
        });
      });

      it('should return correct limits for premium subscription', () => {
        const limits = (TenantMiddleware as any).getRateLimits('premium');
        expect(limits).toEqual({
          requestsPerMinute: 500,
          requestsPerHour: 10000,
        });
      });

      it('should return correct limits for enterprise subscription', () => {
        const limits = (TenantMiddleware as any).getRateLimits('enterprise');
        expect(limits).toEqual({
          requestsPerMinute: 2000,
          requestsPerHour: 50000,
        });
      });

      it('should default to basic limits for unknown subscription', () => {
        const limits = (TenantMiddleware as any).getRateLimits('unknown');
        expect(limits).toEqual({
          requestsPerMinute: 100,
          requestsPerHour: 1000,
        });
      });
    });

    describe('roleHasPermission', () => {
      it('should return true for admin role with any permission', () => {
        const hasPermission = (TenantMiddleware as any).roleHasPermission('admin', 'any_permission');
        expect(hasPermission).toBe(true);
      });

      it('should return true for manager role with CRUD permissions', () => {
        const hasPermission = (TenantMiddleware as any).roleHasPermission('manager', 'read');
        expect(hasPermission).toBe(true);
      });

      it('should return false for viewer role with write permissions', () => {
        const hasPermission = (TenantMiddleware as any).roleHasPermission('viewer', 'write');
        expect(hasPermission).toBe(false);
      });

      it('should return false for unknown role', () => {
        const hasPermission = (TenantMiddleware as any).roleHasPermission('unknown', 'read');
        expect(hasPermission).toBe(false);
      });
    });
  });
});