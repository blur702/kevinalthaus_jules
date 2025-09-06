import { DataSource, Repository } from 'typeorm';
import { BaseRepository } from '../../../../backend/services/data/repositories/base.repository';
import { BaseEntity } from '../../../../backend/services/data/entities/base.entity';
import { AuditLog } from '../../../../backend/services/data/entities/audit-log.entity';
import RedisManager from '../../../../backend/services/data/config/redis';
import { QueryContext } from '../../../../backend/services/data/types/query.types';

// Mock entity for testing
class TestEntity extends BaseEntity {
  name: string;
  description?: string;
  status: string = 'active';
}

// Test repository implementation
class TestRepository extends BaseRepository<TestEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource, TestEntity);
  }
}

// Mock dependencies
const mockDataSource = {
  getRepository: jest.fn(),
  createQueryRunner: jest.fn(),
  query: jest.fn(),
} as unknown as DataSource;

const mockRepository = {
  createQueryBuilder: jest.fn(),
  create: jest.fn(),
  findOneBy: jest.fn(),
  metadata: { name: 'TestEntity' },
} as unknown as Repository<TestEntity>;

const mockAuditRepository = {
  save: jest.fn(),
} as unknown as Repository<AuditLog>;

const mockQueryBuilder = {
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orWhere: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getOne: jest.fn(),
  getMany: jest.fn(),
  getCount: jest.fn(),
};

const mockQueryRunner = {
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: {
    save: jest.fn(),
    update: jest.fn(),
    findOneBy: jest.fn(),
  },
};

const mockRedisManager = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  flushPattern: jest.fn(),
  generateCacheKey: jest.fn(),
};

