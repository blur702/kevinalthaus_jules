import { Request, Response, NextFunction } from 'express';
import { CustomRequest, CustomResponse, ApiError } from '@/types';
import { isAppError, createErrorResponse } from '@/utils/errors';
import { createContextLogger } from '@/utils/logger';
import { isProduction } from '@/utils/config';

export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const customReq = req as CustomRequest;
  const customRes = res as CustomResponse;
  
  const logger = createContextLogger({
    correlationId: customReq.correlationId,
    method: req.method,
    url: req.url,
    ip: req.ip || 'unknown',
    userId: customReq.user?.id,
    userAgent: req.headers['user-agent'],
  });

  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    logger.error('Response already sent, delegating to default error handler', err);
    return next(err);
  }

  let apiError: ApiError;

  // Handle different types of errors
  if (isAppError(err)) {
    apiError = err;
  } else if (err.name === 'ValidationError') {
    // Joi validation error
    apiError = {
      name: 'ValidationError',
      message: err.message,
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      correlationId: customReq.correlationId,
      stack: err.stack,
    };
  } else if (err.name === 'UnauthorizedError') {
    // JWT middleware error
    apiError = {
      name: 'UnauthorizedError',
      message: 'Invalid token',
      statusCode: 401,
      code: 'AUTHENTICATION_ERROR',
      correlationId: customReq.correlationId,
      stack: err.stack,
    };
  } else if (err.name === 'SyntaxError' && 'body' in err) {
    // JSON parsing error
    apiError = {
      name: 'SyntaxError',
      message: 'Invalid JSON in request body',
      statusCode: 400,
      code: 'INVALID_JSON',
      correlationId: customReq.correlationId,
      stack: err.stack,
    };
  } else if (err.name === 'CastError') {
    // Database casting error
    apiError = {
      name: 'CastError',
      message: 'Invalid ID format',
      statusCode: 400,
      code: 'INVALID_ID_FORMAT',
      correlationId: customReq.correlationId,
      stack: err.stack,
    };
  } else if (err.message?.includes('ENOTFOUND') || err.message?.includes('ECONNREFUSED')) {
    // Network/service connection errors
    apiError = {
      name: 'ServiceConnectionError',
      message: 'Service temporarily unavailable',
      statusCode: 503,
      code: 'SERVICE_UNAVAILABLE',
      correlationId: customReq.correlationId,
      details: { originalError: err.message },
      stack: err.stack,
    };
  } else if (err.message?.includes('timeout')) {
    // Timeout errors
    apiError = {
      name: 'TimeoutError',
      message: 'Request timeout',
      statusCode: 504,
      code: 'REQUEST_TIMEOUT',
      correlationId: customReq.correlationId,
      stack: err.stack,
    };
  } else {
    // Generic server error
    apiError = {
      name: 'InternalServerError',
      message: isProduction() ? 'Internal server error' : err.message,
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      correlationId: customReq.correlationId,
      stack: err.stack,
    };
  }

  // Log error with appropriate level
  if (apiError.statusCode >= 500) {
    logger.error('Server error occurred', err, {
      statusCode: apiError.statusCode,
      code: apiError.code,
      details: apiError.details,
    });
  } else if (apiError.statusCode >= 400) {
    logger.warn('Client error occurred', {
      statusCode: apiError.statusCode,
      code: apiError.code,
      message: apiError.message,
      details: apiError.details,
    });
  }

  // Create error response
  const errorResponse = createErrorResponse(apiError, customReq.correlationId);

  // Add stack trace in development
  if (!isProduction() && apiError.stack) {
    (errorResponse.error as any).stack = apiError.stack;
  }

  // Set security headers
  customRes.removeHeader('X-Powered-By');
  customRes.setHeader('X-Content-Type-Options', 'nosniff');
  customRes.setHeader('X-Frame-Options', 'DENY');

  // Send error response
  customRes.status(apiError.statusCode).json(errorResponse);
};

// 404 handler for unmatched routes
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const customReq = req as CustomRequest;
  
  const logger = createContextLogger({
    correlationId: customReq.correlationId,
    method: req.method,
    url: req.url,
    ip: req.ip || 'unknown',
    userId: customReq.user?.id,
  });

  logger.warn('Route not found');

  const error = {
    name: 'NotFoundError',
    message: `Route ${req.method} ${req.path} not found`,
    statusCode: 404,
    code: 'ROUTE_NOT_FOUND',
    correlationId: customReq.correlationId,
  };

  const errorResponse = createErrorResponse(error as ApiError, customReq.correlationId);
  
  res.status(404).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Graceful error handling for uncaught exceptions
export const setupGlobalErrorHandlers = (): void => {
  process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Exception:', error);
    console.error('Stack:', error.stack);
    
    // Give time for any pending responses
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    
    // Don't exit the process in production for unhandled rejections
    // Just log them and continue
  });
};