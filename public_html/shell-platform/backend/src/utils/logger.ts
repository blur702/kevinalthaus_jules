import fs from 'fs';
import path from 'path';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: any;
}

export class Logger {
  private static instance: Logger;
  private logDirectory: string;

  constructor() {
    this.logDirectory = path.join(process.cwd(), 'logs');
    this.ensureLogDirectory();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public info(message: string, context?: any): void {
    this.log('info', message, context);
  }

  public warn(message: string, context?: any): void {
    this.log('warn', message, context);
  }

  public error(message: string, context?: any): void {
    this.log('error', message, context);
  }

  public debug(message: string, context?: any): void {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, context);
    }
  }

  private log(level: LogEntry['level'], message: string, context?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      timestamp,
      level,
      message,
      context,
    };

    // Console output with colors
    const coloredOutput = this.colorizeOutput(logEntry);
    console.log(coloredOutput);

    // File output
    this.writeToFile(logEntry);
  }

  private colorizeOutput(entry: LogEntry): string {
    const colors = {
      info: '\x1b[36m',  // Cyan
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m', // Red
      debug: '\x1b[35m', // Magenta
      reset: '\x1b[0m',  // Reset
    };

    const timestamp = entry.timestamp;
    const level = entry.level.toUpperCase();
    const message = entry.message;
    const context = entry.context ? ` ${JSON.stringify(entry.context)}` : '';

    return `${colors[entry.level]}[${timestamp}] ${level}: ${message}${context}${colors.reset}`;
  }

  private writeToFile(entry: LogEntry): void {
    try {
      const date = new Date().toISOString().split('T')[0];
      const filename = `${date}.log`;
      const filepath = path.join(this.logDirectory, filename);
      
      const logLine = `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${entry.context ? ` ${JSON.stringify(entry.context)}` : ''}\n`;
      
      fs.appendFileSync(filepath, logLine);
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }

  private ensureLogDirectory(): void {
    try {
      if (!fs.existsSync(this.logDirectory)) {
        fs.mkdirSync(this.logDirectory, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  public getLogs(level?: LogEntry['level'], limit?: number): LogEntry[] {
    // This is a simplified implementation
    // In a production app, you'd want to use a proper log management system
    try {
      const date = new Date().toISOString().split('T')[0];
      const filename = `${date}.log`;
      const filepath = path.join(this.logDirectory, filename);
      
      if (!fs.existsSync(filepath)) {
        return [];
      }
      
      const content = fs.readFileSync(filepath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.length > 0);
      
      const entries: LogEntry[] = lines.map(line => {
        const match = line.match(/\[(.*?)\] (.*?): (.*?)(?:\s(\{.*\}))?$/);
        if (match) {
          return {
            timestamp: match[1],
            level: match[2].toLowerCase() as LogEntry['level'],
            message: match[3],
            context: match[4] ? JSON.parse(match[4]) : undefined,
          };
        }
        return null;
      }).filter(entry => entry !== null) as LogEntry[];
      
      let filteredEntries = entries;
      
      if (level) {
        filteredEntries = filteredEntries.filter(entry => entry.level === level);
      }
      
      if (limit) {
        filteredEntries = filteredEntries.slice(-limit);
      }
      
      return filteredEntries.reverse();
    } catch (error) {
      console.error('Failed to read logs:', error);
      return [];
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();
export default logger;