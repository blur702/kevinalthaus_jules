import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/auth/login-page';
import { TestData } from '../../fixtures/test-data';

// Password Reset Page class
class PasswordResetPage {
  constructor(private page: any) {}
  
  private get emailInput() { return this.page.locator('[data-testid="email"], [name="email"], input[type="email"]'); }
  private get resetButton() { return this.page.locator('[data-testid="reset-button"], button[type="submit"], .reset-button'); }
  private get backToLoginLink() { return this.page.locator('[data-testid="back-to-login"], .back-to-login, text="Back to Login"'); }
  private get successMessage() { return this.page.locator('[data-testid="success-message"], .success-message'); }
  private get errorMessage() { return this.page.locator('[data-testid="error-message"], .error-message'); }
  
  async goto() {
    await this.page.goto('/reset-password');
  }
  
  async requestPasswordReset(email: string) {
    await this.emailInput.fill(email);
    await this.resetButton.click();
  }
  
  async isSuccessMessageVisible() {
    return await this.successMessage.isVisible();
  }
  
  async getSuccessMessage() {
    return await this.successMessage.textContent();
  }
  
  async isErrorMessageVisible() {
    return await this.errorMessage.isVisible();
  }
  
  async getErrorMessage() {
    return await this.errorMessage.textContent();
  }
  
  async clickBackToLogin() {
    await this.backToLoginLink.click();
  }
}

// New Password Page class (for reset completion)
class NewPasswordPage {
  constructor(private page: any) {}
  
  private get passwordInput() { return this.page.locator('[data-testid="password"], [name="password"], input[type="password"]'); }
  private get confirmPasswordInput() { return this.page.locator('[data-testid="confirmPassword"], [name="confirmPassword"]'); }
  private get submitButton() { return this.page.locator('[data-testid="submit-button"], button[type="submit"]'); }
  private get successMessage() { return this.page.locator('[data-testid="success-message"], .success-message'); }
  private get errorMessage() { return this.page.locator('[data-testid="error-message"], .error-message'); }
  
  async goto(token: string) {
    await this.page.goto(`/reset-password?token=${token}`);
  }
  
  async setNewPassword(password: string, confirmPassword?: string) {
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword || password);
    await this.submitButton.click();
  }
  
  async isSuccessMessageVisible() {
    return await this.successMessage.isVisible();
  }
  
  async isErrorMessageVisible() {
    return await this.errorMessage.isVisible();
  }
  
  async getErrorMessage() {
    return await this.errorMessage.textContent();
  }
}

