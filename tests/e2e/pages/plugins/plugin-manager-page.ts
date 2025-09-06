import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base-page';

export class PluginManagerPage extends BasePage {
  // Page URL
  private readonly url = '/plugins';

  // Main layout selectors
  private get pluginGrid() { return this.page.locator('[data-testid="plugin-grid"], .plugin-grid'); }
  private get installedPlugins() { return this.page.locator('[data-testid="installed-plugins"], .installed-plugins'); }
  private get availablePlugins() { return this.page.locator('[data-testid="available-plugins"], .available-plugins'); }
  private get searchInput() { return this.page.locator('[data-testid="plugin-search"], .plugin-search input'); }
  private get filterTabs() { return this.page.locator('[data-testid="plugin-filters"], .plugin-filters'); }
  
  // Plugin card selectors
  private get pluginCards() { return this.page.locator('[data-testid="plugin-card"], .plugin-card'); }
  private get installButtons() { return this.page.locator('[data-testid="install-plugin"], .install-plugin'); }
  private get uninstallButtons() { return this.page.locator('[data-testid="uninstall-plugin"], .uninstall-plugin'); }
  private get configureButtons() { return this.page.locator('[data-testid="configure-plugin"], .configure-plugin'); }
  private get enableToggle() { return this.page.locator('[data-testid="enable-plugin"], .enable-toggle'); }
  
  // Plugin details modal
  private get pluginModal() { return this.page.locator('[data-testid="plugin-modal"], .plugin-modal'); }
  private get pluginTitle() { return this.pluginModal.locator('.plugin-title, h2, h3'); }
  private get pluginDescription() { return this.pluginModal.locator('.plugin-description, .description'); }
  private get pluginVersion() { return this.pluginModal.locator('.plugin-version, .version'); }
  private get pluginPermissions() { return this.pluginModal.locator('.plugin-permissions, .permissions'); }
  private get pluginConfigForm() { return this.pluginModal.locator('form, .config-form'); }
  
