/**
 * ServiceContainer - Provides shared services to all plugins
 * Implements dependency injection for plugin services
 */

import { AuthenticationService } from './services/AuthenticationService';
import { DatabaseService } from './services/DatabaseService';
import { ApiService } from './services/ApiService';
import { StorageService } from './services/StorageService';
import { CacheService } from './services/CacheService';
import { NotificationService } from './services/NotificationService';
import { SettingsService } from './services/SettingsService';
import { RouterService } from './services/RouterService';
import { NavigationService } from './services/NavigationService';
import { WidgetService } from './services/WidgetService';
import { ThemeService } from './services/ThemeService';
import { LoggingService } from './services/LoggingService';
import { AnalyticsService } from './services/AnalyticsService';
import { PermissionService } from './services/PermissionService';
import { I18nService } from './services/I18nService';

export interface ServiceDefinition {
  name: string;
  version: string;
  singleton: boolean;
  factory: () => any;
  dependencies?: string[];
}

export class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, any> = new Map();
  private serviceDefinitions: Map<string, ServiceDefinition> = new Map();
  private initialized: boolean = false;

  private constructor() {
    this.registerCoreServices();
  }

  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  /**
   * Initialize all core services
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize services in dependency order
      const initOrder = this.resolveDependencyOrder();
      
      for (const serviceName of initOrder) {
        const definition = this.serviceDefinitions.get(serviceName);
        if (definition && definition.singleton) {
          await this.instantiateService(serviceName);
        }
      }
      
      this.initialized = true;
      console.log('Service container initialized with', this.services.size, 'services');
      
    } catch (error) {
      console.error('Failed to initialize service container:', error);
      throw error;
    }
  }

  /**
   * Register core services
   */
  private registerCoreServices(): void {
    // Authentication Service
    this.registerService({
      name: 'authentication',
      version: '1.0.0',
      singleton: true,
      factory: () => new AuthenticationService(),
    });

    // Database Service
    this.registerService({
      name: 'database',
      version: '1.0.0',
      singleton: true,
      factory: () => new DatabaseService(),
    });

    // API Service
    this.registerService({
      name: 'api',
      version: '1.0.0',
      singleton: true,
      factory: () => new ApiService(),
    });

    // Storage Service
    this.registerService({
      name: 'storage',
      version: '1.0.0',
      singleton: true,
      factory: () => new StorageService(),
    });

    // Cache Service
    this.registerService({
      name: 'cache',
      version: '1.0.0',
      singleton: true,
      factory: () => new CacheService(),
    });

    // Notification Service
    this.registerService({
      name: 'notification',
      version: '1.0.0',
      singleton: true,
      factory: () => new NotificationService(),
    });

    // Settings Service
    this.registerService({
      name: 'settings',
      version: '1.0.0',
      singleton: true,
      factory: () => new SettingsService(),
      dependencies: ['database', 'cache'],
    });

    // Router Service
    this.registerService({
      name: 'router',
      version: '1.0.0',
      singleton: true,
      factory: () => new RouterService(),
    });

    // Navigation Service
    this.registerService({
      name: 'navigation',
      version: '1.0.0',
      singleton: true,
      factory: () => new NavigationService(),
      dependencies: ['permission'],
    });

    // Widget Service
    this.registerService({
      name: 'widgets',
      version: '1.0.0',
      singleton: true,
      factory: () => new WidgetService(),
    });

    // Theme Service
    this.registerService({
      name: 'theme',
      version: '1.0.0',
      singleton: true,
      factory: () => new ThemeService(),
      dependencies: ['settings'],
    });

    // Logging Service
    this.registerService({
      name: 'logging',
      version: '1.0.0',
      singleton: true,
      factory: () => new LoggingService(),
    });

    // Analytics Service
    this.registerService({
      name: 'analytics',
      version: '1.0.0',
      singleton: true,
      factory: () => new AnalyticsService(),
      dependencies: ['api', 'authentication'],
    });

    // Permission Service
    this.registerService({
      name: 'permission',
      version: '1.0.0',
      singleton: true,
      factory: () => new PermissionService(),
      dependencies: ['authentication', 'database'],
    });

    // I18n Service
    this.registerService({
      name: 'i18n',
      version: '1.0.0',
      singleton: true,
      factory: () => new I18nService(),
      dependencies: ['settings'],
    });
  }

  /**
   * Register a service
   */
  public registerService(definition: ServiceDefinition): void {
    this.serviceDefinitions.set(definition.name, definition);
  }

  /**
   * Get a service instance
   */
  public getService(name: string): any {
    // Check if already instantiated
    if (this.services.has(name)) {
      return this.services.get(name);
    }

    // Check if service is registered
    const definition = this.serviceDefinitions.get(name);
    if (!definition) {
      return null;
    }

    // Instantiate non-singleton services on demand
    if (!definition.singleton) {
      return this.createServiceInstance(definition);
    }

    // Singleton should have been created during initialization
    return null;
  }

  /**
   * Instantiate a service
   */
  private async instantiateService(name: string): Promise<any> {
    const definition = this.serviceDefinitions.get(name);
    if (!definition) {
      throw new Error(`Service ${name} not registered`);
    }

    const instance = this.createServiceInstance(definition);
    
    if (definition.singleton) {
      this.services.set(name, instance);
    }

    // Initialize if method exists
    if (instance.initialize) {
      await instance.initialize();
    }

    return instance;
  }

  /**
   * Create service instance with dependency injection
   */
  private createServiceInstance(definition: ServiceDefinition): any {
    // Resolve dependencies
    const dependencies: any = {};
    
    if (definition.dependencies) {
      for (const depName of definition.dependencies) {
        dependencies[depName] = this.getService(depName);
        if (!dependencies[depName]) {
          throw new Error(`Dependency ${depName} not found for service ${definition.name}`);
        }
      }
    }

    // Create instance
    return definition.factory.call(null, dependencies);
  }

  /**
   * Resolve service dependency order
   */
  private resolveDependencyOrder(): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (name: string) => {
      if (visited.has(name)) return;
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected: ${name}`);
      }

      visiting.add(name);
      
      const definition = this.serviceDefinitions.get(name);
      if (definition?.dependencies) {
        for (const dep of definition.dependencies) {
          visit(dep);
        }
      }

      visiting.delete(name);
      visited.add(name);
      order.push(name);
    };

    for (const name of this.serviceDefinitions.keys()) {
      visit(name);
    }

    return order;
  }

  /**
   * Get all registered services
   */
  public getRegisteredServices(): Map<string, ServiceDefinition> {
    return this.serviceDefinitions;
  }

  /**
   * Check if a service is registered
   */
  public hasService(name: string): boolean {
    return this.serviceDefinitions.has(name);
  }

  /**
   * Unregister a service
   */
  public unregisterService(name: string): void {
    this.serviceDefinitions.delete(name);
    this.services.delete(name);
  }

  /**
   * Clear all services (for testing)
   */
  public clear(): void {
    this.services.clear();
    this.serviceDefinitions.clear();
    this.initialized = false;
    this.registerCoreServices();
  }
}