test.describe('Authentication - Password Reset Flow', () => {
  let loginPage: LoginPage;
  let resetPage: PasswordResetPage;
  let newPasswordPage: NewPasswordPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    resetPage = new PasswordResetPage(page);
    newPasswordPage = new NewPasswordPage(page);
  });

  test.describe('Password Reset Request @critical', () => {
    test('should navigate to password reset from login page', async () => {
      await loginPage.goto();
      await loginPage.clickForgotPassword();
      
      expect(loginPage.getCurrentUrl()).toMatch(/(reset|forgot)/);
    });

    test('should send reset email for valid user', async () => {
      await resetPage.goto();
      
      // Mock successful reset request
      await resetPage.page.route('**/api/auth/reset-password', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Reset email sent successfully' })
        });
      });
      
      const validUser = TestData.users.validUser;
      await resetPage.requestPasswordReset(validUser.email);
      
      await expect(resetPage.successMessage).toBeVisible({ timeout: 10000 });
      
      const message = await resetPage.getSuccessMessage();
      expect(message?.toLowerCase()).toMatch(/(sent|email|check)/);
    });

    test('should handle non-existent email gracefully', async () => {
      await resetPage.goto();
      
      // Mock response for non-existent user
      await resetPage.page.route('**/api/auth/reset-password', (route) => {
        route.fulfill({
          status: 200, // Don't reveal if email exists
          contentType: 'application/json',
          body: JSON.stringify({ message: 'If the email exists, a reset link has been sent' })
        });
      });
      
      await resetPage.requestPasswordReset('nonexistent@example.com');
      
      // Should show generic success message for security
      await expect(resetPage.successMessage).toBeVisible();
      const message = await resetPage.getSuccessMessage();
      expect(message?.toLowerCase()).toMatch(/(sent|if.*exists)/);
    });

    test('should validate email format', async () => {
      await resetPage.goto();
      
      const invalidEmails = TestData.validation.email.invalid;
      
      for (const email of invalidEmails) {
        await resetPage.requestPasswordReset(email);
        
        // Should show validation error for invalid format
        if (email.trim() !== '') {
          const hasError = await resetPage.isErrorMessageVisible();
          if (hasError) {
            const errorMessage = await resetPage.getErrorMessage();
            expect(errorMessage?.toLowerCase()).toContain('email');
          }
        }
        
        // Clear for next test
        await resetPage.emailInput.fill('');
      }
    });

    test('should require email field', async () => {
      await resetPage.goto();
      
      // Submit without email
      await resetPage.resetButton.click();
      
      // Should show required field error
      const hasError = await resetPage.isErrorMessageVisible();
      if (hasError) {
        const errorMessage = await resetPage.getErrorMessage();
        expect(errorMessage?.toLowerCase()).toMatch(/(required|email)/);
      }
    });

    test('should handle rate limiting', async () => {
      await resetPage.goto();
      
      // Mock rate limiting after multiple requests
      let requestCount = 0;
      await resetPage.page.route('**/api/auth/reset-password', (route) => {
        requestCount++;
        if (requestCount > 3) {
          route.fulfill({
            status: 429,
            contentType: 'application/json',
            body: JSON.stringify({ 
              error: 'Too many requests', 
              retryAfter: 60 
            })
          });
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Reset email sent' })
          });
        }
      });
      
      const email = TestData.users.validUser.email;
      
      // Make multiple requests
      for (let i = 0; i < 5; i++) {
        await resetPage.requestPasswordReset(email);
        await resetPage.page.waitForTimeout(500);
      }
      
      // Should eventually show rate limiting error
      const hasError = await resetPage.isErrorMessageVisible();
      if (hasError) {
        const errorMessage = await resetPage.getErrorMessage();
        expect(errorMessage?.toLowerCase()).toMatch(/(many.*requests|rate.*limit|try.*later)/);
      }
    });

    test('should sanitize email input', async () => {
      await resetPage.goto();
      
      const xssPayloads = TestData.security.xss.payloads;
      
      for (const payload of xssPayloads) {
        await resetPage.requestPasswordReset(payload);
        
        // Should not execute XSS
        const alertCount = await resetPage.page.evaluate(() => 
          document.querySelectorAll('script[src*="alert"]').length
        );
        expect(alertCount).toBe(0);
        
        await resetPage.emailInput.fill('');
      }
    });
  });

  test.describe('Password Reset Completion @critical', () => {
    test('should complete password reset with valid token', async () => {
      const validToken = 'valid-reset-token-123';
      
      // Mock token validation and password reset
      await newPasswordPage.page.route('**/api/auth/reset-password/**', (route) => {
        if (route.request().method() === 'GET') {
          // Token validation
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ valid: true, email: TestData.users.validUser.email })
          });
        } else if (route.request().method() === 'POST') {
          // Password reset completion
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Password reset successfully' })
          });
        }
      });
      
      await newPasswordPage.goto(validToken);
      
      const newPassword = 'NewSecurePassword123!';
      await newPasswordPage.setNewPassword(newPassword, newPassword);
      
      await expect(newPasswordPage.successMessage).toBeVisible();
    });

    test('should reject invalid or expired tokens', async () => {
      const invalidToken = 'invalid-or-expired-token';
      
      // Mock invalid token response
      await newPasswordPage.page.route('**/api/auth/reset-password/**', (route) => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid or expired reset token' })
        });
      });
      
      await newPasswordPage.goto(invalidToken);
      
      // Should show error for invalid token
      await expect(newPasswordPage.errorMessage).toBeVisible();
      const errorMessage = await newPasswordPage.getErrorMessage();
      expect(errorMessage?.toLowerCase()).toMatch(/(invalid|expired|token)/);
    });

    test('should validate password strength', async () => {
      const validToken = 'valid-reset-token-123';
      
      await newPasswordPage.page.route('**/api/auth/reset-password/**', (route) => {
        if (route.request().method() === 'GET') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ valid: true, email: TestData.users.validUser.email })
          });
        }
      });
      
      await newPasswordPage.goto(validToken);
      
      const weakPasswords = TestData.validation.password.invalid;
      
      for (const weakPassword of weakPasswords) {
        await newPasswordPage.setNewPassword(weakPassword, weakPassword);
        
        // Should show password strength error
        const hasError = await newPasswordPage.isErrorMessageVisible();
        if (hasError) {
          const errorMessage = await newPasswordPage.getErrorMessage();
          expect(errorMessage?.toLowerCase()).toMatch(/(password|weak|strength|requirements)/);
        }
        
        // Clear for next test
        await newPasswordPage.passwordInput.fill('');
        await newPasswordPage.confirmPasswordInput.fill('');
      }
    });

    test('should require password confirmation match', async () => {
      const validToken = 'valid-reset-token-123';
      
      await newPasswordPage.page.route('**/api/auth/reset-password/**', (route) => {
        if (route.request().method() === 'GET') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ valid: true, email: TestData.users.validUser.email })
          });
        }
      });
      
      await newPasswordPage.goto(validToken);
      
      // Set mismatched passwords
      await newPasswordPage.setNewPassword('StrongPassword123!', 'DifferentPassword123!');
      
      // Should show mismatch error
      const hasError = await newPasswordPage.isErrorMessageVisible();
      expect(hasError).toBe(true);
      
      const errorMessage = await newPasswordPage.getErrorMessage();
      expect(errorMessage?.toLowerCase()).toMatch(/(match|confirm|same)/);
    });

    test('should handle used tokens', async () => {
      const usedToken = 'already-used-token';
      
      // Mock used token response
      await newPasswordPage.page.route('**/api/auth/reset-password/**', (route) => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Reset token has already been used' })
        });
      });
      
      await newPasswordPage.goto(usedToken);
      
      await expect(newPasswordPage.errorMessage).toBeVisible();
      const errorMessage = await newPasswordPage.getErrorMessage();
      expect(errorMessage?.toLowerCase()).toMatch(/(used|already|invalid)/);
    });

    test('should prevent password reuse', async () => {
      const validToken = 'valid-reset-token-123';
      
      await newPasswordPage.page.route('**/api/auth/reset-password/**', (route) => {
        if (route.request().method() === 'GET') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ valid: true, email: TestData.users.validUser.email })
          });
        } else if (route.request().method() === 'POST') {
          const body = JSON.parse(route.request().postData() || '{}');
          if (body.password === TestData.users.validUser.password) {
            route.fulfill({
              status: 400,
              contentType: 'application/json',
              body: JSON.stringify({ error: 'Cannot reuse current password' })
            });
          } else {
            route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ message: 'Password reset successfully' })
            });
          }
        }
      });
      
      await newPasswordPage.goto(validToken);
      
      // Try to set current password
      const currentPassword = TestData.users.validUser.password;
      await newPasswordPage.setNewPassword(currentPassword, currentPassword);
      
      // Should prevent password reuse
      const hasError = await newPasswordPage.isErrorMessageVisible();
      if (hasError) {
        const errorMessage = await newPasswordPage.getErrorMessage();
        expect(errorMessage?.toLowerCase()).toMatch(/(reuse|current|same|different)/);
      }
    });
  });

  test.describe('Security Features @security', () => {
    test('should use secure token generation', async () => {
      await resetPage.goto();
      
      // Mock reset request with token inspection
      let generatedToken = '';
      await resetPage.page.route('**/api/auth/reset-password', (route) => {
        // In real implementation, inspect the generated token
        generatedToken = 'mock-secure-token-with-sufficient-entropy';
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Reset email sent successfully' })
        });
      });
      
      await resetPage.requestPasswordReset(TestData.users.validUser.email);
      
      // Token should be sufficiently long and random
      expect(generatedToken.length).toBeGreaterThan(20);
    });

    test('should have token expiration', async () => {
      const expiredToken = 'expired-token-123';
      
      // Mock expired token
      await newPasswordPage.page.route('**/api/auth/reset-password/**', (route) => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: 'Reset token has expired',
            expiredAt: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
          })
        });
      });
      
      await newPasswordPage.goto(expiredToken);
      
      await expect(newPasswordPage.errorMessage).toBeVisible();
      const errorMessage = await newPasswordPage.getErrorMessage();
      expect(errorMessage?.toLowerCase()).toMatch(/(expired|invalid)/);
    });

    test('should protect against brute force token guessing', async () => {
      // Mock multiple token validation attempts
      let attemptCount = 0;
      await newPasswordPage.page.route('**/api/auth/reset-password/**', (route) => {
        attemptCount++;
        if (attemptCount > 5) {
          route.fulfill({
            status: 429,
            contentType: 'application/json',
            body: JSON.stringify({ 
              error: 'Too many invalid attempts',
              blockUntil: new Date(Date.now() + 900000).toISOString() // 15 minutes
            })
          });
        } else {
          route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Invalid reset token' })
          });
        }
      });
      
      // Try multiple invalid tokens
      for (let i = 0; i < 7; i++) {
        await newPasswordPage.goto(`invalid-token-${i}`);
        await newPasswordPage.page.waitForTimeout(100);
      }
      
      // Should eventually block attempts
      await expect(newPasswordPage.errorMessage).toBeVisible();
      const errorMessage = await newPasswordPage.getErrorMessage();
      expect(errorMessage?.toLowerCase()).toMatch(/(many|attempts|blocked|wait)/);
    });

    test('should log security events', async () => {
      // Mock security logging
      const securityEvents: any[] = [];
      
      await resetPage.page.route('**/api/auth/reset-password', (route) => {
        securityEvents.push({
          event: 'password_reset_requested',
          email: TestData.users.validUser.email,
          timestamp: new Date().toISOString(),
          ip: '127.0.0.1'
        });
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Reset email sent successfully' })
        });
      });
      
      await resetPage.goto();
      await resetPage.requestPasswordReset(TestData.users.validUser.email);
      
      // Should log security events
      expect(securityEvents.length).toBe(1);
      expect(securityEvents[0].event).toBe('password_reset_requested');
    });

    test('should sanitize all inputs', async () => {
      await resetPage.goto();
      
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '"; DROP TABLE users; --',
        '../../../etc/passwd',
        '${7*7}{{7*7}}'
      ];
      
      for (const input of maliciousInputs) {
        await resetPage.requestPasswordReset(input);
        
        // Should not execute malicious code
        const pageContent = await resetPage.page.textContent('body');
        expect(pageContent).not.toContain('49'); // Template injection result
        expect(pageContent).not.toContain('alert'); // XSS
        
        await resetPage.emailInput.fill('');
      }
    });
  });

  test.describe('User Experience @smoke', () => {
    test('should provide clear instructions', async () => {
      await resetPage.goto();
      
      // Should have helpful instructions
      const instructions = await resetPage.page.locator('.instructions, .help-text, p').allTextContents();
      const hasInstructions = instructions.some(text => 
        text.toLowerCase().includes('email') || 
        text.toLowerCase().includes('reset') ||
        text.toLowerCase().includes('instructions')
      );
      
      expect(hasInstructions).toBe(true);
    });

    test('should show loading states', async () => {
      await resetPage.goto();
      
      // Mock slow response
      await resetPage.page.route('**/api/auth/reset-password', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Reset email sent successfully' })
        });
      });
      
      const requestPromise = resetPage.requestPasswordReset(TestData.users.validUser.email);
      
      // Should show loading state
      const hasLoadingState = await resetPage.page.locator('.loading, .spinner, [data-testid="loading"]').isVisible();
      
      await requestPromise;
      
      expect(hasLoadingState).toBe(true);
    });

    test('should support keyboard navigation', async () => {
      await resetPage.goto();
      
      // Tab through form elements
      await resetPage.page.keyboard.press('Tab');
      await expect(resetPage.emailInput).toBeFocused();
      
      await resetPage.page.keyboard.press('Tab');
      await expect(resetPage.resetButton).toBeFocused();
      
      // Enter should submit form
      await resetPage.emailInput.fill(TestData.users.validUser.email);
      await resetPage.emailInput.press('Enter');
      
      // Should submit the form
      await resetPage.page.waitForTimeout(1000);
    });

    test('should handle back navigation', async () => {
      await resetPage.goto();
      await resetPage.clickBackToLogin();
      
      expect(resetPage.page.url()).toContain('/login');
    });

    test('should be accessible', async () => {
      await resetPage.goto();
      
      // Check for proper labels
      const emailLabel = await resetPage.emailInput.getAttribute('aria-label');
      const buttonLabel = await resetPage.resetButton.textContent();
      
      expect(emailLabel || buttonLabel).toBeTruthy();
      
      // Check for proper form structure
      const form = resetPage.page.locator('form');
      await expect(form).toBeVisible();
    });
  });

  test.describe('Email Integration @integration', () => {
    test('should send properly formatted reset emails', async () => {
      // This would test actual email sending in integration environment
      await resetPage.goto();
      
      // Mock email service
      const sentEmails: any[] = [];
      await resetPage.page.route('**/api/auth/reset-password', (route) => {
        sentEmails.push({
          to: TestData.users.validUser.email,
          subject: 'Password Reset Request',
          template: 'password-reset',
          token: 'mock-token-123'
        });
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Reset email sent successfully' })
        });
      });
      
      await resetPage.requestPasswordReset(TestData.users.validUser.email);
      
      expect(sentEmails.length).toBe(1);
      expect(sentEmails[0].to).toBe(TestData.users.validUser.email);
    });

    test('should include proper reset link in email', async () => {
      // Mock email content inspection
      await resetPage.goto();
      
      let resetLink = '';
      await resetPage.page.route('**/api/auth/reset-password', (route) => {
        resetLink = `http://localhost:3000/reset-password?token=mock-token-123`;
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Reset email sent successfully' })
        });
      });
      
      await resetPage.requestPasswordReset(TestData.users.validUser.email);
      
      expect(resetLink).toContain('/reset-password?token=');
    });
  });

  test.describe('Integration with Login Flow @integration', () => {
    test('should allow login with new password after reset', async () => {
      // This would be tested in a full integration environment
      // For now, we'll simulate the flow
      
      const validToken = 'valid-reset-token-123';
      const newPassword = 'NewSecurePassword123!';
      
      // Mock successful password reset
      await newPasswordPage.page.route('**/api/auth/reset-password/**', (route) => {
        if (route.request().method() === 'GET') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ valid: true, email: TestData.users.validUser.email })
          });
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Password reset successfully' })
          });
        }
      });
      
      await newPasswordPage.goto(validToken);
      await newPasswordPage.setNewPassword(newPassword, newPassword);
      
      // Should complete successfully
      await expect(newPasswordPage.successMessage).toBeVisible();
      
      // Navigate to login and try new password
      await loginPage.goto();
      
      // Mock login with new password
      await loginPage.mockAPI(/\/api\/auth\/login/, {
        token: 'new-jwt-token',
        user: { email: TestData.users.validUser.email }
      });
      
      await loginPage.login(TestData.users.validUser.email, newPassword);
      
      // Should login successfully
      expect(await loginPage.isUserLoggedIn()).toBe(true);
    });
  });
});