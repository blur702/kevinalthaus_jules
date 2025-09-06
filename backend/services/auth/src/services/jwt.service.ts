import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { CryptoUtils } from '../utils/crypto.utils';
import { logger } from '../utils/logger.utils';
import { SecurityEventType } from '../utils/logger.utils';

const signAsync = promisify(jwt.sign);
const verifyAsync = promisify(jwt.verify);

export interface TokenPayload {
  sub: string; // User ID
  email: string;
  role: string;
  sessionId: string;
  fingerprint: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
  jti?: string; // JWT ID for tracking
}

export interface RefreshTokenPayload extends TokenPayload {
  family: string;
  generation: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface DecodedToken {
  payload: TokenPayload;
  header: jwt.JwtHeader;
}

/**
 * JWT Service with RS256 signing following OWASP best practices
 */
export class JWTService {
  private privateKey: string;
  private publicKey: string;
  private privateKeyPassphrase: string;
  private issuer: string;
  private audience: string | string[];
  private accessTokenTTL: string;
  private refreshTokenTTL: string;
  private tokenBlacklist: Set<string> = new Set();

  constructor() {
    this.loadKeys();
    this.issuer = process.env.JWT_ISSUER || 'auth-service';
    this.audience = process.env.JWT_AUDIENCE?.split(',') || 'api-gateway';
    this.accessTokenTTL = process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m';
    this.refreshTokenTTL = process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d';
    this.privateKeyPassphrase = process.env.JWT_KEY_PASSPHRASE || 'change-this-passphrase-in-production';
  }

  /**
   * Load RSA keys from filesystem
   */
  private loadKeys(): void {
    try {
      const keysDir = path.join(__dirname, '..', '..', 'keys');
      
      this.privateKey = fs.readFileSync(
        path.join(keysDir, 'private.key'),
        'utf8'
      );
      
      this.publicKey = fs.readFileSync(
        path.join(keysDir, 'public.key'),
        'utf8'
      );
      
      logger.info('JWT keys loaded successfully');
    } catch (error) {
      logger.error('Failed to load JWT keys', error);
      throw new Error('JWT service initialization failed: Keys not found');
    }
  }

  /**
   * Generate access token with RS256 signing
   */
  async generateAccessToken(payload: TokenPayload): Promise<string> {
    try {
      const jwtId = await CryptoUtils.generateSecureToken(16);
      
      const token = await signAsync(
        {
          ...payload,
          jti: jwtId,
          type: 'access'
        },
        {
          key: this.privateKey,
          passphrase: this.privateKeyPassphrase
        },
        {
          algorithm: 'RS256',
          expiresIn: this.accessTokenTTL,
          issuer: this.issuer,
          audience: this.audience,
          notBefore: 0
        }
      ) as string;

      logger.info('Access token generated', {
        userId: payload.sub,
        jti: jwtId,
        fingerprint: CryptoUtils.maskSensitiveData(payload.fingerprint)
      });

      return token;
    } catch (error) {
      logger.error('Failed to generate access token', error);
      throw new Error('Token generation failed');
    }
  }

  /**
   * Generate refresh token with family tracking
   */
  async generateRefreshToken(
    payload: TokenPayload,
    family?: string,
    generation: number = 0
  ): Promise<{ token: string; family: string }> {
    try {
      const tokenFamily = family || await CryptoUtils.generateSecureToken(16);
      const jwtId = await CryptoUtils.generateSecureToken(16);
      
      const refreshPayload: RefreshTokenPayload = {
        ...payload,
        family: tokenFamily,
        generation,
        jti: jwtId,
        type: 'refresh'
      };

      const token = await signAsync(
        refreshPayload,
        {
          key: this.privateKey,
          passphrase: this.privateKeyPassphrase
        },
        {
          algorithm: 'RS256',
          expiresIn: this.refreshTokenTTL,
          issuer: this.issuer,
          audience: this.audience,
          notBefore: 0
        }
      ) as string;

      logger.info('Refresh token generated', {
        userId: payload.sub,
        family: tokenFamily,
        generation,
        jti: jwtId
      });

      return { token, family: tokenFamily };
    } catch (error) {
      logger.error('Failed to generate refresh token', error);
      throw new Error('Refresh token generation failed');
    }
  }

  /**
   * Generate token pair (access + refresh)
   */
  async generateTokenPair(
    payload: TokenPayload,
    family?: string
  ): Promise<TokenPair> {
    const [accessToken, refreshTokenResult] = await Promise.all([
      this.generateAccessToken(payload),
      this.generateRefreshToken(payload, family)
    ]);

    return {
      accessToken,
      refreshToken: refreshTokenResult.token,
      expiresIn: this.parseExpiresIn(this.accessTokenTTL),
      tokenType: 'Bearer'
    };
  }

