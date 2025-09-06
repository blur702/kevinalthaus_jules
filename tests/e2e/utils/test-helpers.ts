import { Page, Locator, expect } from '@playwright/test';
import { faker } from 'faker';
import jwt from 'jsonwebtoken';

/**
 * Test helper utilities for common operations
 */
export class TestHelpers {
  constructor(public page: Page) {}

  /**
   * Wait for page to be fully loaded including all async content
   */
  async waitForPageLoad(timeout = 30000) {
    await Promise.all([
      this.page.waitForLoadState('networkidle', { timeout }),
      this.page.waitForLoadState('domcontentloaded', { timeout }),
      this.page.waitForFunction(() => document.readyState === 'complete', { timeout })
    ]);
  }

  /**
   * Wait for element to be visible and stable
   */
  async waitForElement(selector: string, timeout = 10000): Promise<Locator> {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible', timeout });
    await element.waitFor({ state: 'attached', timeout });
    return element;
  }

  /**
   * Scroll element into view and wait for stability
   */
  async scrollToElement(selector: string) {
    const element = this.page.locator(selector);
    await element.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(100); // Allow for scroll animation
  }

  /**
   * Take a screenshot with custom naming
   */
  async takeScreenshot(name: string, fullPage = true) {
    return await this.page.screenshot({
      path: `screenshots/${name}-${Date.now()}.png`,
      fullPage,
      animations: 'disabled'
    });
  }

