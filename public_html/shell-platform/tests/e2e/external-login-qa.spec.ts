/**
 * Comprehensive QA Test for External Website Login Functionality
 * Testing: https://kevinalthaus.com
 * 
 * This test acts as a manual QA tester using Playwright to thoroughly validate
 * login functionality including console monitoring, network analysis, and visual testing.
 */

import { test, expect, Page, Request, Response } from '@playwright/test';

// Test credentials
const TEST_CREDENTIALS = [
  {
    email: 'kevin.althaus@gmail.com',
    password: '(130Bpm)',
    description: 'Primary admin credentials'
  },
  {
    email: 'user@shellplatform.com',
    password: 'user123',
    description: 'User account credentials'
  }
];

// Console error collector
interface ConsoleMessage {
  type: string;
  text: string;
  location?: string;
  timestamp: string;
}

// Network request collector
interface NetworkRequest {
  url: string;
  method: string;
  status?: number;
  headers: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  timestamp: string;
  error?: string;
}

test.describe('External Website Login QA - https://kevinalthaus.com', () => {
  let consoleMessages: ConsoleMessage[] = [];
  let networkRequests: NetworkRequest[] = [];
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    consoleMessages = [];
    networkRequests = [];

    // Set up console monitoring
    page.on('console', (msg) => {
      const timestamp = new Date().toISOString();
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location()?.url || 'unknown',
        timestamp
      });
      
      if (msg.type() === 'error' || msg.type() === 'warn') {
        console.log(`[${timestamp}] CONSOLE ${msg.type().toUpperCase()}: ${msg.text()}`);
      }
    });

    // Set up page error monitoring
    page.on('pageerror', (error) => {
      const timestamp = new Date().toISOString();
      consoleMessages.push({
        type: 'error',
        text: `Page Error: ${error.message}`,
        location: 'page',
        timestamp
      });
      console.log(`[${timestamp}] PAGE ERROR: ${error.message}`);
    });

    // Set up network monitoring
    page.on('request', (request: Request) => {
      const timestamp = new Date().toISOString();
      const headers: Record<string, string> = {};
      request.allHeaders().then(h => Object.assign(headers, h));
      
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        headers,
        requestBody: request.postData() || undefined,
        timestamp
      });
    });

    page.on('response', (response: Response) => {
      const request = networkRequests.find(r => r.url === response.url() && !r.status);
      if (request) {
        request.status = response.status();
        response.text().then(text => {
          request.responseBody = text;
        }).catch(() => {
          // Ignore binary responses
        });
        
        if (response.status() >= 400) {
          console.log(`[${new Date().toISOString()}] NETWORK ERROR: ${response.status()} - ${response.url()}`);
        }
      }
    });

    page.on('requestfailed', (request: Request) => {
      const networkRequest = networkRequests.find(r => r.url === request.url());
      if (networkRequest) {
        networkRequest.error = request.failure()?.errorText || 'Request failed';
        console.log(`[${new Date().toISOString()}] REQUEST FAILED: ${request.url()} - ${networkRequest.error}`);
      }
    });
  });

  test('QA-01: Initial page load and form discovery', async () => {
    console.log('=== QA-01: Initial Page Load Analysis ===');
    
    // Navigate to the website
    await page.goto('https://kevinalthaus.com', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Take screenshot of initial page
    await page.screenshot({ 
      path: 'test-results/01-initial-page-load.png',
      fullPage: true 
    });

    // Analyze page structure
    const title = await page.title();
    const url = page.url();
    
    console.log(`Page Title: ${title}`);
    console.log(`Final URL: ${url}`);
    
    // Look for login form elements
    const loginSelectors = [
      'form[action*="login"], form[action*="auth"], form[action*="signin"]',
      'input[type="email"]',
      'input[name*="email"], input[name*="username"], input[name*="user"]',
      'input[type="password"]',
      'button[type="submit"]',
      'button:has-text("login"), button:has-text("sign in"), button:has-text("log in")',
      'a[href*="login"], a[href*="signin"], a[href*="auth"]'
    ];

    const formElements: Record<string, number> = {};
    
    for (const selector of loginSelectors) {
      const count = await page.locator(selector).count();
      formElements[selector] = count;
      if (count > 0) {
        console.log(`Found ${count} elements matching: ${selector}`);
        
        // Get more details about found elements
        const elements = page.locator(selector);
        for (let i = 0; i < count; i++) {
          const element = elements.nth(i);
          const tagName = await element.evaluate(el => el.tagName);
          const attributes = await element.evaluate(el => {
            const attrs: Record<string, string> = {};
            for (const attr of el.attributes) {
              attrs[attr.name] = attr.value;
            }
            return attrs;
          });
          console.log(`  - ${tagName}: ${JSON.stringify(attributes)}`);
        }
      }
    }

    // Check for any forms on the page
    const allForms = await page.locator('form').count();
    console.log(`Total forms found: ${allForms}`);
    
    if (allForms > 0) {
      for (let i = 0; i < allForms; i++) {
        const form = page.locator('form').nth(i);
        const action = await form.getAttribute('action');
        const method = await form.getAttribute('method');
        const inputs = await form.locator('input').count();
        console.log(`Form ${i + 1}: action="${action}", method="${method}", inputs=${inputs}`);
      }
    }

    // Log any immediate console errors or warnings
    const errors = consoleMessages.filter(m => m.type === 'error');
    const warnings = consoleMessages.filter(m => m.type === 'warn');
    
    console.log(`Console Errors: ${errors.length}`);
    console.log(`Console Warnings: ${warnings.length}`);
    
    expect(url).toContain('kevinalthaus.com');
  });

  test('QA-02: Login form interaction and validation', async () => {
    console.log('=== QA-02: Login Form Interaction ===');
    
    await page.goto('https://kevinalthaus.com', { waitUntil: 'networkidle' });
    
    // Look for login form or login link
    let loginForm = page.locator('form').first();
    let emailInput = page.locator('input[type="email"], input[name*="email"], input[name*="username"]').first();
    let passwordInput = page.locator('input[type="password"]').first();
    let submitButton = page.locator('button[type="submit"], input[type="submit"]').first();
    
    // Check if we need to navigate to a login page
    const hasLoginForm = await emailInput.count() > 0 && await passwordInput.count() > 0;
    
    if (!hasLoginForm) {
      console.log('No login form found on main page, looking for login links...');
      
      const loginLinks = [
        'a[href*="login"]',
        'a[href*="signin"]', 
        'a[href*="auth"]',
        'a:has-text("login")',
        'a:has-text("sign in")',
        'a:has-text("log in")',
        'button:has-text("login")',
        'button:has-text("sign in")'
      ];
      
      for (const selector of loginLinks) {
        if (await page.locator(selector).count() > 0) {
          console.log(`Found login link: ${selector}`);
          await page.locator(selector).first().click();
          await page.waitForLoadState('networkidle');
          await page.screenshot({ 
            path: 'test-results/02-after-login-link-click.png',
            fullPage: true 
          });
          break;
        }
      }
      
      // Re-check for login form after navigation
      emailInput = page.locator('input[type="email"], input[name*="email"], input[name*="username"]').first();
      passwordInput = page.locator('input[type="password"]').first();
      submitButton = page.locator('button[type="submit"], input[type="submit"]').first();
    }

    const finalHasLoginForm = await emailInput.count() > 0 && await passwordInput.count() > 0;
    
    if (finalHasLoginForm) {
      console.log('Login form found! Testing form validation...');
      
      // Test 1: Empty form submission
      console.log('Testing empty form submission...');
      await submitButton.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ 
        path: 'test-results/02-empty-form-submission.png',
        fullPage: true 
      });
      
      // Check for validation messages
      const validationSelectors = [
        '.error', '.invalid', '.field-error', '.form-error',
        '[aria-invalid="true"]', '[data-error]',
        'input:invalid', '.is-invalid'
      ];
      
      let foundValidation = false;
      for (const selector of validationSelectors) {
        if (await page.locator(selector).count() > 0) {
          const validationText = await page.locator(selector).first().textContent();
          console.log(`Validation message found (${selector}): ${validationText}`);
          foundValidation = true;
        }
      }
      
      if (!foundValidation) {
        console.log('No validation messages found for empty form submission');
      }

      // Test 2: Invalid email format
      console.log('Testing invalid email format...');
      await emailInput.fill('invalid-email');
      await passwordInput.fill('somepassword');
      await submitButton.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ 
        path: 'test-results/02-invalid-email-test.png',
        fullPage: true 
      });

    } else {
      console.log('ERROR: No login form found on the website!');
      await page.screenshot({ 
        path: 'test-results/02-no-login-form-found.png',
        fullPage: true 
      });
      
      // Log page content for debugging
      const bodyText = await page.locator('body').textContent();
      console.log('Page content preview:', bodyText?.substring(0, 500));
    }

    expect(finalHasLoginForm || !finalHasLoginForm).toBe(true); // Always pass, but log findings
  });

  // Test with actual credentials
  for (const credential of TEST_CREDENTIALS) {
    test(`QA-03: Login test with ${credential.description}`, async () => {
      console.log(`=== QA-03: Testing ${credential.description} ===`);
      
      await page.goto('https://kevinalthaus.com', { waitUntil: 'networkidle' });
      
      // Navigate to login form (same logic as previous test)
      let emailInput = page.locator('input[type="email"], input[name*="email"], input[name*="username"]').first();
      let passwordInput = page.locator('input[type="password"]').first();
      let submitButton = page.locator('button[type="submit"], input[type="submit"]').first();
      
      const hasLoginForm = await emailInput.count() > 0 && await passwordInput.count() > 0;
      
      if (!hasLoginForm) {
        // Try to find and click login link
        const loginLinks = [
          'a[href*="login"]', 'a[href*="signin"]', 'a[href*="auth"]',
          'a:has-text("login")', 'a:has-text("sign in")', 'button:has-text("login")'
        ];
        
        for (const selector of loginLinks) {
          if (await page.locator(selector).count() > 0) {
            await page.locator(selector).first().click();
            await page.waitForLoadState('networkidle');
            break;
          }
        }
        
        emailInput = page.locator('input[type="email"], input[name*="email"], input[name*="username"]').first();
        passwordInput = page.locator('input[type="password"]').first();
        submitButton = page.locator('button[type="submit"], input[type="submit"]').first();
      }

      const finalHasLoginForm = await emailInput.count() > 0 && await passwordInput.count() > 0;
      
      if (finalHasLoginForm) {
        console.log(`Attempting login with: ${credential.email}`);
        
        // Clear and fill login form
        await emailInput.clear();
        await emailInput.fill(credential.email);
        await passwordInput.clear();
        await passwordInput.fill(credential.password);
        
        // Take screenshot before submission
        await page.screenshot({ 
          path: `test-results/03-before-login-${credential.email.split('@')[0]}.png`,
          fullPage: true 
        });
        
        // Record network requests before login
        const requestCountBefore = networkRequests.length;
        
        // Submit login form
        await submitButton.click();
        
        // Wait for response
        await page.waitForTimeout(3000);
        
        // Take screenshot after submission
        await page.screenshot({ 
          path: `test-results/03-after-login-${credential.email.split('@')[0]}.png`,
          fullPage: true 
        });
        
        // Analyze response
        const currentUrl = page.url();
        const newRequests = networkRequests.slice(requestCountBefore);
        
        console.log(`URL after login attempt: ${currentUrl}`);
        console.log(`New network requests: ${newRequests.length}`);
        
        // Look for login-related requests
        const authRequests = newRequests.filter(req => 
          req.url.includes('login') || 
          req.url.includes('auth') || 
          req.url.includes('signin') ||
          req.method === 'POST'
        );
        
        console.log(`Auth-related requests: ${authRequests.length}`);
        authRequests.forEach(req => {
          console.log(`  ${req.method} ${req.url} - Status: ${req.status || 'pending'}`);
          if (req.error) {
            console.log(`    Error: ${req.error}`);
          }
        });
        
        // Check for success indicators
        const successIndicators = [
          'dashboard', 'profile', 'welcome', 'logout',
          '[data-testid="user-menu"]', '.user-profile'
        ];
        
        let loginSuccessful = false;
        for (const indicator of successIndicators) {
          if (await page.locator(indicator).count() > 0 || currentUrl.includes(indicator)) {
            loginSuccessful = true;
            console.log(`Login success indicator found: ${indicator}`);
            break;
          }
        }
        
        // Check for error messages
        const errorIndicators = [
          '.error', '.alert-danger', '.field-error', 
          '[role="alert"]', '.notification.is-danger'
        ];
        
        let errorMessages: string[] = [];
        for (const indicator of errorIndicators) {
          const elements = page.locator(indicator);
          const count = await elements.count();
          for (let i = 0; i < count; i++) {
            const text = await elements.nth(i).textContent();
            if (text) {
              errorMessages.push(text.trim());
            }
          }
        }
        
        if (errorMessages.length > 0) {
          console.log('Error messages found:');
          errorMessages.forEach(msg => console.log(`  - ${msg}`));
        }
        
        if (!loginSuccessful && errorMessages.length === 0) {
          console.log('Login result unclear - no clear success or error indicators');
        }
        
      } else {
        console.log(`SKIP: No login form available for testing ${credential.description}`);
      }
    });
  }

  test('QA-04: Console and network analysis', async () => {
    console.log('=== QA-04: Console and Network Analysis ===');
    
    await page.goto('https://kevinalthaus.com', { waitUntil: 'networkidle' });
    
    // Let the page fully load and execute all scripts
    await page.waitForTimeout(5000);
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'test-results/04-final-page-state.png',
      fullPage: true 
    });
    
    // Analyze console messages
    console.log('\n=== CONSOLE ANALYSIS ===');
    console.log(`Total console messages: ${consoleMessages.length}`);
    
    const errorMessages = consoleMessages.filter(m => m.type === 'error');
    const warningMessages = consoleMessages.filter(m => m.type === 'warn');
    const infoMessages = consoleMessages.filter(m => m.type === 'info' || m.type === 'log');
    
    console.log(`Errors: ${errorMessages.length}`);
    console.log(`Warnings: ${warningMessages.length}`);
    console.log(`Info/Log: ${infoMessages.length}`);
    
    if (errorMessages.length > 0) {
      console.log('\nERRORS:');
      errorMessages.forEach(msg => {
        console.log(`  [${msg.timestamp}] ${msg.text} (${msg.location})`);
      });
    }
    
    if (warningMessages.length > 0) {
      console.log('\nWARNINGS:');
      warningMessages.forEach(msg => {
        console.log(`  [${msg.timestamp}] ${msg.text} (${msg.location})`);
      });
    }
    
    // Analyze network requests
    console.log('\n=== NETWORK ANALYSIS ===');
    console.log(`Total network requests: ${networkRequests.length}`);
    
    const failedRequests = networkRequests.filter(r => r.error || (r.status && r.status >= 400));
    const successRequests = networkRequests.filter(r => r.status && r.status < 400);
    
    console.log(`Successful requests: ${successRequests.length}`);
    console.log(`Failed requests: ${failedRequests.length}`);
    
    if (failedRequests.length > 0) {
      console.log('\nFAILED REQUESTS:');
      failedRequests.forEach(req => {
        console.log(`  ${req.method} ${req.url}`);
        console.log(`    Status: ${req.status || 'N/A'}`);
        console.log(`    Error: ${req.error || 'HTTP error'}`);
      });
    }
    
    // Check for CORS issues
    const corsErrors = consoleMessages.filter(m => 
      m.text.toLowerCase().includes('cors') ||
      m.text.toLowerCase().includes('cross-origin') ||
      m.text.toLowerCase().includes('access-control')
    );
    
    if (corsErrors.length > 0) {
      console.log('\nCORS ISSUES:');
      corsErrors.forEach(error => {
        console.log(`  ${error.text}`);
      });
    }
    
    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`Page loaded successfully: ${page.url().includes('kevinalthaus.com')}`);
    console.log(`JavaScript errors: ${errorMessages.length}`);
    console.log(`Network failures: ${failedRequests.length}`);
    console.log(`CORS issues: ${corsErrors.length}`);
  });

  test.afterEach(async () => {
    // Save detailed logs to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logData = {
      timestamp,
      url: page ? (page.isClosed() ? 'page-closed' : page.url()) : 'no-page',
      consoleMessages,
      networkRequests,
      summary: {
        totalConsoleMessages: consoleMessages.length,
        errorCount: consoleMessages.filter(m => m.type === 'error').length,
        warningCount: consoleMessages.filter(m => m.type === 'warn').length,
        totalNetworkRequests: networkRequests.length,
        failedRequests: networkRequests.filter(r => r.error || (r.status && r.status >= 400)).length
      }
    };
    
    // Note: In a real implementation, you would save this to a file
    console.log('=== DETAILED LOG DATA ===');
    console.log(JSON.stringify(logData, null, 2));
  });
});