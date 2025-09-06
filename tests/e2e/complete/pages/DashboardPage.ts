import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Dashboard Page Object Model
 * Handles all dashboard-related interactions and validations
 */
export class DashboardPage extends BasePage {
  // Selectors
  private readonly selectors = {
    dashboard: '[data-testid="dashboard"], main[role="main"], .dashboard',
    header: '[data-testid="dashboard-header"], .dashboard-header, h1',
    navigation: '[data-testid="nav"], nav, .navigation',
    userMenu: '[data-testid="user-menu"], .user-menu, [aria-label="User menu"]',
    logoutButton: 'button:has-text("Logout"), button:has-text("Sign Out"), [data-testid="logout"]',
    themeToggle: '[data-testid="theme-toggle"], button[aria-label*="theme"], .theme-toggle',
    
    // Dashboard widgets/cards
    widgets: '[data-testid="widget"], .widget, .dashboard-card',
    activityFeed: '[data-testid="activity"], .activity-feed',
    quickActions: '[data-testid="quick-actions"], .quick-actions',
    statsCards: '[data-testid="stats-card"], .stats-card, .metric-card',
    
    // Plugin areas
    pluginContainer: '[data-testid="plugin-container"], .plugin-container',
    pluginList: '[data-testid="plugin-list"], .plugin-list',
    
    // Search and filters
    searchInput: 'input[type="search"], input[placeholder*="Search"]',
    filterDropdown: '[data-testid="filter"], .filter-dropdown, select',
    
    // Loading states
    loadingSpinner: '[data-testid="loading"], .loading, .spinner',
    skeletonLoader: '.skeleton, [data-testid="skeleton"]',
    
    // Error states
    errorMessage: '[role="alert"], .error-message, [data-testid="error"]',
    emptyState: '[data-testid="empty-state"], .empty-state'
  };

  /**
   * Navigate to dashboard page
   */
  async navigate(): Promise<void> {
    await this.goto('/dashboard');
    await this.validate();
  }

  /**
   * Validate that we're on the dashboard page
   */
  async validate(): Promise<void> {
    // Wait for dashboard container
    await this.waitForElement(this.selectors.dashboard, 15000);
    
    // Verify URL
    const url = this.getCurrentUrl();
    expect(url).toMatch(/dashboard|home/i);
    
    // Verify essential dashboard elements
    const header = this.page.locator(this.selectors.header);
    const navigation = this.page.locator(this.selectors.navigation);
    
    await expect(header.or(this.page.locator('h1'))).toBeVisible();
    
    // Check for user authentication indicators
    const userMenu = this.page.locator(this.selectors.userMenu);
    if (await userMenu.count() > 0) {
      await expect(userMenu.first()).toBeVisible();
    }
  }

