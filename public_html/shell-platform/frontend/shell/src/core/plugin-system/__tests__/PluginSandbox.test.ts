import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PluginSandbox } from '../PluginSandbox';
import { Plugin, PluginContext } from '../../../types/plugin.types';
import { PluginEventBusImpl } from '../PluginEventBus';
import { PluginStorage } from '../PluginStorage';

// Mock React
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  createElement: jest.fn(),
  memo: jest.fn((component) => component)
}));

describe('PluginSandbox', () => {
  let sandbox: PluginSandbox;
  let mockPlugin: Plugin;
  let mockContext: PluginContext;
  let MockComponent: React.ComponentType<any>;

  beforeEach(() => {
    sandbox = new PluginSandbox();
    
    MockComponent = ({ pluginContext }) => {
      return React.createElement('div', { 'data-testid': 'mock-component' }, 'Test Component');
    };

    mockPlugin = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      description: 'Test plugin',
      author: 'Test Author',
      category: 'test',
      tags: ['test'],
      remoteUrl: 'http://localhost:3001/remoteEntry.js',
      exposedModule: './TestPlugin',
      permissions: ['read:dashboard', 'write:dashboard'],
      dependencies: [],
      configuration: {
        routes: [],
        menuItems: [],
        settings: [],
        features: []
      },
      status: 'active',
      metadata: {
        installDate: '2024-09-03T00:00:00Z',
        size: 100000,
        hash: 'test-hash'
      }
    };

    mockContext = {
      user: { id: 1, name: 'Test User' },
      theme: 'light',
      navigate: jest.fn(),
      notification: jest.fn(),
      eventBus: new PluginEventBusImpl(),
      storage: new PluginStorage('test')
    };
  });

  describe('createPluginComponent', () => {
    it('should create a sandboxed plugin component', async () => {
      const module = { default: MockComponent };
      
      const component = await sandbox.createPluginComponent(mockPlugin, module, mockContext);
      
      expect(component).toBeDefined();
      expect(typeof component).toBe('function');
    });

    it('should validate permissions before creating component', async () => {
      const pluginWithInvalidPermission = {
        ...mockPlugin,
        permissions: ['invalid:permission']
      };
      
      const module = { default: MockComponent };
      
      await expect(
        sandbox.createPluginComponent(pluginWithInvalidPermission, module, mockContext)
      ).rejects.toThrow('Invalid permission: invalid:permission');
    });

    it('should create scoped plugin context', async () => {
      const module = { default: MockComponent };
      
      await sandbox.createPluginComponent(mockPlugin, module, mockContext);
      
      const component = sandbox.getPluginComponent('test-plugin');
      expect(component).toBeDefined();
      expect(component?.context).toBeDefined();
    });
  });

  describe('sandbox security', () => {
    it('should restrict fetch to allowed domains', async () => {
      const module = { default: MockComponent };
      
      await sandbox.createPluginComponent(mockPlugin, module, mockContext);
      
      const sandboxedComponent = sandbox.getPluginComponent('test-plugin');
      const sandboxedContext = (sandboxedComponent as any)?.context;
      
      // Test same-origin fetch (should be allowed)
      global.fetch = jest.fn().mockResolvedValue({ ok: true });
      
      await expect(
        fetch('http://localhost:3000/api/test')
      ).resolves.toBeDefined();
      
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/test',
        expect.objectContaining({
          headers: expect.any(Headers)
        })
      );
    });

    it('should block unauthorized external requests', async () => {
      const module = { default: MockComponent };
      
      await sandbox.createPluginComponent(mockPlugin, module, mockContext);
      
      const restrictedFetch = (sandbox as any).createRestrictedFetch(mockPlugin);
      
      await expect(
        restrictedFetch('https://malicious-site.com/api')
      ).rejects.toThrow('Access denied');
    });

    it('should scope event bus to plugin', async () => {
      const module = { default: MockComponent };
      
      await sandbox.createPluginComponent(mockPlugin, module, mockContext);
      
      const component = sandbox.getPluginComponent('test-plugin');
      const pluginContext = (component as any)?.pluginContext;
      
      expect(pluginContext).toBeDefined();
      
      // Mock event emission
      const emitSpy = jest.spyOn(mockContext.eventBus, 'emit');
      
      pluginContext.eventBus.emit('test-event', { data: 'test' });
      
      expect(emitSpy).toHaveBeenCalledWith(
        'plugin:test-plugin:test-event',
        { data: 'test' }
      );
    });

    it('should scope storage to plugin', async () => {
      const module = { default: MockComponent };
      
      await sandbox.createPluginComponent(mockPlugin, module, mockContext);
      
      const component = sandbox.getPluginComponent('test-plugin');
      const pluginContext = (component as any)?.pluginContext;
      
      const setSpy = jest.spyOn(mockContext.storage, 'set');
      
      await pluginContext.storage.set('test-key', 'test-value');
      
      expect(setSpy).toHaveBeenCalledWith('plugin:test-plugin:test-key', 'test-value');
    });
  });

  describe('error handling', () => {
    it('should handle plugin component errors gracefully', async () => {
      const ErrorComponent = () => {
        throw new Error('Component error');
      };
      
      const module = { default: ErrorComponent };
      
      const component = await sandbox.createPluginComponent(mockPlugin, module, mockContext);
      
      expect(component).toBeDefined();
      
      // The error should be caught and handled by the wrapper
      expect(() => {
        React.createElement(component, {});
      }).not.toThrow();
    });

    it('should prefix console messages with plugin id', async () => {
      const module = { default: MockComponent };
      
      await sandbox.createPluginComponent(mockPlugin, module, mockContext);
      
      const sandboxedConsole = (sandbox as any).createSandbox(mockPlugin, mockContext).console;
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      sandboxedConsole.log('test message');
      
      expect(consoleSpy).toHaveBeenCalledWith('[test-plugin]', 'test message');
      
      consoleSpy.mockRestore();
    });
  });

  describe('component management', () => {
    it('should store and retrieve plugin components', async () => {
      const module = { default: MockComponent };
      
      await sandbox.createPluginComponent(mockPlugin, module, mockContext);
      
      const component = sandbox.getPluginComponent('test-plugin');
      
      expect(component).toBeDefined();
      expect(component?.id).toBe('test-plugin');
      expect(component?.plugin).toEqual(mockPlugin);
    });

    it('should remove plugin components', async () => {
      const module = { default: MockComponent };
      
      await sandbox.createPluginComponent(mockPlugin, module, mockContext);
      
      expect(sandbox.getPluginComponent('test-plugin')).toBeDefined();
      
      await sandbox.removePluginComponent('test-plugin');
      
      expect(sandbox.getPluginComponent('test-plugin')).toBeUndefined();
    });

    it('should get all components', async () => {
      const module1 = { default: MockComponent };
      const module2 = { default: MockComponent };
      
      const plugin2 = { ...mockPlugin, id: 'test-plugin-2' };
      
      await sandbox.createPluginComponent(mockPlugin, module1, mockContext);
      await sandbox.createPluginComponent(plugin2, module2, mockContext);
      
      const allComponents = sandbox.getAllComponents();
      
      expect(allComponents).toHaveLength(2);
      expect(allComponents.map(c => c.id)).toContain('test-plugin');
      expect(allComponents.map(c => c.id)).toContain('test-plugin-2');
    });

    it('should check plugin permissions', async () => {
      const module = { default: MockComponent };
      
      await sandbox.createPluginComponent(mockPlugin, module, mockContext);
      
      expect(sandbox.hasPermission('test-plugin', 'read:dashboard')).toBe(true);
      expect(sandbox.hasPermission('test-plugin', 'write:dashboard')).toBe(true);
      expect(sandbox.hasPermission('test-plugin', 'admin:settings')).toBe(false);
      expect(sandbox.hasPermission('non-existent', 'read:dashboard')).toBe(false);
    });
  });

  describe('sandbox utilities', () => {
    it('should wrap setTimeout/setInterval with error handling', async () => {
      const module = { default: MockComponent };
      
      await sandbox.createPluginComponent(mockPlugin, module, mockContext);
      
      const sandboxEnv = (sandbox as any).createSandbox(mockPlugin, mockContext);
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Test setTimeout with error
      const timeoutId = sandboxEnv.setTimeout(() => {
        throw new Error('Timer error');
      }, 0);
      
      // Wait for timeout to execute
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[test-plugin] setTimeout error:'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should provide sandboxed globals', async () => {
      const module = { default: MockComponent };
      
      await sandbox.createPluginComponent(mockPlugin, module, mockContext);
      
      const sandboxEnv = (sandbox as any).createSandbox(mockPlugin, mockContext);
      
      expect(sandboxEnv.React).toBeDefined();
      expect(sandboxEnv.console).toBeDefined();
      expect(sandboxEnv.fetch).toBeDefined();
      expect(sandboxEnv.pluginContext).toBeDefined();
      expect(sandboxEnv.setTimeout).toBeDefined();
      expect(sandboxEnv.clearTimeout).toBeDefined();
      expect(sandboxEnv.JSON).toBeDefined();
      expect(sandboxEnv.Date).toBeDefined();
      expect(sandboxEnv.Math).toBeDefined();
    });
  });
});