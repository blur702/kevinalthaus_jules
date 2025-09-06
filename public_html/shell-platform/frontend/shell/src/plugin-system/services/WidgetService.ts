/**
 * WidgetService - Widget management for plugins
 */

export class WidgetService {
  private widgets: Map<string, any> = new Map();
  
  async initialize(): Promise<void> {
    console.log('Widget service initialized');
  }

  registerWidget(widget: any): void {
    this.widgets.set(widget.id, widget);
  }

  unregisterWidget(id: string): void {
    this.widgets.delete(id);
  }

  getWidgets(zone?: string): any[] {
    const widgets = Array.from(this.widgets.values());
    if (zone) {
      return widgets.filter(w => w.zones?.includes(zone));
    }
    return widgets;
  }
}
