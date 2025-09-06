import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { CustomRequest, ValidationSchema } from '@/types';
import { ValidationError } from '@/utils/errors';

export const validateRequest = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const customReq = req as CustomRequest;
    const errors: Record<string, string> = {};

    // Validate request body
    if (schema.body) {
      const { error } = Joi.object(schema.body).validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });
      
      if (error) {
        errors.body = error.details.map(detail => detail.message).join(', ');
      }
    }

    // Validate query parameters
    if (schema.query) {
      const { error } = Joi.object(schema.query).validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
      });
      
      if (error) {
        errors.query = error.details.map(detail => detail.message).join(', ');
      }
    }

    // Validate route parameters
    if (schema.params) {
      const { error } = Joi.object(schema.params).validate(req.params, {
        abortEarly: false,
      });
      
      if (error) {
        errors.params = error.details.map(detail => detail.message).join(', ');
      }
    }

    // Validate headers
    if (schema.headers) {
      const { error } = Joi.object(schema.headers).validate(req.headers, {
        abortEarly: false,
        allowUnknown: true,
      });
      
      if (error) {
        errors.headers = error.details.map(detail => detail.message).join(', ');
      }
    }

    // If there are validation errors, return them
    if (Object.keys(errors).length > 0) {
      const validationError = new ValidationError(
        'Request validation failed',
        errors,
        customReq.correlationId
      );
      
      return next(validationError);
    }

    next();
  };
};

// Common validation schemas
export const commonSchemas = {
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  },
  
  id: {
    id: Joi.string().uuid().required(),
  },
  
  correlationId: {
    'x-correlation-id': Joi.string().uuid(),
    'x-request-id': Joi.string().uuid(),
  },
  
  authentication: {
    authorization: Joi.string().pattern(/^Bearer\s[\w\-._~+/]+=*$/).required(),
  },
  
  contentType: {
    'content-type': Joi.string().valid('application/json').required(),
  },
};

// Validation middleware for file uploads
export const validateFileUpload = (options: {
  maxSize?: number;
  allowedTypes?: string[];
  required?: boolean;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const customReq = req as CustomRequest;
    const { maxSize = 10 * 1024 * 1024, allowedTypes = [], required = false } = options;

    // Check if file is required
    if (required && (!req.file && !req.files)) {
      const error = new ValidationError(
        'File upload is required',
        { field: 'file' },
        customReq.correlationId
      );
      return next(error);
    }

    // If no file uploaded and not required, continue
    if (!req.file && !req.files) {
      return next();
    }

    const files = req.files ? (Array.isArray(req.files) ? req.files : [req.file]) : [req.file];

    for (const file of files) {
      if (!file) continue;

      // Check file size
      if (file.size > maxSize) {
        const error = new ValidationError(
          `File size exceeds maximum allowed size of ${maxSize} bytes`,
          { 
            field: 'file',
            maxSize,
            actualSize: file.size,
            filename: file.originalname,
          },
          customReq.correlationId
        );
        return next(error);
      }

      // Check file type
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
        const error = new ValidationError(
          `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
          {
            field: 'file',
            allowedTypes,
            actualType: file.mimetype,
            filename: file.originalname,
          },
          customReq.correlationId
        );
        return next(error);
      }
    }

    next();
  };
};