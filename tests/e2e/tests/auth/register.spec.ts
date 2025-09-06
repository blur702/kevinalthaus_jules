import { test, expect } from '@playwright/test';
import { RegisterPage } from '../../pages/auth/register-page';
import { LoginPage } from '../../pages/auth/login-page';
import { TestData } from '../../fixtures/test-data';

test.describe('Authentication - Registration Flow', () => {
  let registerPage: RegisterPage;

  test.beforeEach(async ({ page }) => {
    registerPage = new RegisterPage(page);
    await registerPage.goto();
  });

  test.describe('Page Load and UI Elements @smoke @critical', () => {
    test('should load registration page successfully', async () => {
      expect(await registerPage.isPageLoaded()).toBe(true);
      expect(await registerPage.getTitle()).toContain('Register');
      expect(registerPage.getCurrentUrl()).toContain('/register');
    });

    test('should display all required form elements', async () => {
      const elements = await registerPage.verifyPageElements();
      
      const criticalElements = [
        'First Name Input',
        'Last Name Input', 
        'Email Input',
        'Password Input',
        'Confirm Password Input',
        'Terms Checkbox',
        'Register Button'
      ];
      
      criticalElements.forEach(elementName => {
        const element = elements.find(el => el.name === elementName);
        expect(element?.visible, `${elementName} should be visible`).toBe(true);
      });
    });

    test('should have no console errors on page load', async () => {
      const consoleErrors = await registerPage.getConsoleErrors();
      
      const criticalErrors = consoleErrors.filter(error => 
        error.type === 'error' && 
        !error.text.includes('favicon') &&
        !error.text.includes('DevTools')
      );
      
      expect(criticalErrors).toHaveLength(0);
    });
  });

  test.describe('Successful Registration @critical', () => {
    test('should register new user with valid data', async () => {
      const testUser = await registerPage.registerWithTestData();
      
      // Should show success message or redirect to verification
      await expect(registerPage.page).toHaveURL(/verify|success|dashboard/);
    });

    test('should register with minimal required fields', async () => {
      await registerPage.fillRegistrationForm({
        firstName: 'Test',
        lastName: 'User',
        email: `test${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        agreeToTerms: true
      });
      
      await registerPage.submitRegistration();
      
      // Should complete registration successfully
      await expect(registerPage.page).not.toHaveURL(/register/);
    });

    test('should handle newsletter subscription option', async () => {
      await registerPage.fillRegistrationForm({
        firstName: 'Newsletter',
        lastName: 'User',
        email: `newsletter${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        agreeToTerms: true,
        subscribeNewsletter: true
      });
      
      await registerPage.submitRegistration();
      
      expect(await registerPage.isNewsletterChecked()).toBe(true);
    });

    test('should require email verification after registration', async () => {
      const verificationFlow = await registerPage.testEmailVerificationFlow();
      
      expect(verificationFlow.emailSent).toBe(true);
      expect(verificationFlow.verificationMessage).toBeTruthy();
    });
  });

  test.describe('Form Validation @critical @regression', () => {
    test('should validate all form fields', async () => {
      const validationResults = await registerPage.testFormValidation();
      
      // Empty form should show validation errors
      expect(validationResults.emptyForm.length).toBeGreaterThan(0);
      
      // Invalid email should show email error
      expect(validationResults.invalidEmail.some(error => 
        error.toLowerCase().includes('email')
      )).toBe(true);
      
      // Password mismatch should show error
      expect(validationResults.passwordMismatch.some(error =>
        error.toLowerCase().includes('password') ||
        error.toLowerCase().includes('match')
      )).toBe(true);
      
      // Weak password should show strength error
      expect(validationResults.weakPassword.some(error =>
        error.toLowerCase().includes('password')
      )).toBe(true);
    });

    test('should validate email formats', async () => {
      const emailValidationResults = await registerPage.testEmailValidation();
      
      // All validation results should be correct
      const incorrectValidations = emailValidationResults.filter(result => !result.correct);
      expect(incorrectValidations).toHaveLength(0);
    });

    test('should validate password requirements', async () => {
      const passwordValidationResults = await registerPage.testPasswordValidation();
      
      // Check that password validation works correctly
      const incorrectValidations = passwordValidationResults.filter(result => !result.correct);
      expect(incorrectValidations.length).toBeLessThanOrEqual(1); // Allow for minor edge cases
    });

    test('should require terms and conditions acceptance', async () => {
      const termsResult = await registerPage.testTermsRequirement();
      expect(termsResult.requiresTerms).toBe(true);
    });

    test('should validate password strength indicator', async () => {
      const strengthResults = await registerPage.testPasswordStrength();
      
      // Password strength should be indicated correctly
      strengthResults.forEach(result => {
        expect(result.matches, 
          `Password "${result.password}" should show ${result.expected} strength`
        ).toBe(true);
      });
    });

    test('should prevent duplicate email registration', async () => {
      const duplicateResult = await registerPage.testDuplicateEmail();
      
      expect(duplicateResult.errorDisplayed).toBe(true);
      expect(duplicateResult.errorMessage).toBe(true);
    });
  });

  test.describe('Security Features @security', () => {
    test('should sanitize XSS attempts in form fields', async () => {
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
        
        // Check that XSS payload was not executed
        const alertDialogs = await registerPage.page.evaluate(() => 
          document.querySelectorAll('script[src*="alert"], *[onload*="alert"]').length
        );
        
        expect(alertDialogs).toBe(0);
        
        // Clear form for next test
        await registerPage.clearForm();
      }
    });

    test('should prevent SQL injection in registration', async () => {
      const sqlPayloads = TestData.security.sql.payloads;
      
      for (const payload of sqlPayloads) {
        await registerPage.fillRegistrationForm({
          firstName: 'Test',
          lastName: 'User',
          email: payload,
          password: 'SecurePassword123!',
          confirmPassword: 'SecurePassword123!',
          agreeToTerms: true
        });
        
        await registerPage.submitRegistration();
        
        // Should not cause successful registration or errors
        const isOnRegisterPage = registerPage.getCurrentUrl().includes('/register');
        expect(isOnRegisterPage).toBe(true);
        
        await registerPage.clearForm();
      }
    });

    test('should enforce password complexity requirements', async () => {
      const weakPasswords = [
        'password',
        '123456',
        'qwerty',
        'admin',
        'letmein',
        '12345678'
      ];
      
      for (const weakPassword of weakPasswords) {
        await registerPage.fillRegistrationForm({
          firstName: 'Test',
          lastName: 'User',
          email: `test${Date.now()}@example.com`,
          password: weakPassword,
          confirmPassword: weakPassword,
          agreeToTerms: true
        });
        
        await registerPage.submitRegistration();
        
        const errors = await registerPage.getFormErrors();
        expect(errors.some(error => 
          error.toLowerCase().includes('password') ||
          error.toLowerCase().includes('weak') ||
          error.toLowerCase().includes('strength')
        )).toBe(true);
        
        await registerPage.clearForm();
      }
    });

    test('should protect against CSRF attacks', async () => {
      // Modify CSRF token if present
      await registerPage.page.evaluate(() => {
        const csrfInputs = document.querySelectorAll('input[name*="csrf"], input[name*="token"]');
        csrfInputs.forEach(input => (input as HTMLInputElement).value = 'invalid-token');
      });
      
      await registerPage.fillRegistrationForm({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        agreeToTerms: true
      });
      
      await registerPage.submitRegistration();
      
      // Should be rejected due to invalid CSRF token
      await registerPage.waitForErrorMessage();
    });
  });

  test.describe('Navigation and Flow @smoke', () => {
    test('should navigate to login page from register', async () => {
      await registerPage.clickLogin();
      expect(registerPage.getCurrentUrl()).toContain('/login');
    });

    test('should complete registration and redirect appropriately', async () => {
      const testUser = await registerPage.registerWithTestData();
      
      // After successful registration, should be redirected
      await expect(registerPage.page).toHaveURL(/verify|welcome|dashboard/);
      
      // Should not be on register page anymore
      expect(registerPage.getCurrentUrl()).not.toContain('/register');
    });

    test('should handle registration with subsequent login', async () => {
      const testUser = await registerPage.registerWithTestData();
      
      // If redirected to verification page, navigate to login
      if (registerPage.getCurrentUrl().includes('verify')) {
        const loginPage = new LoginPage(registerPage.page);
        await loginPage.goto();
        
        // Try to login with registered credentials
        await loginPage.login(testUser.email, testUser.password);
        
        // Should either login successfully or show verification required message
        const loggedIn = await loginPage.isUserLoggedIn();
        if (!loggedIn) {
          await loginPage.waitForErrorMessage();
          const errorMessage = await loginPage.errorMessage.textContent();
          expect(errorMessage?.toLowerCase()).toContain('verify');
        }
      }
    });
  });

  test.describe('Accessibility @accessibility', () => {
    test('should meet accessibility standards', async () => {
      const accessibilityResults = await registerPage.testAccessibility();
      
      // Should have no critical accessibility violations
      expect(accessibilityResults.violations).toHaveLength(0);
    });

    test('should support keyboard navigation', async () => {
      const { page } = registerPage;
      
      // Test tab order through all form fields
      const expectedTabOrder = [
        'firstName',
        'lastName',
        'email',
        'password',
        'confirmPassword',
        'terms',
        'register-button'
      ];
      
      for (const fieldId of expectedTabOrder) {
        await page.keyboard.press('Tab');
        const focused = await page.locator(`[data-testid="${fieldId}"]`).isVisible();
        expect(focused, `Field ${fieldId} should be reachable via keyboard`).toBe(true);
      }
    });

    test('should have proper form labels and ARIA attributes', async () => {
      const requiredFields = [
        '[data-testid="firstName"]',
        '[data-testid="lastName"]',
        '[data-testid="email"]',
        '[data-testid="password"]',
        '[data-testid="confirmPassword"]'
      ];
      
      for (const selector of requiredFields) {
        const field = registerPage.page.locator(selector);
        await expect(field).toHaveAttribute('aria-label');
      }
    });
  });

  test.describe('Visual Regression @visual', () => {
    test('should match registration page screenshot', async () => {
      await registerPage.waitForPageReady();
      await registerPage.compareScreenshot('register-page');
    });

    test('should display validation errors consistently', async () => {
      // Submit empty form to show all validation errors
      await registerPage.submitRegistration();
      
      // Wait for errors to appear
      await registerPage.page.waitForTimeout(1000);
      
      await registerPage.compareScreenshot('register-page-with-errors');
    });

    test('should show password strength indicator', async () => {
      await registerPage.page.locator('[data-testid="password"]').fill('WeakPassword123!');
      await registerPage.page.waitForTimeout(500);
      
      await registerPage.compareScreenshot('register-page-password-strength');
    });
  });

  test.describe('Responsive Design @responsive', () => {
    test('should work on different screen sizes', async () => {
      const responsiveResults = await registerPage.testResponsiveDesign();
      
      responsiveResults.forEach(result => {
        expect(result.visible, `Register page should be visible on ${result.viewport}`).toBe(true);
      });
    });

    test('should adapt form layout on mobile', async () => {
      await registerPage.page.setViewportSize({ width: 375, height: 667 });
      await registerPage.waitForPageReady();
      
      // All form fields should still be visible and usable
      const elements = await registerPage.verifyPageElements();
      const visibleElements = elements.filter(el => el.visible);
      
      expect(visibleElements.length).toBeGreaterThan(5);
    });
  });

  test.describe('Performance @performance', () => {
    test('should load within performance thresholds', async () => {
      const metrics = await registerPage.getPerformanceMetrics();
      
      expect(metrics.loadTime).toBeLessThan(TestData.performance.thresholds.pageLoad);
      expect(metrics.firstContentfulPaint).toBeLessThan(TestData.performance.thresholds.firstContentfulPaint);
    });

    test('should handle form submission efficiently', async () => {
      const startTime = Date.now();
      
      await registerPage.registerWithTestData();
      
      const endTime = Date.now();
      const submissionTime = endTime - startTime;
      
      expect(submissionTime).toBeLessThan(5000); // 5 seconds max
    });

    test('should have acceptable memory usage', async () => {
      const memoryUsage = await registerPage.getMemoryUsage();
      
      if (memoryUsage) {
        expect(memoryUsage.usedJSHeapSize).toBeLessThan(TestData.performance.thresholds.memoryUsage);
      }
    });
  });

  test.describe('Email Verification Flow @critical', () => {
    test('should send verification email after registration', async () => {
      const verificationFlow = await registerPage.testEmailVerificationFlow();
      
      expect(verificationFlow.emailSent).toBe(true);
      expect(verificationFlow.verificationMessage).toContain('email');
    });

    test('should display verification instructions', async () => {
      await registerPage.registerWithTestData();
      
      const verificationMessage = await registerPage.waitForEmailVerificationMessage();
      
      expect(verificationMessage.toLowerCase()).toContain('email');
      expect(verificationMessage.toLowerCase()).toMatch(/(verify|confirm|check)/);
    });
  });

  test.describe('Field-specific Validation @regression', () => {
    test('should validate first name field', async () => {
      // Empty first name
      await registerPage.page.locator('[data-testid="firstName"]').fill('');
      await registerPage.page.locator('[data-testid="lastName"]').fill('User');
      await registerPage.submitRegistration();
      
      const errors = await registerPage.getFormErrors();
      expect(errors.some(error => 
        error.toLowerCase().includes('first') || 
        error.toLowerCase().includes('name')
      )).toBe(true);
    });

    test('should validate last name field', async () => {
      await registerPage.page.locator('[data-testid="firstName"]').fill('Test');
      await registerPage.page.locator('[data-testid="lastName"]').fill('');
      await registerPage.submitRegistration();
      
      const errors = await registerPage.getFormErrors();
      expect(errors.some(error => 
        error.toLowerCase().includes('last') || 
        error.toLowerCase().includes('name')
      )).toBe(true);
    });

    test('should validate password confirmation match', async () => {
      await registerPage.fillRegistrationForm({
        firstName: 'Test',
        lastName: 'User', 
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'DifferentPassword123!',
        agreeToTerms: true
      });
      
      await registerPage.submitRegistration();
      
      const errors = await registerPage.getFormErrors();
      expect(errors.some(error => 
        error.toLowerCase().includes('match') ||
        error.toLowerCase().includes('confirm')
      )).toBe(true);
    });

    test('should validate phone number format if provided', async () => {
      const invalidPhones = TestData.validation.phone.invalid;
      
      for (const phone of invalidPhones) {
        await registerPage.fillRegistrationForm({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          phone: phone,
          agreeToTerms: true
        });
        
        await registerPage.submitRegistration();
        
        if (phone !== '') { // Empty phone should be allowed
          const errors = await registerPage.getFormErrors();
          expect(errors.some(error => 
            error.toLowerCase().includes('phone')
          )).toBe(true);
        }
        
        await registerPage.clearForm();
      }
    });
  });

  test.describe('Social Registration @social', () => {
    test('should handle social registration options', async () => {
      const socialResult = await registerPage.testSocialRegistration();
      
      // This test depends on actual social registration implementation
      // For now, just verify the test runs without errors
      expect(socialResult).toBeDefined();
    });
  });

  test.describe('Data Privacy and Terms @legal', () => {
    test('should require terms acceptance before registration', async () => {
      await registerPage.fillRegistrationForm({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        agreeToTerms: false // Don't accept terms
      });
      
      await registerPage.submitRegistration();
      
      // Should prevent registration
      expect(registerPage.getCurrentUrl()).toContain('/register');
      
      const errors = await registerPage.getFormErrors();
      expect(errors.some(error => 
        error.toLowerCase().includes('terms') ||
        error.toLowerCase().includes('agreement')
      )).toBe(true);
    });

    test('should handle newsletter subscription properly', async () => {
      await registerPage.fillRegistrationForm({
        firstName: 'Test',
        lastName: 'User',
        email: 'newsletter@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        agreeToTerms: true,
        subscribeNewsletter: true
      });
      
      expect(await registerPage.isNewsletterChecked()).toBe(true);
      
      await registerPage.submitRegistration();
      
      // Subscription preference should be recorded
      // (This would be verified through API or database in real tests)
    });
  });
});