#!/usr/bin/env node
/**
 * Comprehensive Test Automation Runner for Shell Platform
 * Executes all test types: Unit, Integration, E2E, Security, Performance
 */

const { exec, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class TestRunner {
  constructor() {
    this.results = {
      unit: { passed: 0, failed: 0, coverage: 0, duration: 0 },
      integration: { passed: 0, failed: 0, duration: 0 },
      e2e: { passed: 0, failed: 0, duration: 0 },
      security: { vulnerabilities: 0, critical: 0, high: 0, medium: 0, low: 0 },
      performance: { avgResponseTime: 0, throughput: 0, errors: 0 },
      overall: { success: false, startTime: Date.now(), endTime: null }
    };
    this.testOutputDir = path.join(process.cwd(), 'test-results');
  }

  async init() {
    console.log('🚀 Shell Platform Comprehensive Test Automation Started');
    console.log('====================================================\n');
    
    await this.ensureOutputDir();
    this.results.overall.startTime = Date.now();
  }

  async ensureOutputDir() {
    try {
      await fs.mkdir(this.testOutputDir, { recursive: true });
      await fs.mkdir(path.join(this.testOutputDir, 'coverage'), { recursive: true });
      await fs.mkdir(path.join(this.testOutputDir, 'security'), { recursive: true });
      await fs.mkdir(path.join(this.testOutputDir, 'performance'), { recursive: true });
    } catch (error) {
      console.error('Error creating output directories:', error.message);
    }
  }

  async runCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      console.log(`📋 Executing: ${command}`);
      const startTime = Date.now();
      
      exec(command, { ...options, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        const duration = Date.now() - startTime;
        
        if (error) {
          console.error(`❌ Command failed (${duration}ms): ${command}`);
          console.error('Error:', error.message);
          if (stderr) console.error('Stderr:', stderr);
          resolve({ success: false, error: error.message, stdout, stderr, duration });
        } else {
          console.log(`✅ Command completed (${duration}ms): ${command}`);
          resolve({ success: true, stdout, stderr, duration });
        }
      });
    });
  }

  async runUnitTests() {
    console.log('\n🧪 Running Unit Tests');
    console.log('=====================\n');

    const unitTestResult = await this.runCommand(
      'npm run test:unit -- --coverage --coverageReporters=json --coverageReporters=lcov --coverageReporters=text',
      { timeout: 300000 }
    );

    if (unitTestResult.success) {
      // Parse Jest output for test results
      const output = unitTestResult.stdout;
      const testMatch = output.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/);
      const coverageMatch = output.match(/All files[^|]*\|\s*(\d+\.?\d*)/);
      
      if (testMatch) {
        this.results.unit.passed = parseInt(testMatch[1]);
        this.results.unit.failed = parseInt(testMatch[2]) - parseInt(testMatch[1]);
      }
      
      if (coverageMatch) {
        this.results.unit.coverage = parseFloat(coverageMatch[1]);
      }
      
      this.results.unit.duration = unitTestResult.duration;
      
      console.log(`✅ Unit Tests: ${this.results.unit.passed} passed, ${this.results.unit.failed} failed`);
      console.log(`📊 Coverage: ${this.results.unit.coverage}%`);
    } else {
      this.results.unit.failed = 1;
      console.error('❌ Unit tests failed');
    }

    return unitTestResult.success;
  }

  async runIntegrationTests() {
    console.log('\n🔗 Running Integration Tests');
    console.log('============================\n');

    // Start services if not running
    console.log('🐳 Starting test services...');
    await this.runCommand('docker-compose -f docker-compose.yml up -d --wait', { timeout: 120000 });

    const integrationResult = await this.runCommand(
      'npm run test:integration',
      { timeout: 300000 }
    );

    if (integrationResult.success) {
      const output = integrationResult.stdout;
      const testMatch = output.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/);
      
      if (testMatch) {
        this.results.integration.passed = parseInt(testMatch[1]);
        this.results.integration.failed = parseInt(testMatch[2]) - parseInt(testMatch[1]);
      }
      
      this.results.integration.duration = integrationResult.duration;
      console.log(`✅ Integration Tests: ${this.results.integration.passed} passed, ${this.results.integration.failed} failed`);
    } else {
      this.results.integration.failed = 1;
      console.error('❌ Integration tests failed');
    }

    return integrationResult.success;
  }

  async runE2ETests() {
    console.log('\n🎭 Running End-to-End Tests');
    console.log('===========================\n');

    // Install Playwright browsers if needed
    console.log('🎭 Installing Playwright browsers...');
    await this.runCommand('npx playwright install', { timeout: 300000 });

    const e2eResult = await this.runCommand(
      'npm run test:e2e',
      { timeout: 600000 }
    );

    if (e2eResult.success) {
      const output = e2eResult.stdout;
      const testMatch = output.match(/(\d+)\s+passed.*(\d+)\s+failed/);
      
      if (testMatch) {
        this.results.e2e.passed = parseInt(testMatch[1]);
        this.results.e2e.failed = parseInt(testMatch[2]);
      }
      
      this.results.e2e.duration = e2eResult.duration;
      console.log(`✅ E2E Tests: ${this.results.e2e.passed} passed, ${this.results.e2e.failed} failed`);
    } else {
      this.results.e2e.failed = 1;
      console.error('❌ E2E tests failed');
    }

    return e2eResult.success;
  }

  async runSecurityTests() {
    console.log('\n🔒 Running Security Tests');
    console.log('=========================\n');

    // Run npm audit
    console.log('🔍 Running npm audit...');
    const auditResult = await this.runCommand('npm audit --json', { timeout: 120000 });
    
    if (auditResult.success || auditResult.stdout) {
      try {
        const auditData = JSON.parse(auditResult.stdout);
        if (auditData.vulnerabilities) {
          this.results.security.vulnerabilities = Object.keys(auditData.vulnerabilities).length;
          
          Object.values(auditData.vulnerabilities).forEach(vuln => {
            switch (vuln.severity) {
              case 'critical': this.results.security.critical++; break;
              case 'high': this.results.security.high++; break;
              case 'medium': this.results.security.medium++; break;
              case 'low': this.results.security.low++; break;
            }
          });
        }
        
        console.log(`🔍 Security Audit Complete:`);
        console.log(`  - Critical: ${this.results.security.critical}`);
        console.log(`  - High: ${this.results.security.high}`);
        console.log(`  - Medium: ${this.results.security.medium}`);
        console.log(`  - Low: ${this.results.security.low}`);
        
      } catch (error) {
        console.error('❌ Failed to parse audit results:', error.message);
      }
    }

    // Run ESLint security plugin
    console.log('🛡️  Running ESLint security checks...');
    const eslintResult = await this.runCommand('npm run lint', { timeout: 120000 });
    
    if (!eslintResult.success) {
      console.log('⚠️  ESLint found security issues (see output above)');
    }

    return true; // Security tests don't fail the overall build
  }

  async runPerformanceTests() {
    console.log('\n⚡ Running Performance Tests');
    console.log('============================\n');

    // Create a simple performance test script
    const performanceTestScript = `
const axios = require('axios');

async function performanceTest() {
  const baseURL = 'http://localhost';
  const requests = [];
  const startTime = Date.now();
  
  console.log('Running performance tests against', baseURL);
  
  // Test API endpoints
  const endpoints = [
    '/',
    '/api/health',
    '/api/plugins',
    '/api/auth/status'
  ];
  
  let successCount = 0;
  let errorCount = 0;
  const responseTimes = [];
  
  for (let i = 0; i < 10; i++) {
    for (const endpoint of endpoints) {
      try {
        const reqStart = Date.now();
        const response = await axios.get(baseURL + endpoint, { timeout: 5000 });
        const responseTime = Date.now() - reqStart;
        responseTimes.push(responseTime);
        
        if (response.status === 200) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
        console.log('Request failed:', endpoint, error.message);
      }
    }
  }
  
  const totalTime = Date.now() - startTime;
  const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const throughput = (successCount * 1000) / totalTime; // requests per second
  
  console.log('Performance Results:');
  console.log('- Total requests:', successCount + errorCount);
  console.log('- Successful requests:', successCount);
  console.log('- Failed requests:', errorCount);
  console.log('- Average response time:', Math.round(avgResponseTime), 'ms');
  console.log('- Throughput:', Math.round(throughput), 'req/s');
  
  return { avgResponseTime, throughput, errors: errorCount };
}

performanceTest().then(results => {
  console.log(JSON.stringify(results));
}).catch(error => {
  console.error('Performance test failed:', error.message);
  process.exit(1);
});
`;

    // Write performance test
    const perfTestPath = path.join(this.testOutputDir, 'performance-test.js');
    await fs.writeFile(perfTestPath, performanceTestScript);

    // Run performance test
    console.log('🏃‍♂️ Running performance benchmark...');
    const perfResult = await this.runCommand(`node ${perfTestPath}`, { timeout: 120000 });
    
    if (perfResult.success) {
      try {
        const output = perfResult.stdout;
        const jsonMatch = output.match(/\{[^}]+\}/);
        if (jsonMatch) {
          const perfData = JSON.parse(jsonMatch[0]);
          this.results.performance = { ...this.results.performance, ...perfData };
        }
        
        console.log(`✅ Performance Test Complete:`);
        console.log(`  - Avg Response Time: ${this.results.performance.avgResponseTime}ms`);
        console.log(`  - Throughput: ${this.results.performance.throughput} req/s`);
        console.log(`  - Errors: ${this.results.performance.errors}`);
      } catch (error) {
        console.error('❌ Failed to parse performance results:', error.message);
      }
    }

    return perfResult.success;
  }

  async generateReport() {
    console.log('\n📊 Generating Test Report');
    console.log('=========================\n');

    this.results.overall.endTime = Date.now();
    const totalDuration = this.results.overall.endTime - this.results.overall.startTime;

    // Determine overall success
    const unitSuccess = this.results.unit.failed === 0 && this.results.unit.coverage >= 80;
    const integrationSuccess = this.results.integration.failed === 0;
    const e2eSuccess = this.results.e2e.failed === 0;
    const securityAcceptable = this.results.security.critical === 0 && this.results.security.high <= 5;
    const performanceAcceptable = this.results.performance.avgResponseTime <= 1000;

    this.results.overall.success = unitSuccess && integrationSuccess && e2eSuccess && securityAcceptable && performanceAcceptable;

    const report = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      success: this.results.overall.success,
      results: this.results,
      summary: {
        totalTests: this.results.unit.passed + this.results.unit.failed + 
                   this.results.integration.passed + this.results.integration.failed +
                   this.results.e2e.passed + this.results.e2e.failed,
        passedTests: this.results.unit.passed + this.results.integration.passed + this.results.e2e.passed,
        failedTests: this.results.unit.failed + this.results.integration.failed + this.results.e2e.failed,
        coveragePercent: this.results.unit.coverage,
        securityIssues: this.results.security.critical + this.results.security.high,
        deploymentReady: this.results.overall.success
      },
      recommendations: this.generateRecommendations()
    };

    // Write JSON report
    const reportPath = path.join(this.testOutputDir, 'comprehensive-test-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Write human-readable report
    const humanReport = this.generateHumanReport(report);
    const humanReportPath = path.join(this.testOutputDir, 'test-summary.md');
    await fs.writeFile(humanReportPath, humanReport);

    console.log(`📋 Reports generated:`);
    console.log(`  - JSON: ${reportPath}`);
    console.log(`  - Summary: ${humanReportPath}`);

    return report;
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.results.unit.coverage < 80) {
      recommendations.push(`Increase unit test coverage from ${this.results.unit.coverage}% to at least 80%`);
    }

    if (this.results.security.critical > 0) {
      recommendations.push(`Fix ${this.results.security.critical} critical security vulnerabilities immediately`);
    }

    if (this.results.security.high > 5) {
      recommendations.push(`Address ${this.results.security.high} high-severity security issues`);
    }

    if (this.results.performance.avgResponseTime > 1000) {
      recommendations.push(`Optimize API performance - average response time is ${this.results.performance.avgResponseTime}ms`);
    }

    if (this.results.unit.failed > 0 || this.results.integration.failed > 0 || this.results.e2e.failed > 0) {
      recommendations.push('Fix all failing tests before deployment');
    }

    if (recommendations.length === 0) {
      recommendations.push('All tests passed! System is ready for deployment.');
    }

    return recommendations;
  }

  generateHumanReport(report) {
    return `# Shell Platform Test Report

**Generated:** ${report.timestamp}
**Duration:** ${Math.round(report.duration / 1000)}s
**Status:** ${report.success ? '✅ PASSED' : '❌ FAILED'}

## Test Summary

- **Total Tests:** ${report.summary.totalTests}
- **Passed:** ${report.summary.passedTests}
- **Failed:** ${report.summary.failedTests}
- **Coverage:** ${report.summary.coveragePercent}%
- **Security Issues:** ${report.summary.securityIssues}
- **Deployment Ready:** ${report.summary.deploymentReady ? 'YES' : 'NO'}

## Detailed Results

### Unit Tests
- Passed: ${report.results.unit.passed}
- Failed: ${report.results.unit.failed}
- Coverage: ${report.results.unit.coverage}%
- Duration: ${Math.round(report.results.unit.duration / 1000)}s

### Integration Tests
- Passed: ${report.results.integration.passed}
- Failed: ${report.results.integration.failed}
- Duration: ${Math.round(report.results.integration.duration / 1000)}s

### E2E Tests
- Passed: ${report.results.e2e.passed}
- Failed: ${report.results.e2e.failed}
- Duration: ${Math.round(report.results.e2e.duration / 1000)}s

### Security
- Critical: ${report.results.security.critical}
- High: ${report.results.security.high}
- Medium: ${report.results.security.medium}
- Low: ${report.results.security.low}

### Performance
- Avg Response Time: ${report.results.performance.avgResponseTime}ms
- Throughput: ${report.results.performance.throughput} req/s
- Errors: ${report.results.performance.errors}

## Recommendations

${report.recommendations.map(rec => `- ${rec}`).join('\n')}

---
Generated by Shell Platform Test Automation
`;
  }

  async printSummary() {
    console.log('\n🎯 Test Execution Summary');
    console.log('=========================\n');

    const totalDuration = this.results.overall.endTime - this.results.overall.startTime;
    console.log(`⏱️  Total Duration: ${Math.round(totalDuration / 1000)}s`);
    console.log(`🧪 Unit Tests: ${this.results.unit.passed} passed, ${this.results.unit.failed} failed (${this.results.unit.coverage}% coverage)`);
    console.log(`🔗 Integration Tests: ${this.results.integration.passed} passed, ${this.results.integration.failed} failed`);
    console.log(`🎭 E2E Tests: ${this.results.e2e.passed} passed, ${this.results.e2e.failed} failed`);
    console.log(`🔒 Security: ${this.results.security.critical} critical, ${this.results.security.high} high severity issues`);
    console.log(`⚡ Performance: ${this.results.performance.avgResponseTime}ms avg response, ${this.results.performance.throughput} req/s`);
    
    if (this.results.overall.success) {
      console.log('\n🎉 ALL TESTS PASSED - SYSTEM READY FOR DEPLOYMENT! 🎉');
    } else {
      console.log('\n❌ SOME TESTS FAILED - SYSTEM NOT READY FOR DEPLOYMENT');
    }
    
    console.log('\n📁 Test results saved to:', this.testOutputDir);
  }

  async run() {
    try {
      await this.init();

      const unitSuccess = await this.runUnitTests();
      const integrationSuccess = await this.runIntegrationTests();
      const e2eSuccess = await this.runE2ETests();
      const securitySuccess = await this.runSecurityTests();
      const performanceSuccess = await this.runPerformanceTests();

      await this.generateReport();
      await this.printSummary();

      // Cleanup
      console.log('\n🧹 Cleaning up test environment...');
      await this.runCommand('docker-compose down', { timeout: 60000 });

      process.exit(this.results.overall.success ? 0 : 1);

    } catch (error) {
      console.error('\n💥 Fatal error during test execution:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.run();
}

module.exports = TestRunner;