/**
 * Dynamic Plugin Loader
 * Loads plugins based on their manifest and database status
 */

import { PluginManifest, PluginDiscovery } from './PluginDiscovery';
import { PluginDatabaseService } from '../../../../../../../services/database/PluginDatabaseService';
import { PluginHooks } from './PluginHooks';

interface LoadedPlugin {
  manifest: PluginManifest;
  instance: any;
  enabled: boolean;
  loadTime: number;
}

export class PluginLoader {
  private discovery: PluginDiscovery;
  private database: PluginDatabaseService;
  private hooks: PluginHooks;
  private loadedPlugins: Map<string, LoadedPlugin>;
  private services: Map<string, any>;

  constructor(
    discovery: PluginDiscovery,
    database: PluginDatabaseService,
    hooks: PluginHooks
  ) {
    this.discovery = discovery;
    this.database = database;
    this.hooks = hooks;
    this.loadedPlugins = new Map();
    this.services = new Map();
  }

  /**
   * Initialize and load all enabled plugins
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing plugin system...');
    
    // Discover all available plugins
    const availablePlugins = await this.discovery.discoverPlugins();
    console.log(`📦 Found ${availablePlugins.length} available plugins`);
    
    // Get enabled plugins from database
    const enabledPluginIds = await this.database.getEnabledPlugins();
    console.log(`✅ ${enabledPluginIds.length} plugins are enabled`);
    
    // Load enabled plugins
    for (const manifest of availablePlugins) {
      const isEnabled = enabledPluginIds.includes(manifest.id);
      
      if (isEnabled) {
        await this.loadPlugin(manifest);
      } else {
        console.log(`⏭️  Plugin ${manifest.id} is disabled`);
      }
    }
    
    console.log('✨ Plugin system initialized');
  }

  /**
   * Load a single plugin
   */
  async loadPlugin(manifest: PluginManifest): Promise<boolean> {
    const startTime = performance.now();
    
    try {
      console.log(`📥 Loading plugin: ${manifest.id}`);
      
      // Check dependencies
      if (!await this.checkDependencies(manifest)) {
        console.error(`❌ Dependencies not met for ${manifest.id}`);
        return false;
      }
      
      // Check required services
      if (!this.checkRequiredServices(manifest)) {
        console.error(`❌ Required services not available for ${manifest.id}`);
        return false;
      }
      
      // Load plugin module dynamically
      const pluginModule = await this.loadPluginModule(manifest.id);
      if (!pluginModule) {
        console.error(`❌ Failed to load module for ${manifest.id}`);
        return false;
      }
      
      // Initialize plugin instance
      const pluginInstance = await this.initializePlugin(pluginModule, manifest);
      
      // Register plugin hooks
      this.registerPluginHooks(manifest, pluginInstance);
      
      // Store loaded plugin
      const loadTime = performance.now() - startTime;
      this.loadedPlugins.set(manifest.id, {
        manifest,
        instance: pluginInstance,
        enabled: true,
        loadTime
      });
      
      // Fire plugin loaded action
      await this.hooks.doAction('plugin.loaded', manifest.id, pluginInstance);
      
      console.log(`✅ Plugin ${manifest.id} loaded in ${loadTime.toFixed(2)}ms`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to load plugin ${manifest.id}:`, error);
      return false;
    }
  }

  /**
   * Dynamically load plugin module
   */
  private async loadPluginModule(pluginId: string): Promise<any> {
    try {
      // Dynamic import of plugin module
      const module = await import(`/plugins/${pluginId}/index.tsx`);
      return module;
    } catch (error) {
      console.error(`Failed to load plugin module ${pluginId}:`, error);
      return null;
    }
  }

  /**
   * Initialize plugin with services
   */
  private async initializePlugin(module: any, manifest: PluginManifest): Promise<any> {
    // Get required services for this plugin
    const pluginServices: Record<string, any> = {};
    
    for (const serviceName of manifest.services) {
      const service = this.services.get(serviceName);
      if (service) {
        pluginServices[serviceName] = service;
      }
    }
    
    // Create plugin instance
    if (typeof module.default === 'function') {
      return new module.default({
        manifest,
        services: pluginServices,
        hooks: this.hooks
      });
    } else if (typeof module.Plugin === 'function') {
      return new module.Plugin({
        manifest,
        services: pluginServices,
        hooks: this.hooks
      });
    } else {
      return module;
    }
  }

  /**
   * Register plugin hooks
   */
  private registerPluginHooks(manifest: PluginManifest, instance: any): void {
    // Register actions
    if (manifest.hooks.actions) {
      for (const actionName of manifest.hooks.actions) {
        if (instance[actionName]) {
          this.hooks.addAction(
            actionName,
            instance[actionName].bind(instance),
            10,
            manifest.id
          );
        }
      }
    }
    
    // Register filters
    if (manifest.hooks.filters) {
      for (const filterName of manifest.hooks.filters) {
        if (instance[filterName]) {
          this.hooks.addFilter(
            filterName,
            instance[filterName].bind(instance),
            10,
            manifest.id
          );
        }
      }
    }
  }

  /**
   * Check plugin dependencies
   */
  private async checkDependencies(manifest: PluginManifest): Promise<boolean> {
    if (!manifest.dependencies?.plugins) {
      return true;
    }
    
    for (const dependencyId of manifest.dependencies.plugins) {
      if (!this.loadedPlugins.has(dependencyId)) {
        console.warn(`Missing dependency: ${dependencyId}`);
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check if required services are available
   */
  private checkRequiredServices(manifest: PluginManifest): boolean {
    for (const serviceName of manifest.services) {
      if (!this.services.has(serviceName)) {
        console.warn(`Missing required service: ${serviceName}`);
        return false;
      }
    }
    
    return true;
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(pluginId: string): Promise<boolean> {
    const plugin = this.loadedPlugins.get(pluginId);
    if (!plugin) {
      return false;
    }
    
    try {
      // Fire plugin unloading action
      await this.hooks.doAction('plugin.unloading', pluginId);
      
      // Call plugin cleanup if available
      if (plugin.instance && typeof plugin.instance.cleanup === 'function') {
        await plugin.instance.cleanup();
      }
      
      // Remove plugin hooks
      this.hooks.removePluginHooks(pluginId);
      
      // Remove from loaded plugins
      this.loadedPlugins.delete(pluginId);
      
      // Fire plugin unloaded action
      await this.hooks.doAction('plugin.unloaded', pluginId);
      
      console.log(`🗑️  Plugin ${pluginId} unloaded`);
      return true;
      
    } catch (error) {
      console.error(`Failed to unload plugin ${pluginId}:`, error);
      return false;
    }
  }

  /**
   * Register a service
   */
  registerService(name: string, service: any): void {
    this.services.set(name, service);
  }

  /**
   * Get loaded plugin
   */
  getPlugin(pluginId: string): LoadedPlugin | undefined {
    return this.loadedPlugins.get(pluginId);
  }

  /**
   * Get all loaded plugins
   */
  getAllLoadedPlugins(): LoadedPlugin[] {
    return Array.from(this.loadedPlugins.values());
  }
}