/**
 * Plugin System Type Definitions
 * Defines the structure and contracts for the plugin architecture
 */

export interface PluginManifest {
  // Basic Information
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  license?: string;
  homepage?: string;
  repository?: string;
  
  // Plugin Configuration
  category: PluginCategory;
  tags: string[];
  icon?: string;
  screenshots?: string[];
  
  // Technical Requirements
  minShellVersion: string;
  maxShellVersion?: string;
  dependencies: PluginDependency[];
  peerDependencies?: PluginDependency[];
  
  // Capabilities & Permissions
  permissions: PluginPermission[];
  capabilities: PluginCapability[];
  
  // Entry Points
  entryPoints: {
    main?: string;
    settings?: string;
    admin?: string;
    worker?: string;
  };
  
  // Navigation & Routes
  navigation: NavigationItem[];
  routes: PluginRoute[];
  
  // Services Required
  requiredServices: ServiceRequirement[];
  providedServices?: ProvidedService[];
  
  // Database Schema
  database?: {
    tables?: TableDefinition[];
    migrations?: string;
    seedData?: string;
  };
  
  // Hooks & Events
  hooks: HookDefinition[];
  events: EventDefinition[];
  
  // Widget Support
  widgets?: WidgetDefinition[];
  
  // API Endpoints
  apiEndpoints?: ApiEndpoint[];
  
  // Configuration Schema
  configSchema?: ConfigSchema;
  
  // Internationalization
  locales?: LocaleDefinition[];
  
  // Build Configuration
  build?: {
    outputDir: string;
    publicPath?: string;
    externals?: string[];
  };
}

export interface PluginDependency {
  id: string;
  version: string;
  optional?: boolean;
}

export interface PluginPermission {
  name: string;
  reason: string;
  required: boolean;
}

export interface PluginCapability {
  name: string;
  version: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon?: string;
  path: string;
  position: 'main' | 'sidebar' | 'settings' | 'admin' | 'user' | 'footer';
  priority: number;
  permissions?: string[];
  badge?: {
    type: 'count' | 'dot' | 'text';
    value?: string | number;
    color?: string;
  };
  children?: NavigationItem[];
}

export interface PluginRoute {
  path: string;
  component: string;
  exact?: boolean;
  permissions?: string[];
  layout?: 'default' | 'minimal' | 'full' | 'custom';
  meta?: {
    title?: string;
    description?: string;
    keywords?: string[];
    [key: string]: any;
  };
}

export interface ServiceRequirement {
  name: string;
  version: string;
  optional?: boolean;
}

export interface ProvidedService {
  name: string;
  version: string;
  singleton: boolean;
  factory: string;
}

export interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
  indexes?: IndexDefinition[];
  foreignKeys?: ForeignKeyDefinition[];
}

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable?: boolean;
  default?: any;
  unique?: boolean;
  primary?: boolean;
  autoIncrement?: boolean;
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  unique?: boolean;
  type?: 'btree' | 'hash' | 'gin' | 'gist';
}

export interface ForeignKeyDefinition {
  name: string;
  column: string;
  references: {
    table: string;
    column: string;
  };
  onDelete?: 'cascade' | 'restrict' | 'set null' | 'no action';
  onUpdate?: 'cascade' | 'restrict' | 'set null' | 'no action';
}

export interface HookDefinition {
  name: string;
  handler: string;
  priority?: number;
}

export interface EventDefinition {
  name: string;
  description?: string;
  payload?: any;
}

export interface WidgetDefinition {
  id: string;
  name: string;
  component: string;
  zones: string[];
  defaultConfig?: any;
  configSchema?: ConfigSchema;
}

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: string;
  middleware?: string[];
  permissions?: string[];
  rateLimit?: {
    window: number;
    max: number;
  };
}

export interface ConfigSchema {
  type: 'object';
  properties: {
    [key: string]: any;
  };
  required?: string[];
  additionalProperties?: boolean;
}

export interface LocaleDefinition {
  code: string;
  name: string;
  file: string;
}

export type PluginCategory = 
  | 'core'
  | 'business'
  | 'utilities'
  | 'communication'
  | 'integration'
  | 'development'
  | 'security'
  | 'media'
  | 'social'
  | 'ecommerce'
  | 'custom';

export interface PluginInstance {
  manifest: PluginManifest;
  status: PluginStatus;
  config: any;
  instance?: any;
  error?: Error;
  loadTime?: number;
  memoryUsage?: number;
}

export enum PluginStatus {
  UNINSTALLED = 'uninstalled',
  INSTALLED = 'installed',
  ACTIVATING = 'activating',
  ACTIVE = 'active',
  DEACTIVATING = 'deactivating',
  INACTIVE = 'inactive',
  ERROR = 'error',
  UPDATING = 'updating',
}

export interface PluginRegistry {
  version: string;
  lastUpdated: string;
  plugins: {
    [pluginId: string]: PluginRegistryEntry;
  };
  repositories: {
    [repoId: string]: PluginRepository;
  };
  categories: {
    [categoryId: string]: CategoryDefinition;
  };
}

export interface PluginRegistryEntry {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: string;
  status: 'active' | 'inactive' | 'deprecated';
  required: boolean;
  dependencies: string[];
  repository: string;
  path: string;
  tags: string[];
}

export interface PluginRepository {
  type: 'local' | 'remote' | 'git';
  path?: string;
  url?: string;
  apiKey?: string;
  branch?: string;
}

export interface CategoryDefinition {
  name: string;
  description: string;
  icon: string;
}

export interface PluginLifecycleHooks {
  beforeInstall?: () => Promise<void>;
  afterInstall?: () => Promise<void>;
  beforeActivate?: () => Promise<void>;
  afterActivate?: () => Promise<void>;
  beforeDeactivate?: () => Promise<void>;
  afterDeactivate?: () => Promise<void>;
  beforeUninstall?: () => Promise<void>;
  afterUninstall?: () => Promise<void>;
  beforeUpdate?: (fromVersion: string, toVersion: string) => Promise<void>;
  afterUpdate?: (fromVersion: string, toVersion: string) => Promise<void>;
}