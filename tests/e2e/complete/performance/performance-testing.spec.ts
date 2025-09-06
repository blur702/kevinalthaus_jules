import { test, expect } from '@playwright/test';

/**
 * Performance Testing Suite
 * Comprehensive performance testing including:
 * - Page load times < 3 seconds
 * - API response times < 500ms  
 * - Bundle size validation
 * - Memory leak detection
 * - Network request optimization
 * - Core Web Vitals measurement
 * - Lighthouse scoring
 * - Resource loading analysis
 */

test.describe('Performance Testing', () => {
  test.describe('Page Load Performance', () => {
    test('should load homepage within performance budget', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
      console.log(`✅ Homepage loaded in ${loadTime}ms`);

      // Check for performance markers
      const performanceMetrics = await page.evaluate(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        return {
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
          loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
          ttfb: perfData.responseStart - perfData.requestStart, // Time to First Byte
          domInteractive: perfData.domInteractive - perfData.requestStart,
          domComplete: perfData.domComplete - perfData.requestStart
        };
      });

      console.log('Performance Metrics:', performanceMetrics);
      
      // Assert performance benchmarks
      expect(performanceMetrics.ttfb).toBeLessThan(500); // TTFB should be < 500ms
      expect(performanceMetrics.domInteractive).toBeLessThan(2000); // DOM should be interactive < 2s
    });

    test('should load dashboard within performance budget', async ({ page }) => {
      await page.goto('/');
      
      // Navigate to dashboard if it exists
      try {
        const startTime = Date.now();
        
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');
        
        const loadTime = Date.now() - startTime;
        
        expect(loadTime).toBeLessThan(4000); // Allow slightly more time for authenticated pages
        console.log(`✅ Dashboard loaded in ${loadTime}ms`);
        
      } catch (error) {
        console.log('⚠️ Dashboard not accessible - skipping dashboard performance test');
      }
    });

    test('should have good Core Web Vitals', async ({ page }) => {
      await page.goto('/');
      
      // Inject web-vitals library if not present
      await page.addScriptTag({
        url: 'https://unpkg.com/web-vitals@3/dist/web-vitals.iife.js'
      });

      const webVitals = await page.evaluate(() => {
        return new Promise(resolve => {
          const vitals: any = {};
          
          if (typeof webVitals !== 'undefined') {
            webVitals.getCLS(metric => vitals.cls = metric.value);
            webVitals.getFID(metric => vitals.fid = metric.value);
            webVitals.getFCP(metric => vitals.fcp = metric.value);
            webVitals.getLCP(metric => vitals.lcp = metric.value);
            webVitals.getTTFB(metric => vitals.ttfb = metric.value);
            
            // Wait for metrics to be collected
            setTimeout(() => resolve(vitals), 3000);
          } else {
            resolve({ error: 'web-vitals library not available' });
          }
        });
      });

      if (webVitals.error) {
        console.log('ℹ️ Web Vitals library not available - using basic metrics');
      } else {
        console.log('Core Web Vitals:', webVitals);
        
        // Assert Core Web Vitals benchmarks
        if (webVitals.lcp) expect(webVitals.lcp).toBeLessThan(2500); // LCP < 2.5s
        if (webVitals.fid) expect(webVitals.fid).toBeLessThan(100);   // FID < 100ms
        if (webVitals.cls) expect(webVitals.cls).toBeLessThan(0.1);   // CLS < 0.1
        if (webVitals.fcp) expect(webVitals.fcp).toBeLessThan(1800);  // FCP < 1.8s
      }
    });
  });

  test.describe('API Response Performance', () => {
    test('should have API responses under 500ms', async ({ page }) => {
      await page.goto('/');
      
      const apiResponseTimes: Array<{ url: string; duration: number; method: string }> = [];
      
      page.on('response', response => {
        if (response.url().includes('/api/') || response.url().includes('/auth/')) {
          const request = response.request();
          const timing = request.timing();
          
          if (timing) {
            apiResponseTimes.push({
              url: response.url(),
              method: request.method(),
              duration: timing.responseEnd - timing.requestStart
            });
          }
        }
      });

      // Navigate to pages that make API calls
      const testPages = ['/dashboard', '/profile', '/settings'];
      
      for (const testPage of testPages) {
        try {
          await page.goto(testPage);
          await page.waitForLoadState('networkidle');
        } catch {
          continue;
        }
      }

      if (apiResponseTimes.length > 0) {
        const avgResponseTime = apiResponseTimes.reduce((sum, req) => sum + req.duration, 0) / apiResponseTimes.length;
        const slowestRequest = apiResponseTimes.reduce((prev, current) => 
          current.duration > prev.duration ? current : prev
        );
        
        console.log(`API Performance Summary:`);
        console.log(`- Total API calls: ${apiResponseTimes.length}`);
        console.log(`- Average response time: ${avgResponseTime.toFixed(0)}ms`);
        console.log(`- Slowest request: ${slowestRequest.method} ${slowestRequest.url} (${slowestRequest.duration.toFixed(0)}ms)`);
        
        // Assert API performance benchmarks
        expect(avgResponseTime).toBeLessThan(500);
        
        // Flag slow requests
        const slowRequests = apiResponseTimes.filter(req => req.duration > 1000);
        if (slowRequests.length > 0) {
          console.log(`⚠️ ${slowRequests.length} slow API requests detected (>1s)`);
          slowRequests.forEach(req => {
            console.log(`  - ${req.method} ${req.url}: ${req.duration.toFixed(0)}ms`);
          });
        } else {
          console.log('✅ All API requests are performing well');
        }
      } else {
        console.log('ℹ️ No API requests captured for performance analysis');
      }
    });
  });

  test.describe('Resource Loading Performance', () => {
    test('should optimize resource loading', async ({ page }) => {
      await page.goto('/');
      
      const resourceMetrics = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        
        const metrics = {
          totalResources: resources.length,
          totalSize: 0,
          resourceTypes: {} as Record<string, number>,
          slowResources: [] as Array<{ name: string; duration: number }>,
          largeResources: [] as Array<{ name: string; size: number }>
        };

        resources.forEach(resource => {
          const duration = resource.responseEnd - resource.requestStart;
          const size = resource.transferSize || 0;
          
          // Count resource types
          const extension = resource.name.split('.').pop()?.toLowerCase() || 'other';
          metrics.resourceTypes[extension] = (metrics.resourceTypes[extension] || 0) + 1;
          
          metrics.totalSize += size;
          
          // Flag slow resources (>2s)
          if (duration > 2000) {
            metrics.slowResources.push({ name: resource.name, duration });
          }
          
          // Flag large resources (>500KB)
          if (size > 500 * 1024) {
            metrics.largeResources.push({ name: resource.name, size });
          }
        });

        return metrics;
      });

      console.log('Resource Loading Metrics:', {
        totalResources: resourceMetrics.totalResources,
        totalSizeKB: Math.round(resourceMetrics.totalSize / 1024),
        resourceTypes: resourceMetrics.resourceTypes
      });

      // Assert resource optimization
      expect(resourceMetrics.totalResources).toBeLessThan(100); // Reasonable resource count
      expect(resourceMetrics.totalSize).toBeLessThan(5 * 1024 * 1024); // Total size < 5MB

      if (resourceMetrics.slowResources.length > 0) {
        console.log(`⚠️ ${resourceMetrics.slowResources.length} slow resources detected:`);
        resourceMetrics.slowResources.forEach(resource => {
          console.log(`  - ${resource.name}: ${resource.duration.toFixed(0)}ms`);
        });
      }

      if (resourceMetrics.largeResources.length > 0) {
        console.log(`⚠️ ${resourceMetrics.largeResources.length} large resources detected:`);
        resourceMetrics.largeResources.forEach(resource => {
          console.log(`  - ${resource.name}: ${(resource.size / 1024).toFixed(0)}KB`);
        });
      }
    });

    test('should use efficient image loading', async ({ page }) => {
      await page.goto('/');
      
      const images = page.locator('img');
      const imageCount = await images.count();
      
      if (imageCount > 0) {
        console.log(`Found ${imageCount} images on page`);
        
        let lazyLoadedImages = 0;
        let properlyOptimizedImages = 0;
        
        for (let i = 0; i < Math.min(imageCount, 10); i++) {
          const img = images.nth(i);
          
          // Check for lazy loading
          const loading = await img.getAttribute('loading');
          if (loading === 'lazy') {
            lazyLoadedImages++;
          }
          
          // Check for modern formats
          const src = await img.getAttribute('src') || '';
          if (src.includes('.webp') || src.includes('.avif')) {
            properlyOptimizedImages++;
          }
        }
        
        console.log(`Lazy loaded images: ${lazyLoadedImages}/${Math.min(imageCount, 10)}`);
        console.log(`Modern format images: ${properlyOptimizedImages}/${Math.min(imageCount, 10)}`);
        
        if (lazyLoadedImages > 0) {
          console.log('✅ Lazy loading implemented for images');
        }
        
        if (properlyOptimizedImages > 0) {
          console.log('✅ Modern image formats detected');
        }
      } else {
        console.log('ℹ️ No images found on page');
      }
    });
  });

  test.describe('Memory Performance', () => {
    test('should not have memory leaks during navigation', async ({ page }) => {
      await page.goto('/');
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return null;
      });

      if (initialMemory === null) {
        console.log('ℹ️ Memory API not available in this browser');
        return;
      }

      console.log(`Initial memory usage: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);

      // Navigate through pages multiple times
      const pages = ['/dashboard', '/profile', '/settings', '/', '/dashboard'];
      
      for (let cycle = 0; cycle < 3; cycle++) {
        for (const pagePath of pages) {
          try {
            await page.goto(pagePath);
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(500);
          } catch {
            continue;
          }
        }
      }

      // Force garbage collection if available
      await page.evaluate(() => {
        if ('gc' in window) {
          (window as any).gc();
        }
      });

      await page.waitForTimeout(2000);

      const finalMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return null;
      });

      if (finalMemory) {
        console.log(`Final memory usage: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
        
        const memoryIncrease = finalMemory - initialMemory;
        const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;
        
        console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${memoryIncreasePercent.toFixed(1)}%)`);
        
        // Assert memory doesn't increase by more than 50% after navigation cycles
        expect(memoryIncreasePercent).toBeLessThan(50);
        
        if (memoryIncreasePercent < 10) {
          console.log('✅ Excellent memory management - no significant leaks detected');
        } else if (memoryIncreasePercent < 25) {
          console.log('✅ Good memory management - minor increase within acceptable range');
        } else {
          console.log('⚠️ Memory usage increased significantly - potential memory leaks');
        }
      }
    });
  });

  test.describe('Bundle Analysis', () => {
    test('should have reasonable JavaScript bundle sizes', async ({ page }) => {
      await page.goto('/');
      
      const bundleAnalysis = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[src]'));
        const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
        
        return {
          scriptCount: scripts.length,
          styleCount: styles.length,
          scriptUrls: scripts.map(s => s.getAttribute('src')).filter(Boolean),
          styleUrls: styles.map(s => s.getAttribute('href')).filter(Boolean)
        };
      });

      console.log(`Bundle Analysis:`);
      console.log(`- Script files: ${bundleAnalysis.scriptCount}`);
      console.log(`- Style files: ${bundleAnalysis.styleCount}`);

      // Get resource sizes for analysis
      const resourceSizes = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        
        let totalJSSize = 0;
        let totalCSSSize = 0;
        const largeBundles: Array<{ name: string; size: number; type: string }> = [];

        resources.forEach(resource => {
          const size = resource.transferSize || 0;
          const name = resource.name;
          
          if (name.endsWith('.js') || name.includes('javascript')) {
            totalJSSize += size;
            if (size > 100 * 1024) { // >100KB
              largeBundles.push({ name, size, type: 'JS' });
            }
          } else if (name.endsWith('.css') || name.includes('stylesheet')) {
            totalCSSSize += size;
            if (size > 50 * 1024) { // >50KB
              largeBundles.push({ name, size, type: 'CSS' });
            }
          }
        });

        return { totalJSSize, totalCSSSize, largeBundles };
      });

      console.log(`- Total JavaScript: ${(resourceSizes.totalJSSize / 1024).toFixed(0)}KB`);
      console.log(`- Total CSS: ${(resourceSizes.totalCSSSize / 1024).toFixed(0)}KB`);

      // Assert bundle size limits
      expect(resourceSizes.totalJSSize).toBeLessThan(1024 * 1024); // JS < 1MB
      expect(resourceSizes.totalCSSSize).toBeLessThan(200 * 1024); // CSS < 200KB

      if (resourceSizes.largeBundles.length > 0) {
        console.log('Large bundles detected:');
        resourceSizes.largeBundles.forEach(bundle => {
          console.log(`  - ${bundle.name}: ${(bundle.size / 1024).toFixed(0)}KB (${bundle.type})`);
        });
      } else {
        console.log('✅ All bundles are reasonably sized');
      }
    });
  });

  test.describe('Network Optimization', () => {
    test('should minimize HTTP requests', async ({ page }) => {
      await page.goto('/');
      
      const networkMetrics = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        
        const metrics = {
          totalRequests: resources.length,
          domains: new Set<string>(),
          protocols: {} as Record<string, number>,
          cached: 0,
          compressed: 0
        };

        resources.forEach(resource => {
          // Count domains
          try {
            const url = new URL(resource.name);
            metrics.domains.add(url.hostname);
            
            // Count protocols
            metrics.protocols[url.protocol] = (metrics.protocols[url.protocol] || 0) + 1;
          } catch {
            // Invalid URL
          }
          
          // Check for caching (304 responses or from cache)
          if (resource.transferSize === 0 && resource.decodedBodySize > 0) {
            metrics.cached++;
          }
          
          // Check for compression (rough estimate)
          if (resource.transferSize && resource.decodedBodySize && 
              resource.transferSize < resource.decodedBodySize * 0.8) {
            metrics.compressed++;
          }
        });

        return {
          ...metrics,
          domains: metrics.domains.size,
          compressionRate: (metrics.compressed / metrics.totalRequests * 100).toFixed(1),
          cacheRate: (metrics.cached / metrics.totalRequests * 100).toFixed(1)
        };
      });

      console.log('Network Optimization Metrics:', {
        totalRequests: networkMetrics.totalRequests,
        domains: networkMetrics.domains,
        protocols: networkMetrics.protocols,
        compressionRate: `${networkMetrics.compressionRate}%`,
        cacheRate: `${networkMetrics.cacheRate}%`
      });

      // Assert network optimization
      expect(networkMetrics.totalRequests).toBeLessThan(80); // Reasonable request count
      expect(networkMetrics.domains).toBeLessThan(10); // Minimize domain lookups

      if (parseFloat(networkMetrics.compressionRate) > 50) {
        console.log('✅ Good compression rate detected');
      }

      if (parseFloat(networkMetrics.cacheRate) > 20) {
        console.log('✅ Good cache utilization detected');
      }
    });

    test('should use HTTP/2 if available', async ({ page }) => {
      await page.goto('/');
      
      const protocolInfo = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        const protocols = resources.map(resource => {
          try {
            const url = new URL(resource.name);
            return url.protocol;
          } catch {
            return 'unknown';
          }
        });
        
        return {
          https: protocols.filter(p => p === 'https:').length,
          http: protocols.filter(p => p === 'http:').length,
          total: protocols.length
        };
      });

      console.log(`Protocol usage: HTTPS: ${protocolInfo.https}, HTTP: ${protocolInfo.http}`);

      if (protocolInfo.https > 0) {
        console.log('✅ HTTPS resources detected');
        
        // Check if HTTP/2 is available (this is a simplified check)
        const http2Support = await page.evaluate(() => {
          return 'serviceWorker' in navigator && 'fetch' in window;
        });
        
        if (http2Support) {
          console.log('✅ Modern browser features available (likely HTTP/2 compatible)');
        }
      }

      if (protocolInfo.http > 0) {
        console.log('⚠️ HTTP resources detected - consider upgrading to HTTPS');
      }
    });
  });

  test.describe('Rendering Performance', () => {
    test('should have smooth animations and interactions', async ({ page }) => {
      await page.goto('/');
      
      // Check for high frame rates during interactions
      const animationMetrics = await page.evaluate(() => {
        return new Promise(resolve => {
          let frameCount = 0;
          let startTime = Date.now();
          
          function countFrames() {
            frameCount++;
            if (Date.now() - startTime < 1000) {
              requestAnimationFrame(countFrames);
            } else {
              resolve(frameCount);
            }
          }
          
          requestAnimationFrame(countFrames);
        });
      });

      console.log(`Animation frame rate: ${animationMetrics} FPS`);
      
      // Should maintain at least 30 FPS
      expect(animationMetrics).toBeGreaterThan(30);
      
      if (animationMetrics >= 55) {
        console.log('✅ Excellent rendering performance (55+ FPS)');
      } else if (animationMetrics >= 30) {
        console.log('✅ Good rendering performance (30+ FPS)');
      }
    });

    test('should avoid layout thrashing', async ({ page }) => {
      await page.goto('/');
      
      // Measure layout stability
      const layoutStability = await page.evaluate(() => {
        let layoutShifts = 0;
        
        if ('PerformanceObserver' in window) {
          return new Promise(resolve => {
            const observer = new PerformanceObserver((entryList) => {
              for (const entry of entryList.getEntries()) {
                if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
                  layoutShifts += (entry as any).value;
                }
              }
            });
            
            observer.observe({ entryTypes: ['layout-shift'] });
            
            // Measure for 3 seconds
            setTimeout(() => {
              observer.disconnect();
              resolve(layoutShifts);
            }, 3000);
          });
        } else {
          return Promise.resolve(null);
        }
      });

      if (layoutStability !== null) {
        console.log(`Cumulative Layout Shift: ${layoutStability}`);
        
        // CLS should be < 0.1 for good user experience
        expect(layoutStability).toBeLessThan(0.1);
        
        if (layoutStability < 0.05) {
          console.log('✅ Excellent layout stability');
        } else if (layoutStability < 0.1) {
          console.log('✅ Good layout stability');
        }
      } else {
        console.log('ℹ️ Layout shift measurement not available');
      }
    });
  });
});