  /**
   * Wait for dashboard to fully load
   */
  async waitForDashboardLoad(): Promise<void> {
    // Wait for loading indicators to disappear
    const loadingSpinner = this.page.locator(this.selectors.loadingSpinner);
    if (await loadingSpinner.count() > 0) {
      await expect(loadingSpinner.first()).not.toBeVisible({ timeout: 10000 });
    }

    // Wait for skeleton loaders to disappear
    const skeletonLoader = this.page.locator(this.selectors.skeletonLoader);
    if (await skeletonLoader.count() > 0) {
      await expect(skeletonLoader.first()).not.toBeVisible({ timeout: 10000 });
    }

    // Wait for actual content to appear
    await this.waitForPageLoad();
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<Record<string, string>[]> {
    const statsCards = this.page.locator(this.selectors.statsCards);
    const count = await statsCards.count();
    const stats = [];

    for (let i = 0; i < count; i++) {
      const card = statsCards.nth(i);
      const title = await card.locator('h2, h3, .title, [data-testid="stat-title"]').textContent() || '';
      const value = await card.locator('.value, [data-testid="stat-value"], .number').textContent() || '';
      
      stats.push({ title, value });
    }

    return stats;
  }

  /**
   * Check if user is properly authenticated
   */
  async verifyUserAuthentication(): Promise<void> {
    // Look for user information
    const userMenu = this.page.locator(this.selectors.userMenu);
    
    if (await userMenu.count() > 0) {
      await expect(userMenu.first()).toBeVisible();
      
      // Try to get user info
      const userInfo = await userMenu.first().textContent();
      expect(userInfo).toBeTruthy();
      console.log('✅ User authenticated:', userInfo);
    }
    
    // Verify no login redirects occur
    await this.page.waitForTimeout(2000);
    const url = this.getCurrentUrl();
    expect(url).not.toMatch(/login|auth/i);
  }

  /**
   * Toggle user menu
   */
  async toggleUserMenu(): Promise<void> {
    await this.clickElement(this.selectors.userMenu);
    
    // Wait for dropdown to appear
    await this.page.waitForSelector('[role="menu"], .dropdown-menu, [data-testid="user-dropdown"]', 
      { timeout: 5000 });
  }

  /**
   * Logout from dashboard
   */
  async logout(): Promise<void> {
    await this.toggleUserMenu();
    await this.clickElement(this.selectors.logoutButton);
    
    // Wait for logout to complete
    await this.page.waitForURL(/login|auth|^\/$/, { timeout: 10000 });
  }

  /**
   * Toggle theme
   */
  async toggleTheme(): Promise<string> {
    const currentTheme = await this.checkTheme('dark') ? 'dark' : 'light';
    
    const themeToggle = this.page.locator(this.selectors.themeToggle);
    if (await themeToggle.count() > 0) {
      await themeToggle.first().click();
      
      // Wait for theme change
      await this.page.waitForTimeout(500);
    }
    
    const newTheme = await this.checkTheme('dark') ? 'dark' : 'light';
    return newTheme;
  }

  /**
   * Search dashboard content
   */
  async searchDashboard(query: string): Promise<void> {
    const searchInput = this.page.locator(this.selectors.searchInput);
    
    if (await searchInput.count() > 0) {
      await searchInput.first().fill(query);
      await this.page.keyboard.press('Enter');
      
      // Wait for search results
      await this.page.waitForTimeout(1000);
    }
  }

  /**
   * Get activity feed items
   */
  async getActivityFeedItems(): Promise<string[]> {
    const activityFeed = this.page.locator(this.selectors.activityFeed);
    
    if (await activityFeed.count() === 0) {
      return [];
    }

    const items = await activityFeed.locator('.activity-item, .feed-item, li').all();
    const activities = [];

    for (const item of items) {
      const text = await item.textContent();
      if (text) activities.push(text.trim());
    }

    return activities;
  }

  /**
   * Interact with widgets
   */
  async interactWithWidgets(): Promise<void> {
    const widgets = this.page.locator(this.selectors.widgets);
    const widgetCount = await widgets.count();

    console.log(`Found ${widgetCount} widgets on dashboard`);

    // Test first few widgets
    for (let i = 0; i < Math.min(widgetCount, 3); i++) {
      const widget = widgets.nth(i);
      
      // Try to identify interactive elements in widget
      const buttons = await widget.locator('button').count();
      const links = await widget.locator('a').count();
      
      if (buttons > 0) {
        try {
          await widget.locator('button').first().click();
          await this.page.waitForTimeout(1000);
          console.log(`✅ Widget ${i + 1} button interaction successful`);
        } catch (error) {
          console.log(`⚠️ Widget ${i + 1} button interaction failed:`, error.message);
        }
      }
    }
  }

  /**
   * Test quick actions
   */
  async testQuickActions(): Promise<void> {
    const quickActions = this.page.locator(this.selectors.quickActions);
    
    if (await quickActions.count() === 0) {
      console.log('No quick actions found');
      return;
    }

    const actionButtons = await quickActions.locator('button, a').all();
    
    for (let i = 0; i < Math.min(actionButtons.length, 3); i++) {
      const button = actionButtons[i];
      const text = await button.textContent();
      
      try {
        await button.click();
        await this.page.waitForTimeout(500);
        console.log(`✅ Quick action "${text}" executed successfully`);
        
        // Navigate back if needed
        if (this.getCurrentUrl() !== '/dashboard') {
          await this.page.goBack();
          await this.waitForDashboardLoad();
        }
      } catch (error) {
        console.log(`⚠️ Quick action "${text}" failed:`, error.message);
      }
    }
  }

  /**
   * Check for plugins loaded on dashboard
   */
  async checkPluginsLoaded(): Promise<string[]> {
    const pluginContainer = this.page.locator(this.selectors.pluginContainer);
    const pluginList = this.page.locator(this.selectors.pluginList);
    
    const loadedPlugins = [];

    // Check for plugin containers
    if (await pluginContainer.count() > 0) {
      const plugins = await pluginContainer.locator('[data-plugin-id], .plugin').all();
      
      for (const plugin of plugins) {
        const pluginId = await plugin.getAttribute('data-plugin-id') || 
                        await plugin.getAttribute('data-plugin-name') ||
                        await plugin.textContent();
        
        if (pluginId) {
          loadedPlugins.push(pluginId.trim());
        }
      }
    }

    return loadedPlugins;
  }

  /**
   * Test real-time updates (if applicable)
   */
  async testRealTimeUpdates(): Promise<void> {
    // Monitor for WebSocket connections or SSE
    let hasRealTimeConnection = false;

    this.page.on('websocket', ws => {
      hasRealTimeConnection = true;
      console.log('✅ WebSocket connection detected');
    });

    // Monitor for EventSource connections
    this.page.on('request', request => {
      if (request.headers()['accept'] === 'text/event-stream') {
        hasRealTimeConnection = true;
        console.log('✅ Server-Sent Events connection detected');
      }
    });

    // Wait a bit for connections to establish
    await this.page.waitForTimeout(3000);

    if (hasRealTimeConnection) {
      console.log('✅ Real-time updates capability detected');
    } else {
      console.log('ℹ️ No real-time updates detected (may be polling-based)');
    }
  }

  /**
   * Test responsive behavior
   */
  async testResponsiveDesign(): Promise<void> {
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 }
    ];

