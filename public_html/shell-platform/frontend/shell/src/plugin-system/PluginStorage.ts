/**
 * PluginStorage - Handles persistent storage for plugin data
 * Manages plugin configurations, states, and metadata
 */

import { PluginManifest, PluginStatus } from './types';

export class PluginStorage {
  private storagePrefix: string = 'shell_plugin_';
  private indexedDB: IDBDatabase | null = null;
  private dbName: string = 'ShellPluginDB';
  private dbVersion: number = 1;

  constructor() {
    this.initIndexedDB();
  }

  /**
   * Initialize IndexedDB for larger data storage
   */
  private async initIndexedDB(): Promise<void> {
    if (!window.indexedDB) {
      console.warn('IndexedDB not supported');
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Failed to open IndexedDB');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.indexedDB = request.result;
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create stores
        if (!db.objectStoreNames.contains('plugins')) {
          const pluginStore = db.createObjectStore('plugins', { keyPath: 'id' });
          pluginStore.createIndex('status', 'status', { unique: false });
          pluginStore.createIndex('category', 'category', { unique: false });
        }

        if (!db.objectStoreNames.contains('configs')) {
          db.createObjectStore('configs', { keyPath: 'pluginId' });
        }

        if (!db.objectStoreNames.contains('data')) {
          const dataStore = db.createObjectStore('data', { keyPath: ['pluginId', 'key'] });
          dataStore.createIndex('pluginId', 'pluginId', { unique: false });
        }
      };
    });
  }

  /**
   * Save installed plugin
   */
  public async saveInstalledPlugin(pluginId: string, manifest: PluginManifest): Promise<void> {
    // Save to localStorage for quick access
    const installedPlugins = this.getInstalledPluginIds();
    if (!installedPlugins.includes(pluginId)) {
      installedPlugins.push(pluginId);
      localStorage.setItem(
        `${this.storagePrefix}installed`,
        JSON.stringify(installedPlugins)
      );
    }

    // Save manifest to IndexedDB
    if (this.indexedDB) {
      const transaction = this.indexedDB.transaction(['plugins'], 'readwrite');
      const store = transaction.objectStore('plugins');
      
      await new Promise((resolve, reject) => {
        const request = store.put({
          id: pluginId,
          manifest,
          status: PluginStatus.INSTALLED,
          installedAt: new Date().toISOString(),
          category: manifest.category,
        });
        
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });
    }

    // Save basic info to localStorage as backup
    localStorage.setItem(
      `${this.storagePrefix}${pluginId}_manifest`,
      JSON.stringify(manifest)
    );
  }

  /**
   * Remove installed plugin
   */
  public async removeInstalledPlugin(pluginId: string): Promise<void> {
    // Remove from installed list
    const installedPlugins = this.getInstalledPluginIds();
    const filtered = installedPlugins.filter(id => id !== pluginId);
    localStorage.setItem(
      `${this.storagePrefix}installed`,
      JSON.stringify(filtered)
    );

    // Remove from IndexedDB
    if (this.indexedDB) {
      const transaction = this.indexedDB.transaction(
        ['plugins', 'configs', 'data'],
        'readwrite'
      );
      
      // Remove plugin entry
      transaction.objectStore('plugins').delete(pluginId);
      
      // Remove config
      transaction.objectStore('configs').delete(pluginId);
      
      // Remove all plugin data
      const dataStore = transaction.objectStore('data');
      const index = dataStore.index('pluginId');
      const request = index.openCursor(IDBKeyRange.only(pluginId));
      
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    }

    // Remove from localStorage
    const keys = Object.keys(localStorage).filter(key =>
      key.startsWith(`${this.storagePrefix}${pluginId}`)
    );
    keys.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Get installed plugin IDs
   */
  public getInstalledPluginIds(): string[] {
    const installed = localStorage.getItem(`${this.storagePrefix}installed`);
    return installed ? JSON.parse(installed) : [];
  }

  /**
   * Get installed plugins
   */
  public async getInstalledPlugins(): Promise<Map<string, PluginManifest>> {
    const plugins = new Map<string, PluginManifest>();
    
    if (this.indexedDB) {
      const transaction = this.indexedDB.transaction(['plugins'], 'readonly');
      const store = transaction.objectStore('plugins');
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        
        request.onsuccess = () => {
          const results = request.result;
          results.forEach((plugin: any) => {
            plugins.set(plugin.id, plugin.manifest);
          });
          resolve(plugins);
        };
        
        request.onerror = () => {
          reject(request.error);
        };
      });
    } else {
      // Fallback to localStorage
      const installedIds = this.getInstalledPluginIds();
      installedIds.forEach(id => {
        const manifestStr = localStorage.getItem(`${this.storagePrefix}${id}_manifest`);
        if (manifestStr) {
          plugins.set(id, JSON.parse(manifestStr));
        }
      });
    }
    
    return plugins;
  }

  /**
   * Update plugin status
   */
  public async updatePluginStatus(pluginId: string, status: PluginStatus): Promise<void> {
    localStorage.setItem(`${this.storagePrefix}${pluginId}_status`, status);
    
    if (this.indexedDB) {
      const transaction = this.indexedDB.transaction(['plugins'], 'readwrite');
      const store = transaction.objectStore('plugins');
      
      const request = store.get(pluginId);
      request.onsuccess = () => {
        const plugin = request.result;
        if (plugin) {
          plugin.status = status;
          plugin.lastUpdated = new Date().toISOString();
          store.put(plugin);
        }
      };
    }
  }

  /**
   * Get plugin status
   */
  public getPluginStatus(pluginId: string): PluginStatus {
    const status = localStorage.getItem(`${this.storagePrefix}${pluginId}_status`);
    return status as PluginStatus || PluginStatus.UNINSTALLED;
  }

  /**
   * Save plugin configuration
   */
  public async savePluginConfig(pluginId: string, config: any): Promise<void> {
    if (this.indexedDB) {
      const transaction = this.indexedDB.transaction(['configs'], 'readwrite');
      const store = transaction.objectStore('configs');
      
      await new Promise((resolve, reject) => {
        const request = store.put({
          pluginId,
          config,
          updatedAt: new Date().toISOString(),
        });
        
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });
    }
    
    // Also save to localStorage for quick access
    localStorage.setItem(
      `${this.storagePrefix}${pluginId}_config`,
      JSON.stringify(config)
    );
  }

  /**
   * Get plugin configuration
   */
  public async getPluginConfig(pluginId: string): Promise<any> {
    if (this.indexedDB) {
      const transaction = this.indexedDB.transaction(['configs'], 'readonly');
      const store = transaction.objectStore('configs');
      
      return new Promise((resolve, reject) => {
        const request = store.get(pluginId);
        
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.config : null);
        };
        
        request.onerror = () => {
          reject(request.error);
        };
      });
    }
    
    // Fallback to localStorage
    const config = localStorage.getItem(`${this.storagePrefix}${pluginId}_config`);
    return config ? JSON.parse(config) : null;
  }

  /**
   * Set plugin auto-activate
   */
  public setPluginAutoActivate(pluginId: string, autoActivate: boolean): void {
    localStorage.setItem(
      `${this.storagePrefix}${pluginId}_autoActivate`,
      JSON.stringify(autoActivate)
    );
  }

  /**
   * Get plugin auto-activate
   */
  public getPluginAutoActivate(pluginId: string): boolean {
    const value = localStorage.getItem(`${this.storagePrefix}${pluginId}_autoActivate`);
    return value ? JSON.parse(value) : false;
  }

  /**
   * Save plugin data (generic storage for plugins)
   */
  public async savePluginData(pluginId: string, key: string, data: any): Promise<void> {
    if (this.indexedDB) {
      const transaction = this.indexedDB.transaction(['data'], 'readwrite');
      const store = transaction.objectStore('data');
      
      await new Promise((resolve, reject) => {
        const request = store.put({
          pluginId,
          key,
          data,
          updatedAt: new Date().toISOString(),
        });
        
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });
    } else {
      // Fallback to localStorage
      localStorage.setItem(
        `${this.storagePrefix}${pluginId}_data_${key}`,
        JSON.stringify(data)
      );
    }
  }

  /**
   * Get plugin data
   */
  public async getPluginData(pluginId: string, key: string): Promise<any> {
    if (this.indexedDB) {
      const transaction = this.indexedDB.transaction(['data'], 'readonly');
      const store = transaction.objectStore('data');
      
      return new Promise((resolve, reject) => {
        const request = store.get([pluginId, key]);
        
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.data : null);
        };
        
        request.onerror = () => {
          reject(request.error);
        };
      });
    }
    
    // Fallback to localStorage
    const data = localStorage.getItem(`${this.storagePrefix}${pluginId}_data_${key}`);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Delete plugin data
   */
  public async deletePluginData(pluginId: string, key: string): Promise<void> {
    if (this.indexedDB) {
      const transaction = this.indexedDB.transaction(['data'], 'readwrite');
      const store = transaction.objectStore('data');
      store.delete([pluginId, key]);
    }
    
    localStorage.removeItem(`${this.storagePrefix}${pluginId}_data_${key}`);
  }

  /**
   * Get all plugin data keys
   */
  public async getPluginDataKeys(pluginId: string): Promise<string[]> {
    const keys: string[] = [];
    
    if (this.indexedDB) {
      const transaction = this.indexedDB.transaction(['data'], 'readonly');
      const store = transaction.objectStore('data');
      const index = store.index('pluginId');
      
      return new Promise((resolve, reject) => {
        const request = index.openCursor(IDBKeyRange.only(pluginId));
        
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            keys.push(cursor.value.key);
            cursor.continue();
          } else {
            resolve(keys);
          }
        };
        
        request.onerror = () => {
          reject(request.error);
        };
      });
    }
    
    // Fallback to localStorage
    const prefix = `${this.storagePrefix}${pluginId}_data_`;
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(prefix)) {
        keys.push(key.substring(prefix.length));
      }
    });
    
    return keys;
  }

  /**
   * Clear all plugin data
   */
  public async clearPluginData(pluginId: string): Promise<void> {
    if (this.indexedDB) {
      const transaction = this.indexedDB.transaction(['data'], 'readwrite');
      const store = transaction.objectStore('data');
      const index = store.index('pluginId');
      
      const request = index.openCursor(IDBKeyRange.only(pluginId));
      
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    }
    
    // Clear from localStorage
    const prefix = `${this.storagePrefix}${pluginId}_data_`;
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Export plugin data
   */
  public async exportPluginData(pluginId: string): Promise<any> {
    const data: any = {
      pluginId,
      config: await this.getPluginConfig(pluginId),
      status: this.getPluginStatus(pluginId),
      autoActivate: this.getPluginAutoActivate(pluginId),
      data: {},
    };
    
    const keys = await this.getPluginDataKeys(pluginId);
    for (const key of keys) {
      data.data[key] = await this.getPluginData(pluginId, key);
    }
    
    return data;
  }

  /**
   * Import plugin data
   */
  public async importPluginData(data: any): Promise<void> {
    const { pluginId, config, status, autoActivate, data: pluginData } = data;
    
    if (config) {
      await this.savePluginConfig(pluginId, config);
    }
    
    if (status) {
      await this.updatePluginStatus(pluginId, status);
    }
    
    if (autoActivate !== undefined) {
      this.setPluginAutoActivate(pluginId, autoActivate);
    }
    
    if (pluginData) {
      for (const [key, value] of Object.entries(pluginData)) {
        await this.savePluginData(pluginId, key, value);
      }
    }
  }
}