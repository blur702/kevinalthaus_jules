import { DataSource, SelectQueryBuilder } from 'typeorm';
import { Resource } from '../entities/sample-resource.entity';
import { BaseRepository } from './base.repository';
import { QueryContext, SearchOptions, AggregationOptions } from '../types/query.types';

export class ResourceRepository extends BaseRepository<Resource> {
  constructor(dataSource: DataSource) {
    super(dataSource, Resource);
  }

  // Advanced search with full-text search
  async fullTextSearch(
    options: SearchOptions,
    context?: QueryContext
  ): Promise<Resource[]> {
    const { query, fields = ['name', 'description'], fuzzy = false } = options;
    
    const cacheKey = this.generateCacheKey('fullTextSearch', JSON.stringify(options));
    
    // Try cache first
    const cached = await this.redisManager.get<Resource[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const queryBuilder = this.createBaseQuery(context);

    if (fuzzy) {
      // Use PostgreSQL full-text search with ranking
      queryBuilder
        .addSelect(`ts_rank(search_vector, plainto_tsquery('english', :query))`, 'rank')
        .where('search_vector @@ plainto_tsquery(\'english\', :query)', { query })
        .orderBy('rank', 'DESC');
    } else {
      // Use ILIKE for simpler searches
      const searchConditions = fields
        .map((field, index) => `${this.entityName}.${field} ILIKE :query${index}`)
        .join(' OR ');

      queryBuilder.andWhere(`(${searchConditions})`, 
        fields.reduce((params, field, index) => {
          params[`query${index}`] = `%${query}%`;
          return params;
        }, {})
      );
    }

    const results = await queryBuilder.getMany();

    // Cache results
    await this.redisManager.setex(cacheKey, 180, results); // 3 minutes cache

    return results;
  }

  // Find resources by category with performance optimization
  async findByCategory(
    category: string,
    options: {
      includeSubcategories?: boolean;
      limit?: number;
      offset?: number;
    } = {},
    context?: QueryContext
  ): Promise<Resource[]> {
    const cacheKey = this.generateCacheKey(
      'findByCategory', 
      category, 
      JSON.stringify(options)
    );

    // Try cache first
    const cached = await this.redisManager.get<Resource[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const queryBuilder = this.createBaseQuery(context)
      .andWhere(`${this.entityName}.category = :category`, { category });

    // Add subcategories if requested
    if (options.includeSubcategories) {
      queryBuilder.orWhere(`${this.entityName}.category LIKE :categoryPattern`, {
        categoryPattern: `${category}/%`
      });
    }

    // Add pagination
    if (options.limit) {
      queryBuilder.take(options.limit);
    }
    if (options.offset) {
      queryBuilder.skip(options.offset);
    }

    // Optimize with index hints
    queryBuilder.orderBy(`${this.entityName}.category`, 'ASC')
      .addOrderBy(`${this.entityName}.name`, 'ASC');

    const results = await queryBuilder.getMany();

    // Cache results
    await this.redisManager.setex(cacheKey, 300, results); // 5 minutes cache

    return results;
  }

  // Find featured resources with smart caching
  async findFeatured(
    limit: number = 10,
    context?: QueryContext
  ): Promise<Resource[]> {
    const cacheKey = this.generateCacheKey('findFeatured', limit.toString());

    // Try cache first with longer TTL since featured items change less frequently
    const cached = await this.redisManager.get<Resource[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const queryBuilder = this.createBaseQuery(context)
      .andWhere(`${this.entityName}.isFeatured = :isFeatured`, { isFeatured: true })
      .andWhere(`${this.entityName}.status = :status`, { status: 'active' })
      .orderBy(`${this.entityName}.publishedAt`, 'DESC')
      .take(limit);

    const results = await queryBuilder.getMany();

    // Cache with longer TTL for featured content
    await this.redisManager.setex(cacheKey, 900, results); // 15 minutes cache

    return results;
  }

  // Advanced filtering with complex conditions
  async findWithComplexFilters(
    filters: {
      priceRange?: { min?: number; max?: number };
      inStock?: boolean;
      publishedSince?: Date;
      tags?: string[];
      attributes?: Record<string, any>;
    },
    context?: QueryContext
  ): Promise<Resource[]> {
    const queryBuilder = this.createBaseQuery(context);

    // Price range filtering
    if (filters.priceRange?.min !== undefined) {
      queryBuilder.andWhere(`${this.entityName}.price >= :minPrice`, {
        minPrice: filters.priceRange.min
      });
    }
    if (filters.priceRange?.max !== undefined) {
      queryBuilder.andWhere(`${this.entityName}.price <= :maxPrice`, {
        maxPrice: filters.priceRange.max
      });
    }

    // Stock filtering
    if (filters.inStock !== undefined) {
      queryBuilder.andWhere(`${this.entityName}.quantity > 0`);
    }

    // Published date filtering
    if (filters.publishedSince) {
      queryBuilder.andWhere(`${this.entityName}.publishedAt >= :publishedSince`, {
        publishedSince: filters.publishedSince
      });
    }

    // Tags filtering using array operations
    if (filters.tags && filters.tags.length > 0) {
      queryBuilder.andWhere(`${this.entityName}.tags && :tags`, {
        tags: filters.tags
      });
    }

    // JSON attribute filtering
    if (filters.attributes) {
      Object.entries(filters.attributes).forEach(([key, value], index) => {
        queryBuilder.andWhere(
          `${this.entityName}.attributes->>'${key}' = :attrValue${index}`,
          { [`attrValue${index}`]: value }
        );
      });
    }

    return await queryBuilder.getMany();
  }

  // Aggregation queries for analytics
  async getResourceStats(
    context?: QueryContext
  ): Promise<{
    totalResources: number;
    activeResources: number;
    categoryCounts: Array<{ category: string; count: number }>;
    averagePrice: number;
    totalValue: number;
  }> {
    const cacheKey = this.generateCacheKey('resourceStats');

    // Try cache first
    const cached = await this.redisManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const baseQuery = this.createBaseQuery(context);

    // Total resources
    const totalResources = await baseQuery.getCount();

    // Active resources
    const activeResources = await baseQuery
      .andWhere(`${this.entityName}.status = :status`, { status: 'active' })
      .getCount();

    // Category counts
    const categoryCounts = await this.repository
      .createQueryBuilder(this.entityName)
      .select('category')
      .addSelect('COUNT(*)', 'count')
      .where('deletedAt IS NULL')
      .andWhere(context?.tenantId ? 'tenantId = :tenantId' : '1=1', {
        tenantId: context?.tenantId
      })
      .groupBy('category')
      .orderBy('count', 'DESC')
      .getRawMany();

    // Price statistics
    const priceStats = await this.repository
      .createQueryBuilder(this.entityName)
      .select('AVG(price)', 'averagePrice')
      .addSelect('SUM(price * quantity)', 'totalValue')
      .where('deletedAt IS NULL')
      .andWhere('price IS NOT NULL')
      .andWhere(context?.tenantId ? 'tenantId = :tenantId' : '1=1', {
        tenantId: context?.tenantId
      })
      .getRawOne();

    const stats = {
      totalResources,
      activeResources,
      categoryCounts,
      averagePrice: parseFloat(priceStats.averagePrice) || 0,
      totalValue: parseFloat(priceStats.totalValue) || 0,
    };

    // Cache for 10 minutes
    await this.redisManager.setex(cacheKey, 600, stats);

    return stats;
  }

  // Batch operations with optimistic updates
  async batchUpdateStatus(
    ids: string[],
    status: string,
    context?: QueryContext
  ): Promise<{ updated: number; failed: string[] }> {
    const result = { updated: 0, failed: [] };

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Use batch update for better performance
      const updateResult = await queryRunner.manager
        .createQueryBuilder()
        .update(Resource)
        .set({ 
          status, 
          updatedBy: context?.userId,
          updatedAt: new Date()
        })
        .where('id IN (:...ids)', { ids })
        .andWhere('deletedAt IS NULL')
        .andWhere(context?.tenantId ? 'tenantId = :tenantId' : '1=1', {
          tenantId: context?.tenantId
        })
        .execute();

      result.updated = updateResult.affected || 0;

      // Create audit logs for batch operation
      for (const id of ids) {
        await this.createAuditLog(
          queryRunner,
          'BULK_UPDATE' as any,
          id,
          { status: 'previous_status' }, // In production, fetch the old values
          { status },
          context
        );
      }

      await queryRunner.commitTransaction();

      // Invalidate caches
      await this.invalidateCache('findMany');
      await this.invalidateCache('findByCategory');

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    return result;
  }

  // Override search implementation for resources
  protected applySearch(
    queryBuilder: SelectQueryBuilder<Resource>,
    search: string
  ): void {
    queryBuilder.andWhere(`(
      ${this.entityName}.name ILIKE :search OR 
      ${this.entityName}.description ILIKE :search OR 
      ${this.entityName}.category ILIKE :search OR
      array_to_string(${this.entityName}.tags, ' ') ILIKE :search
    )`, { search: `%${search}%` });
  }

  // Optimized method for popular queries
  async findPopularResources(
    limit: number = 10,
    context?: QueryContext
  ): Promise<Resource[]> {
    // This would typically join with analytics/tracking tables
    // For now, we'll use a simple implementation based on featured status
    return this.findFeatured(limit, context);
  }

  // Method to handle N+1 queries efficiently
  async findWithRelations(
    ids: string[],
    relations: string[],
    context?: QueryContext
  ): Promise<Resource[]> {
    if (ids.length === 0) return [];

    const queryBuilder = this.createBaseQuery(context)
      .andWhere(`${this.entityName}.id IN (:...ids)`, { ids });

    // Load all relations in a single query to prevent N+1
    relations.forEach(relation => {
      queryBuilder.leftJoinAndSelect(`${this.entityName}.${relation}`, relation);
    });

    return await queryBuilder.getMany();
  }
}