    for (const viewport of viewports) {
      await this.page.setViewportSize(viewport);
      await this.waitForDashboardLoad();
      
      // Check if navigation collapses on mobile
      if (viewport.name === 'mobile') {
        const nav = this.page.locator(this.selectors.navigation);
        const mobileNav = this.page.locator('.mobile-nav, [data-testid="mobile-nav"]');
        
        if (await mobileNav.count() > 0) {
          console.log('✅ Mobile navigation detected');
        }
      }
      
      // Check if widgets stack properly
      const widgets = this.page.locator(this.selectors.widgets);
      if (await widgets.count() > 0) {
        const firstWidget = widgets.first();
        const boundingBox = await firstWidget.boundingBox();
        
        if (boundingBox) {
          console.log(`${viewport.name}: Widget width ${boundingBox.width}px`);
        }
      }
      
      // Take screenshot
      await this.takeScreenshot(`dashboard-${viewport.name}`);
    }
  }

  /**
   * Verify dashboard performance metrics
   */
  async checkPerformance(): Promise<any> {
    const performanceMetrics = await this.page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      return {
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
        firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime,
        firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime
      };
    });

    console.log('Dashboard Performance Metrics:', performanceMetrics);
    
    // Assert performance benchmarks
    expect(performanceMetrics.domContentLoaded).toBeLessThan(3000); // 3 second max
    
    return performanceMetrics;
  }

  /**
   * Check for error states
   */
  async checkForErrors(): Promise<string[]> {
    const errors = [];

    // Check for error messages on page
    const errorMessages = this.page.locator(this.selectors.errorMessage);
    const errorCount = await errorMessages.count();

    for (let i = 0; i < errorCount; i++) {
      const errorText = await errorMessages.nth(i).textContent();
      if (errorText) errors.push(errorText.trim());
    }

    // Check console errors
    const consoleErrors = await this.checkConsoleErrors();
    errors.push(...consoleErrors);

    return errors;
  }
}