  /**
   * Verify and decode token
   */
  async verifyToken(
    token: string,
    options?: jwt.VerifyOptions
  ): Promise<DecodedToken> {
    try {
      // Check if token is blacklisted
      if (this.isTokenBlacklisted(token)) {
        throw new Error('Token has been revoked');
      }

      const decoded = await verifyAsync(
        token,
        this.publicKey,
        {
          algorithms: ['RS256'],
          issuer: this.issuer,
          audience: this.audience,
          clockTolerance: 30, // 30 seconds clock skew tolerance
          ...options
        }
      ) as TokenPayload;

      const header = this.decodeHeader(token);

      // Additional security checks
      this.performSecurityChecks(decoded, header);

      return {
        payload: decoded,
        header
      };
    } catch (error: any) {
      logger.logSecurityEvent({
        type: SecurityEventType.INVALID_TOKEN,
        ipAddress: '0.0.0.0', // Should be passed from request
        userAgent: 'unknown',
        details: {
          error: error.message,
          token: CryptoUtils.maskSensitiveData(token)
        }
      });

      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else if (error.name === 'NotBeforeError') {
        throw new Error('Token not yet valid');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Decode token without verification (for getting claims from expired tokens)
   */
  decodeToken(token: string): DecodedToken | null {
    try {
      const decoded = jwt.decode(token, { complete: true });
      
      if (!decoded) {
        return null;
      }

      return {
        payload: decoded.payload as TokenPayload,
        header: decoded.header
      };
    } catch {
      return null;
    }
  }

  /**
   * Decode JWT header
   */
  private decodeHeader(token: string): jwt.JwtHeader {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const header = JSON.parse(
      Buffer.from(parts[0], 'base64').toString('utf8')
    );

    return header;
  }

  /**
   * Perform additional security checks on decoded token
   */
  private performSecurityChecks(payload: TokenPayload, header: jwt.JwtHeader): void {
    // Check algorithm
    if (header.alg !== 'RS256') {
      throw new Error('Invalid token algorithm');
    }

    // Check required claims
    if (!payload.sub || !payload.email || !payload.sessionId) {
      throw new Error('Missing required token claims');
    }

    // Check token type for specific operations
    const tokenType = (payload as any).type;
    if (tokenType && !['access', 'refresh'].includes(tokenType)) {
      throw new Error('Invalid token type');
    }

    // Check for token replay (would need Redis for proper implementation)
    if (payload.jti && this.hasTokenBeenUsed(payload.jti)) {
      throw new Error('Token replay detected');
    }
  }

  /**
   * Check if token has been used (for one-time tokens)
   */
  private hasTokenBeenUsed(jti: string): boolean {
    // This would check against Redis or database
    // Simplified for demonstration
    return false;
  }

  /**
   * Rotate refresh token (for refresh token rotation)
   */
  async rotateRefreshToken(
    currentToken: string,
    newPayload: TokenPayload
  ): Promise<TokenPair> {
    try {
      const decoded = await this.verifyToken(currentToken);
      const refreshPayload = decoded.payload as RefreshTokenPayload;

      // Check if this is a refresh token
      if ((refreshPayload as any).type !== 'refresh') {
        throw new Error('Not a refresh token');
      }

      // Invalidate current token family if suspicious
      if (this.isTokenFamilyCompromised(refreshPayload.family)) {
        logger.logSecurityEvent({
          type: SecurityEventType.SUSPICIOUS_ACTIVITY,
          userId: refreshPayload.sub,
          email: refreshPayload.email,
          ipAddress: '0.0.0.0',
          userAgent: 'unknown',
          details: {
            reason: 'Refresh token family compromised',
            family: refreshPayload.family
          }
        });
        
        throw new Error('Token family has been compromised');
      }

      // Generate new token pair with incremented generation
      const newTokenPair = await this.generateTokenPair(
        newPayload,
        refreshPayload.family
      );

      // Blacklist the old refresh token
      this.blacklistToken(currentToken);

      logger.info('Refresh token rotated', {
        userId: newPayload.sub,
        family: refreshPayload.family,
        oldGeneration: refreshPayload.generation,
        newGeneration: refreshPayload.generation + 1
      });

      return newTokenPair;
    } catch (error) {
      logger.error('Failed to rotate refresh token', error);
      throw error;
    }
  }

  /**
   * Check if token family is compromised
   */
  private isTokenFamilyCompromised(family: string): boolean {
    // This would check against database for family compromise
    // Simplified for demonstration
    return false;
  }

  /**
   * Blacklist a token
   */
  blacklistToken(token: string): void {
    const decoded = this.decodeToken(token);
    
    if (decoded?.payload.jti) {
      this.tokenBlacklist.add(decoded.payload.jti);
      
      // In production, this would be stored in Redis with TTL
      logger.logSecurityEvent({
        type: SecurityEventType.TOKEN_REVOKED,
        userId: decoded.payload.sub,
        email: decoded.payload.email,
        ipAddress: '0.0.0.0',
        userAgent: 'unknown',
        details: {
          jti: decoded.payload.jti,
          type: (decoded.payload as any).type
        }
      });
    }
  }

  /**
   * Check if token is blacklisted
   */
  private isTokenBlacklisted(token: string): boolean {
    const decoded = this.decodeToken(token);
    
    if (decoded?.payload.jti) {
      return this.tokenBlacklist.has(decoded.payload.jti);
    }
    
    return false;
  }

  /**
   * Invalidate all tokens for a user
   */
  async invalidateUserTokens(userId: string): Promise<void> {
    // This would invalidate all tokens in Redis/database
    logger.audit('USER_TOKENS_INVALIDATED', userId, {
      timestamp: new Date()
    });
  }

  /**
   * Parse expires in string to seconds
   */
  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    
    if (!match) {
      return 900; // Default 15 minutes
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900;
    }
  }

  /**
   * Generate JWT key fingerprint for key rotation tracking
   */
  getKeyFingerprint(): string {
    return CryptoUtils.hashData(this.publicKey).substring(0, 16);
  }

  /**
   * Validate token binding (for token binding security)
   */
  validateTokenBinding(token: DecodedToken, fingerprint: string): boolean {
    return CryptoUtils.timingSafeEqual(
      token.payload.fingerprint,
      fingerprint
    );
  }
}