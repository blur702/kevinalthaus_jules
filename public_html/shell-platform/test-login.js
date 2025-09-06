const { chromium } = require('playwright');

(async () => {
  console.log('Starting E2E Login Test for https://kevinalthaus.com');
  const browser = await chromium.launch({ headless: true });
  
  try {
    const page = await browser.newPage();
    
    // Monitor console for errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    console.log('\n1. Navigating to https://kevinalthaus.com...');
    await page.goto('https://kevinalthaus.com', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    const initialUrl = page.url();
    console.log('   Current URL:', initialUrl);
    
    // Take screenshot of login page
    await page.screenshot({ path: 'before-login.png' });
    console.log('   Screenshot saved: before-login.png');
    
    console.log('\n2. Filling login form...');
    // Fill email
    await page.fill('input[type="email"]', 'kevin.althaus@gmail.com');
    console.log('   Email entered: kevin.althaus@gmail.com');
    
    // Fill password
    await page.fill('input[type="password"]', '(130Bpm)');
    console.log('   Password entered: ********');
    
    // Take screenshot with filled form
    await page.screenshot({ path: 'form-filled.png' });
    console.log('   Screenshot saved: form-filled.png');
    
    console.log('\n3. Submitting login form...');
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation or state change
    console.log('   Waiting for response...');
    await page.waitForTimeout(5000); // Give time for redirect
    
    const afterLoginUrl = page.url();
    console.log('   Current URL after login:', afterLoginUrl);
    
    // Take screenshot after login
    await page.screenshot({ path: 'after-login.png', fullPage: true });
    console.log('   Screenshot saved: after-login.png');
    
    // Check if we're on dashboard
    const isDashboard = afterLoginUrl.includes('dashboard');
    const isStillOnLogin = afterLoginUrl.includes('login');
    
    console.log('\n4. Checking authentication status...');
    if (isDashboard) {
      console.log('   ✅ SUCCESS: Redirected to dashboard!');
      
      // Check for dashboard content
      const pageContent = await page.content();
      const hasDashboardContent = pageContent.toLowerCase().includes('dashboard');
      console.log('   Dashboard content found:', hasDashboardContent);
      
      // Check for user info
      const hasUserInfo = pageContent.includes('kevin.althaus@gmail.com') || 
                          pageContent.includes('admin');
      console.log('   User info displayed:', hasUserInfo);
      
    } else if (isStillOnLogin) {
      console.log('   ❌ FAILED: Still on login page');
      console.log('   Login did not redirect to dashboard');
      
      // Check for error messages
      const errorElements = await page.$$('.text-red-600, .text-red-500, .text-red-400, [class*="error"]');
      if (errorElements.length > 0) {
        console.log('   Error messages found on page');
        for (const element of errorElements) {
          const text = await element.textContent();
          if (text) console.log('   Error:', text.trim());
        }
      }
    } else {
      console.log('   ⚠️  Redirected to:', afterLoginUrl);
      console.log('   Not on dashboard or login page');
    }
    
    // Check for console errors
    if (consoleErrors.length > 0) {
      console.log('\n5. Console errors detected:');
      consoleErrors.forEach(err => console.log('   -', err.substring(0, 100)));
    } else {
      console.log('\n5. No console errors detected');
    }
    
    // Try to access dashboard directly if not already there
    if (!isDashboard) {
      console.log('\n6. Attempting direct dashboard access...');
      await page.goto('https://kevinalthaus.com/dashboard', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      
      const dashboardUrl = page.url();
      console.log('   Dashboard URL:', dashboardUrl);
      
      if (dashboardUrl.includes('dashboard')) {
        console.log('   ✅ Dashboard accessible directly');
        await page.screenshot({ path: 'dashboard-direct.png', fullPage: true });
        console.log('   Screenshot saved: dashboard-direct.png');
      } else {
        console.log('   ❌ Cannot access dashboard directly');
        console.log('   Redirected to:', dashboardUrl);
      }
    }
    
    console.log('\n=== TEST COMPLETE ===');
    console.log('Login Test Result:', isDashboard ? 'PASSED' : 'FAILED');
    
  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await browser.close();
  }
})();