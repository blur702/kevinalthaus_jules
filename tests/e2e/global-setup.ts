import { FullConfig } from '@playwright/test';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Global setup runs before all tests
 * Sets up test database, mock services, and other prerequisites
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup...');

  // Create required directories
  await ensureDirectories();

  // Setup test database
  await setupTestDatabase();

  // Start mock services
  await startMockServices();

  // Prepare test data
  await prepareTestData();

  console.log('✅ Global setup completed');
}

async function ensureDirectories() {
  const dirs = [
    'storage-states',
    'test-results',
    'reports',
    'screenshots',
    'videos',
    'traces',
    'downloads',
    'uploads'
  ];

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function setupTestDatabase() {
  console.log('📊 Setting up test database...');
  
  // In a real application, you would:
  // 1. Create/reset test database
  // 2. Run migrations
  // 3. Seed test data
  
  // For now, we'll create a simple setup script
  const setupScript = `
    -- Reset test database
    DROP DATABASE IF EXISTS shell_platform_test;
    CREATE DATABASE shell_platform_test;
    
    -- Switch to test database
    \\c shell_platform_test;
    
    -- Create users table
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      is_admin BOOLEAN DEFAULT FALSE,
      is_verified BOOLEAN DEFAULT FALSE,
      two_factor_secret VARCHAR(32),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    
    -- Create plugins table
    CREATE TABLE plugins (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      version VARCHAR(50) NOT NULL,
      status VARCHAR(50) DEFAULT 'inactive',
      config JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    
    -- Insert test users
    INSERT INTO users (email, password, first_name, last_name, is_verified, is_admin) VALUES
    ('test@shellplatform.dev', '$2b$10$encrypted_password', 'Test', 'User', TRUE, FALSE),
    ('admin@shellplatform.dev', '$2b$10$encrypted_password', 'Admin', 'User', TRUE, TRUE);
    
    -- Insert test plugins
    INSERT INTO plugins (name, version, status, config) VALUES
    ('test-plugin', '1.0.0', 'active', '{"theme": "dark", "features": ["chat", "notifications"]}'),
    ('analytics-plugin', '2.1.0', 'inactive', '{"trackingId": "test-123"}');
  `;
  
  await fs.writeFile('setup-test-db.sql', setupScript);
  console.log('✅ Test database setup script created');
}

async function startMockServices() {
  console.log('🔧 Starting mock services...');
  
  // Create mock server configuration
  const mockServerConfig = {
    port: 8001,
    routes: {
      '/api/auth/login': {
        method: 'POST',
        response: {
          token: 'mock-jwt-token',
          refreshToken: 'mock-refresh-token',
          user: { id: 1, email: 'test@shellplatform.dev' }
        }
      },
      '/api/auth/register': {
        method: 'POST',
        response: {
          message: 'User registered successfully',
          user: { id: 2, email: 'newuser@shellplatform.dev' }
        }
      },
      '/api/plugins': {
        method: 'GET',
        response: [
          { id: 1, name: 'test-plugin', version: '1.0.0', status: 'active' },
          { id: 2, name: 'analytics-plugin', version: '2.1.0', status: 'inactive' }
        ]
      }
    }
  };
  
  await fs.writeFile('mock-server-config.json', JSON.stringify(mockServerConfig, null, 2));
  console.log('✅ Mock services configuration created');
}

async function prepareTestData() {
  console.log('📝 Preparing test data...');
  
  const testData = {
    users: [
      {
        id: 1,
        email: 'test@shellplatform.dev',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        isVerified: true,
        isAdmin: false
      },
      {
        id: 2,
        email: 'admin@shellplatform.dev',
        password: 'AdminPassword123!',
        firstName: 'Admin',
        lastName: 'User',
        isVerified: true,
        isAdmin: true
      }
    ],
    plugins: [
      {
        id: 1,
        name: 'test-plugin',
        version: '1.0.0',
        status: 'active',
        config: { theme: 'dark', features: ['chat', 'notifications'] }
      },
      {
        id: 2,
        name: 'analytics-plugin',
        version: '2.1.0',
        status: 'inactive',
        config: { trackingId: 'test-123' }
      }
    ],
    apiResponses: {
      login: {
        success: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
          refreshToken: 'refresh-token-123',
          user: { id: 1, email: 'test@shellplatform.dev' }
        },
        failure: {
          error: 'Invalid credentials',
          code: 'AUTH_FAILED'
        }
      }
    }
  };
  
  await fs.writeFile('test-data.json', JSON.stringify(testData, null, 2));
  console.log('✅ Test data prepared');
}

export default globalSetup;