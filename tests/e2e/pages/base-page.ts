import { Page, Locator, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

/**
 * Base page class with common functionality for all pages
 */
export abstract class BasePage {
  protected helpers: TestHelpers;

  constructor(public page: Page) {
    this.helpers = new TestHelpers(page);
  }

  // Common selectors
  protected get loadingSpinner() { return this.page.locator('[data-testid="loading-spinner"], .loading, .spinner'); }
  protected get errorMessage() { return this.page.locator('[data-testid="error-message"], .error-message, [role="alert"]'); }
  protected get successMessage() { return this.page.locator('[data-testid="success-message"], .success-message, .alert-success'); }
  protected get notificationToast() { return this.page.locator('.toast, .snackbar, [data-testid="notification"]'); }

  // Header elements (common across pages)
  protected get header() { return this.page.locator('header, [data-testid="header"]'); }
  protected get logo() { return this.page.locator('[data-testid="logo"], .logo'); }
  protected get userMenu() { return this.page.locator('[data-testid="user-menu"], .user-menu'); }
  protected get themeToggle() { return this.page.locator('[data-testid="theme-toggle"], .theme-toggle'); }
  protected get navigationMenu() { return this.page.locator('[data-testid="nav-menu"], nav'); }

  // Footer elements
  protected get footer() { return this.page.locator('footer, [data-testid="footer"]'); }

  /**
   * Navigate to this page
   */
  abstract goto(options?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }): Promise<void>;

  /**
   * Wait for page to be ready
   */
  async waitForPageReady(timeout = 30000) {
    // Wait for loading spinner to disappear
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout }).catch(() => {});
    
    // Wait for page load
    await this.helpers.waitForPageLoad(timeout);
    
    // Wait for any animations to complete
    await this.helpers.waitForAnimations();
  }

  /**
   * Check if page is loaded correctly
   */
  async isPageLoaded(): Promise<boolean> {
    try {
      await this.waitForPageReady(5000);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Check for console errors
   */
  async getConsoleErrors(): Promise<any[]> {
    return new Promise((resolve) => {
      const errors: any[] = [];
      const cleanup = this.helpers.monitorConsole((messages) => {
        const errorMessages = messages.filter(msg => 
          msg.type === 'error' || msg.type === 'warning'
        );
        resolve(errorMessages);
      });
      
      // Give it a moment to collect any existing errors
      setTimeout(() => {
        cleanup();
      }, 1000);
    });
  }

  /**
   * Wait for and verify success message
   */
  async waitForSuccessMessage(expectedText?: string, timeout = 10000) {
    await this.successMessage.waitFor({ state: 'visible', timeout });
    
    if (expectedText) {
      await expect(this.successMessage).toContainText(expectedText);
    }
  }

  /**
   * Wait for and verify error message
   */
  async waitForErrorMessage(expectedText?: string, timeout = 10000) {
    await this.errorMessage.waitFor({ state: 'visible', timeout });
    
    if (expectedText) {
      await expect(this.errorMessage).toContainText(expectedText);
    }
  }

  /**
   * Check if user is logged in by looking for user menu
   */
  async isUserLoggedIn(): Promise<boolean> {
    try {
      await this.userMenu.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Switch theme
   */
  async switchTheme(theme: 'light' | 'dark' | 'auto' = 'dark') {
    await this.themeToggle.click();
    
    // If theme selector dropdown appears
    const themeOption = this.page.locator(`[data-value="${theme}"], [data-testid="theme-${theme}"]`);
    if (await themeOption.isVisible({ timeout: 1000 })) {
      await themeOption.click();
    }
    
    // Wait for theme to be applied
    await this.page.waitForTimeout(500);
  }

  /**
   * Get current theme
   */
  async getCurrentTheme(): Promise<string> {
    return await this.page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme') || 
             document.body.className.match(/theme-(\w+)/)?.[1] ||
             'light';
    });
  }

  /**
   * Take screenshot of current page
   */
  async takeScreenshot(name: string, fullPage = true) {
    return await this.helpers.takeScreenshot(name, fullPage);
  }

  /**
   * Scroll to element and ensure it's visible
   */
  async scrollToElement(selector: string) {
    await this.helpers.scrollToElement(selector);
  }

  /**
   * Wait for element to be visible and stable
   */
  async waitForElement(selector: string, timeout = 10000): Promise<Locator> {
    return await this.helpers.waitForElement(selector, timeout);
  }

  /**
   * Check responsive design by testing different viewports
   */
  async testResponsiveDesign(viewports: { width: number; height: number; name: string }[]) {
    const results = [];
    
    for (const viewport of viewports) {
      await this.page.setViewportSize({ width: viewport.width, height: viewport.height });
      await this.waitForPageReady();
      
      const screenshot = await this.takeScreenshot(`responsive-${viewport.name.toLowerCase()}`);
      
      results.push({
        viewport: viewport.name,
        size: `${viewport.width}x${viewport.height}`,
        screenshot,
        visible: await this.isPageLoaded()
      });
    }
    
    return results;
  }

  /**
   * Check for accessibility violations
   */
  async checkAccessibility() {
    return await this.helpers.checkAccessibility();
  }

  /**
   * Monitor performance metrics
   */
  async getPerformanceMetrics() {
    return await this.helpers.getPerformanceMetrics();
  }

  /**
   * Simulate network conditions
   */
  async simulateNetworkCondition(condition: 'offline' | 'slow' | 'fast') {
    await this.helpers.simulateNetworkCondition(condition);
  }

  /**
   * Wait for API call to complete
   */
  async waitForAPICall(urlPattern: string | RegExp, method = 'GET') {
    return await this.helpers.waitForAPIResponse(urlPattern, method);
  }

  /**
   * Mock API response
   */
  async mockAPI(urlPattern: string | RegExp, response: any, status = 200) {
    await this.helpers.mockAPIResponse(urlPattern, response, status);
  }

  /**
   * Handle browser dialogs
   */
  async handleDialog(accept = true, promptText = '') {
    await this.helpers.handleDialog(accept, promptText);
  }

  /**
   * Get memory usage
   */
  async getMemoryUsage() {
    return await this.helpers.getMemoryUsage();
  }

  /**
   * Logout user (if user menu is available)
   */
  async logout() {
    if (await this.isUserLoggedIn()) {
      await this.userMenu.click();
      const logoutButton = this.page.locator('[data-testid="logout"], .logout, text=Logout');
      await logoutButton.click();
      
      // Wait for logout to complete
      await this.userMenu.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }
  }

  /**
   * Navigate using the main navigation menu
   */
  async navigateTo(section: string) {
    const navLink = this.navigationMenu.locator(`[data-testid="nav-${section}"], text="${section}"`);
    await navLink.click();
    await this.waitForPageReady();
  }

  /**
   * Verify page elements are present and visible
   */
  async verifyPageElements(elements: { selector: string; name: string }[]) {
    const results = [];
    
    for (const element of elements) {
      try {
        const locator = this.page.locator(element.selector);
        await locator.waitFor({ state: 'visible', timeout: 2000 });
        results.push({ name: element.name, visible: true, error: null });
      } catch (error) {
        results.push({ 
          name: element.name, 
          visible: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
    
    return results;
  }
}