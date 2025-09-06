import winston from 'winston';

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Security logging
export const logSecurity = (event: string, userId: string, details: any) => {
  logger.warn('SECURITY_EVENT', {
    event,
    userId,
    details,
    timestamp: new Date().toISOString()
  });
};

// Performance logging
export const logPerformance = (operation: string, duration: number, details: any = {}) => {
  logger.info('PERFORMANCE', {
    operation,
    duration,
    details,
    timestamp: new Date().toISOString()
  });
};

export { logger };