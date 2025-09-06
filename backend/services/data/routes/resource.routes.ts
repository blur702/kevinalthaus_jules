import { Router } from 'express';
import { ResourceController } from '../controllers/resource.controller';
import { ResourceService } from '../services/resource.service';
import DatabaseManager from '../config/database';
import {
  extractTenant,
  checkTenantPermissions,
  checkSubscriptionFeature,
  rateLimitByTenant,
  checkApiQuota,
} from '../middleware/tenant.middleware';
import {
  cache,
  etag,
  invalidateCache,
  conditionalCache,
} from '../middleware/cache.middleware';
import {
  asyncHandler,
  handleValidationError,
  handleDatabaseError,
} from '../middleware/error.middleware';

export class ResourceRoutes {
  private router: Router;
  private controller: ResourceController;

  constructor() {
    this.router = Router();
    this.initializeController();
    this.setupRoutes();
  }

  private async initializeController(): Promise<void> {
    const dataSource = DatabaseManager.getDataSource();
    const resourceService = new ResourceService(dataSource);
    this.controller = new ResourceController(resourceService);
  }

  private setupRoutes(): void {
    // Apply global middleware
    this.router.use(extractTenant());
    this.router.use(rateLimitByTenant());
    this.router.use(checkApiQuota());
    this.router.use(handleValidationError());
    this.router.use(handleDatabaseError());

    // Health check endpoint - no auth required
    this.router.get(
      '/health',
      asyncHandler(this.controller.healthCheck)
    );

    // GET /resources - List resources with pagination, filtering, sorting
    this.router.get(
      '/',
      checkTenantPermissions(['read']),
      cache({
        ttl: 300, // 5 minutes
        varyBy: ['x-tenant-id', 'authorization'],
        tags: ['resources', 'list'],
      }),
      asyncHandler(this.controller.list)
    );

    // GET /resources/search - Advanced search
    this.router.get(
      '/search',
      checkTenantPermissions(['read']),
      checkSubscriptionFeature('advanced_search'),
      cache({
        ttl: 180, // 3 minutes
        varyBy: ['x-tenant-id'],
        tags: ['resources', 'search'],
      }),
      asyncHandler(this.controller.search)
    );

    // GET /resources/featured - Get featured resources
    this.router.get(
      '/featured',
      // Public endpoint - no auth required for featured resources
      cache({
        ttl: 900, // 15 minutes
        varyBy: ['x-tenant-id'],
        tags: ['resources', 'featured'],
        private: false,
      }),
      asyncHandler(this.controller.getFeatured)
    );

    // GET /resources/stats - Get resource statistics
    this.router.get(
      '/stats',
      checkTenantPermissions(['view_stats']),
      checkSubscriptionFeature('analytics'),
      cache({
        ttl: 600, // 10 minutes
        varyBy: ['x-tenant-id'],
        tags: ['resources', 'stats'],
        private: true,
      }),
      asyncHandler(this.controller.getStats)
    );

    // GET /resources/category/:category - Get resources by category
    this.router.get(
      '/category/:category',
      checkTenantPermissions(['read']),
      cache({
        ttl: 300, // 5 minutes
        varyBy: ['x-tenant-id'],
        tags: ['resources', 'category'],
      }),
      asyncHandler(this.controller.getByCategory)
    );

    // POST /resources/advanced-search - Advanced search with complex filters
    this.router.post(
      '/advanced-search',
      checkTenantPermissions(['read']),
      checkSubscriptionFeature('advanced_search'),
      // No caching for POST requests by default
      asyncHandler(this.controller.advancedSearch)
    );

    // POST /resources/bulk - Bulk create resources
    this.router.post(
      '/bulk',
      checkTenantPermissions(['create', 'bulk_create']),
      checkSubscriptionFeature('bulk_operations'),
      invalidateCache(['resources:*', 'stats:*']),
      asyncHandler(this.controller.bulkCreate)
    );

    // PATCH /resources/batch/status - Batch update status
    this.router.patch(
      '/batch/status',
      checkTenantPermissions(['update', 'bulk_update']),
      checkSubscriptionFeature('bulk_operations'),
      invalidateCache(['resources:*', 'stats:*']),
      asyncHandler(this.controller.batchUpdateStatus)
    );

    // GET /resources/:id - Get single resource
    this.router.get(
      '/:id',
      checkTenantPermissions(['read']),
      etag(),
      conditionalCache(
        // Cache public resources longer
        (req) => {
          return !req.headers.authorization ||
                 (req.query.public === 'true');
        },
        {
          ttl: 600, // 10 minutes for public resources
          varyBy: ['x-tenant-id'],
          tags: ['resources', 'single'],
        }
      ),
      asyncHandler(this.controller.getById)
    );

    // POST /resources - Create resource
    this.router.post(
      '/',
      checkTenantPermissions(['create']),
      invalidateCache(['resources:*', 'stats:*']),
      asyncHandler(this.controller.create)
    );

    // PUT /resources/:id - Update resource (full update)
    this.router.put(
      '/:id',
      checkTenantPermissions(['update']),
      invalidateCache(['resources:*', 'stats:*']),
      asyncHandler(this.controller.update)
    );

    // PATCH /resources/:id - Partial update
    this.router.patch(
      '/:id',
      checkTenantPermissions(['update']),
      invalidateCache(['resources:*', 'stats:*']),
      asyncHandler(this.controller.partialUpdate)
    );

    // PATCH /resources/:id/publish - Publish a resource
    this.router.patch(
      '/:id/publish',
      checkTenantPermissions(['update', 'publish']),
      invalidateCache(['resources:*', 'featured:*', 'stats:*']),
      asyncHandler(this.controller.publish)
    );

    // PATCH /resources/:id/unpublish - Unpublish a resource
    this.router.patch(
      '/:id/unpublish',
      checkTenantPermissions(['update', 'publish']),
      invalidateCache(['resources:*', 'featured:*', 'stats:*']),
      asyncHandler(this.controller.unpublish)
    );

    // POST /resources/:id/duplicate - Duplicate a resource
    this.router.post(
      '/:id/duplicate',
      checkTenantPermissions(['create', 'duplicate']),
      invalidateCache(['resources:*', 'stats:*']),
      asyncHandler(this.controller.duplicate)
    );

    // DELETE /resources/:id - Soft delete resource
    this.router.delete(
      '/:id',
      checkTenantPermissions(['delete']),
      invalidateCache(['resources:*', 'stats:*']),
      asyncHandler(this.controller.delete)
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}

// Export configured router
export const createResourceRoutes = (): Router => {
  const resourceRoutes = new ResourceRoutes();
  return resourceRoutes.getRouter();
};