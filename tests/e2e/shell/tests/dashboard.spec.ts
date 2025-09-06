import { test, expect, AuthHelpers } from '../fixtures/auth';

test.describe('Dashboard', () => {
  test('should display dashboard for authenticated user', async ({ page, authenticatedUser }) => {
    await page.goto('/');
    
    // Check main dashboard elements
    await expect(page.locator('h2')).toContainText('Good');
    await expect(page.locator('[data-testid="dashboard-stats"]')).toBeVisible();
    await expect(page.locator('[data-testid="quick-actions"]')).toBeVisible();
    await expect(page.locator('[data-testid="recent-activity"]')).toBeVisible();
  });

  test('should display user greeting with correct name', async ({ page, authenticatedUser }) => {
    await page.goto('/');
    
    // Should display greeting with user's name
    await expect(page.locator('h2')).toContainText(authenticatedUser.firstName);
  });

  test('should display stat cards', async ({ page, authenticatedUser }) => {
    await page.goto('/');
    
    // Check for stat cards
    await expect(page.locator('[data-testid="stat-active-plugins"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-total-users"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-system-health"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-storage-used"]')).toBeVisible();
  });

  test('should display quick actions', async ({ page, authenticatedUser }) => {
    await page.goto('/');
    
    // Check for quick action buttons
    await expect(page.locator('[data-testid="action-install-plugin"]')).toBeVisible();
    await expect(page.locator('[data-testid="action-view-analytics"]')).toBeVisible();
    await expect(page.locator('[data-testid="action-manage-users"]')).toBeVisible();
    await expect(page.locator('[data-testid="action-system-settings"]')).toBeVisible();
  });

  test('should navigate to plugins when clicking install plugin action', async ({ page, authenticatedUser }) => {
    await page.goto('/');
    
    await page.click('[data-testid="action-install-plugin"]');
    
    await expect(page).toHaveURL('/plugins/marketplace');
  });

  test('should navigate to analytics when clicking view analytics action', async ({ page, authenticatedUser }) => {
    await page.goto('/');
    
    await page.click('[data-testid="action-view-analytics"]');
    
    await expect(page).toHaveURL('/analytics');
  });

  test('should navigate to users when clicking manage users action', async ({ page, authenticatedUser }) => {
    await page.goto('/');
    
    await page.click('[data-testid="action-manage-users"]');
    
    await expect(page).toHaveURL('/users');
  });

  test('should navigate to settings when clicking system settings action', async ({ page, authenticatedUser }) => {
    await page.goto('/');
    
    await page.click('[data-testid="action-system-settings"]');
    
    await expect(page).toHaveURL('/settings');
  });

  test('should display recent activities', async ({ page, authenticatedUser }) => {
    await page.goto('/');
    
    const recentActivity = page.locator('[data-testid="recent-activity"]');
    await expect(recentActivity).toBeVisible();
    
    // Check for activity items
    await expect(recentActivity.locator('[data-testid="activity-item"]').first()).toBeVisible();
  });

  test('should refresh dashboard when refresh button is clicked', async ({ page, authenticatedUser }) => {
    await page.goto('/');
    
    // Click refresh button
    await page.click('[data-testid="refresh-button"]');
    
    // The page should be refreshed (we can check by waiting for a re-render)
    await expect(page.locator('h2')).toContainText('Good');
  });

  test('should display plugin widgets when plugins are active', async ({ page, authenticatedUser }) => {
    // Mock active plugins
    await page.addInitScript(() => {
      localStorage.setItem('shell-plugins', JSON.stringify({
        activePlugins: ['test-plugin'],
        installedPlugins: [{
          id: 'test-plugin',
          name: 'Test Plugin',
          status: 'active',
        }],
      }));
    });

    await page.goto('/');
    
    // Check for plugin widgets section
    await expect(page.locator('[data-testid="dashboard-widgets"]')).toBeVisible();
  });

  test('should show empty state when no plugins are active', async ({ page, authenticatedUser }) => {
    await page.goto('/');
    
    // Should show empty state for plugins
    await expect(page.locator('text=No active plugins')).toBeVisible();
    await expect(page.locator('[data-testid="browse-plugins-button"]')).toBeVisible();
  });

  test('should navigate to plugin marketplace from empty state', async ({ page, authenticatedUser }) => {
    await page.goto('/');
    
    // Click browse plugins button
    await page.click('[data-testid="browse-plugins-button"]');
    
    await expect(page).toHaveURL('/plugins/marketplace');
  });

  test('should display correct time-based greeting', async ({ page, authenticatedUser }) => {
    // Mock different times of day
    const mockTime = (hour: number) => {
      return page.addInitScript((mockHour) => {
        const originalDate = Date;
        // @ts-ignore
        Date = class extends originalDate {
          constructor() {
            super();
            this.getHours = () => mockHour;
          }
          static now() {
            return originalDate.now();
          }
        };
      }, hour);
    };

    // Test morning greeting
    await mockTime(9);
    await page.goto('/');
    await expect(page.locator('h2')).toContainText('Good morning');

    // Test afternoon greeting  
    await mockTime(14);
    await page.reload();
    await expect(page.locator('h2')).toContainText('Good afternoon');

    // Test evening greeting
    await mockTime(19);
    await page.reload();
    await expect(page.locator('h2')).toContainText('Good evening');
  });

  test('should be responsive on mobile', async ({ page, authenticatedUser }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    
    // Dashboard should still be visible and functional on mobile
    await expect(page.locator('h2')).toBeVisible();
    await expect(page.locator('[data-testid="dashboard-stats"]')).toBeVisible();
  });
});