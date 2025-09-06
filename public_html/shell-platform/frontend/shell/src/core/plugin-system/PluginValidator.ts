import { Plugin, PluginDependency } from '../../types/plugin.types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class PluginValidator {
  private readonly REQUIRED_FIELDS = [
    'id',
    'name',
    'version',
    'description',
    'author',
    'category',
    'remoteUrl',
    'exposedModule',
    'permissions'
  ];

  private readonly VALID_CATEGORIES = [
    'dashboard',
    'user-management',
    'analytics',
    'settings',
    'file-management',
    'communication',
    'productivity',
    'integration'
  ];

  private readonly VALID_PERMISSIONS = [
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

  async validate(plugin: Plugin): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    this.validateRequiredFields(plugin, errors);

    // Validate plugin ID
    this.validatePluginId(plugin.id, errors);

    // Validate version
    this.validateVersion(plugin.version, errors);

    // Validate category
    this.validateCategory(plugin.category, errors);

    // Validate permissions
    this.validatePermissions(plugin.permissions, errors, warnings);

    // Validate remote URL
    this.validateRemoteUrl(plugin.remoteUrl, errors);

    // Validate exposed module
    this.validateExposedModule(plugin.exposedModule, errors);

    // Validate dependencies
    this.validateDependencies(plugin.dependencies, errors, warnings);

    // Validate configuration
    this.validateConfiguration(plugin.configuration, errors, warnings);

    // Validate metadata
    this.validateMetadata(plugin.metadata, errors);

    // Security validations
    await this.performSecurityValidation(plugin, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateRequiredFields(plugin: Plugin, errors: string[]): void {
    for (const field of this.REQUIRED_FIELDS) {
      if (!(field in plugin) || plugin[field as keyof Plugin] === undefined || plugin[field as keyof Plugin] === null) {
        errors.push(`Required field '${field}' is missing`);
      }
    }
  }

  private validatePluginId(id: string, errors: string[]): void {
    if (!id) return;

    // Plugin ID should be lowercase with hyphens
    const idPattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    if (!idPattern.test(id)) {
      errors.push('Plugin ID should contain only lowercase letters, numbers, and hyphens');
    }

    // Length constraints
    if (id.length < 3) {
      errors.push('Plugin ID should be at least 3 characters long');
    }
    if (id.length > 50) {
      errors.push('Plugin ID should be no more than 50 characters long');
    }

    // Reserved IDs
    const reservedIds = ['system', 'core', 'shell', 'admin', 'api', 'plugin'];
    if (reservedIds.includes(id)) {
      errors.push(`Plugin ID '${id}' is reserved and cannot be used`);
    }
  }

  private validateVersion(version: string, errors: string[]): void {
    if (!version) return;

    // Semantic versioning pattern
    const semverPattern = /^(\d+)\.(\d+)\.(\d+)(-[a-zA-Z0-9-]+)?(\+[a-zA-Z0-9-]+)?$/;
    if (!semverPattern.test(version)) {
      errors.push('Version should follow semantic versioning (e.g., 1.0.0)');
    }
  }

  private validateCategory(category: string, errors: string[]): void {
    if (!category) return;

    if (!this.VALID_CATEGORIES.includes(category)) {
      errors.push(`Invalid category '${category}'. Valid categories: ${this.VALID_CATEGORIES.join(', ')}`);
    }
  }

  private validatePermissions(permissions: string[], errors: string[], warnings: string[]): void {
    if (!permissions || !Array.isArray(permissions)) {
      errors.push('Permissions should be an array');
      return;
    }

    if (permissions.length === 0) {
      warnings.push('Plugin has no permissions defined');
    }

    for (const permission of permissions) {
      if (!this.VALID_PERMISSIONS.includes(permission)) {
        errors.push(`Invalid permission '${permission}'`);
      }
    }

    // Check for overprivileged plugins
    const adminPermissions = permissions.filter(p => p.includes('admin:'));
    if (adminPermissions.length > 0) {
      warnings.push(`Plugin requests admin permissions: ${adminPermissions.join(', ')}`);
    }

    // Check for dangerous combinations
    const hasDeleteUsers = permissions.includes('delete:users');
    const hasManageRoles = permissions.includes('manage:roles');
    if (hasDeleteUsers && hasManageRoles) {
      warnings.push('Plugin has both user deletion and role management permissions');
    }
  }

  private validateRemoteUrl(remoteUrl: string, errors: string[]): void {
    if (!remoteUrl) return;

    try {
      const url = new URL(remoteUrl);
      
      // Check protocol
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push('Remote URL must use HTTP or HTTPS protocol');
      }

      // Check for development vs production URLs
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        // This is fine for development
      } else {
        // Production URL validations
        if (url.protocol !== 'https:') {
          errors.push('Production remote URLs must use HTTPS');
        }
      }

      // Check for valid entry point
      if (!remoteUrl.endsWith('remoteEntry.js')) {
        errors.push('Remote URL should point to remoteEntry.js file');
      }

    } catch (error) {
      errors.push('Invalid remote URL format');
    }
  }

  private validateExposedModule(exposedModule: string, errors: string[]): void {
    if (!exposedModule) return;

    // Should start with './'
    if (!exposedModule.startsWith('./')) {
      errors.push('Exposed module should start with "./"');
    }

    // Should not contain invalid characters
    const invalidChars = /[<>:"|?*]/;
    if (invalidChars.test(exposedModule)) {
      errors.push('Exposed module contains invalid characters');
    }
  }

  private validateDependencies(dependencies: PluginDependency[], errors: string[], warnings: string[]): void {
    if (!dependencies || !Array.isArray(dependencies)) {
      errors.push('Dependencies should be an array');
      return;
    }

    const seenDependencies = new Set<string>();

    for (const dep of dependencies) {
      if (!dep.name) {
        errors.push('Dependency name is required');
        continue;
      }

      if (seenDependencies.has(dep.name)) {
        errors.push(`Duplicate dependency: ${dep.name}`);
      }
      seenDependencies.add(dep.name);

      if (!dep.version) {
        errors.push(`Dependency ${dep.name} is missing version`);
        continue;
      }

      // Validate version range
      try {
        this.validateVersionRange(dep.version);
      } catch (error) {
        errors.push(`Invalid version range for dependency ${dep.name}: ${dep.version}`);
      }

      // Check for potentially problematic dependencies
      const riskDependencies = ['eval', 'vm', 'child_process', 'fs'];
      if (riskDependencies.includes(dep.name)) {
        warnings.push(`Potentially risky dependency: ${dep.name}`);
      }
    }

    // Check dependency count
    if (dependencies.length > 20) {
      warnings.push('Plugin has many dependencies, consider optimizing');
    }
  }

  private validateVersionRange(versionRange: string): void {
    // Simple version range validation
    const patterns = [
      /^\d+\.\d+\.\d+$/, // Exact version
      /^\^\d+\.\d+\.\d+$/, // Compatible version
      /^~\d+\.\d+\.\d+$/, // Approximate version
      /^>=\d+\.\d+\.\d+$/, // Minimum version
      /^>\d+\.\d+\.\d+$/, // Greater than
      /^<=\d+\.\d+\.\d+$/, // Maximum version
      /^<\d+\.\d+\.\d+$/ // Less than
    ];

    const isValid = patterns.some(pattern => pattern.test(versionRange));
    if (!isValid) {
      throw new Error('Invalid version range format');
    }
  }

  private validateConfiguration(configuration: any, errors: string[], warnings: string[]): void {
    if (!configuration) {
      warnings.push('Plugin has no configuration defined');
      return;
    }

    // Validate routes
    if (configuration.routes) {
      this.validateRoutes(configuration.routes, errors, warnings);
    }

    // Validate menu items
    if (configuration.menuItems) {
      this.validateMenuItems(configuration.menuItems, errors, warnings);
    }

    // Validate settings
    if (configuration.settings) {
      this.validateSettings(configuration.settings, errors);
    }
  }

  private validateRoutes(routes: any[], errors: string[], warnings: string[]): void {
    if (!Array.isArray(routes)) {
      errors.push('Routes should be an array');
      return;
    }

    const seenPaths = new Set<string>();

    for (const route of routes) {
      if (!route.path) {
        errors.push('Route path is required');
        continue;
      }

      if (seenPaths.has(route.path)) {
        errors.push(`Duplicate route path: ${route.path}`);
      }
      seenPaths.add(route.path);

      if (!route.component) {
        errors.push(`Route ${route.path} is missing component`);
      }

      // Validate path format
      if (!route.path.startsWith('/')) {
        errors.push(`Route path should start with '/': ${route.path}`);
      }

      // Check for potentially dangerous paths
      const adminPaths = ['/admin', '/system', '/config'];
      if (adminPaths.some(adminPath => route.path.startsWith(adminPath))) {
        warnings.push(`Route uses admin path: ${route.path}`);
      }
    }
  }

  private validateMenuItems(menuItems: any[], errors: string[], warnings: string[]): void {
    if (!Array.isArray(menuItems)) {
      errors.push('Menu items should be an array');
      return;
    }

    const seenIds = new Set<string>();

    for (const item of menuItems) {
      if (!item.id) {
        errors.push('Menu item ID is required');
        continue;
      }

      if (seenIds.has(item.id)) {
        errors.push(`Duplicate menu item ID: ${item.id}`);
      }
      seenIds.add(item.id);

      if (!item.label) {
        errors.push(`Menu item ${item.id} is missing label`);
      }

      if (typeof item.order !== 'number') {
        warnings.push(`Menu item ${item.id} should have numeric order`);
      }
    }
  }

  private validateSettings(settings: any[], errors: string[]): void {
    if (!Array.isArray(settings)) {
      errors.push('Settings should be an array');
      return;
    }

    const seenKeys = new Set<string>();
    const validTypes = ['string', 'number', 'boolean', 'select', 'multi-select'];

    for (const setting of settings) {
      if (!setting.key) {
        errors.push('Setting key is required');
        continue;
      }

      if (seenKeys.has(setting.key)) {
        errors.push(`Duplicate setting key: ${setting.key}`);
      }
      seenKeys.add(setting.key);

      if (!setting.label) {
        errors.push(`Setting ${setting.key} is missing label`);
      }

      if (!validTypes.includes(setting.type)) {
        errors.push(`Invalid setting type for ${setting.key}: ${setting.type}`);
      }

      if ((setting.type === 'select' || setting.type === 'multi-select') && !setting.options) {
        errors.push(`Setting ${setting.key} with type ${setting.type} requires options`);
      }
    }
  }

  private validateMetadata(metadata: any, errors: string[]): void {
    if (!metadata) {
      errors.push('Plugin metadata is required');
      return;
    }

    if (!metadata.installDate) {
      errors.push('Install date is required in metadata');
    }

    if (typeof metadata.size !== 'number') {
      errors.push('Plugin size should be a number');
    }

    if (!metadata.hash) {
      errors.push('Plugin hash is required for integrity verification');
    }
  }

  private async performSecurityValidation(plugin: Plugin, errors: string[], warnings: string[]): Promise<void> {
    // Check for suspicious patterns in plugin configuration
    const suspiciousPatterns = [
      /eval\s*\(/i,
      /Function\s*\(/i,
      /document\.write/i,
      /innerHTML\s*=/i,
      /dangerouslySetInnerHTML/i,
      /<script/i,
      /javascript:/i
    ];

    const pluginString = JSON.stringify(plugin);
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(pluginString)) {
        warnings.push(`Plugin contains potentially unsafe pattern: ${pattern.source}`);
      }
    }

    // Check remote URL for security
    try {
      const url = new URL(plugin.remoteUrl);
      
      // Warn about non-HTTPS in production
      if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
        warnings.push('Plugin uses non-HTTPS remote URL in production');
      }

      // Check for suspicious domains
      const suspiciousTlds = ['.tk', '.ml', '.ga', '.cf'];
      if (suspiciousTlds.some(tld => url.hostname.endsWith(tld))) {
        warnings.push('Plugin uses remote URL from potentially suspicious domain');
      }
    } catch (error) {
      // URL validation already handled above
    }

    // Check plugin size
    if (plugin.metadata?.size && plugin.metadata.size > 10 * 1024 * 1024) { // 10MB
      warnings.push('Plugin is very large (>10MB), consider optimization');
    }

    // Check for excessive permissions
    if (plugin.permissions.length > 10) {
      warnings.push('Plugin requests many permissions, review necessity');
    }
  }

  // Utility methods for external use

  validatePluginAtRuntime(plugin: Plugin, loadedModule: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if the module exports what it claims
    if (!loadedModule) {
      errors.push('Plugin module failed to load');
    } else {
      const expectedExport = plugin.exposedModule.replace('./', '');
      if (!loadedModule.default && !loadedModule[expectedExport]) {
        warnings.push('Plugin module may not export expected component');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  validatePluginUpdate(currentPlugin: Plugin, newPlugin: Plugin): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Plugin ID should not change
    if (currentPlugin.id !== newPlugin.id) {
      errors.push('Plugin ID cannot be changed during update');
    }

    // Version should be higher
    if (this.compareVersions(newPlugin.version, currentPlugin.version) <= 0) {
      warnings.push('New plugin version is not higher than current version');
    }

    // Check for breaking changes in permissions
    const removedPermissions = currentPlugin.permissions.filter(
      perm => !newPlugin.permissions.includes(perm)
    );
    if (removedPermissions.length > 0) {
      warnings.push(`Plugin update removes permissions: ${removedPermissions.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }
    
    return 0;
  }
}