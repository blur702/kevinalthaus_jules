import { chromium, FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Global setup for comprehensive E2E testing
 * - Starts test database and services
 * - Sets up test data fixtures
 * - Configures authentication state
 * - Prepares visual regression baselines
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');

  // Create necessary directories
  const testDirs = [
    'reports',
    'reports/screenshots',
    'reports/videos',
    'reports/traces',
    'reports/performance',
    'fixtures/auth-states',
    'visual/baselines'
  ];

  testDirs.forEach(dir => {
    const fullPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });

  // Wait for the application to be ready
  console.log('⏳ Waiting for application to be ready...');
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';
  
  try {
    // Wait up to 60 seconds for the app to be ready
    await waitForUrl(baseURL, 60000);
    console.log('✅ Application is ready');
  } catch (error) {
    console.error('❌ Application failed to start:', error);
    throw error;
  }

  // Setup test authentication states
  console.log('🔐 Setting up authentication states...');
  await setupAuthStates(baseURL);

  // Setup test data
  console.log('📊 Setting up test data...');
  await setupTestData();

  // Capture visual baselines if they don't exist
  console.log('📸 Setting up visual baselines...');
  await setupVisualBaselines(baseURL);

  console.log('✅ Global setup completed successfully');
}

/**
 * Wait for URL to be accessible
 */
async function waitForUrl(url: string, timeout: number): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch (error) {
      // Continue waiting
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error(`URL ${url} is not accessible after ${timeout}ms`);
}

/**
 * Setup authentication states for different user types
 */
async function setupAuthStates(baseURL: string): Promise<void> {
  const browser = await chromium.launch();
  
  try {
    // Admin user state
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    
    await adminPage.goto(`${baseURL}/auth/login`);
    
    // Check if login form exists
    const loginForm = await adminPage.locator('form[data-testid="login-form"]').first();
    if (await loginForm.isVisible()) {
      await adminPage.fill('input[name="email"]', 'admin@shellplatform.test');
      await adminPage.fill('input[name="password"]', 'admin123');
      await adminPage.click('button[type="submit"]');
      
      // Wait for successful login
      await adminPage.waitForURL(/dashboard|home/);
    }
    
    await adminContext.storageState({ path: 'fixtures/auth-states/admin.json' });
    await adminContext.close();

    // Regular user state
    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();
    
    await userPage.goto(`${baseURL}/auth/login`);
    
    const userLoginForm = await userPage.locator('form[data-testid="login-form"]').first();
    if (await userLoginForm.isVisible()) {
      await userPage.fill('input[name="email"]', 'user@shellplatform.test');
      await userPage.fill('input[name="password"]', 'user123');
      await userPage.click('button[type="submit"]');
      
      await userPage.waitForURL(/dashboard|home/);
    }
    
    await userContext.storageState({ path: 'fixtures/auth-states/user.json' });
    await userContext.close();

    console.log('✅ Authentication states created');
  } catch (error) {
    console.warn('⚠️ Could not create auth states (app might not have auth):', error.message);
  } finally {
    await browser.close();
  }
}

/**
 * Setup test data in database
 */
async function setupTestData(): Promise<void> {
  try {
    // Check if there's a seed script available
    const shellPlatformDir = '/var/www/public_html/shell-platform';
    
    if (fs.existsSync(path.join(shellPlatformDir, 'package.json'))) {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(shellPlatformDir, 'package.json'), 'utf8')
      );
      
      if (packageJson.scripts && packageJson.scripts['db:seed']) {
        execSync('npm run db:seed', { 
          cwd: shellPlatformDir,
          stdio: 'inherit' 
        });
        console.log('✅ Test data seeded');
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not seed test data:', error.message);
  }
}

/**
 * Setup visual regression baselines
 */
async function setupVisualBaselines(baseURL: string): Promise<void> {
  const baselinesDir = path.join(__dirname, '..', 'visual', 'baselines');
  
  // Check if baselines already exist
  if (fs.existsSync(baselinesDir) && fs.readdirSync(baselinesDir).length > 0) {
    console.log('✅ Visual baselines already exist');
    return;
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  try {
    // Capture key page baselines
    const pages = [
      { name: 'homepage', url: '/' },
      { name: 'login', url: '/auth/login' },
      { name: 'dashboard', url: '/dashboard' },
      { name: 'settings', url: '/settings' }
    ];

    for (const pageDef of pages) {
      try {
        await page.goto(`${baseURL}${pageDef.url}`);
        await page.waitForLoadState('networkidle');
        
        const screenshotPath = path.join(baselinesDir, `${pageDef.name}.png`);
        await page.screenshot({ 
          path: screenshotPath, 
          fullPage: true 
        });
        
        console.log(`✅ Baseline captured for ${pageDef.name}`);
      } catch (error) {
        console.warn(`⚠️ Could not capture baseline for ${pageDef.name}:`, error.message);
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;