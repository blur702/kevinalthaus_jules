export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  category: string;
  tags: string[];
  icon?: string;
  remoteUrl: string;
  exposedModule: string;
  permissions: string[];
  dependencies: PluginDependency[];
  configuration: PluginConfiguration;
  status: PluginStatus;
  metadata: PluginMetadata;
}

export interface PluginDependency {
  name: string;
  version: string;
  optional?: boolean;
}

export interface PluginConfiguration {
  routes?: PluginRoute[];
  menuItems?: PluginMenuItem[];
  settings?: PluginSetting[];
  features?: string[];
}

export interface PluginRoute {
  path: string;
  component: string;
  exact?: boolean;
  title?: string;
  protected?: boolean;
  permissions?: string[];
}

export interface PluginMenuItem {
  id: string;
  label: string;
  icon?: string;
  path?: string;
  order: number;
  permissions?: string[];
  children?: PluginMenuItem[];
}

export interface PluginSetting {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'multi-select';
  defaultValue: any;
  options?: PluginSettingOption[];
  required?: boolean;
  description?: string;
}

export interface PluginSettingOption {
  label: string;
  value: any;
}

export interface PluginMetadata {
  installDate: string;
  lastUpdate?: string;
  size: number;
  hash: string;
  updateAvailable?: boolean;
  latestVersion?: string;
}

export type PluginStatus = 'active' | 'inactive' | 'loading' | 'error' | 'updating';

export interface PluginRegistry {
  plugins: Plugin[];
  categories: PluginCategory[];
  lastUpdate: string;
  version: string;
}

export interface PluginCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
  order: number;
}

export interface PluginInstance {
  plugin: Plugin;
  module: any;
  component: React.ComponentType<any>;
  error?: Error;
  isLoaded: boolean;
}

export interface PluginContext {
  user: any;
  theme: string;
  navigate: (path: string) => void;
  notification: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  eventBus: PluginEventBus;
  storage: PluginStorage;
}

export interface PluginEventBus {
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (data: any) => void) => () => void;
  off: (event: string, callback: (data: any) => void) => void;
}

export interface PluginStorage {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any) => Promise<void>;
  remove: (key: string) => Promise<void>;
  clear: () => Promise<void>;
}

export interface PluginError {
  pluginId: string;
  error: Error;
  timestamp: string;
  context?: string;
}

export interface PluginLoadEvent {
  pluginId: string;
  status: 'loading' | 'loaded' | 'error';
  error?: Error;
}