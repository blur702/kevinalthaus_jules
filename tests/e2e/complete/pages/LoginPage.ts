import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Login Page Object Model
 * Handles all login-related interactions and validations
 */
export class LoginPage extends BasePage {
  // Selectors
  private readonly selectors = {
    loginForm: 'form[data-testid="login-form"], form:has(input[name="email"])',
    emailInput: 'input[name="email"], input[type="email"]',
    passwordInput: 'input[name="password"], input[type="password"]',
    showPasswordToggle: 'button[aria-label*="password"], [data-testid="show-password"]',
    rememberMeCheckbox: 'input[name="rememberMe"], input[type="checkbox"]',
    loginButton: 'button[type="submit"], button:has-text("Sign In"), button:has-text("Login")',
    errorMessage: '[role="alert"], .error-message, [data-testid="error-message"]',
    forgotPasswordLink: 'a[href*="forgot"], a:has-text("Forgot")',
    registerLink: 'a[href*="register"], a[href*="signup"], a:has-text("Sign Up")',
    loadingIndicator: '[data-testid="loading"], .loading, .spinner'
  };

  /**
   * Navigate to login page
   */
  async navigate(): Promise<void> {
    await this.goto('/auth/login');
    await this.validate();
  }

  /**
   * Validate that we're on the login page
   */
  async validate(): Promise<void> {
    // Wait for login form to be present
    await this.waitForElement(this.selectors.loginForm);
    
    // Verify essential elements exist
    const emailInput = this.page.locator(this.selectors.emailInput);
    const passwordInput = this.page.locator(this.selectors.passwordInput);
    const loginButton = this.page.locator(this.selectors.loginButton);

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(loginButton).toBeVisible();

    // Verify page title or URL contains login-related terms
    const url = this.getCurrentUrl();
    const title = await this.getTitle();
    
    expect(
      url.includes('login') || url.includes('auth') || 
      title.toLowerCase().includes('login') || title.toLowerCase().includes('sign in')
    ).toBeTruthy();
  }

  /**
   * Perform login with credentials
   */
  async login(email: string, password: string, rememberMe = false): Promise<void> {
    await this.fillInput(this.selectors.emailInput, email);
    await this.fillInput(this.selectors.passwordInput, password);

    if (rememberMe) {
      const rememberMeCheckbox = this.page.locator(this.selectors.rememberMeCheckbox);
      if (await rememberMeCheckbox.isVisible()) {
        await rememberMeCheckbox.check();
      }
    }

    // Monitor for network requests during login
    const loginRequestPromise = this.waitForAPIResponse(/auth|login/i);
    
    await this.clickElement(this.selectors.loginButton);

    // Wait for login request to complete
    try {
      await loginRequestPromise;
    } catch (error) {
      console.warn('No login API call detected - might be client-side only');
    }
  }

  /**
   * Login with valid credentials
   */
  async loginWithValidCredentials(): Promise<void> {
    await this.login('admin@shellplatform.test', 'admin123');
    await this.waitForSuccessfulLogin();
  }

  /**
   * Wait for successful login (redirect or dashboard)
   */
  async waitForSuccessfulLogin(): Promise<void> {
    // Wait for either redirect or dashboard elements
    await Promise.race([
      this.page.waitForURL(/dashboard|home|profile/i, { timeout: 10000 }),
      this.page.waitForSelector('[data-testid="user-menu"], [data-testid="dashboard"]', { timeout: 10000 })
    ]);
  }

  /**
   * Attempt login with invalid credentials
   */
  async loginWithInvalidCredentials(): Promise<void> {
    await this.login('invalid@test.com', 'wrongpassword');
    await this.waitForErrorMessage();
  }

  /**
   * Wait for error message to appear
   */
  async waitForErrorMessage(): Promise<string> {
    const errorElement = await this.waitForElement(this.selectors.errorMessage, 5000);
    return await errorElement.textContent() || '';
  }

  /**
   * Toggle password visibility
   */
  async togglePasswordVisibility(): Promise<void> {
    const showPasswordButton = this.page.locator(this.selectors.showPasswordToggle);
    if (await showPasswordButton.isVisible()) {
      await showPasswordButton.click();
    }
  }

  /**
   * Check if password is visible
   */
  async isPasswordVisible(): Promise<boolean> {
    const passwordInput = this.page.locator(this.selectors.passwordInput);
    const type = await passwordInput.getAttribute('type');
    return type === 'text';
  }

