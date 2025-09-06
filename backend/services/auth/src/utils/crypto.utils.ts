import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { promisify } from 'util';

const randomBytes = promisify(crypto.randomBytes);
const pbkdf2 = promisify(crypto.pbkdf2);

/**
 * Security utility functions following OWASP best practices
 */
export class CryptoUtils {
  private static readonly SALT_LENGTH = 32;
  private static readonly KEY_LENGTH = 64;
  private static readonly ITERATIONS = 100000;
  private static readonly DIGEST = 'sha512';

  /**
   * Generate cryptographically secure random token
   * @param length Token length in bytes
   */
  static async generateSecureToken(length: number = 32): Promise<string> {
    const buffer = await randomBytes(length);
    return buffer.toString('hex');
  }

  /**
   * Generate secure random string for session IDs
   */
  static async generateSessionId(): Promise<string> {
    const buffer = await randomBytes(32);
    return buffer.toString('base64url');
  }

  /**
   * Hash password using bcrypt with configurable rounds
   * OWASP recommends minimum 10 rounds, we use 14 for production
   */
  static async hashPassword(password: string, rounds: number = 14): Promise<string> {
    if (!password || password.length === 0) {
      throw new Error('Password cannot be empty');
    }
    return bcrypt.hash(password, rounds);
  }

  /**
   * Verify password against hash using timing-safe comparison
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }
    return bcrypt.compare(password, hash);
  }

  /**
   * Timing-safe string comparison to prevent timing attacks
   */
  static timingSafeEqual(a: string, b: string): boolean {
    if (typeof a !== 'string' || typeof b !== 'string') {
      return false;
    }
    
    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);
    
    if (bufferA.length !== bufferB.length) {
      // Still perform comparison to maintain constant time
      crypto.timingSafeEqual(bufferA, Buffer.alloc(bufferA.length));
      return false;
    }
    
    return crypto.timingSafeEqual(bufferA, bufferB);
  }

  /**
   * Generate HMAC signature for data integrity
   */
  static generateHMAC(data: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  static verifyHMAC(data: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateHMAC(data, secret);
    return this.timingSafeEqual(signature, expectedSignature);
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   */
  static encrypt(text: string, key: string): { encrypted: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Decrypt data encrypted with AES-256-GCM
   */
  static decrypt(encryptedData: { encrypted: string; iv: string; authTag: string }, key: string): string {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(key, 'hex'),
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Derive encryption key from password using PBKDF2
   */
  static async deriveKey(password: string, salt: string): Promise<string> {
    const key = await pbkdf2(
      password,
      salt,
      this.ITERATIONS,
      this.KEY_LENGTH,
      this.DIGEST
    );
    return key.toString('hex');
  }

  /**
   * Generate salt for key derivation
   */
  static async generateSalt(): Promise<string> {
    const buffer = await randomBytes(this.SALT_LENGTH);
    return buffer.toString('hex');
  }

  /**
   * Hash sensitive data for storage (e.g., API keys)
   */
  static hashData(data: string): string {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  /**
   * Generate fingerprint for device/browser identification
   */
  static generateFingerprint(userAgent: string, ipAddress: string, acceptHeaders: string): string {
    const data = `${userAgent}|${ipAddress}|${acceptHeaders}`;
    return this.hashData(data);
  }

  /**
   * Constant-time integer comparison
   */
  static constantTimeCompare(a: number, b: number): boolean {
    let result = 0;
    result |= a ^ b;
    return result === 0;
  }

  /**
   * Mask sensitive data for logging
   */
  static maskSensitiveData(data: string, visibleChars: number = 4): string {
    if (data.length <= visibleChars * 2) {
      return '*'.repeat(data.length);
    }
    const start = data.substring(0, visibleChars);
    const end = data.substring(data.length - visibleChars);
    const masked = '*'.repeat(Math.max(data.length - visibleChars * 2, 4));
    return `${start}${masked}${end}`;
  }

  /**
   * Generate OTP secret for 2FA
   */
  static async generateOTPSecret(): Promise<string> {
    const buffer = await randomBytes(20);
    return buffer.toString('base32').replace(/=/g, '');
  }

  /**
   * Generate secure nonce for CSP
   */
  static generateNonce(): string {
    return crypto.randomBytes(16).toString('base64');
  }

  /**
   * Validate entropy of a password
   */
  static calculatePasswordEntropy(password: string): number {
    const charsets = {
      lowercase: /[a-z]/,
      uppercase: /[A-Z]/,
      numbers: /[0-9]/,
      special: /[^a-zA-Z0-9]/
    };

    let poolSize = 0;
    if (charsets.lowercase.test(password)) poolSize += 26;
    if (charsets.uppercase.test(password)) poolSize += 26;
    if (charsets.numbers.test(password)) poolSize += 10;
    if (charsets.special.test(password)) poolSize += 32;

    const entropy = password.length * Math.log2(poolSize);
    return Math.round(entropy);
  }
}