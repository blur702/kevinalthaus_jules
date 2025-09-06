import { Page, expect } from '@playwright/test';
import { BasePage } from '../base-page';
import { TestData } from '../../fixtures/test-data';

export class LoginPage extends BasePage {
  // Page URL
  private readonly url = '/login';

  // Locators
  private get emailInput() { return this.page.locator('[data-testid="email"], [name="email"], input[type="email"]'); }
  private get passwordInput() { return this.page.locator('[data-testid="password"], [name="password"], input[type="password"]'); }
  private get loginButton() { return this.page.locator('[data-testid="login-button"], button[type="submit"], .login-button'); }
  private get rememberMeCheckbox() { return this.page.locator('[data-testid="remember-me"], [name="rememberMe"], input[type="checkbox"]'); }
  private get forgotPasswordLink() { return this.page.locator('[data-testid="forgot-password"], .forgot-password, text="Forgot Password"'); }
  private get registerLink() { return this.page.locator('[data-testid="register-link"], .register-link, text="Sign up"'); }
  private get socialLoginButtons() { return this.page.locator('[data-testid^="social-"], .social-login button'); }
  private get googleLoginButton() { return this.page.locator('[data-testid="google-login"], .google-login'); }
  private get githubLoginButton() { return this.page.locator('[data-testid="github-login"], .github-login'); }
  private get twoFactorInput() { return this.page.locator('[data-testid="2fa-code"], [name="twoFactorCode"], .two-factor-input'); }
  private get twoFactorSubmit() { return this.page.locator('[data-testid="2fa-submit"], .two-factor-submit'); }
  private get loginForm() { return this.page.locator('[data-testid="login-form"], form'); }

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to login page
   */
  async goto(options?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }) {
    await this.page.goto(this.url, options);
    await this.waitForPageReady();
  }

  /**
   * Fill in login credentials
   */
  async fillCredentials(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  /**
   * Submit login form
   */
  async submitLogin() {
    // Wait for login button to be enabled
    await expect(this.loginButton).toBeEnabled();
    
    // Click login button and wait for response
    await Promise.all([
      this.page.waitForResponse(response => 
        response.url().includes('/api/auth/login') && response.status() !== 301
      ).catch(() => {}), // Ignore if no API call
      this.loginButton.click()
    ]);
  }

  /**
   * Perform complete login flow
   */
  async login(email: string, password: string, remember = false) {
    await this.fillCredentials(email, password);
    
    if (remember) {
      await this.rememberMeCheckbox.check();
    }
    
    await this.submitLogin();
    
    // Check if 2FA is required
    if (await this.twoFactorInput.isVisible({ timeout: 3000 })) {
      // For testing, we'll use a mock 2FA code
      await this.enterTwoFactorCode('123456');
    }
    
    // Wait for redirect or success indication
    await this.page.waitForURL(url => !url.includes('/login'), { timeout: 10000 }).catch(() => {});
  }

  /**
   * Login with valid test credentials
   */
  async loginAsTestUser() {
    const user = TestData.users.validUser;
    await this.login(user.email, user.password);
  }

  /**
   * Login as admin user
   */
  async loginAsAdmin() {
    const admin = TestData.users.adminUser;
    await this.login(admin.email, admin.password);
  }

  /**
   * Attempt login with invalid credentials
   */
  async attemptInvalidLogin() {
    const user = TestData.users.invalidUser;
    await this.login(user.email, user.password);
    
    // Wait for error message to appear
    await this.waitForErrorMessage();
  }

  /**
   * Enter two-factor authentication code
   */
  async enterTwoFactorCode(code: string) {
    await this.twoFactorInput.fill(code);
    await this.twoFactorSubmit.click();
    
    // Wait for 2FA verification
    await this.page.waitForResponse(response => 
      response.url().includes('/api/auth/2fa/verify')
    ).catch(() => {});
  }

  /**
   * Click forgot password link
   */
  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
    await this.page.waitForURL(url => url.includes('/reset-password') || url.includes('/forgot-password'));
  }

  /**
   * Click register link
   */
  async clickRegister() {
    await this.registerLink.click();
    await this.page.waitForURL(url => url.includes('/register') || url.includes('/signup'));
  }

  /**
   * Perform social login
   */
  async loginWithGoogle() {
    // Handle popup window for Google OAuth
    const [popup] = await Promise.all([
      this.page.waitForEvent('popup'),
      this.googleLoginButton.click()
    ]);
    
    // In real tests, you'd interact with the Google OAuth popup
    // For testing, we'll close it and simulate successful login
    await popup.close();
    
    // Mock the successful OAuth response
    await this.mockAPI(/\/api\/auth\/google/, {
      token: 'google-oauth-token',
      user: { email: 'test@gmail.com', name: 'Test User' }
    });
  }

  /**
   * Perform GitHub login
   */
  async loginWithGitHub() {
    const [popup] = await Promise.all([
      this.page.waitForEvent('popup'),
      this.githubLoginButton.click()
    ]);
    
    await popup.close();
    
    await this.mockAPI(/\/api\/auth\/github/, {
      token: 'github-oauth-token',
      user: { email: 'test@github.com', name: 'Test User' }
    });
  }

  /**
   * Check if remember me is checked
   */
  async isRememberMeChecked(): Promise<boolean> {
    return await this.rememberMeCheckbox.isChecked();
  }

  /**
   * Get form validation errors
   */
  async getFormErrors(): Promise<string[]> {
    return await this.helpers.getFormErrors('[data-testid="login-form"]');
  }

  /**
   * Test email validation
   */
  async testEmailValidation() {
    const invalidEmails = TestData.validation.email.invalid;
    const errors = [];
    
    for (const email of invalidEmails) {
      await this.emailInput.fill(email);
      await this.passwordInput.fill('Password123!'); // Valid password
      await this.loginButton.click();
      
      // Wait for validation error
      const formErrors = await this.getFormErrors();
      errors.push({
        email,
        errors: formErrors.filter(error => error.toLowerCase().includes('email'))
      });
      
      // Clear the form
      await this.emailInput.fill('');
    }
    
    return errors;
  }

  /**
   * Test password validation
   */
  async testPasswordValidation() {
    const invalidPasswords = TestData.validation.password.invalid;
    const errors = [];
    
    for (const password of invalidPasswords) {
      await this.emailInput.fill('test@example.com'); // Valid email
      await this.passwordInput.fill(password);
      await this.loginButton.click();
      
      const formErrors = await this.getFormErrors();
      errors.push({
        password,
        errors: formErrors.filter(error => error.toLowerCase().includes('password'))
      });
      
      await this.passwordInput.fill('');
    }
    
    return errors;
  }

  /**
   * Test rate limiting
   */
  async testRateLimiting(attempts = 5) {
    const user = TestData.users.invalidUser;
    let rateLimited = false;
    
    for (let i = 0; i < attempts; i++) {
      await this.fillCredentials(user.email, user.password);
      await this.loginButton.click();
      
      // Check if rate limited
      const response = await this.page.waitForResponse(response => 
        response.url().includes('/api/auth/login')
      ).catch(() => null);
      
      if (response && response.status() === 429) {
        rateLimited = true;
        break;
      }
      
      // Wait before next attempt
      await this.page.waitForTimeout(500);
    }
    
    return { rateLimited, attempts };
  }

  /**
   * Verify page elements are present
   */
  async verifyPageElements() {
    const elements = [
      { selector: '[data-testid="email"]', name: 'Email Input' },
      { selector: '[data-testid="password"]', name: 'Password Input' },
      { selector: '[data-testid="login-button"]', name: 'Login Button' },
      { selector: '[data-testid="forgot-password"]', name: 'Forgot Password Link' },
      { selector: '[data-testid="register-link"]', name: 'Register Link' }
    ];
    
    return await super.verifyPageElements(elements);
  }

  /**
   * Test login form accessibility
   */
  async testAccessibility() {
    // Check for proper labels
    await expect(this.emailInput).toHaveAttribute('aria-label');
    await expect(this.passwordInput).toHaveAttribute('aria-label');
    
    // Check for proper form structure
    await expect(this.loginForm).toBeVisible();
    
    // Test keyboard navigation
    await this.emailInput.focus();
    await this.page.keyboard.press('Tab');
    await expect(this.passwordInput).toBeFocused();
    
    await this.page.keyboard.press('Tab');
    await expect(this.loginButton).toBeFocused();
    
    return await this.checkAccessibility();
  }

  /**
   * Test login page in different themes
   */
  async testThemes() {
    const themes = ['light', 'dark'] as const;
    const results = [];
    
    for (const theme of themes) {
      await this.switchTheme(theme);
      await this.waitForPageReady();
      
      const screenshot = await this.takeScreenshot(`login-${theme}-theme`);
      const currentTheme = await this.getCurrentTheme();
      
      results.push({
        theme,
        applied: currentTheme === theme,
        screenshot
      });
    }
    
    return results;
  }

  /**
   * Test responsive design on different viewports
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
   * Check if social login buttons are available
   */
  async areSocialLoginsAvailable(): Promise<boolean> {
    const googleVisible = await this.googleLoginButton.isVisible().catch(() => false);
    const githubVisible = await this.githubLoginButton.isVisible().catch(() => false);
    
    return googleVisible || githubVisible;
  }

  /**
   * Check if 2FA is enabled for the account
   */
  async is2FARequired(): Promise<boolean> {
    return await this.twoFactorInput.isVisible({ timeout: 3000 });
  }

  /**
   * Get login form data for testing
   */
  async getFormData() {
    return {
      email: await this.emailInput.inputValue(),
      password: await this.passwordInput.inputValue(),
      rememberMe: await this.isRememberMeChecked()
    };
  }
}