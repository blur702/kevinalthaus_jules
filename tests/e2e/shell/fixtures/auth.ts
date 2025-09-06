import { test as base, expect } from '@playwright/test';

// Test user data
export const TEST_USERS = {
  admin: {
    email: 'admin@shell-platform.com',
    password: 'admin123',
    username: 'admin',
    firstName: 'Admin',
    lastName: 'User',
    roles: ['admin'],
    permissions: ['*'],
  },
  user: {
    email: 'user@shell-platform.com',
    password: 'user123',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    roles: ['user'],
    permissions: ['dashboard.read', 'plugins.read'],
  },
  developer: {
    email: 'dev@shell-platform.com',
    password: 'dev123',
    username: 'developer',
    firstName: 'Developer',
    lastName: 'User',
    roles: ['developer'],
    permissions: ['dashboard.read', 'plugins.*', 'analytics.read'],
  },
};

// Auth fixtures
type AuthFixtures = {
  authenticatedUser: any;
  adminUser: any;
  developerUser: any;
};

export const test = base.extend<AuthFixtures>({
  // Regular authenticated user
  authenticatedUser: async ({ page }, use) => {
    // Set up authenticated state
    await page.addInitScript((user) => {
      localStorage.setItem('shell-auth', JSON.stringify({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user,
      }));
    }, TEST_USERS.user);

    await use(TEST_USERS.user);
  },

  // Admin user
  adminUser: async ({ page }, use) => {
    await page.addInitScript((user) => {
      localStorage.setItem('shell-auth', JSON.stringify({
        accessToken: 'mock-admin-token',
        refreshToken: 'mock-admin-refresh-token',
        user,
      }));
    }, TEST_USERS.admin);

    await use(TEST_USERS.admin);
  },

  // Developer user
  developerUser: async ({ page }, use) => {
    await page.addInitScript((user) => {
      localStorage.setItem('shell-auth', JSON.stringify({
        accessToken: 'mock-dev-token',
        refreshToken: 'mock-dev-refresh-token',
        user,
      }));
    }, TEST_USERS.developer);

    await use(TEST_USERS.developer);
  },
});

// Helper functions for authentication
export class AuthHelpers {
  constructor(private page: any) {}

  async login(email: string, password: string) {
    await this.page.goto('/login');
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="login-button"]');
    
    // Wait for successful login (redirect to dashboard)
    await expect(this.page).toHaveURL('/');
  }

  async logout() {
    // Click on user menu
    await this.page.click('[data-testid="user-menu-button"]');
    
    // Click logout
    await this.page.click('[data-testid="logout-button"]');
    
    // Verify redirect to login page
    await expect(this.page).toHaveURL('/login');
  }

  async isLoggedIn() {
    try {
      // Check if user menu is present (indicates logged in state)
      await this.page.waitForSelector('[data-testid="user-menu-button"]', { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  async ensureLoggedOut() {
    if (await this.isLoggedIn()) {
      await this.logout();
    }
  }

  async setupMockAuth(user: any) {
    await this.page.addInitScript((userData) => {
      localStorage.setItem('shell-auth', JSON.stringify({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: userData,
      }));
    }, user);
  }

  async clearAuth() {
    await this.page.evaluate(() => {
      localStorage.removeItem('shell-auth');
      sessionStorage.clear();
    });
  }
}

export { expect };