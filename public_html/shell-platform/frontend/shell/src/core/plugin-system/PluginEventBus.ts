import { EventEmitter } from './EventEmitter';
import { PluginEventBus } from '../../types/plugin.types';

export interface PluginEvent {
  type: string;
  pluginId: string;
  data?: any;
  timestamp: number;
  source: 'plugin' | 'system' | 'user';
}

export interface EventSubscription {
  id: string;
  pluginId: string;
  event: string;
  callback: (data: any) => void;
  once: boolean;
  createdAt: number;
}

export class PluginEventBusImpl extends EventEmitter implements PluginEventBus {
  private subscriptions: Map<string, EventSubscription> = new Map();
  private eventHistory: PluginEvent[] = [];
  private maxHistorySize = 1000;
  private debugging = process.env.NODE_ENV === 'development';

  emit(event: string, data?: any): void {
    const pluginEvent: PluginEvent = {
      type: event,
      pluginId: this.extractPluginId(event),
      data,
      timestamp: Date.now(),
      source: this.determineSource(event)
    };

    // Add to history
    this.addToHistory(pluginEvent);

    // Debug logging
    if (this.debugging) {
      console.log(`[EventBus] Emitting event: ${event}`, data);
    }

    // Emit the event using parent class
    super.emit(event, data);

    // Special handling for system events
    this.handleSystemEvents(pluginEvent);
  }

