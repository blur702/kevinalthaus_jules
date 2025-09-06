/**
 * Content Security Policy Configuration
 * Comprehensive CSP implementation with reporting and progressive enhancement
 */

export class ContentSecurityPolicy {
  constructor(options = {}) {
    this.environment = options.environment || 'production';
    this.reportUri = options.reportUri || '/api/security/csp-report';
    this.enforceMode = options.enforceMode !== false;
    this.allowInlineStyles = options.allowInlineStyles || false;
    this.allowInlineScripts = options.allowInlineScripts || false;
    this.cdnDomains = options.cdnDomains || [];
    this.apiDomains = options.apiDomains || [];
    this.analyticsDomains = options.analyticsDomains || [];
  }

  /**
   * Generate base CSP directives
   */
  getBaseDirectives() {
    return {
      'default-src': ["'self'"],
      'script-src': this.getScriptSources(),
      'style-src': this.getStyleSources(),
      'img-src': this.getImageSources(),
      'font-src': this.getFontSources(),
      'connect-src': this.getConnectSources(),
      'frame-src': this.getFrameSources(),
      'worker-src': this.getWorkerSources(),
      'child-src': this.getChildSources(),
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': this.getFormActionSources(),
      'frame-ancestors': this.getFrameAncestors(),
      'upgrade-insecure-requests': true,
      'block-all-mixed-content': true,
    };
  }

  /**
   * Script source configuration
   */
  getScriptSources() {
    const sources = ["'self'"];

    // CDN domains for JavaScript libraries
    sources.push(...this.cdnDomains);
    
    // Common CDN domains
    sources.push(
      'https://cdn.jsdelivr.net',
      'https://unpkg.com',
      'https://cdnjs.cloudflare.com'
    );

    // Analytics and monitoring
    sources.push(
      'https://www.google-analytics.com',
      'https://www.googletagmanager.com',
      'https://js.sentry-cdn.com',
      'https://browser.sentry-cdn.com'
    );

    // Payment processors
    sources.push(
      'https://js.stripe.com',
      'https://checkout.stripe.com',
      'https://www.paypal.com',
      'https://www.paypalobjects.com'
    );

    // Development environment allowances
    if (this.environment === 'development') {
      sources.push(
        'https://localhost:*',
        'https://127.0.0.1:*',
        "'unsafe-eval'" // For hot reloading
      );
    }

    // Allow inline scripts if specified (not recommended for production)
    if (this.allowInlineScripts) {
      sources.push("'unsafe-inline'");
    }

    return sources;
  }

  /**
   * Style source configuration
   */
  getStyleSources() {
    const sources = ["'self'"];

    // CDN domains for CSS libraries
    sources.push(...this.cdnDomains);
    
    // Common CSS CDN domains
    sources.push(
      'https://cdn.jsdelivr.net',
      'https://unpkg.com',
      'https://cdnjs.cloudflare.com',
      'https://fonts.googleapis.com'
    );

    // Allow inline styles for component libraries
    sources.push("'unsafe-inline'");

    // Development environment
    if (this.environment === 'development') {
      sources.push('https://localhost:*');
    }

    return sources;
  }

  /**
   * Image source configuration
   */
  getImageSources() {
    const sources = ["'self'", 'data:', 'blob:'];

    // CDN and file storage domains
    sources.push(...this.cdnDomains);
    
    // Common image sources
    sources.push(
      'https://*.amazonaws.com',  // S3 buckets
      'https://*.azure.com',      // Azure storage
      'https://*.googleusercontent.com',
      'https://images.unsplash.com',
      'https://via.placeholder.com'
    );

    // Analytics pixels
    sources.push(
      'https://www.google-analytics.com',
      'https://stats.g.doubleclick.net',
      'https://www.facebook.com',
      'https://px.ads.linkedin.com'
    );

    // Gravatar and user avatars
    sources.push(
      'https://secure.gravatar.com',
      'https://www.gravatar.com',
      'https://avatars.githubusercontent.com',
      'https://graph.facebook.com'
    );

    return sources;
  }

