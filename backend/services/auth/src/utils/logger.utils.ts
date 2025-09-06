import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { CryptoUtils } from './crypto.utils';

export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_SUCCESS = 'PASSWORD_RESET_SUCCESS',
  EMAIL_VERIFICATION_REQUEST = 'EMAIL_VERIFICATION_REQUEST',
  EMAIL_VERIFICATION_SUCCESS = 'EMAIL_VERIFICATION_SUCCESS',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  TWO_FA_ENABLED = 'TWO_FA_ENABLED',
  TWO_FA_DISABLED = 'TWO_FA_DISABLED',
  TWO_FA_VERIFICATION_SUCCESS = 'TWO_FA_VERIFICATION_SUCCESS',
  TWO_FA_VERIFICATION_FAILURE = 'TWO_FA_VERIFICATION_FAILURE',
  SESSION_CREATED = 'SESSION_CREATED',
  SESSION_DESTROYED = 'SESSION_DESTROYED',
  CSRF_TOKEN_MISMATCH = 'CSRF_TOKEN_MISMATCH',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT = 'XSS_ATTEMPT'
}

export interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  email?: string;
  ipAddress: string;
  userAgent: string;
  details?: any;
  timestamp?: Date;
}

class Logger {
  private logger: winston.Logger;
  private securityLogger: winston.Logger;

  constructor() {
    const logDir = process.env.LOG_FILE_PATH || '/var/log/auth-service';

    // Custom format for structured logging
    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        // Mask sensitive data in logs
        const sanitizedMeta = this.sanitizeSensitiveData(meta);
        return JSON.stringify({
          timestamp,
          level,
          message,
          ...sanitizedMeta
        });
      })
    );

    // Transport for daily rotating files
    const fileRotateTransport = new DailyRotateFile({
      dirname: logDir,
      filename: 'application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '30d',
      format: logFormat
    });

    // Security-specific transport
    const securityRotateTransport = new DailyRotateFile({
      dirname: path.join(logDir, 'security'),
      filename: 'security-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '50m',
      maxFiles: '90d', // Keep security logs longer
      format: logFormat
    });

    // Main application logger
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      transports: [
        fileRotateTransport,
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
          silent: process.env.NODE_ENV === 'test'
        })
      ],
      exitOnError: false
    });

    // Security-specific logger
    this.securityLogger = winston.createLogger({
      level: 'info',
      format: logFormat,
      transports: [
        securityRotateTransport,
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize({ colors: { security: 'red' } }),
            winston.format.simple()
          ),
          silent: process.env.NODE_ENV === 'test'
        })
      ],
      exitOnError: false
    });
  }

  /**
   * Sanitize sensitive data from logs
   */
  private sanitizeSensitiveData(data: any): any {
    if (!data) return data;

    const sensitiveFields = [
      'password', 'token', 'refreshToken', 'accessToken',
      'apiKey', 'secret', 'authorization', 'cookie',
      'creditCard', 'ssn', 'pin', 'cvv'
    ];

    const sanitized = { ...data };

    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      const result: any = Array.isArray(obj) ? [] : {};

      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const lowerKey = key.toLowerCase();
          
          if (sensitiveFields.some(field => lowerKey.includes(field))) {
            result[key] = '[REDACTED]';
          } else if (typeof obj[key] === 'object') {
            result[key] = sanitizeObject(obj[key]);
          } else if (typeof obj[key] === 'string' && obj[key].length > 0) {
            // Check for patterns that look like tokens or secrets
            if (/^[A-Za-z0-9+/]{40,}={0,2}$/.test(obj[key]) ||
                /^[a-f0-9]{32,}$/i.test(obj[key])) {
              result[key] = CryptoUtils.maskSensitiveData(obj[key]);
            } else {
              result[key] = obj[key];
            }
          } else {
            result[key] = obj[key];
          }
        }
      }

      return result;
    };

    return sanitizeObject(sanitized);
  }

  /**
   * Log security event
   */
  logSecurityEvent(event: SecurityEvent): void {
    const logEntry = {
      ...event,
      timestamp: event.timestamp || new Date(),
      correlationId: this.generateCorrelationId()
    };

    this.securityLogger.warn('SECURITY_EVENT', logEntry);

    // Also log critical security events to main logger
    const criticalEvents = [
      SecurityEventType.ACCOUNT_LOCKED,
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      SecurityEventType.SQL_INJECTION_ATTEMPT,
      SecurityEventType.XSS_ATTEMPT,
      SecurityEventType.CSRF_TOKEN_MISMATCH
    ];

    if (criticalEvents.includes(event.type)) {
      this.logger.error('CRITICAL_SECURITY_EVENT', logEntry);
    }
  }

  /**
   * Generate correlation ID for request tracking
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Standard logging methods
   */
  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  error(message: string, error?: Error | any, meta?: any): void {
    if (error instanceof Error) {
      this.logger.error(message, {
        ...meta,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        }
      });
    } else {
      this.logger.error(message, { ...meta, error });
    }
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  /**
   * Audit log for compliance
   */
  audit(action: string, userId: string, details: any): void {
    const auditEntry = {
      action,
      userId,
      details: this.sanitizeSensitiveData(details),
      timestamp: new Date(),
      correlationId: this.generateCorrelationId()
    };

    this.logger.info('AUDIT', auditEntry);
    this.securityLogger.info('AUDIT', auditEntry);
  }

  /**
   * Performance logging
   */
  logPerformance(operation: string, duration: number, metadata?: any): void {
    const perfEntry = {
      operation,
      duration,
      metadata,
      timestamp: new Date()
    };

    if (duration > 1000) {
      this.logger.warn('SLOW_OPERATION', perfEntry);
    } else {
      this.logger.debug('PERFORMANCE', perfEntry);
    }
  }

  /**
   * Log failed validation attempt
   */
  logValidationFailure(field: string, value: any, errors: string[], context?: any): void {
    this.logger.warn('VALIDATION_FAILURE', {
      field,
      value: typeof value === 'string' ? CryptoUtils.maskSensitiveData(value) : '[COMPLEX_VALUE]',
      errors,
      context: this.sanitizeSensitiveData(context)
    });
  }

  /**
   * Create child logger with context
   */
  child(context: any): Logger {
    const childInstance = Object.create(this);
    childInstance.logger = this.logger.child(context);
    childInstance.securityLogger = this.securityLogger.child(context);
    return childInstance;
  }

  /**
   * Flush logs before shutdown
   */
  async flush(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.end(() => {
        this.securityLogger.end(() => {
          resolve();
        });
      });
    });
  }
}

// Export singleton instance
export const logger = new Logger();