import { Response, NextFunction } from 'express';
import { AuthenticatedRequest as Request } from '../types/express.types';
import { BaseService } from '../services/base.service';
import { BaseEntity } from '../entities/base.entity';
import { QueryOptions, QueryContext } from '../types/query.types';
import { ValidationError, NotFoundError } from '../utils/errors';
import * as Joi from 'joi';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    etag?: string;
  };
}

export abstract class BaseController<T extends BaseEntity> {
  protected service: BaseService<T>;

  constructor(service: BaseService<T>) {
    this.service = service;
  }

  // Query parameter validation schema
  protected readonly querySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(1000).default(10),
    sortBy: Joi.string().max(100),
    sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC'),
    search: Joi.string().min(2).max(500),
    relations: Joi.string(), // comma-separated list
    select: Joi.string(), // comma-separated list
    withDeleted: Joi.boolean().default(false),
    // Dynamic filters will be handled separately
  });

  // GET /resources - List resources with pagination, filtering, sorting
  public list = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const context = this.extractContext(req);
      const options = this.parseQueryOptions(req);

      const result = await this.service.findMany(options, context);

      // Handle caching headers
      if (result.data.length > 0) {
        const etags = result.data.map(item => item.etag).filter(Boolean);
        if (etags.length > 0) {
          res.set('ETag', this.generateCollectionETag(etags));
        }
      }

      this.sendResponse(res, {
        success: true,
        data: result.data,
        pagination: result.pagination,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /resources/:id - Get single resource
  public getById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const context = this.extractContext(req);
      
      const options = {
        relations: this.parseStringArray(req.query.relations as string),
        select: this.parseStringArray(req.query.select as string),
        withDeleted: req.query.withDeleted === 'true',
      };

      const entity = await this.service.findById(id, options, context);
      
      if (!entity) {
        throw new NotFoundError('Resource not found');
      }

      // Handle conditional requests
      const clientETag = req.headers['if-none-match'];
      if (clientETag && entity.etag && clientETag === entity.etag) {
        res.status(304).end();
        return;
      }

      // Set caching headers
      if (entity.etag) {
        res.set('ETag', entity.etag);
        res.set('Cache-Control', 'private, max-age=300'); // 5 minutes
      }

      this.sendResponse(res, {
        success: true,
        data: entity,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          etag: entity.etag,
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // POST /resources - Create resource
  public create = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const context = this.extractContext(req);
      const data = req.body;

      // Validate required fields
      await this.validateCreateData(data);

      const entity = await this.service.create(data, context);

      this.sendResponse(res, {
        success: true,
        data: entity,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
        }
      }, 201);
    } catch (error) {
      next(error);
    }
  };

  // PUT /resources/:id - Update resource (full update)
  public update = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const context = this.extractContext(req);
      const data = req.body;

      // Handle optimistic locking
      const ifMatch = req.headers['if-match'];
      if (ifMatch) {
        data.version = this.extractVersionFromETag(ifMatch as string);
      }

      // Validate update data
      await this.validateUpdateData(data);

      const entity = await this.service.update(id, data, context);
      
      if (!entity) {
        throw new NotFoundError('Resource not found');
      }

      this.sendResponse(res, {
        success: true,
        data: entity,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          etag: entity.etag,
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // PATCH /resources/:id - Partial update
  public partialUpdate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const context = this.extractContext(req);
      const data = req.body;

      // Handle optimistic locking
      const ifMatch = req.headers['if-match'];
      if (ifMatch) {
        data.version = this.extractVersionFromETag(ifMatch as string);
      }

      // Validate partial update data
      await this.validatePartialUpdateData(data);

      const entity = await this.service.update(id, data, context);
      
      if (!entity) {
        throw new NotFoundError('Resource not found');
      }

      this.sendResponse(res, {
        success: true,
        data: entity,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          etag: entity.etag,
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /resources/:id - Soft delete resource
  public delete = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const context = this.extractContext(req);

      const success = await this.service.delete(id, context);
      
      if (!success) {
        throw new NotFoundError('Resource not found');
      }

      this.sendResponse(res, {
        success: true,
        data: { id, deleted: true },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // POST /resources/bulk - Bulk operations
  public bulkCreate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const context = this.extractContext(req);
      const { items } = req.body;

      if (!Array.isArray(items)) {
        throw new ValidationError('Items must be an array');
      }

      if (items.length === 0) {
        throw new ValidationError('Items array cannot be empty');
      }

      const result = await this.service.bulkCreate(items, context);

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

  // GET /resources/search - Advanced search
  public search = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const context = this.extractContext(req);
      const { query, fields, fuzzy } = req.query;

      if (!query || typeof query !== 'string') {
        throw new ValidationError('Search query is required');
      }

      const searchOptions = {
        query: query as string,
        fields: this.parseStringArray(fields as string) || ['name', 'description'],
        fuzzy: fuzzy === 'true',
      };

      const results = await this.performSearch(searchOptions, context);

      this.sendResponse(res, {
        success: true,
        data: results,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // Health check endpoint
  public healthCheck = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const health = await this.service.healthCheck();
      
      this.sendResponse(res, {
        success: true,
        data: health,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // Abstract methods for concrete implementations
  protected abstract validateCreateData(data: any): Promise<void>;
  protected abstract validateUpdateData(data: any): Promise<void>;
  protected abstract validatePartialUpdateData(data: any): Promise<void>;
  protected abstract performSearch(options: any, context: QueryContext): Promise<any>;

  // Utility methods
  protected extractContext(req: Request): QueryContext {
    return {
      userId: req.user?.id,
      tenantId: req.headers['x-tenant-id'] as string || req.user?.tenantId,
      permissions: req.user?.permissions || [],
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
    };
  }

  protected parseQueryOptions(req: Request): QueryOptions {
    const { error, value } = this.querySchema.validate(req.query);
    
    if (error) {
      throw new ValidationError(
        'Invalid query parameters',
        error.details.map(detail => detail.message)
      );
    }

    const options: QueryOptions = {
      page: value.page,
      limit: value.limit,
      sortBy: value.sortBy,
      sortOrder: value.sortOrder,
      search: value.search,
      relations: this.parseStringArray(value.relations),
      select: this.parseStringArray(value.select),
      withDeleted: value.withDeleted,
      filters: this.parseFilters(req.query),
    };

    return options;
  }

  protected parseStringArray(str?: string): string[] | undefined {
    if (!str) return undefined;
    return str.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  protected parseFilters(query: any): Record<string, any> {
    const filters: Record<string, any> = {};
    
    // Standard filter format: filter[field]=value
    Object.keys(query).forEach(key => {
      const filterMatch = key.match(/^filter\[(.+)\]$/);
      if (filterMatch) {
        const fieldName = filterMatch[1];
        filters[fieldName] = query[key];
      }
    });

    return filters;
  }

  protected generateCollectionETag(etags: string[]): string {
    const crypto = require('crypto');
    const combined = etags.sort().join('|');
    return crypto.createHash('md5').update(combined).digest('hex');
  }

  protected extractVersionFromETag(etag: string): number {
    // Extract version from ETag if it includes version information
    // This is a simplified implementation
    try {
      const decoded = JSON.parse(Buffer.from(etag, 'base64').toString());
      return decoded.version || 1;
    } catch {
      return 1;
    }
  }

  protected sendResponse(
    res: Response,
    response: ApiResponse,
    statusCode: number = 200
  ): void {
    res.status(statusCode).json(response);
  }

  protected handleError(error: Error, req: Request, res: Response): void {
    console.error(`Error in ${req.method} ${req.path}:`, error);

    let statusCode = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'An internal error occurred';

    if (error instanceof ValidationError) {
      statusCode = error.statusCode;
      code = error.code;
      message = error.message;
    } else if (error instanceof NotFoundError) {
      statusCode = error.statusCode;
      code = error.code;
      message = error.message;
    }

    this.sendResponse(res, {
      success: false,
      error: {
        code,
        message,
        details: (error as any).details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown',
      }
    }, statusCode);
  }
}