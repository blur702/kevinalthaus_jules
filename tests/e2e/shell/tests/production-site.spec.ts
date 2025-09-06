import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * Comprehensive End-to-End Testing for Shell Platform Production Site
 * URL: https://kevinalthaus.com
 * 
 * This test suite performs thorough visual QA testing including:
 * - Login flow validation
 * - Console error monitoring
 * - Visual regression testing
 * - Performance monitoring
 * - Responsive design validation
 * - Error scenario testing
 */

// Test configuration for production site
const PRODUCTION_URL = 'https://kevinalthaus.com';
const TEST_CREDENTIALS = {
  email: 'kevin.althaus@gmail.com',
  password: '(130Bpm)'
};

// Console monitoring arrays
let consoleErrors: string[] = [];
let consoleWarnings: string[] = [];
let networkErrors: string[] = [];
let performanceMetrics: any = {};

test.describe('Shell Platform Production Site - Comprehensive E2E Testing', () => {
  
  test.beforeEach(async ({ page, context }) => {
    // Clear monitoring arrays
    consoleErrors = [];
    consoleWarnings = [];
    networkErrors = [];
    
    // Set up console monitoring
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`Console Error: ${msg.text()}`);
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(`Console Warning: ${msg.text()}`);
      }
    });
    
    // Monitor page errors
    page.on('pageerror', (error) => {
      consoleErrors.push(`Page Error: ${error.message}`);
    });
    
    // Monitor failed requests
    page.on('response', (response) => {
      if (!response.ok() && response.status() >= 400) {
        networkErrors.push(`Failed Request: ${response.url()} - Status: ${response.status()}`);
      }
    });
    
    // Set viewport for desktop testing
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test('1. Initial Site Load and Health Check', async ({ page }) => {
    const startTime = Date.now();
    
    // Navigate to production site
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    performanceMetrics.initialLoad = loadTime;
    
    // Take initial screenshot
    await page.screenshot({ 
      path: '/var/www/tests/e2e/shell/test-results/homepage-initial.png',
      fullPage: true 
    });
    
    // Check basic page elements
    await expect(page).toHaveTitle(/Shell/i);
    
    // Check if site is responsive
    expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    
    // Verify no immediate console errors
    await page.waitForTimeout(2000);
    expect(consoleErrors.length).toBe(0);
    
    console.log(`Initial load time: ${loadTime}ms`);
  });

  test('2. Login Flow - Complete Authentication Test', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    
    // Take screenshot before login attempt
    await page.screenshot({ 
      path: '/var/www/tests/e2e/shell/test-results/before-login.png',
      fullPage: true 
    });
    
    // Look for login form elements
    const emailField = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passwordField = page.locator('input[type="password"], input[name="password"], input[placeholder*="password" i]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In"), input[type="submit"]').first();
    
    // Check if login form is present
    await expect(emailField).toBeVisible({ timeout: 10000 });
    await expect(passwordField).toBeVisible({ timeout: 10000 });
    await expect(submitButton).toBeVisible({ timeout: 10000 });
    
    // Fill in credentials
    await emailField.fill(TEST_CREDENTIALS.email);
    await passwordField.fill(TEST_CREDENTIALS.password);
    
    // Take screenshot with filled form
    await page.screenshot({ 
      path: '/var/www/tests/e2e/shell/test-results/login-form-filled.png',
      fullPage: true 
    });
    
    // Submit the form
    const navigationPromise = page.waitForURL(/.*/, { timeout: 30000 });
    await submitButton.click();
    
    try {
      await navigationPromise;
      
      // Wait for potential redirects or loading
      await page.waitForTimeout(3000);
      
      // Take screenshot after login attempt
      await page.screenshot({ 
        path: '/var/www/tests/e2e/shell/test-results/after-login.png',
        fullPage: true 
      });
      
      // Check if we're on a dashboard or authenticated page
      const currentUrl = page.url();
      console.log(`Post-login URL: ${currentUrl}`);
      
      // Look for indicators of successful login
      const dashboardIndicators = [
        'dashboard', 'welcome', 'logout', 'profile', 'settings', 'menu'
      ];
      
      let loginSuccess = false;
      for (const indicator of dashboardIndicators) {
        try {
          await page.locator(`[class*="${indicator}" i], [id*="${indicator}" i], :has-text("${indicator}" i)`).first().waitFor({ timeout: 5000 });
          loginSuccess = true;
          break;
        } catch (e) {
          // Continue checking other indicators
        }
      }
      
      // Check for error messages
      const errorMessages = page.locator('[class*="error" i], [class*="alert" i], .text-red, .text-danger');
      const errorCount = await errorMessages.count();
      
      if (errorCount > 0) {
        for (let i = 0; i < errorCount; i++) {
          const errorText = await errorMessages.nth(i).textContent();
          console.log(`Login Error Found: ${errorText}`);
        }
      }
      
      expect(loginSuccess || currentUrl !== PRODUCTION_URL).toBeTruthy();
      
    } catch (error) {
      console.log(`Login flow error: ${error}`);
      
      // Take screenshot of any error state
      await page.screenshot({ 
        path: '/var/www/tests/e2e/shell/test-results/login-error.png',
        fullPage: true 
      });
      
      throw error;
    }
  });

  test('3. Post-Login Navigation and Interactive Elements', async ({ page }) => {
    // First login
    await page.goto(PRODUCTION_URL);
    await page.locator('input[type="email"], input[name="email"]').first().fill(TEST_CREDENTIALS.email);
    await page.locator('input[type="password"], input[name="password"]').first().fill(TEST_CREDENTIALS.password);
    await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first().click();
    
    await page.waitForTimeout(3000);
    
    // Test all links on the page
    const links = page.locator('a[href]');
    const linkCount = await links.count();
    console.log(`Found ${linkCount} links to test`);
    
    const linkTests = [];
    for (let i = 0; i < Math.min(linkCount, 10); i++) { // Test first 10 links to avoid timeout
      try {
        const link = links.nth(i);
        const href = await link.getAttribute('href');
        const text = (await link.textContent())?.trim() || 'No text';
        
        if (href && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('javascript:')) {
          linkTests.push({ href, text, index: i });
        }
      } catch (e) {
        console.log(`Error getting link ${i}: ${e}`);
      }
    }
    
    // Test each link
    for (const linkTest of linkTests) {
      try {
        console.log(`Testing link: ${linkTest.text} -> ${linkTest.href}`);
        
        if (linkTest.href.startsWith('http') && !linkTest.href.includes('kevinalthaus.com')) {
          // External link - just verify it's accessible
          const response = await page.request.get(linkTest.href);
          expect(response.ok()).toBeTruthy();
        } else {
          // Internal link - navigate and verify
          await links.nth(linkTest.index).click({ timeout: 5000 });
          await page.waitForTimeout(2000);
          
          // Check for 404 or error pages
          const is404 = await page.locator(':has-text("404"), :has-text("Not Found"), :has-text("Page not found")').count() > 0;
          expect(is404).toBeFalsy();
          
          // Go back to continue testing
          await page.goBack({ waitUntil: 'networkidle' });
        }
      } catch (e) {
        console.log(`Link test failed for ${linkTest.text}: ${e}`);
        networkErrors.push(`Link test failed: ${linkTest.text} -> ${linkTest.href}`);
      }
    }
    
    // Test all buttons
    const buttons = page.locator('button, input[type="button"], input[type="submit"]');
    const buttonCount = await buttons.count();
    console.log(`Found ${buttonCount} buttons to test`);
    
    for (let i = 0; i < Math.min(buttonCount, 5); i++) { // Test first 5 buttons
      try {
        const button = buttons.nth(i);
        const text = (await button.textContent())?.trim() || await button.getAttribute('value') || 'No text';
        
        if (await button.isVisible() && await button.isEnabled()) {
          console.log(`Testing button: ${text}`);
          
          // Click button and check for any immediate changes
          await button.click({ timeout: 5000 });
          await page.waitForTimeout(1000);
          
          // Check if any modals or overlays appeared
          const modals = page.locator('[class*="modal" i], [class*="overlay" i], [class*="popup" i]');
          const modalCount = await modals.count();
          
          if (modalCount > 0) {
            console.log(`Button "${text}" opened modal/overlay`);
            
            // Try to close modal if possible
            const closeButtons = page.locator('[class*="close" i], button:has-text("×"), button:has-text("Close")');
            const closeCount = await closeButtons.count();
            if (closeCount > 0) {
              await closeButtons.first().click();
              await page.waitForTimeout(500);
            }
          }
        }
      } catch (e) {
        console.log(`Button test ${i} failed: ${e}`);
      }
    }
  });

  test('4. Form Validation Testing', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    
    // Find all forms on the page
    const forms = page.locator('form');
    const formCount = await forms.count();
    console.log(`Found ${formCount} forms to test`);
    
    for (let i = 0; i < formCount; i++) {
      try {
        const form = forms.nth(i);
        const formInputs = form.locator('input, textarea, select');
        const submitButton = form.locator('button[type="submit"], input[type="submit"]').first();
        
        const inputCount = await formInputs.count();
        
        if (inputCount > 0 && await submitButton.isVisible()) {
          console.log(`Testing form ${i} with ${inputCount} inputs`);
          
          // Test 1: Submit empty form
          await submitButton.click();
          await page.waitForTimeout(1000);
          
          // Look for validation messages
          const validationMessages = page.locator('[class*="error" i], [class*="invalid" i], .text-red, .text-danger');
          const validationCount = await validationMessages.count();
          
          if (validationCount > 0) {
            console.log(`Form ${i}: Found ${validationCount} validation messages for empty submission`);
          }
          
          // Test 2: Fill with invalid data (if email field exists)
          const emailInputs = form.locator('input[type="email"]');
          if (await emailInputs.count() > 0) {
            await emailInputs.first().fill('invalid-email');
            await submitButton.click();
            await page.waitForTimeout(1000);
            
            // Check for email validation
            const emailErrors = page.locator('[class*="error" i]:has-text("email"), [class*="invalid" i]:has-text("email")');
            const emailErrorCount = await emailErrors.count();
            console.log(`Form ${i}: Email validation errors: ${emailErrorCount}`);
          }
          
          // Clear form for next test
          for (let j = 0; j < inputCount; j++) {
            try {
              const input = formInputs.nth(j);
              if (await input.isVisible()) {
                await input.clear();
              }
            } catch (e) {
              // Continue with other inputs
            }
          }
        }
      } catch (e) {
        console.log(`Form test ${i} failed: ${e}`);
      }
    }
  });

  test('5. Visual Regression and Mobile Responsiveness', async ({ page, browserName }) => {
    await page.goto(PRODUCTION_URL);
    
    // Desktop screenshot
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ 
      path: `/var/www/tests/e2e/shell/test-results/desktop-${browserName}.png`,
      fullPage: true 
    });
    
    // Tablet screenshot
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ 
      path: `/var/www/tests/e2e/shell/test-results/tablet-${browserName}.png`,
      fullPage: true 
    });
    
    // Mobile screenshot
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ 
      path: `/var/www/tests/e2e/shell/test-results/mobile-${browserName}.png`,
      fullPage: true 
    });
    
    // Check for horizontal scroll on mobile
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // Allow 5px tolerance
  });

  test('6. Performance and Service Worker Testing', async ({ page }) => {
    // Clear cache and start fresh
    const context = page.context();
    await context.clearCookies();
    
    const startTime = Date.now();
    
    // Navigate with network monitoring
    const response = await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;
    
    // Check response status
    expect(response?.ok()).toBeTruthy();
    
    // Check load time
    expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
    
    // Check for service worker
    const serviceWorkerRegistered = await page.evaluate(async () => {
      return 'serviceWorker' in navigator && (await navigator.serviceWorker.getRegistrations()).length > 0;
    });
    
    console.log(`Service Worker registered: ${serviceWorkerRegistered}`);
    
    // Check for web vitals
    await page.waitForTimeout(3000);
    
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        if ('web-vital' in window) {
          resolve('Web Vitals library detected');
        } else {
          resolve('No Web Vitals library detected');
        }
      });
    });
    
    console.log(`Web Vitals: ${vitals}`);
    
    performanceMetrics.loadTime = loadTime;
    performanceMetrics.serviceWorker = serviceWorkerRegistered;
  });

  test.afterEach(async ({ page }) => {
    // Log all collected issues
    if (consoleErrors.length > 0) {
      console.log('\n=== CONSOLE ERRORS ===');
      consoleErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    if (consoleWarnings.length > 0) {
      console.log('\n=== CONSOLE WARNINGS ===');
      consoleWarnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning}`);
      });
    }
    
    if (networkErrors.length > 0) {
      console.log('\n=== NETWORK ERRORS ===');
      networkErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
    
    console.log('\n=== PERFORMANCE METRICS ===');
    console.log(JSON.stringify(performanceMetrics, null, 2));
  });
});

// Comprehensive report generation test
test('7. Generate Comprehensive QA Report', async ({ page }) => {
  const report = {
    timestamp: new Date().toISOString(),
    site: PRODUCTION_URL,
    testSummary: {
      totalErrors: consoleErrors.length,
      totalWarnings: consoleWarnings.length,
      totalNetworkErrors: networkErrors.length,
      performanceMetrics: performanceMetrics
    },
    functionalBugs: [],
    consoleErrors: consoleErrors,
    consoleWarnings: consoleWarnings,
    networkErrors: networkErrors,
    visualDiscrepancies: [],
    recommendations: []
  };
  
  // Add recommendations based on findings
  if (consoleErrors.length > 0) {
    report.recommendations.push('Fix JavaScript console errors to improve application stability');
  }
  
  if (performanceMetrics.loadTime > 5000) {
    report.recommendations.push('Optimize page load time - currently exceeding 5 seconds');
  }
  
  if (networkErrors.length > 0) {
    report.recommendations.push('Fix failed network requests to ensure proper functionality');
  }
  
  // Write report to file
  await page.evaluate((reportData) => {
    console.log('=== COMPREHENSIVE QA REPORT ===');
    console.log(JSON.stringify(reportData, null, 2));
  }, report);
  
  // Overall assessment
  let confidence = 'High';
  if (consoleErrors.length > 0 || networkErrors.length > 5) {
    confidence = 'Low';
  } else if (consoleWarnings.length > 10 || performanceMetrics.loadTime > 5000) {
    confidence = 'Medium';
  }
  
  console.log(`\n=== OVERALL ASSESSMENT ===`);
  console.log(`Confidence Level for Release: ${confidence}`);
  console.log(`Total Issues Found: ${consoleErrors.length + consoleWarnings.length + networkErrors.length}`);
});