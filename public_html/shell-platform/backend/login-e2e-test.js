const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'https://kevinalthaus.com',
  credentials: {
    email: 'kevin.althaus@gmail.com',
    password: '(130Bpm)'
  },
  timeout: 30000,
  headless: true, // Run in headless mode for server environment
  viewport: { width: 1920, height: 1080 }
};

// Test results storage
const testResults = {
  overall: 'HIGH', // Will be updated based on findings
  summary: {
    functional: 0,
    console: 0,
    visual: 0,
    total: 0
  },
  functionalBugs: [],
  consoleErrors: [],
  visualDiscrepancies: [],
  authenticationResults: {},
  navigationResults: {},
  logoutResults: {}
};

// Console message handlers
function setupConsoleMonitoring(page) {
  const consoleMessages = [];
  
  page.on('console', msg => {
    const message = {
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
      timestamp: new Date().toISOString()
    };
    
    consoleMessages.push(message);
    
    if (msg.type() === 'error' || msg.type() === 'warning') {
      testResults.consoleErrors.push({
        errorMessage: msg.text(),
        stackTrace: msg.location(),
        triggeringAction: 'Page load or interaction',
        location: page.url(),
        timestamp: message.timestamp
      });
      testResults.summary.console++;
      testResults.summary.total++;
    }
  });
  
  page.on('pageerror', error => {
    testResults.consoleErrors.push({
      errorMessage: error.message,
      stackTrace: error.stack,
      triggeringAction: 'JavaScript execution error',
      location: page.url(),
      timestamp: new Date().toISOString()
    });
    testResults.summary.console++;
    testResults.summary.total++;
  });
  
  return consoleMessages;
}

// Screenshot comparison utility
async function takeScreenshot(page, name, step) {
  const screenshotPath = `/var/www/public_html/shell-platform/backend/screenshots/${name}-${step}-${Date.now()}.png`;
  await page.screenshot({ 
    path: screenshotPath, 
    fullPage: true 
  });
  return screenshotPath;
}

// Authentication state checker
async function checkAuthenticationState(page) {
  try {
    // Check for authentication tokens in localStorage
    const localStorage = await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        items[key] = localStorage.getItem(key);
      }
      return items;
    });
    
    // Check for authentication cookies
    const cookies = await page.context().cookies();
    const authCookies = cookies.filter(cookie => 
      cookie.name.toLowerCase().includes('auth') || 
      cookie.name.toLowerCase().includes('token') ||
      cookie.name.toLowerCase().includes('session')
    );
    
    // Check for JWT tokens or session indicators
    const hasAuthToken = Object.keys(localStorage).some(key => 
      key.toLowerCase().includes('auth') || 
      key.toLowerCase().includes('token') ||
      key.toLowerCase().includes('jwt')
    );
    
    return {
      localStorage,
      cookies,
      authCookies,
      hasAuthToken,
      isAuthenticated: hasAuthToken || authCookies.length > 0
    };
  } catch (error) {
    console.log('Error checking authentication state:', error.message);
    return { isAuthenticated: false, error: error.message };
  }
}

