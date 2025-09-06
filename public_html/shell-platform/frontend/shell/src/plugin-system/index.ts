/**
 * Plugin System - Main export file
 * Provides the complete plugin architecture for the Shell Platform
 */

export * from './types';
export { PluginManager } from './PluginManager';
export { ServiceContainer } from './ServiceContainer';
export { EventBus } from './EventBus';
export { HookManager } from './HookManager';
export { PluginLoader } from './PluginLoader';
export { DependencyResolver } from './DependencyResolver';
export { PluginStorage } from './PluginStorage';

// Export all services
export * from './services';

// Initialize and export singleton instances
import { PluginManager } from './PluginManager';
import { ServiceContainer } from './ServiceContainer';
import { EventBus } from './EventBus';
import { HookManager } from './HookManager';

export const pluginManager = PluginManager.getInstance();
export const serviceContainer = ServiceContainer.getInstance();
export const eventBus = EventBus.getInstance();
export const hookManager = HookManager.getInstance();

/**
 * Initialize the plugin system
 */
export async function initializePluginSystem(): Promise<void> {
  try {
    console.log('Initializing Shell Platform Plugin System...');
    
    // Initialize plugin manager (which initializes services)
    await pluginManager.initialize();
    
    console.log('Plugin System initialized successfully');
    
    // Emit system ready event
    eventBus.emit('shell:ready', {
      timestamp: new Date().toISOString(),
      plugins: pluginManager.getPlugins().size,
    });
    
  } catch (error) {
    console.error('Failed to initialize plugin system:', error);
    throw error;
  }
}

/**
 * Plugin API exposed to plugins
 */
export const PluginAPI = {
  // Core managers
  plugins: pluginManager,
  services: serviceContainer,
  events: eventBus,
  hooks: hookManager,
  
  // Helper functions
  getService: (name: string) => serviceContainer.getService(name),
  emit: (event: string, data?: any) => eventBus.emit(event, data),
  on: (event: string, handler: (data: any) => void) => eventBus.on(event, handler),
  addFilter: (hook: string, handler: (data: any) => any, priority?: number) => 
    hookManager.addFilter(hook, handler, priority),
  addAction: (hook: string, handler: (data: any) => void, priority?: number) => 
    hookManager.addAction(hook, handler, priority),
  applyFilters: (hook: string, data: any, ...args: any[]) => 
    hookManager.applyFilters(hook, data, ...args),
  doAction: (hook: string, data?: any, ...args: any[]) => 
    hookManager.doAction(hook, data, ...args),
};

// Make Plugin API available globally for plugins
if (typeof window !== 'undefined') {
  (window as any).ShellPluginAPI = PluginAPI;
}