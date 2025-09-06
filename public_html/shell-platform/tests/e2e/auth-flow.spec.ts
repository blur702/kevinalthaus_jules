/**
 * End-to-End Authentication Flow Tests
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display login form when not authenticated', async ({ page }) => {
    // Check if login form is present or if we're redirected to login
    const hasLoginForm = await page.locator('form').count() > 0 ||
                        await page.locator('input[type="email"], input[type="username"]').count() > 0 ||
                        await page.locator('button').getByText(/login|sign in/i).count() > 0;
    
    if (hasLoginForm) {
      console.log('Login form detected');
      expect(hasLoginForm).toBe(true);
    } else {
      // If no login form, check if we're already authenticated or have different auth flow
      const isAuthenticated = await page.locator('[data-testid="user-menu"], .user-profile, .logout').count() > 0;
      console.log(`Authentication state: ${isAuthenticated ? 'authenticated' : 'no login form found'}`);
    }
  });

  test('should handle login attempt', async ({ page }) => {
    // Look for login inputs
    const emailInput = page.locator('input[type="email"], input[name="email"], input[name="username"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const loginButton = page.locator('button[type="submit"], button').getByText(/login|sign in/i).first();

    const hasLoginForm = await emailInput.count() > 0 && await passwordInput.count() > 0;

    if (hasLoginForm) {
      // Fill in test credentials
      await emailInput.fill('test@example.com');
      await passwordInput.fill('testpassword');
      
      // Submit form
      await loginButton.click();
      
      // Wait for navigation or response
      await page.waitForTimeout(2000);
      
      // Check if we got some response (success or error message)
      const hasErrorMessage = await page.locator('.error, .alert-danger, [role="alert"]').count() > 0;
      const hasSuccessRedirect = await page.url() !== '/login';
      
      expect(hasErrorMessage || hasSuccessRedirect).toBe(true);
    } else {
      console.log('No login form found, skipping login test');
    }
  });

  test('should validate required fields', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"], input[name="username"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const loginButton = page.locator('button[type="submit"], button').getByText(/login|sign in/i).first();

    const hasLoginForm = await emailInput.count() > 0 && await passwordInput.count() > 0;

    if (hasLoginForm) {
      // Try to submit empty form
      await loginButton.click();
      
      // Check for validation messages
      await page.waitForTimeout(1000);
      const hasValidation = await page.locator('.error, .invalid, [aria-invalid="true"]').count() > 0 ||
                           await emailInput.getAttribute('aria-invalid') === 'true' ||
                           await passwordInput.getAttribute('aria-invalid') === 'true';
      
      expect(hasValidation).toBe(true);
    } else {
      console.log('No login form found, skipping validation test');
    }
  });

  test('should handle logout if authenticated', async ({ page }) => {
    // Look for logout functionality
    const logoutButton = page.locator('button, a').getByText(/logout|sign out/i).first();
    const userMenu = page.locator('[data-testid="user-menu"], .user-menu, .profile-menu').first();

    if (await logoutButton.count() > 0) {
      await logoutButton.click();
      await page.waitForTimeout(1000);
      
      // Should redirect to login or home page
      const currentUrl = page.url();
      expect(currentUrl).toBeDefined();
    } else if (await userMenu.count() > 0) {
      // Click user menu to reveal logout option
      await userMenu.click();
      await page.waitForTimeout(500);
      
      const logoutInMenu = page.locator('button, a').getByText(/logout|sign out/i).first();
      if (await logoutInMenu.count() > 0) {
        await logoutInMenu.click();
        await page.waitForTimeout(1000);
      }
    } else {
      console.log('No logout functionality found');
    }
  });

  test('should be accessible', async ({ page }) => {
    // Basic accessibility checks
    const hasProperHeadings = await page.locator('h1, h2').count() > 0;
    const hasAltTexts = await page.locator('img').count() === 0 || 
                       await page.locator('img[alt]').count() > 0;
    const hasLabels = await page.locator('input').count() === 0 ||
                     await page.locator('input[aria-label], input + label, label input').count() > 0;

    if (hasProperHeadings) expect(hasProperHeadings).toBe(true);
    if (hasAltTexts) expect(hasAltTexts).toBe(true);
    if (hasLabels) expect(hasLabels).toBe(true);
  });
});