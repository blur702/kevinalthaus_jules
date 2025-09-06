/**
 * Router Service
 * Manages dynamic route registration for plugins
 */

import React from 'react';

export interface PluginRoute {
  path: string;
  component: React.ComponentType | (() => React.ComponentType);
  exact?: boolean;
  metadata?: any;
}

export class RouterService {
  private routes: Map<string, PluginRoute>;
  private hooks: any;
  private routeChangeCallbacks: Set<() => void>;

  constructor(hooks?: any) {
    this.hooks = hooks;
    this.routes = new Map();
    this.routeChangeCallbacks = new Set();
  }

  async initialize(): Promise<void> {
    console.log('Router service initialized');
  }

  /**
   * Register a route for a plugin
   */
  registerRoute(path: string, component: React.ComponentType | (() => React.ComponentType), metadata?: any): void {
    // Store route with plugin context
    this.routes.set(path, {
      path,
      component,
      exact: true,
      metadata
    });

    console.log(`📍 Route registered: ${path}`);
    
    // Notify listeners of route change
    this.notifyRouteChange();
    
    // Trigger hook for route registration
    if (this.hooks) {
      this.hooks.doAction('router.routes.changed', {
        action: 'register',
        path,
        metadata
      });
    }
  }

  /**
   * Remove a route
   */
  removeRoute(path: string): void {
    if (this.routes.delete(path)) {
      console.log(`🗑️ Route removed: ${path}`);
      this.notifyRouteChange();
      
      if (this.hooks) {
        this.hooks.doAction('router.routes.changed', {
          action: 'remove',
          path
        });
      }
    }
  }

  /**
   * Unregister route (alias for removeRoute)
   */
  unregisterRoute(path: string): void {
    this.removeRoute(path);
  }

  /**
   * Remove all routes for a plugin
   */
  removePluginRoutes(pluginId: string): void {
    const routesToRemove: string[] = [];
    
    // Find all routes belonging to this plugin
    this.routes.forEach((route, path) => {
      if (path.startsWith(`/${pluginId}`) || 
          route.metadata?.pluginId === pluginId) {
        routesToRemove.push(path);
      }
    });

    // Remove the routes
    routesToRemove.forEach(path => this.removeRoute(path));
  }

  /**
   * Get all registered routes
   */
  getRoutes(): PluginRoute[] {
    return Array.from(this.routes.values());
  }

  /**
   * Get a specific route
   */
  getRoute(path: string): PluginRoute | undefined {
    return this.routes.get(path);
  }

  /**
   * Check if a route exists
   */
  hasRoute(path: string): boolean {
    return this.routes.has(path);
  }

  /**
   * Subscribe to route changes
   */
  onRouteChange(callback: () => void): () => void {
    this.routeChangeCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.routeChangeCallbacks.delete(callback);
    };
  }

  /**
   * Notify all listeners of route changes
   */
  private notifyRouteChange(): void {
    this.routeChangeCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in route change callback:', error);
      }
    });
  }

  /**
   * Navigate to a route programmatically
   */
  navigate(path: string, params?: any): void {
    if (this.hooks) {
      this.hooks.doAction('router.navigate', { path, state: params });
    }
    // Fallback to browser history
    window.history.pushState(params, '', path);
  }

  /**
   * Get routes grouped by plugin
   */
  getRoutesByPlugin(): Map<string, PluginRoute[]> {
    const grouped = new Map<string, PluginRoute[]>();
    
    this.routes.forEach(route => {
      const pluginId = route.metadata?.pluginId || 'unknown';
      if (!grouped.has(pluginId)) {
        grouped.set(pluginId, []);
      }
      grouped.get(pluginId)!.push(route);
    });
    
    return grouped;
  }

  /**
   * Clear all routes
   */
  clearAllRoutes(): void {
    this.routes.clear();
    this.notifyRouteChange();
    if (this.hooks) {
      this.hooks.doAction('router.routes.cleared');
    }
  }
}
