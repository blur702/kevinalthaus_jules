import { DataSource } from 'typeorm';
import { ResourceService } from '../../../../backend/services/data/services/resource.service';
import { ResourceRepository } from '../../../../backend/services/data/repositories/resource.repository';
import { Resource } from '../../../../backend/services/data/entities/sample-resource.entity';
import { QueryContext } from '../../../../backend/services/data/types/query.types';
import { ValidationError, BusinessRuleViolationError } from '../../../../backend/services/data/utils/errors';

// Mock dependencies
const mockDataSource = {
  query: jest.fn().mockResolvedValue([{ result: 1 }]),
} as unknown as DataSource;

const mockResourceRepository = {
  findById: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  bulkCreate: jest.fn(),
  findByCategory: jest.fn(),
  findFeatured: jest.fn(),
  fullTextSearch: jest.fn(),
  findWithComplexFilters: jest.fn(),
  getResourceStats: jest.fn(),
  batchUpdateStatus: jest.fn(),
} as unknown as ResourceRepository;

// Mock ResourceRepository constructor
jest.mock('../../../../backend/services/data/repositories/resource.repository', () => {
  return {
    ResourceRepository: jest.fn().mockImplementation(() => mockResourceRepository),
  };
});

describe('ResourceService', () => {
  let service: ResourceService;
  let context: QueryContext;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ResourceService(mockDataSource);
    
    context = {
      userId: 'user-123',
      tenantId: 'tenant-123',
      permissions: ['read', 'write', 'create', 'update', 'delete'],
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    };
  });

  describe('findById', () => {
    it('should find resource by ID successfully', async () => {
      const mockResource = {
        id: 'resource-123',
        name: 'Test Resource',
        description: 'Test description',
        status: 'active',
        tenantId: 'tenant-123',
      } as Resource;

      (mockResourceRepository.findById as jest.Mock).mockResolvedValue(mockResource);

      const result = await service.findById('resource-123', {}, context);

      expect(result).toEqual(mockResource);
      expect(mockResourceRepository.findById).toHaveBeenCalledWith(
        'resource-123',
        {},
        context
      );
    });

    it('should throw validation error for invalid ID format', async () => {
      await expect(service.findById('invalid-id', {}, context))
        .rejects
        .toThrow(ValidationError);
    });

    it('should return null for non-existent resource', async () => {
      (mockResourceRepository.findById as jest.Mock).mockResolvedValue(null);

      const result = await service.findById('00000000-0000-4000-8000-000000000000', {}, context);

      expect(result).toBeNull();
    });

    it('should throw error for insufficient permissions', async () => {
      const restrictedContext = {
        ...context,
        permissions: [], // No permissions
      };

      await expect(service.findById('00000000-0000-4000-8000-000000000000', {}, restrictedContext))
        .rejects
        .toThrow('Insufficient permissions to read resource');
    });
  });

  describe('findMany', () => {
    it('should find resources with pagination', async () => {
      const mockResources = [
        { id: 'resource-1', name: 'Resource 1', status: 'active' },
        { id: 'resource-2', name: 'Resource 2', status: 'active' },
      ] as Resource[];

      const mockResult = {
        data: mockResources,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      (mockResourceRepository.findMany as jest.Mock).mockResolvedValue(mockResult);

      const options = { page: 1, limit: 10 };
      const result = await service.findMany(options, context);

      expect(result).toEqual(mockResult);
      expect(mockResourceRepository.findMany).toHaveBeenCalledWith(options, context);
    });

    it('should validate query options', async () => {
      const invalidOptions = { page: 0, limit: -1 };

      await expect(service.findMany(invalidOptions, context))
        .rejects
        .toThrow(ValidationError);
    });

    it('should throw error for insufficient permissions', async () => {
      const restrictedContext = {
        ...context,
        permissions: [],
      };

      await expect(service.findMany({}, restrictedContext))
        .rejects
        .toThrow('Insufficient permissions to list resources');
    });
  });

  describe('create', () => {
    it('should create resource successfully', async () => {
      const resourceData = {
        name: 'New Resource',
        description: 'Test description',
        status: 'draft',
        category: 'general',
      };

      const mockCreatedResource = {
        id: 'resource-123',
        ...resourceData,
        createdBy: 'user-123',
        tenantId: 'tenant-123',
      } as Resource;

      (mockResourceRepository.create as jest.Mock).mockResolvedValue(mockCreatedResource);

      const result = await service.create(resourceData, context);

      expect(result).toEqual(mockCreatedResource);
      expect(mockResourceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining(resourceData),
        context
      );
    });

    it('should validate required fields', async () => {
      const invalidData = {
        description: 'Missing name field',
      };

      await expect(service.create(invalidData, context))
        .rejects
        .toThrow(ValidationError);
    });

    it('should validate business rules for featured resources', async () => {
      const resourceData = {
        name: 'Featured Resource',
        isFeatured: true,
        // Missing category - should fail business rule
      };

      await expect(service.create(resourceData, context))
        .rejects
        .toThrow(ValidationError);
    });

    it('should throw error for insufficient permissions', async () => {
      const restrictedContext = {
        ...context,
        permissions: ['read'],
      };

      const resourceData = { name: 'New Resource' };

      await expect(service.create(resourceData, restrictedContext))
        .rejects
        .toThrow('Insufficient permissions to create resource');
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
        updatedBy: 'user-123',
        version: 2,
      } as Resource;

      (mockResourceRepository.update as jest.Mock).mockResolvedValue(mockUpdatedResource);

      const result = await service.update('resource-123', updateData, context);

      expect(result).toEqual(mockUpdatedResource);
      expect(mockResourceRepository.update).toHaveBeenCalledWith(
        'resource-123',
        expect.objectContaining(updateData),
        context
      );
    });

    it('should throw validation error for invalid ID', async () => {
      await expect(service.update('invalid-id', {}, context))
        .rejects
        .toThrow(ValidationError);
    });

    it('should validate update data', async () => {
      const invalidUpdateData = {
        name: '', // Empty name should fail validation
      };

      await expect(service.update('00000000-0000-4000-8000-000000000000', invalidUpdateData, context))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('delete', () => {
    it('should soft delete resource successfully', async () => {
      (mockResourceRepository.softDelete as jest.Mock).mockResolvedValue(true);

      const result = await service.delete('resource-123', context);

      expect(result).toBe(true);
      expect(mockResourceRepository.softDelete).toHaveBeenCalledWith('resource-123', context);
    });

    it('should throw validation error for invalid ID', async () => {
      await expect(service.delete('invalid-id', context))
        .rejects
        .toThrow(ValidationError);
    });

    it('should validate business rules before deletion', async () => {
      const mockResource = {
        id: 'resource-123',
        name: 'Featured Resource',
        isFeatured: true,
        status: 'active',
      } as Resource;

      // Mock findById to return a featured active resource
      jest.spyOn(service, 'findById').mockResolvedValue(mockResource);

      await expect(service.delete('resource-123', context))
        .rejects
        .toThrow(BusinessRuleViolationError);
    });
  });

  describe('business methods', () => {
    describe('findByCategory', () => {
      it('should find resources by category', async () => {
        const mockResources = [
          { id: 'resource-1', name: 'Resource 1', category: 'premium' },
        ] as Resource[];

        (mockResourceRepository.findByCategory as jest.Mock).mockResolvedValue(mockResources);

        const result = await service.findByCategory('premium', {}, context);

        expect(result).toEqual(mockResources);
        expect(mockResourceRepository.findByCategory).toHaveBeenCalledWith(
          'premium',
          {},
          context
        );
      });
    });

    describe('findFeatured', () => {
      it('should find featured resources', async () => {
        const mockResources = [
          { id: 'resource-1', name: 'Featured Resource 1', isFeatured: true },
        ] as Resource[];

        (mockResourceRepository.findFeatured as jest.Mock).mockResolvedValue(mockResources);

        const result = await service.findFeatured(5, context);

        expect(result).toEqual(mockResources);
        expect(mockResourceRepository.findFeatured).toHaveBeenCalledWith(5, context);
      });
    });

    describe('searchResources', () => {
      it('should search resources successfully', async () => {
        const mockResources = [
          { id: 'resource-1', name: 'Searchable Resource' },
        ] as Resource[];

        (mockResourceRepository.fullTextSearch as jest.Mock).mockResolvedValue(mockResources);

        const searchOptions = {
          query: 'searchable',
          fields: ['name', 'description'],
        };

        const result = await service.searchResources(searchOptions, context);

        expect(result).toEqual(mockResources);
        expect(mockResourceRepository.fullTextSearch).toHaveBeenCalledWith(searchOptions, context);
      });

      it('should validate search query length', async () => {
        const searchOptions = {
          query: 'a', // Too short
          fields: ['name'],
        };

        await expect(service.searchResources(searchOptions, context))
          .rejects
          .toThrow(ValidationError);
      });
    });

    describe('publishResource', () => {
      it('should publish a draft resource', async () => {
        const mockResource = {
          id: 'resource-123',
          name: 'Resource to Publish',
          category: 'general',
          status: 'draft',
        } as Resource;

        const mockPublishedResource = {
          ...mockResource,
          status: 'active',
          publishedAt: expect.any(Date),
        } as Resource;

        jest.spyOn(service, 'findById').mockResolvedValue(mockResource);
        jest.spyOn(service, 'update').mockResolvedValue(mockPublishedResource);

        const result = await service.publishResource('resource-123', undefined, context);

        expect(result).toEqual(mockPublishedResource);
        expect(service.update).toHaveBeenCalledWith(
          'resource-123',
          expect.objectContaining({
            status: 'active',
            publishedAt: expect.any(Date),
          }),
          context
        );
      });

      it('should throw error for already published resource', async () => {
        const mockResource = {
          id: 'resource-123',
          name: 'Published Resource',
          status: 'active',
        } as Resource;

        jest.spyOn(service, 'findById').mockResolvedValue(mockResource);

        await expect(service.publishResource('resource-123', undefined, context))
          .rejects
          .toThrow(BusinessRuleViolationError);
      });

      it('should throw error for resource without required fields', async () => {
        const mockResource = {
          id: 'resource-123',
          name: '', // Missing name
          status: 'draft',
        } as Resource;

        jest.spyOn(service, 'findById').mockResolvedValue(mockResource);

        await expect(service.publishResource('resource-123', undefined, context))
          .rejects
          .toThrow(BusinessRuleViolationError);
      });
    });

    describe('duplicateResource', () => {
      it('should duplicate resource successfully', async () => {
        const originalResource = {
          id: 'resource-123',
          name: 'Original Resource',
          description: 'Original description',
          category: 'general',
          price: 99.99,
          quantity: 10,
        } as Resource;

        const duplicatedResource = {
          id: 'resource-456',
          name: 'Original Resource (Copy)',
          description: 'Original description',
          category: 'general',
          price: 99.99,
          quantity: 0, // Reset for duplicates
          status: 'draft',
          isFeatured: false,
        } as Resource;

        jest.spyOn(service, 'findById').mockResolvedValue(originalResource);
        jest.spyOn(service, 'create').mockResolvedValue(duplicatedResource);

        const result = await service.duplicateResource('resource-123', {}, context);

        expect(result).toEqual(duplicatedResource);
        expect(service.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Original Resource (Copy)',
            quantity: 0,
            status: 'draft',
            isFeatured: false,
          }),
          context
        );
      });

      it('should apply modifications to duplicate', async () => {
        const originalResource = {
          id: 'resource-123',
          name: 'Original Resource',
          category: 'general',
        } as Resource;

        const modifications = {
          name: 'Modified Copy',
          category: 'premium',
        };

        const duplicatedResource = {
          id: 'resource-456',
          ...originalResource,
          ...modifications,
          quantity: 0,
          status: 'draft',
          isFeatured: false,
        } as Resource;

        jest.spyOn(service, 'findById').mockResolvedValue(originalResource);
        jest.spyOn(service, 'create').mockResolvedValue(duplicatedResource);

        const result = await service.duplicateResource('resource-123', modifications, context);

        expect(result).toEqual(duplicatedResource);
        expect(service.create).toHaveBeenCalledWith(
          expect.objectContaining(modifications),
          context
        );
      });
    });

    describe('batchUpdateStatus', () => {
      it('should update status for multiple resources', async () => {
        const ids = ['resource-1', 'resource-2'];
        const status = 'active';
        const mockResult = { updated: 2, failed: [] };

        (mockResourceRepository.batchUpdateStatus as jest.Mock).mockResolvedValue(mockResult);

        const result = await service.batchUpdateStatus(ids, status, context);

        expect(result).toEqual(mockResult);
        expect(mockResourceRepository.batchUpdateStatus).toHaveBeenCalledWith(
          ids,
          status,
          context
        );
      });

      it('should validate batch operation limits', async () => {
        const largeIds = Array.from({ length: 200 }, (_, i) => `resource-${i}`);

        await expect(service.batchUpdateStatus(largeIds, 'active', context))
          .rejects
          .toThrow(ValidationError);
      });

      it('should validate status value', async () => {
        const ids = ['resource-1'];
        const invalidStatus = 'invalid-status';

        await expect(service.batchUpdateStatus(ids, invalidStatus, context))
          .rejects
          .toThrow(ValidationError);
      });
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple resources successfully', async () => {
      const resourcesData = [
        { name: 'Resource 1', category: 'general' },
        { name: 'Resource 2', category: 'premium' },
      ];

      const mockResult = {
        success: [
          { id: 'resource-1', ...resourcesData[0] },
          { id: 'resource-2', ...resourcesData[1] },
        ] as Resource[],
        failed: [],
        summary: { total: 2, successful: 2, failed: 0 },
      };

      (mockResourceRepository.bulkCreate as jest.Mock).mockResolvedValue(mockResult);

      const result = await service.bulkCreate(resourcesData, context);

      expect(result).toEqual(mockResult);
      expect(mockResourceRepository.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining(resourcesData),
        context
      );
    });

    it('should validate bulk operation limits', async () => {
      const largeResourcesData = Array.from({ length: 200 }, (_, i) => ({
        name: `Resource ${i}`,
      }));

      await expect(service.bulkCreate(largeResourcesData, context))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const result = await service.healthCheck();

      expect(result).toEqual({
        status: 'healthy',
        timestamp: expect.any(Date),
      });
      expect(mockDataSource.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should return unhealthy status on database error', async () => {
      (mockDataSource.query as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await service.healthCheck();

      expect(result).toEqual({
        status: 'unhealthy',
        timestamp: expect.any(Date),
      });
    });
  });
});