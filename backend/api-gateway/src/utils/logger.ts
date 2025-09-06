import winston from 'winston';
import { appConfig, isProduction } from './config';
import { LogContext } from '@/types';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, correlationId, ...meta } = info;
    
    const logEntry = {
      timestamp,
      level,
      message,
      ...(correlationId && { correlationId }),
      ...meta,
    };

    return JSON.stringify(logEntry);
  })
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.simple(),
  winston.format.printf((info) => {
    const { timestamp, level, message, correlationId } = info;
    const correlationInfo = correlationId ? `[${correlationId}]` : '';
    return `${timestamp} ${level}: ${correlationInfo} ${message}`;
  })
);

export const logger = winston.createLogger({
  level: appConfig.logLevel,
  format: logFormat,
  defaultMeta: {
    service: 'api-gateway',
    environment: appConfig.nodeEnv,
  },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add console transport for non-production environments
if (!isProduction()) {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

export class ContextLogger {
  constructor(private readonly context: LogContext) {}

  info(message: string, meta?: Record<string, unknown>): void {
    logger.info(message, { ...this.context, ...meta });
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    logger.warn(message, { ...this.context, ...meta });
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    logger.error(message, {
      ...this.context,
      ...(error && { 
        error: error.message, 
        stack: error.stack 
      }),
      ...meta,
    });
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    logger.debug(message, { ...this.context, ...meta });
  }

  child(additionalContext: Partial<LogContext>): ContextLogger {
    return new ContextLogger({ ...this.context, ...additionalContext });
  }
}

export const createContextLogger = (context: LogContext): ContextLogger => {
  return new ContextLogger(context);
};