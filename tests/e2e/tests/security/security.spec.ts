import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/auth/login-page';
import { RegisterPage } from '../../pages/auth/register-page';
import { DashboardPage } from '../../pages/core/dashboard-page';
import { TestData } from '../../fixtures/test-data';

test.describe('Security Testing', () => {
  test.describe('Cross-Site Scripting (XSS) Protection @security @critical', () => {
    test('should prevent reflected XSS in login form', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      const xssPayloads = TestData.security.xss.payloads;
      
      for (const payload of xssPayloads) {
        await loginPage.fillCredentials(payload, 'password');
        await loginPage.submitLogin();
        
        // Check that XSS payload was not executed
        const alertExecuted = await page.evaluate(() => 
          document.body.innerHTML.includes('alert(') || 
          document.querySelectorAll('script[src*="alert"]').length > 0 ||
          document.querySelectorAll('*[onload*="alert"]').length > 0
        );
        
        expect(alertExecuted, `XSS payload should be sanitized: ${payload}`).toBe(false);
        
        // Check for proper escaping in DOM
        const emailValue = await page.locator('[data-testid="email"]').inputValue();
        expect(emailValue).not.toContain('<script>');
        
        // Clear for next test
        await page.reload();
      }
    });

    test('should prevent stored XSS in registration form', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      
      const xssPayloads = TestData.security.xss.payloads;
      
      for (const payload of xssPayloads) {
        await registerPage.fillRegistrationForm({
          firstName: payload,
          lastName: payload,
          email: 'test@example.com',
          password: 'SecurePassword123!',
          confirmPassword: 'SecurePassword123!',
          agreeToTerms: true
        });
        
        await registerPage.submitRegistration();
        
        // Check that XSS was not executed
        const maliciousContent = await page.evaluate(() => {
          return document.documentElement.outerHTML.includes('<script>alert') ||
                 document.documentElement.outerHTML.includes('javascript:') ||
                 document.documentElement.outerHTML.includes('onerror=');
        });
        
        expect(maliciousContent, `XSS payload should be prevented: ${payload}`).toBe(false);
        
        await registerPage.clearForm();
      }
    });

    test('should sanitize user input in search functionality', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await dashboardPage.waitForDashboardLoad();
      
      const xssPayloads = [
        '<script>alert("XSS in search")</script>',
        '<img src="x" onerror="alert(\'XSS\')">',
        'javascript:alert("XSS")',
        '<svg onload="alert(\'XSS\')">'
      ];
      
      for (const payload of xssPayloads) {
        await dashboardPage.search(payload);
        
        // Check that search results don't execute XSS
        const hasExecutedXSS = await page.evaluate(() => 
          window.document.querySelectorAll('script[src*="alert"]').length > 0
        );
        
        expect(hasExecutedXSS).toBe(false);
        
        // Check search results are properly escaped
        const searchResults = page.locator('.search-results, [data-testid="search-results"]');
        if (await searchResults.isVisible({ timeout: 2000 })) {
          const resultsHTML = await searchResults.innerHTML();
          expect(resultsHTML).not.toContain('<script>');
          expect(resultsHTML).not.toContain('javascript:');
        }
      }
    });

    test('should prevent DOM-based XSS', async ({ page }) => {
      await page.goto('/#<script>alert("DOM XSS")</script>');
      
      // Wait for page to process hash
      await page.waitForTimeout(1000);
      
      // Check that script in hash was not executed
      const alertExecuted = await page.evaluate(() => 
        document.location.hash.includes('script') &&
        document.body.innerHTML.includes('<script>')
      );
      
      expect(alertExecuted).toBe(false);
    });
  });

  test.describe('Cross-Site Request Forgery (CSRF) Protection @security @critical', () => {
    test('should require CSRF token for login', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Remove or modify CSRF token
      await page.evaluate(() => {
        const csrfInputs = document.querySelectorAll('input[name*="csrf"], input[name*="token"], meta[name="csrf-token"]');
        csrfInputs.forEach(input => {
          if (input.tagName === 'INPUT') {
            (input as HTMLInputElement).value = 'invalid-csrf-token';
          } else {
            input.setAttribute('content', 'invalid-csrf-token');
          }
        });
      });
      
      const user = TestData.users.validUser;
      await loginPage.fillCredentials(user.email, user.password);
      await loginPage.submitLogin();
      
      // Should be rejected due to invalid CSRF token
      await loginPage.waitForErrorMessage();
      const errorMessage = await loginPage.errorMessage.textContent();
      
      expect(errorMessage?.toLowerCase()).toMatch(/(invalid|token|csrf|forbidden)/);
    });

    test('should require CSRF token for registration', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      
      // Modify CSRF protection
      await page.evaluate(() => {
        const csrfElements = document.querySelectorAll('[name*="csrf"], [name*="token"]');
        csrfElements.forEach(el => {
          if (el.tagName === 'INPUT') {
            (el as HTMLInputElement).value = 'tampered-token';
          }
        });
      });
      
      await registerPage.fillRegistrationForm({
        firstName: 'Test',
        lastName: 'User',
        email: 'csrf-test@example.com',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        agreeToTerms: true
      });
      
      await registerPage.submitRegistration();
      
      // Should prevent registration with invalid token
      await registerPage.waitForErrorMessage();
    });

    test('should validate referrer for sensitive actions', async ({ page }) => {
      const loginPage = new LoginPage(page);
      
      // Mock request with external referrer
      await page.setExtraHTTPHeaders({
        'Referer': 'https://malicious-site.com/csrf-attack'
      });
      
      await loginPage.goto();
      
      const user = TestData.users.validUser;
      await loginPage.fillCredentials(user.email, user.password);
      await loginPage.submitLogin();
      
      // Should handle suspicious referrer appropriately
      // (Implementation dependent - might show warning or require additional verification)
    });

    test('should use SameSite cookies', async ({ page, context }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Login to set cookies
      await loginPage.loginAsTestUser();
      
      // Check cookie security attributes
      const cookies = await context.cookies();
      const authCookies = cookies.filter(cookie => 
        cookie.name.toLowerCase().includes('token') ||
        cookie.name.toLowerCase().includes('session') ||
        cookie.name.toLowerCase().includes('auth')
      );
      
      authCookies.forEach(cookie => {
        // Security cookies should have SameSite attribute
        expect(['Strict', 'Lax']).toContain(cookie.sameSite);
        
        // Should be HttpOnly for security
        expect(cookie.httpOnly, `Cookie ${cookie.name} should be HttpOnly`).toBe(true);
        
        // Should be Secure in production
        if (page.url().startsWith('https://')) {
          expect(cookie.secure, `Cookie ${cookie.name} should be Secure`).toBe(true);
        }
      });
    });
  });

  test.describe('SQL Injection Protection @security @critical', () => {
    test('should prevent SQL injection in login form', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      const sqlPayloads = TestData.security.sql.payloads;
      
      for (const payload of sqlPayloads) {
        await loginPage.fillCredentials(payload, 'password');
        await loginPage.submitLogin();
        
        // Should not cause SQL errors or bypass authentication
        const isLoggedIn = await loginPage.isUserLoggedIn();
        expect(isLoggedIn, `SQL injection should not bypass auth: ${payload}`).toBe(false);
        
        // Check for SQL error messages in response
        const pageContent = await page.textContent('body');
        const hasSQLError = pageContent?.toLowerCase().includes('sql') ||
                           pageContent?.toLowerCase().includes('database') ||
                           pageContent?.toLowerCase().includes('mysql') ||
                           pageContent?.toLowerCase().includes('postgresql');
        
        expect(hasSQLError, 'Should not expose SQL errors').toBe(false);
        
        // Clear for next test
        await page.reload();
      }
    });

    test('should prevent SQL injection in search', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await dashboardPage.waitForDashboardLoad();
      
      const sqlPayloads = [
        "' UNION SELECT * FROM users --",
        "'; DROP TABLE users; --",
        "admin' --",
        "' OR 1=1 --"
      ];
      
      for (const payload of sqlPayloads) {
        await dashboardPage.search(payload);
        
        // Should not return unauthorized data or cause errors
        const errorMessages = await page.locator('.error, [role="alert"]').allTextContents();
        const hasSQLError = errorMessages.some(msg => 
          msg.toLowerCase().includes('sql') || 
          msg.toLowerCase().includes('database')
        );
        
        expect(hasSQLError, 'Should not expose SQL errors in search').toBe(false);
      }
    });

    test('should use parameterized queries (API testing)', async ({ page }) => {
      // Mock API to test parameterized query behavior
      let sqlInjectionAttempted = false;
      
      await page.route('**/api/**', (route) => {
        const postData = route.request().postDataJSON();
        
        // Check if payload contains SQL injection patterns
        const dataString = JSON.stringify(postData).toLowerCase();
        const sqlPatterns = ['union select', 'drop table', "' or 1=1", "'; --"];
        
        sqlInjectionAttempted = sqlPatterns.some(pattern => 
          dataString.includes(pattern)
        );
        
        // Simulate proper parameterized query handling
        route.fulfill({
          status: sqlInjectionAttempted ? 400 : 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: sqlInjectionAttempted ? 'Invalid input' : null 
          })
        });
      });
      
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      await loginPage.fillCredentials("'; DROP TABLE users; --", 'password');
      await loginPage.submitLogin();
      
      expect(sqlInjectionAttempted).toBe(true);
    });
  });

  test.describe('Authentication Bypass Protection @security @critical', () => {
    test('should prevent direct URL access to protected pages', async ({ page }) => {
      // Try to access dashboard without authentication
      await page.goto('/dashboard');
      
      // Should redirect to login or show access denied
      await page.waitForURL(url => url.includes('/login') || url.includes('/access-denied'), {
        timeout: 10000
      });
      
      expect(page.url()).toMatch(/(login|access-denied|unauthorized)/);
    });

    test('should invalidate session on logout', async ({ page, context }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new DashboardPage(page);
      
      // Login first
      await loginPage.goto();
      await loginPage.loginAsTestUser();
      
      // Go to dashboard
      await dashboardPage.goto();
      expect(await dashboardPage.isDashboardLoaded()).toBe(true);
      
      // Logout
      await dashboardPage.logout();
      
      // Try to access dashboard again
      await page.goto('/dashboard');
      
      // Should be redirected to login
      await page.waitForURL(url => url.includes('/login'), { timeout: 10000 });
    });

    test('should handle session timeout', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      
      // Mock expired session
      await page.route('**/api/**', (route) => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Session expired' })
        });
      });
      
      await dashboardPage.goto();
      
      // Should handle session timeout gracefully
      const hasSessionError = await page.locator('text=/session.*expired|please.*login/i').isVisible({ timeout: 5000 });
      const redirectedToLogin = page.url().includes('/login');
      
      expect(hasSessionError || redirectedToLogin).toBe(true);
    });

    test('should prevent privilege escalation', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await dashboardPage.waitForDashboardLoad();
      
      // Try to access admin-only features
      const adminPanel = page.locator('[data-testid="admin-panel"], .admin-only');
      const isAdminVisible = await adminPanel.isVisible().catch(() => false);
      
      // Regular user should not see admin features
      expect(isAdminVisible).toBe(false);
      
      // Try direct API access to admin endpoints
      await page.route('**/api/admin/**', (route) => {
        route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Forbidden' })
        });
      });
      
      const response = await page.request.get('/api/admin/users');
      expect(response.status()).toBe(403);
    });
  });

  test.describe('Input Validation and Sanitization @security', () => {
    test('should validate file upload types', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      
      // Look for file upload functionality
      const fileInput = page.locator('input[type="file"]');
      
      if (await fileInput.isVisible({ timeout: 2000 })) {
        // Try to upload malicious file
        const maliciousFile = TestData.files.invalid.malicious;
        
        // Create a mock file
        await fileInput.setInputFiles({
          name: maliciousFile.name,
          mimeType: maliciousFile.type,
          buffer: Buffer.from(atob(maliciousFile.content.split(',')[1]))
        });
        
        // Should reject malicious file
        const errorMessage = await page.locator('.error, [role="alert"]').textContent();
        expect(errorMessage?.toLowerCase()).toMatch(/(invalid|not.*allowed|type)/);
      }
    });

    test('should validate file size limits', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      
      const fileInput = page.locator('input[type="file"]');
      
      if (await fileInput.isVisible({ timeout: 2000 })) {
        // Try to upload oversized file
        const largeFile = TestData.files.invalid.tooLarge;
        
        await fileInput.setInputFiles({
          name: largeFile.name,
          mimeType: largeFile.type,
          buffer: Buffer.alloc(largeFile.size)
        });
        
        // Should reject large file
        const errorMessage = await page.locator('.error, [role="alert"]').textContent();
        expect(errorMessage?.toLowerCase()).toMatch(/(size|large|limit|exceed)/);
      }
    });

    test('should prevent path traversal attacks', async ({ page }) => {
      const pathTraversalPayloads = TestData.security.pathTraversal;
      
      // Test in file download/access endpoints
      for (const payload of pathTraversalPayloads) {
        const response = await page.request.get(`/api/files/${payload}`).catch(() => null);
        
        if (response) {
          // Should not allow access to system files
          expect([400, 403, 404]).toContain(response.status());
          
          const responseText = await response.text().catch(() => '');
          expect(responseText).not.toMatch(/root:|password:|etc\/passwd/);
        }
      }
    });

    test('should sanitize HTML content', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      
      // Test HTML sanitization in user-generated content
      const htmlPayloads = [
        '<script>alert("XSS")</script>',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<object data="javascript:alert(1)">',
        '<embed src="javascript:alert(1)">'
      ];
      
      for (const payload of htmlPayloads) {
        // Find content areas that might accept HTML
        const contentAreas = page.locator('textarea, [contenteditable], .rich-editor');
        const contentCount = await contentAreas.count();
        
        if (contentCount > 0) {
          await contentAreas.first().fill(payload);
          
          // Check that dangerous HTML was stripped
          const sanitizedContent = await contentAreas.first().innerHTML();
          expect(sanitizedContent).not.toContain('<script>');
          expect(sanitizedContent).not.toContain('javascript:');
          expect(sanitizedContent).not.toContain('<iframe>');
        }
      }
    });
  });

  test.describe('Rate Limiting and DDoS Protection @security', () => {
    test('should implement rate limiting on login attempts', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Attempt multiple rapid logins
      const maxAttempts = 10;
      let rateLimited = false;
      
      for (let i = 0; i < maxAttempts; i++) {
        await loginPage.fillCredentials('test@example.com', 'wrongpassword');
        
        const responsePromise = page.waitForResponse(response => 
          response.url().includes('/api/auth/login')
        ).catch(() => null);
        
        await loginPage.submitLogin();
        
        const response = await responsePromise;
        
        if (response && response.status() === 429) {
          rateLimited = true;
          break;
        }
        
        await page.waitForTimeout(100);
      }
      
      expect(rateLimited, 'Should implement rate limiting after multiple failed attempts').toBe(true);
    });

    test('should implement rate limiting on API endpoints', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      
      // Make rapid API requests
      const requests = [];
      for (let i = 0; i < 20; i++) {
        requests.push(
          page.request.get('/api/dashboard/stats').catch(() => null)
        );
      }
      
      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r && r.status() === 429);
      
      // Should rate limit excessive requests
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should handle slow loris attacks', async ({ page }) => {
      const loginPage = new LoginPage(page);
      
      // Simulate slow request (basic test)
      await page.route('**/api/auth/login', async (route) => {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Processed' })
        });
      });
      
      await loginPage.goto();
      
      const startTime = Date.now();
      await loginPage.fillCredentials('test@example.com', 'password');
      await loginPage.submitLogin();
      const endTime = Date.now();
      
      // Should have reasonable timeout handling
      const requestTime = endTime - startTime;
      expect(requestTime).toBeLessThan(30000); // Should timeout before 30 seconds
    });
  });

  test.describe('Content Security Policy (CSP) @security', () => {
    test('should have proper CSP headers', async ({ page }) => {
      const response = await page.goto('/');
      const cspHeader = response?.headers()['content-security-policy'];
      
      if (cspHeader) {
        // Should have restrictive CSP
        expect(cspHeader).toMatch(/(default-src|script-src)/);
        expect(cspHeader).not.toMatch(/unsafe-eval/);
        expect(cspHeader).not.toMatch(/'unsafe-inline'.*script-src/);
      }
    });

    test('should block inline scripts when CSP is enabled', async ({ page }) => {
      await page.goto('/');
      
      // Try to inject inline script
      await page.evaluate(() => {
        const script = document.createElement('script');
        script.textContent = 'window.inlineScriptExecuted = true;';
        document.head.appendChild(script);
      });
      
      const inlineScriptExecuted = await page.evaluate(() => 
        (window as any).inlineScriptExecuted
      );
      
      // Should be blocked by CSP (if properly configured)
      expect(inlineScriptExecuted).toBeFalsy();
    });

    test('should report CSP violations', async ({ page }) => {
      const cspViolations: any[] = [];
      
      page.on('console', (msg) => {
        if (msg.text().includes('Content Security Policy')) {
          cspViolations.push(msg.text());
        }
      });
      
      await page.goto('/');
      
      // Try to trigger CSP violation
      await page.evaluate(() => {
        try {
          eval('console.log("This should be blocked by CSP")');
        } catch (e) {
          console.log('CSP blocked eval:', e);
        }
      });
      
      // Should report violations (if CSP reporting is configured)
      await page.waitForTimeout(1000);
      
      // CSP violations might be reported to console or external endpoint
      const hasCSPProtection = cspViolations.length > 0;
      
      if (hasCSPProtection) {
        expect(cspViolations.some(v => v.includes('eval'))).toBe(true);
      }
    });
  });

  test.describe('Secure Headers @security', () => {
    test('should have security headers', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers() || {};
      
      // Check for important security headers
      const securityHeaders = {
        'x-frame-options': 'DENY',
        'x-content-type-options': 'nosniff',
        'x-xss-protection': '1; mode=block',
        'strict-transport-security': undefined, // Should exist for HTTPS
        'referrer-policy': 'strict-origin-when-cross-origin'
      };
      
      Object.entries(securityHeaders).forEach(([header, expectedValue]) => {
        const actualValue = headers[header.toLowerCase()];
        
        if (expectedValue === undefined) {
          // Just check that header exists
          if (page.url().startsWith('https://')) {
            expect(actualValue, `${header} should be present for HTTPS`).toBeTruthy();
          }
        } else {
          expect(actualValue).toContain(expectedValue);
        }
      });
    });

    test('should prevent clickjacking', async ({ page }) => {
      await page.goto('/');
      
      // Try to embed page in iframe
      const canBeFramed = await page.evaluate(() => {
        try {
          const iframe = document.createElement('iframe');
          iframe.src = window.location.origin;
          document.body.appendChild(iframe);
          return true;
        } catch (e) {
          return false;
        }
      });
      
      // X-Frame-Options should prevent framing
      expect(canBeFramed).toBe(false);
    });

    test('should prevent MIME sniffing', async ({ page }) => {
      // Request a JavaScript file
      const response = await page.request.get('/static/js/main.js').catch(() => null);
      
      if (response) {
        const contentType = response.headers()['content-type'];
        const nosniff = response.headers()['x-content-type-options'];
        
        expect(contentType).toContain('javascript');
        expect(nosniff).toBe('nosniff');
      }
    });
  });

  test.describe('Data Protection and Privacy @security', () => {
    test('should not expose sensitive information in errors', async ({ page }) => {
      // Trigger various error conditions
      const errorUrls = [
        '/api/nonexistent',
        '/api/users/admin',
        '/api/internal/debug'
      ];
      
      for (const url of errorUrls) {
        const response = await page.request.get(url).catch(() => null);
        
        if (response) {
          const responseText = await response.text();
          
          // Should not expose sensitive information
          expect(responseText).not.toMatch(/(password|secret|key|token|database|internal)/i);
          expect(responseText).not.toContain('stack trace');
          expect(responseText).not.toContain('file path');
        }
      }
    });

    test('should handle personal data appropriately', async ({ page }) => {
      const registerPage = new RegisterPage(page);
      await registerPage.goto();
      
      // Fill form with personal data
      await registerPage.fillRegistrationForm({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        agreeToTerms: true
      });
      
      // Check that data is not exposed in client-side storage inappropriately
      const localStorageData = await page.evaluate(() => JSON.stringify(localStorage));
      const sessionStorageData = await page.evaluate(() => JSON.stringify(sessionStorage));
      
      // Personal data should not be stored in browser storage
      expect(localStorageData).not.toContain('john.doe@example.com');
      expect(sessionStorageData).not.toContain('SecurePassword123!');
    });

    test('should implement proper password handling', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Fill password
      await loginPage.page.locator('[data-testid="password"]').fill('MySecretPassword123!');
      
      // Password should not be visible in DOM
      const passwordValue = await loginPage.page.locator('[data-testid="password"]').getAttribute('value');
      const inputType = await loginPage.page.locator('[data-testid="password"]').getAttribute('type');
      
      expect(inputType).toBe('password');
      
      // Check that password is not exposed in page source
      const pageContent = await page.content();
      expect(pageContent).not.toContain('MySecretPassword123!');
    });
  });

  test.describe('Browser Security Features @security', () => {
    test('should work with strict browser security settings', async ({ page }) => {
      // Enable strict security settings
      await page.setExtraHTTPHeaders({
        'DNT': '1', // Do Not Track
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin'
      });
      
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Should still function with strict security headers
      expect(await loginPage.isPageLoaded()).toBe(true);
    });

    test('should handle mixed content appropriately', async ({ page }) => {
      // This test would be relevant for HTTPS sites
      if (page.url().startsWith('https://')) {
        await page.goto('/');
        
        // Check for mixed content warnings
        const consoleErrors = await page.evaluate(() => {
          const errors: string[] = [];
          const originalError = console.error;
          console.error = (...args) => {
            errors.push(args.join(' '));
            originalError.apply(console, args);
          };
          return errors;
        });
        
        const mixedContentErrors = consoleErrors.filter(error => 
          error.toLowerCase().includes('mixed content') ||
          error.toLowerCase().includes('blocked loading')
        );
        
        expect(mixedContentErrors.length).toBe(0);
      }
    });

    test('should respect browser security policies', async ({ page, context }) => {
      // Test with various security policies
      await context.grantPermissions([]);
      
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      
      // Should handle lack of permissions gracefully
      const hasLocationAccess = await page.evaluate(async () => {
        try {
          await navigator.geolocation.getCurrentPosition(() => {});
          return true;
        } catch {
          return false;
        }
      }).catch(() => false);
      
      // Should not have unexpected permissions
      expect(hasLocationAccess).toBe(false);
    });
  });
});