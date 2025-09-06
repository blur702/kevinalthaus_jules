import { Plugin, PluginInstallRequest } from '../types';

export class PluginService {
  private static instance: PluginService;
  
  // Mock plugins database
  private plugins: Plugin[] = [
    {
      id: '1',
      name: 'File Manager',
      version: '1.0.0',
      description: 'Advanced file management capabilities',
      author: 'Shell Platform Team',
      enabled: true,
      installDate: new Date('2024-01-01'),
      config: {
        maxFileSize: '10MB',
        allowedTypes: ['image/*', 'text/*', 'application/pdf'],
      },
    },
    {
      id: '2',
      name: 'Code Editor',
      version: '2.1.0',
      description: 'Syntax highlighting and code editing',
      author: 'Shell Platform Team',
      enabled: true,
      installDate: new Date('2024-01-15'),
      config: {
        theme: 'dark',
        fontSize: 14,
        tabSize: 2,
      },
    },
    {
      id: '3',
      name: 'Terminal',
      version: '1.5.0',
      description: 'Web-based terminal emulator',
      author: 'Shell Platform Team',
      enabled: false,
      installDate: new Date('2024-02-01'),
      config: {
        shell: '/bin/bash',
        timeout: 300000,
      },
    },
  ];

  public static getInstance(): PluginService {
    if (!PluginService.instance) {
      PluginService.instance = new PluginService();
    }
    return PluginService.instance;
  }

  /**
   * Get all plugins
   */
  public getAllPlugins(enabledOnly?: boolean): Plugin[] {
    if (enabledOnly) {
      return this.plugins.filter(plugin => plugin.enabled);
    }
    return this.plugins;
  }

  /**
   * Get plugin by ID
   */
  public getPluginById(id: string): Plugin | null {
    return this.plugins.find(plugin => plugin.id === id) || null;
  }

  /**
   * Get plugin by name
   */
  public getPluginByName(name: string): Plugin | null {
    return this.plugins.find(plugin => plugin.name === name) || null;
  }

  /**
   * Install a new plugin
   */
  public async installPlugin(installRequest: PluginInstallRequest): Promise<Plugin> {
    const { name, source, version = '1.0.0' } = installRequest;

    // Check if plugin already exists
    if (this.getPluginByName(name)) {
      throw new Error('Plugin with this name already exists');
    }

    // Simulate plugin installation process
    await this.simulateInstallation(source);

    // Create new plugin
    const newPlugin: Plugin = {
      id: (this.plugins.length + 1).toString(),
      name,
      version,
      description: `${name} plugin installed from ${source}`,
      author: 'External Developer',
      enabled: true,
      installDate: new Date(),
      config: {},
    };

    this.plugins.push(newPlugin);
    return newPlugin;
  }

  /**
   * Update plugin
   */
  public updatePlugin(id: string, updates: Partial<Plugin>): Plugin {
    const pluginIndex = this.plugins.findIndex(plugin => plugin.id === id);
    if (pluginIndex === -1) {
      throw new Error('Plugin not found');
    }

    // Update plugin data
    this.plugins[pluginIndex] = {
      ...this.plugins[pluginIndex],
      ...updates,
      updateDate: new Date(),
    };

    return this.plugins[pluginIndex];
  }

  /**
   * Toggle plugin enabled/disabled status
   */
  public togglePlugin(id: string): Plugin {
    const plugin = this.getPluginById(id);
    if (!plugin) {
      throw new Error('Plugin not found');
    }

    return this.updatePlugin(id, { enabled: !plugin.enabled });
  }

  /**
   * Update plugin configuration
   */
  public updatePluginConfig(id: string, config: Record<string, any>): Plugin {
    const plugin = this.getPluginById(id);
    if (!plugin) {
      throw new Error('Plugin not found');
    }

    const updatedConfig = { ...plugin.config, ...config };
    return this.updatePlugin(id, { config: updatedConfig });
  }

  /**
   * Uninstall plugin
   */
  public uninstallPlugin(id: string): boolean {
    const pluginIndex = this.plugins.findIndex(plugin => plugin.id === id);
    if (pluginIndex === -1) {
      throw new Error('Plugin not found');
    }

    // Remove plugin
    this.plugins.splice(pluginIndex, 1);
    return true;
  }

  /**
   * Get enabled plugins
   */
  public getEnabledPlugins(): Plugin[] {
    return this.plugins.filter(plugin => plugin.enabled);
  }

  /**
   * Get disabled plugins
   */
  public getDisabledPlugins(): Plugin[] {
    return this.plugins.filter(plugin => !plugin.enabled);
  }

