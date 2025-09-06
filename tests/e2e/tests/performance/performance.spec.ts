import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/auth/login-page';
import { DashboardPage } from '../../pages/core/dashboard-page';
import { TestData } from '../../fixtures/test-data';

test.describe('Performance Testing', () => {
  test.describe('Page Load Performance @performance @critical', () => {
    test('login page load performance', async ({ page }) => {
      const startTime = Date.now();
      
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      const loadTime = Date.now() - startTime;
      const metrics = await loginPage.getPerformanceMetrics();
      
      // Performance assertions
      expect(loadTime).toBeLessThan(TestData.performance.thresholds.pageLoad);
      
      if (metrics.firstContentfulPaint) {
        expect(metrics.firstContentfulPaint).toBeLessThan(
          TestData.performance.thresholds.firstContentfulPaint
        );
      }
      
      if (metrics.firstPaint) {
        expect(metrics.firstPaint).toBeLessThan(
          TestData.performance.thresholds.firstPaint
        );
      }
      
      // Resource count should be reasonable
      expect(metrics.resourceCount).toBeLessThan(50);
      
      console.log('Login Page Performance Metrics:', {
        pageLoadTime: loadTime,
        firstContentfulPaint: metrics.firstContentfulPaint,
        firstPaint: metrics.firstPaint,
        resourceCount: metrics.resourceCount,
        domContentLoaded: metrics.domContentLoaded
      });
    });

    test('dashboard load performance', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      
      const performanceResults = await dashboardPage.testDashboardPerformance();
      
      // Performance thresholds
      expect(performanceResults.pageLoadTime).toBeLessThan(TestData.performance.thresholds.pageLoad);
      
      if (performanceResults.performanceMetrics.firstContentfulPaint) {
        expect(performanceResults.performanceMetrics.firstContentfulPaint)
          .toBeLessThan(TestData.performance.thresholds.firstContentfulPaint);
      }
      
      console.log('Dashboard Performance Metrics:', performanceResults);
    });

    test('progressive loading and perceived performance', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      
      // Measure perceived loading time
      const startTime = Date.now();
      
      await dashboardPage.goto();
      
      // Measure time to first meaningful content
      const firstContentTime = await page.evaluate(() => {
        return new Promise((resolve) => {
          const observer = new MutationObserver(() => {
            const hasContent = document.querySelector('.main-content, [data-testid="main-content"]');
            if (hasContent && hasContent.textContent && hasContent.textContent.trim().length > 0) {
              observer.disconnect();
              resolve(performance.now());
            }
          });
          
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
          
          // Fallback timeout
          setTimeout(() => {
            observer.disconnect();
            resolve(performance.now());
          }, 5000);
        });
      });
      
      const perceivedLoadTime = Date.now() - startTime;
      
      expect(perceivedLoadTime).toBeLessThan(TestData.performance.thresholds.pageLoad);
      console.log('Perceived load time:', perceivedLoadTime, 'ms');
      console.log('Time to first content:', firstContentTime, 'ms');
    });

    test('cumulative layout shift (CLS)', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      
      // Measure CLS over page load
      const cls = await page.evaluate(() => {
        return new Promise((resolve) => {
          let clsValue = 0;
          let clsEntries = [];
          
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
                clsEntries.push(entry);
              }
            }
          });
          
          observer.observe({ type: 'layout-shift', buffered: true });
          
          setTimeout(() => {
            observer.disconnect();
            resolve({ clsValue, entryCount: clsEntries.length });
          }, 5000);
        });
      });
      
      expect((cls as any).clsValue).toBeLessThan(TestData.performance.thresholds.cumulativeLayoutShift);
      console.log('Cumulative Layout Shift:', cls);
    });
  });

  test.describe('Memory Usage @performance', () => {
    test('memory usage within limits', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await dashboardPage.waitForDashboardLoad();
      
      const memoryUsage = await dashboardPage.getMemoryUsage();
      
      if (memoryUsage) {
        expect(memoryUsage.usedJSHeapSize).toBeLessThan(TestData.performance.thresholds.memoryUsage);
        
        // Memory efficiency ratio
        const efficiency = memoryUsage.usedJSHeapSize / memoryUsage.totalJSHeapSize;
        expect(efficiency).toBeLessThan(0.8); // Should use less than 80% of allocated memory
        
        console.log('Memory Usage:', {
          usedJSHeapSize: `${Math.round(memoryUsage.usedJSHeapSize / 1024 / 1024)} MB`,
          totalJSHeapSize: `${Math.round(memoryUsage.totalJSHeapSize / 1024 / 1024)} MB`,
          jsHeapSizeLimit: `${Math.round(memoryUsage.jsHeapSizeLimit / 1024 / 1024)} MB`,
          efficiency: `${Math.round(efficiency * 100)}%`
        });
      }
    });

    test('memory leaks during navigation', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      
      // Get initial memory usage
      await dashboardPage.goto();
      await dashboardPage.waitForDashboardLoad();
      const initialMemory = await dashboardPage.getMemoryUsage();
      
      // Navigate between sections multiple times
      const sections = ['plugins', 'settings', 'profile', 'dashboard'] as const;
      
      for (let i = 0; i < 3; i++) {
        for (const section of sections) {
          await dashboardPage.navigateToSection(section);
          await dashboardPage.waitForPageReady();
        }
      }
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });
      
      const finalMemory = await dashboardPage.getMemoryUsage();
      
      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        const increasePercentage = (memoryIncrease / initialMemory.usedJSHeapSize) * 100;
        
        // Memory should not increase by more than 50% after navigation
        expect(increasePercentage).toBeLessThan(50);
        
        console.log('Memory Leak Test:', {
          initialMemory: `${Math.round(initialMemory.usedJSHeapSize / 1024 / 1024)} MB`,
          finalMemory: `${Math.round(finalMemory.usedJSHeapSize / 1024 / 1024)} MB`,
          increase: `${Math.round(memoryIncrease / 1024 / 1024)} MB`,
          increasePercentage: `${Math.round(increasePercentage)}%`
        });
      }
    });

    test('DOM node count efficiency', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await dashboardPage.waitForDashboardLoad();
      
      const domStats = await page.evaluate(() => {
        const nodeCount = document.getElementsByTagName('*').length;
        const textNodes = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );
        
        let textNodeCount = 0;
        while (textNodes.nextNode()) {
          textNodeCount++;
        }
        
        return {
          totalElements: nodeCount,
          textNodes: textNodeCount,
          scriptTags: document.getElementsByTagName('script').length,
          styleTags: document.getElementsByTagName('style').length
        };
      });
      
      // DOM should be reasonably sized
      expect(domStats.totalElements).toBeLessThan(2000);
      expect(domStats.scriptTags).toBeLessThan(20);
      
      console.log('DOM Statistics:', domStats);
    });
  });

  test.describe('Network Performance @performance', () => {
    test('API response times', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      
      const apiCalls: { url: string; duration: number }[] = [];
      
      // Monitor all API calls
      page.on('response', (response) => {
        if (response.url().includes('/api/')) {
          const request = response.request();
          const timing = request.timing();
          apiCalls.push({
            url: response.url(),
            duration: timing.responseEnd - timing.requestStart
          });
        }
      });
      
      await dashboardPage.goto();
      await dashboardPage.waitForDashboardLoad();
      
      // Wait for any async API calls to complete
      await page.waitForTimeout(2000);
      
      // Check API response times
      for (const call of apiCalls) {
        expect(call.duration).toBeLessThan(TestData.performance.thresholds.apiResponse);
        console.log(`API Call: ${call.url} - ${call.duration}ms`);
      }
    });

    test('resource loading efficiency', async ({ page }) => {
      const resources: any[] = [];
      
      page.on('response', (response) => {
        const request = response.request();
        resources.push({
          url: response.url(),
          size: response.headers()['content-length'],
          type: request.resourceType(),
          status: response.status(),
          timing: request.timing()
        });
      });
      
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.waitForPageReady();
      
      // Analyze resource loading
      const imageResources = resources.filter(r => r.type === 'image');
      const scriptResources = resources.filter(r => r.type === 'script');
      const stylesheetResources = resources.filter(r => r.type === 'stylesheet');
      
      // Check for optimizations
      const largeImages = imageResources.filter(r => parseInt(r.size || '0') > 500 * 1024); // > 500KB
      expect(largeImages.length).toBeLessThan(3); // Should have minimal large images
      
      // All critical resources should load successfully
      const failedResources = resources.filter(r => r.status >= 400);
      expect(failedResources.length).toBe(0);
      
      console.log('Resource Summary:', {
        totalResources: resources.length,
        images: imageResources.length,
        scripts: scriptResources.length,
        stylesheets: stylesheetResources.length,
        largeImages: largeImages.length,
        failedResources: failedResources.length
      });
    });

    test('caching effectiveness', async ({ page }) => {
      const loginPage = new LoginPage(page);
      
      // First visit
      await loginPage.goto();
      await loginPage.waitForPageReady();
      
      const initialResourceCount = await page.evaluate(() => 
        performance.getEntriesByType('resource').length
      );
      
      // Second visit (should use cache)
      await page.reload();
      await loginPage.waitForPageReady();
      
      const cachedResourceCount = await page.evaluate(() => 
        performance.getEntriesByType('resource').length
      );
      
      // Check cache headers and usage
      const cacheableResources = await page.evaluate(() => {
        return performance.getEntriesByType('resource').map((resource: any) => ({
          name: resource.name,
          transferSize: resource.transferSize,
          decodedBodySize: resource.decodedBodySize
        })).filter(r => r.transferSize < r.decodedBodySize); // Cached resources
      });
      
      expect(cacheableResources.length).toBeGreaterThan(0);
      console.log(`Cacheable resources: ${cacheableResources.length}`);
    });
  });

  test.describe('Rendering Performance @performance', () => {
    test('first input delay (FID)', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.waitForPageReady();
      
      const fidMeasurement = await page.evaluate(() => {
        return new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.name === 'first-input') {
                observer.disconnect();
                resolve({
                  delay: (entry as any).processingStart - (entry as any).startTime,
                  duration: (entry as any).duration
                });
              }
            }
          });
          
          observer.observe({ type: 'first-input', buffered: true });
          
          // Simulate user input
          setTimeout(() => {
            const input = document.querySelector('input');
            if (input) {
              input.click();
            }
          }, 1000);
          
          // Timeout if no input detected
          setTimeout(() => {
            observer.disconnect();
            resolve(null);
          }, 5000);
        });
      });
      
      if (fidMeasurement) {
        const fid = (fidMeasurement as any).delay;
        expect(fid).toBeLessThan(TestData.performance.thresholds.firstInputDelay);
        console.log('First Input Delay:', fid, 'ms');
      }
    });

    test('animation frame rate', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await dashboardPage.waitForDashboardLoad();
      
      // Trigger animations (theme switching)
      const frameRateResults = await page.evaluate(() => {
        return new Promise((resolve) => {
          let frameCount = 0;
          let startTime = performance.now();
          
          const animate = () => {
            frameCount++;
            if (performance.now() - startTime < 1000) { // Measure for 1 second
              requestAnimationFrame(animate);
            } else {
              resolve(frameCount);
            }
          };
          
          requestAnimationFrame(animate);
        });
      });
      
      const fps = frameRateResults as number;
      
      // Should maintain good frame rate (at least 30 FPS)
      expect(fps).toBeGreaterThan(30);
      console.log('Animation Frame Rate:', fps, 'FPS');
    });

    test('scroll performance', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      await dashboardPage.waitForDashboardLoad();
      
      // Measure scroll performance
      const scrollPerformance = await page.evaluate(() => {
        return new Promise((resolve) => {
          let frameCount = 0;
          const startTime = performance.now();
          
          const scrollHandler = () => {
            frameCount++;
          };
          
          window.addEventListener('scroll', scrollHandler, { passive: true });
          
          // Perform smooth scroll
          window.scrollTo({ top: 1000, behavior: 'smooth' });
          
          setTimeout(() => {
            window.removeEventListener('scroll', scrollHandler);
            const duration = performance.now() - startTime;
            resolve({
              frameCount,
              duration,
              framesPerSecond: (frameCount / duration) * 1000
            });
          }, 2000);
        });
      });
      
      const scrollData = scrollPerformance as any;
      
      // Should maintain smooth scrolling
      expect(scrollData.framesPerSecond).toBeGreaterThan(30);
      console.log('Scroll Performance:', scrollData);
    });
  });

  test.describe('Bundle Size and Loading @performance', () => {
    test('JavaScript bundle analysis', async ({ page }) => {
      const resources: any[] = [];
      
      page.on('response', async (response) => {
        if (response.url().endsWith('.js')) {
          const buffer = await response.body().catch(() => null);
          resources.push({
            url: response.url(),
            size: buffer ? buffer.length : 0,
            compressed: response.headers()['content-encoding'] === 'gzip'
          });
        }
      });
      
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.waitForPageReady();
      
      const totalJSSize = resources.reduce((sum, r) => sum + r.size, 0);
      const compressedResources = resources.filter(r => r.compressed);
      
      // Bundle size should be reasonable
      expect(totalJSSize).toBeLessThan(2 * 1024 * 1024); // < 2MB total
      
      // Most JS resources should be compressed
      expect(compressedResources.length / resources.length).toBeGreaterThan(0.8);
      
      console.log('JavaScript Bundle Analysis:', {
        totalSize: `${Math.round(totalJSSize / 1024)} KB`,
        bundles: resources.length,
        compressed: compressedResources.length,
        compressionRate: `${Math.round((compressedResources.length / resources.length) * 100)}%`
      });
    });

    test('CSS optimization', async ({ page }) => {
      const cssResources: any[] = [];
      
      page.on('response', async (response) => {
        if (response.url().endsWith('.css')) {
          const buffer = await response.body().catch(() => null);
          cssResources.push({
            url: response.url(),
            size: buffer ? buffer.length : 0
          });
        }
      });
      
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.waitForPageReady();
      
      const totalCSSSize = cssResources.reduce((sum, r) => sum + r.size, 0);
      
      // CSS should be optimized
      expect(totalCSSSize).toBeLessThan(500 * 1024); // < 500KB
      
      // Check for unused CSS (basic check)
      const unusedCSSRatio = await page.evaluate(() => {
        const sheets = Array.from(document.styleSheets);
        let totalRules = 0;
        let unusedRules = 0;
        
        sheets.forEach(sheet => {
          try {
            const rules = Array.from(sheet.cssRules || sheet.rules || []);
            totalRules += rules.length;
            
            rules.forEach((rule: any) => {
              if (rule.selectorText) {
                const elements = document.querySelectorAll(rule.selectorText);
                if (elements.length === 0) {
                  unusedRules++;
                }
              }
            });
          } catch (e) {
            // Cross-origin stylesheets can't be accessed
          }
        });
        
        return totalRules > 0 ? unusedRules / totalRules : 0;
      });
      
      // Should have minimal unused CSS
      expect(unusedCSSRatio).toBeLessThan(0.3); // < 30% unused
      
      console.log('CSS Optimization:', {
        totalSize: `${Math.round(totalCSSSize / 1024)} KB`,
        stylesheets: cssResources.length,
        unusedRatio: `${Math.round(unusedCSSRatio * 100)}%`
      });
    });

    test('image optimization', async ({ page }) => {
      const imageResources: any[] = [];
      
      page.on('response', async (response) => {
        if (response.request().resourceType() === 'image') {
          const buffer = await response.body().catch(() => null);
          imageResources.push({
            url: response.url(),
            size: buffer ? buffer.length : 0,
            type: response.headers()['content-type']
          });
        }
      });
      
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.waitForPageReady();
      
      // Check image formats and sizes
      const modernFormats = imageResources.filter(img => 
        img.type?.includes('webp') || img.type?.includes('avif')
      );
      
      const largeImages = imageResources.filter(img => img.size > 200 * 1024); // > 200KB
      
      // Should use modern formats when possible
      if (imageResources.length > 0) {
        expect(modernFormats.length / imageResources.length).toBeGreaterThan(0.3);
      }
      
      // Should minimize large images
      expect(largeImages.length).toBeLessThan(2);
      
      console.log('Image Optimization:', {
        totalImages: imageResources.length,
        modernFormats: modernFormats.length,
        largeImages: largeImages.length,
        totalSize: `${Math.round(imageResources.reduce((sum, img) => sum + img.size, 0) / 1024)} KB`
      });
    });
  });

  test.describe('Performance Under Load @performance @stress', () => {
    test('concurrent user simulation', async ({ context }) => {
      const concurrentUsers = 5;
      const pages = [];
      
      // Create multiple pages to simulate concurrent users
      for (let i = 0; i < concurrentUsers; i++) {
        const page = await context.newPage();
        pages.push(page);
      }
      
      const startTime = Date.now();
      
      // All users load dashboard simultaneously
      const loadPromises = pages.map(async (page, index) => {
        const dashboardPage = new DashboardPage(page);
        const userStartTime = Date.now();
        
        await dashboardPage.goto();
        await dashboardPage.waitForDashboardLoad();
        
        const userLoadTime = Date.now() - userStartTime;
        return { user: index, loadTime: userLoadTime };
      });
      
      const results = await Promise.all(loadPromises);
      const totalTime = Date.now() - startTime;
      
      // All users should load within reasonable time
      results.forEach(result => {
        expect(result.loadTime).toBeLessThan(TestData.performance.thresholds.pageLoad * 2);
      });
      
      const avgLoadTime = results.reduce((sum, r) => sum + r.loadTime, 0) / results.length;
      
      console.log('Concurrent Load Test:', {
        concurrentUsers,
        totalTime,
        avgLoadTime,
        results
      });
      
      // Cleanup
      await Promise.all(pages.map(page => page.close()));
    });

    test('memory usage under repeated actions', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      
      const initialMemory = await dashboardPage.getMemoryUsage();
      
      // Perform repeated actions
      for (let i = 0; i < 20; i++) {
        await dashboardPage.navigateToSection('plugins');
        await dashboardPage.waitForPageReady();
        await dashboardPage.navigateToSection('dashboard');
        await dashboardPage.waitForPageReady();
        
        // Simulate user interactions
        await page.mouse.move(Math.random() * 1000, Math.random() * 600);
        await page.waitForTimeout(100);
      }
      
      // Force garbage collection
      await page.evaluate(() => {
        if ((window as any).gc) (window as any).gc();
      });
      
      const finalMemory = await dashboardPage.getMemoryUsage();
      
      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        const increasePercentage = (memoryIncrease / initialMemory.usedJSHeapSize) * 100;
        
        // Memory should not increase significantly
        expect(increasePercentage).toBeLessThan(100); // < 100% increase
        
        console.log('Stress Test Memory:', {
          initialMemory: Math.round(initialMemory.usedJSHeapSize / 1024 / 1024),
          finalMemory: Math.round(finalMemory.usedJSHeapSize / 1024 / 1024),
          increase: Math.round(increasePercentage)
        });
      }
    });
  });
});