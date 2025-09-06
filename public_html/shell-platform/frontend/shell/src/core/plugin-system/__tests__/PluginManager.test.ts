import { PluginManager } from '../PluginManager';
import { PluginContext, Plugin, PluginRegistry } from '../../../types/plugin.types';
import { PluginEventBusImpl } from '../PluginEventBus';
import { PluginStorage } from '../PluginStorage';

// Mock fetch globally
global.fetch = jest.fn();

// Mock webpack share scopes
(global as any).__webpack_share_scopes__ = {
  default: {}
};

// Mock window for tests
Object.defineProperty(window, 'location', {
  value: {
    origin: 'http://localhost:3000'
  },
  writable: true
});

describe('PluginManager', () => {
  let pluginManager: PluginManager;
  let mockContext: PluginContext;
  let mockRegistry: PluginRegistry;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance
    (PluginManager as any).instance = undefined;
    
    pluginManager = PluginManager.getInstance();
    
    mockContext = {
      user: { id: 1, name: 'Test User' },
      theme: 'light',
      navigate: jest.fn(),
      notification: jest.fn(),
      eventBus: new PluginEventBusImpl(),
      storage: new PluginStorage('test')
    };

    mockRegistry = {
      version: '1.0.0',
      lastUpdate: '2024-09-03T00:00:00Z',
      categories: [
        {
          id: 'test',
          name: 'Test Category',
          description: 'Test category for plugins',
          order: 1
        }
      ],
      plugins: [
        {
          id: 'test-plugin',
          name: 'Test Plugin',
          version: '1.0.0',
          description: 'A test plugin',
          author: 'Test Author',
          category: 'test',
          tags: ['test'],
          remoteUrl: 'http://localhost:3001/remoteEntry.js',
          exposedModule: './TestPlugin',
          permissions: ['read:test'],
          dependencies: [],
          configuration: {
            routes: [
              {
                path: '/test',
                component: 'TestComponent',
                exact: true,
                title: 'Test',
                protected: true,
                permissions: ['read:test']
              }
            ],
            menuItems: [
              {
                id: 'test',
                label: 'Test',
                path: '/test',
                order: 1,
                permissions: ['read:test']
              }
            ],
            settings: [],
            features: ['test-feature']
          },
          status: 'active',
          metadata: {
            installDate: '2024-09-03T00:00:00Z',
            size: 100000,
            hash: 'test-hash'
          }
        }
      ]
    };
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = PluginManager.getInstance();
      const instance2 = PluginManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should initialize plugin manager with context', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegistry
      });

      await expect(pluginManager.initialize(mockContext)).resolves.not.toThrow();
      
      expect(fetch).toHaveBeenCalledWith('/config/plugin-registry.json');
      expect(pluginManager.getRegistry()).toEqual(mockRegistry);
    });

    it('should throw error if registry load fails', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found'
      });

      await expect(pluginManager.initialize(mockContext)).rejects.toThrow(
        'Failed to load plugin registry: Not Found'
      );
    });
  });

  describe('loadPlugin', () => {
    beforeEach(async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegistry
      });

      await pluginManager.initialize(mockContext);
    });

    it('should load plugin successfully', async () => {
      // Mock remote module loading
      const mockModule = {
        default: jest.fn(),
        onLoad: jest.fn()
      };

      // Mock script loading
      const mockScript = {
        onload: null,
        onerror: null,
        src: ''
      } as any;

      jest.spyOn(document, 'createElement').mockReturnValue(mockScript);
      jest.spyOn(document.head, 'appendChild').mockImplementation((script) => {
        setTimeout(() => {
          if (script.onload) script.onload();
        }, 0);
        return script;
      });

      // Mock container
      (window as any).test_plugin = {
        init: jest.fn(),
        get: jest.fn().mockResolvedValue(() => mockModule)
      };

      const instance = await pluginManager.loadPlugin('test-plugin');
      
      expect(instance).toBeDefined();
      expect(instance?.plugin.id).toBe('test-plugin');
      expect(instance?.isLoaded).toBe(true);
    });

    it('should handle plugin load error', async () => {
      // Mock script loading failure
      const mockScript = {
        onload: null,
        onerror: null,
        src: ''
      } as any;

      jest.spyOn(document, 'createElement').mockReturnValue(mockScript);
      jest.spyOn(document.head, 'appendChild').mockImplementation((script) => {
        setTimeout(() => {
          if (script.onerror) script.onerror();
        }, 0);
        return script;
      });

      await expect(pluginManager.loadPlugin('test-plugin')).rejects.toThrow();
    });

    it('should prevent loading non-existent plugin', async () => {
      await expect(pluginManager.loadPlugin('non-existent')).rejects.toThrow(
        'Plugin non-existent not found in registry'
      );
    });

    it('should handle concurrent loading of same plugin', async () => {
      // Mock successful loading
      const mockModule = { default: jest.fn() };
      const mockScript = {
        onload: null,
        onerror: null,
        src: ''
      } as any;

      jest.spyOn(document, 'createElement').mockReturnValue(mockScript);
      jest.spyOn(document.head, 'appendChild').mockImplementation((script) => {
        setTimeout(() => {
          if (script.onload) script.onload();
        }, 100); // Delay to test concurrent access
        return script;
      });

      (window as any).test_plugin = {
        init: jest.fn(),
        get: jest.fn().mockResolvedValue(() => mockModule)
      };

      // Start two concurrent loads
      const promise1 = pluginManager.loadPlugin('test-plugin');
      const promise2 = pluginManager.loadPlugin('test-plugin');

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result1?.plugin.id).toBe(result2?.plugin.id);
    });
  });

  describe('unloadPlugin', () => {
    beforeEach(async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegistry
      });

      await pluginManager.initialize(mockContext);
    });

    it('should unload plugin successfully', async () => {
      // First load a plugin
      const mockModule = {
        default: jest.fn(),
        onUnload: jest.fn()
      };

      const mockScript = {
        onload: null,
        onerror: null,
        src: ''
      } as any;

      jest.spyOn(document, 'createElement').mockReturnValue(mockScript);
      jest.spyOn(document.head, 'appendChild').mockImplementation((script) => {
        setTimeout(() => {
          if (script.onload) script.onload();
        }, 0);
        return script;
      });

      (window as any).test_plugin = {
        init: jest.fn(),
        get: jest.fn().mockResolvedValue(() => mockModule)
      };

      await pluginManager.loadPlugin('test-plugin');
      
      // Now unload it
      await expect(pluginManager.unloadPlugin('test-plugin')).resolves.not.toThrow();
      
      expect(mockModule.onUnload).toHaveBeenCalled();
      expect(pluginManager.getPlugin('test-plugin')).toBeUndefined();
    });

    it('should handle unloading non-loaded plugin', async () => {
      await expect(pluginManager.unloadPlugin('non-existent')).resolves.not.toThrow();
    });
  });

  describe('sortPluginsByDependencies', () => {
    it('should sort plugins by dependencies correctly', () => {
      const plugins = [
        {
          ...mockRegistry.plugins[0],
          id: 'plugin-b',
          dependencies: [{ name: 'plugin-a', version: '1.0.0' }]
        },
        {
          ...mockRegistry.plugins[0],
          id: 'plugin-a',
          dependencies: []
        },
        {
          ...mockRegistry.plugins[0],
          id: 'plugin-c',
          dependencies: [{ name: 'plugin-b', version: '1.0.0' }]
        }
      ];

      const sorted = (pluginManager as any).sortPluginsByDependencies(plugins);
      
      expect(sorted[0].id).toBe('plugin-a');
      expect(sorted[1].id).toBe('plugin-b');
      expect(sorted[2].id).toBe('plugin-c');
    });

    it('should detect circular dependencies', () => {
      const plugins = [
        {
          ...mockRegistry.plugins[0],
          id: 'plugin-a',
          dependencies: [{ name: 'plugin-b', version: '1.0.0' }]
        },
        {
          ...mockRegistry.plugins[0],
          id: 'plugin-b',
          dependencies: [{ name: 'plugin-a', version: '1.0.0' }]
        }
      ];

      expect(() => {
        (pluginManager as any).sortPluginsByDependencies(plugins);
      }).toThrow('Circular dependency detected involving plugin: plugin-a');
    });
  });

  describe('getters', () => {
    beforeEach(async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegistry
      });

      await pluginManager.initialize(mockContext);
    });

    it('should get plugin config by id', () => {
      const config = pluginManager.getPluginConfig('test-plugin');
      
      expect(config).toBeDefined();
      expect(config?.id).toBe('test-plugin');
      expect(config?.name).toBe('Test Plugin');
    });

    it('should return undefined for non-existent plugin config', () => {
      const config = pluginManager.getPluginConfig('non-existent');
      
      expect(config).toBeUndefined();
    });

    it('should get all plugins', () => {
      const plugins = pluginManager.getAllPlugins();
      
      expect(Array.isArray(plugins)).toBe(true);
    });

    it('should get active plugins', () => {
      const activePlugins = pluginManager.getActivePlugins();
      
      expect(Array.isArray(activePlugins)).toBe(true);
    });

    it('should get plugins by category', () => {
      const testPlugins = pluginManager.getPluginsByCategory('test');
      
      expect(Array.isArray(testPlugins)).toBe(true);
    });

    it('should check if plugin is loaded', () => {
      const isLoaded = pluginManager.isPluginLoaded('test-plugin');
      
      expect(typeof isLoaded).toBe('boolean');
    });

    it('should get registry', () => {
      const registry = pluginManager.getRegistry();
      
      expect(registry).toEqual(mockRegistry);
    });
  });

  describe('plugin lifecycle', () => {
    beforeEach(async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegistry
      });

      await pluginManager.initialize(mockContext);
    });

    it('should enable plugin', async () => {
      const mockModule = {
        default: jest.fn(),
        onLoad: jest.fn()
      };

      const mockScript = {
        onload: null,
        onerror: null,
        src: ''
      } as any;

      jest.spyOn(document, 'createElement').mockReturnValue(mockScript);
      jest.spyOn(document.head, 'appendChild').mockImplementation((script) => {
        setTimeout(() => {
          if (script.onload) script.onload();
        }, 0);
        return script;
      });

      (window as any).test_plugin = {
        init: jest.fn(),
        get: jest.fn().mockResolvedValue(() => mockModule)
      };

      await expect(pluginManager.enablePlugin('test-plugin')).resolves.not.toThrow();
    });

    it('should disable plugin', async () => {
      await expect(pluginManager.disablePlugin('test-plugin')).resolves.not.toThrow();
    });

    it('should reload plugin', async () => {
      const mockModule = {
        default: jest.fn(),
        onLoad: jest.fn(),
        onUnload: jest.fn()
      };

      const mockScript = {
        onload: null,
        onerror: null,
        src: ''
      } as any;

      jest.spyOn(document, 'createElement').mockReturnValue(mockScript);
      jest.spyOn(document.head, 'appendChild').mockImplementation((script) => {
        setTimeout(() => {
          if (script.onload) script.onload();
        }, 0);
        return script;
      });

      (window as any).test_plugin = {
        init: jest.fn(),
        get: jest.fn().mockResolvedValue(() => mockModule)
      };

      // First load the plugin
      await pluginManager.loadPlugin('test-plugin');
      
      // Then reload it
      const reloadedInstance = await pluginManager.reloadPlugin('test-plugin');
      
      expect(reloadedInstance).toBeDefined();
      expect(mockModule.onUnload).toHaveBeenCalled();
    });
  });

  describe('plugin management', () => {
    beforeEach(async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRegistry
      });

      await pluginManager.initialize(mockContext);
    });

    it('should install plugin', async () => {
      const newPlugin: Plugin = {
        ...mockRegistry.plugins[0],
        id: 'new-plugin',
        name: 'New Plugin'
      };

      const mockModule = {
        default: jest.fn(),
        onLoad: jest.fn()
      };

      const mockScript = {
        onload: null,
        onerror: null,
        src: ''
      } as any;

      jest.spyOn(document, 'createElement').mockReturnValue(mockScript);
      jest.spyOn(document.head, 'appendChild').mockImplementation((script) => {
        setTimeout(() => {
          if (script.onload) script.onload();
        }, 0);
        return script;
      });

      (window as any).new_plugin = {
        init: jest.fn(),
        get: jest.fn().mockResolvedValue(() => mockModule)
      };

      await expect(pluginManager.installPlugin(newPlugin)).resolves.not.toThrow();
      
      expect(pluginManager.getPluginConfig('new-plugin')).toBeDefined();
    });

    it('should uninstall plugin', async () => {
      await expect(pluginManager.uninstallPlugin('test-plugin')).resolves.not.toThrow();
      
      expect(pluginManager.getPluginConfig('test-plugin')).toBeUndefined();
    });

    it('should refresh registry', async () => {
      const updatedRegistry = {
        ...mockRegistry,
        version: '2.0.0'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedRegistry
      });

      await expect(pluginManager.refreshRegistry()).resolves.not.toThrow();
      
      expect(pluginManager.getRegistry()?.version).toBe('2.0.0');
    });
  });
});