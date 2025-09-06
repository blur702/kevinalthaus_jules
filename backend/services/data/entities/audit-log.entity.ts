import { Entity, Column, Index, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  SOFT_DELETE = 'SOFT_DELETE',
  RESTORE = 'RESTORE',
  BULK_CREATE = 'BULK_CREATE',
  BULK_UPDATE = 'BULK_UPDATE',
  BULK_DELETE = 'BULK_DELETE',
}

@Entity('audit_logs')
@Index('idx_audit_entity', ['entityName', 'entityId'])
@Index('idx_audit_action', ['action'])
@Index('idx_audit_user', ['userId'])
@Index('idx_audit_tenant', ['tenantId'])
@Index('idx_audit_timestamp', ['timestamp'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'entity_name',
    length: 100,
  })
  entityName: string;

  @Column({
    name: 'entity_id',
    type: 'uuid',
  })
  entityId: string;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({
    name: 'old_values',
    type: 'jsonb',
    nullable: true,
  })
  oldValues?: Record<string, any>;

  @Column({
    name: 'new_values',
    type: 'jsonb',
    nullable: true,
  })
  newValues?: Record<string, any>;

  @Column({
    name: 'changed_fields',
    type: 'text',
    array: true,
    nullable: true,
  })
  changedFields?: string[];

  @Column({
    name: 'user_id',
    type: 'uuid',
    nullable: true,
  })
  userId?: string;

  @Column({
    name: 'tenant_id',
    type: 'uuid',
    nullable: true,
  })
  tenantId?: string;

  @Column({
    name: 'ip_address',
    length: 45,
    nullable: true,
  })
  ipAddress?: string;

  @Column({
    name: 'user_agent',
    type: 'text',
    nullable: true,
  })
  userAgent?: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    default: '{}',
  })
  metadata?: Record<string, any>;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  timestamp: Date;

  static create(params: {
    entityName: string;
    entityId: string;
    action: AuditAction;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    userId?: string;
    tenantId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): AuditLog {
    const auditLog = new AuditLog();
    
    auditLog.entityName = params.entityName;
    auditLog.entityId = params.entityId;
    auditLog.action = params.action;
    auditLog.oldValues = params.oldValues;
    auditLog.newValues = params.newValues;
    auditLog.userId = params.userId;
    auditLog.tenantId = params.tenantId;
    auditLog.ipAddress = params.ipAddress;
    auditLog.userAgent = params.userAgent;
    auditLog.metadata = params.metadata;

    // Calculate changed fields
    if (params.oldValues && params.newValues) {
      auditLog.changedFields = AuditLog.getChangedFields(
        params.oldValues,
        params.newValues
      );
    }

    return auditLog;
  }

  private static getChangedFields(
    oldValues: Record<string, any>,
    newValues: Record<string, any>
  ): string[] {
    const changedFields: string[] = [];
    
    // Check for modified fields
    for (const [key, newValue] of Object.entries(newValues)) {
      if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValue)) {
        changedFields.push(key);
      }
    }

    // Check for deleted fields
    for (const key of Object.keys(oldValues)) {
      if (!(key in newValues)) {
        changedFields.push(key);
      }
    }

    return changedFields;
  }
}