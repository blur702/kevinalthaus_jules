import { PluginStorage as IPluginStorage } from '../../types/plugin.types';

export class PluginStorage implements IPluginStorage {
  private prefix: string;
  private storage: Storage;
  private memoryCache: Map<string, any> = new Map();
  private encryptionKey: string | null = null;

  constructor(prefix: string = 'plugin', useSessionStorage: boolean = false) {
    this.prefix = prefix;
    this.storage = useSessionStorage ? sessionStorage : localStorage;
    
    // Initialize encryption key for sensitive data
    this.initializeEncryption();
  }

  private initializeEncryption(): void {
    // In a real implementation, this would be a proper encryption key
    // For demo purposes, we'll use a simple obfuscation
    this.encryptionKey = btoa(Date.now().toString());
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  private encrypt(value: any): string {
    const jsonString = JSON.stringify(value);
    if (!this.encryptionKey) return jsonString;
    
    // Simple XOR encryption for demo (use proper encryption in production)
    let encrypted = '';
    for (let i = 0; i < jsonString.length; i++) {
      encrypted += String.fromCharCode(
        jsonString.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length)
      );
    }
    return btoa(encrypted);
  }

  private decrypt(encryptedValue: string): any {
    if (!this.encryptionKey) {
      return JSON.parse(encryptedValue);
    }
    
    try {
      const encrypted = atob(encryptedValue);
      let decrypted = '';
      
      for (let i = 0; i < encrypted.length; i++) {
        decrypted += String.fromCharCode(
          encrypted.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length)
        );
      }
      
      return JSON.parse(decrypted);
    } catch (error) {
      // Fallback to unencrypted data
      return JSON.parse(encryptedValue);
    }
  }

  async get(key: string): Promise<any> {
    try {
      // Check memory cache first
      const cacheKey = this.getKey(key);
      if (this.memoryCache.has(cacheKey)) {
        return this.memoryCache.get(cacheKey);
      }

      // Get from storage
      const storageKey = this.getKey(key);
      const rawValue = this.storage.getItem(storageKey);
      
      if (rawValue === null) {
        return undefined;
      }

      const value = this.decrypt(rawValue);
      
      // Cache in memory for faster access
      this.memoryCache.set(cacheKey, value);
      
      return value;
    } catch (error) {
      console.error(`Error getting value for key ${key}:`, error);
      return undefined;
    }
  }

  async set(key: string, value: any): Promise<void> {
    try {
      const storageKey = this.getKey(key);
      const encryptedValue = this.encrypt(value);
      
      // Store in browser storage
      this.storage.setItem(storageKey, encryptedValue);
      
      // Update memory cache
      this.memoryCache.set(storageKey, value);
      
      // Emit storage event for other tabs/windows
      window.dispatchEvent(new CustomEvent('plugin-storage-change', {
        detail: { key: storageKey, value, action: 'set' }
      }));
      
    } catch (error) {
      console.error(`Error setting value for key ${key}:`, error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      const storageKey = this.getKey(key);
      
      // Remove from storage
      this.storage.removeItem(storageKey);
      
      // Remove from memory cache
      this.memoryCache.delete(storageKey);
      
      // Emit storage event
      window.dispatchEvent(new CustomEvent('plugin-storage-change', {
        detail: { key: storageKey, action: 'remove' }
      }));
      
    } catch (error) {
      console.error(`Error removing key ${key}:`, error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      // Get all keys with our prefix
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key && key.startsWith(`${this.prefix}:`)) {
          keysToRemove.push(key);
        }
      }
      
      // Remove all matching keys
      keysToRemove.forEach(key => {
        this.storage.removeItem(key);
        this.memoryCache.delete(key);
      });
      
      // Emit storage event
      window.dispatchEvent(new CustomEvent('plugin-storage-change', {
        detail: { action: 'clear', prefix: this.prefix }
      }));
      
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }

  // Additional utility methods

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== undefined;
  }

  async keys(): Promise<string[]> {
    const keys: string[] = [];
    const prefixWithColon = `${this.prefix}:`;
    
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(prefixWithColon)) {
        keys.push(key.substring(prefixWithColon.length));
      }
    }
    
    return keys;
  }

  async size(): Promise<number> {
    const keys = await this.keys();
    return keys.length;
  }

  async getMultiple(keys: string[]): Promise<Record<string, any>> {
    const result: Record<string, any> = {};
    
    await Promise.all(
      keys.map(async (key) => {
        result[key] = await this.get(key);
      })
    );
    
    return result;
  }

  async setMultiple(data: Record<string, any>): Promise<void> {
    await Promise.all(
      Object.entries(data).map(async ([key, value]) => {
        await this.set(key, value);
      })
    );
  }

  async removeMultiple(keys: string[]): Promise<void> {
    await Promise.all(
      keys.map(async (key) => {
        await this.remove(key);
      })
    );
  }

  // Export/Import functionality for backup/restore
  async export(): Promise<Record<string, any>> {
    const keys = await this.keys();
    return await this.getMultiple(keys);
  }

  async import(data: Record<string, any>, overwrite: boolean = false): Promise<void> {
    if (!overwrite) {
      // Only import keys that don't exist
      const existingKeys = await this.keys();
      const filteredData = Object.entries(data).reduce((acc, [key, value]) => {
        if (!existingKeys.includes(key)) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);
      
      await this.setMultiple(filteredData);
    } else {
      await this.setMultiple(data);
    }
  }

  // Storage quota management
  async getStorageQuota(): Promise<{ used: number; available: number; total: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          available: (estimate.quota || 0) - (estimate.usage || 0),
          total: estimate.quota || 0
        };
      } catch (error) {
        console.warn('Storage quota estimation not available:', error);
      }
    }

    // Fallback estimation
    const testKey = '__storage_test__';
    let used = 0;
    
    try {
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key) {
          const value = this.storage.getItem(key);
          used += key.length + (value?.length || 0);
        }
      }
    } catch (error) {
      console.warn('Storage size estimation failed:', error);
    }

    return {
      used,
      available: 5 * 1024 * 1024 - used, // Assume 5MB quota
      total: 5 * 1024 * 1024
    };
  }

  // Cleanup methods
  clearMemoryCache(): void {
    this.memoryCache.clear();
  }

  // Event listeners for storage changes
  onStorageChange(callback: (event: CustomEvent) => void): () => void {
    const handler = (event: Event) => {
      callback(event as CustomEvent);
    };
    
    window.addEventListener('plugin-storage-change', handler);
    
    return () => {
      window.removeEventListener('plugin-storage-change', handler);
    };
  }
}