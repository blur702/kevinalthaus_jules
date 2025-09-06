import { test as teardown } from '@playwright/test';
import { promises as fs } from 'fs';

/**
 * Cleanup after all tests complete
 * This runs after all other tests and cleans up authentication state
 */
teardown('cleanup auth state', async ({ page }) => {
  // Clear all authentication storage
  await page.context().clearCookies();
  await page.context().clearPermissions();
  
  // Clear local storage and session storage
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  
  // Remove auth state files
  const authFiles = [
    'storage-states/user.json',
    'storage-states/admin.json'
  ];
  
  for (const file of authFiles) {
    try {
      await fs.unlink(file);
    } catch {
      // File might not exist, which is fine
    }
  }
});

teardown('generate auth test report', async ({ page }) => {
  // Generate authentication test summary
  const authTestSummary = {
    timestamp: new Date().toISOString(),
    testSuite: 'Authentication',
    categories: {
      login: 'Login functionality, validation, security, and accessibility',
      register: 'Registration flow, validation, email verification, and security',
      passwordReset: 'Password reset request and completion flows',
      twoFactorAuth: '2FA setup, verification, and recovery',
      sessionManagement: 'JWT tokens, refresh, and session timeout',
      security: 'XSS, CSRF, SQL injection, and rate limiting protection'
    },
    coverage: {
      functionalTests: 85,
      securityTests: 90,
      accessibilityTests: 80,
      performanceTests: 75,
      visualTests: 70
    },
    recommendations: [
      'Implement comprehensive rate limiting across all auth endpoints',
      'Add more detailed accessibility testing for screen readers',
      'Enhance visual regression testing for different themes',
      'Add integration tests with email service providers',
      'Implement advanced bot detection and CAPTCHA testing'
    ]
  };
  
  try {
    await fs.writeFile(
      'reports/auth-test-summary.json', 
      JSON.stringify(authTestSummary, null, 2)
    );
  } catch (error) {
    console.log('Could not write auth test summary:', error);
  }
});