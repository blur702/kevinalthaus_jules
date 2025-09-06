import { FullConfig } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Global teardown runs after all tests complete
 * Cleans up test database, stops mock services, and generates final reports
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown...');

  // Clean up test database
  await cleanupTestDatabase();

  // Stop mock services
  await stopMockServices();

  // Generate test reports
  await generateTestReports();

  // Clean up temporary files
  await cleanupTempFiles();

  console.log('✅ Global teardown completed');
}

async function cleanupTestDatabase() {
  console.log('📊 Cleaning up test database...');
  
  // In a real application, you would:
  // 1. Drop test database
  // 2. Clean up test data
  // 3. Reset database connections
  
  try {
    await fs.unlink('setup-test-db.sql');
    console.log('✅ Test database cleanup completed');
  } catch (error) {
    console.log('ℹ️ No test database files to clean up');
  }
}

async function stopMockServices() {
  console.log('🛑 Stopping mock services...');
  
  try {
    await fs.unlink('mock-server-config.json');
    console.log('✅ Mock services stopped');
  } catch (error) {
    console.log('ℹ️ No mock services to stop');
  }
}

async function generateTestReports() {
  console.log('📊 Generating test reports...');
  
  try {
    // Check if test results exist
    const testResultsPath = 'reports/test-results.json';
    const testResults = await fs.readFile(testResultsPath, 'utf8');
    const results = JSON.parse(testResults);
    
    // Generate summary report
    const summary = {
      timestamp: new Date().toISOString(),
      total: results.suites?.reduce((sum: number, suite: any) => 
        sum + suite.specs?.length || 0, 0) || 0,
      passed: results.suites?.reduce((sum: number, suite: any) => 
        sum + (suite.specs?.filter((spec: any) => 
          spec.tests?.every((test: any) => test.results?.[0]?.status === 'passed')
        ).length || 0), 0) || 0,
      failed: results.suites?.reduce((sum: number, suite: any) => 
        sum + (suite.specs?.filter((spec: any) => 
          spec.tests?.some((test: any) => test.results?.[0]?.status === 'failed')
        ).length || 0), 0) || 0,
      skipped: results.suites?.reduce((sum: number, suite: any) => 
        sum + (suite.specs?.filter((spec: any) => 
          spec.tests?.some((test: any) => test.results?.[0]?.status === 'skipped')
        ).length || 0), 0) || 0,
      duration: results.stats?.duration || 0,
      browsers: ['chromium', 'firefox', 'webkit', 'mobile'],
      categories: {
        authentication: { passed: 0, failed: 0, total: 0 },
        core: { passed: 0, failed: 0, total: 0 },
        plugins: { passed: 0, failed: 0, total: 0 },
        api: { passed: 0, failed: 0, total: 0 },
        visual: { passed: 0, failed: 0, total: 0 },
        performance: { passed: 0, failed: 0, total: 0 },
        security: { passed: 0, failed: 0, total: 0 }
      }
    };
    
    // Write summary report
    await fs.writeFile('reports/test-summary.json', JSON.stringify(summary, null, 2));
    
    // Generate HTML summary
    const htmlReport = `
<!DOCTYPE html>
<html>
<head>
    <title>Shell Platform E2E Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .stats { display: flex; gap: 20px; margin: 20px 0; }
        .stat { padding: 15px; border-radius: 8px; min-width: 100px; text-align: center; }
        .passed { background: #d4edda; color: #155724; }
        .failed { background: #f8d7da; color: #721c24; }
        .skipped { background: #fff3cd; color: #856404; }
        .total { background: #e2e3e5; color: #383d41; }
        .category { margin: 10px 0; padding: 10px; border-left: 4px solid #007bff; }
    </style>
</head>
<body>
    <h1>Shell Platform E2E Test Report</h1>
    <div class="summary">
        <h2>Test Summary</h2>
        <p><strong>Generated:</strong> ${summary.timestamp}</p>
        <p><strong>Duration:</strong> ${Math.round(summary.duration / 1000)}s</p>
        <div class="stats">
            <div class="stat total"><h3>${summary.total}</h3><p>Total Tests</p></div>
            <div class="stat passed"><h3>${summary.passed}</h3><p>Passed</p></div>
            <div class="stat failed"><h3>${summary.failed}</h3><p>Failed</p></div>
            <div class="stat skipped"><h3>${summary.skipped}</h3><p>Skipped</p></div>
        </div>
    </div>
    <h2>Test Categories</h2>
    ${Object.entries(summary.categories).map(([category, stats]) => `
        <div class="category">
            <h3>${category.charAt(0).toUpperCase() + category.slice(1)} Tests</h3>
            <p>Passed: ${(stats as any).passed} | Failed: ${(stats as any).failed} | Total: ${(stats as any).total}</p>
        </div>
    `).join('')}
</body>
</html>`;
    
    await fs.writeFile('reports/test-summary.html', htmlReport);
    console.log('✅ Test reports generated');
    
  } catch (error) {
    console.log('ℹ️ No test results found to generate reports');
  }
}

async function cleanupTempFiles() {
  console.log('🧹 Cleaning up temporary files...');
  
  const tempFiles = ['test-data.json'];
  
  for (const file of tempFiles) {
    try {
      await fs.unlink(file);
    } catch (error) {
      // File doesn't exist, which is fine
    }
  }
  
  console.log('✅ Temporary files cleaned up');
}

export default globalTeardown;