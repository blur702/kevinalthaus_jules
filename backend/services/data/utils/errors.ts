export class ValidationError extends Error {
  public readonly code = 'VALIDATION_ERROR';
  public readonly statusCode = 400;
  
  constructor(
    message: string,
    public readonly details?: string[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class BusinessRuleViolationError extends Error {
  public readonly code = 'BUSINESS_RULE_VIOLATION';
  public readonly statusCode = 422;
  
  constructor(message: string) {
    super(message);
    this.name = 'BusinessRuleViolationError';
  }
}

export class NotFoundError extends Error {
  public readonly code = 'NOT_FOUND';
  public readonly statusCode = 404;
  
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  public readonly code = 'UNAUTHORIZED';
  public readonly statusCode = 401;
  
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  public readonly code = 'FORBIDDEN';
  public readonly statusCode = 403;
  
  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends Error {
  public readonly code = 'CONFLICT';
  public readonly statusCode = 409;
  
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}