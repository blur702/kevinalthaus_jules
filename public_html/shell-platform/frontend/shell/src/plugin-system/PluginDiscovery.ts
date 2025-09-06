/**
 * Plugin Discovery System
 * Discovers plugins by reading their plugin.json files
 */

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  category: string;
  hooks: {
    menu?: MenuItem[];
    routes?: Route[];
    widgets?: Widget[];
    actions?: string[];
    filters?: string[];
  };
  services: string[];
  permissions?: string[];
  dependencies?: {
    plugins?: string[];
    npm?: Record<string, string>;
  };
  database?: {
    tables?: TableDefinition[];
  };
  settings?: Record<string, SettingDefinition>;
}

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  position: number;
  parent?: string | null;
  permission?: string;
}

interface Route {
  path: string;
  component: string;
  exact?: boolean;
  auth?: boolean;
  permission?: string;
}

interface Widget {
  id: string;
  zone: string;
  component: string;
  priority: number;
}

interface TableDefinition {
  name: string;
  columns: string[];
}

interface SettingDefinition {
  type: 'string' | 'number' | 'boolean' | 'select';
  default: any;
  label: string;
  options?: string[];
}

export class PluginDiscovery {
  private pluginsDirectory: string;
  private discoveredPlugins: Map<string, PluginManifest>;

  constructor(pluginsDirectory = '/plugins') {
    this.pluginsDirectory = pluginsDirectory;
    this.discoveredPlugins = new Map();
  }

  /**
   * Discover all available plugins
   */
  async discoverPlugins(): Promise<PluginManifest[]> {
    try {
      const pluginFolders = await this.getPluginFolders();
      const manifests = await Promise.all(
        pluginFolders.map(folder => this.loadPluginManifest(folder))
      );
      
      return manifests.filter(manifest => manifest !== null) as PluginManifest[];
    } catch (error) {
      console.error('Failed to discover plugins:', error);
      return [];
    }
  }

  /**
   * Get list of plugin folders
   */
  private async getPluginFolders(): Promise<string[]> {
    try {
      // In a real implementation, this would scan the filesystem
      // For now, we'll return known plugin folders
      return [
        'dashboard',
        'user-management',
        'settings',
        'notifications',
        'reports'
      ];
    } catch (error) {
      console.error('Failed to get plugin folders:', error);
      return [];
    }
  }

  /**
   * Load a single plugin manifest
   */
  async loadPluginManifest(pluginFolder: string): Promise<PluginManifest | null> {
    try {
      const manifestPath = `${this.pluginsDirectory}/${pluginFolder}/plugin.json`;
      const response = await fetch(manifestPath);
      
      if (!response.ok) {
        console.warn(`Plugin manifest not found: ${manifestPath}`);
        return null;
      }
      
      const manifest: PluginManifest = await response.json();
      
      // Validate manifest
      if (!this.validateManifest(manifest)) {
        console.error(`Invalid plugin manifest: ${pluginFolder}`);
        return null;
      }
      
      // Cache the manifest
      this.discoveredPlugins.set(manifest.id, manifest);
      
      return manifest;
    } catch (error) {
      console.error(`Failed to load plugin manifest for ${pluginFolder}:`, error);
      return null;
    }
  }

  /**
   * Validate plugin manifest structure
   */
  private validateManifest(manifest: any): boolean {
    // Check required fields
    const requiredFields = ['id', 'name', 'version', 'services'];
    
    for (const field of requiredFields) {
      if (!manifest[field]) {
        console.error(`Missing required field: ${field}`);
        return false;
      }
    }
    
    // Validate version format (semantic versioning)
    if (!this.isValidVersion(manifest.version)) {
      console.error(`Invalid version format: ${manifest.version}`);
      return false;
    }
    
    // Validate services array
    if (!Array.isArray(manifest.services)) {
      console.error('Services must be an array');
      return false;
    }
    
    return true;
  }

  /**
   * Check if version string is valid semantic version
   */
  private isValidVersion(version: string): boolean {
    const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+)?$/;
    return semverRegex.test(version);
  }

  /**
   * Get a specific plugin manifest by ID
   */
  getPluginManifest(pluginId: string): PluginManifest | undefined {
    return this.discoveredPlugins.get(pluginId);
  }

  /**
   * Get plugins by category
   */
  getPluginsByCategory(category: string): PluginManifest[] {
    return Array.from(this.discoveredPlugins.values())
      .filter(manifest => manifest.category === category);
  }

  /**
   * Check if a plugin exists
   */
  pluginExists(pluginId: string): boolean {
    return this.discoveredPlugins.has(pluginId);
  }

  /**
   * Get all discovered plugins
   */
  getAllPlugins(): PluginManifest[] {
    return Array.from(this.discoveredPlugins.values());
  }

  /**
   * Clear plugin cache
   */
  clearCache(): void {
    this.discoveredPlugins.clear();
  }
}