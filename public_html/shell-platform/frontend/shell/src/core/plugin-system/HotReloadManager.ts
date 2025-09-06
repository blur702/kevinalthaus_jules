import { PluginManager } from './PluginManager';
import { EventEmitter } from './EventEmitter';

export interface HotReloadConfig {
  enabled: boolean;
  watchInterval: number;
  retryAttempts: number;
  retryDelay: number;
  excludePlugins: string[];
}

export interface PluginChange {
  pluginId: string;
  type: 'added' | 'modified' | 'removed';
  timestamp: number;
  oldVersion?: string;
  newVersion?: string;
}

export interface ReloadEvent {
  pluginId: string;
  status: 'reloading' | 'reloaded' | 'failed';
  error?: Error;
  attempt?: number;
}

export class HotReloadManager extends EventEmitter {
  private static instance: HotReloadManager;
  private pluginManager: PluginManager;
  private config: HotReloadConfig;
  private watchers: Map<string, NodeJS.Timeout> = new Map();
  private pluginStates: Map<string, { version: string; hash: string; lastModified: number }> = new Map();
  private reloadQueue: Set<string> = new Set();
  private isEnabled = false;

  private constructor() {
    super();
    this.pluginManager = PluginManager.getInstance();
    this.config = {
      enabled: process.env.NODE_ENV === 'development',
      watchInterval: 2000, // 2 seconds
      retryAttempts: 3,
      retryDelay: 1000, // 1 second
      excludePlugins: []
    };
  }

  static getInstance(): HotReloadManager {
    if (!HotReloadManager.instance) {
      HotReloadManager.instance = new HotReloadManager();
    }
    return HotReloadManager.instance;
  }

  async initialize(config?: Partial<HotReloadConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    if (!this.config.enabled) {
      console.log('[HotReload] Hot reloading disabled');
      return;
    }

    console.log('[HotReload] Initializing hot reload manager');
    
    // Initialize plugin states
    await this.initializePluginStates();
    
    // Set up global error handler for hot reload errors
    this.setupErrorHandler();
    
    // Set up webpack HMR integration if available
    this.setupWebpackHMR();
    
    this.isEnabled = true;
    this.emit('initialized');
    
    console.log('[HotReload] Hot reload manager initialized');
  }

  startWatching(pluginId?: string): void {
    if (!this.isEnabled) {
      console.warn('[HotReload] Hot reloading not initialized');
      return;
    }

    if (pluginId) {
      this.startWatchingPlugin(pluginId);
    } else {
      // Start watching all active plugins
      const activePlugins = this.pluginManager.getActivePlugins();
      activePlugins.forEach(instance => {
        if (!this.config.excludePlugins.includes(instance.plugin.id)) {
          this.startWatchingPlugin(instance.plugin.id);
        }
      });
    }
  }

  stopWatching(pluginId?: string): void {
    if (pluginId) {
      this.stopWatchingPlugin(pluginId);
    } else {
      // Stop watching all plugins
      this.watchers.forEach((_, id) => {
        this.stopWatchingPlugin(id);
      });
    }
  }

  private startWatchingPlugin(pluginId: string): void {
    if (this.watchers.has(pluginId)) {
      return; // Already watching
    }

    if (this.config.excludePlugins.includes(pluginId)) {
      return; // Excluded from hot reload
    }

    console.log(`[HotReload] Starting to watch plugin: ${pluginId}`);

    const watcher = setInterval(async () => {
      await this.checkPluginChanges(pluginId);
    }, this.config.watchInterval);

    this.watchers.set(pluginId, watcher);
  }

  private stopWatchingPlugin(pluginId: string): void {
    const watcher = this.watchers.get(pluginId);
    if (watcher) {
      clearInterval(watcher);
      this.watchers.delete(pluginId);
      console.log(`[HotReload] Stopped watching plugin: ${pluginId}`);
    }
  }

  private async initializePluginStates(): Promise<void> {
    const registry = this.pluginManager.getRegistry();
    if (!registry) {
      return;
    }

    for (const plugin of registry.plugins) {
      if (plugin.status === 'active') {
        try {
          const state = await this.getPluginState(plugin.id);
          this.pluginStates.set(plugin.id, state);
        } catch (error) {
          console.warn(`[HotReload] Failed to initialize state for plugin ${plugin.id}:`, error);
        }
      }
    }
  }

