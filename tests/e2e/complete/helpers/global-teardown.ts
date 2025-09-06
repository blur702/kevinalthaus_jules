import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Global teardown for comprehensive E2E testing
 * - Cleans up test data
 * - Generates final reports
 * - Archives test artifacts
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...');

  // Generate consolidated test report
  await generateTestReport();

  // Clean up temporary files (but keep important artifacts)
  await cleanupTempFiles();

  // Archive test results
  await archiveTestResults();

  console.log('✅ Global teardown completed');
}

/**
 * Generate comprehensive test report
 */
async function generateTestReport(): Promise<void> {
  try {
    const reportsDir = path.join(__dirname, '..', 'reports');
    const resultsFile = path.join(reportsDir, 'results.json');
    
    if (!fs.existsSync(resultsFile)) {
      console.warn('⚠️ No test results found to generate report');
      return;
    }

    const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
    
    // Generate summary statistics
    const summary = {
      timestamp: new Date().toISOString(),
      totalTests: results.suites?.reduce((acc, suite) => acc + (suite.tests?.length || 0), 0) || 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      duration: results.stats?.duration || 0,
      projects: {},
      categories: {
        core: { passed: 0, failed: 0, skipped: 0 },
        auth: { passed: 0, failed: 0, skipped: 0 },
        api: { passed: 0, failed: 0, skipped: 0 },
        plugins: { passed: 0, failed: 0, skipped: 0 },
        visual: { passed: 0, failed: 0, skipped: 0 },
        performance: { passed: 0, failed: 0, skipped: 0 },
        security: { passed: 0, failed: 0, skipped: 0 },
        accessibility: { passed: 0, failed: 0, skipped: 0 }
      }
    };

    // Process test results
    if (results.suites) {
      results.suites.forEach(suite => {
        if (suite.tests) {
          suite.tests.forEach(test => {
            const status = test.status || 'unknown';
            const projectName = test.projectName || 'unknown';
            
            // Count by status
            switch (status) {
              case 'passed':
                summary.passedTests++;
                break;
              case 'failed':
                summary.failedTests++;
                break;
              case 'skipped':
                summary.skippedTests++;
                break;
            }

            // Count by project
            if (!summary.projects[projectName]) {
              summary.projects[projectName] = { passed: 0, failed: 0, skipped: 0 };
            }
            summary.projects[projectName][status]++;

            // Count by category (based on file path)
            const filePath = test.location?.file || '';
            let category = 'core';
            
            if (filePath.includes('/auth/')) category = 'auth';
            else if (filePath.includes('/api/')) category = 'api';
            else if (filePath.includes('/plugins/')) category = 'plugins';
            else if (filePath.includes('/visual/')) category = 'visual';
            else if (filePath.includes('/performance/')) category = 'performance';
            else if (filePath.includes('/security/')) category = 'security';
            else if (filePath.includes('/accessibility/')) category = 'accessibility';

            if (summary.categories[category]) {
              summary.categories[category][status]++;
            }
          });
        }
      });
    }

    // Write summary report
    const summaryPath = path.join(reportsDir, 'test-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    // Generate markdown report
    const markdownReport = generateMarkdownReport(summary, results);
    const markdownPath = path.join(reportsDir, 'TEST-REPORT.md');
    fs.writeFileSync(markdownPath, markdownReport);

    console.log('✅ Test reports generated');
  } catch (error) {
    console.error('❌ Failed to generate test report:', error);
  }
}

/**
 * Generate markdown test report
 */
function generateMarkdownReport(summary: any, results: any): string {
  const successRate = summary.totalTests > 0 
    ? ((summary.passedTests / summary.totalTests) * 100).toFixed(1)
    : '0';

  const overallStatus = parseFloat(successRate) >= 90 ? '✅ EXCELLENT' :
                       parseFloat(successRate) >= 75 ? '⚠️ GOOD' :
                       parseFloat(successRate) >= 50 ? '⚠️ NEEDS IMPROVEMENT' :
                       '❌ CRITICAL';

  return `# Comprehensive E2E Test Report

Generated: ${new Date().toLocaleString()}

## Overall Assessment: ${overallStatus}

**Success Rate: ${successRate}%**

## Summary Statistics

- **Total Tests:** ${summary.totalTests}
- **Passed:** ${summary.passedTests} ✅
- **Failed:** ${summary.failedTests} ❌
- **Skipped:** ${summary.skippedTests} ⏭️
- **Duration:** ${(summary.duration / 1000).toFixed(1)}s

## Results by Category

${Object.entries(summary.categories).map(([category, stats]: [string, any]) => {
  const total = stats.passed + stats.failed + stats.skipped;
  const rate = total > 0 ? ((stats.passed / total) * 100).toFixed(1) : '0';
  const status = parseFloat(rate) >= 90 ? '✅' : parseFloat(rate) >= 75 ? '⚠️' : '❌';
  
  return `### ${category.charAt(0).toUpperCase() + category.slice(1)} Tests ${status}
- Passed: ${stats.passed}
- Failed: ${stats.failed}
- Skipped: ${stats.skipped}
- Success Rate: ${rate}%`;
}).join('\n\n')}

## Results by Browser/Project

${Object.entries(summary.projects).map(([project, stats]: [string, any]) => {
  const total = stats.passed + stats.failed + stats.skipped;
  const rate = total > 0 ? ((stats.passed / total) * 100).toFixed(1) : '0';
  
  return `### ${project}
- Passed: ${stats.passed}
- Failed: ${stats.failed}
- Skipped: ${stats.skipped}
- Success Rate: ${rate}%`;
}).join('\n\n')}

## Critical Issues

${summary.failedTests > 0 ? `${summary.failedTests} tests failed. Please review the detailed HTML report for specific failures.` : 'No critical issues found! 🎉'}

## Recommendations

${generateRecommendations(summary)}

---

*This report was generated automatically by the Shell Platform E2E Test Suite*
`;
}

/**
 * Generate recommendations based on test results
 */
function generateRecommendations(summary: any): string {
  const recommendations = [];
  
  const successRate = summary.totalTests > 0 
    ? (summary.passedTests / summary.totalTests) * 100
    : 0;

  if (successRate < 50) {
    recommendations.push('🚨 **CRITICAL**: Success rate is below 50%. Do not deploy to production.');
    recommendations.push('- Review all failing tests immediately');
    recommendations.push('- Consider rolling back recent changes');
  } else if (successRate < 75) {
    recommendations.push('⚠️ **WARNING**: Success rate is below 75%. Deployment requires careful review.');
    recommendations.push('- Investigate failing tests before deployment');
    recommendations.push('- Consider deploying to staging environment first');
  } else if (successRate < 90) {
    recommendations.push('✅ **GOOD**: Success rate is good but could be improved.');
    recommendations.push('- Review minor failures and flaky tests');
    recommendations.push('- Consider improving test stability');
  } else {
    recommendations.push('🎉 **EXCELLENT**: All tests are passing or success rate is above 90%.');
    recommendations.push('- Application is ready for deployment');
    recommendations.push('- Continue monitoring for any new regressions');
  }

  // Category-specific recommendations
  Object.entries(summary.categories).forEach(([category, stats]: [string, any]) => {
    const total = stats.passed + stats.failed + stats.skipped;
    if (total > 0) {
      const rate = (stats.passed / total) * 100;
      if (rate < 80) {
        recommendations.push(`- **${category}**: Needs attention (${rate.toFixed(1)}% success rate)`);
      }
    }
  });

  return recommendations.length > 0 ? recommendations.join('\n') : 'No specific recommendations at this time.';
}

/**
 * Clean up temporary files
 */
async function cleanupTempFiles(): Promise<void> {
  try {
    // Clean up old auth states (they'll be regenerated next run)
    const authStatesDir = path.join(__dirname, '..', 'fixtures', 'auth-states');
    if (fs.existsSync(authStatesDir)) {
      fs.readdirSync(authStatesDir).forEach(file => {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(authStatesDir, file));
        }
      });
    }

    console.log('✅ Temporary files cleaned up');
  } catch (error) {
    console.warn('⚠️ Failed to clean up temporary files:', error);
  }
}

/**
 * Archive test results with timestamp
 */
async function archiveTestResults(): Promise<void> {
  try {
    const reportsDir = path.join(__dirname, '..', 'reports');
    const archiveDir = path.join(__dirname, '..', 'archive');
    
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archivePath = path.join(archiveDir, `test-results-${timestamp}`);
    
    if (fs.existsSync(reportsDir)) {
      fs.mkdirSync(archivePath, { recursive: true });
      
      // Copy key files to archive
      const filesToArchive = ['test-summary.json', 'TEST-REPORT.md', 'results.json'];
      filesToArchive.forEach(file => {
        const srcPath = path.join(reportsDir, file);
        const destPath = path.join(archivePath, file);
        
        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, destPath);
        }
      });

      console.log(`✅ Test results archived to ${archivePath}`);
    }
  } catch (error) {
    console.warn('⚠️ Failed to archive test results:', error);
  }
}

export default globalTeardown;