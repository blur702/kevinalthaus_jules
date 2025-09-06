import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch, selectUser, selectEffectiveTheme } from '@/store';
import { addNotification } from '@/store/notification.slice';
import { PluginContext, PluginEventBus, PluginStorage } from '@/types';

// Event bus implementation
class EventBus implements PluginEventBus {
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  off(event: string, callback: (data: any) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  // Clean up all listeners
  cleanup(): void {
    this.listeners.clear();
  }

  // Get listener count for debugging
  getListenerCount(event?: string): number {
    if (event) {
      return this.listeners.get(event)?.size || 0;
    }
    let total = 0;
    this.listeners.forEach(listeners => {
      total += listeners.size;
    });
    return total;
  }
}

// Storage implementation using localStorage with plugin namespace
class PluginStorageImpl implements PluginStorage {
  private prefix: string;

  constructor(pluginId?: string) {
    this.prefix = pluginId ? `plugin_${pluginId}_` : 'shell_';
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get(key: string): Promise<any> {
    try {
      const item = localStorage.getItem(this.getKey(key));
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error getting item from plugin storage:', error);
      return null;
    }
  }

  async set(key: string, value: any): Promise<void> {
    try {
      localStorage.setItem(this.getKey(key), JSON.stringify(value));
    } catch (error) {
      console.error('Error setting item in plugin storage:', error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.getKey(key));
    } catch (error) {
      console.error('Error removing item from plugin storage:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(this.prefix));
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Error clearing plugin storage:', error);
      throw error;
    }
  }

  // Additional utility methods
  async has(key: string): Promise<boolean> {
    return localStorage.getItem(this.getKey(key)) !== null;
  }

  async keys(): Promise<string[]> {
    return Object.keys(localStorage)
      .filter(key => key.startsWith(this.prefix))
      .map(key => key.replace(this.prefix, ''));
  }
}

// Global event bus instance
let globalEventBus: EventBus | null = null;

const getGlobalEventBus = (): EventBus => {
  if (!globalEventBus) {
    globalEventBus = new EventBus();
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      globalEventBus?.cleanup();
    });
  }
  return globalEventBus;
};

export const usePluginContext = (pluginId?: string): PluginContext => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const theme = useAppSelector(selectEffectiveTheme);

  // Create notification function
  const notification = useCallback((
    message: string, 
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
  ) => {
    dispatch(addNotification({
      title: type.charAt(0).toUpperCase() + type.slice(1),
      message,
      type,
    }));
  }, [dispatch]);

  // Create enhanced notification function with more options
  const enhancedNotification = useCallback((
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    options?: {
      duration?: number;
      persistent?: boolean;
      actions?: Array<{
        label: string;
        action: () => void;
        style?: 'primary' | 'secondary' | 'danger';
      }>;
    }
  ) => {
    dispatch(addNotification({
      title,
      message,
      type,
      duration: options?.duration,
      persistent: options?.persistent,
      actions: options?.actions,
    }));
  }, [dispatch]);

  // Memoize event bus
  const eventBus = useMemo(() => getGlobalEventBus(), []);

  // Memoize storage with plugin namespace
  const storage = useMemo(() => new PluginStorageImpl(pluginId), [pluginId]);

  // Create navigation function
  const navigateWithHistory = useCallback((path: string, options?: { replace?: boolean }) => {
    navigate(path, { replace: options?.replace });
  }, [navigate]);

  // Create plugin context object
  const context = useMemo<PluginContext>(() => ({
    user,
    theme,
    navigate: navigateWithHistory,
    notification,
    eventBus,
    storage,
    
    // Additional utilities
    enhancedNotification,
    
    // Plugin metadata (if available)
    pluginId,
    
    // System information
    system: {
      version: '1.0.0', // This could come from package.json or environment
      buildTime: new Date().toISOString(), // This could be set at build time
      environment: import.meta.env.MODE,
    },
    
    // Feature flags (for progressive feature rollout)
    features: {
      // Add feature flags here as needed
      beta_features: import.meta.env.DEV,
      advanced_plugins: true,
    },
  }), [
    user,
    theme,
    navigateWithHistory,
    notification,
    eventBus,
    storage,
    enhancedNotification,
    pluginId,
  ]);

  return context;
};

// Hook for plugin-specific event handling
export const usePluginEventBus = () => {
  const eventBus = useMemo(() => getGlobalEventBus(), []);

  const emit = useCallback((event: string, data?: any) => {
    eventBus.emit(event, data);
  }, [eventBus]);

  const on = useCallback((event: string, callback: (data: any) => void) => {
    return eventBus.on(event, callback);
  }, [eventBus]);

  const off = useCallback((event: string, callback: (data: any) => void) => {
    eventBus.off(event, callback);
  }, [eventBus]);

  return { emit, on, off };
};

// Hook for plugin-specific storage
export const usePluginStorage = (pluginId?: string) => {
  const storage = useMemo(() => new PluginStorageImpl(pluginId), [pluginId]);

  return storage;
};

// Custom hook for plugin lifecycle management
export const usePluginLifecycle = (pluginId: string) => {
  const eventBus = usePluginEventBus();

  // Plugin lifecycle events
  const onMount = useCallback((callback: () => void) => {
    return eventBus.on(`plugin:${pluginId}:mount`, callback);
  }, [eventBus, pluginId]);

  const onUnmount = useCallback((callback: () => void) => {
    return eventBus.on(`plugin:${pluginId}:unmount`, callback);
  }, [eventBus, pluginId]);

  const onActivate = useCallback((callback: () => void) => {
    return eventBus.on(`plugin:${pluginId}:activate`, callback);
  }, [eventBus, pluginId]);

  const onDeactivate = useCallback((callback: () => void) => {
    return eventBus.on(`plugin:${pluginId}:deactivate`, callback);
  }, [eventBus, pluginId]);

  // Emit lifecycle events
  const emitMount = useCallback(() => {
    eventBus.emit(`plugin:${pluginId}:mount`);
  }, [eventBus, pluginId]);

  const emitUnmount = useCallback(() => {
    eventBus.emit(`plugin:${pluginId}:unmount`);
  }, [eventBus, pluginId]);

  return {
    onMount,
    onUnmount,
    onActivate,
    onDeactivate,
    emitMount,
    emitUnmount,
  };
};