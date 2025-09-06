import { Request, Response, NextFunction } from 'express';
import { ResourceService } from '../services/resource.service';
import { BaseController } from './base.controller';
import { Resource } from '../entities/sample-resource.entity';
import { QueryContext, SearchOptions } from '../types/query.types';
import { ValidationError, NotFoundError } from '../utils/errors';
import * as Joi from 'joi';

export class ResourceController extends BaseController<Resource> {
  private resourceService: ResourceService;

  constructor(resourceService: ResourceService) {
    super(resourceService);
    this.resourceService = resourceService;
  }

  // Validation schemas
  private readonly createSchema = Joi.object({
    name: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(10000).optional().allow(null, ''),
    status: Joi.string().valid('draft', 'active', 'inactive', 'archived').default('draft'),
    category: Joi.string().max(100).optional(),
    price: Joi.number().min(0).precision(2).optional(),
    quantity: Joi.number().integer().min(0).default(0),
    attributes: Joi.object().optional(),
    tags: Joi.array().items(Joi.string().max(50)).max(20).optional(),
    isFeatured: Joi.boolean().default(false),
    publishedAt: Joi.date().optional(),
  });

  private readonly updateSchema = Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    description: Joi.string().max(10000).optional().allow(null, ''),
    status: Joi.string().valid('draft', 'active', 'inactive', 'archived').optional(),
    category: Joi.string().max(100).optional(),
    price: Joi.number().min(0).precision(2).optional(),
    quantity: Joi.number().integer().min(0).optional(),
    attributes: Joi.object().optional(),
    tags: Joi.array().items(Joi.string().max(50)).max(20).optional(),
    isFeatured: Joi.boolean().optional(),
    publishedAt: Joi.date().optional(),
    version: Joi.number().integer().optional(),
  });

  private readonly partialUpdateSchema = Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    description: Joi.string().max(10000).optional().allow(null, ''),
    status: Joi.string().valid('draft', 'active', 'inactive', 'archived').optional(),
    category: Joi.string().max(100).optional(),
    price: Joi.number().min(0).precision(2).optional(),
    quantity: Joi.number().integer().min(0).optional(),
    attributes: Joi.object().optional(),
    tags: Joi.array().items(Joi.string().max(50)).max(20).optional(),
    isFeatured: Joi.boolean().optional(),
    publishedAt: Joi.date().optional(),
    version: Joi.number().integer().optional(),
  }).min(1); // At least one field must be provided for partial update

  // Custom endpoints specific to resources
  
  // GET /resources/featured - Get featured resources
  public getFeatured = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const context = this.extractContext(req);
      const limit = parseInt(req.query.limit as string) || 10;

      if (limit > 100) {
        throw new ValidationError('Featured resources limit cannot exceed 100');
      }

      const resources = await this.resourceService.findFeatured(limit, context);

      // Set cache headers for featured content
      res.set('Cache-Control', 'public, max-age=900'); // 15 minutes

      this.sendResponse(res, {
        success: true,
        data: resources,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /resources/category/:category - Get resources by category
  public getByCategory = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { category } = req.params;
      const context = this.extractContext(req);
      
      const options = {
        includeSubcategories: req.query.includeSubcategories === 'true',
        limit: parseInt(req.query.limit as string) || 50,
        offset: parseInt(req.query.offset as string) || 0,
      };

      if (options.limit > 1000) {
        throw new ValidationError('Category limit cannot exceed 1000');
      }

      const resources = await this.resourceService.findByCategory(
        category,
        options,
        context
      );

      // Set cache headers
      res.set('Cache-Control', 'public, max-age=300'); // 5 minutes

      this.sendResponse(res, {
        success: true,
        data: resources,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // POST /resources/advanced-search - Advanced search with complex filters
  public advancedSearch = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const context = this.extractContext(req);
      const { filters } = req.body;

      // Validate filters
      const filterSchema = Joi.object({
        priceRange: Joi.object({
          min: Joi.number().min(0).optional(),
          max: Joi.number().min(0).optional(),
        }).optional(),
        inStock: Joi.boolean().optional(),
        publishedSince: Joi.date().optional(),
        tags: Joi.array().items(Joi.string()).optional(),
        attributes: Joi.object().optional(),
      });

      const { error, value } = filterSchema.validate(filters);
      if (error) {
        throw new ValidationError(
          'Invalid filter parameters',
          error.details.map(detail => detail.message)
        );
      }

      const resources = await this.resourceService.findWithComplexFilters(
        value,
        context
      );

      this.sendResponse(res, {
        success: true,
        data: resources,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /resources/stats - Get resource statistics
  public getStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const context = this.extractContext(req);
      
      // Check if user has permission to view stats
      if (!context.permissions?.includes('view_stats') && 
          !context.permissions?.includes('*')) {
        throw new Error('Insufficient permissions to view statistics');
      }

      const stats = await this.resourceService.getResourceStats(context);

      // Cache stats for longer
      res.set('Cache-Control', 'private, max-age=600'); // 10 minutes

      this.sendResponse(res, {
        success: true,
        data: stats,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // PATCH /resources/:id/publish - Publish a resource
  public publish = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const context = this.extractContext(req);
      const { publishedAt } = req.body;

      // Validate publishedAt if provided
      if (publishedAt) {
        const date = new Date(publishedAt);
        if (isNaN(date.getTime())) {
          throw new ValidationError('Invalid publishedAt date format');
        }
      }

      const resource = await this.resourceService.publishResource(
        id,
        publishedAt ? new Date(publishedAt) : undefined,
        context
      );

      if (!resource) {
        throw new NotFoundError('Resource not found');
      }

      this.sendResponse(res, {
        success: true,
        data: resource,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // PATCH /resources/:id/unpublish - Unpublish a resource
  public unpublish = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const context = this.extractContext(req);

      const resource = await this.resourceService.unpublishResource(id, context);

      if (!resource) {
        throw new NotFoundError('Resource not found');
      }

      this.sendResponse(res, {
        success: true,
        data: resource,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // POST /resources/:id/duplicate - Duplicate a resource
  public duplicate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const context = this.extractContext(req);
      const modifications = req.body || {};

      // Validate modifications if provided
      if (Object.keys(modifications).length > 0) {
        const { error } = this.createSchema.validate(modifications, {
          allowUnknown: false,
          presence: 'optional'
        });

        if (error) {
          throw new ValidationError(
            'Invalid modification parameters',
            error.details.map(detail => detail.message)
          );
        }
      }

      const duplicatedResource = await this.resourceService.duplicateResource(
        id,
        modifications,
        context
      );

      this.sendResponse(res, {
        success: true,
        data: duplicatedResource,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
        }
      }, 201);
    } catch (error) {
      next(error);
    }
  };

  // PATCH /resources/batch/status - Batch update status
  public batchUpdateStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const context = this.extractContext(req);
      const { ids, status } = req.body;

      // Validate input
      const batchSchema = Joi.object({
        ids: Joi.array().items(Joi.string().uuid()).min(1).max(100).required(),
        status: Joi.string().valid('draft', 'active', 'inactive', 'archived').required(),
      });

      const { error, value } = batchSchema.validate({ ids, status });
      if (error) {
        throw new ValidationError(
          'Invalid batch update parameters',
          error.details.map(detail => detail.message)
        );
      }

      const result = await this.resourceService.batchUpdateStatus(
        value.ids,
        value.status,
        context
      );

      this.sendResponse(res, {
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // Implementation of abstract methods
  protected async validateCreateData(data: any): Promise<void> {
    const { error } = this.createSchema.validate(data);
    if (error) {
      throw new ValidationError(
        'Invalid create data',
        error.details.map(detail => detail.message)
      );
    }
  }

  protected async validateUpdateData(data: any): Promise<void> {
    const { error } = this.updateSchema.validate(data);
    if (error) {
      throw new ValidationError(
        'Invalid update data',
        error.details.map(detail => detail.message)
      );
    }
  }

  protected async validatePartialUpdateData(data: any): Promise<void> {
    const { error } = this.partialUpdateSchema.validate(data);
    if (error) {
      throw new ValidationError(
        'Invalid partial update data',
        error.details.map(detail => detail.message)
      );
    }
  }

  protected async performSearch(
    options: SearchOptions,
    context: QueryContext
  ): Promise<Resource[]> {
    return this.resourceService.searchResources(options, context);
  }

  // Field-level permissions filter
  private filterFieldsByPermissions(
    resource: Resource,
    context: QueryContext
  ): Partial<Resource> {
    const filtered: any = { ...resource };

    // Remove sensitive fields based on permissions
    if (!context.permissions?.includes('view_audit_trail')) {
      delete filtered.createdBy;
      delete filtered.updatedBy;
      delete filtered.deletedBy;
      delete filtered.version;
    }

    if (!context.permissions?.includes('view_metadata')) {
      delete filtered.metadata;
      delete filtered.etag;
    }

    if (!context.permissions?.includes('view_financial_data')) {
      delete filtered.price;
    }

    if (!context.permissions?.includes('view_system_fields')) {
      delete filtered.tenantId;
    }

    return filtered;
  }

  // Override sendResponse to apply field-level permissions
  protected sendResponse(
    res: Response,
    response: any,
    statusCode: number = 200
  ): void {
    // Apply field-level permissions to response data
    if (response.data && res.locals.context) {
      if (Array.isArray(response.data)) {
        response.data = response.data.map((item: any) =>
          this.filterFieldsByPermissions(item, res.locals.context)
        );
      } else if (response.data.id) {
        response.data = this.filterFieldsByPermissions(
          response.data,
          res.locals.context
        );
      }
    }

    super.sendResponse(res, response, statusCode);
  }
}