// Form interaction utilities
async function fillLoginForm(page, credentials) {
  try {
    // Wait for the login form to be visible
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Try to find email/username field
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[name="username"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="username" i]',
      '#email',
      '#username'
    ];
    
    let emailField = null;
    for (const selector of emailSelectors) {
      try {
        emailField = await page.waitForSelector(selector, { timeout: 2000 });
        if (emailField) break;
      } catch (e) {
        continue;
      }
    }
    
    if (!emailField) {
      throw new Error('Could not find email/username input field');
    }
    
    // Try to find password field
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      '#password'
    ];
    
    let passwordField = null;
    for (const selector of passwordSelectors) {
      try {
        passwordField = await page.waitForSelector(selector, { timeout: 2000 });
        if (passwordField) break;
      } catch (e) {
        continue;
      }
    }
    
    if (!passwordField) {
      throw new Error('Could not find password input field');
    }
    
    // Fill the form
    await emailField.fill(credentials.email);
    await passwordField.fill(credentials.password);
    
    // Take screenshot before submission
    const preSubmitScreenshot = await takeScreenshot(page, 'login-form', 'pre-submit');
    
    return { success: true, preSubmitScreenshot };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function submitLoginForm(page) {
  try {
    // Find and click submit button
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Sign In")',
      'button:has-text("Login")',
      'button:has-text("Log In")',
      '.login-button',
      '#login-submit'
    ];
    
    let submitButton = null;
    for (const selector of submitSelectors) {
      try {
        submitButton = await page.waitForSelector(selector, { timeout: 2000 });
        if (submitButton) break;
      } catch (e) {
        continue;
      }
    }
    
    if (!submitButton) {
      // Try pressing Enter on the form
      await page.keyboard.press('Enter');
    } else {
      await submitButton.click();
    }
    
    // Wait for navigation or response
    await page.waitForTimeout(3000);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Main test execution
async function runLoginE2ETest() {
  console.log('Starting comprehensive login E2E test...');
  console.log('Target URL:', TEST_CONFIG.baseUrl);
  
  const browser = await chromium.launch({ 
    headless: TEST_CONFIG.headless,
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
  });
  
  const context = await browser.newContext({
    viewport: TEST_CONFIG.viewport,
    recordVideo: {
      dir: '/var/www/public_html/shell-platform/backend/videos/',
      size: TEST_CONFIG.viewport
    }
  });
  
  const page = await context.newPage();
  
  // Setup console monitoring
  const consoleMessages = setupConsoleMonitoring(page);
  
  // Create screenshots directory
  const screenshotsDir = '/var/www/public_html/shell-platform/backend/screenshots';
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  
  try {
    console.log('Step 1: Navigate to the website');
    await page.goto(TEST_CONFIG.baseUrl, { timeout: TEST_CONFIG.timeout });
    
    // Take initial screenshot
    const initialScreenshot = await takeScreenshot(page, 'initial-load', 'homepage');
    console.log('Initial screenshot saved:', initialScreenshot);
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('Step 2: Look for login form or login button');
    
    // Check if login form is already visible
    const loginFormVisible = await page.isVisible('form').catch(() => false);
    
    if (!loginFormVisible) {
      // Look for login link/button
      const loginSelectors = [
        'a:has-text("Sign In")',
        'a:has-text("Login")',
        'a:has-text("Log In")',
        'button:has-text("Sign In")',
        'button:has-text("Login")',
        '.login-btn',
        '#login-link',
        '[href*="login"]',
        '[href*="signin"]'
      ];
      
      let loginLink = null;
      for (const selector of loginSelectors) {
        try {
          loginLink = await page.waitForSelector(selector, { timeout: 3000 });
          if (loginLink) {
            console.log('Found login link:', selector);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (loginLink) {
        await loginLink.click();
        await page.waitForTimeout(2000);
      } else {
        // Try navigating to common login paths
        const loginPaths = ['/login', '/signin', '/auth/login'];
        let loginPageFound = false;
        
        for (const path of loginPaths) {
          try {
            await page.goto(TEST_CONFIG.baseUrl + path);
            await page.waitForTimeout(2000);
            const hasForm = await page.isVisible('form');
            if (hasForm) {
              loginPageFound = true;
              console.log('Login form found at:', path);
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (!loginPageFound) {
          testResults.functionalBugs.push({
            issue: 'No login form or login access found',
            location: TEST_CONFIG.baseUrl,
            expectedBehavior: 'Should have accessible login form or login link',
            actualBehavior: 'No login mechanism found on the page',
            artifacts: initialScreenshot
          });
          testResults.summary.functional++;
          testResults.summary.total++;
        }
      }
    }
    
    console.log('Step 3: Fill and submit login form');
    
    // Take screenshot of login page
    const loginPageScreenshot = await takeScreenshot(page, 'login-page', 'loaded');
    
    // Fill login form
    const formFillResult = await fillLoginForm(page, TEST_CONFIG.credentials);
    
    if (!formFillResult.success) {
      testResults.functionalBugs.push({
        issue: 'Cannot fill login form',
        location: page.url(),
        expectedBehavior: 'Should be able to locate and fill email and password fields',
        actualBehavior: formFillResult.error,
        artifacts: loginPageScreenshot
      });
      testResults.summary.functional++;
      testResults.summary.total++;
      testResults.authenticationResults.formFillable = false;
    } else {
      testResults.authenticationResults.formFillable = true;
      console.log('Login form filled successfully');
    }
    
    // Submit the form
    const submitResult = await submitLoginForm(page);
    
    if (!submitResult.success) {
      testResults.functionalBugs.push({
        issue: 'Cannot submit login form',
        location: page.url(),
        expectedBehavior: 'Should be able to submit login form',
        actualBehavior: submitResult.error,
        artifacts: formFillResult.preSubmitScreenshot
      });
      testResults.summary.functional++;
      testResults.summary.total++;
    }
    
    console.log('Step 4: Check authentication state after login');
    
    // Wait for potential redirect
    await page.waitForTimeout(5000);
    
    // Take post-login screenshot
    const postLoginScreenshot = await takeScreenshot(page, 'post-login', 'result');
    
    // Check authentication state
    const authState = await checkAuthenticationState(page);
    testResults.authenticationResults = {
      ...testResults.authenticationResults,
      ...authState,
      postLoginUrl: page.url(),
      redirectOccurred: page.url() !== TEST_CONFIG.baseUrl
    };
    
    console.log('Authentication state:', authState);
    
    if (!authState.isAuthenticated) {
      // Check for error messages on the login page
      const errorSelectors = [
        '.error',
        '.alert-danger',
        '.invalid-feedback',
        '[class*="error"]',
        '[id*="error"]'
      ];
      
      let errorMessage = '';
      for (const selector of errorSelectors) {
        try {
          const errorEl = await page.$(selector);
          if (errorEl) {
            errorMessage = await errorEl.textContent();
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      testResults.functionalBugs.push({
        issue: 'Login authentication failed',
        location: page.url(),
        expectedBehavior: 'Should authenticate user and set session/tokens',
        actualBehavior: errorMessage || 'No authentication tokens found after login attempt',
        artifacts: postLoginScreenshot
      });
      testResults.summary.functional++;
      testResults.summary.total++;
    }
    
    console.log('Step 5: Test authenticated navigation');
    
    if (authState.isAuthenticated) {
      // Test dashboard/profile access
      const protectedPaths = ['/dashboard', '/profile', '/account', '/admin'];
      
      for (const path of protectedPaths) {
        try {
          await page.goto(TEST_CONFIG.baseUrl + path);
          await page.waitForTimeout(2000);
          
          const currentUrl = page.url();
          const isAccessible = !currentUrl.includes('/login') && !currentUrl.includes('/signin');
          
          testResults.navigationResults[path] = {
            accessible: isAccessible,
            finalUrl: currentUrl,
            screenshot: await takeScreenshot(page, `protected-${path.replace('/', '')}`, 'access')
          };
          
          if (!isAccessible) {
            testResults.functionalBugs.push({
              issue: `Cannot access protected route: ${path}`,
              location: TEST_CONFIG.baseUrl + path,
              expectedBehavior: 'Authenticated user should access protected routes',
              actualBehavior: `Redirected to: ${currentUrl}`,
              artifacts: testResults.navigationResults[path].screenshot
            });
            testResults.summary.functional++;
            testResults.summary.total++;
          }
          
        } catch (error) {
          testResults.navigationResults[path] = {
            accessible: false,
            error: error.message
          };
        }
      }
      
      console.log('Step 6: Test logout functionality');
      
      // Look for logout button/link
      const logoutSelectors = [
        'a:has-text("Logout")',
        'a:has-text("Log Out")',
        'a:has-text("Sign Out")',
        'button:has-text("Logout")',
        'button:has-text("Log Out")',
        'button:has-text("Sign Out")',
        '.logout-btn',
        '#logout-link',
        '[href*="logout"]'
      ];
      
      let logoutLink = null;
      for (const selector of logoutSelectors) {
        try {
          logoutLink = await page.waitForSelector(selector, { timeout: 3000 });
          if (logoutLink) {
            console.log('Found logout link:', selector);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (logoutLink) {
        await logoutLink.click();
        await page.waitForTimeout(3000);
        
        const postLogoutAuth = await checkAuthenticationState(page);
        testResults.logoutResults = {
          logoutLinkFound: true,
          authStateAfterLogout: postLogoutAuth,
          finalUrl: page.url(),
          screenshot: await takeScreenshot(page, 'post-logout', 'result')
        };
        
        if (postLogoutAuth.isAuthenticated) {
          testResults.functionalBugs.push({
            issue: 'Logout functionality not working',
            location: page.url(),
            expectedBehavior: 'Should clear authentication tokens and redirect to public page',
            actualBehavior: 'User still appears to be authenticated after logout',
            artifacts: testResults.logoutResults.screenshot
          });
          testResults.summary.functional++;
          testResults.summary.total++;
        }
      } else {
        testResults.logoutResults = {
          logoutLinkFound: false,
          error: 'No logout link found'
        };
        
        testResults.functionalBugs.push({
          issue: 'No logout functionality found',
          location: page.url(),
          expectedBehavior: 'Should have accessible logout link/button',
          actualBehavior: 'No logout mechanism found',
          artifacts: await takeScreenshot(page, 'no-logout', 'search')
        });
        testResults.summary.functional++;
        testResults.summary.total++;
      }
    }
    
  } catch (error) {
    console.error('Test execution error:', error);
    testResults.functionalBugs.push({
      issue: 'Test execution failed',
      location: page.url(),
      expectedBehavior: 'Test should complete without errors',
      actualBehavior: error.message,
      artifacts: await takeScreenshot(page, 'test-error', 'failure')
    });
    testResults.summary.functional++;
    testResults.summary.total++;
  } finally {
    await context.close();
    await browser.close();
  }
  
  // Update overall assessment based on findings
  if (testResults.summary.total === 0) {
    testResults.overall = 'HIGH';
  } else if (testResults.summary.total <= 2) {
    testResults.overall = 'MEDIUM';
  } else {
    testResults.overall = 'LOW';
  }
  
  return testResults;
}

// Generate comprehensive report
function generateQAReport(results) {
  const report = `
# Comprehensive E2E Login Test Report

## Overall Assessment: ${results.overall} Confidence Level

**Summary**: ${results.summary.total} total issues found
- Functional Issues: ${results.summary.functional}
- Console Errors: ${results.summary.console}  
- Visual Discrepancies: ${results.summary.visual}

---

## Authentication Test Results

### Form Interaction
- **Form Fillable**: ${results.authenticationResults.formFillable ? 'PASS' : 'FAIL'}
- **Post-Login URL**: ${results.authenticationResults.postLoginUrl || 'N/A'}
- **Redirect Occurred**: ${results.authenticationResults.redirectOccurred ? 'YES' : 'NO'}

### Authentication State
- **Authenticated**: ${results.authenticationResults.isAuthenticated ? 'YES' : 'NO'}
- **Has Auth Token**: ${results.authenticationResults.hasAuthToken ? 'YES' : 'NO'}
- **Auth Cookies Found**: ${results.authenticationResults.authCookies ? results.authenticationResults.authCookies.length : 0}

### Local Storage Contents
${results.authenticationResults.localStorage ? JSON.stringify(results.authenticationResults.localStorage, null, 2) : 'N/A'}

---

## Navigation Test Results

${Object.entries(results.navigationResults).map(([path, result]) => `
### ${path}
- **Accessible**: ${result.accessible ? 'YES' : 'NO'}
- **Final URL**: ${result.finalUrl || 'N/A'}
- **Error**: ${result.error || 'None'}
`).join('')}

---

## Logout Test Results

- **Logout Link Found**: ${results.logoutResults.logoutLinkFound ? 'YES' : 'NO'}
- **Final URL**: ${results.logoutResults.finalUrl || 'N/A'}
- **Auth Cleared**: ${results.logoutResults.authStateAfterLogout ? !results.logoutResults.authStateAfterLogout.isAuthenticated : 'N/A'}

---

## 1. Functional Bugs

${results.functionalBugs.length === 0 ? 'No functional issues found.' : 
results.functionalBugs.map((bug, index) => `
### Issue ${index + 1}: ${bug.issue}
- **Location**: ${bug.location}
- **Expected Behavior**: ${bug.expectedBehavior}
- **Actual Behavior**: ${bug.actualBehavior}
- **Artifacts**: ${bug.artifacts}
`).join('')}

---

## 2. Console Errors

${results.consoleErrors.length === 0 ? 'No console errors detected.' :
results.consoleErrors.map((error, index) => `
### Error ${index + 1}
- **Error Message**: ${error.errorMessage}
- **Stack Trace**: ${error.stackTrace}
- **Triggering Action**: ${error.triggeringAction}
- **Location**: ${error.location}
- **Timestamp**: ${error.timestamp}
`).join('')}

---

## 3. Visual Discrepancies

${results.visualDiscrepancies.length === 0 ? 'No visual discrepancies detected.' :
results.visualDiscrepancies.map((issue, index) => `
### Issue ${index + 1}: ${issue.issue}
- **Location**: ${issue.location}
- **Artifacts**: ${issue.artifacts}
`).join('')}

---

## Test Execution Summary

- **Test Start**: ${new Date().toISOString()}
- **Target URL**: ${TEST_CONFIG.baseUrl}
- **Test Credentials**: ${TEST_CONFIG.credentials.email}
- **Browser**: Chromium (Playwright)
- **Viewport**: ${TEST_CONFIG.viewport.width}x${TEST_CONFIG.viewport.height}

## Recommendations

${results.summary.total === 0 ? 
'✅ All tests passed. The login functionality appears to be working correctly.' :
`⚠️ Found ${results.summary.total} issues that should be addressed before release:

${results.functionalBugs.length > 0 ? '- Review and fix functional login issues' : ''}
${results.consoleErrors.length > 0 ? '- Investigate and resolve console errors' : ''}
${results.summary.total > 3 ? '- Consider additional testing after fixes are implemented' : ''}`}
`;

  return report;
}

// Execute the test
(async () => {
  try {
    const results = await runLoginE2ETest();
    const report = generateQAReport(results);
    
    // Save report to file
    const reportPath = `/var/www/public_html/shell-platform/backend/login-test-report-${Date.now()}.md`;
    fs.writeFileSync(reportPath, report);
    
    console.log('\n' + '='.repeat(80));
    console.log(report);
    console.log('='.repeat(80));
    console.log(`\nDetailed report saved to: ${reportPath}`);
    
    // Exit with appropriate code
    process.exit(results.summary.total > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('Test runner failed:', error);
    process.exit(1);
  }
})();