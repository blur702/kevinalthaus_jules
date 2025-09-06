import { ApiError } from '@/types';

export class AppError extends Error implements ApiError {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;
  public readonly correlationId?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_SERVER_ERROR',
    details?: Record<string, unknown>,
    correlationId?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.correlationId = correlationId;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    details?: Record<string, unknown>,
    correlationId?: string
  ) {
    super(message, 400, 'VALIDATION_ERROR', details, correlationId);
  }
}

export class AuthenticationError extends AppError {
  constructor(
    message: string = 'Authentication failed',
    correlationId?: string
  ) {
    super(message, 401, 'AUTHENTICATION_ERROR', undefined, correlationId);
  }
}

export class AuthorizationError extends AppError {
  constructor(
    message: string = 'Insufficient permissions',
    correlationId?: string
  ) {
    super(message, 403, 'AUTHORIZATION_ERROR', undefined, correlationId);
  }
}

export class NotFoundError extends AppError {
  constructor(
    message: string = 'Resource not found',
    correlationId?: string
  ) {
    super(message, 404, 'NOT_FOUND_ERROR', undefined, correlationId);
  }
}

export class RateLimitError extends AppError {
  constructor(
    message: string = 'Rate limit exceeded',
    correlationId?: string
  ) {
    super(message, 429, 'RATE_LIMIT_ERROR', undefined, correlationId);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(
    message: string = 'Service temporarily unavailable',
    correlationId?: string
  ) {
    super(message, 503, 'SERVICE_UNAVAILABLE_ERROR', undefined, correlationId);
  }
}

export class CircuitBreakerError extends AppError {
  constructor(
    serviceName: string,
    correlationId?: string
  ) {
    super(
      `Circuit breaker is open for service: ${serviceName}`,
      503,
      'CIRCUIT_BREAKER_OPEN',
      { serviceName },
      correlationId
    );
  }
}

export class TimeoutError extends AppError {
  constructor(
    serviceName: string,
    timeout: number,
    correlationId?: string
  ) {
    super(
      `Request timeout for service: ${serviceName}`,
      504,
      'REQUEST_TIMEOUT',
      { serviceName, timeout },
      correlationId
    );
  }
}

export const isAppError = (error: unknown): error is ApiError => {
  return error instanceof AppError;
};

export const createErrorResponse = (error: ApiError, correlationId: string) => {
  return {
    error: {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      correlationId,
      ...(error.details && { details: error.details }),
      timestamp: new Date().toISOString(),
    },
  };
};