import { Request, Response, NextFunction } from 'express';
import { ResourceController } from '../../../../backend/services/data/controllers/resource.controller';
import { ResourceService } from '../../../../backend/services/data/services/resource.service';
import { Resource } from '../../../../backend/services/data/entities/sample-resource.entity';
import { ValidationError, NotFoundError } from '../../../../backend/services/data/utils/errors';

// Mock service
const mockResourceService = {
  findById: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  bulkCreate: jest.fn(),
  findByCategory: jest.fn(),
  findFeatured: jest.fn(),
  searchResources: jest.fn(),
  findWithComplexFilters: jest.fn(),
  getResourceStats: jest.fn(),
  publishResource: jest.fn(),
  unpublishResource: jest.fn(),
  duplicateResource: jest.fn(),
  batchUpdateStatus: jest.fn(),
  healthCheck: jest.fn(),
} as unknown as ResourceService;

// Mock request and response objects
const createMockRequest = (overrides: Partial<Request> = {}): Request => ({
  params: {},
  query: {},
  body: {},
  headers: {},
  user: {
    id: 'user-123',
    tenantId: 'tenant-123',
    permissions: ['read', 'write', 'create', 'update', 'delete'],
  },
  ip: '127.0.0.1',
  connection: { remoteAddress: '127.0.0.1' },
  method: 'GET',
  path: '/resources',
  ...overrides,
} as Request);

const createMockResponse = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  res.locals = {};
  res.headersSent = false;
  return res;
};

const mockNext: NextFunction = jest.fn();