  /**
   * Monitor console messages during test execution
   */
  async monitorConsole(callback: (messages: any[]) => void) {
    const messages: any[] = [];
    
    this.page.on('console', (msg) => {
      messages.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
        timestamp: Date.now()
      });
    });

    this.page.on('pageerror', (error) => {
      messages.push({
        type: 'error',
        text: error.message,
        stack: error.stack,
        timestamp: Date.now()
      });
    });

    // Return cleanup function
    return () => {
      callback(messages);
      this.page.removeAllListeners('console');
      this.page.removeAllListeners('pageerror');
    };
  }

  /**
   * Fill form with data and handle validation
   */
  async fillForm(formData: Record<string, string>, formSelector = 'form') {
    const form = this.page.locator(formSelector);
    await form.waitFor({ state: 'visible' });

    for (const [fieldName, value] of Object.entries(formData)) {
      const field = form.locator(`[name="${fieldName}"], [data-testid="${fieldName}"], #${fieldName}`);
      await field.waitFor({ state: 'visible' });
      await field.fill(value);
      
      // Wait for any validation to complete
      await this.page.waitForTimeout(100);
    }
  }

  /**
   * Submit form and wait for response
   */
  async submitForm(formSelector = 'form', submitButtonSelector = '[type="submit"]') {
    const form = this.page.locator(formSelector);
    const submitButton = form.locator(submitButtonSelector);
    
    // Wait for any async validation to complete
    await submitButton.waitFor({ state: 'enabled' });
    
    // Submit and wait for navigation or response
    await Promise.all([
      this.page.waitForResponse(response => 
        response.status() !== 301 && response.status() !== 302
      ).catch(() => {}), // Ignore if no API call
      submitButton.click()
    ]);
  }

  /**
   * Check for validation errors on form
   */
  async getFormErrors(formSelector = 'form') {
    const form = this.page.locator(formSelector);
    const errorElements = form.locator('.error, [role="alert"], .MuiFormHelperText-root.Mui-error');
    
    const errors: string[] = [];
    const count = await errorElements.count();
    
    for (let i = 0; i < count; i++) {
      const text = await errorElements.nth(i).textContent();
      if (text) errors.push(text.trim());
    }
    
    return errors;
  }

  /**
   * Wait for API response with specific criteria
   */
  async waitForAPIResponse(urlPattern: string | RegExp, method = 'GET', timeout = 10000) {
    return await this.page.waitForResponse(
      response => {
        const url = response.url();
        const matchesUrl = typeof urlPattern === 'string' 
          ? url.includes(urlPattern)
          : urlPattern.test(url);
        
        return matchesUrl && response.request().method() === method;
      },
      { timeout }
    );
  }

  /**
   * Simulate network conditions
   */
  async simulateNetworkCondition(condition: 'offline' | 'slow' | 'fast') {
    const context = this.page.context();
    
    switch (condition) {
      case 'offline':
        await context.setOffline(true);
        break;
      case 'slow':
        await context.setOffline(false);
        await context.route('**/*', (route) => {
          setTimeout(() => route.continue(), 1000); // 1s delay
        });
        break;
      case 'fast':
        await context.setOffline(false);
        await context.unroute('**/*');
        break;
    }
  }

  /**
   * Mock API responses
   */
  async mockAPIResponse(urlPattern: string | RegExp, response: any, status = 200) {
    await this.page.route(urlPattern, (route) => {
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response)
      });
    });
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics() {
    return await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
        timeToInteractive: navigation.loadEventEnd,
        resourceCount: performance.getEntriesByType('resource').length
      };
    });
  }

  /**
   * Check accessibility violations
   */
  async checkAccessibility() {
    // This would integrate with axe-core for accessibility testing
    return await this.page.evaluate(() => {
      // Placeholder for accessibility checks
      // In real implementation, you'd inject axe-core and run analysis
      return {
        violations: [],
        passes: [],
        incomplete: [],
        inapplicable: []
      };
    });
  }

  /**
   * Generate test data
   */
  static generateTestUser() {
    return {
      email: faker.internet.email().toLowerCase(),
      password: 'Test123!@#',
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      phone: faker.phone.phoneNumber(),
      address: {
        street: faker.address.streetAddress(),
        city: faker.address.city(),
        state: faker.address.state(),
        zip: faker.address.zipCode(),
        country: 'United States'
      }
    };
  }

  static generateJWTToken(payload: any, secret = 'test-secret') {
    return jwt.sign(payload, secret, { expiresIn: '1h' });
  }

  /**
   * Compare images for visual regression testing
   */
  async compareScreenshot(name: string, options: { threshold?: number, clip?: any } = {}) {
    const screenshot = await this.page.screenshot({
      clip: options.clip,
      animations: 'disabled',
      caret: 'hide'
    });

    // Use Playwright's built-in screenshot comparison
    await expect(screenshot).toMatchSnapshot(`${name}.png`, {
      threshold: options.threshold || 0.1
    });
  }

  /**
   * Wait for animations to complete
   */
  async waitForAnimations() {
    await this.page.waitForFunction(() => {
      return new Promise<boolean>((resolve) => {
        const observer = new MutationObserver(() => {
          const animations = document.getAnimations();
          if (animations.length === 0) {
            observer.disconnect();
            resolve(true);
          }
        });
        
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true
        });
        
        // Initial check
        setTimeout(() => {
          const animations = document.getAnimations();
          if (animations.length === 0) {
            observer.disconnect();
            resolve(true);
          }
        }, 100);
      });
    }, { timeout: 5000 }).catch(() => {
      // Timeout is acceptable - animations might be ongoing
    });
  }

  /**
   * Simulate file upload
   */
  async uploadFile(inputSelector: string, filePath: string) {
    const fileInput = this.page.locator(inputSelector);
    await fileInput.setInputFiles(filePath);
    
    // Wait for upload to complete
    await this.page.waitForResponse(response => 
      response.url().includes('/upload') && response.status() === 200
    ).catch(() => {}); // Ignore if no upload endpoint
  }

  /**
   * Handle browser dialogs (alerts, confirms, prompts)
   */
  async handleDialog(accept = true, promptText = '') {
    this.page.on('dialog', async (dialog) => {
      if (dialog.type() === 'prompt' && promptText) {
        await dialog.accept(promptText);
      } else if (accept) {
        await dialog.accept();
      } else {
        await dialog.dismiss();
      }
    });
  }

  /**
   * Get memory usage information
   */
  async getMemoryUsage() {
    return await this.page.evaluate(() => {
      const memory = (performance as any).memory;
      return memory ? {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      } : null;
    });
  }
}