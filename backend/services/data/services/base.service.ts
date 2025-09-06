import { DataSource } from 'typeorm';
import { BaseEntity } from '../entities/base.entity';
import { BaseRepository } from '../repositories/base.repository';
import {
  QueryOptions,
  PaginationResult,
  BulkOperationResult,
  QueryContext,
} from '../types/query.types';
import { ValidationError } from '../utils/errors';
import { validateEntity } from '../utils/validation';

export abstract class BaseService<T extends BaseEntity> {
  protected repository: BaseRepository<T>;

  constructor(
    protected dataSource: DataSource,
    repository: BaseRepository<T>
  ) {
    this.repository = repository;
  }

  // Business logic layer with validation
  async findById(
    id: string,
    options?: {
      relations?: string[];
      select?: string[];
      withDeleted?: boolean;
    },
    context?: QueryContext
  ): Promise<T | null> {
    // Validate ID format
    if (!this.isValidId(id)) {
      throw new ValidationError('Invalid ID format');
    }

    // Check permissions
    await this.checkReadPermission(context, id);

    const result = await this.repository.findById(id, options, context);
    
    if (!result) {
      return null;
    }

    // Apply business rules
    return await this.applyBusinessRules(result, context);
  }

  async findMany(
    options: QueryOptions = {},
    context?: QueryContext
  ): Promise<PaginationResult<T>> {
    // Validate query options
    this.validateQueryOptions(options);

    // Check permissions
    await this.checkListPermission(context);

    // Apply business constraints
    const constrainedOptions = await this.applyBusinessConstraints(options, context);

    const result = await this.repository.findMany(constrainedOptions, context);

    // Apply business rules to each item
    const processedData = await Promise.all(
      result.data.map(item => this.applyBusinessRules(item, context))
    );

    return {
      ...result,
      data: processedData.filter(Boolean),
    };
  }

  async create(
    data: Partial<T>,
    context?: QueryContext
  ): Promise<T> {
    // Validate input data
    const validationErrors = await this.validateCreateData(data, context);
    if (validationErrors.length > 0) {
      throw new ValidationError('Validation failed', validationErrors);
    }

    // Check permissions
    await this.checkCreatePermission(context);

    // Apply business rules before creation
    const processedData = await this.beforeCreate(data, context);

    // Create entity
    const result = await this.repository.create(processedData, context);

    // Apply post-creation business logic
    await this.afterCreate(result, context);

    return result;
  }

  async update(
    id: string,
    data: Partial<T>,
    context?: QueryContext
  ): Promise<T | null> {
    // Validate ID and data
    if (!this.isValidId(id)) {
      throw new ValidationError('Invalid ID format');
    }

    const validationErrors = await this.validateUpdateData(id, data, context);
    if (validationErrors.length > 0) {
      throw new ValidationError('Validation failed', validationErrors);
    }

    // Check permissions
    await this.checkUpdatePermission(context, id);

    // Apply business rules before update
    const processedData = await this.beforeUpdate(id, data, context);

    // Update entity
    const result = await this.repository.update(id, processedData, context);

    if (result) {
      // Apply post-update business logic
      await this.afterUpdate(result, context);
    }

    return result;
  }

  async delete(
    id: string,
    context?: QueryContext
  ): Promise<boolean> {
    // Validate ID
    if (!this.isValidId(id)) {
      throw new ValidationError('Invalid ID format');
    }

    // Check permissions
    await this.checkDeletePermission(context, id);

    // Check business constraints
    await this.validateDelete(id, context);

    // Apply business rules before deletion
    await this.beforeDelete(id, context);

    // Soft delete entity
    const result = await this.repository.softDelete(id, context);

    if (result) {
      // Apply post-deletion business logic
      await this.afterDelete(id, context);
    }

    return result;
  }

  async bulkCreate(
    data: Partial<T>[],
    context?: QueryContext
  ): Promise<BulkOperationResult<T>> {
    // Validate bulk operation limits
    if (data.length > this.getBulkOperationLimit()) {
      throw new ValidationError(`Bulk operation limited to ${this.getBulkOperationLimit()} items`);
    }

    // Check permissions
    await this.checkBulkCreatePermission(context);

    // Validate all items
    const validationResults = await Promise.all(
      data.map(async (item, index) => {
        try {
          const errors = await this.validateCreateData(item, context);
          return { index, item, errors };
        } catch (error) {
          return { index, item, errors: [error.message] };
        }
      })
    );

    // Filter out invalid items
    const validItems = validationResults
      .filter(result => result.errors.length === 0)
      .map(result => result.item);

    const invalidItems = validationResults
      .filter(result => result.errors.length > 0)
      .map(result => ({
        item: result.item,
        error: result.errors.join(', ')
      }));

    if (validItems.length === 0) {
      return {
        success: [],
        failed: invalidItems,
        summary: {
          total: data.length,
          successful: 0,
          failed: data.length
        }
      };
    }

    // Process valid items
    const processedItems = await Promise.all(
      validItems.map(item => this.beforeCreate(item, context))
    );

    // Bulk create
    const result = await this.repository.bulkCreate(processedItems, context);

    // Add validation failures to result
    result.failed.push(...invalidItems);
    result.summary.failed += invalidItems.length;

    // Apply post-creation logic
    await Promise.all(
      result.success.map(item => this.afterCreate(item, context))
    );

    return result;
  }

