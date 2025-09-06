/**
 * LoggingService - Logging service for plugins
 */

export class LoggingService {
  private logs: any[] = [];
  
  async initialize(): Promise<void> {
    console.log('Logging service initialized');
  }

  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    const entry = {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      source: 'plugin',
    };
    
    this.logs.push(entry);
    
    // Also log to console
    console[level](message, data);
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  getLogs(level?: string): any[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return this.logs;
  }
}
