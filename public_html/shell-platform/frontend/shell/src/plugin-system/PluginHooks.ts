/**
 * Plugin Hooks System
 * WordPress-style hooks for plugin integration
 */

type HookCallback = (...args: any[]) => any | Promise<any>;

interface Hook {
  name: string;
  callback: HookCallback;
  priority: number;
  pluginId: string;
}

export class PluginHooks {
  private actions: Map<string, Hook[]>;
  private filters: Map<string, Hook[]>;
  private currentlyRunning: Set<string>;

  constructor() {
    this.actions = new Map();
    this.filters = new Map();
    this.currentlyRunning = new Set();
  }

  /**
   * Register an action hook
   */
  addAction(
    hookName: string, 
    callback: HookCallback, 
    priority = 10, 
    pluginId = 'core'
  ): void {
    const hook: Hook = {
      name: hookName,
      callback,
      priority,
      pluginId
    };

    if (!this.actions.has(hookName)) {
      this.actions.set(hookName, []);
    }

    const hooks = this.actions.get(hookName)!;
    hooks.push(hook);
    
    // Sort by priority
    hooks.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Register a filter hook
   */
  addFilter(
    hookName: string,
    callback: HookCallback,
    priority = 10,
    pluginId = 'core'
  ): void {
    const hook: Hook = {
      name: hookName,
      callback,
      priority,
      pluginId
    };

    if (!this.filters.has(hookName)) {
      this.filters.set(hookName, []);
    }

    const hooks = this.filters.get(hookName)!;
    hooks.push(hook);
    
    // Sort by priority
    hooks.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Execute an action hook
   */
  async doAction(hookName: string, ...args: any[]): Promise<void> {
    // Prevent infinite recursion
    if (this.currentlyRunning.has(hookName)) {
      console.warn(`Recursive action detected: ${hookName}`);
      return;
    }

    const hooks = this.actions.get(hookName);
    if (!hooks || hooks.length === 0) {
      return;
    }

    this.currentlyRunning.add(hookName);

    try {
      for (const hook of hooks) {
        try {
          await hook.callback(...args);
        } catch (error) {
          console.error(`Error in action ${hookName} from plugin ${hook.pluginId}:`, error);
        }
      }
    } finally {
      this.currentlyRunning.delete(hookName);
    }
  }

  /**
   * Apply a filter hook
   */
  async applyFilters(hookName: string, value: any, ...args: any[]): Promise<any> {
    const hooks = this.filters.get(hookName);
    if (!hooks || hooks.length === 0) {
      return value;
    }

    let filteredValue = value;

    for (const hook of hooks) {
      try {
        filteredValue = await hook.callback(filteredValue, ...args);
      } catch (error) {
        console.error(`Error in filter ${hookName} from plugin ${hook.pluginId}:`, error);
      }
    }

    return filteredValue;
  }

  /**
   * Remove an action hook
   */
  removeAction(hookName: string, pluginId: string): void {
    const hooks = this.actions.get(hookName);
    if (!hooks) return;

    const filtered = hooks.filter(hook => hook.pluginId !== pluginId);
    
    if (filtered.length === 0) {
      this.actions.delete(hookName);
    } else {
      this.actions.set(hookName, filtered);
    }
  }

  /**
   * Remove a filter hook
   */
  removeFilter(hookName: string, pluginId: string): void {
    const hooks = this.filters.get(hookName);
    if (!hooks) return;

    const filtered = hooks.filter(hook => hook.pluginId !== pluginId);
    
    if (filtered.length === 0) {
      this.filters.delete(hookName);
    } else {
      this.filters.set(hookName, filtered);
    }
  }

  /**
   * Remove all hooks for a plugin
   */
  removePluginHooks(pluginId: string): void {
    // Remove actions
    for (const [hookName, hooks] of this.actions.entries()) {
      const filtered = hooks.filter(hook => hook.pluginId !== pluginId);
      if (filtered.length === 0) {
        this.actions.delete(hookName);
      } else {
        this.actions.set(hookName, filtered);
      }
    }

    // Remove filters
    for (const [hookName, hooks] of this.filters.entries()) {
      const filtered = hooks.filter(hook => hook.pluginId !== pluginId);
      if (filtered.length === 0) {
        this.filters.delete(hookName);
      } else {
        this.filters.set(hookName, filtered);
      }
    }
  }

  /**
   * Check if action exists
   */
  hasAction(hookName: string): boolean {
    return this.actions.has(hookName) && this.actions.get(hookName)!.length > 0;
  }

  /**
   * Check if filter exists
   */
  hasFilter(hookName: string): boolean {
    return this.filters.has(hookName) && this.filters.get(hookName)!.length > 0;
  }

  /**
   * Get all registered hooks
   */
  getAllHooks(): { actions: string[], filters: string[] } {
    return {
      actions: Array.from(this.actions.keys()),
      filters: Array.from(this.filters.keys())
    };
  }

  /**
   * Clear all hooks
   */
  clearAllHooks(): void {
    this.actions.clear();
    this.filters.clear();
    this.currentlyRunning.clear();
  }
}