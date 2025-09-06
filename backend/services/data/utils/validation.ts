import * as Joi from 'joi';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateEntity = async (
  data: any,
  schema: Joi.Schema
): Promise<ValidationResult> => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message),
    };
  }

  return {
    isValid: true,
    errors: [],
  };
};

// Common validation schemas
export const commonSchemas = {
  uuid: Joi.string().uuid(),
  email: Joi.string().email(),
  password: Joi.string().min(8).max(128),
  url: Joi.string().uri(),
  phoneNumber: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/),
  date: Joi.date().iso(),
  positiveInteger: Joi.number().integer().min(0),
  currency: Joi.number().precision(2).min(0),
  status: Joi.string().valid('active', 'inactive', 'draft', 'archived'),
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(1000).default(10),
  },
  sorting: {
    sortBy: Joi.string().max(100),
    sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC'),
  },
};

// Validation middleware helper
export const createValidationMiddleware = (schema: Joi.Schema) => {
  return async (data: any): Promise<any> => {
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      throw new Error(`Validation failed: ${errorMessage}`);
    }

    return value;
  };
};