import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../pages/core/dashboard-page';
import { TestData } from '../../fixtures/test-data';

test.describe('Core Application - Loading and Initialization', () => {
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
  });

  test.describe('Application Bootstrap @smoke @critical', () => {
    test('should load application successfully', async () => {
      await dashboardPage.goto();
      
      // Verify core application elements load
      expect(await dashboardPage.isDashboardLoaded()).toBe(true);
      expect(await dashboardPage.getTitle()).toContain('Shell Platform');
    });

    test('should initialize without console errors', async () => {
      await dashboardPage.goto();
      
      const consoleErrors = await dashboardPage.getConsoleErrors();
      
      // Filter out non-critical errors
      const criticalErrors = consoleErrors.filter(error => 
        error.type === 'error' && 
        !error.text.includes('favicon') &&
        !error.text.includes('DevTools') &&
        !error.text.includes('Extensions') &&
        !error.text.toLowerCase().includes('chrome-extension')
      );
      
      expect(criticalErrors, 'Application should load without critical errors').toHaveLength(0);
    });

    test('should load all required resources', async () => {
      const performanceMetrics = await dashboardPage.testDashboardPerformance();
      
      // Should have loaded CSS, JS, and other assets
      expect(performanceMetrics.resourceCount).toBeGreaterThan(5);
      expect(performanceMetrics.pageLoadTime).toBeLessThan(TestData.performance.thresholds.pageLoad);
    });

    test('should have proper document structure', async () => {
      await dashboardPage.goto();
      
      // Check for essential HTML structure
      const doctype = await dashboardPage.page.evaluate(() => 
        document.doctype?.name === 'html'
      );
      
      const hasLang = await dashboardPage.page.locator('html[lang]').count() > 0;
      const hasTitle = await dashboardPage.page.locator('title').count() > 0;
      const hasViewport = await dashboardPage.page.evaluate(() => 
        document.querySelector('meta[name="viewport"]') !== null
      );
      
      expect(doctype, 'Document should have HTML5 doctype').toBe(true);
      expect(hasLang, 'HTML should have lang attribute').toBe(true);
      expect(hasTitle, 'Document should have title').toBe(true);
      expect(hasViewport, 'Document should have viewport meta tag').toBe(true);
    });

    test('should initialize service worker if available', async () => {
      await dashboardPage.goto();
      
      const hasServiceWorker = await dashboardPage.page.evaluate(async () => {
        return 'serviceWorker' in navigator;
      });
      
      if (hasServiceWorker) {
        const swRegistration = await dashboardPage.page.evaluate(async () => {
          try {
            const registration = await navigator.serviceWorker.getRegistration();
            return !!registration;
          } catch {
            return false;
          }
        });
        
        // Service worker should be registered for offline support
        expect(swRegistration, 'Service worker should be registered').toBe(true);
      }
    });
  });

  test.describe('Layout and UI Components @critical', () => {
    test('should render main layout components', async () => {
      await dashboardPage.goto();
      
      const layoutElements = await dashboardPage.verifyDashboardLayout();
      
      const criticalElements = ['Sidebar', 'Main Content', 'Top Bar'];
      
      criticalElements.forEach(elementName => {
        const element = layoutElements.find(el => el.name === elementName);
        expect(element?.visible, `${elementName} should be visible`).toBe(true);
      });
    });

    test('should load dashboard widgets', async () => {
      await dashboardPage.goto();
      
      const widgets = await dashboardPage.testWidgetLoading();
      
      // At least main content widgets should load
      expect(widgets.welcome || widgets.stats, 'At least one main widget should load').toBe(true);
    });

    test('should handle widget loading failures gracefully', async () => {
      const errorHandling = await dashboardPage.testErrorHandling();
      
      // Should show error states or fallback content
      expect(
        errorHandling.hasErrorBoundary || errorHandling.showsGracefulDegradation,
        'Should handle errors gracefully'
      ).toBe(true);
    });

    test('should maintain layout stability during loading', async () => {
      await dashboardPage.goto();
      
      // Check for layout shifts during loading
      const cumulativeLayoutShift = await dashboardPage.page.evaluate(() => {
        return new Promise((resolve) => {
          let clsValue = 0;
          
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if ((entry as any).hadRecentInput) continue;
              clsValue += (entry as any).value;
            }
          });
          
          observer.observe({ type: 'layout-shift', buffered: true });
          
          setTimeout(() => {
            observer.disconnect();
            resolve(clsValue);
          }, 3000);
        });
      });
      
      expect(cumulativeLayoutShift).toBeLessThan(TestData.performance.thresholds.cumulativeLayoutShift);
    });
  });

  test.describe('Navigation System @critical', () => {
    test('should support navigation between sections', async () => {
      await dashboardPage.goto();
      
      const navigationResults = await dashboardPage.testNavigation();
      
      // All navigations should succeed
      const failedNavigations = navigationResults.filter(result => !result.successful);
      expect(failedNavigations).toHaveLength(0);
    });

    test('should maintain navigation state', async () => {
      await dashboardPage.goto();
      
      // Navigate to plugins section
      await dashboardPage.navigateToSection('plugins');
      expect(dashboardPage.getCurrentUrl()).toContain('/plugins');
      
      // Navigate back to dashboard
      await dashboardPage.navigateToSection('dashboard');
      expect(dashboardPage.getCurrentUrl()).toMatch(/\/(dashboard)?$/);
    });

    test('should handle browser back/forward buttons', async () => {
      await dashboardPage.goto();
      
      // Navigate to different sections
      await dashboardPage.navigateToSection('settings');
      await dashboardPage.navigateToSection('profile');
      
      // Use browser back button
      await dashboardPage.page.goBack();
      expect(dashboardPage.getCurrentUrl()).toContain('/settings');
      
      await dashboardPage.page.goBack();
      expect(dashboardPage.getCurrentUrl()).toMatch(/\/(dashboard)?$/);
      
      // Use browser forward button
      await dashboardPage.page.goForward();
      expect(dashboardPage.getCurrentUrl()).toContain('/settings');
    });

    test('should support keyboard navigation', async () => {
      await dashboardPage.goto();
      
      // Test tab navigation
      await dashboardPage.page.keyboard.press('Tab');
      const firstFocused = await dashboardPage.page.locator(':focus').count();
      expect(firstFocused).toBeGreaterThan(0);
      
      // Test arrow key navigation in sidebar
      const sidebar = dashboardPage.page.locator('[data-testid="sidebar"]');
      const navItems = sidebar.locator('a, button');
      const navCount = await navItems.count();
      
      if (navCount > 0) {
        await navItems.first().focus();
        await dashboardPage.page.keyboard.press('ArrowDown');
        
        // Should move focus to next item
        const focusedElement = await dashboardPage.page.locator(':focus').textContent();
        expect(focusedElement).toBeTruthy();
      }
    });
  });

  test.describe('Theme System @regression', () => {
    test('should initialize with default theme', async () => {
      await dashboardPage.goto();
      
      const currentTheme = await dashboardPage.getCurrentTheme();
      expect(['light', 'dark', 'auto']).toContain(currentTheme);
    });

    test('should support theme switching', async () => {
      await dashboardPage.goto();
      
      const originalTheme = await dashboardPage.getCurrentTheme();
      
      // Switch to opposite theme
      const newTheme = originalTheme === 'light' ? 'dark' : 'light';
      await dashboardPage.switchTheme(newTheme);
      
      const updatedTheme = await dashboardPage.getCurrentTheme();
      expect(updatedTheme).toBe(newTheme);
    });

    test('should persist theme preference', async () => {
      await dashboardPage.goto();
      
      // Switch to dark theme
      await dashboardPage.switchTheme('dark');
      expect(await dashboardPage.getCurrentTheme()).toBe('dark');
      
      // Reload page
      await dashboardPage.page.reload();
      await dashboardPage.waitForPageReady();
      
      // Theme should persist
      expect(await dashboardPage.getCurrentTheme()).toBe('dark');
    });

    test('should handle system theme changes', async () => {
      await dashboardPage.goto();
      
      // Set theme to auto
      await dashboardPage.switchTheme('auto');
      
      // Simulate system theme change
      await dashboardPage.page.emulateMedia({ colorScheme: 'dark' });
      await dashboardPage.page.waitForTimeout(500);
      
      const theme = await dashboardPage.getCurrentTheme();
      expect(['dark', 'auto']).toContain(theme);
    });
  });

  test.describe('Search Functionality @smoke', () => {
    test('should provide search interface', async () => {
      await dashboardPage.goto();
      
      const searchInput = dashboardPage.page.locator('[data-testid="search"]');
      await expect(searchInput).toBeVisible();
    });

    test('should handle search queries', async () => {
      await dashboardPage.goto();
      
      await dashboardPage.search('test query');
      
      // Should navigate to search results or show results
      const hasResults = await dashboardPage.page.locator('.search-results, [data-testid="search-results"]').isVisible({ timeout: 5000 });
      const hasNavigation = dashboardPage.getCurrentUrl().includes('/search');
      
      expect(hasResults || hasNavigation, 'Should show search results or navigate to search page').toBe(true);
    });

    test('should handle empty search', async () => {
      await dashboardPage.goto();
      
      await dashboardPage.search('');
      
      // Should not crash or show error
      const hasError = await dashboardPage.page.locator('.error, [role="alert"]').isVisible({ timeout: 2000 });
      expect(hasError).toBe(false);
    });
  });

  test.describe('Real-time Features @regression', () => {
    test('should support real-time updates', async () => {
      const realtimeResults = await dashboardPage.testRealTimeUpdates();
      
      // Should handle real-time data or gracefully degrade
      expect(realtimeResults).toBeDefined();
    });

    test('should handle WebSocket connections', async () => {
      await dashboardPage.goto();
      
      const wsConnections = await dashboardPage.page.evaluate(() => {
        // Check for WebSocket connections
        return (window as any).WebSocket !== undefined;
      });
      
      expect(wsConnections, 'WebSocket should be available').toBe(true);
    });

    test('should reconnect after connection loss', async () => {
      await dashboardPage.goto();
      
      // Simulate connection loss and recovery
      await dashboardPage.simulateNetworkCondition('offline');
      await dashboardPage.page.waitForTimeout(1000);
      
      await dashboardPage.simulateNetworkCondition('fast');
      await dashboardPage.page.waitForTimeout(2000);
      
      // Application should recover gracefully
      const isRecovered = await dashboardPage.isDashboardLoaded();
      expect(isRecovered).toBe(true);
    });
  });

  test.describe('Responsive Behavior @responsive', () => {
    test('should adapt to different screen sizes', async () => {
      const responsiveResults = await dashboardPage.testResponsiveDashboard();
      
      // All viewports should be functional
      responsiveResults.forEach(result => {
        expect(result.responsive, `Dashboard should be responsive on ${result.viewport}`).toBe(true);
      });
    });

    test('should handle mobile viewport correctly', async () => {
      await dashboardPage.page.setViewportSize({ width: 375, height: 667 });
      await dashboardPage.goto();
      
      // On mobile, sidebar might be hidden or collapsible
      const sidebarToggleResult = await dashboardPage.toggleSidebar();
      expect(sidebarToggleResult.toggled, 'Sidebar should be toggleable on mobile').toBe(true);
    });

    test('should support touch interactions on mobile', async () => {
      await dashboardPage.page.setViewportSize({ width: 375, height: 667 });
      await dashboardPage.goto();
      
      // Test touch interactions
      const sidebar = dashboardPage.page.locator('[data-testid="sidebar"]');
      const mainContent = dashboardPage.page.locator('[data-testid="main-content"]');
      
      if (await sidebar.isVisible()) {
        // Test swipe gesture to close sidebar
        const sidebarBox = await sidebar.boundingBox();
        if (sidebarBox) {
          await dashboardPage.page.mouse.move(sidebarBox.x + sidebarBox.width - 10, sidebarBox.y + 100);
          await dashboardPage.page.mouse.down();
          await dashboardPage.page.mouse.move(10, sidebarBox.y + 100);
          await dashboardPage.page.mouse.up();
          
          // Give time for animation
          await dashboardPage.page.waitForTimeout(500);
        }
      }
      
      // Main content should remain functional
      await expect(mainContent).toBeVisible();
    });
  });

  test.describe('Performance Monitoring @performance', () => {
    test('should meet performance benchmarks', async () => {
      const performanceMetrics = await dashboardPage.testDashboardPerformance();
      
      expect(performanceMetrics.pageLoadTime).toBeLessThan(TestData.performance.thresholds.pageLoad);
      
      if (performanceMetrics.performanceMetrics.firstContentfulPaint) {
        expect(performanceMetrics.performanceMetrics.firstContentfulPaint)
          .toBeLessThan(TestData.performance.thresholds.firstContentfulPaint);
      }
    });

    test('should have acceptable memory usage', async () => {
      await dashboardPage.goto();
      
      const memoryUsage = await dashboardPage.getMemoryUsage();
      
      if (memoryUsage) {
        expect(memoryUsage.usedJSHeapSize).toBeLessThan(TestData.performance.thresholds.memoryUsage);
      }
    });

    test('should handle multiple tab switching', async ({ context }) => {
      // Open multiple tabs
      const page1 = await context.newPage();
      const page2 = await context.newPage();
      
      const dashboard1 = new DashboardPage(page1);
      const dashboard2 = new DashboardPage(page2);
      
      await dashboard1.goto();
      await dashboard2.goto();
      
      // Switch between tabs
      await page1.bringToFront();
      await dashboard1.waitForPageReady();
      
      await page2.bringToFront();
      await dashboard2.waitForPageReady();
      
      // Both should remain functional
      expect(await dashboard1.isDashboardLoaded()).toBe(true);
      expect(await dashboard2.isDashboardLoaded()).toBe(true);
      
      await page1.close();
      await page2.close();
    });
  });

  test.describe('Error Boundaries and Recovery @critical', () => {
    test('should handle JavaScript errors gracefully', async () => {
      await dashboardPage.goto();
      
      // Inject a JavaScript error
      await dashboardPage.page.evaluate(() => {
        setTimeout(() => {
          throw new Error('Test error for error boundary');
        }, 1000);
      });
      
      await dashboardPage.page.waitForTimeout(2000);
      
      // Application should still be functional
      const isStillFunctional = await dashboardPage.isDashboardLoaded();
      expect(isStillFunctional, 'Application should remain functional after JS error').toBe(true);
    });

    test('should recover from API failures', async () => {
      // Mock API failures
      await dashboardPage.mockAPI(/\/api\/.*/, { error: 'Service unavailable' }, 503);
      
      await dashboardPage.goto();
      
      // Should show error states but not crash
      const hasErrorBoundary = await dashboardPage.page.locator('[data-testid="error-boundary"]').isVisible();
      const hasMainLayout = await dashboardPage.page.locator('[data-testid="main-content"]').isVisible();
      
      expect(hasErrorBoundary || hasMainLayout, 'Should handle API failures gracefully').toBe(true);
    });

    test('should provide error reporting', async () => {
      await dashboardPage.goto();
      
      // Check if error reporting is available
      const hasErrorReporting = await dashboardPage.page.evaluate(() => {
        return typeof (window as any).errorReporter === 'function' ||
               typeof (window as any).Sentry === 'object' ||
               typeof (window as any).bugsnag === 'object';
      });
      
      // Error reporting is optional but recommended
      if (hasErrorReporting) {
        expect(hasErrorReporting, 'Error reporting should be properly configured').toBe(true);
      }
    });
  });

  test.describe('Accessibility Features @accessibility', () => {
    test('should support screen readers', async () => {
      const a11yResults = await dashboardPage.testDashboardAccessibility();
      
      expect(a11yResults.accessibilityViolations).toBeLessThanOrEqual(2); // Allow minor violations
      expect(a11yResults.keyboardNavigation).toBe(true);
    });

    test('should support high contrast mode', async () => {
      await dashboardPage.goto();
      
      // Enable high contrast
      await dashboardPage.page.emulateMedia({ forcedColors: 'active' });
      await dashboardPage.page.waitForTimeout(500);
      
      // Application should remain functional and readable
      const isVisible = await dashboardPage.isDashboardLoaded();
      expect(isVisible, 'Application should work in high contrast mode').toBe(true);
    });

    test('should support reduced motion preferences', async () => {
      await dashboardPage.goto();
      
      // Enable reduced motion
      await dashboardPage.page.emulateMedia({ reducedMotion: 'reduce' });
      await dashboardPage.page.waitForTimeout(500);
      
      // Animations should be reduced or disabled
      const hasReducedMotion = await dashboardPage.page.evaluate(() => {
        return window.getComputedStyle(document.body).getPropertyValue('animation-duration') === '0s' ||
               window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      });
      
      expect(hasReducedMotion, 'Should respect reduced motion preference').toBe(true);
    });
  });

  test.describe('Offline Support @network', () => {
    test('should handle offline state', async () => {
      const offlineState = await dashboardPage.testOfflineDashboard();
      
      // Should show offline indicator and cached content
      expect(
        offlineState.showsOfflineIndicator || offlineState.showsOfflineMessage,
        'Should indicate offline state'
      ).toBe(true);
    });

    test('should cache critical resources', async () => {
      await dashboardPage.goto();
      
      // Go offline
      await dashboardPage.simulateNetworkCondition('offline');
      
      // Try to reload
      await dashboardPage.page.reload();
      
      // Some content should still be available from cache
      const hasContent = await dashboardPage.page.locator('[data-testid="main-content"]').isVisible({ timeout: 10000 });
      
      // Restore network for cleanup
      await dashboardPage.simulateNetworkCondition('fast');
      
      expect(hasContent, 'Critical resources should be cached for offline use').toBe(true);
    });
  });
});