  // Abstract methods for business logic - implement in concrete services
  protected abstract validateCreateData(
    data: Partial<T>,
    context?: QueryContext
  ): Promise<string[]>;

  protected abstract validateUpdateData(
    id: string,
    data: Partial<T>,
    context?: QueryContext
  ): Promise<string[]>;

  protected abstract validateDelete(
    id: string,
    context?: QueryContext
  ): Promise<void>;

  // Lifecycle hooks - override in concrete services
  protected async beforeCreate(
    data: Partial<T>,
    context?: QueryContext
  ): Promise<Partial<T>> {
    return data;
  }

  protected async afterCreate(
    entity: T,
    context?: QueryContext
  ): Promise<void> {
    // Override in concrete services
  }

  protected async beforeUpdate(
    id: string,
    data: Partial<T>,
    context?: QueryContext
  ): Promise<Partial<T>> {
    return data;
  }

  protected async afterUpdate(
    entity: T,
    context?: QueryContext
  ): Promise<void> {
    // Override in concrete services
  }

  protected async beforeDelete(
    id: string,
    context?: QueryContext
  ): Promise<void> {
    // Override in concrete services
  }

  protected async afterDelete(
    id: string,
    context?: QueryContext
  ): Promise<void> {
    // Override in concrete services
  }

  // Permission checking methods - override for specific permissions
  protected async checkReadPermission(
    context?: QueryContext,
    id?: string
  ): Promise<void> {
    // Basic permission check - override in concrete services
    if (context?.tenantId && !this.hasPermission(context, 'read')) {
      throw new Error('Insufficient permissions to read resource');
    }
  }

  protected async checkListPermission(context?: QueryContext): Promise<void> {
    if (context?.tenantId && !this.hasPermission(context, 'list')) {
      throw new Error('Insufficient permissions to list resources');
    }
  }

  protected async checkCreatePermission(context?: QueryContext): Promise<void> {
    if (context?.tenantId && !this.hasPermission(context, 'create')) {
      throw new Error('Insufficient permissions to create resource');
    }
  }

  protected async checkUpdatePermission(
    context?: QueryContext,
    id?: string
  ): Promise<void> {
    if (context?.tenantId && !this.hasPermission(context, 'update')) {
      throw new Error('Insufficient permissions to update resource');
    }
  }

  protected async checkDeletePermission(
    context?: QueryContext,
    id?: string
  ): Promise<void> {
    if (context?.tenantId && !this.hasPermission(context, 'delete')) {
      throw new Error('Insufficient permissions to delete resource');
    }
  }

  protected async checkBulkCreatePermission(context?: QueryContext): Promise<void> {
    if (context?.tenantId && !this.hasPermission(context, 'bulk_create')) {
      throw new Error('Insufficient permissions for bulk create operation');
    }
  }

  // Utility methods
  protected isValidId(id: string): boolean {
    // UUID v4 validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }

  protected validateQueryOptions(options: QueryOptions): void {
    if (options.page && options.page < 1) {
      throw new ValidationError('Page must be greater than 0');
    }

    if (options.limit && (options.limit < 1 || options.limit > 1000)) {
      throw new ValidationError('Limit must be between 1 and 1000');
    }

    if (options.sortOrder && !['ASC', 'DESC'].includes(options.sortOrder)) {
      throw new ValidationError('Sort order must be ASC or DESC');
    }
  }

  protected async applyBusinessRules(
    entity: T,
    context?: QueryContext
  ): Promise<T> {
    // Override in concrete services for specific business rules
    return entity;
  }

  protected async applyBusinessConstraints(
    options: QueryOptions,
    context?: QueryContext
  ): Promise<QueryOptions> {
    // Override in concrete services for specific constraints
    return options;
  }

  protected hasPermission(context: QueryContext, action: string): boolean {
    // Basic permission check - implement proper RBAC in production
    return context.permissions?.includes(action) || 
           context.permissions?.includes('*') ||
           false;
  }

  protected getBulkOperationLimit(): number {
    return parseInt(process.env.BULK_OPERATION_LIMIT || '100');
  }

  // Health check method
  async healthCheck(): Promise<{ status: string; timestamp: Date }> {
    try {
      // Test database connection
      await this.dataSource.query('SELECT 1');
      
      return {
        status: 'healthy',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
      };
    }
  }
}