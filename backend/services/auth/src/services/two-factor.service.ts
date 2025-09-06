import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { CryptoUtils } from '../utils/crypto.utils';

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

/**
 * Two-Factor Authentication Service using TOTP
 * Following OWASP MFA guidelines
 */
export class TwoFactorService {
  private readonly issuer: string;
  private readonly algorithm: speakeasy.Algorithm;
  private readonly window: number;
  private readonly digits: number;
  private readonly period: number;

  constructor() {
    this.issuer = process.env.TOTP_ISSUER || 'AuthService';
    this.algorithm = (process.env.TOTP_ALGORITHM as speakeasy.Algorithm) || 'sha256';
    this.window = parseInt(process.env.TOTP_WINDOW || '2');
    this.digits = 6;
    this.period = 30;
  }

  /**
   * Generate TOTP secret for user
   */
  generateSecret(userEmail: string): speakeasy.GeneratedSecret {
    return speakeasy.generateSecret({
      name: `${this.issuer} (${userEmail})`,
      issuer: this.issuer,
      length: 32,
      symbols: false
    });
  }

  /**
   * Generate QR code for TOTP setup
   */
  async generateQRCode(secret: speakeasy.GeneratedSecret): Promise<string> {
    if (!secret.otpauth_url) {
      throw new Error('No OTP URL available');
    }

    return QRCode.toDataURL(secret.otpauth_url, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 256
    });
  }

  /**
   * Generate backup codes for account recovery
   */
  async generateBackupCodes(count: number = 10): Promise<string[]> {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const code = await CryptoUtils.generateSecureToken(4);
      codes.push(code.toUpperCase().match(/.{1,4}/g)?.join('-') || code);
    }
    
    return codes;
  }

  /**
   * Setup 2FA for a user
   */
  async setupTwoFactor(userEmail: string): Promise<TwoFactorSetup> {
    const secret = this.generateSecret(userEmail);
    const qrCode = await this.generateQRCode(secret);
    const backupCodes = await this.generateBackupCodes();

    return {
      secret: secret.base32,
      qrCode,
      backupCodes
    };
  }

  /**
   * Verify TOTP code
   */
  verifyTOTP(secret: string, token: string): boolean {
    try {
      return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        algorithm: this.algorithm,
        digits: this.digits,
        period: this.period,
        window: this.window
      });
    } catch {
      return false;
    }
  }

  /**
   * Generate current TOTP code (for testing)
   */
  generateTOTP(secret: string): string {
    return speakeasy.totp({
      secret,
      encoding: 'base32',
      algorithm: this.algorithm,
      digits: this.digits,
      period: this.period
    });
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(
    providedCode: string,
    hashedCodes: string[]
  ): Promise<{ isValid: boolean; usedCodeIndex?: number }> {
    const normalizedCode = providedCode.replace(/-/g, '').toUpperCase();
    
    for (let i = 0; i < hashedCodes.length; i++) {
      const isValid = await CryptoUtils.verifyPassword(normalizedCode, hashedCodes[i]);
      
      if (isValid) {
        return { isValid: true, usedCodeIndex: i };
      }
    }
    
    return { isValid: false };
  }

  /**
   * Hash backup codes for storage
   */
  async hashBackupCodes(codes: string[]): Promise<string[]> {
    const hashedCodes: string[] = [];
    
    for (const code of codes) {
      const normalizedCode = code.replace(/-/g, '').toUpperCase();
      const hashed = await CryptoUtils.hashPassword(normalizedCode, 10);
      hashedCodes.push(hashed);
    }
    
    return hashedCodes;
  }

  /**
   * Validate TOTP secret format
   */
  isValidSecret(secret: string): boolean {
    // Base32 validation
    const base32Regex = /^[A-Z2-7]+=*$/;
    return base32Regex.test(secret) && secret.length >= 32;
  }

  /**
   * Generate emergency access token
   */
  async generateEmergencyToken(): Promise<string> {
    // Generate a longer, more secure token for emergency access
    return CryptoUtils.generateSecureToken(32);
  }

  /**
   * Calculate time remaining until next TOTP period
   */
  getTimeRemaining(): number {
    const epoch = Math.floor(Date.now() / 1000);
    return this.period - (epoch % this.period);
  }

  /**
   * Get current TOTP period counter
   */
  getCurrentCounter(): number {
    return Math.floor(Date.now() / 1000 / this.period);
  }

  /**
   * Verify TOTP with specific counter (for testing edge cases)
   */
  verifyTOTPWithCounter(secret: string, token: string, counter: number): boolean {
    try {
      return speakeasy.totp.verifyDelta({
        secret,
        encoding: 'base32',
        token,
        algorithm: this.algorithm,
        digits: this.digits,
        period: this.period,
        counter
      }).delta !== undefined;
    } catch {
      return false;
    }
  }
}