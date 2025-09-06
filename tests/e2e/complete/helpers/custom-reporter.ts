import type { Reporter, FullConfig, Suite, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import { writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Custom Reporter for Shell Platform E2E Tests
 * Collects security and performance metrics
 */
class CustomReporter implements Reporter {
  private config!: FullConfig;
  private testResults: any[] = [];
  private performanceMetrics: any[] = [];
  private securityIssues: any[] = [];
  private startTime!: Date;

  onBegin(config: FullConfig, suite: Suite): void {
    this.config = config;
    this.startTime = new Date();
    console.log(`\n🚀 Shell Platform E2E Tests Started`);
    console.log(`📁 Total test files: ${suite.allTests().length}`);
  }

  onTestBegin(test: TestCase): void {
    console.log(`  ⏳ ${test.title}`);
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const status = result.status === 'passed' ? '✅' : 
                  result.status === 'failed' ? '❌' :
                  result.status === 'skipped' ? '⏭️' : '⚠️';
    
    console.log(`  ${status} ${test.title} (${result.duration}ms)`);
    
    // Collect test results
    this.testResults.push({
      title: test.title,
      status: result.status,
      duration: result.duration,
      location: `${test.parent.title} > ${test.title}`,
      errors: result.errors
    });

    // Extract performance metrics from attachments
    const perfAttachment = result.attachments.find(a => a.name === 'performance-metrics');
    if (perfAttachment) {
      this.performanceMetrics.push(JSON.parse(perfAttachment.body?.toString() || '{}'));
    }

    // Extract security findings
    const securityAttachment = result.attachments.find(a => a.name === 'security-findings');
    if (securityAttachment) {
      this.securityIssues.push(JSON.parse(securityAttachment.body?.toString() || '{}'));
    }
  }

  async onEnd(result: FullResult): Promise<void> {
    const duration = new Date().getTime() - this.startTime.getTime();
    const passed = this.testResults.filter(t => t.status === 'passed').length;
    const failed = this.testResults.filter(t => t.status === 'failed').length;
    const skipped = this.testResults.filter(t => t.status === 'skipped').length;

    console.log(`\n📊 Test Results Summary`);
    console.log(`=======================`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️ Skipped: ${skipped}`);
    console.log(`⏱️ Duration: ${duration}ms`);
    
    // Performance metrics summary
    if (this.performanceMetrics.length > 0) {
      console.log(`\n⚡ Performance Metrics`);
      console.log(`=====================`);
      const avgLoadTime = this.performanceMetrics.reduce((acc, m) => acc + (m.loadTime || 0), 0) / this.performanceMetrics.length;
      console.log(`Average Page Load: ${avgLoadTime.toFixed(0)}ms`);
    }

    // Security summary
    if (this.securityIssues.length > 0) {
      console.log(`\n🔒 Security Findings`);
      console.log(`===================`);
      const criticalCount = this.securityIssues.filter(i => i.severity === 'critical').length;
      const highCount = this.securityIssues.filter(i => i.severity === 'high').length;
      console.log(`Critical: ${criticalCount}, High: ${highCount}`);
    }

    // Generate JSON report
    const report = {
      summary: {
        total: this.testResults.length,
        passed,
        failed,
        skipped,
        duration,
        startTime: this.startTime.toISOString(),
        endTime: new Date().toISOString()
      },
      testResults: this.testResults,
      performanceMetrics: this.performanceMetrics,
      securityIssues: this.securityIssues,
      status: failed === 0 ? 'success' : 'failure'
    };

    // Write JSON report
    const reportPath = join(this.config.rootDir, 'reports', 'custom-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📝 Custom report saved to: ${reportPath}`);
  }
}

export default CustomReporter;