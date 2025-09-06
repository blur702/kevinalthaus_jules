import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test setup...');

  // Launch browser for setup
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for the development server to be ready
    console.log('⏳ Waiting for development server...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    console.log('✅ Development server is ready');

    // Setup test data if needed
    await setupTestData(page);

    // Create authenticated state for tests that need it
    await createAuthenticatedState(page);

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('✅ E2E test setup completed');
}

async function setupTestData(page: any) {
  // This would typically set up test data in your backend
  // For now, we'll just ensure the app loads properly
  console.log('📋 Setting up test data...');
  
  // Check if the app loads without errors
  const title = await page.title();
  if (!title.includes('Shell Platform')) {
    throw new Error('App did not load correctly');
  }
  
  console.log('✅ Test data setup completed');
}

async function createAuthenticatedState(page: any) {
  console.log('🔐 Creating authenticated state...');
  
  // Create a test user session
  // This would typically involve making API calls to your backend
  // For demo purposes, we'll set up localStorage with mock tokens
  
  await page.addInitScript(() => {
    // Mock authenticated state in localStorage
    localStorage.setItem('shell-auth', JSON.stringify({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      user: {
        id: 'test-user-1',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        roles: ['user'],
        permissions: ['dashboard.read', 'plugins.read'],
      },
    }));

    // Mock theme preferences
    localStorage.setItem('shell-theme', JSON.stringify({
      mode: 'light',
      primaryColor: '#3b82f6',
      accentColor: '#6366f1',
      fontSize: 'medium',
    }));
  });
  
  console.log('✅ Authenticated state created');
}

export default globalSetup;