import React from 'react';
import { PluginContext, Plugin, PluginEventBus, PluginStorage } from '../../types/plugin.types';

export interface PluginLifecycle {
  onLoad?(context: PluginContext): Promise<void> | void;
  onUnload?(context: PluginContext): Promise<void> | void;
  onActivate?(context: PluginContext): Promise<void> | void;
  onDeactivate?(context: PluginContext): Promise<void> | void;
  onSettingsChange?(settings: any, context: PluginContext): Promise<void> | void;
  onThemeChange?(theme: string, context: PluginContext): Promise<void> | void;
  onUserChange?(user: any, context: PluginContext): Promise<void> | void;
}

export interface PluginAPI {
  // Navigation
  navigate(path: string): void;
  goBack(): void;
  
  // Notifications
  showNotification(message: string, type?: 'info' | 'success' | 'warning' | 'error', duration?: number): void;
  showConfirmDialog(title: string, message: string): Promise<boolean>;
  showInputDialog(title: string, message?: string, defaultValue?: string): Promise<string | null>;
  
  // Storage
  getStorage(): PluginStorage;
  
  // Events
  getEventBus(): PluginEventBus;
  
  // Theme
  getCurrentTheme(): string;
  setTheme(theme: string): void;
  
  // User
  getCurrentUser(): any;
  hasPermission(permission: string): boolean;
  
  // Plugin management
  getPluginConfig(): Plugin;
  updatePluginSettings(settings: any): Promise<void>;
  getPluginSettings(): Promise<any>;
  
  // Inter-plugin communication
  sendMessage(targetPluginId: string, message: any): void;
  broadcastMessage(message: any): void;
  
  // UI utilities
  registerMenuItem(item: any): void;
  unregisterMenuItem(itemId: string): void;
  registerWidget(widget: any): void;
  unregisterWidget(widgetId: string): void;
  
  // HTTP utilities
  makeApiCall(endpoint: string, options?: RequestInit): Promise<Response>;
  uploadFile(file: File, endpoint: string): Promise<Response>;
}

export abstract class PluginBase implements PluginLifecycle {
  protected context: PluginContext | null = null;
  protected api: PluginAPI | null = null;
  protected config: Plugin | null = null;
  private eventListeners: Map<string, Set<Function>> = new Map();

  // Abstract methods that plugins must implement
  abstract getComponent(): React.ComponentType<any>;
  abstract getName(): string;
  abstract getVersion(): string;

  // Lifecycle methods (optional overrides)
  async onLoad(context: PluginContext): Promise<void> {
    this.context = context;
    this.api = this.createAPI(context);
    console.log(`Plugin ${this.getName()} loaded`);
  }

  async onUnload(context: PluginContext): Promise<void> {
    // Clean up event listeners
    this.removeAllEventListeners();
    console.log(`Plugin ${this.getName()} unloaded`);
  }

  async onActivate(context: PluginContext): Promise<void> {
    console.log(`Plugin ${this.getName()} activated`);
  }

  async onDeactivate(context: PluginContext): Promise<void> {
    console.log(`Plugin ${this.getName()} deactivated`);
  }

  async onSettingsChange(settings: any, context: PluginContext): Promise<void> {
    console.log(`Plugin ${this.getName()} settings changed:`, settings);
  }

  async onThemeChange(theme: string, context: PluginContext): Promise<void> {
    console.log(`Plugin ${this.getName()} theme changed to:`, theme);
  }

  async onUserChange(user: any, context: PluginContext): Promise<void> {
    console.log(`Plugin ${this.getName()} user changed:`, user?.id);
  }

  // Protected helper methods for plugins
  protected getAPI(): PluginAPI {
    if (!this.api) {
      throw new Error('Plugin API not available. Make sure plugin is loaded.');
    }
    return this.api;
  }

  protected getContext(): PluginContext {
    if (!this.context) {
      throw new Error('Plugin context not available. Make sure plugin is loaded.');
    }
    return this.context;
  }

  protected addEventListener(event: string, callback: Function): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    
    this.eventListeners.get(event)!.add(callback);
    
    // Use the event bus from context
    const unsubscribe = this.context?.eventBus.on(event, callback as any);
    