  /**
   * Font source configuration
   */
  getFontSources() {
    const sources = ["'self'"];

    // Google Fonts and common font CDNs
    sources.push(
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://cdn.jsdelivr.net',
      'https://use.fontawesome.com',
      'https://maxcdn.bootstrapcdn.com'
    );

    // CDN domains
    sources.push(...this.cdnDomains);

    return sources;
  }

  /**
   * Connect source configuration (XHR, fetch, WebSocket)
   */
  getConnectSources() {
    const sources = ["'self'"];

    // API domains
    sources.push(...this.apiDomains);
    
    // WebSocket connections
    sources.push('wss:', 'ws:');

    // Analytics and monitoring
    sources.push(
      'https://www.google-analytics.com',
      'https://analytics.google.com',
      'https://region1.google-analytics.com',
      'https://sentry.io',
      'https://*.sentry.io'
    );

    // Payment processors
    sources.push(
      'https://api.stripe.com',
      'https://checkout.stripe.com',
      'https://www.paypal.com',
      'https://api.paypal.com'
    );

    // Social login
    sources.push(
      'https://graph.facebook.com',
      'https://api.twitter.com',
      'https://accounts.google.com',
      'https://www.googleapis.com'
    );

    // Development environment
    if (this.environment === 'development') {
      sources.push(
        'https://localhost:*',
        'https://127.0.0.1:*',
        'http://localhost:*',
        'http://127.0.0.1:*',
        'ws://localhost:*',
        'wss://localhost:*'
      );
    }

    return sources;
  }

  /**
   * Frame source configuration
   */
  getFrameSources() {
    const sources = ["'none'"]; // Default: no frames allowed

    // Payment processors
    sources.push(
      'https://checkout.stripe.com',
      'https://www.paypal.com',
      'https://www.sandbox.paypal.com'
    );

    // Social embeds (if needed)
    // sources.push(
    //   'https://www.youtube.com',
    //   'https://player.vimeo.com',
    //   'https://www.facebook.com',
    //   'https://platform.twitter.com'
    // );

    return sources;
  }

  /**
   * Worker source configuration
   */
  getWorkerSources() {
    const sources = ["'self'"];

    // CDN domains for web workers
    sources.push(...this.cdnDomains);

    // Blob URLs for dynamically created workers
    sources.push('blob:');

    return sources;
  }

  /**
   * Child source configuration (frames and workers)
   */
  getChildSources() {
    return this.getFrameSources();
  }

  /**
   * Form action configuration
   */
  getFormActionSources() {
    const sources = ["'self'"];

    // Payment processors
    sources.push(
      'https://checkout.stripe.com',
      'https://www.paypal.com'
    );

    // Search engines (for search forms)
    sources.push(
      'https://www.google.com',
      'https://duckduckgo.com'
    );

    return sources;
  }

  /**
   * Frame ancestors configuration
   */
  getFrameAncestors() {
    // Prevent the page from being framed by other sites
    return ["'self'"];
  }

  /**
   * Generate CSP header string
   */
  getCSPHeader() {
    const directives = this.getBaseDirectives();
    const cspParts = [];

    for (const [directive, values] of Object.entries(directives)) {
      if (typeof values === 'boolean' && values) {
        cspParts.push(directive);
      } else if (Array.isArray(values) && values.length > 0) {
        cspParts.push(`${directive} ${values.join(' ')}`);
      }
    }

    // Add reporting directive
    if (this.reportUri) {
      cspParts.push(`report-uri ${this.reportUri}`);
      cspParts.push(`report-to csp-report`);
    }

    return cspParts.join('; ');
  }

  /**
   * Generate Report-To header for CSP reporting
   */
  getReportToHeader() {
    if (!this.reportUri) return null;

    return JSON.stringify({
      group: 'csp-report',
      max_age: 31536000,
      endpoints: [
        { url: this.reportUri }
      ],
      include_subdomains: true
    });
  }

