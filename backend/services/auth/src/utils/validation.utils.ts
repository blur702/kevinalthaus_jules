import { CryptoUtils } from './crypto.utils';
import * as xss from 'xss';

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecial: boolean;
  minEntropy?: number;
  bannedPasswords?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Input validation utilities following OWASP guidelines
 */
export class ValidationUtils {
  private static readonly EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  private static readonly USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,32}$/;
  private static readonly PHONE_REGEX = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  private static readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  // Common weak passwords to check against
  private static readonly COMMON_PASSWORDS = [
    'password', '12345678', '123456789', 'qwerty', 'password123',
    'admin', 'letmein', 'welcome', 'monkey', '1234567890',
    'password1', 'password!', 'admin123', 'root', 'toor',
    'pass', 'test', 'guest', 'master', 'dragon', 'baseball',
    'football', 'letmein123', 'welcome123', 'abc123'
  ];

  /**
   * Validate email address format
   */
  static validateEmail(email: string): ValidationResult {
    const errors: string[] = [];
    
    if (!email) {
      errors.push('Email is required');
    } else {
      const trimmedEmail = email.trim().toLowerCase();
      
      if (trimmedEmail.length > 254) {
        errors.push('Email address is too long');
      }
      
      if (!this.EMAIL_REGEX.test(trimmedEmail)) {
        errors.push('Invalid email format');
      }
      
      // Check for SQL injection patterns
      if (this.containsSQLInjectionPatterns(trimmedEmail)) {
        errors.push('Email contains invalid characters');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate username format
   */
  static validateUsername(username: string): ValidationResult {
    const errors: string[] = [];
    
    if (!username) {
      errors.push('Username is required');
    } else {
      const trimmedUsername = username.trim();
      
      if (!this.USERNAME_REGEX.test(trimmedUsername)) {
        errors.push('Username must be 3-32 characters and contain only letters, numbers, underscore, and hyphen');
      }
      
      // Check for reserved usernames
      const reserved = ['admin', 'root', 'administrator', 'system', 'api', 'test'];
      if (reserved.includes(trimmedUsername.toLowerCase())) {
        errors.push('This username is reserved');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate password strength according to policy
   */
  static validatePassword(password: string, policy: PasswordPolicy): ValidationResult {
    const errors: string[] = [];
    
    if (!password) {
      errors.push('Password is required');
      return { isValid: false, errors };
    }
    
    // Length check
    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`);
    }
    
    // Complexity checks
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (policy.requireNumbers && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (policy.requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    // Check entropy
    if (policy.minEntropy) {
      const entropy = CryptoUtils.calculatePasswordEntropy(password);
      if (entropy < policy.minEntropy) {
        errors.push(`Password is too weak (entropy: ${entropy}, required: ${policy.minEntropy})`);
      }
    }
    
    // Check against common passwords
    const lowerPassword = password.toLowerCase();
    if (this.COMMON_PASSWORDS.includes(lowerPassword)) {
      errors.push('Password is too common. Please choose a more unique password');
    }
    
    // Check for personal information patterns
    if (this.containsPersonalInfo(password)) {
      errors.push('Password should not contain personal information');
    }
    
    // Check against banned passwords
    if (policy.bannedPasswords?.some(banned => 
      password.toLowerCase().includes(banned.toLowerCase())
    )) {
      errors.push('Password contains banned words or phrases');
    }
    
    // Check for sequential or repeated characters
    if (this.hasSequentialChars(password) || this.hasRepeatedChars(password)) {
      errors.push('Password should not contain sequential or repeated characters');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check for sequential characters (abc, 123, etc.)
   */
  private static hasSequentialChars(password: string, maxSequence: number = 3): boolean {
    for (let i = 0; i < password.length - maxSequence + 1; i++) {
      let isSequential = true;
      for (let j = 0; j < maxSequence - 1; j++) {
        const charCode1 = password.charCodeAt(i + j);
        const charCode2 = password.charCodeAt(i + j + 1);
        if (charCode2 - charCode1 !== 1) {
          isSequential = false;
          break;
        }
      }
      if (isSequential) return true;
    }
    return false;
  }

  /**
   * Check for repeated characters (aaa, 111, etc.)
   */
  private static hasRepeatedChars(password: string, maxRepeat: number = 3): boolean {
    const regex = new RegExp(`(.)\\1{${maxRepeat - 1},}`);
    return regex.test(password);
  }

  /**
   * Check if password contains personal information patterns
   */
  private static containsPersonalInfo(password: string): boolean {
    const patterns = [
      /\d{4}[-\/]\d{2}[-\/]\d{2}/, // Date patterns
      /\d{2}[-\/]\d{2}[-\/]\d{4}/, // Date patterns
      /\d{3}-?\d{2}-?\d{4}/, // SSN pattern
      /\d{10,}/, // Long number sequences (phone numbers, etc.)
    ];
    
    return patterns.some(pattern => pattern.test(password));
  }

  /**
   * Validate phone number format
   */
  static validatePhoneNumber(phone: string): ValidationResult {
    const errors: string[] = [];
    
    if (!phone) {
      errors.push('Phone number is required');
    } else {
      const cleanedPhone = phone.replace(/\s/g, '');
      
      if (!this.PHONE_REGEX.test(cleanedPhone)) {
        errors.push('Invalid phone number format');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate UUID format
   */
  static validateUUID(uuid: string): boolean {
    return this.UUID_REGEX.test(uuid);
  }

  /**
   * Sanitize input to prevent XSS attacks
   */
  static sanitizeInput(input: string): string {
    if (!input) return '';
    
    // Use xss library for comprehensive sanitization
    return xss(input, {
      whiteList: {}, // No HTML tags allowed
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style']
    });
  }

  /**
   * Check for SQL injection patterns
   */
  static containsSQLInjectionPatterns(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|CREATE|ALTER|EXEC|EXECUTE|SCRIPT|JAVASCRIPT)\b)/i,
      /(--|#|\/\*|\*\/|@@|@|char|nchar|varchar|nvarchar|alter|begin|cast|create|cursor|declare|delete|drop|end|exec|execute|fetch|insert|kill|open|select|sys|sysobjects|syscolumns|table|update)/i,
      /(\bOR\b\s*\d+\s*=\s*\d+|\bAND\b\s*\d+\s*=\s*\d+)/i,
      /(';|";|`|\\x00|\\n|\\r|\\x1a)/i
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Check for NoSQL injection patterns
   */
  static containsNoSQLInjectionPatterns(input: string): boolean {
    const noSqlPatterns = [
      /(\$gt|\$gte|\$lt|\$lte|\$ne|\$eq|\$exists|\$in|\$nin|\$and|\$or|\$not|\$regex|\$where|\$text|\$mod)/i,
      /(\{|\}|\[|\])/,
      /(function\s*\(|=>|\$where)/i
    ];
    
    return noSqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Validate TOTP code format
   */
  static validateTOTPCode(code: string): ValidationResult {
    const errors: string[] = [];
    
    if (!code) {
      errors.push('TOTP code is required');
    } else if (!/^\d{6}$/.test(code)) {
      errors.push('TOTP code must be exactly 6 digits');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate URL format and safety
   */
  static validateURL(url: string, allowedProtocols: string[] = ['http', 'https']): ValidationResult {
    const errors: string[] = [];
    
    if (!url) {
      errors.push('URL is required');
      return { isValid: false, errors };
    }
    
    try {
      const parsedUrl = new URL(url);
      
      if (!allowedProtocols.includes(parsedUrl.protocol.replace(':', ''))) {
        errors.push(`URL protocol must be one of: ${allowedProtocols.join(', ')}`);
      }
      
      // Check for javascript: protocol or data: URIs
      if (parsedUrl.protocol === 'javascript:' || parsedUrl.protocol === 'data:') {
        errors.push('Potentially malicious URL detected');
      }
      
      // Check for local/private IP addresses
      const hostname = parsedUrl.hostname;
      if (this.isPrivateIP(hostname)) {
        errors.push('URL points to a private/local address');
      }
      
    } catch (error) {
      errors.push('Invalid URL format');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if IP address is private/local
   */
  private static isPrivateIP(hostname: string): boolean {
    const privateRanges = [
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^localhost$/i,
      /^::1$/,
      /^fc00:/i,
      /^fe80:/i
    ];
    
    return privateRanges.some(pattern => pattern.test(hostname));
  }

  /**
   * Rate limit validation for repeated requests
   */
  static validateRateLimit(
    requestCount: number,
    maxRequests: number,
    windowMs: number
  ): ValidationResult {
    const errors: string[] = [];
    
    if (requestCount >= maxRequests) {
      const retryAfter = Math.ceil(windowMs / 1000 / 60);
      errors.push(`Too many requests. Please try again in ${retryAfter} minutes`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(
    file: { mimetype: string; size: number; originalname: string },
    allowedMimeTypes: string[],
    maxSizeBytes: number
  ): ValidationResult {
    const errors: string[] = [];
    
    if (!allowedMimeTypes.includes(file.mimetype)) {
      errors.push(`File type not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`);
    }
    
    if (file.size > maxSizeBytes) {
      const maxSizeMB = Math.round(maxSizeBytes / 1024 / 1024);
      errors.push(`File size exceeds maximum allowed size of ${maxSizeMB}MB`);
    }
    
    // Check for double extensions and null bytes
    if (/\.(php|exe|sh|bat|cmd|com|cgi|jar|jsp|asp|aspx)\./i.test(file.originalname) ||
        file.originalname.includes('\x00')) {
      errors.push('Suspicious filename detected');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}