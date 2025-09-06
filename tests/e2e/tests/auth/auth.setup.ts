import { test as setup, expect } from '@playwright/test';
import { LoginPage } from '../../pages/auth/login-page';
import { TestData } from '../../fixtures/test-data';

const authFile = 'storage-states/user.json';
const adminAuthFile = 'storage-states/admin.json';

/**
 * Setup authentication state for tests
 * This runs before all other tests and creates authenticated sessions
 */
setup('authenticate regular user', async ({ page }) => {
  const loginPage = new LoginPage(page);
  
  // Navigate to login page
  await loginPage.goto();
  
  // Verify login page loads correctly
  expect(await loginPage.isPageLoaded()).toBe(true);
  
  // Login with test user credentials
  await loginPage.loginAsTestUser();
  
  // Verify successful login
  await page.waitForURL(url => !url.includes('/login'), { timeout: 15000 });
  expect(await loginPage.isUserLoggedIn()).toBe(true);
  
  // Save authenticated state
  await page.context().storageState({ path: authFile });
});

setup('authenticate admin user', async ({ page }) => {
  const loginPage = new LoginPage(page);
  
  // Navigate to login page
  await loginPage.goto();
  
  // Login with admin credentials
  await loginPage.loginAsAdmin();
  
  // Verify successful login and admin access
  await page.waitForURL(url => !url.includes('/login'), { timeout: 15000 });
  expect(await loginPage.isUserLoggedIn()).toBe(true);
  
  // Save admin authenticated state
  await page.context().storageState({ path: adminAuthFile });
});

/**
 * Setup test data and mock services
 */
setup('prepare test environment', async ({ page }) => {
  // Mock external services for consistent testing
  await page.route('**/api/auth/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    
    // Mock login endpoint
    if (url.includes('/login') && method === 'POST') {
      const postData = route.request().postDataJSON();
      
      if (postData.email === TestData.users.validUser.email) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(TestData.api.responses.success.login)
        });
      } else if (postData.email === TestData.users.adminUser.email) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...TestData.api.responses.success.login,
            user: { ...TestData.api.responses.success.login.user, isAdmin: true }
          })
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify(TestData.api.responses.errors.unauthorized)
        });
      }
      return;
    }
    
    // Mock register endpoint
    if (url.includes('/register') && method === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(TestData.api.responses.success.register)
      });
      return;
    }
    
    // Mock 2FA verification
    if (url.includes('/2fa/verify') && method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ verified: true })
      });
      return;
    }
    
    // Continue with original request for non-mocked endpoints
    await route.continue();
  });
  
  // Mock plugin API endpoints
  await page.route('**/api/plugins/**', async (route) => {
    const url = route.request().url();
    
    if (url.includes('/api/plugins') && route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(TestData.api.responses.success.plugins)
      });
    } else {
      await route.continue();
    }
  });
  
  // Setup console monitoring for all tests
  let consoleErrors: any[] = [];
  
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleErrors.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
        timestamp: Date.now()
      });
    }
  });
  
  page.on('pageerror', (error) => {
    consoleErrors.push({
      type: 'pageerror',
      text: error.message,
      stack: error.stack,
      timestamp: Date.now()
    });
  });
  
  // Make console errors available globally
  await page.addInitScript(() => {
    (window as any).__consoleErrors = [];
    (window as any).__addConsoleError = (error: any) => {
      (window as any).__consoleErrors.push(error);
    };
  });
});