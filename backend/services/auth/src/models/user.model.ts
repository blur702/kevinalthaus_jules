import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
  OneToMany
} from 'typeorm';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { CryptoUtils } from '../utils/crypto.utils';
import { RefreshToken } from './refresh-token.model';
import { AuditLog } from './audit-log.model';
import { LoginAttempt } from './login-attempt.model';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator'
}

export enum UserStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  LOCKED = 'locked',
  DELETED = 'deleted'
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['username'], { unique: true })
@Index(['status'])
@Index(['createdAt'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  @IsNotEmpty()
  username!: string;

  @Column({ type: 'varchar', length: 254, unique: true })
  @IsEmail()
  email!: string;

  @Column({ type: 'varchar', length: 255, select: false })
  @MinLength(12)
  password!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  firstName?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lastName?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER
  })
  role!: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING
  })
  status!: UserStatus;

  @Column({ type: 'boolean', default: false })
  emailVerified!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  emailVerifiedAt?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  emailVerificationToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  emailVerificationExpires?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  passwordResetToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetExpires?: Date;

  @Column({ type: 'boolean', default: false })
  twoFactorEnabled!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  twoFactorSecret?: string;

  @Column({ type: 'text', nullable: true, select: false })
  twoFactorRecoveryCodes?: string;

  @Column({ type: 'int', default: 0 })
  failedLoginAttempts!: number;

  @Column({ type: 'timestamp', nullable: true })
  lastFailedLoginAttempt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lockoutUntil?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ type: 'varchar', length: 45, nullable: true })
  lastLoginIp?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  lastLoginUserAgent?: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  lastLoginFingerprint?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  preferences?: {
    language?: string;
    timezone?: string;
    notifications?: {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
    };
  };

  @Column({ type: 'jsonb', nullable: true })
  securitySettings?: {
    allowedIps?: string[];
    trustedDevices?: Array<{
      fingerprint: string;
      name: string;
      lastUsed: Date;
    }>;
    sessionTimeout?: number;
    requirePasswordChange?: boolean;
    passwordChangedAt?: Date;
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date;

  // Relations
  @OneToMany(() => RefreshToken, token => token.user)
  refreshTokens?: RefreshToken[];

  @OneToMany(() => AuditLog, log => log.user)
  auditLogs?: AuditLog[];

  @OneToMany(() => LoginAttempt, attempt => attempt.user)
  loginAttempts?: LoginAttempt[];

  // Hooks
  @BeforeInsert()
  @BeforeUpdate()
  async sanitize() {
    if (this.email) {
      this.email = this.email.toLowerCase().trim();
    }
    if (this.username) {
      this.username = this.username.toLowerCase().trim();
    }
  }

  // Methods
  async comparePassword(candidatePassword: string): Promise<boolean> {
    return CryptoUtils.verifyPassword(candidatePassword, this.password);
  }

  isLocked(): boolean {
    return this.status === UserStatus.LOCKED || 
           (this.lockoutUntil !== null && this.lockoutUntil > new Date());
  }

  canLogin(): boolean {
    return this.status === UserStatus.ACTIVE && 
           !this.isLocked() && 
           this.emailVerified;
  }

  incrementFailedAttempts(): void {
    this.failedLoginAttempts++;
    this.lastFailedLoginAttempt = new Date();
  }

  resetFailedAttempts(): void {
    this.failedLoginAttempts = 0;
    this.lastFailedLoginAttempt = undefined;
    this.lockoutUntil = undefined;
  }

  lockAccount(durationMinutes: number = 30): void {
    const lockoutUntil = new Date();
    lockoutUntil.setMinutes(lockoutUntil.getMinutes() + durationMinutes);
    this.lockoutUntil = lockoutUntil;
  }

  updateLastLogin(ip: string, userAgent: string, fingerprint: string): void {
    this.lastLoginAt = new Date();
    this.lastLoginIp = ip;
    this.lastLoginUserAgent = userAgent;
    this.lastLoginFingerprint = fingerprint;
  }

  toJSON(): Partial<User> {
    const { 
      password, 
      emailVerificationToken,
      passwordResetToken,
      twoFactorSecret,
      twoFactorRecoveryCodes,
      ...user 
    } = this;
    
    return user;
  }

  // Security checks
  requiresPasswordChange(): boolean {
    if (!this.securitySettings?.passwordChangedAt) {
      return true;
    }
    
    const daysSinceChange = 
      (Date.now() - new Date(this.securitySettings.passwordChangedAt).getTime()) / 
      (1000 * 60 * 60 * 24);
    
    // Require password change every 90 days
    return daysSinceChange > 90;
  }

  isTrustedDevice(fingerprint: string): boolean {
    if (!this.securitySettings?.trustedDevices) {
      return false;
    }
    
    return this.securitySettings.trustedDevices.some(
      device => device.fingerprint === fingerprint
    );
  }

  addTrustedDevice(fingerprint: string, name: string): void {
    if (!this.securitySettings) {
      this.securitySettings = {};
    }
    
    if (!this.securitySettings.trustedDevices) {
      this.securitySettings.trustedDevices = [];
    }
    
    // Remove old device if exists
    this.securitySettings.trustedDevices = this.securitySettings.trustedDevices.filter(
      device => device.fingerprint !== fingerprint
    );
    
    // Add new device
    this.securitySettings.trustedDevices.push({
      fingerprint,
      name,
      lastUsed: new Date()
    });
    
    // Keep only last 10 trusted devices
    if (this.securitySettings.trustedDevices.length > 10) {
      this.securitySettings.trustedDevices = this.securitySettings.trustedDevices
        .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime())
        .slice(0, 10);
    }
  }

  isIpAllowed(ip: string): boolean {
    if (!this.securitySettings?.allowedIps || 
        this.securitySettings.allowedIps.length === 0) {
      return true; // No IP restrictions
    }
    
    return this.securitySettings.allowedIps.includes(ip);
  }
}