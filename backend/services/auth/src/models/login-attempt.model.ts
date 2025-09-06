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

export enum LoginAttemptStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  BLOCKED = 'blocked',
  RATE_LIMITED = 'rate_limited'
}

@Entity('login_attempts')
@Index(['userId', 'createdAt'])
@Index(['ipAddress', 'createdAt'])
@Index(['email', 'createdAt'])
@Index(['status', 'createdAt'])
@Index(['createdAt'])
export class LoginAttempt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @ManyToOne(() => User, user => user.loginAttempts, { 
    nullable: true,
    onDelete: 'CASCADE' 
  })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'varchar', length: 254 })
  email!: string;

  @Column({
    type: 'enum',
    enum: LoginAttemptStatus
  })
  status!: LoginAttemptStatus;

  @Column({ type: 'varchar', length: 45 })
  ipAddress!: string;

  @Column({ type: 'varchar', length: 255 })
  userAgent!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  fingerprint?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  failureReason?: string;

  @Column({ type: 'boolean', default: false })
  usedTwoFactor!: boolean;

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
    riskScore?: number;
    suspiciousIndicators?: string[];
  };

  @CreateDateColumn()
  createdAt!: Date;

  // Static methods for tracking
  static async getRecentAttempts(
    identifier: { email?: string; ipAddress?: string; userId?: string },
    minutes: number = 15
  ): Promise<number> {
    // This would be implemented with repository
    // Placeholder for type definition
    return 0;
  }

  static isRateLimited(
    attemptCount: number,
    maxAttempts: number = 5,
    windowMinutes: number = 15
  ): boolean {
    return attemptCount >= maxAttempts;
  }

  static calculateRiskScore(params: {
    ipAddress: string;
    userAgent: string;
    fingerprint?: string;
    previousAttempts?: LoginAttempt[];
  }): number {
    let score = 0;

    // Check for suspicious user agents
    const suspiciousAgents = ['curl', 'wget', 'python', 'bot', 'crawler'];
    if (params.userAgent && 
        suspiciousAgents.some(agent => 
          params.userAgent.toLowerCase().includes(agent)
        )) {
      score += 30;
    }

    // Check for rapid attempts
    if (params.previousAttempts && params.previousAttempts.length > 0) {
      const recentFailures = params.previousAttempts.filter(
        attempt => attempt.status === LoginAttemptStatus.FAILED
      ).length;
      
      if (recentFailures > 3) {
        score += 20 * recentFailures;
      }

      // Check for IP changes
      const uniqueIps = new Set(
        params.previousAttempts.map(a => a.ipAddress)
      );
      
      if (uniqueIps.size > 3) {
        score += 25;
      }
    }

    // Check for TOR exit nodes or known VPN IPs
    if (this.isKnownProxy(params.ipAddress)) {
      score += 40;
    }

    return Math.min(score, 100);
  }

  private static isKnownProxy(ipAddress: string): boolean {
    // This would check against a database of known proxy IPs
    // Simplified implementation
    const torExitNodes = ['127.0.0.1']; // Would be actual TOR exit nodes
    return torExitNodes.includes(ipAddress);
  }

  static getSuspiciousIndicators(params: {
    ipAddress: string;
    userAgent: string;
    fingerprint?: string;
    attemptHistory?: LoginAttempt[];
  }): string[] {
    const indicators: string[] = [];

    // Automated tool detection
    if (/curl|wget|python|postman/i.test(params.userAgent)) {
      indicators.push('automated_tool_detected');
    }

    // Missing common headers
    if (!params.fingerprint) {
      indicators.push('missing_device_fingerprint');
    }

    // Rapid attempts
    if (params.attemptHistory && params.attemptHistory.length > 5) {
      const timeWindow = 5 * 60 * 1000; // 5 minutes
      const now = Date.now();
      const rapidAttempts = params.attemptHistory.filter(
        attempt => now - attempt.createdAt.getTime() < timeWindow
      );
      
      if (rapidAttempts.length > 3) {
        indicators.push('rapid_login_attempts');
      }
    }

    // Geographic anomaly (would need GeoIP service)
    if (params.attemptHistory && params.attemptHistory.length > 0) {
      // Check for significant location changes
      indicators.push('geographic_anomaly');
    }

    return indicators;
  }
}