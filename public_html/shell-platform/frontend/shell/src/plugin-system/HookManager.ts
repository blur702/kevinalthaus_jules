/**
 * HookManager - WordPress-style hooks system
 * Allows plugins to modify data and inject functionality
 */

export interface HookHandler {
  pluginId: string;
  handler: string | ((data: any) => any);
  priority: number;
}

export class HookManager {
  private static instance: HookManager;
  private filters: Map<string, HookHandler[]> = new Map();
  private actions: Map<string, HookHandler[]> = new Map();

  private constructor() {}

  public static getInstance(): HookManager {
    if (!HookManager.instance) {
      HookManager.instance = new HookManager();
    }
    return HookManager.instance;
  }

  /**
   * Register a filter hook
   */
  public addFilter(
    hookName: string, 
    handler: HookHandler | ((data: any) => any),
    priority: number = 10
  ): void {
    const hookHandler: HookHandler = 
      typeof handler === 'function'
        ? { pluginId: 'anonymous', handler, priority }
        : handler;

    if (!this.filters.has(hookName)) {
      this.filters.set(hookName, []);
    }

    const handlers = this.filters.get(hookName)!;
    handlers.push(hookHandler);
    handlers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Register an action hook
   */
  public addAction(
    hookName: string,
    handler: HookHandler | ((data: any) => void),
    priority: number = 10
  ): void {
    const hookHandler: HookHandler = 
      typeof handler === 'function'
        ? { pluginId: 'anonymous', handler, priority }
        : handler;

    if (!this.actions.has(hookName)) {
      this.actions.set(hookName, []);
    }

    const handlers = this.actions.get(hookName)!;
    handlers.push(hookHandler);
    handlers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Apply filters to data
   */
  public applyFilters(hookName: string, data: any, ...args: any[]): any {
    const handlers = this.filters.get(hookName);
    if (!handlers) return data;

    let filtered = data;
    for (const handler of handlers) {
      try {
        if (typeof handler.handler === 'function') {
          filtered = handler.handler(filtered, ...args);
        } else {
          // Handler is a string reference to a method
          console.warn(`String handler references not yet implemented: ${handler.handler}`);
        }
      } catch (error) {
        console.error(`Error in filter ${hookName}:`, error);
      }
    }

    return filtered;
  }

  /**
   * Execute actions
   */
  public doAction(hookName: string, data?: any, ...args: any[]): void {
    const handlers = this.actions.get(hookName);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        if (typeof handler.handler === 'function') {
          handler.handler(data, ...args);
        } else {
          // Handler is a string reference to a method
          console.warn(`String handler references not yet implemented: ${handler.handler}`);
        }
      } catch (error) {
        console.error(`Error in action ${hookName}:`, error);
      }
    }
  }

  /**
   * Execute actions asynchronously
   */
  public async doActionAsync(hookName: string, data?: any, ...args: any[]): Promise<void> {
    const handlers = this.actions.get(hookName);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        if (typeof handler.handler === 'function') {
          await handler.handler(data, ...args);
        }
      } catch (error) {
        console.error(`Error in async action ${hookName}:`, error);
      }
    }
  }

  /**
   * Remove a filter
   */
  public removeFilter(hookName: string, pluginIdOrHandler: string | Function): void {
    const handlers = this.filters.get(hookName);
    if (!handlers) return;

    const filtered = handlers.filter(h => {
      if (typeof pluginIdOrHandler === 'string') {
        return h.pluginId !== pluginIdOrHandler;
      } else {
        return h.handler !== pluginIdOrHandler;
      }
    });

    if (filtered.length > 0) {
      this.filters.set(hookName, filtered);
    } else {
      this.filters.delete(hookName);
    }
  }

  /**
   * Remove an action
   */
  public removeAction(hookName: string, pluginIdOrHandler: string | Function): void {
    const handlers = this.actions.get(hookName);
    if (!handlers) return;

    const filtered = handlers.filter(h => {
      if (typeof pluginIdOrHandler === 'string') {
        return h.pluginId !== pluginIdOrHandler;
      } else {
        return h.handler !== pluginIdOrHandler;
      }
    });

    if (filtered.length > 0) {
      this.actions.set(hookName, filtered);
    } else {
      this.actions.delete(hookName);
    }
  }

  /**
   * Register a hook (generic method used by PluginManager)
   */
  public register(hookName: string, handler: HookHandler): void {
    // Determine if it's a filter or action based on naming convention
    if (hookName.includes('filter_') || hookName.includes('_filter')) {
      this.addFilter(hookName, handler);
    } else {
      this.addAction(hookName, handler);
    }
  }

  /**
   * Unregister all hooks for a plugin
   */
  public unregister(hookName: string, pluginId: string): void {
    this.removeFilter(hookName, pluginId);
    this.removeAction(hookName, pluginId);
  }

  /**
   * Remove all hooks for a plugin
   */
  public removePluginHooks(pluginId: string): void {
    // Remove from filters
    for (const [hookName, handlers] of this.filters) {
      const filtered = handlers.filter(h => h.pluginId !== pluginId);
      if (filtered.length > 0) {
        this.filters.set(hookName, filtered);
      } else {
        this.filters.delete(hookName);
      }
    }

    // Remove from actions
    for (const [hookName, handlers] of this.actions) {
      const filtered = handlers.filter(h => h.pluginId !== pluginId);
      if (filtered.length > 0) {
        this.actions.set(hookName, filtered);
      } else {
        this.actions.delete(hookName);
      }
    }
  }

  /**
   * Check if hook has handlers
   */
  public hasFilter(hookName: string): boolean {
    return this.filters.has(hookName) && this.filters.get(hookName)!.length > 0;
  }

  /**
   * Check if action has handlers
   */
  public hasAction(hookName: string): boolean {
    return this.actions.has(hookName) && this.actions.get(hookName)!.length > 0;
  }

  /**
   * Get all registered hooks
   */
  public getHooks(): { filters: string[]; actions: string[] } {
    return {
      filters: Array.from(this.filters.keys()),
      actions: Array.from(this.actions.keys()),
    };
  }

  /**
   * Clear all hooks (for testing)
   */
  public clear(): void {
    this.filters.clear();
    this.actions.clear();
  }
}