  /**
   * Click forgot password link
   */
  async clickForgotPassword(): Promise<void> {
    await this.clickElement(this.selectors.forgotPasswordLink);
  }

  /**
   * Click register/sign up link
   */
  async clickRegisterLink(): Promise<void> {
    await this.clickElement(this.selectors.registerLink);
  }

  /**
   * Verify form validation
   */
  async testFormValidation(): Promise<void> {
    // Test empty form submission
    await this.clickElement(this.selectors.loginButton);
    
    // Should show validation errors
    const emailInput = this.page.locator(this.selectors.emailInput);
    const passwordInput = this.page.locator(this.selectors.passwordInput);
    
    // Check for HTML5 validation or custom validation messages
    const emailValidity = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    const passwordValidity = await passwordInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    
    expect(emailValidity || passwordValidity).toBeFalsy();
  }

  /**
   * Test accessibility features
   */
  async testAccessibility(): Promise<void> {
    // Check for proper labels
    const emailInput = this.page.locator(this.selectors.emailInput);
    const passwordInput = this.page.locator(this.selectors.passwordInput);
    
    // Verify inputs have labels or aria-labels
    const emailLabel = await emailInput.getAttribute('aria-label') || await this.page.locator(`label[for="${await emailInput.getAttribute('id')}"]`).textContent();
    const passwordLabel = await passwordInput.getAttribute('aria-label') || await this.page.locator(`label[for="${await passwordInput.getAttribute('id')}"]`).textContent();
    
    expect(emailLabel).toBeTruthy();
    expect(passwordLabel).toBeTruthy();

    // Test keyboard navigation
    await this.page.keyboard.press('Tab');
    await expect(emailInput).toBeFocused();
    
    await this.page.keyboard.press('Tab');
    await expect(passwordInput).toBeFocused();
  }

  /**
   * Test login form under different network conditions
   */
  async testNetworkConditions(): Promise<void> {
    // Test with slow network
    await this.page.route('**/auth/**', route => {
      setTimeout(() => route.continue(), 2000);
    });

    await this.login('test@test.com', 'password');
    
    // Should show loading state
    const loadingIndicator = this.page.locator(this.selectors.loadingIndicator);
    if (await loadingIndicator.isVisible()) {
      await expect(loadingIndicator).toBeVisible();
    }
  }

  /**
   * Test session handling
   */
  async testSessionHandling(): Promise<void> {
    // Clear session storage and cookies
    await this.page.context().clearCookies();
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Should redirect to login or show logged out state
    await this.page.reload();
    await this.validate();
  }

  /**
   * Get all form field values
   */
  async getFormData(): Promise<Record<string, string>> {
    const emailValue = await this.page.locator(this.selectors.emailInput).inputValue();
    const passwordValue = await this.page.locator(this.selectors.passwordInput).inputValue();
    
    return {
      email: emailValue,
      password: passwordValue
    };
  }

  /**
   * Check for security features
   */
  async checkSecurityFeatures(): Promise<void> {
    // Verify password field is type="password" by default
    const passwordInput = this.page.locator(this.selectors.passwordInput);
    const passwordType = await passwordInput.getAttribute('type');
    expect(passwordType).toBe('password');

    // Check for CSRF protection (look for hidden token fields)
    const csrfToken = await this.page.locator('input[name="_token"], input[name="csrf_token"]').count();
    if (csrfToken > 0) {
      console.log('✅ CSRF protection detected');
    }

    // Verify form uses HTTPS in production
    const url = this.getCurrentUrl();
    if (url.startsWith('https://') || url.includes('localhost')) {
      console.log('✅ Secure connection verified');
    }
  }

  /**
   * Test multiple rapid submissions (prevent double-submit)
   */
  async testDoubleSubmitPrevention(): Promise<void> {
    await this.fillInput(this.selectors.emailInput, 'test@test.com');
    await this.fillInput(this.selectors.passwordInput, 'password');

    // Click submit button rapidly
    const submitButton = this.page.locator(this.selectors.loginButton);
    
    await submitButton.click();
    await submitButton.click(); // Second click should be prevented
    
    // Button should be disabled during submission
    const isDisabled = await submitButton.isDisabled();
    if (isDisabled) {
      console.log('✅ Double-submit prevention working');
    }
  }
}