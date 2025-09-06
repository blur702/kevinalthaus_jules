/**
 * Plugin Manager
 * Main orchestrator for the plugin system
 * Handles enable/disable through database
 */

import { PluginDiscovery } from './PluginDiscovery';
import { PluginLoader } from './PluginLoader';
import { PluginHooks } from './PluginHooks';
import { ServiceContainer } from './services/ServiceContainer';
import { PluginDatabaseService } from '../../../../../../../services/database/PluginDatabaseService';

export class PluginManager {
  private discovery: PluginDiscovery;
  private loader: PluginLoader;
  private hooks: PluginHooks;
  private database: PluginDatabaseService;
  private serviceContainer: ServiceContainer;
  private initialized: boolean;

  constructor(config: any) {
    // Initialize core components
    this.hooks = new PluginHooks();
    this.discovery = new PluginDiscovery(config.pluginsDirectory);
    this.database = new PluginDatabaseService(config.databaseUrl);
    this.loader = new PluginLoader(this.discovery, this.database, this.hooks);
    this.serviceContainer = new ServiceContainer();
    this.initialized = false;
  }

  /**
   * Initialize the plugin system
   */
  async initialize(servicesConfig: any): Promise<void> {
    if (this.initialized) {
      console.warn('Plugin manager already initialized');
      return;
    }

    console.log('🚀 Initializing Plugin Manager...');

    // Initialize services
    await this.serviceContainer.initialize(servicesConfig);

    // Register services with plugin loader
    this.registerServices();

    // Initialize plugin loader (discovers and loads enabled plugins)
    await this.loader.initialize();

    this.initialized = true;
    console.log('✅ Plugin Manager initialized');
  }

  /**
   * Register services with plugin loader
   */
  private registerServices(): void {
    const services = this.serviceContainer.getAllServices();
    
    for (const serviceName of services) {
      const service = this.serviceContainer.getService(serviceName);
      this.loader.registerService(serviceName, service);
    }
  }

  /**
   * Enable a plugin (updates database and loads if not loaded)
   */
  async enablePlugin(pluginId: string): Promise<boolean> {
    try {
      console.log(`🔄 Enabling plugin: ${pluginId}`);

      // Check if plugin exists
      const manifest = this.discovery.getPluginManifest(pluginId);
      if (!manifest) {
        // Try to discover it
        await this.discovery.discoverPlugins();
        const newManifest = this.discovery.getPluginManifest(pluginId);
        
        if (!newManifest) {
          console.error(`Plugin ${pluginId} not found`);
          return false;
        }
      }

      // Update database to mark as enabled
      const dbSuccess = await this.database.enablePlugin(pluginId);
      if (!dbSuccess) {
        console.error(`Failed to enable plugin ${pluginId} in database`);
        return false;
      }

      // Check if already loaded
      const loadedPlugin = this.loader.getPlugin(pluginId);
      if (loadedPlugin && loadedPlugin.enabled) {
        console.log(`Plugin ${pluginId} already loaded and enabled`);
        return true;
      }

      // Load the plugin if not loaded
      if (!loadedPlugin) {
        const manifest = this.discovery.getPluginManifest(pluginId)!;
        const loadSuccess = await this.loader.loadPlugin(manifest);
        
        if (!loadSuccess) {
          // Rollback database change
          await this.database.disablePlugin(pluginId);
          console.error(`Failed to load plugin ${pluginId}`);
          return false;
        }
      }

      // Fire plugin enabled event
      await this.hooks.doAction('plugin.enabled', pluginId);

      console.log(`✅ Plugin ${pluginId} enabled successfully`);
      return true;

    } catch (error) {
      console.error(`Error enabling plugin ${pluginId}:`, error);
      return false;
    }
  }

  /**
   * Disable a plugin (updates database and unloads if loaded)
   */
  async disablePlugin(pluginId: string): Promise<boolean> {
    try {
      console.log(`🔄 Disabling plugin: ${pluginId}`);

      // Update database to mark as disabled
      const dbSuccess = await this.database.disablePlugin(pluginId);
      if (!dbSuccess) {
        console.error(`Failed to disable plugin ${pluginId} in database`);
        return false;
      }

      // Unload the plugin if loaded
      const loadedPlugin = this.loader.getPlugin(pluginId);
      if (loadedPlugin) {
        const unloadSuccess = await this.loader.unloadPlugin(pluginId);
        
        if (!unloadSuccess) {
          // Rollback database change
          await this.database.enablePlugin(pluginId);
          console.error(`Failed to unload plugin ${pluginId}`);
          return false;
        }
      }

      // Fire plugin disabled event
      await this.hooks.doAction('plugin.disabled', pluginId);

      console.log(`✅ Plugin ${pluginId} disabled successfully`);
      return true;

    } catch (error) {
      console.error(`Error disabling plugin ${pluginId}:`, error);
      return false;
    }
  }

