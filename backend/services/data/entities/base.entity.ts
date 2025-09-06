import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
  BeforeInsert,
  BeforeUpdate,
  Index,
  VersionColumn,
} from 'typeorm';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Audit trail fields
  @CreateDateColumn({ 
    type: 'timestamptz',
    name: 'created_at',
  })
  @Index('idx_created_at')
  createdAt: Date;

  @UpdateDateColumn({ 
    type: 'timestamptz',
    name: 'updated_at',
  })
  @Index('idx_updated_at')
  updatedAt: Date;

  // Soft delete support for GDPR compliance
  @DeleteDateColumn({ 
    type: 'timestamptz',
    name: 'deleted_at',
    nullable: true,
  })
  @Index('idx_deleted_at')
  deletedAt?: Date;

  // User tracking for audit trail
  @Column({ 
    name: 'created_by',
    nullable: true,
    type: 'uuid',
  })
  @Index('idx_created_by')
  createdBy?: string;

  @Column({ 
    name: 'updated_by',
    nullable: true,
    type: 'uuid',
  })
  @Index('idx_updated_by')
  updatedBy?: string;

  @Column({ 
    name: 'deleted_by',
    nullable: true,
    type: 'uuid',
  })
  @Index('idx_deleted_by')
  deletedBy?: string;

  // Multi-tenancy support
  @Column({ 
    name: 'tenant_id',
    nullable: true,
    type: 'uuid',
  })
  @Index('idx_tenant_id')
  tenantId?: string;

  // Optimistic locking
  @VersionColumn({
    name: 'version',
    default: 1,
  })
  version: number;

  // Metadata for additional context
  @Column({ 
    type: 'jsonb',
    nullable: true,
    default: '{}',
  })
  metadata?: Record<string, any>;

  // ETags for HTTP caching
  @Column({ 
    name: 'etag',
    nullable: true,
    length: 128,
  })
  @Index('idx_etag')
  etag?: string;

  // Lifecycle hooks
  @BeforeInsert()
  beforeInsert(): void {
    this.generateETag();
  }

  @BeforeUpdate()
  beforeUpdate(): void {
    this.generateETag();
  }

  private generateETag(): void {
    const crypto = require('crypto');
    const content = JSON.stringify({
      id: this.id,
      version: this.version,
      updatedAt: this.updatedAt || new Date(),
    });
    this.etag = crypto.createHash('md5').update(content).digest('hex');
  }

  // Helper methods
  isDeleted(): boolean {
    return !!this.deletedAt;
  }

  belongsToTenant(tenantId: string): boolean {
    return this.tenantId === tenantId;
  }

  toJSON(): any {
    const { deletedAt, deletedBy, version, ...rest } = this;
    return rest;
  }
}

export interface AuditableEntity {
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
  deletedBy?: string;
  version: number;
}

export interface TenantAwareEntity {
  tenantId?: string;
}

export interface SoftDeletableEntity {
  deletedAt?: Date;
  deletedBy?: string;
}

export interface CacheableEntity {
  etag?: string;
}