    return () => {
      this.eventListeners.get(event)?.delete(callback);
      if (unsubscribe) unsubscribe();
    };
  }

  protected removeEventListener(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      this.context?.eventBus.off(event, callback as any);
    }
  }

  protected removeAllEventListeners(): void {
    this.eventListeners.forEach((listeners, event) => {
      listeners.forEach(callback => {
        this.context?.eventBus.off(event, callback as any);
      });
    });
    this.eventListeners.clear();
  }

  protected emitEvent(event: string, data?: any): void {
    this.context?.eventBus.emit(event, data);
  }

  // Create the API interface
  private createAPI(context: PluginContext): PluginAPI {
    return {
      // Navigation
      navigate: (path: string) => context.navigate(path),
      goBack: () => window.history.back(),

      // Notifications
      showNotification: (message: string, type = 'info', duration = 5000) => {
        context.notification(message, type);
      },
      
      showConfirmDialog: async (title: string, message: string): Promise<boolean> => {
        return new Promise((resolve) => {
          const confirmed = window.confirm(`${title}\n\n${message}`);
          resolve(confirmed);
        });
      },
      
      showInputDialog: async (title: string, message?: string, defaultValue?: string): Promise<string | null> => {
        return new Promise((resolve) => {
          const result = window.prompt(message || title, defaultValue || '');
          resolve(result);
        });
      },

      // Storage
      getStorage: () => context.storage,

      // Events
      getEventBus: () => context.eventBus,

      // Theme
      getCurrentTheme: () => context.theme,
      setTheme: (theme: string) => {
        context.eventBus.emit('theme:change', { theme });
      },

      // User
      getCurrentUser: () => context.user,
      hasPermission: (permission: string) => {
        return this.config?.permissions.includes(permission) ?? false;
      },

      // Plugin management
      getPluginConfig: () => {
        if (!this.config) {
          throw new Error('Plugin config not available');
        }
        return this.config;
      },
      
      updatePluginSettings: async (settings: any) => {
        if (!this.config) {
          throw new Error('Plugin config not available');
        }
        await context.storage.set('settings', settings);
        await this.onSettingsChange?.(settings, context);
      },
      
      getPluginSettings: async () => {
        return await context.storage.get('settings');
      },

      // Inter-plugin communication
      sendMessage: (targetPluginId: string, message: any) => {
        context.eventBus.emit(`plugin:${targetPluginId}:message`, {
          from: this.config?.id,
          message
        });
      },
      
      broadcastMessage: (message: any) => {
        context.eventBus.emit('plugin:broadcast', {
          from: this.config?.id,
          message
        });
      },

      // UI utilities
      registerMenuItem: (item: any) => {
        context.eventBus.emit('ui:menu:register', {
          pluginId: this.config?.id,
          item
        });
      },
      
      unregisterMenuItem: (itemId: string) => {
        context.eventBus.emit('ui:menu:unregister', {
          pluginId: this.config?.id,
          itemId
        });
      },
      
      registerWidget: (widget: any) => {
        context.eventBus.emit('ui:widget:register', {
          pluginId: this.config?.id,
          widget
        });
      },
      
      unregisterWidget: (widgetId: string) => {
        context.eventBus.emit('ui:widget:unregister', {
          pluginId: this.config?.id,
          widgetId
        });
      },

      // HTTP utilities
      makeApiCall: async (endpoint: string, options: RequestInit = {}) => {
        const headers = new Headers(options.headers);
        headers.set('X-Plugin-ID', this.config?.id || 'unknown');
        headers.set('X-Plugin-Version', this.config?.version || '0.0.0');
        
        return fetch(endpoint, {
          ...options,
          headers
        });
      },
      
      uploadFile: async (file: File, endpoint: string) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('pluginId', this.config?.id || 'unknown');
        
        const headers = new Headers();
        headers.set('X-Plugin-ID', this.config?.id || 'unknown');
        headers.set('X-Plugin-Version', this.config?.version || '0.0.0');
        
        return fetch(endpoint, {
          method: 'POST',
          body: formData,
          headers
        });
      }
    };
  }

  // Plugin configuration setter (called by plugin manager)
  setConfig(config: Plugin): void {
    this.config = config;
  }
}

// Utility decorator for plugin methods
export function pluginMethod(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  
  descriptor.value = function(...args: any[]) {
    try {
      const result = method.apply(this, args);
      
      // If method returns a promise, catch errors
      if (result instanceof Promise) {
        return result.catch((error) => {
          console.error(`Error in plugin method ${propertyName}:`, error);
          this.getAPI().showNotification(
            `Plugin error in ${propertyName}: ${error.message}`,
            'error'
          );
          throw error;
        });
      }
      
      return result;
    } catch (error) {
      console.error(`Error in plugin method ${propertyName}:`, error);
      this.getAPI().showNotification(
        `Plugin error in ${propertyName}: ${(error as Error).message}`,
        'error'
      );
      throw error;
    }
  };
  
  return descriptor;
}

// Type helpers for plugin development
export type PluginComponent<P = {}> = React.ComponentType<P & { pluginAPI: PluginAPI }>;

export interface PluginModule {
  default: PluginBase;
  onLoad?: (context: PluginContext) => Promise<void> | void;
  onUnload?: (context: PluginContext) => Promise<void> | void;
}