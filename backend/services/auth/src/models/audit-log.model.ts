import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { User } from './user.model';

export enum AuditAction {
  // Authentication
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  REGISTER = 'REGISTER',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',
  
  // Password
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_SUCCESS = 'PASSWORD_RESET_SUCCESS',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  
  // Token
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  
  // Profile
  PROFILE_UPDATED = 'PROFILE_UPDATED',
  PROFILE_DELETED = 'PROFILE_DELETED',
  
  // 2FA
  TWO_FA_ENABLED = 'TWO_FA_ENABLED',
  TWO_FA_DISABLED = 'TWO_FA_DISABLED',
  TWO_FA_VERIFIED = 'TWO_FA_VERIFIED',
  TWO_FA_FAILED = 'TWO_FA_FAILED',
  
  // Security
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  
  // Admin
  USER_SUSPENDED = 'USER_SUSPENDED',
  USER_ACTIVATED = 'USER_ACTIVATED',
  ROLE_CHANGED = 'ROLE_CHANGED'
}

export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

@Entity('audit_logs')
@Index(['userId', 'createdAt'])
@Index(['action', 'createdAt'])
@Index(['severity'])
@Index(['ipAddress'])
@Index(['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @ManyToOne(() => User, user => user.auditLogs, { 
    nullable: true,
    onDelete: 'SET NULL' 
  })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({
    type: 'enum',
    enum: AuditAction
  })
  action!: AuditAction;

  @Column({
    type: 'enum',
    enum: AuditSeverity,
    default: AuditSeverity.INFO
  })
  severity!: AuditSeverity;

  @Column({ type: 'varchar', length: 45 })
  ipAddress!: string;

  @Column({ type: 'varchar', length: 255 })
  userAgent!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  fingerprint?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  resource?: string; // Resource being accessed

  @Column({ type: 'varchar', length: 10, nullable: true })
  method?: string; // HTTP method

  @Column({ type: 'int', nullable: true })
  statusCode?: number; // Response status code

  @Column({ type: 'text', nullable: true })
  message?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  requestData?: Record<string, any>; // Sanitized request data

  @Column({ type: 'jsonb', nullable: true })
  responseData?: Record<string, any>; // Sanitized response data

  @Column({ type: 'text', nullable: true })
  errorStack?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  correlationId?: string;

  @Column({ type: 'int', nullable: true })
  duration?: number; // Request duration in ms

  @Column({ type: 'jsonb', nullable: true })
  geoLocation?: {
    country?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  deviceInfo?: {
    type?: string; // mobile, tablet, desktop
    browser?: string;
    browserVersion?: string;
    os?: string;
    osVersion?: string;
  };

  @Column({ type: 'boolean', default: false })
  isAnomaly!: boolean; // Flag for anomalous behavior

  @CreateDateColumn()
  createdAt!: Date;

  // Methods
  static createAuditLog(params: {
    userId?: string;
    action: AuditAction;
    severity?: AuditSeverity;
    ipAddress: string;
    userAgent: string;
    fingerprint?: string;
    resource?: string;
    method?: string;
    statusCode?: number;
    message?: string;
    metadata?: Record<string, any>;
    requestData?: Record<string, any>;
    responseData?: Record<string, any>;
    errorStack?: string;
    correlationId?: string;
    duration?: number;
  }): AuditLog {
    const log = new AuditLog();
    
    log.userId = params.userId;
    log.action = params.action;
    log.severity = params.severity || this.determineSeverity(params.action);
    log.ipAddress = params.ipAddress;
    log.userAgent = params.userAgent;
    log.fingerprint = params.fingerprint;
    log.resource = params.resource;
    log.method = params.method;
    log.statusCode = params.statusCode;
    log.message = params.message;
    log.metadata = params.metadata;
    log.requestData = this.sanitizeData(params.requestData);
    log.responseData = this.sanitizeData(params.responseData);
    log.errorStack = params.errorStack;
    log.correlationId = params.correlationId;
    log.duration = params.duration;
    
    // Check for anomalies
    log.isAnomaly = this.detectAnomaly(params);
    
    return log;
  }

  private static determineSeverity(action: AuditAction): AuditSeverity {
    const criticalActions = [
      AuditAction.ACCOUNT_LOCKED,
      AuditAction.SUSPICIOUS_ACTIVITY,
      AuditAction.PERMISSION_DENIED
    ];
    
    const warningActions = [
      AuditAction.LOGIN_FAILED,
      AuditAction.TWO_FA_FAILED,
      AuditAction.TOKEN_REVOKED
    ];
    
    const errorActions = [
      AuditAction.USER_SUSPENDED
    ];
    
    if (criticalActions.includes(action)) {
      return AuditSeverity.CRITICAL;
    } else if (errorActions.includes(action)) {
      return AuditSeverity.ERROR;
    } else if (warningActions.includes(action)) {
      return AuditSeverity.WARNING;
    } else {
      return AuditSeverity.INFO;
    }
  }

  private static sanitizeData(data: any): any {
    if (!data) return data;
    
    const sensitiveKeys = [
      'password', 'token', 'secret', 'apiKey', 
      'authorization', 'cookie', 'creditCard'
    ];
    
    const sanitized = { ...data };
    
    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sensitive => 
        key.toLowerCase().includes(sensitive.toLowerCase())
      )) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }
    
    return sanitized;
  }

  private static detectAnomaly(params: any): boolean {
    // Detect potential anomalies
    
    // Multiple failed logins
    if (params.action === AuditAction.LOGIN_FAILED && 
        params.metadata?.attemptCount > 3) {
      return true;
    }
    
    // Suspicious user agent
    const suspiciousAgents = ['curl', 'wget', 'python', 'scrapy'];
    if (params.userAgent && 
        suspiciousAgents.some(agent => 
          params.userAgent.toLowerCase().includes(agent)
        )) {
      return true;
    }
    
    // Unusual status codes
    if (params.statusCode && 
        (params.statusCode === 403 || params.statusCode === 401)) {
      return true;
    }
    
    // Long request duration
    if (params.duration && params.duration > 5000) {
      return true;
    }
    
    return false;
  }
}