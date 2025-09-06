import React from 'react';
import { Plugin, PluginContext } from '../../types/plugin.types';

interface SandboxedComponent {
  id: string;
  component: React.ComponentType<any>;
  plugin: Plugin;
  context: PluginContext;
  permissions: Set<string>;
}

export class PluginSandbox {
  private components: Map<string, SandboxedComponent> = new Map();
  private allowedGlobals: Set<string> = new Set([
    'React',
    'ReactDOM',
    'console',
    'fetch',
    'setTimeout',
    'clearTimeout',
    'setInterval',
    'clearInterval',
    'Promise',
    'JSON',
    'Date',
    'Math',
    'Array',
    'Object',
    'String',
    'Number',
    'Boolean'
  ]);

  async createPluginComponent(
    plugin: Plugin, 
    module: any, 
    context: PluginContext
  ): Promise<React.ComponentType<any>> {
    // Validate permissions
    this.validatePermissions(plugin.permissions);

    // Create sandboxed environment
    const sandbox = this.createSandbox(plugin, context);

    // Wrap the plugin component with security boundary
    const WrappedComponent = this.wrapComponent(plugin, module.default || module, sandbox);

    const sandboxedComponent: SandboxedComponent = {
      id: plugin.id,
      component: WrappedComponent,
      plugin,
      context,
      permissions: new Set(plugin.permissions)
    };

    this.components.set(plugin.id, sandboxedComponent);

    return WrappedComponent;
  }

  private validatePermissions(permissions: string[]): void {
    const validPermissions = [
      'read:dashboard',
      'write:dashboard',
      'read:users',
      'write:users',
      'delete:users',
      'manage:roles',
      'manage:permissions',
      'read:analytics',
      'write:analytics',
      'read:reports',
      'generate:reports',
      'read:settings',
      'write:settings',
      'admin:settings',
      'read:files',
      'write:files',
      'delete:files',
      'upload:files',
      'download:files',
      'read:metrics'
    ];

    for (const permission of permissions) {
      if (!validPermissions.includes(permission)) {
        throw new Error(`Invalid permission: ${permission}`);
      }
    }
  }

  private createSandbox(plugin: Plugin, context: PluginContext): any {
    const sandbox = {
      // Allowed globals
      React: React,
      console: {
        log: (...args: any[]) => console.log(`[${plugin.id}]`, ...args),
        warn: (...args: any[]) => console.warn(`[${plugin.id}]`, ...args),
        error: (...args: any[]) => console.error(`[${plugin.id}]`, ...args),
        info: (...args: any[]) => console.info(`[${plugin.id}]`, ...args)
      },
      
      // Restricted fetch
      fetch: this.createRestrictedFetch(plugin),
      
      // Plugin context
      pluginContext: this.createPluginContext(plugin, context),
      
      // Utilities
      setTimeout: (callback: Function, delay: number) => {
        return setTimeout(() => {
          try {
            callback();
          } catch (error) {
            console.error(`[${plugin.id}] setTimeout error:`, error);
          }
        }, delay);
      },
      
      setInterval: (callback: Function, delay: number) => {
        return setInterval(() => {
          try {
            callback();
          } catch (error) {
            console.error(`[${plugin.id}] setInterval error:`, error);
          }
        }, delay);
      },
      
      clearTimeout,
      clearInterval,
      Promise,
      JSON,
      Date,
      Math,
      Array,
      Object,
      String,
      Number,
      Boolean
    };

    return sandbox;
  }

