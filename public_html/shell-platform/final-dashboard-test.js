const { chromium } = require('playwright');

(async () => {
  console.log('=== FINAL DASHBOARD VERIFICATION TEST ===');
  console.log('Testing: https://kevinalthaus.com');
  console.log('Credentials: kevin.althaus@gmail.com / (130Bpm)');
  console.log('=========================================\n');
  
  const browser = await chromium.launch({ headless: true });
  
  try {
    const page = await browser.newPage();
    
    // Monitor console
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push({type: msg.type(), text: msg.text()});
    });
    
    console.log('STEP 1: Navigate to site...');
    await page.goto('https://kevinalthaus.com', { waitUntil: 'networkidle', timeout: 30000 });
    const initialUrl = page.url();
    console.log('✓ Initial URL:', initialUrl);
    
    // Check if we're on login page
    const loginForm = await page.$('input[type="email"]');
    if (loginForm) {
      console.log('✓ Login page loaded\n');
      
      console.log('STEP 2: Enter credentials...');
      await page.fill('input[type="email"]', 'kevin.althaus@gmail.com');
      console.log('✓ Email entered');
      
      await page.fill('input[type="password"]', '(130Bpm)');
      console.log('✓ Password entered\n');
      
      console.log('STEP 3: Submit login form...');
      await Promise.all([
        page.waitForLoadState('networkidle'),
        page.click('button[type="submit"]')
      ]);
      console.log('✓ Form submitted\n');
      
      // Wait for potential redirect
      await page.waitForTimeout(3000);
    }
    
    console.log('STEP 4: Verify authentication status...');
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Get page content
    const pageContent = await page.content();
    const pageText = await page.textContent('body');
    
    // Check for dashboard indicators
    const checks = {
      notOnLoginPage: !currentUrl.includes('/login'),
      noPasswordField: !(await page.$('input[type="password"]')),
      hasDashboardWord: pageText.toLowerCase().includes('dashboard'),
      hasWelcome: pageText.toLowerCase().includes('welcome'),
      hasShellPlatform: pageText.toLowerCase().includes('shell platform'),
      hasUserEmail: pageText.includes('kevin.althaus@gmail.com'),
      hasUsername: pageText.includes('admin'),
      hasNavigation: (await page.$$('nav, aside')).length > 0,
      hasLogout: pageText.toLowerCase().includes('logout') || pageText.toLowerCase().includes('sign out'),
    };
    
    console.log('\nAuthentication Check Results:');
    console.log('  ✓ Not on login page:', checks.notOnLoginPage);
    console.log('  ✓ No password field:', checks.noPasswordField);
    console.log('  ✓ Contains "dashboard":', checks.hasDashboardWord);
    console.log('  ✓ Contains "welcome":', checks.hasWelcome);
    console.log('  ✓ Contains "shell platform":', checks.hasShellPlatform);
    console.log('  ✓ Shows user email:', checks.hasUserEmail);
    console.log('  ✓ Shows username:', checks.hasUsername);
    console.log('  ✓ Has navigation:', checks.hasNavigation);
    console.log('  ✓ Has logout option:', checks.hasLogout);
    
    // Get main heading if exists
    const headings = await page.$$eval('h1, h2', elements => 
      elements.slice(0, 3).map(el => el.textContent.trim())
    );
    if (headings.length > 0) {
      console.log('\nPage Headings:');
      headings.forEach(h => console.log('  -', h));
    }
    
    // Check for main content areas
    const mainContent = await page.$('main');
    if (mainContent) {
      const mainText = await mainContent.textContent();
      console.log('\nMain content area found with', mainText.length, 'characters');
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'final-dashboard-state.png', fullPage: true });
    console.log('\nScreenshot saved: final-dashboard-state.png');
    
    // Calculate success score
    const successScore = Object.values(checks).filter(v => v).length;
    const totalChecks = Object.keys(checks).length;
    
    console.log('\n=========================================');
    console.log('FINAL RESULT:', successScore + '/' + totalChecks, 'checks passed');
    
    if (successScore >= 6) {
      console.log('✅ SUCCESS: Dashboard is accessible after authentication!');
      console.log('The user has been successfully authenticated and can access the dashboard.');
    } else if (successScore >= 3) {
      console.log('⚠️  PARTIAL SUCCESS: Some authentication features working');
      console.log('Authentication appears partially functional but dashboard may not be fully loaded.');
    } else {
      console.log('❌ FAILED: Dashboard is not accessible');
      console.log('User remains on login page or authentication is not working.');
    }
    
    // Report any console errors
    const errors = consoleMessages.filter(m => m.type === 'error');
    if (errors.length > 0) {
      console.log('\nConsole Errors Found:', errors.length);
      errors.slice(0, 3).forEach(e => console.log('  -', e.text.substring(0, 100)));
    }
    
  } catch (error) {
    console.error('TEST ERROR:', error.message);
  } finally {
    await browser.close();
    console.log('\n=== TEST COMPLETE ===');
  }
})();