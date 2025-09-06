/**
 * NotificationService - Notification service for plugins
 */

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id?: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

export class NotificationService {
  private listeners: Set<(notification: Notification) => void> = new Set();

  async initialize(): Promise<void> {
    console.log('Notification service initialized');
  }

  show(notification: Notification): void {
    const id = notification.id || this.generateId();
    const fullNotification = { ...notification, id };
    
    this.listeners.forEach(listener => listener(fullNotification));
    
    if (notification.duration) {
      setTimeout(() => this.dismiss(id), notification.duration);
    }
  }

  success(title: string, message?: string): void {
    this.show({ type: 'success', title, message, duration: 3000 });
  }

  error(title: string, message?: string): void {
    this.show({ type: 'error', title, message, duration: 5000 });
  }

  warning(title: string, message?: string): void {
    this.show({ type: 'warning', title, message, duration: 4000 });
  }

  info(title: string, message?: string): void {
    this.show({ type: 'info', title, message, duration: 3000 });
  }

  dismiss(id: string): void {
    // Emit dismiss event
  }

  onNotification(callback: (notification: Notification) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private generateId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}