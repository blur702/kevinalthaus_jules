/**
 * EventBus - Inter-plugin communication system
 * Allows plugins to communicate without direct dependencies
 */

export interface EventHandler {
  pluginId?: string;
  handler: (data: any) => void | Promise<void>;
  priority?: number;
}

export class EventBus {
  private static instance: EventBus;
  private events: Map<string, EventHandler[]> = new Map();
  private eventHistory: Array<{ event: string; data: any; timestamp: Date }> = [];
  private maxHistorySize: number = 100;

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Subscribe to an event
   */
  public on(event: string, handler: EventHandler | ((data: any) => void)): void {
    const eventHandler: EventHandler = 
      typeof handler === 'function' 
        ? { handler, priority: 0 } 
        : handler;

    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    const handlers = this.events.get(event)!;
    handlers.push(eventHandler);
    
    // Sort by priority (higher priority first)
    handlers.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Subscribe to an event once
   */
  public once(event: string, handler: (data: any) => void): void {
    const onceHandler = (data: any) => {
      handler(data);
      this.off(event, onceHandler);
    };
    this.on(event, onceHandler);
  }

  /**
   * Unsubscribe from an event
   */
  public off(event: string, handler?: ((data: any) => void) | string): void {
    const handlers = this.events.get(event);
    if (!handlers) return;

    if (!handler) {
      // Remove all handlers
      this.events.delete(event);
    } else if (typeof handler === 'string') {
      // Remove by plugin ID
      const filtered = handlers.filter(h => h.pluginId !== handler);
      if (filtered.length > 0) {
        this.events.set(event, filtered);
      } else {
        this.events.delete(event);
      }
    } else {
      // Remove specific handler
      const filtered = handlers.filter(h => h.handler !== handler);
      if (filtered.length > 0) {
        this.events.set(event, filtered);
      } else {
        this.events.delete(event);
      }
    }
  }

  /**
   * Emit an event
   */
  public async emit(event: string, data?: any): Promise<void> {
    // Record in history
    this.recordEvent(event, data);

    const handlers = this.events.get(event);
    if (!handlers) return;

    // Execute handlers in priority order
    for (const handler of handlers) {
      try {
        await handler.handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    }

    // Emit wildcard event
    const wildcardHandlers = this.events.get('*');
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        try {
          await handler.handler({ event, data });
        } catch (error) {
          console.error(`Error in wildcard handler:`, error);
        }
      }
    }
  }

  /**
   * Emit an event synchronously
   */
  public emitSync(event: string, data?: any): void {
    // Record in history
    this.recordEvent(event, data);

    const handlers = this.events.get(event);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        const result = handler.handler(data);
        if (result instanceof Promise) {
          result.catch(error => 
            console.error(`Error in async handler for ${event}:`, error)
          );
        }
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    }
  }

  /**
   * Record event in history
   */
  private recordEvent(event: string, data: any): void {
    this.eventHistory.push({
      event,
      data,
      timestamp: new Date(),
    });

    // Trim history if needed
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get event history
   */
  public getHistory(event?: string): Array<{ event: string; data: any; timestamp: Date }> {
    if (event) {
      return this.eventHistory.filter(h => h.event === event);
    }
    return [...this.eventHistory];
  }

  /**
   * Clear event history
   */
  public clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get all registered events
   */
  public getEvents(): string[] {
    return Array.from(this.events.keys());
  }

  /**
   * Get handler count for an event
   */
  public getHandlerCount(event: string): number {
    return this.events.get(event)?.length || 0;
  }

  /**
   * Remove all handlers for a plugin
   */
  public removePluginHandlers(pluginId: string): void {
    for (const [event, handlers] of this.events) {
      const filtered = handlers.filter(h => h.pluginId !== pluginId);
      if (filtered.length > 0) {
        this.events.set(event, filtered);
      } else {
        this.events.delete(event);
      }
    }
  }

  /**
   * Clear all events (for testing)
   */
  public clear(): void {
    this.events.clear();
    this.eventHistory = [];
  }
}