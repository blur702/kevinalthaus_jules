import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { User } from './user.model';

@Entity('refresh_tokens')
@Index(['token'], { unique: true })
@Index(['userId', 'isRevoked'])
@Index(['expiresAt'])
@Index(['family'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 512, unique: true })
  token!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, user => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'varchar', length: 255 })
  family!: string; // Token family for rotation detection

  @Column({ type: 'int', default: 0 })
  generation!: number; // Generation within family

  @Column({ type: 'varchar', length: 45 })
  ipAddress!: string;

  @Column({ type: 'varchar', length: 255 })
  userAgent!: string;

  @Column({ type: 'varchar', length: 64 })
  fingerprint!: string;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @Column({ type: 'boolean', default: false })
  isRevoked!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt?: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  revokedReason?: string;

  @Column({ type: 'uuid', nullable: true })
  replacedBy?: string; // ID of the token that replaced this one

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt?: Date;

  @Column({ type: 'int', default: 0 })
  useCount!: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    browser?: string;
    os?: string;
    device?: string;
    location?: {
      country?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
    };
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Methods
  isExpired(): boolean {
    return this.expiresAt < new Date();
  }

  isValid(): boolean {
    return !this.isRevoked && !this.isExpired();
  }

  revoke(reason: string = 'manual'): void {
    this.isRevoked = true;
    this.revokedAt = new Date();
    this.revokedReason = reason;
  }

  markAsUsed(): void {
    this.lastUsedAt = new Date();
    this.useCount++;
  }

  // Check if token has been used suspiciously
  isSuspicious(): boolean {
    // Token used more than once per minute on average
    if (this.useCount > 0 && this.lastUsedAt) {
      const minutesSinceCreation = 
        (this.lastUsedAt.getTime() - this.createdAt.getTime()) / (1000 * 60);
      
      if (this.useCount / minutesSinceCreation > 1) {
        return true;
      }
    }

    // Token used after being replaced
    if (this.replacedBy && this.lastUsedAt && 
        this.lastUsedAt > this.updatedAt) {
      return true;
    }

    return false;
  }
}