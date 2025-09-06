import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base-page';

export class DashboardPage extends BasePage {
  // Page URL
  private readonly url = '/dashboard';

  // Main layout selectors
  private get sidebar() { return this.page.locator('[data-testid="sidebar"], .sidebar, nav[role="navigation"]'); }
  private get mainContent() { return this.page.locator('[data-testid="main-content"], .main-content, main'); }
  private get topBar() { return this.page.locator('[data-testid="top-bar"], .top-bar, .app-bar'); }
  
  // Navigation elements
  private get dashboardNavItem() { return this.page.locator('[data-testid="nav-dashboard"], .nav-dashboard'); }
  private get pluginsNavItem() { return this.page.locator('[data-testid="nav-plugins"], .nav-plugins'); }
  private get settingsNavItem() { return this.page.locator('[data-testid="nav-settings"], .nav-settings'); }
  private get profileNavItem() { return this.page.locator('[data-testid="nav-profile"], .nav-profile'); }
  
  // Dashboard widgets/cards
  private get welcomeCard() { return this.page.locator('[data-testid="welcome-card"], .welcome-card'); }
  private get statsCards() { return this.page.locator('[data-testid="stats-card"], .stats-card'); }
  private get recentActivityCard() { return this.page.locator('[data-testid="recent-activity"], .recent-activity'); }
  private get quickActionsCard() { return this.page.locator('[data-testid="quick-actions"], .quick-actions'); }
  
  // Interactive elements
  private get sidebarToggle() { return this.page.locator('[data-testid="sidebar-toggle"], .sidebar-toggle, .menu-toggle'); }
  private get searchInput() { return this.page.locator('[data-testid="search"], .search-input, input[type="search"]'); }
  private get notificationsButton() { return this.page.locator('[data-testid="notifications"], .notifications-button'); }
  private get profileDropdown() { return this.page.locator('[data-testid="profile-dropdown"], .profile-dropdown'); }
  
