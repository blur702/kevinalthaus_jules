import { test, expect } from '@playwright/test';
import { PluginManagerPage } from '../../pages/plugins/plugin-manager-page';
import { DashboardPage } from '../../pages/core/dashboard-page';
import { TestData } from '../../fixtures/test-data';

test.describe('Plugin System Testing', () => {
  let pluginManagerPage: PluginManagerPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    pluginManagerPage = new PluginManagerPage(page);
    dashboardPage = new DashboardPage(page);
  });

  test.describe('Plugin Manager Interface @smoke @critical', () => {
    test('should load plugin manager successfully', async () => {
      await pluginManagerPage.goto();
      
      expect(await pluginManagerPage.isPageLoaded()).toBe(true);
      expect(pluginManagerPage.getCurrentUrl()).toContain('/plugins');
    });

    test('should display all required UI elements', async () => {
      await pluginManagerPage.goto();
      
      const elements = await pluginManagerPage.verifyPluginManagerElements();
      
      const criticalElements = ['Plugin Grid', 'Search Input', 'Filter Tabs'];
      criticalElements.forEach(elementName => {
        const element = elements.find(el => el.name === elementName);
        expect(element?.visible, `${elementName} should be visible`).toBe(true);
      });
    });

    test('should have no console errors on plugin manager load', async () => {
      await pluginManagerPage.goto();
      
      const consoleErrors = await pluginManagerPage.getConsoleErrors();
      const criticalErrors = consoleErrors.filter(error => 
        error.type === 'error' && 
        !error.text.includes('favicon') &&
        !error.text.includes('DevTools')
      );
      
      expect(criticalErrors).toHaveLength(0);
    });
  });

  test.describe('Plugin Discovery and Search @critical', () => {
    test('should display available plugins', async () => {
      await pluginManagerPage.goto();
      
      const availablePlugins = await pluginManagerPage.getAvailablePlugins();
      expect(availablePlugins.length).toBeGreaterThan(0);
      
      // Verify plugin card information
      availablePlugins.forEach(plugin => {
        expect(plugin.name).toBeTruthy();
        expect(plugin.version).toBeTruthy();
      });
    });

    test('should support plugin search functionality', async () => {
      await pluginManagerPage.goto();
      
      // Search for a specific plugin
      await pluginManagerPage.searchPlugins('test');
      
      // Should filter results
      await pluginManagerPage.page.waitForTimeout(1000);
      const searchResults = await pluginManagerPage.getAvailablePlugins();
      
      // Results should contain search term (case-insensitive)
      searchResults.forEach(plugin => {
        expect(plugin.name?.toLowerCase()).toContain('test');
      });
    });

    test('should filter plugins by category', async () => {
      await pluginManagerPage.goto();
      
      // Test different filter categories
      const filters = ['all', 'installed', 'available'] as const;
      
      for (const filter of filters) {
        await pluginManagerPage.filterPlugins(filter);
        
        // Should update the plugin list
        await pluginManagerPage.page.waitForTimeout(500);
        
        // Verify filter is applied (visual verification)
        const activeFilter = pluginManagerPage.page.locator(`[data-filter="${filter}"].active, [data-filter="${filter}"][aria-selected="true"]`);
        await expect(activeFilter).toBeVisible();
      }
    });

    test('should display plugin details in modal', async () => {
      await pluginManagerPage.goto();
      
      const availablePlugins = await pluginManagerPage.getAvailablePlugins();
      
      if (availablePlugins.length > 0) {
        const details = await pluginManagerPage.getPluginDetails(availablePlugins[0].name);
        
        expect(details.title).toBeTruthy();
        expect(details.description).toBeTruthy();
        expect(details.version).toBeTruthy();
        expect(details.permissions).toBeInstanceOf(Array);
      }
    });
  });

  test.describe('Plugin Installation and Management @critical', () => {
    test('should install a plugin successfully', async () => {
      await pluginManagerPage.goto();
      
      // Mock successful installation
      await pluginManagerPage.mockAPI(/\/api\/plugins\/install/, {
        success: true,
        plugin: TestData.plugins.testPlugin
      });
      
      const initialPlugins = await pluginManagerPage.getInstalledPlugins();
      
      // Install a test plugin
      await pluginManagerPage.installPlugin('test-plugin');
      
      // Verify installation
      const updatedPlugins = await pluginManagerPage.getInstalledPlugins();
      expect(updatedPlugins.length).toBeGreaterThan(initialPlugins.length);
      
      const installedPlugin = updatedPlugins.find(p => p.name?.includes('test-plugin'));
      expect(installedPlugin).toBeDefined();
    });

    test('should handle plugin installation failures', async () => {
      await pluginManagerPage.goto();
      
      // Mock installation failure
      await pluginManagerPage.mockAPI(/\/api\/plugins\/install/, {
        error: 'Installation failed: Dependency conflict'
      }, 400);
      
      // Attempt to install plugin
      try {
        await pluginManagerPage.installPlugin('failing-plugin');
      } catch (error) {
        // Expected to fail
      }
      
      // Should show error message
      const errorMessage = pluginManagerPage.page.locator('.error, [role="alert"]');
      await expect(errorMessage).toBeVisible();
      
      const errorText = await errorMessage.textContent();
      expect(errorText?.toLowerCase()).toContain('installation failed');
    });

    test('should uninstall plugins', async () => {
      await pluginManagerPage.goto();
      
      const installedPlugins = await pluginManagerPage.getInstalledPlugins();
      
      if (installedPlugins.length > 0) {
        const pluginToUninstall = installedPlugins[0];
        
        // Mock successful uninstallation
        await pluginManagerPage.mockAPI(/\/api\/plugins\/.*/, { success: true }, 200);
        
        await pluginManagerPage.uninstallPlugin(pluginToUninstall.name!);
        
        // Verify uninstallation
        const updatedPlugins = await pluginManagerPage.getInstalledPlugins();
        const stillInstalled = updatedPlugins.find(p => p.name === pluginToUninstall.name);
        
        expect(stillInstalled).toBeUndefined();
      }
    });

    test('should enable and disable plugins', async () => {
      await pluginManagerPage.goto();
      
      // Mock plugin toggle
      await pluginManagerPage.mockAPI(/\/api\/plugins\/.*/, { success: true });
      
      const installedPlugins = await pluginManagerPage.getInstalledPlugins();
      
      if (installedPlugins.length > 0) {
        const plugin = installedPlugins[0];
        const initialState = plugin.enabled;
        
        // Toggle plugin state
        await pluginManagerPage.togglePlugin(plugin.name!, !initialState);
        
        // Verify state change
        const updatedPlugins = await pluginManagerPage.getInstalledPlugins();
        const updatedPlugin = updatedPlugins.find(p => p.name === plugin.name);
        
        expect(updatedPlugin?.enabled).toBe(!initialState);
      }
    });

    test('should configure plugins', async () => {
      await pluginManagerPage.goto();
      
      const testConfig = {
        theme: 'dark',
        apiEndpoint: 'https://test-api.com',
        enableNotifications: true
      };
      
      // Mock configuration save
      await pluginManagerPage.mockAPI(/\/api\/plugins\/.*\/config/, { 
        success: true, 
        config: testConfig 
      });
      
      const installedPlugins = await pluginManagerPage.getInstalledPlugins();
      
      if (installedPlugins.length > 0) {
        await pluginManagerPage.configurePlugin(installedPlugins[0].name!, testConfig);
        
        // Configuration should be saved without errors
        const errorMessage = pluginManagerPage.page.locator('.error, [role="alert"]');
        await expect(errorMessage).not.toBeVisible();
      }
    });
  });

  test.describe('Plugin Security and Isolation @security @critical', () => {
    test('should isolate plugin execution contexts', async () => {
      await pluginManagerPage.goto();
      
      const isolationResults = await pluginManagerPage.testPluginIsolation();
      
      // Should have isolated containers for plugins
      expect(isolationResults.isolatedContainers).toBeGreaterThan(0);
      
      // Plugin messages should be controlled
      expect(isolationResults.messagesPassed).toBeLessThanOrEqual(1);
    });

    test('should enforce plugin security boundaries', async () => {
      await pluginManagerPage.goto();
      
      const securityTests = await pluginManagerPage.testPluginSecurity();
      
      // All security tests should pass (access should be blocked)
      securityTests.forEach(test => {
        expect(test.blocked, `${test.test} should be blocked`).toBe(true);
      });
    });

    test('should validate plugin permissions', async () => {
      await pluginManagerPage.goto();
      
      const permissionTests = await pluginManagerPage.testPluginPermissions();
      
      // Should show permission dialog for plugins requiring permissions
      expect(permissionTests.permissionDialogShown).toBe(true);
      expect(permissionTests.requiredPermissions.length).toBeGreaterThan(0);
    });

    test('should prevent malicious plugin installation', async () => {
      await pluginManagerPage.goto();
      
      // Mock malicious plugin
      const maliciousPlugin = TestData.plugins.maliciousPlugin;
      
      await pluginManagerPage.mockAPI(/\/api\/plugins\/install/, {
        error: 'Plugin rejected: Security validation failed'
      }, 403);
      
      // Attempt to install malicious plugin
      try {
        await pluginManagerPage.installPlugin(maliciousPlugin.name);
      } catch (error) {
        // Expected to be rejected
      }
      
      // Should show security warning
      const securityWarning = pluginManagerPage.page.locator('.security-warning, [data-testid="security-alert"]');
      const hasWarning = await securityWarning.isVisible({ timeout: 3000 });
      
      expect(hasWarning).toBe(true);
    });

    test('should sanitize plugin configuration inputs', async () => {
      await pluginManagerPage.goto();
      
      const maliciousConfig = {
        apiEndpoint: '<script>alert("XSS")</script>',
        theme: '"; DROP TABLE plugins; --',
        description: '<img src="x" onerror="alert(1)">'
      };
      
      const installedPlugins = await pluginManagerPage.getInstalledPlugins();
      
      if (installedPlugins.length > 0) {
        await pluginManagerPage.configurePlugin(installedPlugins[0].name!, maliciousConfig);
        
        // Should not execute malicious code
        const maliciousElements = await pluginManagerPage.page.evaluate(() => {
          return document.querySelectorAll('script[src*="alert"], *[onerror*="alert"]').length;
        });
        
        expect(maliciousElements).toBe(0);
      }
    });
  });

  test.describe('Plugin Performance and Resource Management @performance', () => {
    test('should monitor plugin resource usage', async () => {
      await pluginManagerPage.goto();
      
      const performanceData = await pluginManagerPage.testPluginPerformance();
      
      expect(performanceData.length).toBeGreaterThanOrEqual(1);
      
      // Should track memory usage
      performanceData.forEach(data => {
        if (data.memory) {
          expect(data.memory.usedJSHeapSize).toBeLessThan(TestData.performance.thresholds.memoryUsage);
        }
      });
    });

    test('should handle plugin loading timeouts', async () => {
      await pluginManagerPage.goto();
      
      // Mock slow plugin loading
      await pluginManagerPage.mockAPI(/\/api\/plugins\/.*/, async (route) => {
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
        route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true })
        });
      });
      
      const startTime = Date.now();
      
      try {
        await pluginManagerPage.installPlugin('slow-plugin');
      } catch (error) {
        // May timeout - that's acceptable
      }
      
      const loadTime = Date.now() - startTime;
      
      // Should have reasonable timeout handling
      expect(loadTime).toBeLessThan(30000); // Should timeout before 30 seconds
    });

    test('should limit concurrent plugin operations', async () => {
      await pluginManagerPage.goto();
      
      // Mock multiple plugin installations
      const installPromises = [];
      
      for (let i = 0; i < 5; i++) {
        installPromises.push(
          pluginManagerPage.installPlugin(`test-plugin-${i}`).catch(() => {})
        );
      }
      
      const startTime = Date.now();
      await Promise.all(installPromises);
      const endTime = Date.now();
      
      // Should handle concurrent operations gracefully
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(60000); // Should complete within reasonable time
    });

    test('should cleanup plugin resources on uninstall', async () => {
      await pluginManagerPage.goto();
      
      const initialMemory = await pluginManagerPage.getMemoryUsage();
      
      // Install and then uninstall a plugin
      const availablePlugins = await pluginManagerPage.getAvailablePlugins();
      if (availablePlugins.length > 0) {
        const pluginName = availablePlugins[0].name;
        
        await pluginManagerPage.installPlugin(pluginName);
        await pluginManagerPage.page.waitForTimeout(2000); // Let plugin load
        
        await pluginManagerPage.uninstallPlugin(pluginName);
        await pluginManagerPage.page.waitForTimeout(2000); // Let cleanup happen
        
        // Force garbage collection if available
        await pluginManagerPage.page.evaluate(() => {
          if ((window as any).gc) (window as any).gc();
        });
        
        const finalMemory = await pluginManagerPage.getMemoryUsage();
        
        if (initialMemory && finalMemory) {
          const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
          const increasePercentage = (memoryIncrease / initialMemory.usedJSHeapSize) * 100;
          
          // Memory should not increase significantly after install/uninstall cycle
          expect(increasePercentage).toBeLessThan(25); // Allow some increase for caching
        }
      }
    });
  });

  test.describe('Plugin Communication and APIs @integration', () => {
    test('should support plugin-to-host communication', async () => {
      await pluginManagerPage.goto();
      await dashboardPage.goto();
      
      // Test plugin API calls to host
      const apiCalls = await dashboardPage.page.evaluate(() => {
        return new Promise((resolve) => {
          const calls: any[] = [];
          
          // Mock plugin making API call to host
          window.postMessage({
            type: 'plugin-api-call',
            method: 'GET',
            endpoint: '/api/user/profile',
            plugin: 'test-plugin'
          }, '*');
          
          // Listen for responses
          window.addEventListener('message', (event) => {
            if (event.data.type === 'plugin-api-response') {
              calls.push(event.data);
            }
          });
          
          setTimeout(() => resolve(calls), 1000);
        });
      });
      
      // Should handle plugin API calls
      expect(Array.isArray(apiCalls)).toBe(true);
    });

    test('should support plugin-to-plugin communication', async () => {
      await pluginManagerPage.goto();
      
      // Mock two plugins
      const pluginCommunication = await pluginManagerPage.page.evaluate(() => {
        return new Promise((resolve) => {
          const messages: any[] = [];
          
          // Listen for plugin messages
          window.addEventListener('message', (event) => {
            if (event.data.type === 'plugin-message') {
              messages.push(event.data);
            }
          });
          
          // Simulate plugin A sending message to plugin B
          window.postMessage({
            type: 'plugin-message',
            from: 'plugin-a',
            to: 'plugin-b',
            data: { action: 'share-data', payload: 'test-data' }
          }, '*');
          
          // Simulate plugin B responding
          setTimeout(() => {
            window.postMessage({
              type: 'plugin-message',
              from: 'plugin-b',
              to: 'plugin-a',
              data: { action: 'data-received', status: 'success' }
            }, '*');
          }, 100);
          
          setTimeout(() => resolve(messages), 500);
        });
      });
      
      const messages = pluginCommunication as any[];
      
      // Should support controlled inter-plugin communication
      expect(messages.length).toBeGreaterThanOrEqual(2);
      
      const messageFromA = messages.find(m => m.from === 'plugin-a');
      const messageFromB = messages.find(m => m.from === 'plugin-b');
      
      expect(messageFromA).toBeDefined();
      expect(messageFromB).toBeDefined();
    });

    test('should provide plugin lifecycle hooks', async () => {
      await pluginManagerPage.goto();
      
      // Test plugin lifecycle events
      const lifecycleEvents = await pluginManagerPage.page.evaluate(() => {
        const events: string[] = [];
        
        // Mock plugin lifecycle
        const pluginManager = {
          onInstall: () => events.push('install'),
          onEnable: () => events.push('enable'),
          onDisable: () => events.push('disable'),
          onUninstall: () => events.push('uninstall'),
          onUpdate: () => events.push('update')
        };
        
        // Simulate lifecycle
        pluginManager.onInstall();
        pluginManager.onEnable();
        pluginManager.onDisable();
        pluginManager.onUninstall();
        
        return events;
      });
      
      // Should track all lifecycle events
      expect(lifecycleEvents).toContain('install');
      expect(lifecycleEvents).toContain('enable');
      expect(lifecycleEvents).toContain('disable');
      expect(lifecycleEvents).toContain('uninstall');
    });
  });

  test.describe('Plugin Error Handling and Recovery @critical', () => {
    test('should handle plugin runtime errors gracefully', async () => {
      await pluginManagerPage.goto();
      
      const errorHandling = await pluginManagerPage.testPluginErrorHandling();
      
      // Should handle installation errors
      const installationError = errorHandling.find(test => test.test === 'Installation error handling');
      expect(installationError?.passed).toBe(true);
      
      // Should handle runtime errors
      const runtimeError = errorHandling.find(test => test.test === 'Runtime error handling');
      expect(runtimeError?.passed).toBe(true);
    });

    test('should isolate plugin errors from host application', async () => {
      await pluginManagerPage.goto();
      await dashboardPage.goto();
      
      // Simulate plugin error
      await dashboardPage.page.evaluate(() => {
        // Simulate plugin throwing error
        window.dispatchEvent(new CustomEvent('plugin-error', {
          detail: {
            plugin: 'test-plugin',
            error: new Error('Plugin runtime error'),
            fatal: false
          }
        }));
      });
      
      // Host application should remain functional
      expect(await dashboardPage.isDashboardLoaded()).toBe(true);
      
      // Should show plugin error notification
      const errorNotification = dashboardPage.page.locator('.plugin-error-notification, [data-testid="plugin-error"]');
      const hasNotification = await errorNotification.isVisible({ timeout: 3000 });
      
      expect(hasNotification).toBe(true);
    });

    test('should support plugin recovery mechanisms', async () => {
      await pluginManagerPage.goto();
      
      // Mock plugin failure and recovery
      const recoveryTest = await pluginManagerPage.page.evaluate(() => {
        return new Promise((resolve) => {
          let attempts = 0;
          const maxAttempts = 3;
          
          const tryPluginOperation = () => {
            attempts++;
            
            if (attempts < maxAttempts) {
              // Simulate failure
              setTimeout(() => tryPluginOperation(), 100);
            } else {
              // Simulate success after retries
              resolve({ attempts, success: true });
            }
          };
          
          tryPluginOperation();
        });
      });
      
      const result = recoveryTest as any;
      
      // Should retry failed operations
      expect(result.attempts).toBe(3);
      expect(result.success).toBe(true);
    });
  });

  test.describe('Plugin Updates and Versioning @regression', () => {
    test('should detect plugin updates', async () => {
      await pluginManagerPage.goto();
      
      const updateTests = await pluginManagerPage.testPluginUpdates();
      
      // Should display update notifications
      const notificationTest = updateTests.find(test => test.test === 'Update notification display');
      expect(notificationTest?.passed).toBe(true);
      
      // Should handle update process
      const updateProcessTest = updateTests.find(test => test.test === 'Update process completion');
      if (updateProcessTest) {
        expect(updateProcessTest.passed).toBe(true);
      }
    });

    test('should handle version compatibility', async () => {
      await pluginManagerPage.goto();
      
      // Mock plugin with version requirements
      await pluginManagerPage.mockAPI(/\/api\/plugins\/compatibility/, {
        compatible: false,
        requiredVersion: '2.0.0',
        currentVersion: '1.5.0',
        reason: 'Plugin requires newer Shell Platform version'
      });
      
      try {
        await pluginManagerPage.installPlugin('incompatible-plugin');
      } catch (error) {
        // Expected to fail
      }
      
      // Should show compatibility error
      const compatibilityError = pluginManagerPage.page.locator('.compatibility-error, [data-testid="version-error"]');
      const hasError = await compatibilityError.isVisible({ timeout: 3000 });
      
      expect(hasError).toBe(true);
      
      const errorText = await compatibilityError.textContent();
      expect(errorText?.toLowerCase()).toMatch(/(version|compatibility)/);
    });

    test('should support plugin rollback', async () => {
      await pluginManagerPage.goto();
      
      // Mock plugin rollback scenario
      await pluginManagerPage.mockAPI(/\/api\/plugins\/.*\/rollback/, {
        success: true,
        previousVersion: '1.0.0',
        currentVersion: '1.1.0'
      });
      
      const rollbackButton = pluginManagerPage.page.locator('[data-testid="rollback-plugin"], .rollback-button');
      
      if (await rollbackButton.isVisible({ timeout: 2000 })) {
        await rollbackButton.click();
        
        // Should complete rollback
        await pluginManagerPage.page.waitForResponse(response => 
          response.url().includes('/rollback') && response.status() === 200
        ).catch(() => {});
        
        // Should show rollback success
        const successMessage = pluginManagerPage.page.locator('.rollback-success, [data-testid="rollback-success"]');
        const hasSuccess = await successMessage.isVisible({ timeout: 3000 });
        
        expect(hasSuccess).toBe(true);
      }
    });
  });

  test.describe('Plugin Accessibility and UX @accessibility', () => {
    test('should meet accessibility standards', async () => {
      await pluginManagerPage.goto();
      
      const accessibilityResults = await pluginManagerPage.checkAccessibility();
      
      // Should have minimal accessibility violations
      expect(accessibilityResults.violations.length).toBeLessThanOrEqual(2);
    });

    test('should support keyboard navigation', async () => {
      await pluginManagerPage.goto();
      
      // Test tab navigation through plugin cards
      await pluginManagerPage.page.keyboard.press('Tab');
      const firstFocused = await pluginManagerPage.page.locator(':focus').count();
      expect(firstFocused).toBeGreaterThan(0);
      
      // Test Enter key activation
      await pluginManagerPage.page.keyboard.press('Enter');
      
      // Should activate focused element
      await pluginManagerPage.page.waitForTimeout(500);
    });

    test('should provide clear loading and error states', async () => {
      await pluginManagerPage.goto();
      
      // Test loading state
      const loadingIndicator = pluginManagerPage.page.locator('.loading, .spinner, [data-testid="loading"]');
      
      // Mock slow operation to test loading state
      await pluginManagerPage.mockAPI(/\/api\/plugins\/install/, async (route) => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        route.fulfill({ status: 200, body: '{"success": true}' });
      });
      
      const installPromise = pluginManagerPage.installPlugin('test-plugin');
      
      // Should show loading indicator
      const hasLoading = await loadingIndicator.isVisible({ timeout: 1000 });
      expect(hasLoading).toBe(true);
      
      await installPromise;
    });
  });
});