import { DataSource } from 'typeorm';
import { Resource } from '../entities/sample-resource.entity';
import { ResourceRepository } from '../repositories/resource.repository';
import { BaseService } from './base.service';
import { QueryContext, SearchOptions } from '../types/query.types';
import { ValidationError, BusinessRuleViolationError } from '../utils/errors';
import * as Joi from 'joi';

export class ResourceService extends BaseService<Resource> {
  private resourceRepository: ResourceRepository;

  constructor(dataSource: DataSource) {
    const resourceRepository = new ResourceRepository(dataSource);
    super(dataSource, resourceRepository);
    this.resourceRepository = resourceRepository;
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

  // Extended business methods
  async findByCategory(
    category: string,
    options: {
      includeSubcategories?: boolean;
      limit?: number;
      offset?: number;
    } = {},
    context?: QueryContext
  ): Promise<Resource[]> {
    await this.checkReadPermission(context);
    
    return this.resourceRepository.findByCategory(category, options, context);
  }

  async findFeatured(
    limit: number = 10,
    context?: QueryContext
  ): Promise<Resource[]> {
    await this.checkReadPermission(context);
    
    return this.resourceRepository.findFeatured(limit, context);
  }

  async searchResources(
    options: SearchOptions,
    context?: QueryContext
  ): Promise<Resource[]> {
    await this.checkReadPermission(context);

    // Validate search options
    if (!options.query || options.query.trim().length < 2) {
      throw new ValidationError('Search query must be at least 2 characters long');
    }

    return this.resourceRepository.fullTextSearch(options, context);
  }

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
    await this.checkReadPermission(context);

    return this.resourceRepository.findWithComplexFilters(filters, context);
  }

  async getResourceStats(context?: QueryContext): Promise<any> {
    await this.checkReadPermission(context);

    return this.resourceRepository.getResourceStats(context);
  }

  async batchUpdateStatus(
    ids: string[],
    status: string,
    context?: QueryContext
  ): Promise<{ updated: number; failed: string[] }> {
    // Validate inputs
    if (!ids || ids.length === 0) {
      throw new ValidationError('No IDs provided');
    }

    if (ids.length > this.getBulkOperationLimit()) {
      throw new ValidationError(`Bulk operation limited to ${this.getBulkOperationLimit()} items`);
    }

    if (!['draft', 'active', 'inactive', 'archived'].includes(status)) {
      throw new ValidationError('Invalid status value');
    }

    await this.checkUpdatePermission(context);

    return this.resourceRepository.batchUpdateStatus(ids, status, context);
  }

  async publishResource(
    id: string,
    publishedAt?: Date,
    context?: QueryContext
  ): Promise<Resource | null> {
    const resource = await this.findById(id, {}, context);
    if (!resource) {
      throw new ValidationError('Resource not found');
    }

    // Business rule: only draft or inactive resources can be published
    if (!['draft', 'inactive'].includes(resource.status)) {
      throw new BusinessRuleViolationError(
        'Only draft or inactive resources can be published'
      );
    }

    // Business rule: resource must have required fields for publishing
    if (!resource.name || !resource.category) {
      throw new BusinessRuleViolationError(
        'Resource must have name and category to be published'
      );
    }

    return this.update(id, {
      status: 'active',
      publishedAt: publishedAt || new Date(),
    }, context);
  }

  async unpublishResource(
    id: string,
    context?: QueryContext
  ): Promise<Resource | null> {
    const resource = await this.findById(id, {}, context);
    if (!resource) {
      throw new ValidationError('Resource not found');
    }

    if (resource.status !== 'active') {
      throw new BusinessRuleViolationError('Only active resources can be unpublished');
    }

    return this.update(id, {
      status: 'inactive',
    }, context);
  }

  async duplicateResource(
    id: string,
    modifications?: Partial<Resource>,
    context?: QueryContext
  ): Promise<Resource> {
    const originalResource = await this.findById(id, {}, context);
    if (!originalResource) {
      throw new ValidationError('Resource not found');
    }

    const duplicateData: Partial<Resource> = {
      name: `${originalResource.name} (Copy)`,
      description: originalResource.description,
      category: originalResource.category,
      price: originalResource.price,
      quantity: 0, // Reset quantity for duplicates
      attributes: originalResource.attributes,
      tags: originalResource.tags,
      status: 'draft', // Always start as draft
      isFeatured: false, // Never duplicate as featured
      ...modifications,
    };

    return this.create(duplicateData, context);
  }

  // Implementation of abstract methods
  protected async validateCreateData(
    data: Partial<Resource>,
    context?: QueryContext
  ): Promise<string[]> {
    const { error } = this.createSchema.validate(data);
    const errors: string[] = [];

    if (error) {
      errors.push(...error.details.map(detail => detail.message));
    }

    // Business validation
    await this.validateBusinessRules(data, errors, context);

    return errors;
  }

  protected async validateUpdateData(
    id: string,
    data: Partial<Resource>,
    context?: QueryContext
  ): Promise<string[]> {
    const { error } = this.updateSchema.validate(data);
    const errors: string[] = [];

    if (error) {
      errors.push(...error.details.map(detail => detail.message));
    }

    // Additional validation for updates
    const existingResource = await this.repository.findById(id, {}, context);
    if (!existingResource) {
      errors.push('Resource not found');
      return errors;
    }

    // Business validation with existing data context
    await this.validateBusinessRules({ ...existingResource, ...data }, errors, context);

    return errors;
  }

