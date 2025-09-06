/**
 * CacheService - Caching service for plugins
 */

export class CacheService {
  private cache: Map<string, { value: any; expires: number }> = new Map();

  async initialize(): Promise<void> {
    console.log('Cache service initialized');
  }

  set(key: string, value: any, ttl?: number): void {
    const expires = ttl ? Date.now() + ttl * 1000 : Infinity;
    this.cache.set(key, { value, expires });
  }

  get(key: string): any {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (item.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (item.expires < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
}