#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { generateKeyPairSync } from 'crypto';

/**
 * Generate RSA key pairs for JWT signing (RS256)
 * Following OWASP recommendations for key management
 */

const keysDir = path.join(__dirname, '..', 'keys');

// Create keys directory if it doesn't exist
if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
}

// Generate RSA key pair for JWT signing
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 4096, // OWASP recommends minimum 2048, we use 4096 for extra security
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
    cipher: 'aes-256-cbc',
    passphrase: process.env.JWT_KEY_PASSPHRASE || 'change-this-passphrase-in-production'
  }
});

// Save keys to files
fs.writeFileSync(path.join(keysDir, 'private.key'), privateKey, {
  encoding: 'utf8',
  mode: 0o600 // Read/write for owner only
});

fs.writeFileSync(path.join(keysDir, 'public.key'), publicKey, {
  encoding: 'utf8',
  mode: 0o644 // Read for all, write for owner
});

// Generate backup keys for key rotation
const { publicKey: backupPublicKey, privateKey: backupPrivateKey } = generateKeyPairSync('rsa', {
  modulusLength: 4096,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
    cipher: 'aes-256-cbc',
    passphrase: process.env.JWT_KEY_PASSPHRASE || 'change-this-passphrase-in-production'
  }
});

fs.writeFileSync(path.join(keysDir, 'private-backup.key'), backupPrivateKey, {
  encoding: 'utf8',
  mode: 0o600
});

fs.writeFileSync(path.join(keysDir, 'public-backup.key'), backupPublicKey, {
  encoding: 'utf8',
  mode: 0o644
});

// Create .gitignore to ensure keys are never committed
const gitignore = `# Never commit private keys
*.key
*.pem
*.p12
*.pfx

# Keep this file
!.gitignore
`;

fs.writeFileSync(path.join(keysDir, '.gitignore'), gitignore);

console.log('✅ RSA key pairs generated successfully');
console.log(`📁 Keys saved to: ${keysDir}`);
console.log('');
console.log('⚠️  Security reminders:');
console.log('1. Never commit private keys to version control');
console.log('2. Set appropriate file permissions (already done)');
console.log('3. Use environment variable for key passphrase in production');
console.log('4. Implement key rotation policy (backup keys generated)');
console.log('5. Consider using HSM (Hardware Security Module) in production');
console.log('6. Store keys in secure key management service (AWS KMS, Azure Key Vault, etc.)');

// Create key metadata for tracking
const metadata = {
  generated: new Date().toISOString(),
  algorithm: 'RS256',
  keySize: 4096,
  purpose: 'JWT signing',
  rotation: {
    recommended: '90 days',
    backup: 'available'
  }
};

fs.writeFileSync(
  path.join(keysDir, 'metadata.json'),
  JSON.stringify(metadata, null, 2)
);

process.exit(0);