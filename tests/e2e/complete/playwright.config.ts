import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Comprehensive E2E Test Configuration for Shell Platform
 * This configuration provides extensive testing capabilities including:
 * - Cross-browser testing (Chrome, Firefox, Safari)
 * - Mobile and tablet device testing
 * - Visual regression testing
 * - Performance testing
 * - Accessibility testing
 * - Security testing
 */
export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  timeout: 60000,
  
  expect: {
    // Visual comparison threshold
    threshold: 0.2,
    // Time to wait for expect conditions
    timeout: 15000,
  },

  reporter: [
    ['html', { 
      outputFolder: 'reports/playwright-report',
      open: !process.env.CI ? 'on-failure' : 'never'
    }],
    ['json', { outputFile: 'reports/results.json' }],
    ['junit', { outputFile: 'reports/junit.xml' }],
    ['line'],
    // Custom reporter for security and performance metrics
    ['./helpers/custom-reporter.ts']
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    
    // Global test context
    contextOptions: {
      // Enable permissions for notification and geolocation tests
      permissions: ['notifications', 'geolocation'],
      // Set viewport for consistent testing
      viewport: { width: 1280, height: 720 },
    },
  },

  projects: [
    // Desktop Browsers
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        // Enable console log capture
        headless: false
      },
      testMatch: ['**/core/**/*.spec.ts', '**/auth/**/*.spec.ts', '**/api/**/*.spec.ts']
    },
    {
      name: 'firefox-desktop',
      use: { ...devices['Desktop Firefox'] },
      testMatch: ['**/core/**/*.spec.ts', '**/auth/**/*.spec.ts']
    },
    {
      name: 'webkit-desktop',
      use: { ...devices['Desktop Safari'] },
      testMatch: ['**/core/**/*.spec.ts', '**/auth/**/*.spec.ts']
    },

    // Mobile Testing
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: ['**/mobile/**/*.spec.ts', '**/responsive/**/*.spec.ts']
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
      testMatch: ['**/mobile/**/*.spec.ts', '**/responsive/**/*.spec.ts']
    },

    // Tablet Testing
    {
      name: 'tablet',
      use: { ...devices['iPad Pro'] },
      testMatch: ['**/tablet/**/*.spec.ts', '**/responsive/**/*.spec.ts']
    },

    // Visual Regression Testing
    {
      name: 'visual-regression',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/visual/**/*.spec.ts']
    },

    // Performance Testing
    {
      name: 'performance',
      use: { 
        ...devices['Desktop Chrome'],
        // Enable performance metrics collection
        contextOptions: {
          recordVideo: { dir: 'reports/videos/performance' },
        }
      },
      testMatch: ['**/performance/**/*.spec.ts']
    },

    // Security Testing
    {
      name: 'security',
      use: { 
        ...devices['Desktop Chrome'],
        // Enable request interception for security tests
        contextOptions: {
          acceptDownloads: true,
        }
      },
      testMatch: ['**/security/**/*.spec.ts']
    },

    // Accessibility Testing
    {
      name: 'accessibility',
      use: { 
        ...devices['Desktop Chrome'],
        // Enable accessibility tree
        contextOptions: {
          forcedColors: 'active'
        }
      },
      testMatch: ['**/accessibility/**/*.spec.ts']
    },

    // Plugin System Testing
    {
      name: 'plugins',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/plugins/**/*.spec.ts']
    }
  ],

  // Global test setup and teardown - disabled for testing without services
  // globalSetup: require.resolve('./helpers/global-setup.ts'),
  // globalTeardown: require.resolve('./helpers/global-teardown.ts'),

  // Web server configuration - disabled for testing without services
  // webServer: {
  //   command: 'cd /var/www/public_html/shell-platform && npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120000,
  //   env: {
  //     NODE_ENV: 'test'
  //   }
  // }
});