  // Loading states
  private get dashboardSkeleton() { return this.page.locator('[data-testid="dashboard-skeleton"], .skeleton'); }
  private get loadingCards() { return this.page.locator('.loading-card, .card-skeleton'); }

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to dashboard page
   */
  async goto(options?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }) {
    await this.page.goto(this.url, options);
    await this.waitForDashboardLoad();
  }

  /**
   * Wait for dashboard to fully load with all widgets
   */
  async waitForDashboardLoad(timeout = 30000) {
    // Wait for skeleton/loading states to disappear
    await this.dashboardSkeleton.waitFor({ state: 'hidden', timeout }).catch(() => {});
    await this.loadingCards.waitFor({ state: 'hidden', timeout }).catch(() => {});
    
    // Wait for main content areas to be visible
    await this.mainContent.waitFor({ state: 'visible', timeout });
    await this.sidebar.waitFor({ state: 'visible', timeout });
    
    // Wait for core dashboard elements
    await this.welcomeCard.waitFor({ state: 'visible', timeout }).catch(() => {});
    
    await this.waitForPageReady(timeout);
  }

  /**
   * Check if dashboard is fully loaded
   */
  async isDashboardLoaded(): Promise<boolean> {
    try {
      await this.waitForDashboardLoad(5000);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get dashboard statistics/metrics
   */
  async getDashboardStats() {
    const statsCards = await this.statsCards.all();
    const stats = [];
    
    for (const card of statsCards) {
      const title = await card.locator('.stat-title, .card-title, h3, h4').textContent();
      const value = await card.locator('.stat-value, .card-value, .metric-value').textContent();
      const change = await card.locator('.stat-change, .change-indicator').textContent().catch(() => null);
      
      stats.push({
        title: title?.trim(),
        value: value?.trim(),
        change: change?.trim()
      });
    }
    
    return stats;
  }

  /**
   * Navigate using sidebar navigation
   */
  async navigateToSection(section: 'dashboard' | 'plugins' | 'settings' | 'profile') {
    const navItems = {
      dashboard: this.dashboardNavItem,
      plugins: this.pluginsNavItem,
      settings: this.settingsNavItem,
      profile: this.profileNavItem
    };
    
    const navItem = navItems[section];
    if (!navItem) {
      throw new Error(`Unknown section: ${section}`);
    }
    
    await navItem.click();
    
    // Wait for navigation to complete
    await this.page.waitForURL(url => url.includes(`/${section}`), { timeout: 10000 });
    await this.waitForPageReady();
  }

  /**
   * Toggle sidebar visibility
   */
  async toggleSidebar() {
    const sidebarVisibleBefore = await this.sidebar.isVisible();
    
    await this.sidebarToggle.click();
    
    // Wait for animation to complete
    await this.page.waitForTimeout(300);
    
    const sidebarVisibleAfter = await this.sidebar.isVisible();
    
    return {
      wasVisible: sidebarVisibleBefore,
      isVisible: sidebarVisibleAfter,
      toggled: sidebarVisibleBefore !== sidebarVisibleAfter
    };
  }

  /**
   * Check if sidebar is collapsed/expanded
   */
  async isSidebarExpanded(): Promise<boolean> {
    const sidebar = await this.sidebar;
    const classList = await sidebar.getAttribute('class') || '';
    
    // Check for common collapse classes
    return !classList.includes('collapsed') && 
           !classList.includes('minimized') && 
           await sidebar.isVisible();
  }

  /**
   * Perform search from dashboard
   */
  async search(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    
    // Wait for search results or navigation
    await this.page.waitForResponse(response => 
      response.url().includes('/search') || response.url().includes('/api/search')
    ).catch(() => {});
    
    await this.waitForPageReady();
  }

  /**
   * Open notifications panel
   */
  async openNotifications() {
    await this.notificationsButton.click();
    
    const notificationsPanel = this.page.locator('[data-testid="notifications-panel"], .notifications-panel');
    await notificationsPanel.waitFor({ state: 'visible', timeout: 5000 });
    
    return notificationsPanel;
  }

  /**
   * Get notification count
   */
  async getNotificationCount(): Promise<number> {
    const badge = this.page.locator('[data-testid="notification-badge"], .notification-badge, .badge');
    
    try {
      const countText = await badge.textContent({ timeout: 2000 });
      return parseInt(countText?.trim() || '0') || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Open profile dropdown
   */
  async openProfileMenu() {
    await this.profileDropdown.click();
    
    const profileMenu = this.page.locator('[data-testid="profile-menu"], .profile-menu');
    await profileMenu.waitFor({ state: 'visible', timeout: 5000 });
    
    return profileMenu;
  }

  /**
   * Get recent activity items
   */
  async getRecentActivity() {
    const activityItems = await this.recentActivityCard.locator('.activity-item, .list-item').all();
    const activities = [];
    
    for (const item of activityItems) {
      const title = await item.locator('.activity-title, .title').textContent();
      const description = await item.locator('.activity-description, .description').textContent();
      const timestamp = await item.locator('.activity-time, .timestamp, time').textContent();
      
      activities.push({
        title: title?.trim(),
        description: description?.trim(),
        timestamp: timestamp?.trim()
      });
    }
    
    return activities;
  }

  /**
   * Get available quick actions
   */
  async getQuickActions() {
    const actionButtons = await this.quickActionsCard.locator('button, .action-button').all();
    const actions = [];
    
    for (const button of actionButtons) {
      const text = await button.textContent();
      const enabled = await button.isEnabled();
      
      actions.push({
        text: text?.trim(),
        enabled
      });
    }
    
    return actions;
  }

  /**
   * Execute a quick action
   */
  async executeQuickAction(actionText: string) {
    const actionButton = this.quickActionsCard.locator('button', { hasText: actionText });
    await actionButton.click();
    
    // Wait for any resulting navigation or modal
    await this.page.waitForTimeout(1000);
  }

  /**
   * Verify dashboard layout elements
   */
  async verifyDashboardLayout() {
    const elements = [
      { selector: '[data-testid="sidebar"]', name: 'Sidebar' },
      { selector: '[data-testid="main-content"]', name: 'Main Content' },
      { selector: '[data-testid="top-bar"]', name: 'Top Bar' },
      { selector: '[data-testid="welcome-card"]', name: 'Welcome Card' }
    ];
    
    return await this.verifyPageElements(elements);
  }

  /**
   * Test dashboard responsiveness
   */
  async testResponsiveDashboard() {
    const viewports = [
      { width: 320, height: 568, name: 'Mobile Small' },
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1024, height: 768, name: 'Tablet Landscape' },
      { width: 1440, height: 900, name: 'Desktop' },
      { width: 1920, height: 1080, name: 'Large Desktop' }
    ];
    
    const results = [];
    
    for (const viewport of viewports) {
      await this.page.setViewportSize({ width: viewport.width, height: viewport.height });
      await this.waitForDashboardLoad();
      
      const sidebarVisible = await this.sidebar.isVisible();
      const mainContentVisible = await this.mainContent.isVisible();
      const topBarVisible = await this.topBar.isVisible();
      
      // Check if layout adapts correctly
      const isMobile = viewport.width < 768;
      const expectedSidebarBehavior = isMobile ? 'hidden or collapsible' : 'visible';
      
      results.push({
        viewport: viewport.name,
        size: `${viewport.width}x${viewport.height}`,
        sidebarVisible,
        mainContentVisible,
        topBarVisible,
        responsive: mainContentVisible && topBarVisible,
        expectedSidebarBehavior
      });
      
      // Take screenshot for visual verification
      await this.takeScreenshot(`dashboard-${viewport.name.toLowerCase().replace(' ', '-')}`);
    }
    
    return results;
  }

  /**
   * Test dashboard performance metrics
   */
  async testDashboardPerformance() {
    const startTime = Date.now();
    
    await this.goto();
    
    const loadTime = Date.now() - startTime;
    const performanceMetrics = await this.getPerformanceMetrics();
    const memoryUsage = await this.getMemoryUsage();
    
    return {
      pageLoadTime: loadTime,
      performanceMetrics,
      memoryUsage,
      resourceCount: performanceMetrics.resourceCount
    };
  }

  /**
   * Test dashboard widgets loading
   */
  async testWidgetLoading() {
    await this.goto();
    
    const widgets = {
      welcome: await this.welcomeCard.isVisible(),
      stats: (await this.statsCards.count()) > 0,
      recentActivity: await this.recentActivityCard.isVisible(),
      quickActions: await this.quickActionsCard.isVisible()
    };
    
    return widgets;
  }

  /**
   * Test navigation between dashboard sections
   */
  async testNavigation() {
    const sections = ['plugins', 'settings', 'profile', 'dashboard'] as const;
    const navigationResults = [];
    
    for (const section of sections) {
      const startUrl = this.page.url();
      await this.navigateToSection(section);
      
      const endUrl = this.page.url();
      const navigationSuccessful = endUrl.includes(`/${section}`) || section === 'dashboard';
      
      navigationResults.push({
        section,
        startUrl,
        endUrl,
        successful: navigationSuccessful
      });
    }
    
    return navigationResults;
  }

  /**
   * Test error handling when widgets fail to load
   */
  async testErrorHandling() {
    // Mock API failures
    await this.mockAPI(/\/api\/dashboard\/stats/, { error: 'Service unavailable' }, 503);
    await this.mockAPI(/\/api\/dashboard\/activity/, { error: 'Not found' }, 404);
    
    await this.goto();
    
    // Check for error states in widgets
    const errorStates = {
      statsError: await this.page.locator('.error-state, .error-message').count() > 0,
      hasErrorBoundary: await this.page.locator('[data-testid="error-boundary"]').isVisible().catch(() => false),
      showsGracefulDegradation: await this.page.locator('.fallback-content, .placeholder').count() > 0
    };
    
    return errorStates;
  }

  /**
   * Test offline functionality
   */
  async testOfflineDashboard() {
    // First load dashboard with network
    await this.goto();
    
    // Then simulate offline
    await this.simulateNetworkCondition('offline');
    
    // Reload or navigate
    await this.page.reload();
    
    const offlineState = {
      showsOfflineIndicator: await this.page.locator('.offline-indicator, .connection-status').isVisible(),
      hasCachedContent: await this.mainContent.isVisible(),
      showsOfflineMessage: await this.page.locator('text=/offline|no connection/i').isVisible()
    };
    
    // Restore network
    await this.simulateNetworkCondition('fast');
    
    return offlineState;
  }

  /**
   * Test dashboard real-time updates
   */
  async testRealTimeUpdates() {
    await this.goto();
    
    // Get initial stats
    const initialStats = await this.getDashboardStats();
    
    // Simulate data update via WebSocket or polling
    await this.mockAPI(/\/api\/dashboard\/stats/, {
      stats: [
        { title: 'Total Users', value: '1,234', change: '+5.2%' },
        { title: 'Active Sessions', value: '567', change: '+12.1%' }
      ]
    });
    
    // Wait for potential update
    await this.page.waitForTimeout(2000);
    
    const updatedStats = await this.getDashboardStats();
    
    return {
      initialStats,
      updatedStats,
      hasRealTimeUpdates: JSON.stringify(initialStats) !== JSON.stringify(updatedStats)
    };
  }

  /**
   * Test dashboard accessibility
   */
  async testDashboardAccessibility() {
    await this.goto();
    
    // Test keyboard navigation
    await this.page.keyboard.press('Tab');
    const firstFocusable = await this.page.locator(':focus').textContent();
    
    // Test ARIA labels and roles
    const hasProperARIA = {
      navigation: await this.sidebar.getAttribute('role') === 'navigation',
      main: await this.mainContent.getAttribute('role') === 'main',
      searchLabel: await this.searchInput.getAttribute('aria-label') !== null
    };
    
    // Run full accessibility check
    const a11yResults = await this.checkAccessibility();
    
    return {
      keyboardNavigation: !!firstFocusable,
      ariaLabels: hasProperARIA,
      accessibilityViolations: a11yResults.violations.length,
      accessibilityResults: a11yResults
    };
  }

  /**
   * Test dashboard customization (if available)
   */
  async testDashboardCustomization() {
    await this.goto();
    
    // Look for customization features
    const customizationFeatures = {
      hasWidgetToggle: await this.page.locator('.widget-toggle, .customize-button').isVisible(),
      hasLayoutOptions: await this.page.locator('.layout-options, .grid-options').isVisible(),
      hasDragDrop: await this.page.locator('.draggable, [draggable="true"]').count() > 0
    };
    
    return customizationFeatures;
  }
}