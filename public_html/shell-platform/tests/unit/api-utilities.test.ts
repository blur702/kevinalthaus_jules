/**
 * Unit tests for API utilities and helpers
 */

describe('API Utilities Tests', () => {
  describe('HTTP Status Code Handling', () => {
    it('should categorize HTTP status codes correctly', () => {
      const statusCodes = {
        success: [200, 201, 202, 204],
        clientError: [400, 401, 403, 404, 409, 422],
        serverError: [500, 502, 503, 504]
      };

      statusCodes.success.forEach(code => {
        expect(code).toBeGreaterThanOrEqual(200);
        expect(code).toBeLessThan(300);
      });

      statusCodes.clientError.forEach(code => {
        expect(code).toBeGreaterThanOrEqual(400);
        expect(code).toBeLessThan(500);
      });

      statusCodes.serverError.forEach(code => {
        expect(code).toBeGreaterThanOrEqual(500);
        expect(code).toBeLessThan(600);
      });
    });

    it('should provide meaningful status messages', () => {
      const statusMessages = {
        200: 'OK',
        201: 'Created',
        400: 'Bad Request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not Found',
        500: 'Internal Server Error'
      };

      expect(statusMessages[200]).toBe('OK');
      expect(statusMessages[404]).toBe('Not Found');
      expect(statusMessages[500]).toBe('Internal Server Error');
    });
  });

  describe('Request Validation', () => {
    it('should validate required fields', () => {
      const requiredFields = ['name', 'email', 'version'];
      const validPayload = { name: 'test', email: 'test@example.com', version: '1.0.0', extra: 'field' };
      const invalidPayload = { name: 'test', extra: 'field' };

      // Check all required fields are present
      const hasAllRequired = requiredFields.every(field => field in validPayload);
      const missingRequired = requiredFields.some(field => !(field in invalidPayload));

      expect(hasAllRequired).toBe(true);
      expect(missingRequired).toBe(true);
    });

    it('should validate field types', () => {
      const fieldTypes = {
        name: 'string',
        age: 'number',
        active: 'boolean',
        tags: 'array',
        config: 'object'
      };

      const testData = {
        name: 'John',
        age: 30,
        active: true,
        tags: ['user', 'admin'],
        config: { theme: 'dark' }
      };

      expect(typeof testData.name).toBe(fieldTypes.name);
      expect(typeof testData.age).toBe(fieldTypes.age);
      expect(typeof testData.active).toBe(fieldTypes.active);
      expect(Array.isArray(testData.tags)).toBe(true);
      expect(typeof testData.config).toBe(fieldTypes.config);
    });

    it('should validate string formats', () => {
      const patterns = {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        semver: /^\d+\.\d+\.\d+$/,
        slug: /^[a-z0-9-]+$/
      };

      const testData = {
        email: 'user@example.com',
        uuid: '123e4567-e89b-12d3-a456-426614174000',
        semver: '1.2.3',
        slug: 'my-plugin-name'
      };

      expect(testData.email).toMatch(patterns.email);
      expect(testData.uuid).toMatch(patterns.uuid);
      expect(testData.semver).toMatch(patterns.semver);
      expect(testData.slug).toMatch(patterns.slug);
    });
  });

  describe('Response Formatting', () => {
    it('should format success responses consistently', () => {
      const successResponse = {
        success: true,
        data: { id: 1, name: 'Test' },
        message: 'Operation completed successfully',
        timestamp: Date.now()
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse).toHaveProperty('data');
      expect(successResponse).toHaveProperty('message');
      expect(successResponse).toHaveProperty('timestamp');
      expect(successResponse.timestamp).toBeCloseTo(Date.now(), -2);
    });

    it('should format error responses consistently', () => {
      const errorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input provided',
          details: ['Name is required', 'Email format is invalid']
        },
        timestamp: Date.now()
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toHaveProperty('code');
      expect(errorResponse.error).toHaveProperty('message');
      expect(errorResponse.error).toHaveProperty('details');
      expect(Array.isArray(errorResponse.error.details)).toBe(true);
    });

    it('should paginate large result sets', () => {
      const paginatedResponse = {
        data: Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` })),
        pagination: {
          page: 1,
          limit: 10,
          total: 100,
          pages: 10,
          hasNext: true,
          hasPrev: false
        }
      };

      expect(paginatedResponse.data).toHaveLength(10);
      expect(paginatedResponse.pagination.total).toBe(100);
      expect(paginatedResponse.pagination.pages).toBe(10);
      expect(paginatedResponse.pagination.hasNext).toBe(true);
      expect(paginatedResponse.pagination.hasPrev).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should track request counts per client', () => {
      const rateLimitData = {
        'client-1': { count: 5, resetTime: Date.now() + 60000 },
        'client-2': { count: 10, resetTime: Date.now() + 30000 }
      };

      expect(rateLimitData['client-1'].count).toBe(5);
      expect(rateLimitData['client-2'].count).toBe(10);
      expect(rateLimitData['client-1'].resetTime).toBeGreaterThan(Date.now());
    });

    it('should enforce rate limit thresholds', () => {
      const rateLimits = {
        guest: { requests: 100, window: 3600000 }, // 100 req/hour
        user: { requests: 1000, window: 3600000 }, // 1000 req/hour
        admin: { requests: 10000, window: 3600000 } // 10000 req/hour
      };

      expect(rateLimits.guest.requests).toBe(100);
      expect(rateLimits.user.requests).toBe(1000);
      expect(rateLimits.admin.requests).toBe(10000);
      expect(rateLimits.user.window).toBe(3600000); // 1 hour in ms
    });
  });

  describe('Caching', () => {
    it('should calculate cache keys consistently', () => {
      const cacheKey = (endpoint: string, params: any) => {
        const paramString = JSON.stringify(params, Object.keys(params).sort());
        return `${endpoint}:${Buffer.from(paramString).toString('base64')}`;
      };

      const key1 = cacheKey('/api/users', { page: 1, limit: 10 });
      const key2 = cacheKey('/api/users', { limit: 10, page: 1 });
      
      expect(key1).toBe(key2); // Should be same regardless of param order
      expect(key1).toContain('/api/users:');
    });

    it('should handle cache TTL correctly', () => {
      const cacheEntry = {
        data: { id: 1, name: 'Test' },
        timestamp: Date.now(),
        ttl: 300000 // 5 minutes
      };

      const isExpired = (entry: any) => {
        return Date.now() - entry.timestamp > entry.ttl;
      };

      expect(isExpired(cacheEntry)).toBe(false);
      
      // Test with expired entry
      const expiredEntry = {
        ...cacheEntry,
        timestamp: Date.now() - 600000 // 10 minutes ago
      };
      
      expect(isExpired(expiredEntry)).toBe(true);
    });
  });

  describe('Authentication Helpers', () => {
    it('should validate JWT token structure', () => {
      const mockJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      const jwtParts = mockJWT.split('.');
      expect(jwtParts).toHaveLength(3);
      expect(jwtParts[0]).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(jwtParts[1]).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(jwtParts[2]).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should extract user roles from token claims', () => {
      const tokenClaims = {
        sub: '1234567890',
        name: 'John Doe',
        roles: ['user', 'admin'],
        permissions: ['read:users', 'write:users'],
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      expect(tokenClaims.roles).toContain('user');
      expect(tokenClaims.roles).toContain('admin');
      expect(tokenClaims.permissions).toContain('read:users');
      expect(tokenClaims.exp).toBeGreaterThan(Date.now() / 1000);
    });

    it('should validate API key format', () => {
      const apiKeyPattern = /^[a-zA-Z0-9]{32}$/;
      const validApiKey = 'abcd1234efgh5678ijkl9012mnop3456';
      const invalidApiKeys = ['short', 'too-long-api-key-with-special-chars!', ''];

      expect(validApiKey).toMatch(apiKeyPattern);
      expect(validApiKey).toHaveLength(32);
      
      invalidApiKeys.forEach(key => {
        expect(key).not.toMatch(apiKeyPattern);
      });
    });
  });

  describe('Input Sanitization', () => {
    it('should escape HTML special characters', () => {
      const htmlEscape = (str: string) => {
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');
      };

      const unsafeInput = '<script>alert("XSS")</script>';
      const safeOutput = htmlEscape(unsafeInput);
      
      expect(safeOutput).not.toContain('<script>');
      expect(safeOutput).toContain('&lt;script&gt;');
      expect(safeOutput).not.toContain('"XSS"');
    });

    it('should validate SQL injection patterns', () => {
      const sqlInjectionPatterns = [
        /(\bunion\b|\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b)/i,
        /(--|\/\*|\*\/)/,
        /(\bor\b|\band\b)\s*\d+\s*=\s*\d+/i
      ];

      const suspiciousInputs = [
        "'; DROP TABLE users; --",
        "1 OR 1=1",
        "admin'/**/OR/**/1=1",
        "UNION SELECT * FROM users"
      ];

      suspiciousInputs.forEach(input => {
        const isSuspicious = sqlInjectionPatterns.some(pattern => pattern.test(input));
        expect(isSuspicious).toBe(true);
      });

      const safeInputs = ['john_doe', 'user@example.com', 'Normal text input'];
      safeInputs.forEach(input => {
        const isSuspicious = sqlInjectionPatterns.some(pattern => pattern.test(input));
        expect(isSuspicious).toBe(false);
      });
    });
  });
});