  on(event: string, callback: (data: any) => void): () => void {
    const subscriptionId = this.generateSubscriptionId();
    const pluginId = this.extractPluginId(event);

    const subscription: EventSubscription = {
      id: subscriptionId,
      pluginId,
      event,
      callback,
      once: false,
      createdAt: Date.now()
    };

    this.subscriptions.set(subscriptionId, subscription);

    if (this.debugging) {
      console.log(`[EventBus] Subscription created: ${event} by plugin ${pluginId}`);
    }

    // Use parent class method and wrap callback for cleanup
    const unsubscribe = super.on(event, (data) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[EventBus] Error in event callback for ${event}:`, error);
        this.emit('system:error', {
          type: 'callback-error',
          event,
          pluginId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    // Return cleanup function
    return () => {
      this.subscriptions.delete(subscriptionId);
      unsubscribe();
      
      if (this.debugging) {
        console.log(`[EventBus] Subscription removed: ${subscriptionId}`);
      }
    };
  }

  off(event: string, callback: (data: any) => void): void {
    // Find and remove subscription
    for (const [id, subscription] of this.subscriptions) {
      if (subscription.event === event && subscription.callback === callback) {
        this.subscriptions.delete(id);
        break;
      }
    }

    super.off(event, callback);

    if (this.debugging) {
      console.log(`[EventBus] Event listener removed: ${event}`);
    }
  }

  // Enhanced methods

  once(event: string, callback: (data: any) => void): () => void {
    const subscriptionId = this.generateSubscriptionId();
    const pluginId = this.extractPluginId(event);

    const subscription: EventSubscription = {
      id: subscriptionId,
      pluginId,
      event,
      callback,
      once: true,
      createdAt: Date.now()
    };

    this.subscriptions.set(subscriptionId, subscription);

    const unsubscribe = super.once(event, (data) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`[EventBus] Error in once callback for ${event}:`, error);
        this.emit('system:error', {
          type: 'callback-error',
          event,
          pluginId,
          error: error instanceof Error ? error.message : String(error)
        });
      } finally {
        this.subscriptions.delete(subscriptionId);
      }
    });

    return () => {
      this.subscriptions.delete(subscriptionId);
      unsubscribe();
    };
  }

  // Plugin-specific methods

  emitToPlugin(pluginId: string, event: string, data?: any): void {
    this.emit(`plugin:${pluginId}:${event}`, data);
  }

  emitFromPlugin(pluginId: string, event: string, data?: any): void {
    const scopedEvent = event.startsWith(`plugin:${pluginId}:`) ? event : `plugin:${pluginId}:${event}`;
    this.emit(scopedEvent, data);
  }

  subscribeToPlugin(pluginId: string, event: string, callback: (data: any) => void): () => void {
    return this.on(`plugin:${pluginId}:${event}`, callback);
  }

  broadcast(event: string, data?: any, excludePluginId?: string): void {
    const broadcastEvent: PluginEvent = {
      type: 'broadcast:' + event,
      pluginId: 'system',
      data,
      timestamp: Date.now(),
      source: 'system'
    };

    this.addToHistory(broadcastEvent);

    // Emit to all subscribed plugins
    for (const subscription of this.subscriptions.values()) {
      if (subscription.event === event && subscription.pluginId !== excludePluginId) {
        try {
          subscription.callback(data);
        } catch (error) {
          console.error(`[EventBus] Error in broadcast callback:`, error);
        }
      }
    }

    if (this.debugging) {
      console.log(`[EventBus] Broadcast event: ${event}`, data);
    }
  }

  // Event history and debugging

  getEventHistory(pluginId?: string, eventType?: string, limit = 100): PluginEvent[] {
    let filtered = this.eventHistory;

    if (pluginId) {
      filtered = filtered.filter(event => event.pluginId === pluginId);
    }

    if (eventType) {
      filtered = filtered.filter(event => event.type.includes(eventType));
    }

    return filtered.slice(-limit);
  }

  getActiveSubscriptions(pluginId?: string): EventSubscription[] {
    const subscriptions = Array.from(this.subscriptions.values());
    
    if (pluginId) {
      return subscriptions.filter(sub => sub.pluginId === pluginId);
    }

    return subscriptions;
  }

  clearHistory(): void {
    this.eventHistory = [];
  }

  removeAllSubscriptionsForPlugin(pluginId: string): void {
    const toRemove = Array.from(this.subscriptions.entries())
      .filter(([, subscription]) => subscription.pluginId === pluginId);

    toRemove.forEach(([id, subscription]) => {
      this.subscriptions.delete(id);
      super.off(subscription.event, subscription.callback);
    });

    if (this.debugging) {
      console.log(`[EventBus] Removed ${toRemove.length} subscriptions for plugin: ${pluginId}`);
    }
  }

  // System event handling

  private handleSystemEvents(event: PluginEvent): void {
    switch (event.type) {
      case 'plugin:loaded':
        this.emit('system:plugin:lifecycle', {
          action: 'loaded',
          pluginId: event.pluginId,
          timestamp: event.timestamp
        });
        break;

      case 'plugin:unloaded':
        this.removeAllSubscriptionsForPlugin(event.pluginId);
        this.emit('system:plugin:lifecycle', {
          action: 'unloaded',
          pluginId: event.pluginId,
          timestamp: event.timestamp
        });
        break;

      case 'plugin:error':
        this.emit('system:plugin:error', {
          pluginId: event.pluginId,
          error: event.data,
          timestamp: event.timestamp
        });
        break;

      case 'theme:change':
        this.broadcast('theme:changed', event.data);
        break;

      case 'user:change':
        this.broadcast('user:changed', event.data);
        break;
    }
  }

  // Utility methods

  private extractPluginId(event: string): string {
    const match = event.match(/^plugin:([^:]+):/);
    return match ? match[1] : 'system';
  }

  private determineSource(event: string): 'plugin' | 'system' | 'user' {
    if (event.startsWith('plugin:')) return 'plugin';
    if (event.startsWith('system:')) return 'system';
    if (event.startsWith('user:')) return 'user';
    return 'system';
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addToHistory(event: PluginEvent): void {
    this.eventHistory.push(event);
    
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  // Debug methods

  enableDebugging(enabled = true): void {
    this.debugging = enabled;
  }

  getStats(): {
    activeSubscriptions: number;
    eventHistory: number;
    pluginCounts: Record<string, number>;
  } {
    const pluginCounts: Record<string, number> = {};
    
    for (const subscription of this.subscriptions.values()) {
      pluginCounts[subscription.pluginId] = (pluginCounts[subscription.pluginId] || 0) + 1;
    }

    return {
      activeSubscriptions: this.subscriptions.size,
      eventHistory: this.eventHistory.length,
      pluginCounts
    };
  }

  // Performance monitoring
  private performanceMetrics: Map<string, { count: number; totalTime: number }> = new Map();

  measureEventPerformance<T>(event: string, fn: () => T): T {
    if (!this.debugging) {
      return fn();
    }

    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();
    const duration = endTime - startTime;

    const metrics = this.performanceMetrics.get(event) || { count: 0, totalTime: 0 };
    metrics.count++;
    metrics.totalTime += duration;
    this.performanceMetrics.set(event, metrics);

    if (duration > 10) { // Log slow events (>10ms)
      console.warn(`[EventBus] Slow event: ${event} took ${duration.toFixed(2)}ms`);
    }

    return result;
  }

  getPerformanceMetrics(): Record<string, { count: number; avgTime: number; totalTime: number }> {
    const result: Record<string, { count: number; avgTime: number; totalTime: number }> = {};

    for (const [event, metrics] of this.performanceMetrics.entries()) {
      result[event] = {
        count: metrics.count,
        avgTime: metrics.totalTime / metrics.count,
        totalTime: metrics.totalTime
      };
    }

    return result;
  }
}