  /**
   * Generate CSP for specific pages/sections
   */
  getPageSpecificCSP(page) {
    const baseDirectives = this.getBaseDirectives();

    switch (page) {
      case 'admin':
        // More restrictive CSP for admin pages
        baseDirectives['script-src'] = ["'self'"];
        baseDirectives['style-src'] = ["'self'", "'unsafe-inline'"];
        baseDirectives['connect-src'] = ["'self'"];
        break;

      case 'payment':
        // Allow payment processor domains
        baseDirectives['script-src'].push('https://js.stripe.com');
        baseDirectives['frame-src'] = ['https://checkout.stripe.com'];
        baseDirectives['connect-src'].push('https://api.stripe.com');
        break;

      case 'embed':
        // Relaxed CSP for embeddable content
        baseDirectives['frame-ancestors'] = ['*'];
        break;
    }

    return this.generateCSPString(baseDirectives);
  }

  /**
   * Generate CSP nonce for inline scripts/styles
   */
  generateNonce() {
    const crypto = require('crypto');
    return crypto.randomBytes(16).toString('base64');
  }

  /**
   * Express.js middleware for CSP
   */
  middleware() {
    return (req, res, next) => {
      const cspHeader = this.getCSPHeader();
      const reportToHeader = this.getReportToHeader();

      // Set CSP header
      if (this.enforceMode) {
        res.setHeader('Content-Security-Policy', cspHeader);
      } else {
        res.setHeader('Content-Security-Policy-Report-Only', cspHeader);
      }

      // Set Report-To header
      if (reportToHeader) {
        res.setHeader('Report-To', reportToHeader);
      }

      // Store nonce in response locals for templates
      res.locals.cspNonce = this.generateNonce();

      next();
    };
  }

  /**
   * Generate security headers bundle
   */
  getSecurityHeaders() {
    return {
      'Content-Security-Policy': this.getCSPHeader(),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin'
    };
  }

  /**
   * Validate CSP configuration
   */
  validate() {
    const issues = [];

    // Check for unsafe directives in production
    if (this.environment === 'production') {
      const scriptSources = this.getScriptSources();
      if (scriptSources.includes("'unsafe-eval'")) {
        issues.push("'unsafe-eval' should not be used in production");
      }
      if (scriptSources.includes("'unsafe-inline'") && !this.allowInlineScripts) {
        issues.push("'unsafe-inline' for scripts should be avoided in production");
      }
    }

    // Check for missing report URI
    if (!this.reportUri) {
      issues.push("Report URI should be configured for CSP violation monitoring");
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * Generate CSP violation report handler
   */
  getViolationReportHandler() {
    return async (req, res) => {
      try {
        const report = req.body['csp-report'] || req.body;
        
        // Log CSP violation
        console.warn('CSP Violation:', {
          documentUri: report['document-uri'],
          blockedUri: report['blocked-uri'],
          violatedDirective: report['violated-directive'],
          effectiveDirective: report['effective-directive'],
          originalPolicy: report['original-policy'],
          referrer: report.referrer,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        });

        // Send to monitoring system
        // await monitoringService.recordCSPViolation(report);

        res.status(204).end();
      } catch (error) {
        console.error('Error handling CSP violation report:', error);
        res.status(500).end();
      }
    };
  }
}

// Export configured instances
export const productionCSP = new ContentSecurityPolicy({
  environment: 'production',
  reportUri: '/api/security/csp-report',
  enforceMode: true,
  cdnDomains: [
    'https://cdn.shell-platform.com',
    'https://assets.shell-platform.com'
  ],
  apiDomains: [
    'https://api.shell-platform.com'
  ]
});

export const developmentCSP = new ContentSecurityPolicy({
  environment: 'development',
  reportUri: '/api/security/csp-report',
  enforceMode: false,
  allowInlineScripts: true
});

export default ContentSecurityPolicy;