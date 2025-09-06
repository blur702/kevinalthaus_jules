import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for production site testing
 * URL: https://kevinalthaus.com
 */
export default defineConfig({
  testDir: './tests',
  testMatch: 'production-site.spec.ts',
  
  /* Run tests in files in parallel */
  fullyParallel: false, // Run sequentially for production testing
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1, // Allow 1 retry for flaky production issues
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 1, // Single worker for production testing
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: './production-reports/html' }],
    ['json', { outputFile: './production-reports/results.json' }],
    ['junit', { outputFile: './production-reports/results.xml' }],
    ['list'], // Console output
  ],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL points to production */
    baseURL: 'https://kevinalthaus.com',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on', // Always collect trace for production testing

    /* Take screenshot on failure and success for visual comparison */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',

    /* Global test timeout - longer for production */
    actionTimeout: 15000,
    navigationTimeout: 30000,
    
    /* Extra HTTP headers */
    extraHTTPHeaders: {
      'User-Agent': 'PlaywrightQA/1.0 (Shell Platform E2E Test)',
    },
    
    /* Ignore HTTPS errors for testing */
    ignoreHTTPSErrors: false,
    
    /* Accept downloads during test */
    acceptDownloads: true,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },

    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
    },

    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
    },

    /* Test against mobile viewports. */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    {
      name: 'edge-desktop',
      use: { 
        ...devices['Desktop Edge'], 
        channel: 'msedge',
        viewport: { width: 1920, height: 1080 }
      },
    },
  ],

  /* Global setup and teardown - disabled for production testing */
  // globalSetup: require.resolve('/var/www/tests/e2e/shell/global-setup.ts'),
  // globalTeardown: require.resolve('/var/www/tests/e2e/shell/global-teardown.ts'),

  /* Test timeout - longer for production */
  timeout: 60000, // 1 minute per test
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },

  /* Output directory for test artifacts */
  outputDir: './production-test-results/',
  
  /* Web server configuration - not needed for production testing */
  // webServer: undefined,
});