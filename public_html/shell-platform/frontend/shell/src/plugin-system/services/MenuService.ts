/**
 * Menu Service
 * Service that plugins use to register menu items
 */

import { MenuItem } from '../../components/Menu/MenuComponent';
import { PluginHooks } from '../PluginHooks';

export class MenuService {
  private menuItems: Map<string, MenuItem>;
  private hooks: PluginHooks;

  constructor(hooks: PluginHooks) {
    this.menuItems = new Map();
    this.hooks = hooks;
  }

  /**
   * Initialize menu service
   */
  async initialize(): Promise<void> {
    // Register menu filters
    this.hooks.addFilter('menu.items', this.getMenuItems.bind(this), 10, 'menu-service');
  }

  /**
   * Register a menu item from a plugin
   */
  registerMenuItem(pluginId: string, item: MenuItem): void {
    const itemId = `${pluginId}-${item.id}`;
    
    // Store with plugin prefix to avoid conflicts
    this.menuItems.set(itemId, {
      ...item,
      id: itemId
    });

    // Notify menu component to refresh
    this.hooks.doAction('menu.updated');
  }

  /**
   * Register multiple menu items
   */
  registerMenuItems(pluginId: string, items: MenuItem[]): void {
    for (const item of items) {
      this.registerMenuItem(pluginId, item);
    }
  }

  /**
   * Update a menu item
   */
  updateMenuItem(pluginId: string, itemId: string, updates: Partial<MenuItem>): void {
    const fullId = `${pluginId}-${itemId}`;
    const existing = this.menuItems.get(fullId);
    
    if (existing) {
      this.menuItems.set(fullId, {
        ...existing,
        ...updates
      });
      
      this.hooks.doAction('menu.updated');
    }
  }

  /**
   * Remove a menu item
   */
  removeMenuItem(pluginId: string, itemId: string): void {
    const fullId = `${pluginId}-${itemId}`;
    
    if (this.menuItems.delete(fullId)) {
      this.hooks.doAction('menu.updated');
    }
  }

  /**
   * Remove all menu items for a plugin
   */
  removePluginMenuItems(pluginId: string): void {
    let removed = false;
    
    for (const [key] of this.menuItems) {
      if (key.startsWith(`${pluginId}-`)) {
        this.menuItems.delete(key);
        removed = true;
      }
    }
    
    if (removed) {
      this.hooks.doAction('menu.updated');
    }
  }

  /**
   * Set menu item badge
   */
  setMenuBadge(pluginId: string, itemId: string, badge: string | number | null): void {
    const fullId = `${pluginId}-${itemId}`;
    const item = this.menuItems.get(fullId);
    
    if (item) {
      if (badge === null) {
        delete item.badge;
      } else {
        item.badge = badge;
      }
      
      this.hooks.doAction('menu.updated');
    }
  }

  /**
   * Enable/disable menu item
   */
  setMenuItemEnabled(pluginId: string, itemId: string, enabled: boolean): void {
    const fullId = `${pluginId}-${itemId}`;
    const item = this.menuItems.get(fullId);
    
    if (item) {
      item.disabled = !enabled;
      this.hooks.doAction('menu.updated');
    }
  }

  /**
   * Get all menu items (used by menu component)
   */
  private getMenuItems(existingItems: MenuItem[]): MenuItem[] {
    // Convert map to array and organize hierarchy
    const items = Array.from(this.menuItems.values());
    
    // Build hierarchy if items have parent relationships
    const rootItems: MenuItem[] = [];
    const itemsById = new Map<string, MenuItem>();
    
    // First pass: index all items
    for (const item of items) {
      itemsById.set(item.id, item);
    }
    
    // Second pass: build hierarchy
    for (const item of items) {
      // Check if item has a parent specified in its data
      const parentId = (item as any).parent;
      
      if (parentId && itemsById.has(parentId)) {
        // Add as child to parent
        const parent = itemsById.get(parentId)!;
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(item);
      } else {
        // Add as root item
        rootItems.push(item);
      }
    }
    
    // Combine with existing items
    return [...existingItems, ...rootItems];
  }

  /**
   * Get menu items for a specific plugin
   */
  getPluginMenuItems(pluginId: string): MenuItem[] {
    const items: MenuItem[] = [];
    
    for (const [key, value] of this.menuItems) {
      if (key.startsWith(`${pluginId}-`)) {
        items.push(value);
      }
    }
    
    return items;
  }

  /**
   * Clear all menu items
   */
  clearAll(): void {
    this.menuItems.clear();
    this.hooks.doAction('menu.updated');
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    this.clearAll();
    this.hooks.removeFilter('menu.items', 'menu-service');
  }
}