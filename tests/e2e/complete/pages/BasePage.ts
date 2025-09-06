import { Page, Locator, expect } from '@playwright/test';

/**
 * Base Page Object Model class
 * Contains common functionality shared across all pages
 */
export abstract class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a specific URL
   */
  async goto(url: string): Promise<void> {
    await this.page.goto(url);
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get page title
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
   * Check if element is visible
   */
  async isVisible(selector: string): Promise<boolean> {
    try {
      return await this.page.locator(selector).isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(selector: string, timeout = 10000): Promise<Locator> {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible', timeout });
    return element;
  }

  /**
   * Click an element with retry logic
   */
  async clickElement(selector: string, timeout = 10000): Promise<void> {
    const element = await this.waitForElement(selector, timeout);
    await element.click();
  }

  /**
   * Fill input field
   */
  async fillInput(selector: string, value: string): Promise<void> {
    const input = await this.waitForElement(selector);
    await input.clear();
    await input.fill(value);
  }

  /**
   * Get text content of element
   */
  async getTextContent(selector: string): Promise<string> {
    const element = await this.waitForElement(selector);
    return await element.textContent() || '';
  }

  /**
   * Get attribute value
   */
  async getAttribute(selector: string, attribute: string): Promise<string> {
    const element = await this.waitForElement(selector);
    return await element.getAttribute(attribute) || '';
  }

  /**
   * Check for console errors
   */
  async checkConsoleErrors(): Promise<string[]> {
    const errors: string[] = [];
    
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    this.page.on('pageerror', error => {
      errors.push(`Page error: ${error.message}`);
    });

    return errors;
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(name: string): Promise<Buffer> {
    return await this.page.screenshot({ 
      path: `reports/screenshots/${name}.png`,
      fullPage: true 
    });
  }

  /**
   * Verify page accessibility
   */
  async checkAccessibility(): Promise<any> {
    // This would integrate with axe-core or similar
    // For now, we'll do basic checks
    const issues = [];

    // Check for missing alt attributes on images
    const imagesWithoutAlt = await this.page.locator('img:not([alt])').count();
    if (imagesWithoutAlt > 0) {
      issues.push(`${imagesWithoutAlt} images missing alt attribute`);
    }

    // Check for headings hierarchy
    const h1Count = await this.page.locator('h1').count();
    if (h1Count !== 1) {
      issues.push(`Page should have exactly one h1, found ${h1Count}`);
    }

    return issues;
  }

  /**
   * Monitor network requests
   */
  async monitorNetwork(): Promise<void> {
    this.page.on('response', response => {
      if (!response.ok()) {
        console.warn(`Failed request: ${response.url()} - ${response.status()}`);
      }
    });
  }

  /**
   * Wait for API response
   */
  async waitForAPIResponse(urlPattern: string | RegExp, timeout = 10000): Promise<any> {
    const response = await this.page.waitForResponse(
      response => {
        const url = response.url();
        if (typeof urlPattern === 'string') {
          return url.includes(urlPattern);
        }
        return urlPattern.test(url);
      },
      { timeout }
    );

    return await response.json().catch(() => null);
  }

  /**
   * Scroll to element
   */
  async scrollToElement(selector: string): Promise<void> {
    const element = this.page.locator(selector);
    await element.scrollIntoViewIfNeeded();
  }

  /**
   * Hover over element
   */
  async hoverElement(selector: string): Promise<void> {
    const element = await this.waitForElement(selector);
    await element.hover();
  }

  /**
   * Get all console messages
   */
  getConsoleMessages(): string[] {
    const messages: string[] = [];
    
    this.page.on('console', msg => {
      messages.push(`[${msg.type()}] ${msg.text()}`);
    });

    return messages;
  }

  /**
   * Check if page has specific theme applied
   */
  async checkTheme(theme: 'light' | 'dark'): Promise<boolean> {
    const html = this.page.locator('html');
    const className = await html.getAttribute('class') || '';
    const dataTheme = await html.getAttribute('data-theme') || '';
    
    return className.includes(theme) || dataTheme.includes(theme);
  }

  /**
   * Verify responsive design at different viewports
   */
  async checkResponsive(): Promise<void> {
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 }
    ];

    for (const viewport of viewports) {
      await this.page.setViewportSize(viewport);
      await this.waitForPageLoad();
      
      // Take screenshot at each viewport
      await this.page.screenshot({ 
        path: `reports/screenshots/responsive-${viewport.name}.png`,
        fullPage: true 
      });
    }
  }

  /**
   * Abstract method - each page must define its own validation
   */
  abstract validate(): Promise<void>;
}