  /**
   * Install a plugin (creates database entries and tables)
   */
  async installPlugin(pluginId: string): Promise<boolean> {
    try {
      console.log(`📦 Installing plugin: ${pluginId}`);

      // Get plugin manifest
      const manifest = this.discovery.getPluginManifest(pluginId);
      if (!manifest) {
        console.error(`Plugin ${pluginId} not found`);
        return false;
      }

      // Register plugin in database
      const registered = await this.database.registerPlugin(pluginId, false);
      if (!registered) {
        console.error(`Failed to register plugin ${pluginId}`);
        return false;
      }

      // Create plugin tables if defined
      if (manifest.database?.tables) {
        for (const table of manifest.database.tables) {
          await this.createPluginTable(pluginId, table);
        }
      }

      // Save default settings
      if (manifest.settings) {
        const defaultSettings: Record<string, any> = {};
        
        for (const [key, setting] of Object.entries(manifest.settings)) {
          defaultSettings[key] = setting.default;
        }
        
        await this.database.savePluginSettings(pluginId, defaultSettings);
      }

      // Fire plugin installed event
      await this.hooks.doAction('plugin.installed', pluginId);

      console.log(`✅ Plugin ${pluginId} installed successfully`);
      return true;

    } catch (error) {
      console.error(`Error installing plugin ${pluginId}:`, error);
      return false;
    }
  }

  /**
   * Uninstall a plugin (removes database entries and tables)
   */
  async uninstallPlugin(pluginId: string): Promise<boolean> {
    try {
      console.log(`🗑️  Uninstalling plugin: ${pluginId}`);

      // First disable the plugin if enabled
      await this.disablePlugin(pluginId);

      // Get plugin manifest for cleanup
      const manifest = this.discovery.getPluginManifest(pluginId);

      // Drop plugin tables if defined
      if (manifest?.database?.tables) {
        for (const table of manifest.database.tables) {
          await this.dropPluginTable(pluginId, table.name);
        }
      }

      // Fire plugin uninstalled event
      await this.hooks.doAction('plugin.uninstalled', pluginId);

      console.log(`✅ Plugin ${pluginId} uninstalled successfully`);
      return true;

    } catch (error) {
      console.error(`Error uninstalling plugin ${pluginId}:`, error);
      return false;
    }
  }

  /**
   * Create plugin table
   */
  private async createPluginTable(pluginId: string, table: any): Promise<void> {
    // This would execute SQL to create the table
    console.log(`Creating table ${table.name} for plugin ${pluginId}`);
    // Implementation would depend on your backend API
  }

  /**
   * Drop plugin table
   */
  private async dropPluginTable(pluginId: string, tableName: string): Promise<void> {
    // This would execute SQL to drop the table
    console.log(`Dropping table ${tableName} for plugin ${pluginId}`);
    // Implementation would depend on your backend API
  }

  /**
   * Get plugin status
   */
  async getPluginStatus(pluginId: string): Promise<any> {
    const isEnabled = await this.database.isPluginEnabled(pluginId);
    const loadedPlugin = this.loader.getPlugin(pluginId);
    const manifest = this.discovery.getPluginManifest(pluginId);

    return {
      id: pluginId,
      exists: !!manifest,
      enabled: isEnabled,
      loaded: !!loadedPlugin,
      manifest: manifest || null,
      loadTime: loadedPlugin?.loadTime || null
    };
  }

  /**
   * Get all plugins with their status
   */
  async getAllPlugins(): Promise<any[]> {
    const allPlugins = this.discovery.getAllPlugins();
    const statuses = [];

    for (const manifest of allPlugins) {
      const status = await this.getPluginStatus(manifest.id);
      statuses.push(status);
    }

    return statuses;
  }

  /**
   * Get hooks instance
   */
  getHooks(): PluginHooks {
    return this.hooks;
  }

  /**
   * Get service
   */
  getService(name: string): any {
    return this.serviceContainer.getService(name);
  }

  /**
   * Get state manager (needed for PluginAdmin component)
   */
  getStateManager(): any {
    // Return a state manager interface for the admin UI
    return {
      refresh: async () => {
        // Refresh plugin states from database
        await this.discovery.discoverPlugins();
      },
      getAllPluginStatuses: async () => {
        // Get all plugin statuses
        const plugins = await this.getAllPlugins();
        return plugins.map(p => ({
          id: p.id,
          name: p.manifest?.name || p.id,
          version: p.manifest?.version || '1.0.0',
          state: p.enabled ? 'enabled' : p.exists ? 'disabled' : 'not_installed',
          installed: p.exists,
          enabled: p.enabled
        }));
      }
    };
  }

  /**
   * Get discovery instance (needed for PluginAdmin component)
   */
  getDiscovery(): PluginDiscovery {
    return this.discovery;
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up Plugin Manager...');
    
    // Unload all plugins
    const loadedPlugins = this.loader.getAllLoadedPlugins();
    for (const plugin of loadedPlugins) {
      await this.loader.unloadPlugin(plugin.manifest.id);
    }

    // Cleanup services
    await this.serviceContainer.cleanup();

    // Clear hooks
    this.hooks.clearAllHooks();

    // Close database connection
    await this.database.close();

    this.initialized = false;
    console.log('✅ Plugin Manager cleaned up');
  }
}