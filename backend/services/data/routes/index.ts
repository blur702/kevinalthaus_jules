import { Router } from 'express';
import { createResourceRoutes } from './resource.routes';
import {
  handleError,
  handleNotFound,
  handleTimeout,
} from '../middleware/error.middleware';
import {
  cacheStats,
} from '../middleware/cache.middleware';

export class DataServiceRoutes {
  private router: Router;

  constructor() {
    this.router = Router();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupRoutes(): void {
    // Add request timeout middleware
    this.router.use(handleTimeout(30000)); // 30 seconds

    // Add request ID middleware
    this.router.use((req, res, next) => {
      if (!req.headers['x-request-id']) {
        req.headers['x-request-id'] = this.generateRequestId();
      }
      next();
    });

    // API version and info endpoint
    this.router.get('/', (req, res) => {
      res.json({
        service: 'Data Service',
        version: '1.0.0',
        description: 'Production-ready data service with CRUD operations',
        features: [
          'Multi-tenancy support',
          'Field-level permissions',
          'Audit trail',
          'Query optimization',
          'Response caching',
          'Bulk operations',
          'Advanced search',
          'Soft deletes',
        ],
        endpoints: {
          resources: '/api/data/resources',
          health: '/api/data/health',
          cache: '/api/data/cache',
        },
        documentation: '/api/data/docs',
        timestamp: new Date().toISOString(),
      });
    });

    // Cache management endpoints
    this.router.get('/cache/stats', cacheStats());
    
    // Global health endpoint
    this.router.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
      });
    });

    // Mount resource routes
    this.router.use('/resources', createResourceRoutes());

    // API documentation endpoint (placeholder)
    this.router.get('/docs', (req, res) => {
      res.json({
        message: 'API Documentation',
        swagger: '/api/data/docs/swagger.json',
        openapi: '/api/data/docs/openapi.json',
        endpoints: this.getApiEndpoints(),
      });
    });
  }

  private setupErrorHandling(): void {
    // 404 handler for undefined routes
    this.router.use(handleNotFound());

    // Global error handler
    this.router.use(handleError());
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }

  private getApiEndpoints(): any {
    return {
      resources: {
        'GET /resources': {
          description: 'List resources with pagination, filtering, sorting',
          parameters: ['page', 'limit', 'sortBy', 'sortOrder', 'search', 'filter[field]'],
          permissions: ['read'],
        },
        'GET /resources/search': {
          description: 'Advanced search resources',
          parameters: ['query', 'fields', 'fuzzy'],
          permissions: ['read'],
          features: ['advanced_search'],
        },
        'GET /resources/featured': {
          description: 'Get featured resources',
          parameters: ['limit'],
          public: true,
        },
        'GET /resources/stats': {
          description: 'Get resource statistics',
          permissions: ['view_stats'],
          features: ['analytics'],
        },
        'GET /resources/category/:category': {
          description: 'Get resources by category',
          parameters: ['includeSubcategories', 'limit', 'offset'],
          permissions: ['read'],
        },
        'POST /resources/advanced-search': {
          description: 'Advanced search with complex filters',
          body: 'filters object',
          permissions: ['read'],
          features: ['advanced_search'],
        },
        'GET /resources/:id': {
          description: 'Get single resource',
          parameters: ['relations', 'select', 'withDeleted'],
          permissions: ['read'],
        },
        'POST /resources': {
          description: 'Create resource',
          body: 'resource data',
          permissions: ['create'],
        },
        'PUT /resources/:id': {
          description: 'Update resource (full update)',
          body: 'resource data',
          permissions: ['update'],
        },
        'PATCH /resources/:id': {
          description: 'Partial update resource',
          body: 'partial resource data',
          permissions: ['update'],
        },
        'PATCH /resources/:id/publish': {
          description: 'Publish a resource',
          body: 'publishedAt (optional)',
          permissions: ['update', 'publish'],
        },
        'PATCH /resources/:id/unpublish': {
          description: 'Unpublish a resource',
          permissions: ['update', 'publish'],
        },
        'POST /resources/:id/duplicate': {
          description: 'Duplicate a resource',
          body: 'modifications (optional)',
          permissions: ['create', 'duplicate'],
        },
        'POST /resources/bulk': {
          description: 'Bulk create resources',
          body: 'array of resource data',
          permissions: ['create', 'bulk_create'],
          features: ['bulk_operations'],
        },
        'PATCH /resources/batch/status': {
          description: 'Batch update status',
          body: 'ids array and status',
          permissions: ['update', 'bulk_update'],
          features: ['bulk_operations'],
        },
        'DELETE /resources/:id': {
          description: 'Soft delete resource',
          permissions: ['delete'],
        },
      },
      system: {
        'GET /': {
          description: 'API information and version',
          public: true,
        },
        'GET /health': {
          description: 'Service health check',
          public: true,
        },
        'GET /cache/stats': {
          description: 'Cache statistics',
          permissions: ['view_stats'],
        },
        'GET /docs': {
          description: 'API documentation',
          public: true,
        },
      },
    };
  }

  public getRouter(): Router {
    return this.router;
  }
}

// Export configured router
export const createDataServiceRoutes = (): Router => {
  const dataServiceRoutes = new DataServiceRoutes();
  return dataServiceRoutes.getRouter();
};

// Export individual route creators for modular use
export { createResourceRoutes } from './resource.routes';