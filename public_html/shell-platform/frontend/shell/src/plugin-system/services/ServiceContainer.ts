/**
 * Service Container
 * Provides all shared services to plugins
 */

import { AuthService } from './AuthService';
import { DatabaseService } from './DatabaseService';
import { ApiService } from './ApiService';
import { StorageService } from './StorageService';
import { CacheService } from './CacheService';
import { EventService } from './EventService';
import { NotificationService } from './NotificationService';
import { SettingsService } from './SettingsService';
import { MenuService } from './MenuService';

export class ServiceContainer {
  private services: Map<string, any>;
  private initialized: boolean;

  constructor() {
    this.services = new Map();
    this.initialized = false;
  }

  /**
   * Initialize all core services
   */
  async initialize(config: any): Promise<void> {
    if (this.initialized) {
      console.warn('Service container already initialized');
      return;
    }

    console.log('🔧 Initializing services...');

    // Initialize Authentication Service
    const authService = new AuthService(config.auth);
    await authService.initialize();
    this.services.set('auth', authService);

    // Initialize Database Service  
    const databaseService = new DatabaseService(config.database);
    await databaseService.initialize();
    this.services.set('database', databaseService);

    // Initialize API Service
    const apiService = new ApiService(config.api);
    await apiService.initialize();
    this.services.set('api', apiService);

    // Initialize Storage Service
    const storageService = new StorageService(config.storage);
    await storageService.initialize();
    this.services.set('storage', storageService);

    // Initialize Cache Service
    const cacheService = new CacheService(config.cache);
    await cacheService.initialize();
    this.services.set('cache', cacheService);

    // Initialize Event Service
    const eventService = new EventService();
    this.services.set('events', eventService);

    // Initialize Notification Service
    const notificationService = new NotificationService();
    this.services.set('notification', notificationService);

    // Initialize Settings Service
    const settingsService = new SettingsService(databaseService);
    this.services.set('settings', settingsService);

    // Initialize Menu Service
    const menuService = new MenuService(this.services.get('hooks') || config.hooks);
    await menuService.initialize();
    this.services.set('menu', menuService);

    this.initialized = true;
    console.log('✅ All services initialized');
  }

  /**
   * Get a specific service
   */
  getService(name: string): any {
    if (!this.initialized) {
      throw new Error('Service container not initialized');
    }

    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not found`);
    }

    return service;
  }

  /**
   * Get multiple services
   */
  getServices(names: string[]): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const name of names) {
      try {
        result[name] = this.getService(name);
      } catch (error) {
        console.warn(`Service ${name} not available`);
      }
    }

    return result;
  }

  /**
   * Register a custom service
   */
  registerService(name: string, service: any): void {
    if (this.services.has(name)) {
      console.warn(`Service '${name}' already exists`);
    }
    this.services.set(name, service);
  }

  /**
   * Check if a service exists
   */
  hasService(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Get all available services
   */
  getAllServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Cleanup all services
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up services...');

    for (const [name, service] of this.services) {
      if (typeof service.cleanup === 'function') {
        try {
          await service.cleanup();
          console.log(`✅ Service ${name} cleaned up`);
        } catch (error) {
          console.error(`Failed to cleanup service ${name}:`, error);
        }
      }
    }

    this.services.clear();
    this.initialized = false;
  }
}