import {
  Repository,
  SelectQueryBuilder,
  FindOptionsWhere,
  DeepPartial,
  EntityTarget,
  ObjectLiteral,
  DataSource,
  QueryRunner,
} from 'typeorm';
import { BaseEntity } from '../entities/base.entity';
import { AuditLog, AuditAction } from '../entities/audit-log.entity';
import {
  QueryOptions,
  PaginationResult,
  BulkOperationResult,
  QueryFilter,
  FilterOperator,
  QueryContext,
  CacheOptions,
  SearchOptions,
} from '../types/query.types';
import RedisManager from '../config/redis';

export abstract class BaseRepository<T extends BaseEntity> {
  protected repository: Repository<T>;
  protected auditRepository: Repository<AuditLog>;
  protected redisManager: RedisManager;
  protected entityName: string;

  constructor(
    protected dataSource: DataSource,
    protected entity: EntityTarget<T>
  ) {
    this.repository = dataSource.getRepository(entity);
    this.auditRepository = dataSource.getRepository(AuditLog);
    this.redisManager = RedisManager.getInstance();
    this.entityName = this.repository.metadata.name;
  }

  // CRUD Operations with optimization
  async findById(
    id: string,
    options?: {
      relations?: string[];
      select?: string[];
      withDeleted?: boolean;
      cache?: CacheOptions;
    },
    context?: QueryContext
  ): Promise<T | null> {
    const cacheKey = options?.cache?.key || 
      this.generateCacheKey('findById', id, JSON.stringify(options || {}));

    if (options?.cache !== false) {
      const cached = await this.redisManager.get<T>(cacheKey);
      if (cached) {
        return this.filterByPermissions(cached, context);
      }
    }

    const queryBuilder = this.repository.createQueryBuilder(this.entityName);
    
    // Apply tenant filtering
    if (context?.tenantId) {
      queryBuilder.andWhere(`${this.entityName}.tenantId = :tenantId`, {
        tenantId: context.tenantId
      });
    }

    queryBuilder.where(`${this.entityName}.id = :id`, { id });

    // Handle relations
    if (options?.relations) {
      options.relations.forEach(relation => {
        queryBuilder.leftJoinAndSelect(`${this.entityName}.${relation}`, relation);
      });
    }

    // Handle select
    if (options?.select) {
      queryBuilder.select(options.select.map(field => `${this.entityName}.${field}`));
    }

    // Handle soft deletes
    if (!options?.withDeleted) {
      queryBuilder.andWhere(`${this.entityName}.deletedAt IS NULL`);
    }

    const result = await queryBuilder.getOne();

    // Cache the result
    if (result && options?.cache !== false) {
      await this.redisManager.setex(
        cacheKey,
        options?.cache?.ttl || 300,
        result
      );
    }

    return this.filterByPermissions(result, context);
  }

