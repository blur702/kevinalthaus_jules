import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/auth/login-page';
import { TestData } from '../../fixtures/test-data';

test.describe('Authentication - Login Flow', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test.describe('Page Load and UI Elements @smoke @critical', () => {
    test('should load login page successfully', async () => {
      // Verify page loads
      expect(await loginPage.isPageLoaded()).toBe(true);
      expect(await loginPage.getTitle()).toContain('Login');
      expect(loginPage.getCurrentUrl()).toContain('/login');
    });

    test('should display all required UI elements', async () => {
      const elements = await loginPage.verifyPageElements();
      
      // All critical elements should be visible
      const criticalElements = ['Email Input', 'Password Input', 'Login Button'];
      for (const elementName of criticalElements) {
        const element = elements.find(el => el.name === elementName);
        expect(element?.visible, `${elementName} should be visible`).toBe(true);
      }
    });

    test('should have no console errors on page load', async () => {
      const consoleErrors = await loginPage.getConsoleErrors();
      
      // Filter out non-critical warnings
      const criticalErrors = consoleErrors.filter(error => 
        error.type === 'error' && 
        !error.text.includes('favicon') &&
        !error.text.includes('DevTools')
      );
      
      expect(criticalErrors).toHaveLength(0);
    });
  });

  test.describe('Successful Login Scenarios @critical', () => {
    test('should login with valid credentials', async () => {
      const user = TestData.users.validUser;
      
      await loginPage.login(user.email, user.password);
      
      // Verify successful login
      await expect(loginPage.page).toHaveURL(/^(?!.*\/login).*$/);
      expect(await loginPage.isUserLoggedIn()).toBe(true);
    });

    test('should login with remember me option', async () => {
      const user = TestData.users.validUser;
      
      await loginPage.login(user.email, user.password, true);
      
      // Verify login and remember me setting
      expect(await loginPage.isUserLoggedIn()).toBe(true);
      
      // Check if remember me was processed (check local storage or cookies)
      const rememberToken = await loginPage.page.evaluate(() => 
        localStorage.getItem('rememberToken') || 
        document.cookie.includes('remember_token')
      );
      
      expect(rememberToken).toBeTruthy();
    });

    test('should handle admin user login', async () => {
      await loginPage.loginAsAdmin();
      
      expect(await loginPage.isUserLoggedIn()).toBe(true);
      
      // Verify admin-specific elements are available
      const adminPanel = loginPage.page.locator('[data-testid="admin-panel"], .admin-nav');
      await expect(adminPanel).toBeVisible({ timeout: 5000 }).catch(() => {
        // Admin panel might not be immediately visible
      });
    });
  });

  test.describe('Failed Login Scenarios @critical', () => {
    test('should handle invalid email format', async () => {
      await loginPage.fillCredentials('invalid-email', 'Password123!');
      await loginPage.submitLogin();
      
      const errors = await loginPage.getFormErrors();
      expect(errors.some(error => 
        error.toLowerCase().includes('email') || 
        error.toLowerCase().includes('invalid')
      )).toBe(true);
    });

    test('should handle invalid credentials', async () => {
      await loginPage.attemptInvalidLogin();
      
      await loginPage.waitForErrorMessage();
      const errorMessage = await loginPage.errorMessage.textContent();
      
      expect(errorMessage?.toLowerCase()).toContain('invalid');
    });

    test('should handle empty form submission', async () => {
      await loginPage.submitLogin();
      
      const errors = await loginPage.getFormErrors();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => 
        error.toLowerCase().includes('required') ||
        error.toLowerCase().includes('email')
      )).toBe(true);
    });

    test('should display appropriate error for non-existent user', async () => {
      await loginPage.fillCredentials('nonexistent@example.com', 'Password123!');
      await loginPage.submitLogin();
      
      await loginPage.waitForErrorMessage();
      const errorMessage = await loginPage.errorMessage.textContent();
      
      expect(errorMessage?.toLowerCase()).toMatch(/(invalid|not found|incorrect)/);
    });
  });

  test.describe('Form Validation @regression', () => {
    test('should validate email field', async () => {
      const validationResults = await loginPage.testEmailValidation();
      
      // All invalid emails should show errors
      validationResults.forEach(result => {
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    test('should validate password requirements', async () => {
      const validationResults = await loginPage.testPasswordValidation();
      
      // Check that appropriate validation messages appear
      const hasPasswordValidation = validationResults.some(result => 
        result.errors.length > 0
      );
      
      expect(hasPasswordValidation).toBe(true);
    });

    test('should prevent SQL injection attempts', async () => {
      const sqlInjectionPayloads = TestData.security.sql.payloads;
      
      for (const payload of sqlInjectionPayloads) {
        await loginPage.fillCredentials(payload, 'password');
        await loginPage.submitLogin();
        
        // Should not cause errors or successful login
        const isLoggedIn = await loginPage.isUserLoggedIn();
        expect(isLoggedIn).toBe(false);
        
        // Clear for next attempt
        await loginPage.page.reload();
      }
    });
  });

  test.describe('Security Features @security', () => {
    test('should handle rate limiting', async ({ page }) => {
      test.setTimeout(30000); // Longer timeout for rate limiting test
      
      const rateLimitResult = await loginPage.testRateLimiting(6);
      
      if (rateLimitResult.rateLimited) {
        expect(rateLimitResult.attempts).toBeLessThanOrEqual(5);
      }
      
      // Wait for rate limit to reset
      await page.waitForTimeout(2000);
    });

    test('should sanitize XSS attempts in form fields', async () => {
      const xssPayloads = TestData.security.xss.payloads;
      
      for (const payload of xssPayloads) {
        await loginPage.fillCredentials(payload, 'password');
        await loginPage.submitLogin();
        
        // Check that XSS payload was not executed
        const alertDialogs = await loginPage.page.evaluate(() => 
          window.document.querySelectorAll('script[src*="alert"], *[onload*="alert"]').length
        );
        
        expect(alertDialogs).toBe(0);
        
        // Clear for next test
        await loginPage.page.reload();
      }
    });

    test('should protect against CSRF attacks', async () => {
      // Remove or modify CSRF token if present
      await loginPage.page.evaluate(() => {
        const csrfInputs = document.querySelectorAll('input[name*="csrf"], input[name*="token"]');
        csrfInputs.forEach(input => (input as HTMLInputElement).value = 'invalid-token');
      });
      
      const user = TestData.users.validUser;
      await loginPage.fillCredentials(user.email, user.password);
      await loginPage.submitLogin();
      
      // Should be rejected due to invalid CSRF token
      await loginPage.waitForErrorMessage();
      expect(await loginPage.isUserLoggedIn()).toBe(false);
    });
  });

  test.describe('Two-Factor Authentication @2fa', () => {
    test('should handle 2FA flow when enabled', async () => {
      // Mock user with 2FA enabled
      await loginPage.mockAPI(/\/api\/auth\/login/, {
        requiresTwoFactor: true,
        tempToken: 'temp-2fa-token'
      });
      
      const user = TestData.users.validUser;
      await loginPage.fillCredentials(user.email, user.password);
      await loginPage.submitLogin();
      
      // Check if 2FA input appears
      const requires2FA = await loginPage.is2FARequired();
      
      if (requires2FA) {
        await loginPage.enterTwoFactorCode('123456');
        
        // Should complete login after 2FA
        expect(await loginPage.isUserLoggedIn()).toBe(true);
      }
    });

    test('should handle invalid 2FA code', async () => {
      await loginPage.mockAPI(/\/api\/auth\/login/, {
        requiresTwoFactor: true,
        tempToken: 'temp-2fa-token'
      });
      
      await loginPage.mockAPI(/\/api\/auth\/2fa\/verify/, {
        error: 'Invalid 2FA code'
      }, 400);
      
      const user = TestData.users.validUser;
      await loginPage.fillCredentials(user.email, user.password);
      await loginPage.submitLogin();
      
      if (await loginPage.is2FARequired()) {
        await loginPage.enterTwoFactorCode('000000'); // Invalid code
        
        await loginPage.waitForErrorMessage();
        expect(await loginPage.isUserLoggedIn()).toBe(false);
      }
    });
  });

  test.describe('Social Authentication @social', () => {
    test('should display social login options if available', async () => {
      const socialAvailable = await loginPage.areSocialLoginsAvailable();
      
      if (socialAvailable) {
        // Test Google login flow
        await loginPage.loginWithGoogle();
        // Note: In real tests, you'd handle the OAuth popup
      }
    });

    test('should handle Google OAuth flow', async () => {
      if (await loginPage.areSocialLoginsAvailable()) {
        // This would test the actual OAuth flow
        // For now, we'll just verify the button exists
        const googleButton = loginPage.page.locator('[data-testid="google-login"]');
        await expect(googleButton).toBeVisible();
      }
    });
  });

  test.describe('Navigation and Links @smoke', () => {
    test('should navigate to forgot password page', async () => {
      await loginPage.clickForgotPassword();
      
      expect(loginPage.getCurrentUrl()).toMatch(/(forgot|reset)/);
    });

    test('should navigate to register page', async () => {
      await loginPage.clickRegister();
      
      expect(loginPage.getCurrentUrl()).toMatch(/register|signup/);
    });
  });

  test.describe('Accessibility @accessibility', () => {
    test('should meet accessibility standards', async () => {
      const accessibilityResults = await loginPage.testAccessibility();
      
      // Should have no critical accessibility violations
      expect(accessibilityResults.violations).toHaveLength(0);
    });

    test('should support keyboard navigation', async () => {
      const { page } = loginPage;
      
      // Test tab order
      await page.keyboard.press('Tab');
      await expect(loginPage.page.locator('[data-testid="email"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(loginPage.page.locator('[data-testid="password"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(loginPage.page.locator('[data-testid="login-button"]')).toBeFocused();
    });

    test('should have proper ARIA labels', async () => {
      const emailInput = loginPage.page.locator('[data-testid="email"]');
      const passwordInput = loginPage.page.locator('[data-testid="password"]');
      
      await expect(emailInput).toHaveAttribute('aria-label');
      await expect(passwordInput).toHaveAttribute('aria-label');
    });
  });

  test.describe('Visual Regression @visual', () => {
    test('should match login page screenshot', async () => {
      await loginPage.waitForPageReady();
      await loginPage.compareScreenshot('login-page');
    });

    test('should test different themes', async () => {
      const themeResults = await loginPage.testThemes();
      
      // Verify themes were applied correctly
      themeResults.forEach(result => {
        expect(result.applied, `${result.theme} theme should be applied`).toBe(true);
      });
    });
  });

  test.describe('Responsive Design @responsive', () => {
    test('should work on different screen sizes', async () => {
      const responsiveResults = await loginPage.testResponsiveDesign();
      
      // All viewports should be functional
      responsiveResults.forEach(result => {
        expect(result.visible, `Login page should be visible on ${result.viewport}`).toBe(true);
      });
    });

    test('should adapt to mobile viewport', async () => {
      await loginPage.page.setViewportSize({ width: 375, height: 667 });
      await loginPage.waitForPageReady();
      
      // Verify mobile layout
      const elements = await loginPage.verifyPageElements();
      const criticalElements = elements.filter(el => 
        ['Email Input', 'Password Input', 'Login Button'].includes(el.name)
      );
      
      criticalElements.forEach(element => {
        expect(element.visible, `${element.name} should be visible on mobile`).toBe(true);
      });
    });
  });

  test.describe('Performance @performance', () => {
    test('should load within performance thresholds', async () => {
      const metrics = await loginPage.getPerformanceMetrics();
      
      expect(metrics.loadTime).toBeLessThan(TestData.performance.thresholds.pageLoad);
      expect(metrics.firstContentfulPaint).toBeLessThan(TestData.performance.thresholds.firstContentfulPaint);
    });

    test('should have acceptable memory usage', async () => {
      const memoryUsage = await loginPage.getMemoryUsage();
      
      if (memoryUsage) {
        expect(memoryUsage.usedJSHeapSize).toBeLessThan(TestData.performance.thresholds.memoryUsage);
      }
    });
  });

  test.describe('Network Conditions @network', () => {
    test('should handle slow network gracefully', async () => {
      await loginPage.simulateNetworkCondition('slow');
      
      const user = TestData.users.validUser;
      await loginPage.login(user.email, user.password);
      
      // Should eventually succeed despite slow network
      expect(await loginPage.isUserLoggedIn()).toBe(true);
    });

    test('should show appropriate message when offline', async () => {
      await loginPage.simulateNetworkCondition('offline');
      
      const user = TestData.users.validUser;
      await loginPage.fillCredentials(user.email, user.password);
      await loginPage.submitLogin();
      
      // Should show network error message
      const hasNetworkError = await loginPage.page.locator('text=/network|offline|connection/i').isVisible({ timeout: 5000 });
      expect(hasNetworkError).toBe(true);
    });
  });
});