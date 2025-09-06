import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('resources')
@Index('idx_resource_name', ['name'])
@Index('idx_resource_status', ['status'])
@Index('idx_resource_category', ['category'])
@Index('idx_resource_tenant_active', ['tenantId', 'deletedAt'])
export class Resource extends BaseEntity {
  @Column({
    length: 255,
    nullable: false,
  })
  name: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  description?: string;

  @Column({
    length: 50,
    default: 'active',
  })
  status: string;

  @Column({
    length: 100,
    nullable: true,
  })
  category?: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  price?: number;

  @Column({
    type: 'int',
    default: 0,
  })
  quantity: number;

  @Column({
    type: 'jsonb',
    nullable: true,
    default: '{}',
  })
  attributes?: Record<string, any>;

  @Column({
    type: 'text',
    array: true,
    nullable: true,
  })
  tags?: string[];

  @Column({
    name: 'is_featured',
    type: 'boolean',
    default: false,
  })
  @Index('idx_resource_featured')
  isFeatured: boolean;

  @Column({
    name: 'published_at',
    type: 'timestamptz',
    nullable: true,
  })
  @Index('idx_resource_published')
  publishedAt?: Date;

  // Virtual fields for computed properties
  get isPublished(): boolean {
    return !!this.publishedAt && this.publishedAt <= new Date();
  }

  get isInStock(): boolean {
    return this.quantity > 0;
  }

  // Search optimization
  @Column({
    name: 'search_vector',
    type: 'tsvector',
    nullable: true,
  })
  @Index('idx_resource_search', { synchronize: false })
  searchVector?: string;

  // Helper methods
  updateSearchVector(): void {
    const searchableText = [
      this.name,
      this.description,
      this.category,
      ...(this.tags || []),
    ].filter(Boolean).join(' ');

    // This would be handled by a database trigger in production
    this.searchVector = searchableText;
  }

  toPublicJSON(): Partial<Resource> {
    const { 
      createdBy, 
      updatedBy, 
      deletedBy, 
      deletedAt, 
      version,
      searchVector,
      ...publicData 
    } = this;
    
    return publicData;
  }
}