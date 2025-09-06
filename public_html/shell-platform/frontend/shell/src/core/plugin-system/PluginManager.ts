import { 
  Plugin, 
  PluginInstance, 
  PluginRegistry, 
  PluginStatus, 
  PluginLoadEvent, 
  PluginError,
  PluginContext 
} from '../../types/plugin.types';
import { EventEmitter } from './EventEmitter';
import { PluginSandbox } from './PluginSandbox';
import { PluginStorage } from './PluginStorage';
import { PluginValidator } from './PluginValidator';

export class PluginManager extends EventEmitter {
  private static instance: PluginManager;
  private plugins: Map<string, PluginInstance> = new Map();
  private registry: PluginRegistry | null = null;
  private sandbox: PluginSandbox;
  private storage: PluginStorage;
  private validator: PluginValidator;
  private loadingQueue: Set<string> = new Set();
  private context: PluginContext | null = null;

  private constructor() {
    super();
    this.sandbox = new PluginSandbox();
    this.storage = new PluginStorage('plugin-manager');
    this.validator = new PluginValidator();
    this.initializeHotReloading();
  }

  static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    await this.loadRegistry();
    await this.loadActivePlugins();
    this.emit('manager:initialized');
  }

  private async loadRegistry(): Promise<void> {
    try {
      const response = await fetch('/config/plugin-registry.json');
      if (!response.ok) {
        throw new Error(`Failed to load plugin registry: ${response.statusText}`);
      }
      this.registry = await response.json();
      this.emit('registry:loaded', this.registry);
    } catch (error) {
      console.error('Failed to load plugin registry:', error);
      this.emit('registry:error', error);
      throw error;
    }
  }

  private async loadActivePlugins(): Promise<void> {
    if (!this.registry) {
      throw new Error('Registry not loaded');
    }

    const activePlugins = this.registry.plugins.filter(plugin => 
      plugin.status === 'active'
    );

    // Load plugins in dependency order
    const sortedPlugins = this.sortPluginsByDependencies(activePlugins);
    
    for (const plugin of sortedPlugins) {
      await this.loadPlugin(plugin.id);
    }
  }

  private sortPluginsByDependencies(plugins: Plugin[]): Plugin[] {
    const sorted: Plugin[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (plugin: Plugin) => {
      if (visiting.has(plugin.id)) {
        throw new Error(`Circular dependency detected involving plugin: ${plugin.id}`);
      }
      if (visited.has(plugin.id)) {
        return;
      }

      visiting.add(plugin.id);

      // Visit dependencies first
      for (const dep of plugin.dependencies) {
        const depPlugin = plugins.find(p => p.id === dep.name);
        if (depPlugin && !dep.optional) {
          visit(depPlugin);
        }
      }

      visiting.delete(plugin.id);
      visited.add(plugin.id);
      sorted.push(plugin);
    };

    plugins.forEach(visit);
    return sorted;
  }

  async loadPlugin(pluginId: string): Promise<PluginInstance | null> {
    if (this.loadingQueue.has(pluginId)) {
      // Wait for ongoing load
      return new Promise((resolve) => {
        const onLoaded = (event: PluginLoadEvent) => {
          if (event.pluginId === pluginId) {
            this.off('plugin:loaded', onLoaded);
            this.off('plugin:error', onError);
            resolve(this.plugins.get(pluginId) || null);
          }
        };
        const onError = (event: PluginLoadEvent) => {
          if (event.pluginId === pluginId) {
            this.off('plugin:loaded', onLoaded);
            this.off('plugin:error', onError);
            resolve(null);
          }
        };
        this.on('plugin:loaded', onLoaded);
        this.on('plugin:error', onError);
      });
    }

    const plugin = this.getPluginConfig(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found in registry`);
    }

    this.loadingQueue.add(pluginId);
    
    try {
      // Validate plugin before loading
      const validationResult = await this.validator.validate(plugin);
      if (!validationResult.isValid) {
        throw new Error(`Plugin validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Check dependencies
      await this.checkDependencies(plugin);

      // Emit loading event
      this.emit('plugin:loading', { pluginId, status: 'loading' } as PluginLoadEvent);

      // Load the remote module
      const module = await this.loadRemoteModule(plugin);
      
      // Create plugin instance in sandbox
      const component = await this.sandbox.createPluginComponent(plugin, module, this.context!);
      
      const instance: PluginInstance = {
        plugin,
        module,
        component,
        isLoaded: true
      };

      this.plugins.set(pluginId, instance);

      // Update plugin status
      await this.updatePluginStatus(pluginId, 'active');

      // Execute lifecycle hooks
      await this.executeLifecycleHook(instance, 'onLoad');

      this.emit('plugin:loaded', { pluginId, status: 'loaded' } as PluginLoadEvent);
      
      return instance;
    } catch (error) {
      const pluginError: PluginError = {
        pluginId,
        error: error as Error,
        timestamp: new Date().toISOString(),
        context: 'load'
      };

      this.plugins.set(pluginId, {
        plugin,
        module: null,
        component: null as any,
        error: error as Error,
        isLoaded: false
      });

      await this.updatePluginStatus(pluginId, 'error');
      this.emit('plugin:error', { pluginId, status: 'error', error } as PluginLoadEvent);
      this.emit('plugin:error-detail', pluginError);
      
      throw error;
    } finally {
      this.loadingQueue.delete(pluginId);
    }
  }

  async unloadPlugin(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      return;
    }

    try {
      // Execute lifecycle hooks
      await this.executeLifecycleHook(instance, 'onUnload');

      // Remove from sandbox
      await this.sandbox.removePluginComponent(pluginId);

      // Update status
      await this.updatePluginStatus(pluginId, 'inactive');

      // Remove from memory
      this.plugins.delete(pluginId);

      this.emit('plugin:unloaded', { pluginId });
    } catch (error) {
      console.error(`Error unloading plugin ${pluginId}:`, error);
      throw error;
    }
  }

  async reloadPlugin(pluginId: string): Promise<PluginInstance | null> {
    await this.unloadPlugin(pluginId);
    return await this.loadPlugin(pluginId);
  }

  private async loadRemoteModule(plugin: Plugin): Promise<any> {
    try {
      // Clear module cache for hot reloading
      if (process.env.NODE_ENV === 'development') {
        delete (window as any).__webpack_require__.cache[plugin.remoteUrl];
      }

      // Load remote container
      await this.loadRemoteContainer(plugin.remoteUrl);
      
      // Get the container
      const container = (window as any)[this.getContainerName(plugin.id)];
      if (!container) {
        throw new Error(`Container for plugin ${plugin.id} not found`);
      }

      // Initialize container
      await container.init(__webpack_share_scopes__.default);
      
      // Get factory
      const factory = await container.get(plugin.exposedModule);
      
      // Execute factory
      const module = factory();
      
      return module;
    } catch (error) {
      console.error(`Failed to load remote module for plugin ${plugin.id}:`, error);
      throw error;
    }
  }

  private async loadRemoteContainer(remoteUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = remoteUrl;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load remote container: ${remoteUrl}`));
      document.head.appendChild(script);
    });
  }

  private getContainerName(pluginId: string): string {
    return pluginId.replace(/-/g, '_');
  }

  private async checkDependencies(plugin: Plugin): Promise<void> {
    for (const dependency of plugin.dependencies) {
      if (!dependency.optional) {
        const depInstance = this.plugins.get(dependency.name);
        if (!depInstance || !depInstance.isLoaded) {
          // Try to load the dependency
          await this.loadPlugin(dependency.name);
        }
      }
    }
  }

  private async executeLifecycleHook(instance: PluginInstance, hook: string): Promise<void> {
    if (instance.module && typeof instance.module[hook] === 'function') {
      try {
        await instance.module[hook](this.context);
      } catch (error) {
        console.warn(`Plugin ${instance.plugin.id} ${hook} hook failed:`, error);
      }
    }
  }

  private async updatePluginStatus(pluginId: string, status: PluginStatus): Promise<void> {
    if (!this.registry) return;

    const plugin = this.registry.plugins.find(p => p.id === pluginId);
    if (plugin) {
      plugin.status = status;
    }

    // Persist status change
    await this.storage.set(`plugin:${pluginId}:status`, status);
  }

  private initializeHotReloading(): void {
    if (process.env.NODE_ENV === 'development') {
      // Listen for hot reload events
      if ((module as any).hot) {
        (module as any).hot.accept(() => {
          this.emit('hot-reload');
        });
      }
    }
  }

  // Public API methods

  getPlugin(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId);
  }

  getPluginConfig(pluginId: string): Plugin | undefined {
    return this.registry?.plugins.find(p => p.id === pluginId);
  }

  getAllPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  getActivePlugins(): PluginInstance[] {
    return Array.from(this.plugins.values()).filter(instance => 
      instance.isLoaded && instance.plugin.status === 'active'
    );
  }

  getPluginsByCategory(category: string): PluginInstance[] {
    return Array.from(this.plugins.values()).filter(instance => 
      instance.plugin.category === category
    );
  }

  isPluginLoaded(pluginId: string): boolean {
    const instance = this.plugins.get(pluginId);
    return instance?.isLoaded ?? false;
  }

  async enablePlugin(pluginId: string): Promise<void> {
    if (!this.isPluginLoaded(pluginId)) {
      await this.loadPlugin(pluginId);
    }
    await this.updatePluginStatus(pluginId, 'active');
    this.emit('plugin:enabled', { pluginId });
  }

  async disablePlugin(pluginId: string): Promise<void> {
    await this.unloadPlugin(pluginId);
    await this.updatePluginStatus(pluginId, 'inactive');
    this.emit('plugin:disabled', { pluginId });
  }

  async installPlugin(plugin: Plugin): Promise<void> {
    if (!this.registry) {
      throw new Error('Registry not loaded');
    }

    // Validate plugin
    const validationResult = await this.validator.validate(plugin);
    if (!validationResult.isValid) {
      throw new Error(`Plugin validation failed: ${validationResult.errors.join(', ')}`);
    }

    // Add to registry
    this.registry.plugins.push(plugin);
    
    // Persist plugin
    await this.storage.set(`plugin:${plugin.id}:config`, plugin);
    
    // Load plugin
    await this.loadPlugin(plugin.id);
    
    this.emit('plugin:installed', { pluginId: plugin.id });
  }

  async uninstallPlugin(pluginId: string): Promise<void> {
    // Unload plugin
    await this.unloadPlugin(pluginId);
    
    // Remove from registry
    if (this.registry) {
      this.registry.plugins = this.registry.plugins.filter(p => p.id !== pluginId);
    }
    
    // Clean up storage
    await this.storage.remove(`plugin:${pluginId}:config`);
    await this.storage.remove(`plugin:${pluginId}:status`);
    
    this.emit('plugin:uninstalled', { pluginId });
  }

  getRegistry(): PluginRegistry | null {
    return this.registry;
  }

  async refreshRegistry(): Promise<void> {
    await this.loadRegistry();
  }
}

export default PluginManager;