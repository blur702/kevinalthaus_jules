import { Page, expect } from '@playwright/test';
import { BasePage } from '../base-page';
import { TestData } from '../../fixtures/test-data';

export class RegisterPage extends BasePage {
  // Page URL
  private readonly url = '/register';

  // Locators
  private get firstNameInput() { return this.page.locator('[data-testid="firstName"], [name="firstName"], #firstName'); }
  private get lastNameInput() { return this.page.locator('[data-testid="lastName"], [name="lastName"], #lastName'); }
  private get emailInput() { return this.page.locator('[data-testid="email"], [name="email"], input[type="email"]'); }
  private get passwordInput() { return this.page.locator('[data-testid="password"], [name="password"], input[type="password"]'); }
  private get confirmPasswordInput() { return this.page.locator('[data-testid="confirmPassword"], [name="confirmPassword"], [name="password_confirmation"]'); }
  private get phoneInput() { return this.page.locator('[data-testid="phone"], [name="phone"], input[type="tel"]'); }
  private get termsCheckbox() { return this.page.locator('[data-testid="terms"], [name="terms"], [name="agreeToTerms"]'); }
  private get newsletterCheckbox() { return this.page.locator('[data-testid="newsletter"], [name="newsletter"], [name="subscribeNewsletter"]'); }
  private get registerButton() { return this.page.locator('[data-testid="register-button"], button[type="submit"], .register-button'); }
  private get loginLink() { return this.page.locator('[data-testid="login-link"], .login-link, text="Sign in"'); }
  private get passwordStrengthIndicator() { return this.page.locator('[data-testid="password-strength"], .password-strength'); }
  private get emailVerificationMessage() { return this.page.locator('[data-testid="email-verification"], .email-verification-message'); }
  private get registerForm() { return this.page.locator('[data-testid="register-form"], form'); }

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to register page
   */
  async goto(options?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }) {
    await this.page.goto(this.url, options);
    await this.waitForPageReady();
  }

  /**
   * Fill registration form with user data
   */
  async fillRegistrationForm(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    phone?: string;
    agreeToTerms?: boolean;
    subscribeNewsletter?: boolean;
  }) {
    await this.firstNameInput.fill(userData.firstName);
    await this.lastNameInput.fill(userData.lastName);
    await this.emailInput.fill(userData.email);
    await this.passwordInput.fill(userData.password);
    await this.confirmPasswordInput.fill(userData.confirmPassword);
    
    if (userData.phone) {
      await this.phoneInput.fill(userData.phone);
    }
    
    if (userData.agreeToTerms !== false) {
      await this.termsCheckbox.check();
    }
    
    if (userData.subscribeNewsletter) {
      await this.newsletterCheckbox.check();
    }
  }

  /**
   * Submit registration form
   */
  async submitRegistration() {
    await expect(this.registerButton).toBeEnabled();
    
    await Promise.all([
      this.page.waitForResponse(response => 
        response.url().includes('/api/auth/register') && response.status() !== 301
      ).catch(() => {}),
      this.registerButton.click()
    ]);
  }

  /**
   * Complete registration with new user data
   */
  async registerNewUser(userData?: any) {
    const user = userData || TestData.users.newUser;
    
    await this.fillRegistrationForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: user.password,
      confirmPassword: user.confirmPassword || user.password,
      agreeToTerms: true
    });
    
    await this.submitRegistration();
  }

  /**
   * Register with generated test data
   */
  async registerWithTestData() {
    const testUser = this.helpers.constructor.generateTestUser();
    
    await this.fillRegistrationForm({
      firstName: testUser.firstName,
      lastName: testUser.lastName,
      email: testUser.email,
      password: testUser.password,
      confirmPassword: testUser.password,
      phone: testUser.phone,
      agreeToTerms: true,
      subscribeNewsletter: false
    });
    
    await this.submitRegistration();
    return testUser;
  }

  /**
   * Test password strength indicator
   */
  async testPasswordStrength() {
    const passwords = [
      { password: 'weak', expectedStrength: 'weak' },
      { password: 'Password1', expectedStrength: 'medium' },
      { password: 'StrongPassword123!', expectedStrength: 'strong' }
    ];
    
    const results = [];
    
    for (const { password, expectedStrength } of passwords) {
      await this.passwordInput.fill(password);
      await this.page.waitForTimeout(500); // Wait for strength calculation
      
      const strengthIndicator = await this.passwordStrengthIndicator.textContent();
      results.push({
        password,
        expected: expectedStrength,
        actual: strengthIndicator?.toLowerCase(),
        matches: strengthIndicator?.toLowerCase().includes(expectedStrength)
      });
    }
    
    return results;
  }

  /**
   * Test form validation
   */
  async testFormValidation() {
    // Test empty form submission
    await this.registerButton.click();
    const emptyFormErrors = await this.getFormErrors();
    
    // Test invalid email
    await this.emailInput.fill('invalid-email');
    await this.registerButton.click();
    const emailErrors = await this.getFormErrors();
    
    // Test password mismatch
    await this.emailInput.fill('test@example.com');
    await this.passwordInput.fill('Password123!');
    await this.confirmPasswordInput.fill('DifferentPassword123!');
    await this.registerButton.click();
    const passwordMismatchErrors = await this.getFormErrors();
    
    // Test weak password
    await this.passwordInput.fill('weak');
    await this.confirmPasswordInput.fill('weak');
    await this.registerButton.click();
    const weakPasswordErrors = await this.getFormErrors();
    
    return {
      emptyForm: emptyFormErrors,
      invalidEmail: emailErrors,
      passwordMismatch: passwordMismatchErrors,
      weakPassword: weakPasswordErrors
    };
  }

  /**
   * Test email validation with various formats
   */
  async testEmailValidation() {
    const testCases = [
      ...TestData.validation.email.invalid.map(email => ({ email, valid: false })),
      ...TestData.validation.email.valid.map(email => ({ email, valid: true }))
    ];
    
    const results = [];
    
    for (const testCase of testCases) {
      await this.emailInput.fill(testCase.email);
      await this.firstNameInput.click(); // Trigger validation
      
      const hasError = (await this.getFormErrors()).some(error => 
        error.toLowerCase().includes('email')
      );
      
      results.push({
        email: testCase.email,
        expectedValid: testCase.valid,
        actualValid: !hasError,
        correct: testCase.valid === !hasError
      });
    }
    
    return results;
  }

  /**
   * Test password validation requirements
   */
  async testPasswordValidation() {
    const testCases = [
      ...TestData.validation.password.invalid.map(password => ({ password, valid: false })),
      ...TestData.validation.password.valid.map(password => ({ password, valid: true }))
    ];
    
    const results = [];
    
    for (const testCase of testCases) {
      await this.passwordInput.fill(testCase.password);
      await this.confirmPasswordInput.fill(testCase.password);
      await this.firstNameInput.click(); // Trigger validation
      
      const hasError = (await this.getFormErrors()).some(error => 
        error.toLowerCase().includes('password')
      );
      
      results.push({
        password: testCase.password,
        expectedValid: testCase.valid,
        actualValid: !hasError,
        correct: testCase.valid === !hasError
      });
    }
    
    return results;
  }

  /**
   * Test terms and conditions requirement
   */
  async testTermsRequirement() {
    // Fill form but don't check terms
    await this.fillRegistrationForm({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      agreeToTerms: false
    });
    
    await this.registerButton.click();
    const errors = await this.getFormErrors();
    
    return {
      requiresTerms: errors.some(error => 
        error.toLowerCase().includes('terms') || 
        error.toLowerCase().includes('agreement')
      )
    };
  }

  /**
   * Test duplicate email registration
   */
  async testDuplicateEmail() {
    const existingUser = TestData.users.validUser;
    
    await this.fillRegistrationForm({
      firstName: 'New',
      lastName: 'User',
      email: existingUser.email, // Use existing email
      password: 'NewPassword123!',
      confirmPassword: 'NewPassword123!',
      agreeToTerms: true
    });
    
    await this.submitRegistration();
    
    // Check for duplicate email error
    await this.waitForErrorMessage();
    const errorMessage = await this.errorMessage.textContent();
    
    return {
      errorDisplayed: true,
      errorMessage: errorMessage?.toLowerCase().includes('email') || 
                   errorMessage?.toLowerCase().includes('exists') ||
                   errorMessage?.toLowerCase().includes('already')
    };
  }

  /**
   * Click login link
   */
  async clickLogin() {
    await this.loginLink.click();
    await this.page.waitForURL(url => url.includes('/login'));
  }

  /**
   * Check if terms checkbox is checked
   */
  async isTermsChecked(): Promise<boolean> {
    return await this.termsCheckbox.isChecked();
  }

  /**
   * Check if newsletter checkbox is checked
   */
  async isNewsletterChecked(): Promise<boolean> {
    return await this.newsletterCheckbox.isChecked();
  }

  /**
   * Get form validation errors
   */
  async getFormErrors(): Promise<string[]> {
    return await this.helpers.getFormErrors('[data-testid="register-form"]');
  }

  /**
   * Wait for email verification message
   */
  async waitForEmailVerificationMessage() {
    await this.emailVerificationMessage.waitFor({ state: 'visible', timeout: 10000 });
    return await this.emailVerificationMessage.textContent();
  }

  /**
   * Verify page elements are present
   */
  async verifyPageElements() {
    const elements = [
      { selector: '[data-testid="firstName"]', name: 'First Name Input' },
      { selector: '[data-testid="lastName"]', name: 'Last Name Input' },
      { selector: '[data-testid="email"]', name: 'Email Input' },
      { selector: '[data-testid="password"]', name: 'Password Input' },
      { selector: '[data-testid="confirmPassword"]', name: 'Confirm Password Input' },
      { selector: '[data-testid="terms"]', name: 'Terms Checkbox' },
      { selector: '[data-testid="register-button"]', name: 'Register Button' },
      { selector: '[data-testid="login-link"]', name: 'Login Link' }
    ];
    
    return await super.verifyPageElements(elements);
  }

  /**
   * Test form accessibility
   */
  async testAccessibility() {
    // Check for proper labels
    const requiredFields = [
      this.firstNameInput,
      this.lastNameInput,
      this.emailInput,
      this.passwordInput,
      this.confirmPasswordInput
    ];
    
    for (const field of requiredFields) {
      await expect(field).toHaveAttribute('aria-label');
    }
    
    // Check for proper form structure
    await expect(this.registerForm).toBeVisible();
    
    // Test keyboard navigation
    const fields = [
      this.firstNameInput,
      this.lastNameInput,
      this.emailInput,
      this.passwordInput,
      this.confirmPasswordInput,
      this.termsCheckbox,
      this.registerButton
    ];
    
    for (let i = 0; i < fields.length - 1; i++) {
      await fields[i].focus();
      await this.page.keyboard.press('Tab');
      await expect(fields[i + 1]).toBeFocused();
    }
    
    return await this.checkAccessibility();
  }

  /**
   * Test responsive design
   */
  async testResponsiveDesign() {
    const viewports = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ];
    
    return await super.testResponsiveDesign(viewports);
  }

  /**
   * Get current form data
   */
  async getFormData() {
    return {
      firstName: await this.firstNameInput.inputValue(),
      lastName: await this.lastNameInput.inputValue(),
      email: await this.emailInput.inputValue(),
      password: await this.passwordInput.inputValue(),
      confirmPassword: await this.confirmPasswordInput.inputValue(),
      phone: await this.phoneInput.inputValue().catch(() => ''),
      agreeToTerms: await this.isTermsChecked(),
      subscribeNewsletter: await this.isNewsletterChecked()
    };
  }

  /**
   * Clear registration form
   */
  async clearForm() {
    await this.firstNameInput.fill('');
    await this.lastNameInput.fill('');
    await this.emailInput.fill('');
    await this.passwordInput.fill('');
    await this.confirmPasswordInput.fill('');
    await this.phoneInput.fill('').catch(() => {});
    
    if (await this.isTermsChecked()) {
      await this.termsCheckbox.uncheck();
    }
    
    if (await this.isNewsletterChecked()) {
      await this.newsletterCheckbox.uncheck();
    }
  }

  /**
   * Test registration flow with email verification
   */
  async testEmailVerificationFlow() {
    const testUser = await this.registerWithTestData();
    
    // Wait for email verification message
    const verificationMessage = await this.waitForEmailVerificationMessage();
    
    // In a real test, you would:
    // 1. Check email inbox for verification email
    // 2. Extract verification link
    // 3. Visit verification link
    // 4. Verify account is activated
    
    return {
      user: testUser,
      verificationMessage,
      emailSent: verificationMessage?.toLowerCase().includes('email') || false
    };
  }

  /**
   * Test registration with social providers
   */
  async testSocialRegistration() {
    // This would test OAuth registration flows
    // For now, we'll mock the responses
    
    await this.mockAPI(/\/api\/auth\/google\/register/, {
      token: 'google-oauth-token',
      user: { 
        email: 'test@gmail.com', 
        firstName: 'Test',
        lastName: 'User'
      }
    });
    
    return { 
      socialRegistrationAvailable: false // Update based on actual implementation
    };
  }
}