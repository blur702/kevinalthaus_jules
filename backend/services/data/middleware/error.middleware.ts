import { Request, Response, NextFunction } from 'express';
import {
  ValidationError,
  BusinessRuleViolationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} from '../utils/errors';

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    stack?: string;
  };
  meta: {
    timestamp: string;
    requestId: string;
    path: string;
    method: string;
  };
}

export class ErrorMiddleware {
  // Main error handling middleware
  static handleError() {
    return (error: Error, req: Request, res: Response, next: NextFunction): void => {
      // Log the error
      ErrorMiddleware.logError(error, req);

      // Determine error type and response
      const errorResponse = ErrorMiddleware.createErrorResponse(error, req);

      // Set appropriate HTTP status
      const statusCode = ErrorMiddleware.getStatusCode(error);

      // Add security headers
      res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      });

      // Send error response
      res.status(statusCode).json(errorResponse);
    };
  }

  // 404 handler for unmatched routes
  static handleNotFound() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const error = new NotFoundError(`Route ${req.method} ${req.path} not found`);
      next(error);
    };
  }

  // Async error wrapper for controllers
  static asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction): void => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  // Validation error handler
  static handleValidationError() {
    return (error: Error, req: Request, res: Response, next: NextFunction): void => {
      // Handle Joi validation errors
      if (error.name === 'ValidationError') {
        const validationError = new ValidationError(
          error.message,
          (error as any).details?.map((d: any) => d.message) || []
        );
        return next(validationError);
      }

      // Handle TypeORM query errors
      if (error.name === 'QueryFailedError') {
        const queryError = error as any;
        
        // Handle unique constraint violations
        if (queryError.code === '23505') {
          const conflictError = new ConflictError('Resource already exists');
          return next(conflictError);
        }

        // Handle foreign key violations
        if (queryError.code === '23503') {
          const validationError = new ValidationError(
            'Referenced resource does not exist'
          );
          return next(validationError);
        }

        // Handle check constraint violations
        if (queryError.code === '23514') {
          const validationError = new ValidationError(
            'Data does not meet constraint requirements'
          );
          return next(validationError);
        }
      }

      next(error);
    };
  }

  // Database connection error handler
  static handleDatabaseError() {
    return (error: Error, req: Request, res: Response, next: NextFunction): void => {
      // Handle connection timeouts
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        const timeoutError = new Error('Database connection timeout');
        (timeoutError as any).statusCode = 503;
        (timeoutError as any).code = 'DATABASE_TIMEOUT';
        return next(timeoutError);
      }

      // Handle connection errors
      if (error.message.includes('ECONNREFUSED') || error.message.includes('connect')) {
        const connectionError = new Error('Database connection failed');
        (connectionError as any).statusCode = 503;
        (connectionError as any).code = 'DATABASE_CONNECTION_ERROR';
        return next(connectionError);
      }

      next(error);
    };
  }

  // Rate limit error handler
  static handleRateLimit() {
    return (req: Request, res: Response): void => {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          path: req.path,
          method: req.method,
        },
      };

      res.status(429).json(errorResponse);
    };
  }

  // Request timeout handler
  static handleTimeout(timeoutMs: number = 30000) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const timeout = setTimeout(() => {
        if (!res.headersSent) {
          const timeoutError = new Error('Request timeout');
          (timeoutError as any).statusCode = 408;
          (timeoutError as any).code = 'REQUEST_TIMEOUT';
          next(timeoutError);
        }
      }, timeoutMs);

      // Clear timeout when response is finished
      res.on('finish', () => {
        clearTimeout(timeout);
      });

      next();
    };
  }

  // Helper methods
  private static createErrorResponse(error: Error, req: Request): ErrorResponse {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return {
      success: false,
      error: {
        code: (error as any).code || 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred',
        details: (error as any).details || undefined,
        stack: isDevelopment ? error.stack : undefined,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown',
        path: req.path,
        method: req.method,
      },
    };
  }

  private static getStatusCode(error: Error): number {
    // Check if error has a status code property
    if ((error as any).statusCode) {
      return (error as any).statusCode;
    }

    // Map error types to status codes
    if (error instanceof ValidationError) return 400;
    if (error instanceof UnauthorizedError) return 401;
    if (error instanceof ForbiddenError) return 403;
    if (error instanceof NotFoundError) return 404;
    if (error instanceof ConflictError) return 409;
    if (error instanceof BusinessRuleViolationError) return 422;

    // Handle specific error names
    switch (error.name) {
      case 'CastError':
      case 'ValidationError':
        return 400;
      case 'UnauthorizedError':
        return 401;
      case 'ForbiddenError':
        return 403;
      case 'NotFoundError':
        return 404;
      case 'ConflictError':
        return 409;
      default:
        return 500;
    }
  }

  private static logError(error: Error, req: Request): void {
    const logData = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      request: {
        method: req.method,
        path: req.path,
        query: req.query,
        body: ErrorMiddleware.sanitizeRequestBody(req.body),
        headers: ErrorMiddleware.sanitizeHeaders(req.headers),
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'],
    };

    // In production, send to logging service (e.g., Winston, Sentry)
    console.error('Application Error:', JSON.stringify(logData, null, 2));

    // Report to monitoring service
    ErrorMiddleware.reportToMonitoring(error, req);
  }

  private static sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    // Remove sensitive fields
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'apiKey'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private static sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
    ];

    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private static reportToMonitoring(error: Error, req: Request): void {
    // In production, integrate with monitoring services like:
    // - Sentry
    // - New Relic
    // - DataDog
    // - Custom monitoring solution

    // For now, just log
    console.warn('Error reported to monitoring:', {
      error: error.name,
      message: error.message,
      path: req.path,
      method: req.method,
    });
  }
}

// Export middleware functions for easier use
export const handleError = ErrorMiddleware.handleError;
export const handleNotFound = ErrorMiddleware.handleNotFound;
export const asyncHandler = ErrorMiddleware.asyncHandler;
export const handleValidationError = ErrorMiddleware.handleValidationError;
export const handleDatabaseError = ErrorMiddleware.handleDatabaseError;
export const handleRateLimit = ErrorMiddleware.handleRateLimit;
export const handleTimeout = ErrorMiddleware.handleTimeout;