import { CryptoUtils } from '../../../backend/services/auth/src/utils/crypto.utils';

describe('CryptoUtils', () => {
  describe('Password Hashing', () => {
    it('should hash a password successfully', async () => {
      const password = 'TestPassword123!';
      const hash = await CryptoUtils.hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should verify a correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await CryptoUtils.hashPassword(password);
      const isValid = await CryptoUtils.verifyPassword(password, hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await CryptoUtils.hashPassword(password);
      const isValid = await CryptoUtils.verifyPassword(wrongPassword, hash);
      
      expect(isValid).toBe(false);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await CryptoUtils.hashPassword(password);
      const hash2 = await CryptoUtils.hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty password gracefully', async () => {
      await expect(CryptoUtils.hashPassword('')).rejects.toThrow('Password cannot be empty');
    });
  });

  describe('Token Generation', () => {
    it('should generate secure random tokens', async () => {
      const token1 = await CryptoUtils.generateSecureToken();
      const token2 = await CryptoUtils.generateSecureToken();
      
      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should generate tokens with specified length', async () => {
      const token = await CryptoUtils.generateSecureToken(16);
      
      expect(token.length).toBe(32); // 16 bytes = 32 hex chars
    });

    it('should generate valid session IDs', async () => {
      const sessionId = await CryptoUtils.generateSessionId();
      
      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^[A-Za-z0-9_-]+$/); // base64url format
    });
  });

  describe('Timing-Safe Comparison', () => {
    it('should correctly compare equal strings', () => {
      const result = CryptoUtils.timingSafeEqual('test123', 'test123');
      expect(result).toBe(true);
    });

    it('should correctly identify different strings', () => {
      const result = CryptoUtils.timingSafeEqual('test123', 'test124');
      expect(result).toBe(false);
    });

    it('should handle different length strings', () => {
      const result = CryptoUtils.timingSafeEqual('short', 'muchlongerstring');
      expect(result).toBe(false);
    });

    it('should handle non-string inputs', () => {
      const result = CryptoUtils.timingSafeEqual(null as any, 'test');
      expect(result).toBe(false);
    });
  });

  describe('HMAC Operations', () => {
    const secret = 'test-secret-key';
    const data = 'test-data';

    it('should generate HMAC signature', () => {
      const signature = CryptoUtils.generateHMAC(data, secret);
      
      expect(signature).toBeDefined();
      expect(signature.length).toBe(64); // SHA256 = 64 hex chars
    });

    it('should verify valid HMAC signature', () => {
      const signature = CryptoUtils.generateHMAC(data, secret);
      const isValid = CryptoUtils.verifyHMAC(data, signature, secret);
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid HMAC signature', () => {
      const signature = CryptoUtils.generateHMAC(data, secret);
      const isValid = CryptoUtils.verifyHMAC('different-data', signature, secret);
      
      expect(isValid).toBe(false);
    });

    it('should reject tampered signature', () => {
      const signature = CryptoUtils.generateHMAC(data, secret);
      const tamperedSignature = signature.substring(0, 63) + '0';
      const isValid = CryptoUtils.verifyHMAC(data, tamperedSignature, secret);
      
      expect(isValid).toBe(false);
    });
  });

  describe('Encryption/Decryption', () => {
    const key = '0'.repeat(64); // 32 bytes in hex
    const plaintext = 'Sensitive data to encrypt';

    it('should encrypt and decrypt data successfully', () => {
      const encrypted = CryptoUtils.encrypt(plaintext, key);
      
      expect(encrypted.encrypted).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();
      
      const decrypted = CryptoUtils.decrypt(encrypted, key);
      expect(decrypted).toBe(plaintext);
    });

    it('should generate different ciphertexts for same plaintext', () => {
      const encrypted1 = CryptoUtils.encrypt(plaintext, key);
      const encrypted2 = CryptoUtils.encrypt(plaintext, key);
      
      expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should fail decryption with wrong key', () => {
      const encrypted = CryptoUtils.encrypt(plaintext, key);
      const wrongKey = '1'.repeat(64);
      
      expect(() => {
        CryptoUtils.decrypt(encrypted, wrongKey);
      }).toThrow();
    });

    it('should fail decryption with tampered data', () => {
      const encrypted = CryptoUtils.encrypt(plaintext, key);
      encrypted.encrypted = encrypted.encrypted.substring(0, 10) + 'TAMPERED';
      
      expect(() => {
        CryptoUtils.decrypt(encrypted, key);
      }).toThrow();
    });
  });

  describe('Password Entropy', () => {
    it('should calculate low entropy for simple passwords', () => {
      const entropy = CryptoUtils.calculatePasswordEntropy('password');
      expect(entropy).toBeLessThan(30);
    });

    it('should calculate medium entropy for moderate passwords', () => {
      const entropy = CryptoUtils.calculatePasswordEntropy('Password123');
      expect(entropy).toBeGreaterThan(30);
      expect(entropy).toBeLessThan(60);
    });

    it('should calculate high entropy for complex passwords', () => {
      const entropy = CryptoUtils.calculatePasswordEntropy('P@ssw0rd!2023#Secure');
      expect(entropy).toBeGreaterThan(60);
    });

    it('should increase entropy with length', () => {
      const shortEntropy = CryptoUtils.calculatePasswordEntropy('Pass!1');
      const longEntropy = CryptoUtils.calculatePasswordEntropy('Password!123456789');
      
      expect(longEntropy).toBeGreaterThan(shortEntropy);
    });
  });

  describe('Data Masking', () => {
    it('should mask sensitive data correctly', () => {
      const data = '1234567890';
      const masked = CryptoUtils.maskSensitiveData(data, 2);
      
      expect(masked).toBe('12****90');
    });

    it('should fully mask short data', () => {
      const data = '12345';
      const masked = CryptoUtils.maskSensitiveData(data, 3);
      
      expect(masked).toBe('*****');
    });

    it('should handle empty string', () => {
      const masked = CryptoUtils.maskSensitiveData('');
      
      expect(masked).toBe('');
    });
  });

  describe('Device Fingerprinting', () => {
    it('should generate consistent fingerprint for same inputs', () => {
      const userAgent = 'Mozilla/5.0 Chrome/91.0';
      const ip = '192.168.1.1';
      const accept = 'text/html,application/json';
      
      const fp1 = CryptoUtils.generateFingerprint(userAgent, ip, accept);
      const fp2 = CryptoUtils.generateFingerprint(userAgent, ip, accept);
      
      expect(fp1).toBe(fp2);
      expect(fp1.length).toBe(64); // SHA256 hash
    });

    it('should generate different fingerprints for different inputs', () => {
      const fp1 = CryptoUtils.generateFingerprint('Chrome', '1.1.1.1', 'text/html');
      const fp2 = CryptoUtils.generateFingerprint('Firefox', '1.1.1.1', 'text/html');
      
      expect(fp1).not.toBe(fp2);
    });
  });

  describe('Key Derivation', () => {
    it('should derive key from password', async () => {
      const password = 'MySecurePassword';
      const salt = await CryptoUtils.generateSalt();
      const key = await CryptoUtils.deriveKey(password, salt);
      
      expect(key).toBeDefined();
      expect(key.length).toBe(128); // 64 bytes = 128 hex chars
    });

    it('should generate consistent keys with same inputs', async () => {
      const password = 'MySecurePassword';
      const salt = await CryptoUtils.generateSalt();
      
      const key1 = await CryptoUtils.deriveKey(password, salt);
      const key2 = await CryptoUtils.deriveKey(password, salt);
      
      expect(key1).toBe(key2);
    });

    it('should generate different keys with different salts', async () => {
      const password = 'MySecurePassword';
      const salt1 = await CryptoUtils.generateSalt();
      const salt2 = await CryptoUtils.generateSalt();
      
      const key1 = await CryptoUtils.deriveKey(password, salt1);
      const key2 = await CryptoUtils.deriveKey(password, salt2);
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('Security Nonce', () => {
    it('should generate unique nonces', () => {
      const nonce1 = CryptoUtils.generateNonce();
      const nonce2 = CryptoUtils.generateNonce();
      
      expect(nonce1).toBeDefined();
      expect(nonce2).toBeDefined();
      expect(nonce1).not.toBe(nonce2);
    });

    it('should generate base64 encoded nonces', () => {
      const nonce = CryptoUtils.generateNonce();
      
      // Base64 pattern
      expect(nonce).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });
  });
});

describe('Constant Time Operations', () => {
  it('should perform constant time integer comparison', () => {
    expect(CryptoUtils.constantTimeCompare(5, 5)).toBe(true);
    expect(CryptoUtils.constantTimeCompare(5, 6)).toBe(false);
    expect(CryptoUtils.constantTimeCompare(0, 0)).toBe(true);
    expect(CryptoUtils.constantTimeCompare(-1, -1)).toBe(true);
    expect(CryptoUtils.constantTimeCompare(-1, 1)).toBe(false);
  });
});

describe('OTP Secret Generation', () => {
  it('should generate valid OTP secret', async () => {
    const secret = await CryptoUtils.generateOTPSecret();
    
    expect(secret).toBeDefined();
    expect(secret).toMatch(/^[A-Z2-7]+$/); // Base32 format
    expect(secret.length).toBeGreaterThanOrEqual(32);
  });

  it('should generate unique OTP secrets', async () => {
    const secret1 = await CryptoUtils.generateOTPSecret();
    const secret2 = await CryptoUtils.generateOTPSecret();
    
    expect(secret1).not.toBe(secret2);
  });
});