  async findMany(
    options: QueryOptions = {},
    context?: QueryContext
  ): Promise<PaginationResult<T>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      filters = {},
      search,
      relations = [],
      select,
      withDeleted = false,
    } = options;

    const cacheKey = this.generateCacheKey('findMany', JSON.stringify(options));
    
    // Try cache first for read-heavy workloads
    if (options.page && options.limit && options.limit <= 100) {
      const cached = await this.redisManager.get<PaginationResult<T>>(cacheKey);
      if (cached) {
        return {
          ...cached,
          data: cached.data.map(item => this.filterByPermissions(item, context)).filter(Boolean)
        };
      }
    }

    const queryBuilder = this.createBaseQuery(context, withDeleted);

    // Apply filters
    this.applyFilters(queryBuilder, filters);

    // Apply search
    if (search) {
      this.applySearch(queryBuilder, search);
    }

    // Apply relations
    relations.forEach(relation => {
      queryBuilder.leftJoinAndSelect(`${this.entityName}.${relation}`, relation);
    });

    // Apply select
    if (select) {
      queryBuilder.select(select.map(field => `${this.entityName}.${field}`));
    }

    // Apply sorting
    queryBuilder.orderBy(`${this.entityName}.${sortBy}`, sortOrder);

    // Get total count for pagination
    const total = await queryBuilder.getCount();

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const data = await queryBuilder.getMany();

    const result: PaginationResult<T> = {
      data: data.map(item => this.filterByPermissions(item, context)).filter(Boolean),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };

    // Cache the result for future requests
    if (limit <= 100) {
      await this.redisManager.setex(cacheKey, 120, result); // 2 minutes cache
    }

    return result;
  }

  async create(
    data: DeepPartial<T>,
    context?: QueryContext
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Prepare entity
      const entity = this.repository.create({
        ...data,
        createdBy: context?.userId,
        tenantId: context?.tenantId,
      } as DeepPartial<T>);

      // Save entity
      const result = await queryRunner.manager.save(entity);

      // Create audit log
      await this.createAuditLog(
        queryRunner,
        AuditAction.CREATE,
        result.id,
        undefined,
        result,
        context
      );

      await queryRunner.commitTransaction();

      // Invalidate related caches
      await this.invalidateCache('findMany');

      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async update(
    id: string,
    data: DeepPartial<T>,
    context?: QueryContext
  ): Promise<T | null> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get existing entity
      const existing = await this.findById(id, { withDeleted: false }, context);
      if (!existing) {
        throw new Error(`Entity with id ${id} not found`);
      }

      // Check optimistic locking
      if (data.version && existing.version !== data.version) {
        throw new Error('Entity has been modified by another user');
      }

      // Update entity
      const updatedData = {
        ...data,
        updatedBy: context?.userId,
        version: existing.version + 1,
      };

      await queryRunner.manager.update(this.entity, id, updatedData as any);
      
      // Get updated entity
      const result = await queryRunner.manager.findOneBy(this.entity, { id } as FindOptionsWhere<T>);

      // Create audit log
      await this.createAuditLog(
        queryRunner,
        AuditAction.UPDATE,
        id,
        existing,
        result,
        context
      );

      await queryRunner.commitTransaction();

      // Invalidate caches
      await this.invalidateEntityCache(id);

      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async softDelete(
    id: string,
    context?: QueryContext
  ): Promise<boolean> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get existing entity
      const existing = await this.findById(id, { withDeleted: false }, context);
      if (!existing) {
        throw new Error(`Entity with id ${id} not found`);
      }

      // Soft delete
      await queryRunner.manager.update(this.entity, id, {
        deletedAt: new Date(),
        deletedBy: context?.userId,
      } as any);

      // Create audit log
      await this.createAuditLog(
        queryRunner,
        AuditAction.SOFT_DELETE,
        id,
        existing,
        { ...existing, deletedAt: new Date(), deletedBy: context?.userId },
        context
      );

      await queryRunner.commitTransaction();

      // Invalidate caches
      await this.invalidateEntityCache(id);

      return true;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async bulkCreate(
    data: DeepPartial<T>[],
    context?: QueryContext
  ): Promise<BulkOperationResult<T>> {
    const result: BulkOperationResult<T> = {
      success: [],
      failed: [],
      summary: { total: data.length, successful: 0, failed: 0 }
    };

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const item of data) {
        try {
          const entity = this.repository.create({
            ...item,
            createdBy: context?.userId,
            tenantId: context?.tenantId,
          } as DeepPartial<T>);

          const saved = await queryRunner.manager.save(entity);
          result.success.push(saved);
          result.summary.successful++;

          // Create audit log
          await this.createAuditLog(
            queryRunner,
            AuditAction.BULK_CREATE,
            saved.id,
            undefined,
            saved,
            context
          );
        } catch (error) {
          result.failed.push({
            item,
            error: error.message,
          });
          result.summary.failed++;
        }
      }

      await queryRunner.commitTransaction();

      // Invalidate caches
      await this.invalidateCache('findMany');

      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Query building helpers
  protected createBaseQuery(
    context?: QueryContext,
    withDeleted: boolean = false
  ): SelectQueryBuilder<T> {
    const queryBuilder = this.repository.createQueryBuilder(this.entityName);

    // Apply tenant filtering
    if (context?.tenantId) {
      queryBuilder.andWhere(`${this.entityName}.tenantId = :tenantId`, {
        tenantId: context.tenantId
      });
    }

    // Handle soft deletes
    if (!withDeleted) {
      queryBuilder.andWhere(`${this.entityName}.deletedAt IS NULL`);
    }

    return queryBuilder;
  }

  protected applyFilters(
    queryBuilder: SelectQueryBuilder<T>,
    filters: Record<string, any>
  ): void {
    Object.entries(filters).forEach(([field, value], index) => {
      const paramName = `filter_${field}_${index}`;
      
      if (value === null) {
        queryBuilder.andWhere(`${this.entityName}.${field} IS NULL`);
      } else if (Array.isArray(value)) {
        queryBuilder.andWhere(`${this.entityName}.${field} IN (:...${paramName})`, {
          [paramName]: value
        });
      } else if (typeof value === 'object' && value.operator) {
        this.applyOperatorFilter(queryBuilder, field, value, paramName);
      } else {
        queryBuilder.andWhere(`${this.entityName}.${field} = :${paramName}`, {
          [paramName]: value
        });
      }
    });
  }

  protected applyOperatorFilter(
    queryBuilder: SelectQueryBuilder<T>,
    field: string,
    filter: { operator: FilterOperator; value: any },
    paramName: string
  ): void {
    const { operator, value } = filter;

    switch (operator) {
      case FilterOperator.GREATER_THAN:
        queryBuilder.andWhere(`${this.entityName}.${field} > :${paramName}`, {
          [paramName]: value
        });
        break;
      case FilterOperator.LESS_THAN:
        queryBuilder.andWhere(`${this.entityName}.${field} < :${paramName}`, {
          [paramName]: value
        });
        break;
      case FilterOperator.LIKE:
        queryBuilder.andWhere(`${this.entityName}.${field} LIKE :${paramName}`, {
          [paramName]: `%${value}%`
        });
        break;
      case FilterOperator.IN:
        queryBuilder.andWhere(`${this.entityName}.${field} IN (:...${paramName})`, {
          [paramName]: value
        });
        break;
      // Add more operators as needed
    }
  }

  protected applySearch(
    queryBuilder: SelectQueryBuilder<T>,
    search: string
  ): void {
    // This is a basic implementation - override in specific repositories
    // for more advanced search functionality
    const searchFields = ['name', 'description']; // Default searchable fields
    
    const searchConditions = searchFields
      .map(field => `${this.entityName}.${field} ILIKE :search`)
      .join(' OR ');

    if (searchConditions) {
      queryBuilder.andWhere(`(${searchConditions})`, {
        search: `%${search}%`
      });
    }
  }

  // Cache management
  protected generateCacheKey(...parts: string[]): string {
    return this.redisManager.generateCacheKey(this.entityName, ...parts);
  }

  protected async invalidateCache(pattern: string): Promise<void> {
    const key = this.generateCacheKey(pattern, '*');
    await this.redisManager.flushPattern(key);
  }

  protected async invalidateEntityCache(id: string): Promise<void> {
    await Promise.all([
      this.invalidateCache('findById'),
      this.invalidateCache('findMany'),
      this.redisManager.del(this.generateCacheKey('findById', id, '*')),
    ]);
  }

  // Audit logging
  protected async createAuditLog(
    queryRunner: QueryRunner,
    action: AuditAction,
    entityId: string,
    oldValues?: any,
    newValues?: any,
    context?: QueryContext
  ): Promise<void> {
    const auditLog = AuditLog.create({
      entityName: this.entityName,
      entityId,
      action,
      oldValues,
      newValues,
      userId: context?.userId,
      tenantId: context?.tenantId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    await queryRunner.manager.save(auditLog);
  }

  // Permission filtering
  protected filterByPermissions(
    entity: T | null,
    context?: QueryContext
  ): T | null {
    if (!entity || !context?.permissions) {
      return entity;
    }

    // Basic permission checking - override in specific repositories
    // for more complex field-level permissions
    return entity;
  }
}