  /**
   * Search plugins by name or description
   */
  public searchPlugins(query: string): Plugin[] {
    const lowercaseQuery = query.toLowerCase();
    return this.plugins.filter(plugin =>
      plugin.name.toLowerCase().includes(lowercaseQuery) ||
      plugin.description.toLowerCase().includes(lowercaseQuery)
    );
  }

  /**
   * Get plugins by author
   */
  public getPluginsByAuthor(author: string): Plugin[] {
    return this.plugins.filter(plugin =>
      plugin.author.toLowerCase().includes(author.toLowerCase())
    );
  }

  /**
   * Get plugin statistics
   */
  public getPluginStats(): {
    total: number;
    enabled: number;
    disabled: number;
    byAuthor: Record<string, number>;
  } {
    const enabled = this.getEnabledPlugins();
    const disabled = this.getDisabledPlugins();
    
    const byAuthor = this.plugins.reduce((acc: Record<string, number>, plugin) => {
      acc[plugin.author] = (acc[plugin.author] || 0) + 1;
      return acc;
    }, {});

    return {
      total: this.plugins.length,
      enabled: enabled.length,
      disabled: disabled.length,
      byAuthor,
    };
  }

  /**
   * Validate plugin configuration
   */
  public validatePluginConfig(pluginId: string, config: Record<string, any>): boolean {
    const plugin = this.getPluginById(pluginId);
    if (!plugin) {
      throw new Error('Plugin not found');
    }

    // Basic validation - in a real app, this would be more sophisticated
    switch (plugin.name) {
      case 'File Manager':
        return this.validateFileManagerConfig(config);
      case 'Code Editor':
        return this.validateCodeEditorConfig(config);
      case 'Terminal':
        return this.validateTerminalConfig(config);
      default:
        return true; // Allow any config for unknown plugins
    }
  }

  /**
   * Get marketplace plugins (mock data)
   */
  public getMarketplacePlugins(): Array<{
    name: string;
    version: string;
    description: string;
    author: string;
    category: string;
    downloads: number;
    rating: number;
  }> {
    return [
      {
        name: 'Git Integration',
        version: '2.0.0',
        description: 'Git version control integration',
        author: 'DevTools Inc.',
        category: 'Development',
        downloads: 15420,
        rating: 4.8,
      },
      {
        name: 'Database Explorer',
        version: '1.3.0',
        description: 'Browse and manage databases',
        author: 'DataCorp',
        category: 'Database',
        downloads: 8932,
        rating: 4.5,
      },
      {
        name: 'Task Runner',
        version: '1.1.0',
        description: 'Automated task execution',
        author: 'AutomationPro',
        category: 'Productivity',
        downloads: 6721,
        rating: 4.2,
      },
      {
        name: 'Image Processor',
        version: '3.0.1',
        description: 'Advanced image processing tools',
        author: 'ImageTech',
        category: 'Graphics',
        downloads: 12305,
        rating: 4.7,
      },
      {
        name: 'API Tester',
        version: '2.2.0',
        description: 'REST API testing and debugging',
        author: 'DevTools Inc.',
        category: 'Development',
        downloads: 9876,
        rating: 4.6,
      },
    ];
  }

  // Private helper methods
  private async simulateInstallation(source: string): Promise<void> {
    // Simulate installation delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In a real app, this would:
    // - Download plugin from source
    // - Verify plugin signature
    // - Extract and validate plugin files
    // - Check dependencies
    // - Register plugin with system
  }

  private validateFileManagerConfig(config: Record<string, any>): boolean {
    const validKeys = ['maxFileSize', 'allowedTypes', 'uploadDir'];
    return Object.keys(config).every(key => validKeys.includes(key));
  }

  private validateCodeEditorConfig(config: Record<string, any>): boolean {
    const validKeys = ['theme', 'fontSize', 'tabSize', 'wordWrap', 'lineNumbers'];
    const validThemes = ['light', 'dark', 'auto'];
    
    if (config.theme && !validThemes.includes(config.theme)) {
      return false;
    }
    
    if (config.fontSize && (typeof config.fontSize !== 'number' || config.fontSize < 8 || config.fontSize > 32)) {
      return false;
    }
    
    if (config.tabSize && (typeof config.tabSize !== 'number' || config.tabSize < 1 || config.tabSize > 8)) {
      return false;
    }

    return Object.keys(config).every(key => validKeys.includes(key));
  }

  private validateTerminalConfig(config: Record<string, any>): boolean {
    const validKeys = ['shell', 'timeout', 'workingDir', 'env'];
    const validShells = ['/bin/bash', '/bin/zsh', '/bin/sh'];
    
    if (config.shell && !validShells.includes(config.shell)) {
      return false;
    }
    
    if (config.timeout && (typeof config.timeout !== 'number' || config.timeout < 1000)) {
      return false;
    }

    return Object.keys(config).every(key => validKeys.includes(key));
  }
}

export default PluginService;