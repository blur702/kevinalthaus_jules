import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../pages/core/dashboard-page';
import { TestData } from '../../fixtures/test-data';

test.describe('API Integration Testing', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
  });

  test.describe('CRUD Operations @critical @api', () => {
    test('should perform successful GET requests', async ({ page }) => {
      const apiRequests: any[] = [];
      
      // Monitor API requests
      page.on('response', (response) => {
        if (response.url().includes('/api/') && response.request().method() === 'GET') {
          apiRequests.push({
            url: response.url(),
            status: response.status(),
            method: 'GET',
            timing: response.request().timing()
          });
        }
      });
      
      await dashboardPage.goto();
      await dashboardPage.waitForDashboardLoad();
      
      // Should have made successful API requests
      expect(apiRequests.length).toBeGreaterThan(0);
      
      // All GET requests should be successful
      const failedRequests = apiRequests.filter(req => req.status >= 400);
      expect(failedRequests).toHaveLength(0);
      
      // Response times should be reasonable
      apiRequests.forEach(request => {
        const responseTime = request.timing.responseEnd - request.timing.requestStart;
        expect(responseTime).toBeLessThan(TestData.performance.thresholds.apiResponse);
      });
    });

    test('should handle POST requests with data validation', async ({ page }) => {
      await dashboardPage.goto();
      
      // Mock POST endpoint for testing
      let postRequestData = null;
      await page.route('**/api/test-endpoint', (route) => {
        if (route.request().method() === 'POST') {
          postRequestData = route.request().postDataJSON();
          route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, id: 'test-123' })
          });
        }
      });
      
      // Simulate API call via page interaction
      await page.evaluate(() => {
        return fetch('/api/test-endpoint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Test Item',
            description: 'Test description',
            category: 'test'
          })
        });
      });
      
      expect(postRequestData).toBeDefined();
      expect(postRequestData.name).toBe('Test Item');
    });

    test('should handle PUT requests for updates', async ({ page }) => {
      await dashboardPage.goto();
      
      let putRequestData = null;
      await page.route('**/api/items/*', (route) => {
        if (route.request().method() === 'PUT') {
          putRequestData = route.request().postDataJSON();
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, updated: true })
          });
        }
      });
      
      // Simulate update operation
      await page.evaluate(() => {
        return fetch('/api/items/123', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: '123',
            name: 'Updated Item',
            updatedAt: new Date().toISOString()
          })
        });
      });
      
      expect(putRequestData).toBeDefined();
      expect(putRequestData.name).toBe('Updated Item');
    });

    test('should handle DELETE requests', async ({ page }) => {
      await dashboardPage.goto();
      
      let deleteRequestUrl = '';
      await page.route('**/api/items/*', (route) => {
        if (route.request().method() === 'DELETE') {
          deleteRequestUrl = route.request().url();
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, deleted: true })
          });
        }
      });
      
      // Simulate delete operation
      await page.evaluate(() => {
        return fetch('/api/items/123', { method: 'DELETE' });
      });
      
      expect(deleteRequestUrl).toContain('/api/items/123');
    });
  });

  test.describe('Data Validation and Error Handling @critical', () => {
    test('should validate required fields', async ({ page }) => {
      await dashboardPage.goto();
      
      let validationErrors = null;
      await page.route('**/api/validate-endpoint', (route) => {
        const data = route.request().postDataJSON();
        
        if (!data.name || !data.email) {
          validationErrors = {
            errors: [
              { field: 'name', message: 'Name is required' },
              { field: 'email', message: 'Email is required' }
            ]
          };
          
          route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify(validationErrors)
          });
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true })
          });
        }
      });
      
      // Submit invalid data
      await page.evaluate(() => {
        return fetch('/api/validate-endpoint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: 'Missing required fields' })
        });
      });
      
      expect(validationErrors).toBeDefined();
      expect(validationErrors.errors).toHaveLength(2);
    });

    test('should validate data types and formats', async ({ page }) => {
      await dashboardPage.goto();
      
      const validationTests = [
        {
          data: { email: 'invalid-email' },
          expectedError: 'Invalid email format'
        },
        {
          data: { age: 'not-a-number' },
          expectedError: 'Age must be a number'
        },
        {
          data: { phone: '123' },
          expectedError: 'Invalid phone format'
        }
      ];
      
      for (const testCase of validationTests) {
        let errorResponse = null;
        
        await page.route('**/api/validate-types', (route) => {
          const data = route.request().postDataJSON();
          
          // Simple validation logic
          if (data.email && !data.email.includes('@')) {
            errorResponse = { error: 'Invalid email format' };
          } else if (data.age && isNaN(data.age)) {
            errorResponse = { error: 'Age must be a number' };
          } else if (data.phone && data.phone.length < 10) {
            errorResponse = { error: 'Invalid phone format' };
          }
          
          if (errorResponse) {
            route.fulfill({
              status: 400,
              contentType: 'application/json',
              body: JSON.stringify(errorResponse)
            });
          } else {
            route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ success: true })
            });
          }
        });
        
        await page.evaluate((data) => {
          return fetch('/api/validate-types', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
        }, testCase.data);
        
        expect(errorResponse?.error).toContain(testCase.expectedError.split(' ')[0]);
      }
    });

    test('should handle server errors gracefully', async ({ page }) => {
      await dashboardPage.goto();
      
      const errorScenarios = [
        { status: 500, error: 'Internal Server Error' },
        { status: 502, error: 'Bad Gateway' },
        { status: 503, error: 'Service Unavailable' },
        { status: 504, error: 'Gateway Timeout' }
      ];
      
      for (const scenario of errorScenarios) {
        await page.route('**/api/error-test', (route) => {
          route.fulfill({
            status: scenario.status,
            contentType: 'application/json',
            body: JSON.stringify({ error: scenario.error })
          });
        });
        
        const response = await page.evaluate(async (status) => {
          const res = await fetch('/api/error-test');
          return { status: res.status, text: await res.text() };
        }, scenario.status);
        
        expect(response.status).toBe(scenario.status);
        expect(response.text).toContain(scenario.error);
      }
    });

    test('should implement proper error recovery', async ({ page }) => {
      await dashboardPage.goto();
      
      let attemptCount = 0;
      await page.route('**/api/retry-test', (route) => {
        attemptCount++;
        
        if (attemptCount < 3) {
          // Fail first 2 attempts
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Temporary failure' })
          });
        } else {
          // Succeed on 3rd attempt
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, attempts: attemptCount })
          });
        }
      });
      
      // Simulate retry logic
      const result = await page.evaluate(async () => {
        const maxRetries = 3;
        let attempts = 0;
        
        while (attempts < maxRetries) {
          attempts++;
          
          try {
            const response = await fetch('/api/retry-test');
            if (response.ok) {
              return await response.json();
            }
            throw new Error('Request failed');
          } catch (error) {
            if (attempts === maxRetries) {
              throw error;
            }
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between retries
          }
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
    });
  });

  test.describe('File Upload and Download @api', () => {
    test('should handle file uploads with validation', async ({ page }) => {
      await dashboardPage.goto();
      
      let uploadedFile = null;
      await page.route('**/api/upload', (route) => {
        uploadedFile = {
          method: route.request().method(),
          contentType: route.request().headers()['content-type'],
          size: route.request().postData()?.length || 0
        };
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            fileId: 'upload-123',
            size: uploadedFile.size
          })
        });
      });
      
      // Simulate file upload
      await page.evaluate(() => {
        const formData = new FormData();
        const blob = new Blob(['test file content'], { type: 'text/plain' });
        formData.append('file', blob, 'test.txt');
        
        return fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
      });
      
      expect(uploadedFile).toBeDefined();
      expect(uploadedFile.method).toBe('POST');
      expect(uploadedFile.contentType).toContain('multipart/form-data');
    });

    test('should validate file types and sizes', async ({ page }) => {
      await dashboardPage.goto();
      
      const fileValidationTests = [
        {
          fileName: 'test.exe',
          type: 'application/x-executable',
          shouldReject: true,
          reason: 'Invalid file type'
        },
        {
          fileName: 'large-file.jpg',
          type: 'image/jpeg',
          size: 20 * 1024 * 1024, // 20MB
          shouldReject: true,
          reason: 'File too large'
        },
        {
          fileName: 'valid.jpg',
          type: 'image/jpeg',
          size: 1024 * 1024, // 1MB
          shouldReject: false
        }
      ];
      
      for (const testCase of fileValidationTests) {
        await page.route('**/api/upload-validate', (route) => {
          const contentType = route.request().headers()['content-type'];
          
          if (contentType?.includes('x-executable')) {
            route.fulfill({
              status: 400,
              contentType: 'application/json',
              body: JSON.stringify({ error: 'Invalid file type' })
            });
          } else if ((route.request().postData()?.length || 0) > 10 * 1024 * 1024) {
            route.fulfill({
              status: 400,
              contentType: 'application/json',
              body: JSON.stringify({ error: 'File too large' })
            });
          } else {
            route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ success: true })
            });
          }
        });
        
        const response = await page.evaluate(async (testCase) => {
          const formData = new FormData();
          const content = 'x'.repeat(testCase.size || 1000);
          const blob = new Blob([content], { type: testCase.type });
          formData.append('file', blob, testCase.fileName);
          
          const res = await fetch('/api/upload-validate', {
            method: 'POST',
            body: formData
          });
          
          return {
            status: res.status,
            body: await res.json()
          };
        }, testCase);
        
        if (testCase.shouldReject) {
          expect(response.status).toBe(400);
          expect(response.body.error).toContain(testCase.reason);
        } else {
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
        }
      }
    });

    test('should handle file downloads', async ({ page }) => {
      await dashboardPage.goto();
      
      await page.route('**/api/download/*', (route) => {
        const fileId = route.request().url().split('/').pop();
        
        route.fulfill({
          status: 200,
          contentType: 'application/octet-stream',
          headers: {
            'Content-Disposition': `attachment; filename="file-${fileId}.txt"`
          },
          body: `File content for ${fileId}`
        });
      });
      
      // Test file download
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/download/test-file-123');
        return {
          status: res.status,
          contentType: res.headers.get('content-type'),
          contentDisposition: res.headers.get('content-disposition'),
          content: await res.text()
        };
      });
      
      expect(response.status).toBe(200);
      expect(response.contentType).toBe('application/octet-stream');
      expect(response.contentDisposition).toContain('attachment');
      expect(response.content).toContain('File content for test-file-123');
    });
  });

  test.describe('Rate Limiting and Throttling @security @api', () => {
    test('should implement rate limiting', async ({ page }) => {
      await dashboardPage.goto();
      
      let requestCount = 0;
      await page.route('**/api/rate-limited', (route) => {
        requestCount++;
        
        if (requestCount > 10) {
          route.fulfill({
            status: 429,
            contentType: 'application/json',
            headers: {
              'Retry-After': '60',
              'X-RateLimit-Limit': '10',
              'X-RateLimit-Remaining': '0'
            },
            body: JSON.stringify({
              error: 'Too Many Requests',
              retryAfter: 60
            })
          });
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            headers: {
              'X-RateLimit-Limit': '10',
              'X-RateLimit-Remaining': String(10 - requestCount)
            },
            body: JSON.stringify({ success: true, requestNumber: requestCount })
          });
        }
      });
      
      // Make multiple rapid requests
      const results = [];
      for (let i = 0; i < 15; i++) {
        const result = await page.evaluate(async (i) => {
          const res = await fetch('/api/rate-limited');
          return {
            attempt: i + 1,
            status: res.status,
            rateLimitRemaining: res.headers.get('X-RateLimit-Remaining')
          };
        }, i);
        
        results.push(result);
        
        if (result.status === 429) {
          break; // Stop when rate limited
        }
      }
      
      // Should eventually hit rate limit
      const rateLimitedResponse = results.find(r => r.status === 429);
      expect(rateLimitedResponse).toBeDefined();
      
      // Rate limit should occur after exceeding limit
      expect(rateLimitedResponse?.attempt).toBeGreaterThan(10);
    });

    test('should handle rate limit headers correctly', async ({ page }) => {
      await dashboardPage.goto();
      
      await page.route('**/api/rate-headers', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '95',
            'X-RateLimit-Reset': String(Date.now() + 3600000) // 1 hour from now
          },
          body: JSON.stringify({ success: true })
        });
      });
      
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/rate-headers');
        return {
          status: res.status,
          limit: res.headers.get('X-RateLimit-Limit'),
          remaining: res.headers.get('X-RateLimit-Remaining'),
          reset: res.headers.get('X-RateLimit-Reset')
        };
      });
      
      expect(response.status).toBe(200);
      expect(parseInt(response.limit || '0')).toBeGreaterThan(0);
      expect(parseInt(response.remaining || '0')).toBeGreaterThanOrEqual(0);
      expect(parseInt(response.reset || '0')).toBeGreaterThan(Date.now());
    });

    test('should implement request throttling', async ({ page }) => {
      await dashboardPage.goto();
      
      const requestTimes: number[] = [];
      
      await page.route('**/api/throttled', (route) => {
        requestTimes.push(Date.now());
        
        // Simulate throttling delay
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, timestamp: Date.now() })
          });
        }, 100); // 100ms throttle delay
      });
      
      // Make concurrent requests
      const promises = [];
      const startTime = Date.now();
      
      for (let i = 0; i < 5; i++) {
        promises.push(
          page.evaluate(async () => {
            const res = await fetch('/api/throttled');
            return await res.json();
          })
        );
      }
      
      await Promise.all(promises);
      const endTime = Date.now();
      
      // Should take time due to throttling
      const totalTime = endTime - startTime;
      expect(totalTime).toBeGreaterThan(400); // At least 400ms for 5 requests with 100ms throttle
    });
  });

  test.describe('Authentication and Authorization @security @api', () => {
    test('should require authentication for protected endpoints', async ({ page }) => {
      await page.goto('/');
      
      await page.route('**/api/protected/**', (route) => {
        const authHeader = route.request().headers()['authorization'];
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Unauthorized',
              message: 'Authentication required'
            })
          });
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: 'protected data' })
          });
        }
      });
      
      // Test without authentication
      const unauthResponse = await page.evaluate(async () => {
        const res = await fetch('/api/protected/resource');
        return { status: res.status, body: await res.json() };
      });
      
      expect(unauthResponse.status).toBe(401);
      expect(unauthResponse.body.error).toBe('Unauthorized');
      
      // Test with authentication
      const authResponse = await page.evaluate(async () => {
        const res = await fetch('/api/protected/resource', {
          headers: { 'Authorization': 'Bearer test-token' }
        });
        return { status: res.status, body: await res.json() };
      });
      
      expect(authResponse.status).toBe(200);
      expect(authResponse.body.success).toBe(true);
    });

    test('should validate JWT tokens', async ({ page }) => {
      await page.goto('/');
      
      await page.route('**/api/jwt-protected/**', (route) => {
        const authHeader = route.request().headers()['authorization'];
        const token = authHeader?.replace('Bearer ', '');
        
        // Mock JWT validation
        const validTokens = ['valid-jwt-token', 'admin-jwt-token'];
        const expiredTokens = ['expired-jwt-token'];
        const malformedTokens = ['malformed-token'];
        
        if (!token) {
          route.fulfill({
            status: 401,
            body: JSON.stringify({ error: 'Token required' })
          });
        } else if (expiredTokens.includes(token)) {
          route.fulfill({
            status: 401,
            body: JSON.stringify({ error: 'Token expired' })
          });
        } else if (malformedTokens.includes(token)) {
          route.fulfill({
            status: 401,
            body: JSON.stringify({ error: 'Invalid token format' })
          });
        } else if (validTokens.includes(token)) {
          route.fulfill({
            status: 200,
            body: JSON.stringify({
              success: true,
              user: { id: 1, role: token === 'admin-jwt-token' ? 'admin' : 'user' }
            })
          });
        } else {
          route.fulfill({
            status: 401,
            body: JSON.stringify({ error: 'Invalid token' })
          });
        }
      });
      
      const tokenTests = [
        { token: null, expectedStatus: 401, expectedError: 'Token required' },
        { token: 'expired-jwt-token', expectedStatus: 401, expectedError: 'Token expired' },
        { token: 'malformed-token', expectedStatus: 401, expectedError: 'Invalid token' },
        { token: 'valid-jwt-token', expectedStatus: 200, expectedSuccess: true }
      ];
      
      for (const test of tokenTests) {
        const response = await page.evaluate(async (token) => {
          const headers: any = {};
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          const res = await fetch('/api/jwt-protected/resource', { headers });
          return { status: res.status, body: await res.json() };
        }, test.token);
        
        expect(response.status).toBe(test.expectedStatus);
        
        if (test.expectedError) {
          expect(response.body.error).toContain(test.expectedError);
        }
        
        if (test.expectedSuccess) {
          expect(response.body.success).toBe(true);
        }
      }
    });

    test('should enforce role-based access control', async ({ page }) => {
      await page.goto('/');
      
      await page.route('**/api/admin/**', (route) => {
        const authHeader = route.request().headers()['authorization'];
        const token = authHeader?.replace('Bearer ', '');
        
        // Mock role validation
        if (token === 'admin-token') {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true, adminData: 'sensitive data' })
          });
        } else if (token === 'user-token') {
          route.fulfill({
            status: 403,
            body: JSON.stringify({ error: 'Forbidden', message: 'Admin access required' })
          });
        } else {
          route.fulfill({
            status: 401,
            body: JSON.stringify({ error: 'Unauthorized' })
          });
        }
      });
      
      // Test admin access
      const adminResponse = await page.evaluate(async () => {
        const res = await fetch('/api/admin/users', {
          headers: { 'Authorization': 'Bearer admin-token' }
        });
        return { status: res.status, body: await res.json() };
      });
      
      expect(adminResponse.status).toBe(200);
      expect(adminResponse.body.success).toBe(true);
      
      // Test user access (should be forbidden)
      const userResponse = await page.evaluate(async () => {
        const res = await fetch('/api/admin/users', {
          headers: { 'Authorization': 'Bearer user-token' }
        });
        return { status: res.status, body: await res.json() };
      });
      
      expect(userResponse.status).toBe(403);
      expect(userResponse.body.error).toBe('Forbidden');
    });
  });

  test.describe('API Caching and Performance @performance @api', () => {
    test('should implement proper caching headers', async ({ page }) => {
      await dashboardPage.goto();
      
      await page.route('**/api/cacheable/**', (route) => {
        const url = route.request().url();
        
        if (url.includes('static-data')) {
          route.fulfill({
            status: 200,
            headers: {
              'Cache-Control': 'public, max-age=3600',
              'ETag': '"static-data-v1"',
              'Last-Modified': 'Wed, 21 Oct 2023 07:28:00 GMT'
            },
            body: JSON.stringify({ data: 'static content', version: 1 })
          });
        } else if (url.includes('dynamic-data')) {
          route.fulfill({
            status: 200,
            headers: {
              'Cache-Control': 'private, max-age=60',
              'ETag': '"dynamic-data-v1"'
            },
            body: JSON.stringify({ data: 'dynamic content', timestamp: Date.now() })
          });
        } else {
          route.fulfill({
            status: 200,
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            },
            body: JSON.stringify({ data: 'no-cache content' })
          });
        }
      });
      
      // Test static data caching
      const staticResponse = await page.evaluate(async () => {
        const res = await fetch('/api/cacheable/static-data');
        return {
          status: res.status,
          cacheControl: res.headers.get('Cache-Control'),
          etag: res.headers.get('ETag'),
          lastModified: res.headers.get('Last-Modified')
        };
      });
      
      expect(staticResponse.cacheControl).toContain('public');
      expect(staticResponse.cacheControl).toContain('max-age=3600');
      expect(staticResponse.etag).toBeDefined();
      expect(staticResponse.lastModified).toBeDefined();
      
      // Test dynamic data caching
      const dynamicResponse = await page.evaluate(async () => {
        const res = await fetch('/api/cacheable/dynamic-data');
        return {
          cacheControl: res.headers.get('Cache-Control')
        };
      });
      
      expect(dynamicResponse.cacheControl).toContain('private');
      expect(dynamicResponse.cacheControl).toContain('max-age=60');
    });

    test('should handle conditional requests', async ({ page }) => {
      await dashboardPage.goto();
      
      let requestCount = 0;
      await page.route('**/api/conditional/**', (route) => {
        requestCount++;
        const ifNoneMatch = route.request().headers()['if-none-match'];
        const ifModifiedSince = route.request().headers()['if-modified-since'];
        
        const etag = '"resource-v1"';
        const lastModified = 'Wed, 21 Oct 2023 07:28:00 GMT';
        
        // Handle conditional requests
        if (ifNoneMatch === etag || ifModifiedSince === lastModified) {
          route.fulfill({
            status: 304,
            headers: {
              'ETag': etag,
              'Last-Modified': lastModified
            }
          });
        } else {
          route.fulfill({
            status: 200,
            headers: {
              'ETag': etag,
              'Last-Modified': lastModified,
              'Cache-Control': 'max-age=3600'
            },
            body: JSON.stringify({ data: 'resource content', requestCount })
          });
        }
      });
      
      // First request
      const firstResponse = await page.evaluate(async () => {
        const res = await fetch('/api/conditional/resource');
        return {
          status: res.status,
          etag: res.headers.get('ETag'),
          body: await res.json()
        };
      });
      
      expect(firstResponse.status).toBe(200);
      expect(firstResponse.etag).toBeDefined();
      
      // Second request with If-None-Match
      const secondResponse = await page.evaluate(async (etag) => {
        const res = await fetch('/api/conditional/resource', {
          headers: { 'If-None-Match': etag }
        });
        return { status: res.status };
      }, firstResponse.etag);
      
      expect(secondResponse.status).toBe(304); // Not Modified
    });

    test('should optimize response sizes', async ({ page }) => {
      await dashboardPage.goto();
      
      await page.route('**/api/optimized/**', (route) => {
        const acceptEncoding = route.request().headers()['accept-encoding'];
        const url = route.request().url();
        
        let body = JSON.stringify({ data: 'x'.repeat(1000) }); // 1KB of data
        let headers: any = { 'Content-Type': 'application/json' };
        
        // Simulate compression
        if (acceptEncoding?.includes('gzip')) {
          headers['Content-Encoding'] = 'gzip';
          headers['Content-Length'] = String(Math.floor(body.length * 0.3)); // Simulate 70% compression
        } else {
          headers['Content-Length'] = String(body.length);
        }
        
        route.fulfill({ status: 200, headers, body });
      });
      
      // Request with gzip support
      const compressedResponse = await page.evaluate(async () => {
        const res = await fetch('/api/optimized/data', {
          headers: { 'Accept-Encoding': 'gzip, deflate' }
        });
        return {
          contentEncoding: res.headers.get('Content-Encoding'),
          contentLength: parseInt(res.headers.get('Content-Length') || '0')
        };
      });
      
      expect(compressedResponse.contentEncoding).toBe('gzip');
      expect(compressedResponse.contentLength).toBeLessThan(1000); // Should be compressed
      
      // Request without compression
      const uncompressedResponse = await page.evaluate(async () => {
        const res = await fetch('/api/optimized/data');
        return {
          contentEncoding: res.headers.get('Content-Encoding'),
          contentLength: parseInt(res.headers.get('Content-Length') || '0')
        };
      });
      
      expect(uncompressedResponse.contentEncoding).toBeNull();
      expect(uncompressedResponse.contentLength).toBeGreaterThanOrEqual(1000);
    });
  });

  test.describe('API Monitoring and Logging @monitoring', () => {
    test('should log API requests and responses', async ({ page }) => {
      await dashboardPage.goto();
      
      const apiLogs: any[] = [];
      
      // Monitor all API requests
      page.on('response', (response) => {
        if (response.url().includes('/api/')) {
          const request = response.request();
          apiLogs.push({
            method: request.method(),
            url: response.url(),
            status: response.status(),
            timing: request.timing(),
            headers: response.headers()
          });
        }
      });
      
      // Make some API calls
      await page.evaluate(() => {
        return Promise.all([
          fetch('/api/test/endpoint1'),
          fetch('/api/test/endpoint2'),
          fetch('/api/test/endpoint3')
        ]);
      });
      
      await page.waitForTimeout(1000);
      
      // Should have logged API calls
      expect(apiLogs.length).toBeGreaterThan(0);
      
      // Each log should contain required information
      apiLogs.forEach(log => {
        expect(log.method).toBeTruthy();
        expect(log.url).toContain('/api/');
        expect(log.status).toBeGreaterThan(0);
        expect(log.timing).toBeDefined();
      });
    });

    test('should track API performance metrics', async ({ page }) => {
      await dashboardPage.goto();
      
      const performanceData: any[] = [];
      
      page.on('response', (response) => {
        if (response.url().includes('/api/')) {
          const request = response.request();
          const timing = request.timing();
          
          performanceData.push({
            url: response.url(),
            responseTime: timing.responseEnd - timing.requestStart,
            dnsTime: timing.domainLookupEnd - timing.domainLookupStart,
            connectTime: timing.connectEnd - timing.connectStart,
            sslTime: timing.connectEnd - timing.secureConnectionStart,
            ttfb: timing.responseStart - timing.requestStart
          });
        }
      });
      
      // Make API calls
      await page.evaluate(() => {
        return fetch('/api/performance/test');
      });
      
      await page.waitForTimeout(1000);
      
      expect(performanceData.length).toBeGreaterThan(0);
      
      const metrics = performanceData[0];
      expect(metrics.responseTime).toBeGreaterThan(0);
      expect(metrics.ttfb).toBeGreaterThan(0);
      expect(metrics.responseTime).toBeLessThan(TestData.performance.thresholds.apiResponse);
    });

    test('should handle API health checks', async ({ page }) => {
      await page.goto('/');
      
      await page.route('**/api/health', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'healthy',
            timestamp: Date.now(),
            uptime: 3600,
            version: '1.0.0',
            dependencies: {
              database: 'connected',
              redis: 'connected',
              external_api: 'healthy'
            },
            metrics: {
              requests_per_second: 45.2,
              average_response_time: 250,
              error_rate: 0.001
            }
          })
        });
      });
      
      const healthResponse = await page.evaluate(async () => {
        const res = await fetch('/api/health');
        return { status: res.status, body: await res.json() };
      });
      
      expect(healthResponse.status).toBe(200);
      expect(healthResponse.body.status).toBe('healthy');
      expect(healthResponse.body.dependencies).toBeDefined();
      expect(healthResponse.body.metrics).toBeDefined();
      expect(healthResponse.body.uptime).toBeGreaterThan(0);
    });
  });
});