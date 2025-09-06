const { chromium } = require('playwright');

(async () => {
  console.log('Starting Dashboard Verification Test');
  const browser = await chromium.launch({ headless: true });
  
  try {
    const page = await browser.newPage();
    
    console.log('\n1. Logging in to https://kevinalthaus.com...');
    await page.goto('https://kevinalthaus.com', { waitUntil: 'networkidle' });
    
    // Fill and submit login form
    await page.fill('input[type="email"]', 'kevin.althaus@gmail.com');
    await page.fill('input[type="password"]', '(130Bpm)');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log('   Current URL:', currentUrl);
    
    // Get page content
    const pageText = await page.textContent('body');
    
    // Check for dashboard indicators
    console.log('\n2. Checking for Dashboard content...');
    
    const hasDashboard = pageText.toLowerCase().includes('dashboard');
    const hasWelcome = pageText.toLowerCase().includes('welcome');
    const hasShellPlatform = pageText.toLowerCase().includes('shell platform');
    const hasUser = pageText.includes('admin') || pageText.includes('kevin.althaus@gmail.com');
    const hasLogout = pageText.toLowerCase().includes('logout') || pageText.toLowerCase().includes('sign out');
    
    console.log('   Contains "dashboard":', hasDashboard);
    console.log('   Contains "welcome":', hasWelcome);
    console.log('   Contains "shell platform":', hasShellPlatform);
    console.log('   Shows user info:', hasUser);
    console.log('   Has logout option:', hasLogout);
    
    // Check for navigation elements
    const navElements = await page.$$('nav a, nav button, aside a, aside button');
    console.log('   Navigation elements found:', navElements.length);
    
    // Take screenshot
    await page.screenshot({ path: 'dashboard-content.png', fullPage: true });
    console.log('   Screenshot saved: dashboard-content.png');
    
    // Get specific dashboard elements
    const heading = await page.$('h1, h2');
    if (heading) {
      const headingText = await heading.textContent();
      console.log('   Main heading:', headingText);
    }
    
    // Check if still on login page
    const hasLoginForm = await page.$('input[type="password"]');
    if (hasLoginForm) {
      console.log('\n❌ FAILED: Still showing login form');
    } else {
      console.log('\n✅ SUCCESS: Login form not present - User is authenticated');
    }
    
    console.log('\n=== TEST RESULT ===');
    if (currentUrl.includes('login')) {
      console.log('Status: FAILED - Still on login page');
    } else if (hasDashboard || hasWelcome || navElements.length > 3) {
      console.log('Status: PASSED - Dashboard is accessible and showing content');
      console.log('The dashboard is displayed at the root path "/" as designed.');
    } else {
      console.log('Status: UNKNOWN - Authenticated but dashboard content unclear');
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await browser.close();
  }
})();