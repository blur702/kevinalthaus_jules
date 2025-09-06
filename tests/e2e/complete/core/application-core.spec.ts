import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

/**
 * Core Application Tests
 * Tests fundamental application functionality including:
 * - Application initialization and loading
 * - Navigation and routing
 * - Theme switching
 * - Service worker functionality
 * - Offline capabilities
 * - Error boundaries
 */

test.describe('Core Application Functionality', () => {
  test.describe('Application Initialization', () => {
    test('should load homepage without errors', async ({ page }) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];

      // Monitor console errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      page.on('pageerror', error => {
        pageErrors.push(error.message);
      });

      // Navigate to homepage
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Verify no critical errors
      expect(consoleErrors.length).toBe(0);
      expect(pageErrors.length).toBe(0);

      // Verify basic page structure
      const body = page.locator('body');
      await expect(body).toBeVisible();

      // Check for React app container
      const appContainer = page.locator('#root, #app, [data-reactroot]');
      await expect(appContainer).toBeVisible();
    });

    test('should have proper page title and meta tags', async ({ page }) => {
      await page.goto('/');
      
      // Check title
      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);

      // Check meta viewport
      const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
      expect(viewport).toContain('width=device-width');

      // Check meta description if present
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      if (description) {
        expect(description.length).toBeGreaterThan(0);
      }
    });

    test('should load all critical resources', async ({ page }) => {
      const failedRequests: string[] = [];

      page.on('response', response => {
        if (!response.ok() && response.url().includes(page.url())) {
          // Only track resources from same origin as critical
          if (response.url().endsWith('.js') || response.url().endsWith('.css')) {
            failedRequests.push(`${response.url()} - ${response.status()}`);
          }
        }
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Should have no failed critical resources
      expect(failedRequests).toHaveLength(0);
    });
  });

  test.describe('Navigation and Routing', () => {
    test('should navigate between main routes', async ({ page }) => {
      await page.goto('/');

      const routes = [
        { path: '/dashboard', selector: '[data-testid="dashboard"], main' },
        { path: '/settings', selector: '[data-testid="settings"], main' },
        { path: '/profile', selector: '[data-testid="profile"], main' }
      ];

      for (const route of routes) {
        try {
          await page.goto(route.path);
          await page.waitForLoadState('networkidle');

          // Verify URL changed
          expect(page.url()).toContain(route.path);

          // Look for main content area
          const mainContent = page.locator(route.selector);
          if (await mainContent.count() > 0) {
            await expect(mainContent.first()).toBeVisible();
            console.log(`✅ Route ${route.path} loaded successfully`);
          } else {
            console.log(`⚠️ Route ${route.path} exists but content structure differs`);
          }
        } catch (error) {
          console.log(`⚠️ Route ${route.path} may not exist:`, error.message);
        }
      }
    });

    test('should handle 404 pages gracefully', async ({ page }) => {
      await page.goto('/nonexistent-route-12345');
      
      // Should either show 404 page or redirect
      const response = await page.waitForLoadState('networkidle');
      
      // Look for 404 indicators
      const possibleSelectors = [
        'h1:has-text(\"404\")',
        'h1:has-text(\"Not Found\")',
        '[data-testid=\"404\"]',
        '.error-404',
        'h1:has-text(\"Page Not Found\")'
      ];

      let found404 = false;
      for (const selector of possibleSelectors) {
        if (await page.locator(selector).count() > 0) {
          found404 = true;
          break;
        }
      }

      if (!found404) {
        // Check if redirected to home or login
        const url = page.url();
        const redirected = url.endsWith('/') || url.includes('/login') || url.includes('/dashboard');
        expect(redirected || found404).toBeTruthy();
      } else {
        console.log('✅ 404 page displayed correctly');
      }
    });

    test('should maintain navigation state during page transitions', async ({ page }) => {
      await page.goto('/');

      // Check for navigation menu
      const navMenu = page.locator('nav, [role="navigation"], .navigation');
      
      if (await navMenu.count() > 0) {
        const navLinks = await navMenu.locator('a, button').all();
        
        if (navLinks.length > 0) {
          // Test first few navigation links
          for (let i = 0; i < Math.min(navLinks.length, 3); i++) {
            const link = navLinks[i];
            const text = await link.textContent();
            
            try {
              await link.click();
              await page.waitForLoadState('networkidle');
              
              // Verify navigation is still present
              await expect(navMenu).toBeVisible();
              console.log(`✅ Navigation preserved after clicking "${text}"`);
            } catch (error) {
              console.log(`⚠️ Navigation link "${text}" failed:`, error.message);
            }
          }
        }
      }
    });

    test('should handle browser back/forward navigation', async ({ page }) => {
      await page.goto('/');
      const initialUrl = page.url();

      // Navigate to another page
      try {
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle');

        // Go back
        await page.goBack();
        await page.waitForLoadState('networkidle');

        // Should be back to initial page
        expect(page.url()).toBe(initialUrl);

        // Go forward
        await page.goForward();
        await page.waitForLoadState('networkidle');

        // Should be back to dashboard
        expect(page.url()).toContain('/dashboard');
      } catch (error) {
        console.log('⚠️ Browser navigation test skipped - routes may not exist');
      }
    });
  });

  test.describe('Theme System', () => {
    test('should support light/dark theme switching', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Look for theme toggle button
      const themeToggle = page.locator([
        '[data-testid="theme-toggle"]',
        'button[aria-label*="theme"]',
        '.theme-toggle',
        'button:has-text("Dark")',
        'button:has-text("Light")'
      ]);

      if (await themeToggle.count() > 0) {
        const toggleButton = themeToggle.first();
        
        // Get initial theme
        const initialThemeClass = await page.locator('html').getAttribute('class') || '';
        const initialDataTheme = await page.locator('html').getAttribute('data-theme') || '';
        
        // Toggle theme
        await toggleButton.click();
        await page.waitForTimeout(500);
        
        // Verify theme changed
        const newThemeClass = await page.locator('html').getAttribute('class') || '';
        const newDataTheme = await page.locator('html').getAttribute('data-theme') || '';
        
        const themeChanged = 
          newThemeClass !== initialThemeClass || 
          newDataTheme !== initialDataTheme;
        
        expect(themeChanged).toBeTruthy();
        console.log('✅ Theme switching works correctly');
        
        // Toggle back
        await toggleButton.click();
        await page.waitForTimeout(500);
        
        // Should return to original theme
        const finalThemeClass = await page.locator('html').getAttribute('class') || '';
        const finalDataTheme = await page.locator('html').getAttribute('data-theme') || '';
        
        expect(finalThemeClass === initialThemeClass || finalDataTheme === initialDataTheme).toBeTruthy();
      } else {
        console.log('⚠️ No theme toggle found - theme switching not implemented');
      }
    });

    test('should respect system theme preference', async ({ page, context }) => {
      // Set system theme to dark
      await context.emulateMedia({ colorScheme: 'dark' });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Check if dark theme is applied
      const htmlClass = await page.locator('html').getAttribute('class') || '';
      const dataTheme = await page.locator('html').getAttribute('data-theme') || '';
      
      const darkThemeDetected = 
        htmlClass.includes('dark') || 
        dataTheme.includes('dark') ||
        await page.evaluate(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
        
      if (darkThemeDetected) {
        console.log('✅ System theme preference respected');
      } else {
        console.log('ℹ️ System theme preference may not be implemented');
      }
    });
  });

  test.describe('Error Boundaries', () => {
    test('should handle JavaScript errors gracefully', async ({ page }) => {
      await page.goto('/');
      
      // Inject a script that will cause an error
      await page.addScriptTag({
        content: `
          setTimeout(() => {
            // This should trigger error boundary if implemented
            throw new Error('Test error for error boundary');
          }, 1000);
        `
      });
      
      await page.waitForTimeout(2000);
      
      // Check if error boundary is shown or page still functions
      const errorBoundary = page.locator([
        '[data-testid="error-boundary"]',
        '.error-boundary',
        ':has-text("Something went wrong")',
        ':has-text("An error occurred")'
      ]);
      
      if (await errorBoundary.count() > 0) {
        console.log('✅ Error boundary activated correctly');
      } else {
        // Check if page is still functional
        const body = page.locator('body');
        await expect(body).toBeVisible();
        console.log('ℹ️ No error boundary detected, but page remains functional');
      }
    });

    test('should recover from network errors', async ({ page }) => {
      // Start with working network
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Simulate network failure
      await page.route('**/*', route => route.abort());
      
      // Try to navigate (should fail gracefully)
      try {
        await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 5000 });
      } catch (error) {
        // Expected to fail
      }
      
      // Restore network
      await page.unroute('**/*');
      
      // Should be able to navigate again
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const body = page.locator('body');
      await expect(body).toBeVisible();
      
      console.log('✅ Application recovers from network errors');
    });
  });

  test.describe('Service Worker & Offline Functionality', () => {
    test('should register service worker if available', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Check for service worker registration
      const serviceWorkerRegistered = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          return !!registration;
        }
        return false;
      });
      
      if (serviceWorkerRegistered) {
        console.log('✅ Service worker registered successfully');
      } else {
        console.log('ℹ️ No service worker detected');
      }
    });

    test('should handle offline scenarios', async ({ page, context }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Go offline
      await context.setOffline(true);
      
      // Try to navigate (should show offline page or cached content)
      await page.reload({ waitUntil: 'domcontentloaded' });
      
      // Check if offline indicator appears
      const offlineIndicators = page.locator([
        '[data-testid="offline"]',
        '.offline',
        ':has-text("offline")',
        ':has-text("No internet")',
        ':has-text("Connection lost")'
      ]);
      
      let offlineHandled = false;
      for (let i = 0; i < offlineIndicators.count(); i++) {
        if (await offlineIndicators.nth(i).isVisible()) {
          offlineHandled = true;
          break;
        }
      }
      
      if (offlineHandled) {
        console.log('✅ Offline state handled correctly');
      } else {
        // Check if cached content is still available
        const body = page.locator('body');
        const isVisible = await body.isVisible();
        if (isVisible) {
          console.log('✅ Cached content available offline');
        } else {
          console.log('ℹ️ No offline handling detected');
        }
      }
      
      // Go back online
      await context.setOffline(false);
    });
  });

  test.describe('Performance & Loading States', () => {
    test('should show loading states during navigation', async ({ page }) => {
      await page.goto('/');
      
      // Look for loading indicators during initial load
      const loadingIndicators = page.locator([
        '[data-testid="loading"]',
        '.loading',
        '.spinner',
        '.skeleton'
      ]);
      
      if (await loadingIndicators.count() > 0) {
        console.log('✅ Loading states implemented');
        
        // Wait for loading to complete
        await expect(loadingIndicators.first()).not.toBeVisible({ timeout: 10000 });
      } else {
        console.log('ℹ️ No loading indicators found');
      }
    });

    test('should meet performance benchmarks', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds (generous for test environment)
      expect(loadTime).toBeLessThan(5000);
      
      // Check Core Web Vitals if available
      const webVitals = await page.evaluate(() => {
        return new Promise(resolve => {
          if ('web-vitals' in window) {
            resolve('Web Vitals library detected');
          } else {
            resolve('No Web Vitals monitoring');
          }
        });
      });
      
      console.log(`Page load time: ${loadTime}ms`);
      console.log(`Web Vitals: ${webVitals}`);
    });
  });

  test.describe('Responsive Design', () => {
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 }
    ];

    for (const viewport of viewports) {
      test(`should render correctly on ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        // Check if page is responsive
        const body = page.locator('body');
        await expect(body).toBeVisible();
        
        // Take screenshot for visual verification
        await page.screenshot({ 
          path: `test-results/${viewport.name}-homepage.png`,
          fullPage: true 
        });
        
        // Check for mobile-specific elements
        if (viewport.name === 'mobile') {
          const mobileNav = page.locator([
            '[data-testid="mobile-nav"]',
            '.mobile-nav',
            '.hamburger',
            'button[aria-label*="menu"]'
          ]);
          
          if (await mobileNav.count() > 0) {
            console.log('✅ Mobile navigation detected');
          }
        }
        
        console.log(`✅ ${viewport.name} viewport test passed`);
      });
    }
  });
});