  private createRestrictedFetch(plugin: Plugin): typeof fetch {
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString();
      
      // Check if URL is allowed
      if (!this.isUrlAllowed(url, plugin)) {
        throw new Error(`Access denied: ${url} is not in the allowed domains for plugin ${plugin.id}`);
      }

      // Add plugin identification header
      const headers = new Headers(init?.headers);
      headers.set('X-Plugin-ID', plugin.id);
      headers.set('X-Plugin-Version', plugin.version);

      return fetch(input, {
        ...init,
        headers
      });
    };
  }

  private isUrlAllowed(url: string, plugin: Plugin): boolean {
    try {
      const urlObj = new URL(url);
      
      // Allow same-origin requests
      if (urlObj.origin === window.location.origin) {
        return true;
      }

      // Check if plugin has specific allowed domains in metadata
      const allowedDomains = (plugin as any).allowedDomains || [];
      return allowedDomains.some((domain: string) => 
        urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
      );
    } catch {
      return false;
    }
  }

  private createPluginContext(plugin: Plugin, context: PluginContext): PluginContext {
    return {
      ...context,
      // Wrap notification function with plugin ID
      notification: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => {
        context.notification(`[${plugin.name}] ${message}`, type);
      },
      
      // Scoped storage
      storage: {
        get: (key: string) => context.storage.get(`plugin:${plugin.id}:${key}`),
        set: (key: string, value: any) => context.storage.set(`plugin:${plugin.id}:${key}`, value),
        remove: (key: string) => context.storage.remove(`plugin:${plugin.id}:${key}`),
        clear: () => {
          // Only clear plugin's own data
          return context.storage.remove(`plugin:${plugin.id}`);
        }
      },
      
      // Scoped event bus
      eventBus: {
        emit: (event: string, data?: any) => {
          context.eventBus.emit(`plugin:${plugin.id}:${event}`, data);
        },
        on: (event: string, callback: (data: any) => void) => {
          return context.eventBus.on(`plugin:${plugin.id}:${event}`, callback);
        },
        off: (event: string, callback: (data: any) => void) => {
          context.eventBus.off(`plugin:${plugin.id}:${event}`, callback);
        }
      }
    };
  }

  private wrapComponent(
    plugin: Plugin, 
    Component: React.ComponentType<any>, 
    sandbox: any
  ): React.ComponentType<any> {
    return React.memo((props: any) => {
      // Error boundary wrapper
      const [error, setError] = React.useState<Error | null>(null);

      React.useEffect(() => {
        const handleError = (event: ErrorEvent) => {
          if (event.filename?.includes(plugin.id)) {
            setError(new Error(event.message));
          }
        };

        window.addEventListener('error', handleError);
        return () => window.removeEventListener('error', handleError);
      }, [plugin.id]);

      if (error) {
        return React.createElement('div', {
          className: 'plugin-error-boundary',
          style: {
            padding: '20px',
            border: '1px solid #ff6b6b',
            borderRadius: '4px',
            backgroundColor: '#ffe0e0',
            color: '#d63031',
            margin: '10px 0'
          }
        }, [
          React.createElement('h3', { key: 'title' }, `Plugin Error: ${plugin.name}`),
          React.createElement('p', { key: 'message' }, error.message),
          React.createElement('button', {
            key: 'retry',
            onClick: () => setError(null),
            style: {
              padding: '8px 16px',
              backgroundColor: '#ff6b6b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }
          }, 'Retry')
        ]);
      }

      try {
        // Execute component in sandbox context
        return React.createElement(Component, {
          ...props,
          pluginContext: sandbox.pluginContext
        });
      } catch (componentError) {
        console.error(`Plugin ${plugin.id} render error:`, componentError);
        setError(componentError as Error);
        return null;
      }
    });
  }

  async removePluginComponent(pluginId: string): Promise<void> {
    const component = this.components.get(pluginId);
    if (component) {
      this.components.delete(pluginId);
      
      // Cleanup any timers or event listeners
      // This is handled by React's cleanup mechanisms
    }
  }

  hasPermission(pluginId: string, permission: string): boolean {
    const component = this.components.get(pluginId);
    return component?.permissions.has(permission) ?? false;
  }

  getPluginComponent(pluginId: string): SandboxedComponent | undefined {
    return this.components.get(pluginId);
  }

  getAllComponents(): SandboxedComponent[] {
    return Array.from(this.components.values());
  }
}