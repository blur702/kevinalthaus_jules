import { test, expect } from '../fixtures/auth';

test.describe('Navigation', () => {
  test('should display header navigation', async ({ page, authenticatedUser }) => {
    await page.goto('/');
    
    // Check header elements
    await expect(page.locator('[data-testid="header"]')).toBeVisible();
    await expect(page.locator('[data-testid="logo"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-menu-button"]')).toBeVisible();
  });

  test('should display sidebar navigation', async ({ page, authenticatedUser }) => {
    await page.goto('/');
    
    // Check sidebar elements
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-plugins"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-settings"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-profile"]')).toBeVisible();
  });

  test('should navigate to dashboard', async ({ page, authenticatedUser }) => {
    await page.goto('/plugins');
    
    await page.click('[data-testid="nav-dashboard"]');
    
    await expect(page).toHaveURL('/');
  });

  test('should navigate to plugins', async ({ page, authenticatedUser }) => {
    await page.goto('/');
    
    await page.click('[data-testid="nav-plugins"]');
    
    await expect(page).toHaveURL('/plugins');
  });

  test('should navigate to profile', async ({ page, authenticatedUser }) => {
    await page.goto('/');
    
    await page.click('[data-testid="nav-profile"]');
    
    await expect(page).toHaveURL('/profile');
  });

  test('should navigate to settings', async ({ page, authenticatedUser }) => {
    await page.goto('/');
    
    await page.click('[data-testid="nav-settings"]');
    
    await expect(page).toHaveURL('/settings');
  });

  test('should highlight active navigation item', async ({ page, authenticatedUser }) => {
    await page.goto('/plugins');
    
    // Plugins nav item should be highlighted
    await expect(page.locator('[data-testid="nav-plugins"]')).toHaveClass(/text-primary/);
  });

  test('should toggle mobile menu', async ({ page, authenticatedUser }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    
    // Mobile menu button should be visible
    await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();
    
    // Sidebar should be hidden initially
    await expect(page.locator('[data-testid="sidebar"]')).not.toBeVisible();
    
    // Click mobile menu toggle
    await page.click('[data-testid="mobile-menu-toggle"]');
    
    // Sidebar should be visible
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    
    // Click outside to close
    await page.click('[data-testid="mobile-menu-overlay"]');
    
    // Sidebar should be hidden again
    await expect(page.locator('[data-testid="sidebar"]')).not.toBeVisible();
  });

  test('should display user menu dropdown', async ({ page, authenticatedUser }) => {
    await page.goto('/');
    
    // Click user menu button
    await page.click('[data-testid="user-menu-button"]');
    
    // User menu should be visible
    await expect(page.locator('[data-testid="user-menu-dropdown"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-menu-profile"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-menu-settings"]')).toBeVisible();
    await expect(page.locator('[data-testid="logout-button"]')).toBeVisible();
  });

  test('should navigate from user menu', async ({ page, authenticatedUser }) => {
    await page.goto('/');
    
    // Click user menu button
    await page.click('[data-testid="user-menu-button"]');
    
    // Click profile from user menu
    await page.click('[data-testid="user-menu-profile"]');
    
    await expect(page).toHaveURL('/profile');
  });

  test('should display theme toggle', async ({ page, authenticatedUser }) => {
    await page.goto('/');
    
    // Theme toggle should be visible
    await expect(page.locator('[data-testid="theme-toggle"]')).toBeVisible();
  });

  test('should toggle theme', async ({ page, authenticatedUser }) => {
    await page.goto('/');
    
    // Click theme toggle
    await page.click('[data-testid="theme-toggle"]');
    
    // Theme menu should be visible
    await expect(page.locator('[data-testid="theme-menu"]')).toBeVisible();
    
    // Click dark theme
    await page.click('[data-testid="theme-dark"]');
    
    // Body should have dark class
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('should search functionality work', async ({ page, authenticatedUser }) => {
    await page.goto('/');
    
    const searchInput = page.locator('[data-testid="search-input"]');
    
    // Type in search
    await searchInput.fill('plugins');
    
    // Search should be functional (results would depend on implementation)
    await expect(searchInput).toHaveValue('plugins');
  });

  test('should display notifications bell', async ({ page, authenticatedUser }) => {
    await page.goto('/');
    
    // Notifications bell should be visible
    await expect(page.locator('[data-testid="notifications-button"]')).toBeVisible();
  });

  test('should show notification badge when there are notifications', async ({ page, authenticatedUser }) => {
    // Mock notifications
    await page.addInitScript(() => {
      localStorage.setItem('shell-notifications', JSON.stringify([
        { id: '1', title: 'Test', message: 'Test notification', type: 'info' }
      ]));
    });

    await page.goto('/');
    
    // Notification badge should be visible
    await expect(page.locator('[data-testid="notification-badge"]')).toBeVisible();
  });

  test('should navigate using logo', async ({ page, authenticatedUser }) => {
    await page.goto('/plugins');
    
    await page.click('[data-testid="logo"]');
    
    await expect(page).toHaveURL('/');
  });

  test('should collapse sidebar when toggle is clicked', async ({ page, authenticatedUser }) => {
    await page.goto('/');
    
    // Check if sidebar is expanded
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    
    // Click collapse toggle if available (desktop)
    const collapseToggle = page.locator('[data-testid="sidebar-collapse-toggle"]');
    if (await collapseToggle.isVisible()) {
      await collapseToggle.click();
      
      // Sidebar should be collapsed
      await expect(page.locator('[data-testid="sidebar"]')).toHaveClass(/w-12/);
    }
  });

  test('should show plugin navigation items when plugins are installed', async ({ page, authenticatedUser }) => {
    // Mock installed plugins with menu items
    await page.addInitScript(() => {
      localStorage.setItem('shell-plugins', JSON.stringify({
        installedPlugins: [{
          id: 'test-plugin',
          name: 'Test Plugin',
          configuration: {
            menuItems: [{
              id: 'test-menu',
              label: 'Test Menu',
              path: '/plugin/test-plugin',
            }]
          }
        }]
      }));
    });

    await page.goto('/');
    
    // Plugin menu item should be visible
    await expect(page.locator('[data-testid="plugin-menu-test-menu"]')).toBeVisible();
  });
});