describe('BaseRepository', () => {
  let repository: TestRepository;
  let context: QueryContext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
    (mockDataSource.getRepository as jest.Mock)
      .mockImplementation((entity) => {
        if (entity === TestEntity) return mockRepository;
        if (entity === AuditLog) return mockAuditRepository;
        return mockRepository;
      });

    mockDataSource.createQueryRunner = jest.fn(() => mockQueryRunner);
    mockRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder);
    
    // Mock RedisManager
    jest.spyOn(RedisManager, 'getInstance').mockReturnValue(mockRedisManager as any);

    repository = new TestRepository(mockDataSource);
    
    context = {
      userId: 'user-123',
      tenantId: 'tenant-123',
      permissions: ['read', 'write'],
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    };
  });

  describe('findById', () => {
    it('should find entity by ID successfully', async () => {
      const mockEntity = {
        id: 'entity-123',
        name: 'Test Entity',
        tenantId: 'tenant-123',
        etag: 'etag-123',
      } as TestEntity;

      mockQueryBuilder.getOne.mockResolvedValue(mockEntity);
      mockRedisManager.get.mockResolvedValue(null); // Cache miss

      const result = await repository.findById('entity-123', {}, context);

      expect(result).toEqual(mockEntity);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('TestEntity');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'TestEntity.id = :id',
        { id: 'entity-123' }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'TestEntity.tenantId = :tenantId',
        { tenantId: 'tenant-123' }
      );
    });

    it('should return cached entity if available', async () => {
      const mockEntity = {
        id: 'entity-123',
        name: 'Test Entity',
        tenantId: 'tenant-123',
      } as TestEntity;

      mockRedisManager.get.mockResolvedValue(mockEntity);

      const result = await repository.findById('entity-123', { cache: { ttl: 300 } }, context);

      expect(result).toEqual(mockEntity);
      expect(mockQueryBuilder.getOne).not.toHaveBeenCalled();
    });

    it('should handle relations and select options', async () => {
      const mockEntity = { id: 'entity-123', name: 'Test Entity' } as TestEntity;

      mockQueryBuilder.getOne.mockResolvedValue(mockEntity);
      mockRedisManager.get.mockResolvedValue(null);

      const options = {
        relations: ['related1', 'related2'],
        select: ['name', 'description'],
      };

      await repository.findById('entity-123', options, context);

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledTimes(2);
      expect(mockQueryBuilder.select).toHaveBeenCalledWith([
        'TestEntity.name',
        'TestEntity.description'
      ]);
    });

    it('should handle soft delete filtering', async () => {
      const mockEntity = { id: 'entity-123', name: 'Test Entity' } as TestEntity;

      mockQueryBuilder.getOne.mockResolvedValue(mockEntity);
      mockRedisManager.get.mockResolvedValue(null);

      // Test with soft deletes excluded (default)
      await repository.findById('entity-123', {}, context);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('TestEntity.deletedAt IS NULL');

      jest.clearAllMocks();
      mockRepository.createQueryBuilder = jest.fn(() => mockQueryBuilder);

      // Test with soft deletes included
      await repository.findById('entity-123', { withDeleted: true }, context);
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith('TestEntity.deletedAt IS NULL');
    });
  });

  describe('findMany', () => {
    it('should find entities with pagination', async () => {
      const mockEntities = [
        { id: 'entity-1', name: 'Entity 1' },
        { id: 'entity-2', name: 'Entity 2' },
      ] as TestEntity[];

      mockQueryBuilder.getCount.mockResolvedValue(2);
      mockQueryBuilder.getMany.mockResolvedValue(mockEntities);
      mockRedisManager.get.mockResolvedValue(null);

      const options = {
        page: 1,
        limit: 10,
        sortBy: 'name',
        sortOrder: 'ASC' as const,
      };

      const result = await repository.findMany(options, context);

      expect(result.data).toEqual(mockEntities);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        pages: 1,
        hasNext: false,
        hasPrev: false,
      });

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('TestEntity.name', 'ASC');
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should apply filters correctly', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockRedisManager.get.mockResolvedValue(null);

      const options = {
        filters: {
          status: 'active',
          name: 'test',
          ids: ['id1', 'id2'],
          category: null,
        },
      };

      await repository.findMany(options, context);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'TestEntity.status = :filter_status_0',
        { filter_status_0: 'active' }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'TestEntity.name = :filter_name_1',
        { filter_name_1: 'test' }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'TestEntity.ids IN (:...filter_ids_2)',
        { filter_ids_2: ['id1', 'id2'] }
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('TestEntity.category IS NULL');
    });

    it('should apply search correctly', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockRedisManager.get.mockResolvedValue(null);

      const options = {
        search: 'test query',
      };

      await repository.findMany(options, context);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('TestEntity.name ILIKE :search OR TestEntity.description ILIKE :search'),
        { search: '%test query%' }
      );
    });
  });

  describe('create', () => {
    it('should create entity successfully', async () => {
      const entityData = {
        name: 'New Entity',
        description: 'Test description',
      };

      const mockCreatedEntity = {
        id: 'new-entity-123',
        ...entityData,
        createdBy: 'user-123',
        tenantId: 'tenant-123',
      } as TestEntity;

      mockRepository.create.mockReturnValue(mockCreatedEntity);
      mockQueryRunner.manager.save.mockResolvedValue(mockCreatedEntity);

      const result = await repository.create(entityData, context);

      expect(result).toEqual(mockCreatedEntity);
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...entityData,
        createdBy: 'user-123',
        tenantId: 'tenant-123',
      });
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(mockCreatedEntity);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      const entityData = { name: 'New Entity' };
      const error = new Error('Database error');

      mockRepository.create.mockReturnValue(entityData);
      mockQueryRunner.manager.save.mockRejectedValue(error);

      await expect(repository.create(entityData, context)).rejects.toThrow(error);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should create audit log on successful creation', async () => {
      const entityData = { name: 'New Entity' };
      const mockCreatedEntity = {
        id: 'new-entity-123',
        ...entityData,
      } as TestEntity;

      mockRepository.create.mockReturnValue(mockCreatedEntity);
      mockQueryRunner.manager.save.mockResolvedValue(mockCreatedEntity);

      await repository.create(entityData, context);

      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          entityName: 'TestEntity',
          entityId: 'new-entity-123',
          action: 'CREATE',
          userId: 'user-123',
          tenantId: 'tenant-123',
        })
      );
    });
  });

  describe('update', () => {
    it('should update entity successfully', async () => {
      const updateData = { name: 'Updated Entity' };
      const existingEntity = {
        id: 'entity-123',
        name: 'Original Entity',
        version: 1,
      } as TestEntity;

      const updatedEntity = {
        ...existingEntity,
        ...updateData,
        version: 2,
        updatedBy: 'user-123',
      } as TestEntity;

      // Mock findById to return existing entity
      jest.spyOn(repository, 'findById').mockResolvedValue(existingEntity);
      
      mockQueryRunner.manager.update.mockResolvedValue({ affected: 1 });
      mockQueryRunner.manager.findOneBy.mockResolvedValue(updatedEntity);

      const result = await repository.update('entity-123', updateData, context);

      expect(result).toEqual(updatedEntity);
      expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(
        TestEntity,
        'entity-123',
        expect.objectContaining({
          ...updateData,
          updatedBy: 'user-123',
          version: 2,
        })
      );
    });

    it('should handle optimistic locking', async () => {
      const updateData = { name: 'Updated Entity', version: 1 };
      const existingEntity = {
        id: 'entity-123',
        name: 'Original Entity',
        version: 2, // Different version
      } as TestEntity;

      jest.spyOn(repository, 'findById').mockResolvedValue(existingEntity);

      await expect(repository.update('entity-123', updateData, context))
        .rejects
        .toThrow('Entity has been modified by another user');
    });

    it('should throw error if entity not found', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      await expect(repository.update('non-existent-123', {}, context))
        .rejects
        .toThrow('Entity with id non-existent-123 not found');
    });
  });

  describe('softDelete', () => {
    it('should soft delete entity successfully', async () => {
      const existingEntity = {
        id: 'entity-123',
        name: 'Entity to Delete',
      } as TestEntity;

      jest.spyOn(repository, 'findById').mockResolvedValue(existingEntity);
      mockQueryRunner.manager.update.mockResolvedValue({ affected: 1 });

      const result = await repository.softDelete('entity-123', context);

      expect(result).toBe(true);
      expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(
        TestEntity,
        'entity-123',
        expect.objectContaining({
          deletedAt: expect.any(Date),
          deletedBy: 'user-123',
        })
      );
    });

    it('should throw error if entity not found', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

      await expect(repository.softDelete('non-existent-123', context))
        .rejects
        .toThrow('Entity with id non-existent-123 not found');
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple entities successfully', async () => {
      const entitiesData = [
        { name: 'Entity 1' },
        { name: 'Entity 2' },
      ];

      const mockCreatedEntities = entitiesData.map((data, index) => ({
        id: `entity-${index + 1}`,
        ...data,
        createdBy: 'user-123',
        tenantId: 'tenant-123',
      })) as TestEntity[];

      mockRepository.create
        .mockReturnValueOnce(mockCreatedEntities[0])
        .mockReturnValueOnce(mockCreatedEntities[1]);

      mockQueryRunner.manager.save
        .mockResolvedValueOnce(mockCreatedEntities[0])
        .mockResolvedValueOnce(mockCreatedEntities[1]);

      const result = await repository.bulkCreate(entitiesData, context);

      expect(result.success).toEqual(mockCreatedEntities);
      expect(result.failed).toEqual([]);
      expect(result.summary).toEqual({
        total: 2,
        successful: 2,
        failed: 0,
      });
    });

    it('should handle partial failures in bulk create', async () => {
      const entitiesData = [
        { name: 'Entity 1' },
        { name: 'Entity 2' }, // This will fail
      ];

      const mockCreatedEntity = {
        id: 'entity-1',
        name: 'Entity 1',
        createdBy: 'user-123',
        tenantId: 'tenant-123',
      } as TestEntity;

      mockRepository.create
        .mockReturnValueOnce(mockCreatedEntity)
        .mockReturnValueOnce(entitiesData[1]);

      mockQueryRunner.manager.save
        .mockResolvedValueOnce(mockCreatedEntity)
        .mockRejectedValueOnce(new Error('Validation error'));

      const result = await repository.bulkCreate(entitiesData, context);

      expect(result.success).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.summary).toEqual({
        total: 2,
        successful: 1,
        failed: 1,
      });
      expect(result.failed[0]).toMatchObject({
        item: entitiesData[1],
        error: 'Validation error',
      });
    });
  });

  describe('cache management', () => {
    it('should generate correct cache keys', async () => {
      mockRedisManager.generateCacheKey.mockReturnValue('TestEntity:findById:entity-123');

      await repository.findById('entity-123', {}, context);

      expect(mockRedisManager.generateCacheKey).toHaveBeenCalledWith(
        'TestEntity',
        'findById',
        'entity-123',
        expect.any(String)
      );
    });

    it('should invalidate cache after updates', async () => {
      const existingEntity = { id: 'entity-123', name: 'Original', version: 1 } as TestEntity;
      const updatedEntity = { ...existingEntity, name: 'Updated', version: 2 } as TestEntity;

      jest.spyOn(repository, 'findById').mockResolvedValue(existingEntity);
      mockQueryRunner.manager.update.mockResolvedValue({ affected: 1 });
      mockQueryRunner.manager.findOneBy.mockResolvedValue(updatedEntity);

      await repository.update('entity-123', { name: 'Updated' }, context);

      expect(mockRedisManager.flushPattern).toHaveBeenCalled();
      expect(mockRedisManager.del).toHaveBeenCalled();
    });
  });
});