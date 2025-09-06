/**
 * NavigationService - Navigation management for plugins
 */

export class NavigationService {
  private items: Map<string, any> = new Map();
  
  async initialize(): Promise<void> {
    console.log('Navigation service initialized');
  }

  registerItem(item: any): void {
    this.items.set(item.id, item);
  }

  unregisterItem(id: string): void {
    this.items.delete(id);
  }

  getItems(position?: string): any[] {
    const items = Array.from(this.items.values());
    if (position) {
      return items.filter(item => item.position === position);
    }
    return items;
  }
}
