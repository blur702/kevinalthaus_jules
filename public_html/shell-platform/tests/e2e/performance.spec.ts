/**
 * End-to-End Performance Tests
 */

import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should load homepage within performance budget', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    console.log(`Homepage load time: ${loadTime}ms`);
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should have good Largest Contentful Paint (LCP)', async ({ page }) => {
    await page.goto('/');
    
    // Measure LCP using Performance API
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // Fallback timeout
        setTimeout(() => resolve(0), 5000);
      });
    });
    
    console.log(`LCP: ${lcp}ms`);
    
    if (typeof lcp === 'number' && lcp > 0) {
      // LCP should be under 2.5s for good performance
      expect(lcp).toBeLessThan(2500);
    }
  });

  test('should have good First Input Delay (FID)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Simulate user interaction and measure response time
    const startTime = Date.now();
    
    // Try to click on the first interactive element
    const interactiveElement = page.locator('button, a, input').first();
    
    if (await interactiveElement.count() > 0) {
      await interactiveElement.click();
      const responseTime = Date.now() - startTime;
      
      console.log(`First Input Delay: ${responseTime}ms`);
      
      // FID should be under 100ms for good performance
      expect(responseTime).toBeLessThan(100);
    }
  });

  test('should have minimal Cumulative Layout Shift (CLS)', async ({ page }) => {
    await page.goto('/');
    
    // Measure CLS using Performance API
    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0;
        
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
        }).observe({ entryTypes: ['layout-shift'] });
        
        // Measure for 3 seconds
        setTimeout(() => resolve(clsValue), 3000);
      });
    });
    
    console.log(`CLS: ${cls}`);
    
    if (typeof cls === 'number') {
      // CLS should be under 0.1 for good performance
      expect(cls).toBeLessThan(0.1);
    }
  });

  test('should load critical resources efficiently', async ({ page }) => {
    const resourceSizes: { [key: string]: number } = {};
    const resourceCount = { css: 0, js: 0, images: 0 };
    
    // Monitor network requests
    page.on('response', (response) => {
      const url = response.url();
      const resourceType = response.request().resourceType();
      
      if (resourceType === 'stylesheet') {
        resourceCount.css++;
      } else if (resourceType === 'script') {
        resourceCount.js++;
      } else if (resourceType === 'image') {
        resourceCount.images++;
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    console.log('Resource counts:', resourceCount);
    
    // Should have reasonable number of resources
    expect(resourceCount.css).toBeLessThan(10);
    expect(resourceCount.js).toBeLessThan(20);
  });

  test('should handle concurrent users simulation', async ({ page, context }) => {
    // Create multiple tabs to simulate concurrent users
    const pages = [page];
    
    // Create 4 additional pages
    for (let i = 0; i < 4; i++) {
      pages.push(await context.newPage());
    }
    
    const startTime = Date.now();
    
    // Load the same page in all tabs simultaneously
    const loadPromises = pages.map((p, index) => 
      p.goto('/', { waitUntil: 'networkidle' })
        .then(() => ({ index, loadTime: Date.now() - startTime }))
    );
    
    const results = await Promise.all(loadPromises);
    
    // All pages should load within reasonable time
    results.forEach(result => {
      console.log(`Page ${result.index} loaded in ${result.loadTime}ms`);
      expect(result.loadTime).toBeLessThan(10000);
    });
    
    // Clean up additional pages
    for (let i = 1; i < pages.length; i++) {
      await pages[i].close();
    }
  });

  test('should handle plugin loading performance', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to plugins page if it exists
    const pluginsLink = page.locator('a').getByText(/plugins/i).first();
    
    if (await pluginsLink.count() > 0) {
      const startTime = Date.now();
      
      await pluginsLink.click();
      await page.waitForLoadState('networkidle');
      
      const pluginLoadTime = Date.now() - startTime;
      console.log(`Plugin page load time: ${pluginLoadTime}ms`);
      
      // Plugin page should load within 2 seconds
      expect(pluginLoadTime).toBeLessThan(2000);
    }
  });

  test('should maintain performance under memory pressure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    // Simulate intensive operations
    for (let i = 0; i < 5; i++) {
      // Navigate around to create memory pressure
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Try to navigate to different pages
      const links = page.locator('a[href]');
      const linkCount = await links.count();
      
      if (linkCount > 0) {
        const randomLink = links.nth(Math.floor(Math.random() * linkCount));
        try {
          await randomLink.click({ timeout: 2000 });
          await page.waitForTimeout(500);
          await page.goBack();
        } catch (e) {
          // Continue if navigation fails
        }
      }
    }
    
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    console.log(`Memory usage: ${initialMemory} -> ${finalMemory} bytes`);
    
    // Memory should not grow excessively (allow 50MB increase)
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    }
  });

  test('should handle offline/poor network conditions', async ({ page, context }) => {
    // Simulate slow network
    await context.route('**/*', async (route) => {
      const response = await route.fetch();
      const body = await response.body();
      
      // Add artificial delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await route.fulfill({
        response,
        body
      });
    });
    
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    console.log(`Load time with simulated slow network: ${loadTime}ms`);
    
    // Should still be usable even with slow network
    expect(loadTime).toBeLessThan(15000);
  });
});