  private async getPluginState(pluginId: string): Promise<{ version: string; hash: string; lastModified: number }> {
    const plugin = this.pluginManager.getPluginConfig(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    try {
      // Try to get plugin metadata from remote
      const response = await fetch(plugin.remoteUrl.replace('remoteEntry.js', 'plugin-manifest.json'));
      
      if (response.ok) {
        const manifest = await response.json();
        return {
          version: manifest.version || plugin.version,
          hash: manifest.hash || plugin.metadata.hash,
          lastModified: manifest.lastModified || Date.now()
        };
      }
    } catch (error) {
      // Fallback to plugin config data
      console.debug(`[HotReload] Using fallback state for plugin ${pluginId}`);
    }

    return {
      version: plugin.version,
      hash: plugin.metadata.hash,
      lastModified: new Date(plugin.metadata.installDate).getTime()
    };
  }

  private async checkPluginChanges(pluginId: string): Promise<void> {
    if (this.reloadQueue.has(pluginId)) {
      return; // Already reloading
    }

    try {
      const currentState = this.pluginStates.get(pluginId);
      const newState = await this.getPluginState(pluginId);

      if (!currentState) {
        this.pluginStates.set(pluginId, newState);
        return;
      }

      // Check if plugin has changed
      const hasChanged = (
        currentState.version !== newState.version ||
        currentState.hash !== newState.hash ||
        currentState.lastModified < newState.lastModified
      );

      if (hasChanged) {
        console.log(`[HotReload] Plugin ${pluginId} has changed, triggering reload`);
        
        const change: PluginChange = {
          pluginId,
          type: 'modified',
          timestamp: Date.now(),
          oldVersion: currentState.version,
          newVersion: newState.version
        };

        this.emit('change', change);
        await this.reloadPlugin(pluginId, newState);
      }
    } catch (error) {
      console.error(`[HotReload] Error checking changes for plugin ${pluginId}:`, error);
    }
  }

  private async reloadPlugin(pluginId: string, newState: { version: string; hash: string; lastModified: number }): Promise<void> {
    if (this.reloadQueue.has(pluginId)) {
      return;
    }

    this.reloadQueue.add(pluginId);

    let attempt = 0;
    let success = false;

    while (attempt < this.config.retryAttempts && !success) {
      attempt++;

      try {
        console.log(`[HotReload] Reloading plugin ${pluginId} (attempt ${attempt})`);
        
        this.emit('reload', {
          pluginId,
          status: 'reloading',
          attempt
        } as ReloadEvent);

        // Clear module cache for webpack
        if (typeof window !== 'undefined' && (window as any).__webpack_require__) {
          const plugin = this.pluginManager.getPluginConfig(pluginId);
          if (plugin) {
            delete (window as any).__webpack_require__.cache[plugin.remoteUrl];
          }
        }

        // Reload the plugin through plugin manager
        await this.pluginManager.reloadPlugin(pluginId);

        // Update plugin state
        this.pluginStates.set(pluginId, newState);

        success = true;
        
        console.log(`[HotReload] Plugin ${pluginId} reloaded successfully`);
        
        this.emit('reload', {
          pluginId,
          status: 'reloaded'
        } as ReloadEvent);

      } catch (error) {
        console.error(`[HotReload] Failed to reload plugin ${pluginId} (attempt ${attempt}):`, error);
        
        if (attempt >= this.config.retryAttempts) {
          this.emit('reload', {
            pluginId,
            status: 'failed',
            error: error as Error,
            attempt
          } as ReloadEvent);
        } else {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        }
      }
    }

    this.reloadQueue.delete(pluginId);
  }

  private setupErrorHandler(): void {
    window.addEventListener('error', (event) => {
      const error = event.error;
      const filename = event.filename;

      // Check if error is from a plugin
      const pluginId = this.extractPluginIdFromError(filename, error);
      
      if (pluginId) {
        console.error(`[HotReload] Error in plugin ${pluginId}:`, error);
        
        this.emit('plugin-error', {
          pluginId,
          error,
          filename,
          timestamp: Date.now()
        });

        // Optionally attempt to reload the plugin
        if (this.shouldAutoReloadOnError(pluginId, error)) {
          this.scheduleReload(pluginId);
        }
      }
    });
  }

  private setupWebpackHMR(): void {
    if (typeof module !== 'undefined' && (module as any).hot) {
      (module as any).hot.accept();
      
      (module as any).hot.addStatusHandler((status: string) => {
        console.log(`[HotReload] Webpack HMR status: ${status}`);
        
        if (status === 'apply') {
          this.emit('webpack-hmr', { status: 'applying' });
        } else if (status === 'idle') {
          this.emit('webpack-hmr', { status: 'idle' });
        } else if (status === 'fail') {
          this.emit('webpack-hmr', { status: 'failed' });
        }
      });
    }
  }

  private extractPluginIdFromError(filename: string, error: Error): string | null {
    // Try to extract plugin ID from filename or stack trace
    if (filename) {
      const match = filename.match(/plugin[_-]([a-z0-9-]+)/i);
      if (match) {
        return match[1].replace('_', '-');
      }
    }

    // Check stack trace
    if (error.stack) {
      const stackMatch = error.stack.match(/plugin[_-]([a-z0-9-]+)/i);
      if (stackMatch) {
        return stackMatch[1].replace('_', '-');
      }
    }

    return null;
  }

  private shouldAutoReloadOnError(pluginId: string, error: Error): boolean {
    // Only auto-reload on certain types of errors in development
    if (process.env.NODE_ENV !== 'development') {
      return false;
    }

    // Don't auto-reload on syntax errors
    if (error.name === 'SyntaxError') {
      return false;
    }

    // Don't auto-reload if error occurred recently
    const recentErrors = this.getRecentErrors(pluginId);
    if (recentErrors.length > 3) {
      return false;
    }

    return true;
  }

  private scheduleReload(pluginId: string, delay = 1000): void {
    setTimeout(async () => {
      try {
        const newState = await this.getPluginState(pluginId);
        await this.reloadPlugin(pluginId, newState);
      } catch (error) {
        console.error(`[HotReload] Scheduled reload failed for plugin ${pluginId}:`, error);
      }
    }, delay);
  }

  private getRecentErrors(pluginId: string): any[] {
    // Implementation would track recent errors per plugin
    // For now, return empty array
    return [];
  }

  // Public API methods

  enable(): void {
    this.config.enabled = true;
    this.isEnabled = true;
    this.startWatching();
    console.log('[HotReload] Hot reloading enabled');
  }

  disable(): void {
    this.config.enabled = false;
    this.isEnabled = false;
    this.stopWatching();
    console.log('[HotReload] Hot reloading disabled');
  }

  isReloading(pluginId?: string): boolean {
    if (pluginId) {
      return this.reloadQueue.has(pluginId);
    }
    return this.reloadQueue.size > 0;
  }

  getWatchedPlugins(): string[] {
    return Array.from(this.watchers.keys());
  }

  getConfig(): HotReloadConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<HotReloadConfig>): void {
    this.config = { ...this.config, ...updates };
    
    if (!updates.enabled && this.isEnabled) {
      this.disable();
    } else if (updates.enabled && !this.isEnabled) {
      this.enable();
    }
  }

  forceReload(pluginId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        console.log(`[HotReload] Force reloading plugin: ${pluginId}`);
        
        const newState = await this.getPluginState(pluginId);
        await this.reloadPlugin(pluginId, newState);
        
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Development utilities

  debugInfo(): any {
    return {
      enabled: this.isEnabled,
      config: this.config,
      watchedPlugins: this.getWatchedPlugins(),
      pluginStates: Object.fromEntries(this.pluginStates),
      reloadQueue: Array.from(this.reloadQueue),
      activeWatchers: this.watchers.size
    };
  }

  clearState(): void {
    this.pluginStates.clear();
    console.log('[HotReload] Plugin states cleared');
  }

  // Cleanup
  destroy(): void {
    this.stopWatching();
    this.removeAllListeners();
    this.pluginStates.clear();
    this.reloadQueue.clear();
    this.isEnabled = false;
    console.log('[HotReload] Hot reload manager destroyed');
  }
}

export default HotReloadManager;