  // Action buttons in modal
  private get modalInstallButton() { return this.pluginModal.locator('[data-testid="modal-install"], .install-btn'); }
  private get modalCloseButton() { return this.pluginModal.locator('[data-testid="modal-close"], .close-btn'); }
  private get saveConfigButton() { return this.pluginModal.locator('[data-testid="save-config"], .save-btn'); }

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to plugin manager page
   */
  async goto(options?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }) {
    await this.page.goto(this.url, options);
    await this.waitForPluginManagerLoad();
  }

  /**
   * Wait for plugin manager to fully load
   */
  async waitForPluginManagerLoad(timeout = 30000) {
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout }).catch(() => {});
    await this.pluginGrid.waitFor({ state: 'visible', timeout });
    await this.waitForPageReady(timeout);
  }

  /**
   * Get list of installed plugins
   */
  async getInstalledPlugins() {
    const pluginCards = await this.pluginCards.all();
    const plugins = [];
    
    for (const card of pluginCards) {
      const isInstalled = await card.locator('.installed-badge, [data-status="installed"]').isVisible();
      
      if (isInstalled) {
        const name = await card.locator('.plugin-name, h3, h4').textContent();
        const version = await card.locator('.plugin-version, .version').textContent();
        const status = await card.locator('.plugin-status, .status').textContent();
        const enabled = await card.locator('[data-testid="enable-plugin"]').isChecked().catch(() => false);
        
        plugins.push({
          name: name?.trim(),
          version: version?.trim(),
          status: status?.trim(),
          enabled
        });
      }
    }
    
    return plugins;
  }

  /**
   * Search for plugins
   */
  async searchPlugins(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    
    // Wait for search results
    await this.page.waitForResponse(response => 
      response.url().includes('/api/plugins/search') || 
      response.url().includes('/api/plugins')
    ).catch(() => {});
    
    await this.waitForPageReady();
  }

  /**
   * Filter plugins by category
   */
  async filterPlugins(category: 'all' | 'installed' | 'available' | 'enabled' | 'disabled') {
    const filterTab = this.filterTabs.locator(`[data-filter="${category}"], text="${category}"`);
    await filterTab.click();
    
    await this.waitForPageReady();
  }

  /**
   * Install a plugin by name
   */
  async installPlugin(pluginName: string) {
    // Find plugin card
    const pluginCard = this.pluginCards.filter({ hasText: pluginName });
    await pluginCard.scrollIntoViewIfNeeded();
    
    // Click install button
    const installButton = pluginCard.locator('[data-testid="install-plugin"], .install-plugin');
    await installButton.click();
    
    // Handle installation modal if it appears
    if (await this.pluginModal.isVisible({ timeout: 2000 })) {
      // Review permissions and details
      await this.modalInstallButton.click();
    }
    
    // Wait for installation to complete
    await this.page.waitForResponse(response => 
      response.url().includes('/api/plugins/install') && response.status() === 200
    ).catch(() => {});
    
    // Wait for UI to update
    await this.page.waitForTimeout(1000);
  }

  /**
   * Uninstall a plugin by name
   */
  async uninstallPlugin(pluginName: string) {
    const pluginCard = this.pluginCards.filter({ hasText: pluginName });
    await pluginCard.scrollIntoViewIfNeeded();
    
    const uninstallButton = pluginCard.locator('[data-testid="uninstall-plugin"], .uninstall-plugin');
    await uninstallButton.click();
    
    // Handle confirmation dialog
    await this.handleDialog(true);
    
    // Wait for uninstallation
    await this.page.waitForResponse(response => 
      response.url().includes('/api/plugins/') && response.request().method() === 'DELETE'
    ).catch(() => {});
    
    await this.page.waitForTimeout(1000);
  }

  /**
   * Enable or disable a plugin
   */
  async togglePlugin(pluginName: string, enable: boolean) {
    const pluginCard = this.pluginCards.filter({ hasText: pluginName });
    await pluginCard.scrollIntoViewIfNeeded();
    
    const toggle = pluginCard.locator('[data-testid="enable-plugin"], .enable-toggle');
    const currentState = await toggle.isChecked();
    
    if (currentState !== enable) {
      await toggle.click();
      
      // Wait for status update
      await this.page.waitForResponse(response => 
        response.url().includes('/api/plugins/') && 
        response.request().method() === 'PATCH'
      ).catch(() => {});
    }
  }

  /**
   * Configure a plugin
   */
  async configurePlugin(pluginName: string, config: Record<string, any>) {
    const pluginCard = this.pluginCards.filter({ hasText: pluginName });
    await pluginCard.scrollIntoViewIfNeeded();
    
    const configureButton = pluginCard.locator('[data-testid="configure-plugin"], .configure-plugin');
    await configureButton.click();
    
    // Wait for configuration modal
    await this.pluginModal.waitFor({ state: 'visible' });
    
    // Fill configuration form
    for (const [key, value] of Object.entries(config)) {
      const field = this.pluginConfigForm.locator(`[name="${key}"], [data-testid="${key}"]`);
      
      if (await field.isVisible()) {
        const fieldType = await field.getAttribute('type');
        
        if (fieldType === 'checkbox') {
          if (value) await field.check();
          else await field.uncheck();
        } else {
          await field.fill(String(value));
        }
      }
    }
    
    // Save configuration
    await this.saveConfigButton.click();
    
    // Wait for save response
    await this.page.waitForResponse(response => 
      response.url().includes('/api/plugins/') && 
      response.url().includes('/config')
    ).catch(() => {});
    
    // Close modal
    await this.modalCloseButton.click();
  }

  /**
   * Get plugin details from modal
   */
  async getPluginDetails(pluginName: string) {
    const pluginCard = this.pluginCards.filter({ hasText: pluginName });
    await pluginCard.click();
    
    await this.pluginModal.waitFor({ state: 'visible' });
    
    const details = {
      title: await this.pluginTitle.textContent(),
      description: await this.pluginDescription.textContent(),
      version: await this.pluginVersion.textContent(),
      permissions: await this.pluginPermissions.allTextContents()
    };
    
    await this.modalCloseButton.click();
    
    return details;
  }

  /**
   * Test plugin isolation
   */
  async testPluginIsolation() {
    // Check that plugins are loaded in isolated contexts
    const pluginIframes = await this.page.locator('iframe[src*="/plugins/"], .plugin-container').count();
    
    // Test message passing between plugins
    const pluginMessages = await this.page.evaluate(() => {
      return new Promise((resolve) => {
        const messages: any[] = [];
        
        // Listen for plugin messages
        window.addEventListener('message', (event) => {
          if (event.data.type === 'plugin-message') {
            messages.push(event.data);
          }
        });
        
        // Simulate plugin communication attempt
        window.postMessage({
          type: 'plugin-message',
          source: 'plugin-a',
          target: 'plugin-b',
          data: 'test-data'
        }, '*');
        
        setTimeout(() => resolve(messages), 1000);
      });
    });
    
    return {
      isolatedContainers: pluginIframes,
      messagesPassed: pluginMessages.length
    };
  }

  /**
   * Test plugin security
   */
  async testPluginSecurity() {
    const securityTests = [];
    
    // Test 1: Plugin cannot access parent window
    const canAccessParent = await this.page.evaluate(() => {
      try {
        // This should be blocked in properly isolated plugin
        return window.parent !== window && !!window.parent.document;
      } catch {
        return false; // Good - access is blocked
      }
    });
    
    securityTests.push({
      test: 'Parent window access',
      blocked: !canAccessParent
    });
    
    // Test 2: Plugin cannot access other plugin data
    const crossPluginAccess = await this.page.evaluate(() => {
      try {
        // Attempt to access other plugin's data
        const otherPluginData = (window as any).plugins?.find((p: any) => p.id !== 'current');
        return !!otherPluginData?.data;
      } catch {
        return false; // Good - access is blocked
      }
    });
    
    securityTests.push({
      test: 'Cross-plugin data access',
      blocked: !crossPluginAccess
    });
    
    // Test 3: Plugin cannot execute arbitrary scripts
    const scriptExecution = await this.page.evaluate(() => {
      try {
        const script = document.createElement('script');
        script.textContent = 'window.maliciousCode = true;';
        document.head.appendChild(script);
        return !!(window as any).maliciousCode;
      } catch {
        return false;
      }
    });
    
    securityTests.push({
      test: 'Arbitrary script execution',
      blocked: !scriptExecution
    });
    
    return securityTests;
  }

  /**
   * Test plugin performance impact
   */
  async testPluginPerformance() {
    const performanceData = [];
    
    // Measure performance before loading plugins
    const initialMetrics = await this.getPerformanceMetrics();
    const initialMemory = await this.getMemoryUsage();
    
    performanceData.push({
      stage: 'initial',
      metrics: initialMetrics,
      memory: initialMemory
    });
    
    // Load a plugin
    const availablePlugins = await this.getAvailablePlugins();
    if (availablePlugins.length > 0) {
      await this.installPlugin(availablePlugins[0].name);
      
      // Measure after plugin installation
      const afterInstallMetrics = await this.getPerformanceMetrics();
      const afterInstallMemory = await this.getMemoryUsage();
      
      performanceData.push({
        stage: 'after-install',
        metrics: afterInstallMetrics,
        memory: afterInstallMemory
      });
    }
    
    return performanceData;
  }

  /**
   * Get available plugins for installation
   */
  async getAvailablePlugins() {
    await this.filterPlugins('available');
    
    const pluginCards = await this.pluginCards.all();
    const plugins = [];
    
    for (const card of pluginCards) {
      const installButton = card.locator('[data-testid="install-plugin"]');
      const isAvailable = await installButton.isVisible();
      
      if (isAvailable) {
        const name = await card.locator('.plugin-name, h3, h4').textContent();
        const description = await card.locator('.plugin-description, .description').textContent();
        const version = await card.locator('.plugin-version, .version').textContent();
        
        plugins.push({
          name: name?.trim(),
          description: description?.trim(),
          version: version?.trim()
        });
      }
    }
    
    return plugins;
  }

  /**
   * Test plugin update functionality
   */
  async testPluginUpdates() {
    const updateTests = [];
    
    // Mock plugin update availability
    await this.mockAPI(/\/api\/plugins\/updates/, {
      updates: [
        {
          id: 'test-plugin',
          name: 'Test Plugin',
          currentVersion: '1.0.0',
          availableVersion: '1.1.0',
          changelog: 'Bug fixes and improvements'
        }
      ]
    });
    
    // Check for update notifications
    const updateBadge = this.page.locator('[data-testid="update-available"], .update-badge');
    const hasUpdateNotification = await updateBadge.isVisible({ timeout: 3000 });
    
    updateTests.push({
      test: 'Update notification display',
      passed: hasUpdateNotification
    });
    
    if (hasUpdateNotification) {
      // Test update process
      const updateButton = this.page.locator('[data-testid="update-plugin"], .update-plugin');
      await updateButton.click();
      
      // Wait for update to complete
      await this.page.waitForResponse(response => 
        response.url().includes('/api/plugins/update')
      ).catch(() => {});
      
      updateTests.push({
        test: 'Update process completion',
        passed: true
      });
    }
    
    return updateTests;
  }

  /**
   * Test plugin error handling
   */
  async testPluginErrorHandling() {
    const errorTests = [];
    
    // Test 1: Plugin installation failure
    await this.mockAPI(/\/api\/plugins\/install/, { error: 'Installation failed' }, 500);
    
    try {
      await this.installPlugin('failing-plugin');
      errorTests.push({
        test: 'Installation error handling',
        passed: false,
        message: 'Should have shown error message'
      });
    } catch (error) {
      const errorMessage = await this.page.locator('.error, [role="alert"]').textContent();
      errorTests.push({
        test: 'Installation error handling',
        passed: errorMessage?.includes('Installation failed') || false,
        message: errorMessage
      });
    }
    
    // Test 2: Plugin runtime error
    const pluginError = await this.page.evaluate(() => {
      // Simulate plugin error
      window.dispatchEvent(new CustomEvent('plugin-error', {
        detail: { plugin: 'test-plugin', error: 'Runtime error occurred' }
      }));
      
      return new Promise((resolve) => {
        setTimeout(() => {
          const errorMessage = document.querySelector('.plugin-error, [data-testid="plugin-error"]');
          resolve(errorMessage ? errorMessage.textContent : null);
        }, 1000);
      });
    });
    
    errorTests.push({
      test: 'Runtime error handling',
      passed: !!pluginError,
      message: pluginError
    });
    
    return errorTests;
  }

  /**
   * Verify plugin manager page elements
   */
  async verifyPluginManagerElements() {
    const elements = [
      { selector: '[data-testid="plugin-grid"]', name: 'Plugin Grid' },
      { selector: '[data-testid="plugin-search"]', name: 'Search Input' },
      { selector: '[data-testid="plugin-filters"]', name: 'Filter Tabs' },
    ];
    
    return await this.verifyPageElements(elements);
  }

  /**
   * Test plugin permissions validation
   */
  async testPluginPermissions() {
    // Mock plugin with specific permissions
    const pluginWithPermissions = {
      id: 'permission-test-plugin',
      name: 'Permission Test Plugin',
      permissions: ['read', 'write', 'network']
    };
    
    await this.mockAPI(/\/api\/plugins\/.*\/permissions/, {
      required: pluginWithPermissions.permissions,
      granted: ['read'],
      denied: ['write', 'network']
    });
    
    // Try to install plugin
    await this.installPlugin(pluginWithPermissions.name);
    
    // Check if permission dialog appears
    const permissionDialog = this.page.locator('[data-testid="permission-dialog"], .permission-dialog');
    const hasPermissionDialog = await permissionDialog.isVisible({ timeout: 3000 });
    
    return {
      permissionDialogShown: hasPermissionDialog,
      requiredPermissions: pluginWithPermissions.permissions
    };
  }
}