  protected async validateDelete(
    id: string,
    context?: QueryContext
  ): Promise<void> {
    const resource = await this.repository.findById(id, {}, context);
    if (!resource) {
      throw new ValidationError('Resource not found');
    }

    // Business rule: cannot delete published featured resources
    if (resource.isFeatured && resource.status === 'active') {
      throw new BusinessRuleViolationError(
        'Cannot delete active featured resources. Please unfeature and unpublish first.'
      );
    }

    // Add more business constraints as needed
  }

  private async validateBusinessRules(
    data: Partial<Resource>,
    errors: string[],
    context?: QueryContext
  ): Promise<void> {
    // Business rule: featured resources must have a category
    if (data.isFeatured && !data.category) {
      errors.push('Featured resources must have a category');
    }

    // Business rule: published resources must have a price if category requires it
    if (data.status === 'active' && data.category === 'premium' && !data.price) {
      errors.push('Premium resources must have a price');
    }

    // Business rule: check for duplicate names in the same category
    if (data.name && data.category) {
      const existingResource = await this.resourceRepository.findMany({
        filters: {
          name: data.name,
          category: data.category,
        },
        limit: 1,
      }, context);

      if (existingResource.data.length > 0) {
        errors.push('A resource with this name already exists in this category');
      }
    }

    // Business rule: validate tag format
    if (data.tags) {
      const invalidTags = data.tags.filter(tag => !/^[a-zA-Z0-9-_]+$/.test(tag));
      if (invalidTags.length > 0) {
        errors.push(`Invalid tag format: ${invalidTags.join(', ')}`);
      }
    }
  }

  // Lifecycle hooks
  protected async beforeCreate(
    data: Partial<Resource>,
    context?: QueryContext
  ): Promise<Partial<Resource>> {
    const processedData = { ...data };

    // Auto-generate category if not provided
    if (!processedData.category && processedData.name) {
      processedData.category = this.inferCategoryFromName(processedData.name);
    }

    // Set default publish date for active resources
    if (processedData.status === 'active' && !processedData.publishedAt) {
      processedData.publishedAt = new Date();
    }

    // Generate search vector
    if (processedData.name || processedData.description) {
      const searchableText = [
        processedData.name,
        processedData.description,
        processedData.category,
        ...(processedData.tags || []),
      ].filter(Boolean).join(' ');

      // In production, this would be handled by a database trigger
      (processedData as any).searchVector = searchableText.toLowerCase();
    }

    return processedData;
  }

  protected async afterCreate(entity: Resource, context?: QueryContext): Promise<void> {
    // Send notifications for featured resources
    if (entity.isFeatured) {
      await this.notifyFeaturedResourceCreated(entity, context);
    }

    // Update category statistics
    await this.updateCategoryStats(entity.category);
  }

  protected async beforeUpdate(
    id: string,
    data: Partial<Resource>,
    context?: QueryContext
  ): Promise<Partial<Resource>> {
    const processedData = { ...data };

    // Auto-publish when status changes to active
    if (processedData.status === 'active' && !processedData.publishedAt) {
      processedData.publishedAt = new Date();
    }

    // Clear publish date when status changes away from active
    if (processedData.status && processedData.status !== 'active') {
      processedData.publishedAt = null;
    }

    return processedData;
  }

  protected async afterUpdate(entity: Resource, context?: QueryContext): Promise<void> {
    // Invalidate category caches if category changed
    if (entity.category) {
      await this.invalidateCategoryCaches(entity.category);
    }

    // Send notifications for status changes
    await this.notifyResourceStatusChange(entity, context);
  }

  protected async afterDelete(id: string, context?: QueryContext): Promise<void> {
    // Clean up related data or send notifications
    await this.cleanupRelatedData(id);
  }

  // Business rule application
  protected async applyBusinessRules(
    entity: Resource,
    context?: QueryContext
  ): Promise<Resource> {
    // Apply field-level permissions
    if (!this.hasPermission(context!, 'view_sensitive_data')) {
      // Remove sensitive fields for users without permission
      delete (entity as any).createdBy;
      delete (entity as any).updatedBy;
    }

    // Apply tenant-specific rules
    if (context?.tenantId && !entity.belongsToTenant(context.tenantId)) {
      throw new Error('Resource does not belong to your tenant');
    }

    return entity;
  }

  // Helper methods
  private inferCategoryFromName(name: string): string {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('premium') || lowerName.includes('pro')) {
      return 'premium';
    }
    if (lowerName.includes('basic') || lowerName.includes('starter')) {
      return 'basic';
    }
    
    return 'general';
  }

  private async notifyFeaturedResourceCreated(
    resource: Resource,
    context?: QueryContext
  ): Promise<void> {
    // Implement notification logic
    console.log(`Featured resource created: ${resource.name}`);
  }

  private async updateCategoryStats(category?: string): Promise<void> {
    if (category) {
      // Invalidate category statistics cache
      const cacheKey = `resource_stats:category:${category}`;
      await this.resourceRepository['redisManager'].del(cacheKey);
    }
  }

  private async invalidateCategoryCaches(category: string): Promise<void> {
    const patterns = [
      `findByCategory:${category}:*`,
      `resourceStats:*`,
    ];

    for (const pattern of patterns) {
      await this.resourceRepository['redisManager'].flushPattern(pattern);
    }
  }

  private async notifyResourceStatusChange(
    resource: Resource,
    context?: QueryContext
  ): Promise<void> {
    // Implement status change notification logic
    console.log(`Resource status changed: ${resource.name} -> ${resource.status}`);
  }

  private async cleanupRelatedData(id: string): Promise<void> {
    // Clean up any related data when resource is deleted
    console.log(`Cleaning up related data for resource: ${id}`);
  }
}