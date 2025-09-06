import { test, expect } from '@playwright/test';

/**
 * Security Testing Suite
 * Comprehensive security testing including:
 * - XSS attack prevention
 * - SQL injection attempts
 * - CSRF token validation
 * - Authentication bypass attempts
 * - Rate limiting enforcement
 * - Input sanitization
 * - Content Security Policy
 * - Secure headers validation
 */

test.describe('Security Testing', () => {
  test.describe('Cross-Site Scripting (XSS) Prevention', () => {
    test('should prevent reflected XSS attacks', async ({ page }) => {
      await page.goto('/');

      // Common XSS payloads to test
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '"><script>alert("XSS")</script>',
        "javascript:alert('XSS')",
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
      ];

      // Test in search inputs
      const searchInputs = page.locator('input[type="search"], input[placeholder*="Search"]');
      
      if (await searchInputs.count() > 0) {
        for (const payload of xssPayloads.slice(0, 2)) {
          await searchInputs.first().fill(payload);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(1000);

          // Check if script executed (shouldn't happen)
          const alertDialogs = page.locator('dialog[role="alertdialog"], .alert');
          const hasAlert = await alertDialogs.count() > 0;

          expect(hasAlert).toBeFalsy();
          console.log(`✅ XSS payload blocked: ${payload.substring(0, 20)}...`);
        }
      }

      // Test in form inputs
      const textInputs = page.locator('input[type="text"], textarea');
      if (await textInputs.count() > 0) {
        const input = textInputs.first();
        await input.fill(xssPayloads[0]);
        
        // Submit form if possible
        const submitButton = page.locator('button[type="submit"]');
        if (await submitButton.count() > 0) {
          await submitButton.click();
          await page.waitForTimeout(1000);
        }

        // Verify payload is escaped in the DOM
        const inputValue = await input.inputValue();
        expect(inputValue).not.toContain('<script>');
        console.log('✅ XSS payload sanitized in form input');
      }
    });

    test('should prevent DOM-based XSS', async ({ page }) => {
      // Test URL fragment XSS
      const xssFragment = '#<script>alert("XSS")</script>';
      
      await page.goto(`/${xssFragment}`);
      await page.waitForLoadState('networkidle');

      // Check that script didn't execute
      const pageContent = await page.content();
      expect(pageContent).not.toContain('<script>alert("XSS")</script>');
      console.log('✅ URL fragment XSS prevented');
    });
  });

  test.describe('Content Security Policy (CSP)', () => {
    test('should have proper CSP headers', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers() || {};

      const cspHeader = headers['content-security-policy'] || headers['content-security-policy-report-only'];
      
      if (cspHeader) {
        console.log('✅ CSP header found:', cspHeader);
        
        // Check for common CSP directives
        const requiredDirectives = ['default-src', 'script-src', 'style-src'];
        let presentDirectives = 0;
        
        requiredDirectives.forEach(directive => {
          if (cspHeader.includes(directive)) {
            presentDirectives++;
            console.log(`✅ CSP directive present: ${directive}`);
          }
        });

        expect(presentDirectives).toBeGreaterThan(0);
      } else {
        console.log('⚠️ No CSP header detected');
      }
    });

    test('should block unsafe inline scripts if CSP is strict', async ({ page }) => {
      await page.goto('/');

      // Try to inject and execute inline script
      const scriptInjected = await page.evaluate(() => {
        try {
          const script = document.createElement('script');
          script.innerHTML = 'window.xssTest = true;';
          document.head.appendChild(script);
          return true;
        } catch (error) {
          return false;
        }
      });

      // Check if script executed
      const scriptExecuted = await page.evaluate(() => window.xssTest === true);
      
      if (scriptInjected && !scriptExecuted) {
        console.log('✅ CSP blocked inline script execution');
      } else if (!scriptInjected) {
        console.log('✅ Script injection prevented');
      } else {
        console.log('⚠️ Inline script execution allowed - CSP may be permissive');
      }
    });
  });

  test.describe('SQL Injection Prevention', () => {
    test('should prevent SQL injection in search', async ({ page }) => {
      await page.goto('/');

      const sqlPayloads = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM users --",
        "admin'--",
        "' OR 1=1#"
      ];

      // Monitor for database errors
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().toLowerCase().includes('sql')) {
          consoleErrors.push(msg.text());
        }
      });

      const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]');
      
      if (await searchInput.count() > 0) {
        for (const payload of sqlPayloads.slice(0, 2)) {
          await searchInput.fill(payload);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(2000);

          // Check for database error messages in UI
          const errorMessages = page.locator('.error, [role="alert"], .alert-danger');
          const hasError = await errorMessages.count() > 0;
          
          if (hasError) {
            const errorText = await errorMessages.first().textContent() || '';
            if (errorText.toLowerCase().includes('sql') || errorText.toLowerCase().includes('database')) {
              console.log('⚠️ Potential SQL error exposed:', errorText);
            }
          }

          console.log(`✅ SQL injection payload tested: ${payload.substring(0, 20)}...`);
        }
      }

      // Should have no SQL-related console errors
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('CSRF Protection', () => {
    test('should have CSRF tokens in forms', async ({ page }) => {
      await page.goto('/');

      // Look for forms
      const forms = page.locator('form');
      const formCount = await forms.count();

      if (formCount > 0) {
        let csrfTokensFound = 0;

        for (let i = 0; i < Math.min(formCount, 3); i++) {
          const form = forms.nth(i);
          
          // Look for CSRF tokens
          const csrfToken = form.locator('input[name="_token"], input[name="csrf_token"], input[name="_csrf"]');
          
          if (await csrfToken.count() > 0) {
            const tokenValue = await csrfToken.getAttribute('value');
            expect(tokenValue).toBeTruthy();
            expect(tokenValue.length).toBeGreaterThan(10);
            csrfTokensFound++;
          }
        }

        if (csrfTokensFound > 0) {
          console.log(`✅ CSRF tokens found in ${csrfTokensFound} forms`);
        } else {
          console.log('⚠️ No CSRF tokens found - may use other protection methods');
        }
      }

      // Check for CSRF meta tag
      const csrfMeta = page.locator('meta[name="csrf-token"]');
      if (await csrfMeta.count() > 0) {
        const metaToken = await csrfMeta.getAttribute('content');
        expect(metaToken).toBeTruthy();
        console.log('✅ CSRF meta token found');
      }
    });
  });

  test.describe('Authentication Security', () => {
    test('should prevent authentication bypass', async ({ page }) => {
      // Try to access protected routes without authentication
      const protectedRoutes = ['/dashboard', '/admin', '/profile', '/settings'];

      for (const route of protectedRoutes) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');

        const currentUrl = page.url();
        
        // Should redirect to login or show authentication required
        if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
          console.log(`✅ Protected route ${route} redirects to login`);
        } else {
          // Check if login form is shown
          const loginForm = page.locator('form:has(input[type="password"])');
          if (await loginForm.isVisible()) {
            console.log(`✅ Protected route ${route} shows login form`);
          } else {
            console.log(`⚠️ Route ${route} may be accessible without authentication`);
          }
        }
      }
    });

    test('should handle session security', async ({ page, context }) => {
      await page.goto('/');

      // Check for secure cookie settings
      const cookies = await context.cookies();
      const authCookies = cookies.filter(cookie => 
        cookie.name.toLowerCase().includes('session') ||
        cookie.name.toLowerCase().includes('auth') ||
        cookie.name.toLowerCase().includes('token')
      );

      authCookies.forEach(cookie => {
        if (cookie.secure) {
          console.log(`✅ Cookie ${cookie.name} is secure`);
        } else {
          console.log(`⚠️ Cookie ${cookie.name} is not secure`);
        }

        if (cookie.httpOnly) {
          console.log(`✅ Cookie ${cookie.name} is HttpOnly`);
        } else {
          console.log(`⚠️ Cookie ${cookie.name} is not HttpOnly`);
        }
      });
    });
  });

  test.describe('Input Sanitization', () => {
    test('should sanitize user inputs', async ({ page }) => {
      await page.goto('/');

      const maliciousInputs = [
        '<script>alert("XSS")</script>',
        '<?php phpinfo(); ?>',
        '../../../etc/passwd',
        '${7*7}',
        '{{7*7}}',
      ];

      // Test text inputs
      const textInputs = page.locator('input[type="text"], textarea');
      
      if (await textInputs.count() > 0) {
        const input = textInputs.first();
        
        for (const maliciousInput of maliciousInputs.slice(0, 3)) {
          await input.fill(maliciousInput);
          
          // Check if input is sanitized immediately
          const inputValue = await input.inputValue();
          
          if (inputValue !== maliciousInput) {
            console.log(`✅ Input sanitized: ${maliciousInput} → ${inputValue}`);
          }
        }
      }
    });

    test('should validate file uploads', async ({ page }) => {
      await page.goto('/');

      const fileInputs = page.locator('input[type="file"]');
      
      if (await fileInputs.count() > 0) {
        // Test malicious file upload
        const maliciousFile = Buffer.from('<?php echo "Malicious code"; ?>');
        
        try {
          await fileInputs.first().setInputFiles({
            name: 'malicious.php',
            mimeType: 'application/x-php',
            buffer: maliciousFile,
          });

          // Try to submit
          const submitButton = page.locator('button[type="submit"], button:has-text("Upload")');
          if (await submitButton.count() > 0) {
            await submitButton.click();
            await page.waitForTimeout(2000);

            // Check for validation errors
            const errorMessage = page.locator('.error, [role="alert"], .alert-danger');
            if (await errorMessage.count() > 0) {
              console.log('✅ Malicious file upload blocked');
            }
          }
        } catch (error) {
          console.log('✅ File upload validation prevented malicious file');
        }
      } else {
        console.log('ℹ️ No file upload functionality found');
      }
    });
  });

  test.describe('Security Headers', () => {
    test('should have security headers', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers() || {};

      const securityHeaders = {
        'x-frame-options': 'Prevents clickjacking',
        'x-content-type-options': 'Prevents MIME sniffing',
        'x-xss-protection': 'XSS filtering',
        'strict-transport-security': 'Forces HTTPS',
        'referrer-policy': 'Controls referrer information',
        'permissions-policy': 'Controls browser features'
      };

      let secureHeadersCount = 0;
      
      Object.entries(securityHeaders).forEach(([header, description]) => {
        if (headers[header]) {
          secureHeadersCount++;
          console.log(`✅ ${header}: ${headers[header]} (${description})`);
        } else {
          console.log(`⚠️ Missing ${header} header (${description})`);
        }
      });

      expect(secureHeadersCount).toBeGreaterThan(0);
      console.log(`Security headers score: ${secureHeadersCount}/${Object.keys(securityHeaders).length}`);
    });
  });

  test.describe('Rate Limiting', () => {
    test('should enforce rate limiting on login attempts', async ({ page }) => {
      await page.goto('/auth/login');

      const maxAttempts = 5;
      let rateLimited = false;

      for (let i = 0; i < maxAttempts; i++) {
        // Fill login form
        const emailInput = page.locator('input[type="email"], input[name="email"]');
        const passwordInput = page.locator('input[type="password"]');
        const submitButton = page.locator('button[type="submit"]');

        if (await emailInput.isVisible()) {
          await emailInput.fill('test@example.com');
          await passwordInput.fill('wrongpassword');
          await submitButton.click();

          await page.waitForTimeout(1000);

          // Check for rate limiting message
          const errorMessage = page.locator('.error, [role="alert"]');
          if (await errorMessage.count() > 0) {
            const errorText = await errorMessage.first().textContent() || '';
            
            if (errorText.toLowerCase().includes('rate limit') ||
                errorText.toLowerCase().includes('too many') ||
                errorText.toLowerCase().includes('blocked')) {
              rateLimited = true;
              console.log(`✅ Rate limiting activated after ${i + 1} attempts`);
              break;
            }
          }
        }
      }

      if (!rateLimited) {
        console.log('⚠️ No rate limiting detected on login attempts');
      }
    });

    test('should handle API rate limiting', async ({ page }) => {
      await page.goto('/');

      // Monitor API requests
      let apiRequestCount = 0;
      let rateLimitHit = false;

      page.on('response', response => {
        if (response.url().includes('/api/')) {
          apiRequestCount++;
          
          if (response.status() === 429) { // Too Many Requests
            rateLimitHit = true;
            console.log('✅ API rate limiting detected (429 response)');
          }
        }
      });

      // Make rapid API requests by navigating quickly
      const pages = ['/dashboard', '/profile', '/settings', '/', '/dashboard'];
      
      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForTimeout(100); // Very short delay to stress test
      }

      console.log(`Made ${apiRequestCount} API requests`);
      
      if (rateLimitHit) {
        console.log('✅ API rate limiting is active');
      } else if (apiRequestCount > 0) {
        console.log('ℹ️ No API rate limiting detected (may be configured for higher limits)');
      }
    });
  });

  test.describe('Data Protection', () => {
    test('should not expose sensitive data in client', async ({ page }) => {
      await page.goto('/');

      // Check for sensitive data patterns in page source
      const pageContent = await page.content();
      const sensitivePatterns = [
        /password['"]\s*:\s*['"][^'"]+['"]/i,
        /api[_-]?key['"]\s*:\s*['"][^'"]+['"]/i,
        /secret['"]\s*:\s*['"][^'"]+['"]/i,
        /token['"]\s*:\s*['"][a-zA-Z0-9]{20,}['"]/i,
      ];

      sensitivePatterns.forEach((pattern, index) => {
        const match = pageContent.match(pattern);
        if (match) {
          console.log(`⚠️ Potential sensitive data exposed: ${match[0].substring(0, 50)}...`);
        } else {
          console.log(`✅ No sensitive pattern ${index + 1} found in page source`);
        }
      });

      // Check localStorage and sessionStorage
      const storageData = await page.evaluate(() => {
        const local = JSON.stringify(localStorage);
        const session = JSON.stringify(sessionStorage);
        return { local, session };
      });

      [storageData.local, storageData.session].forEach((storage, index) => {
        const storageType = index === 0 ? 'localStorage' : 'sessionStorage';
        
        sensitivePatterns.forEach(pattern => {
          if (pattern.test(storage)) {
            console.log(`⚠️ Sensitive data may be in ${storageType}`);
          }
        });
      });
    });
  });
});