describe('ResourceController', () => {
  let controller: ResourceController;
  let req: Request;
  let res: Response;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ResourceController(mockResourceService);
    req = createMockRequest();
    res = createMockResponse();
    res.locals.context = {
      userId: 'user-123',
      tenantId: 'tenant-123',
      permissions: ['read', 'write', 'create', 'update', 'delete'],
    };
  });

  describe('list', () => {
    it('should list resources with pagination', async () => {
      const mockResult = {
        data: [
          { id: 'resource-1', name: 'Resource 1', etag: 'etag1' },
          { id: 'resource-2', name: 'Resource 2', etag: 'etag2' },
        ] as Resource[],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      req.query = { page: '1', limit: '10' };
      (mockResourceService.findMany as jest.Mock).mockResolvedValue(mockResult);

      await controller.list(req, res, mockNext);

      expect(mockResourceService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 10,
        }),
        expect.objectContaining({
          userId: 'user-123',
          tenantId: 'tenant-123',
        })
      );

      expect(res.set).toHaveBeenCalledWith('ETag', expect.any(String));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResult.data,
          pagination: mockResult.pagination,
        })
      );
    });

    it('should handle query parameter validation errors', async () => {
      req.query = { page: 'invalid', limit: '10' };

      await controller.list(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(ValidationError)
      );
    });

    it('should apply filters from query parameters', async () => {
      req.query = {
        'filter[status]': 'active',
        'filter[category]': 'premium',
        search: 'test query',
      };

      const mockResult = {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0, hasNext: false, hasPrev: false },
      };

      (mockResourceService.findMany as jest.Mock).mockResolvedValue(mockResult);

      await controller.list(req, res, mockNext);

      expect(mockResourceService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: {
            status: 'active',
            category: 'premium',
          },
          search: 'test query',
        }),
        expect.any(Object)
      );
    });
  });

  describe('getById', () => {
    it('should get resource by ID successfully', async () => {
      const mockResource = {
        id: 'resource-123',
        name: 'Test Resource',
        etag: 'etag-123',
      } as Resource;

      req.params = { id: 'resource-123' };
      (mockResourceService.findById as jest.Mock).mockResolvedValue(mockResource);

      await controller.getById(req, res, mockNext);

      expect(mockResourceService.findById).toHaveBeenCalledWith(
        'resource-123',
        expect.objectContaining({ withDeleted: false }),
        expect.any(Object)
      );

      expect(res.set).toHaveBeenCalledWith('ETag', 'etag-123');
      expect(res.set).toHaveBeenCalledWith('Cache-Control', 'private, max-age=300');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResource,
        })
      );
    });

    it('should return 404 for non-existent resource', async () => {
      req.params = { id: 'non-existent-123' };
      (mockResourceService.findById as jest.Mock).mockResolvedValue(null);

      await controller.getById(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(NotFoundError)
      );
    });

    it('should handle conditional requests with ETag', async () => {
      const mockResource = {
        id: 'resource-123',
        name: 'Test Resource',
        etag: 'etag-123',
      } as Resource;

      req.params = { id: 'resource-123' };
      req.headers = { 'if-none-match': 'etag-123' };
      (mockResourceService.findById as jest.Mock).mockResolvedValue(mockResource);

      await controller.getById(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(304);
      expect(res.end).toHaveBeenCalled();
    });

    it('should handle relations and select options', async () => {
      const mockResource = { id: 'resource-123', name: 'Test Resource' } as Resource;

      req.params = { id: 'resource-123' };
      req.query = {
        relations: 'related1,related2',
        select: 'name,description',
        withDeleted: 'true',
      };

      (mockResourceService.findById as jest.Mock).mockResolvedValue(mockResource);

      await controller.getById(req, res, mockNext);

      expect(mockResourceService.findById).toHaveBeenCalledWith(
        'resource-123',
        expect.objectContaining({
          relations: ['related1', 'related2'],
          select: ['name', 'description'],
          withDeleted: true,
        }),
        expect.any(Object)
      );
    });
  });

  describe('create', () => {
    it('should create resource successfully', async () => {
      const resourceData = {
        name: 'New Resource',
        description: 'Test description',
        category: 'general',
      };

      const mockCreatedResource = {
        id: 'resource-123',
        ...resourceData,
        createdAt: new Date(),
      } as Resource;

      req.body = resourceData;
      (mockResourceService.create as jest.Mock).mockResolvedValue(mockCreatedResource);

      await controller.create(req, res, mockNext);

      expect(mockResourceService.create).toHaveBeenCalledWith(
        resourceData,
        expect.any(Object)
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockCreatedResource,
        })
      );
    });

    it('should handle validation errors', async () => {
      req.body = { description: 'Missing name field' };

      await controller.create(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(ValidationError)
      );
    });
  });

  describe('update', () => {
    it('should update resource successfully', async () => {
      const updateData = {
        name: 'Updated Resource',
        description: 'Updated description',
      };

      const mockUpdatedResource = {
        id: 'resource-123',
        ...updateData,
        etag: 'new-etag-123',
      } as Resource;

      req.params = { id: 'resource-123' };
      req.body = updateData;
      (mockResourceService.update as jest.Mock).mockResolvedValue(mockUpdatedResource);

      await controller.update(req, res, mockNext);

      expect(mockResourceService.update).toHaveBeenCalledWith(
        'resource-123',
        updateData,
        expect.any(Object)
      );

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockUpdatedResource,
        })
      );
    });

    it('should handle optimistic locking with If-Match header', async () => {
      const updateData = { name: 'Updated Resource' };
      const mockUpdatedResource = {
        id: 'resource-123',
        ...updateData,
        version: 2,
      } as Resource;

      req.params = { id: 'resource-123' };
      req.body = updateData;
      req.headers = { 'if-match': 'version-1-etag' };

      // Mock extractVersionFromETag
      jest.spyOn(controller as any, 'extractVersionFromETag').mockReturnValue(1);

      (mockResourceService.update as jest.Mock).mockResolvedValue(mockUpdatedResource);

      await controller.update(req, res, mockNext);

      expect(mockResourceService.update).toHaveBeenCalledWith(
        'resource-123',
        expect.objectContaining({ version: 1 }),
        expect.any(Object)
      );
    });

    it('should return 404 for non-existent resource', async () => {
      req.params = { id: 'non-existent-123' };
      req.body = { name: 'Updated Resource' };
      (mockResourceService.update as jest.Mock).mockResolvedValue(null);

      await controller.update(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(NotFoundError)
      );
    });
  });

  describe('partialUpdate', () => {
    it('should perform partial update successfully', async () => {
      const partialData = { name: 'Partially Updated Resource' };
      const mockUpdatedResource = {
        id: 'resource-123',
        name: 'Partially Updated Resource',
        description: 'Original description',
      } as Resource;

      req.params = { id: 'resource-123' };
      req.body = partialData;
      (mockResourceService.update as jest.Mock).mockResolvedValue(mockUpdatedResource);

      await controller.partialUpdate(req, res, mockNext);

      expect(mockResourceService.update).toHaveBeenCalledWith(
        'resource-123',
        partialData,
        expect.any(Object)
      );
    });

    it('should validate at least one field is provided', async () => {
      req.params = { id: 'resource-123' };
      req.body = {}; // Empty update

      await controller.partialUpdate(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(ValidationError)
      );
    });
  });

  describe('delete', () => {
    it('should delete resource successfully', async () => {
      req.params = { id: 'resource-123' };
      (mockResourceService.delete as jest.Mock).mockResolvedValue(true);

      await controller.delete(req, res, mockNext);

      expect(mockResourceService.delete).toHaveBeenCalledWith(
        'resource-123',
        expect.any(Object)
      );

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { id: 'resource-123', deleted: true },
        })
      );
    });

    it('should return 404 for non-existent resource', async () => {
      req.params = { id: 'non-existent-123' };
      (mockResourceService.delete as jest.Mock).mockResolvedValue(false);

      await controller.delete(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(NotFoundError)
      );
    });
  });

  describe('business endpoints', () => {
    describe('getFeatured', () => {
      it('should get featured resources', async () => {
        const mockFeaturedResources = [
          { id: 'resource-1', name: 'Featured Resource 1', isFeatured: true },
        ] as Resource[];

        req.query = { limit: '5' };
        (mockResourceService.findFeatured as jest.Mock).mockResolvedValue(mockFeaturedResources);

        await controller.getFeatured(req, res, mockNext);

        expect(mockResourceService.findFeatured).toHaveBeenCalledWith(5, expect.any(Object));
        expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=900');
      });

      it('should validate featured resources limit', async () => {
        req.query = { limit: '200' }; // Exceeds max limit

        await controller.getFeatured(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.any(ValidationError)
        );
      });
    });

    describe('getByCategory', () => {
      it('should get resources by category', async () => {
        const mockResources = [
          { id: 'resource-1', category: 'premium' },
        ] as Resource[];

        req.params = { category: 'premium' };
        req.query = { includeSubcategories: 'true', limit: '50' };

        (mockResourceService.findByCategory as jest.Mock).mockResolvedValue(mockResources);

        await controller.getByCategory(req, res, mockNext);

        expect(mockResourceService.findByCategory).toHaveBeenCalledWith(
          'premium',
          expect.objectContaining({
            includeSubcategories: true,
            limit: 50,
          }),
          expect.any(Object)
        );
      });
    });

    describe('search', () => {
      it('should perform search successfully', async () => {
        const mockResults = [
          { id: 'resource-1', name: 'Searchable Resource' },
        ] as Resource[];

        req.query = { query: 'searchable', fields: 'name,description', fuzzy: 'true' };
        (mockResourceService.searchResources as jest.Mock).mockResolvedValue(mockResults);

        await controller.search(req, res, mockNext);

        expect(mockResourceService.searchResources).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'searchable',
            fields: ['name', 'description'],
            fuzzy: true,
          }),
          expect.any(Object)
        );
      });

      it('should validate search query is provided', async () => {
        req.query = {}; // Missing query

        await controller.search(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.any(ValidationError)
        );
      });
    });

    describe('publish', () => {
      it('should publish resource successfully', async () => {
        const mockPublishedResource = {
          id: 'resource-123',
          status: 'active',
          publishedAt: new Date(),
        } as Resource;

        req.params = { id: 'resource-123' };
        req.body = { publishedAt: '2023-12-01T00:00:00.000Z' };

        (mockResourceService.publishResource as jest.Mock).mockResolvedValue(mockPublishedResource);

        await controller.publish(req, res, mockNext);

        expect(mockResourceService.publishResource).toHaveBeenCalledWith(
          'resource-123',
          new Date('2023-12-01T00:00:00.000Z'),
          expect.any(Object)
        );
      });

      it('should validate publishedAt date format', async () => {
        req.params = { id: 'resource-123' };
        req.body = { publishedAt: 'invalid-date' };

        await controller.publish(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.any(ValidationError)
        );
      });
    });

    describe('batchUpdateStatus', () => {
      it('should perform batch update successfully', async () => {
        const mockResult = { updated: 2, failed: [] };

        req.body = {
          ids: ['resource-1', 'resource-2'],
          status: 'active',
        };

        (mockResourceService.batchUpdateStatus as jest.Mock).mockResolvedValue(mockResult);

        await controller.batchUpdateStatus(req, res, mockNext);

        expect(mockResourceService.batchUpdateStatus).toHaveBeenCalledWith(
          ['resource-1', 'resource-2'],
          'active',
          expect.any(Object)
        );
      });

      it('should validate batch request parameters', async () => {
        req.body = {
          ids: [], // Empty array
          status: 'active',
        };

        await controller.batchUpdateStatus(req, res, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
          expect.any(ValidationError)
        );
      });
    });
  });

  describe('bulkCreate', () => {
    it('should perform bulk create successfully', async () => {
      const mockResult = {
        success: [{ id: 'resource-1', name: 'Resource 1' }],
        failed: [],
        summary: { total: 1, successful: 1, failed: 0 },
      };

      req.body = {
        items: [{ name: 'Resource 1', category: 'general' }],
      };

      (mockResourceService.bulkCreate as jest.Mock).mockResolvedValue(mockResult);

      await controller.bulkCreate(req, res, mockNext);

      expect(mockResourceService.bulkCreate).toHaveBeenCalledWith(
        [{ name: 'Resource 1', category: 'general' }],
        expect.any(Object)
      );
    });

    it('should validate items array is provided', async () => {
      req.body = { items: 'not-an-array' };

      await controller.bulkCreate(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(ValidationError)
      );
    });

    it('should validate items array is not empty', async () => {
      req.body = { items: [] };

      await controller.bulkCreate(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(ValidationError)
      );
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const mockHealth = {
        status: 'healthy',
        timestamp: new Date(),
      };

      (mockResourceService.healthCheck as jest.Mock).mockResolvedValue(mockHealth);

      await controller.healthCheck(req, res, mockNext);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockHealth,
        })
      );
    });
  });
});