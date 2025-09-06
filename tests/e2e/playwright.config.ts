import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { 
      open: 'never',
      outputFolder: 'reports/html-report'
    }],
    ['json', { 
      outputFile: 'reports/test-results.json' 
    }],
    ['junit', { 
      outputFile: 'reports/junit.xml' 
    }],
    ['line'],
    process.env.CI ? ['github'] : ['list']
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    
    /* Take screenshot when test fails */
    screenshot: 'only-on-failure',
    
    /* Record video when test fails */
    video: 'retain-on-failure',
    
    /* Global timeout for each action */
    actionTimeout: 30000,
    
    /* Global timeout for navigation */
    navigationTimeout: 30000,
    
    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,
    
    /* Extra HTTP headers */
    extraHTTPHeaders: {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  },

  /* Configure projects for major browsers */
  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup',
    },
    {
      name: 'cleanup',
      testMatch: /.*\.teardown\.ts/,
    },

    // Desktop browsers
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Use prepared auth state
        storageState: 'storage-states/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        storageState: 'storage-states/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        storageState: 'storage-states/user.json',
      },
      dependencies: ['setup'],
    },

    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        storageState: 'storage-states/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        storageState: 'storage-states/user.json',
      },
      dependencies: ['setup'],
    },

    // Tablet
    {
      name: 'iPad',
      use: { 
        ...devices['iPad Pro'],
        storageState: 'storage-states/user.json',
      },
      dependencies: ['setup'],
    },

    // High DPI display
    {
      name: 'Desktop Chrome HiDPI',
      use: { 
        ...devices['Desktop Chrome HiDPI'],
        storageState: 'storage-states/user.json',
      },
      dependencies: ['setup'],
    },

    // Unauthenticated tests (for login/register flows)
    {
      name: 'unauthenticated',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*auth.*\.spec\.ts/,
    },

    // API testing
    {
      name: 'api',
      use: {
        baseURL: process.env.API_BASE_URL || 'http://localhost:8000/api',
        extraHTTPHeaders: {
          'Content-Type': 'application/json',
        },
      },
      testMatch: /.*api.*\.spec\.ts/,
    },

    // Performance testing
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        // Disable some features for consistent performance testing
        bypassCSP: true,
        ignoreHTTPSErrors: true,
      },
      testMatch: /.*performance.*\.spec\.ts/,
    },

    // Visual regression testing
    {
      name: 'visual',
      use: {
        ...devices['Desktop Chrome'],
        // Consistent viewport for visual tests
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
      },
      testMatch: /.*visual.*\.spec\.ts/,
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: process.env.BASE_URL || 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes
    env: {
      NODE_ENV: 'test',
    },
  },

  /* Global setup and teardown */
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',

  /* Test timeout */
  timeout: 60 * 1000, // 60 seconds

  /* Expect timeout */
  expect: {
    timeout: 10 * 1000, // 10 seconds
    toMatchSnapshot: {
      threshold: 0.1,
      mode: 'strict'
    },
  },

  /* Output directory for test artifacts */
  outputDir: 'test-results/',
});