import { test, expect, AuthHelpers, TEST_USERS } from '../fixtures/auth';

test.describe('Authentication', () => {
  let authHelpers: AuthHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    await authHelpers.clearAuth();
  });

  test('should redirect to login page when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  test('should display login form correctly', async ({ page }) => {
    await page.goto('/login');
    
    // Check for login form elements
    await expect(page.locator('h2')).toContainText('Sign in to Shell Platform');
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="forgot-password-link"]')).toBeVisible();
    await expect(page.locator('[data-testid="register-link"]')).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/login');
    
    // Try to submit empty form
    await page.click('[data-testid="login-button"]');
    
    // Check for validation errors
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
  });

  test('should show validation error for invalid email', async ({ page }) => {
    await page.goto('/login');
    
    // Fill invalid email
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.fill('[data-testid="password-input"]', 'password');
    await page.click('[data-testid="login-button"]');
    
    // Check for email validation error
    await expect(page.locator('text=Invalid email address')).toBeVisible();
  });

  test('should toggle password visibility', async ({ page }) => {
    await page.goto('/login');
    
    const passwordInput = page.locator('[data-testid="password-input"]');
    const toggleButton = page.locator('[data-testid="password-toggle"]');
    
    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Click toggle to show password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    
    // Click toggle to hide password again
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    // Mock successful login API response
    await page.route('/api/auth/login', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: TEST_USERS.user,
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
        }),
      });
    });

    await page.goto('/login');
    
    // Fill login form
    await page.fill('[data-testid="email-input"]', TEST_USERS.user.email);
    await page.fill('[data-testid="password-input"]', TEST_USERS.user.password);
    
    // Submit form
    await page.click('[data-testid="login-button"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/');
    
    // Should display user information
    await expect(page.locator('[data-testid="user-menu-button"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Mock failed login API response
    await page.route('/api/auth/login', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Invalid credentials',
        }),
      });
    });

    await page.goto('/login');
    
    // Fill login form with invalid credentials
    await page.fill('[data-testid="email-input"]', 'wrong@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    
    // Submit form
    await page.click('[data-testid="login-button"]');
    
    // Should show error message
    await expect(page.locator('text=Authentication Error')).toBeVisible();
  });

  test('should logout successfully', async ({ page, authenticatedUser }) => {
    await page.goto('/');
    
    // Should be on dashboard (authenticated)
    await expect(page).toHaveURL('/');
    
    // Click user menu
    await page.click('[data-testid="user-menu-button"]');
    
    // Click logout
    await page.click('[data-testid="logout-button"]');
    
    // Should redirect to login page
    await expect(page).toHaveURL('/login');
    
    // Should no longer be authenticated if we try to access dashboard
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/login');
    
    await page.click('[data-testid="register-link"]');
    
    await expect(page).toHaveURL('/register');
    await expect(page.locator('h2')).toContainText('Create your account');
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await page.goto('/login');
    
    await page.click('[data-testid="forgot-password-link"]');
    
    await expect(page).toHaveURL('/forgot-password');
  });

  test('should remember login preference', async ({ page }) => {
    await page.goto('/login');
    
    const rememberCheckbox = page.locator('[data-testid="remember-me-checkbox"]');
    
    // Initially unchecked
    await expect(rememberCheckbox).not.toBeChecked();
    
    // Check remember me
    await rememberCheckbox.check();
    await expect(rememberCheckbox).toBeChecked();
  });

  test('should redirect to intended page after login', async ({ page }) => {
    // Try to access a protected page
    await page.goto('/plugins');
    
    // Should redirect to login with return URL
    await expect(page).toHaveURL('/login');
    
    // Mock successful login
    await page.route('/api/auth/login', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: TEST_USERS.user,
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
        }),
      });
    });
    
    // Login
    await page.fill('[data-testid="email-input"]', TEST_USERS.user.email);
    await page.fill('[data-testid="password-input"]', TEST_USERS.user.password);
    await page.click('[data-testid="login-button"]');
    
    // Should redirect to originally intended page
    await expect(page).toHaveURL('/plugins');
  });
});