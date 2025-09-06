#!/usr/bin/env node
/**
 * Test Automation Runner for Shell Platform (No Docker Required)
 * Executes tests that can run without Docker services
 */

const { exec, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class TestRunner {
  constructor() {
    this.results = {
      unit: { passed: 0, failed: 0, coverage: 0, duration: 0 },
      integration: { passed: 0, failed: 0, duration: 0, skipped: true },
      e2e: { passed: 0, failed: 0, duration: 0 },
      security: { vulnerabilities: 0, critical: 0, high: 0, medium: 0, low: 0 },
      performance: { avgResponseTime: 0, throughput: 0, errors: 0, skipped: true },
      overall: { success: false, startTime: Date.now(), endTime: null }
    };
    this.testOutputDir = path.join(process.cwd(), 'test-results');
  }

  async init() {
    console.log('🚀 Shell Platform Test Automation Started (No Docker Mode)');
    console.log('======================================================\n');
    
    await this.ensureOutputDir();
    this.results.overall.startTime = Date.now();
  }

  async ensureOutputDir() {
    try {
      await fs.mkdir(this.testOutputDir, { recursive: true });
      await fs.mkdir(path.join(this.testOutputDir, 'coverage'), { recursive: true });
      await fs.mkdir(path.join(this.testOutputDir, 'security'), { recursive: true });
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
      const testMatch = output.match(/Tests:\\s+(\\d+)\\s+passed,\\s+(\\d+)\\s+total/);
      const coverageMatch = output.match(/All files[^|]*\\|\\s*(\\d+\\.?\\d*)/);
      
      if (testMatch) {
        this.results.unit.passed = parseInt(testMatch[1]);
        this.results.unit.failed = parseInt(testMatch[2]) - parseInt(testMatch[1]);
      } else {
        // Look for simpler patterns
        const passMatch = output.match(/(\\d+)\\s+passing/);
        const failMatch = output.match(/(\\d+)\\s+failing/);
        
        if (passMatch) this.results.unit.passed = parseInt(passMatch[1]);
        if (failMatch) this.results.unit.failed = parseInt(failMatch[1]);
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
      const testMatch = output.match(/(\\d+)\\s+passed.*?(\\d+)\\s+failed/);
      
      if (testMatch) {
        this.results.e2e.passed = parseInt(testMatch[1]);
        this.results.e2e.failed = parseInt(testMatch[2]);
      } else {
        // Look for Playwright specific patterns
        const passMatch = output.match(/(\\d+)\\s+passed/);
        const failMatch = output.match(/(\\d+)\\s+failed/);
        
        if (passMatch) this.results.e2e.passed = parseInt(passMatch[1]);
        if (failMatch) this.results.e2e.failed = parseInt(failMatch[1]);
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
        console.log('Raw audit output:', auditResult.stdout);
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

  async generateReport() {
    console.log('\n📊 Generating Test Report');
    console.log('=========================\n');

    this.results.overall.endTime = Date.now();
    const totalDuration = this.results.overall.endTime - this.results.overall.startTime;

    // Determine overall success
    const unitSuccess = this.results.unit.failed === 0 && this.results.unit.coverage >= 80;
    const e2eSuccess = this.results.e2e.failed === 0;
    const securityAcceptable = this.results.security.critical === 0 && this.results.security.high <= 5;

    this.results.overall.success = unitSuccess && e2eSuccess && securityAcceptable;

    const report = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      success: this.results.overall.success,
      results: this.results,
      summary: {
        totalTests: this.results.unit.passed + this.results.unit.failed + 
                   this.results.e2e.passed + this.results.e2e.failed,
        passedTests: this.results.unit.passed + this.results.e2e.passed,
        failedTests: this.results.unit.failed + this.results.e2e.failed,
        coveragePercent: this.results.unit.coverage,
        securityIssues: this.results.security.critical + this.results.security.high,
        deploymentReady: this.results.overall.success
      },
      recommendations: this.generateRecommendations(),
      notes: [
        'Integration tests skipped (Docker not available)',
        'Performance tests skipped (requires running services)'
      ]
    };

    // Write JSON report
    const reportPath = path.join(this.testOutputDir, 'test-report.json');
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

    if (this.results.unit.failed > 0 || this.results.e2e.failed > 0) {
      recommendations.push('Fix all failing tests before deployment');
    }

    recommendations.push('Install Docker to enable integration and performance tests');

    if (recommendations.length === 1) { // Only Docker recommendation
      recommendations.unshift('Unit and E2E tests passed! Install Docker for full test coverage.');
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
- Status: SKIPPED (Docker not available)

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
- Status: SKIPPED (requires running services)

## Notes

${report.notes.map(note => `- ${note}`).join('\n')}

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
    console.log(`🔗 Integration Tests: SKIPPED (Docker not available)`);
    console.log(`🎭 E2E Tests: ${this.results.e2e.passed} passed, ${this.results.e2e.failed} failed`);
    console.log(`🔒 Security: ${this.results.security.critical} critical, ${this.results.security.high} high severity issues`);
    console.log(`⚡ Performance: SKIPPED (requires running services)`);
    
    if (this.results.overall.success) {
      console.log('\n🎉 CORE TESTS PASSED! 🎉');
      console.log('Note: Install Docker for full integration and performance testing');
    } else {
      console.log('\n❌ SOME TESTS FAILED - NEEDS ATTENTION');
    }
    
    console.log('\n📁 Test results saved to:', this.testOutputDir);
  }

  async run() {
    try {
      await this.init();

      const unitSuccess = await this.runUnitTests();
      const e2eSuccess = await this.runE2ETests();
      const securitySuccess = await this.runSecurityTests();

      await this.generateReport();
      await this.printSummary();

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