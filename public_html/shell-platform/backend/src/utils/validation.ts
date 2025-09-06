import { ValidationError } from 'express-validator';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class ValidationUtils {
  /**
   * Validate email format
   */
  public static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  public static isValidPassword(password: string): ValidationResult {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      errors.push('Password must be less than 128 characters long');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate username
   */
  public static isValidUsername(username: string): ValidationResult {
    const errors: string[] = [];

    if (username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }

    if (username.length > 30) {
      errors.push('Username must be less than 30 characters long');
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      errors.push('Username can only contain letters, numbers, hyphens, and underscores');
    }

    if (username.startsWith('-') || username.startsWith('_')) {
      errors.push('Username cannot start with a hyphen or underscore');
    }

    if (username.endsWith('-') || username.endsWith('_')) {
      errors.push('Username cannot end with a hyphen or underscore');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate file upload
   */
  public static isValidFileUpload(
    file: Express.Multer.File,
    options: {
      maxSize?: number;
      allowedTypes?: string[];
      allowedExtensions?: string[];
    } = {}
  ): ValidationResult {
    const errors: string[] = [];
    const { maxSize = 10 * 1024 * 1024, allowedTypes = [], allowedExtensions = [] } = options;

    if (file.size > maxSize) {
      errors.push(`File size must be less than ${maxSize / (1024 * 1024)}MB`);
    }

    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} is not allowed`);
    }

    if (allowedExtensions.length > 0) {
      const ext = file.originalname.split('.').pop()?.toLowerCase();
      if (!ext || !allowedExtensions.includes(ext)) {
        errors.push(`File extension .${ext} is not allowed`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate plugin name
   */
  public static isValidPluginName(name: string): ValidationResult {
    const errors: string[] = [];

    if (name.length < 2) {
      errors.push('Plugin name must be at least 2 characters long');
    }

    if (name.length > 50) {
      errors.push('Plugin name must be less than 50 characters long');
    }

    if (!/^[a-zA-Z0-9\s_-]+$/.test(name)) {
      errors.push('Plugin name can only contain letters, numbers, spaces, hyphens, and underscores');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate URL
   */
  public static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate JSON string
   */
  public static isValidJson(jsonString: string): ValidationResult {
    const errors: string[] = [];

    try {
      JSON.parse(jsonString);
    } catch (error) {
      errors.push('Invalid JSON format');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize string for safe display
   */
  public static sanitizeString(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Validate pagination parameters
   */
  public static validatePagination(limit?: string, offset?: string): {
    limit: number;
    offset: number;
    errors: string[];
  } {
    const errors: string[] = [];
    let validLimit = 50;
    let validOffset = 0;

    if (limit !== undefined) {
      const parsedLimit = parseInt(limit, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        errors.push('Limit must be a positive integer');
      } else if (parsedLimit > 100) {
        errors.push('Limit cannot be greater than 100');
      } else {
        validLimit = parsedLimit;
      }
    }

    if (offset !== undefined) {
      const parsedOffset = parseInt(offset, 10);
      if (isNaN(parsedOffset) || parsedOffset < 0) {
        errors.push('Offset must be a non-negative integer');
      } else {
        validOffset = parsedOffset;
      }
    }

    return {
      limit: validLimit,
      offset: validOffset,
      errors,
    };
  }

  /**
   * Format validation errors from express-validator
   */
  public static formatValidationErrors(errors: ValidationError[]): string {
    return errors.map(error => error.msg).join(', ');
  }

  /**
   * Validate hex color
   */
  public static isValidHexColor(color: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  }

  /**
   * Validate port number
   */
  public static isValidPort(port: number): boolean {
    return Number.isInteger(port) && port >= 1 && port <= 65535;
  }

  /**
   * Validate semantic version
   */
  public static isValidSemVer(version: string): boolean {
    const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
    return semverRegex.test(version);
  }

  /**
   * Validate MongoDB ObjectId (if using MongoDB)
   */
  public static isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  /**
   * Validate UUID
   */
  public static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}

export default ValidationUtils;