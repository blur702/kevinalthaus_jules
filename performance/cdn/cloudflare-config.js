/**
 * Cloudflare CDN Configuration and Management
 * Comprehensive CDN setup with caching, security, and performance optimization
 */

import fetch from 'node-fetch';
import { logger } from '../utils/logger.js';

export class CloudflareCDNManager {
  constructor(config) {
    this.apiToken = config.apiToken;
    this.zoneId = config.zoneId;
    this.email = config.email;
    this.domain = config.domain;
    this.apiBase = 'https://api.cloudflare.com/client/v4';
    this.headers = {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
      'X-Auth-Email': this.email
    };
  }

  /**
   * Make API request to Cloudflare
   */
  async apiRequest(endpoint, method = 'GET', data = null) {
    const url = `${this.apiBase}${endpoint}`;
    const options = {
      method,
      headers: this.headers
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const result = await response.json();

      if (!result.success) {
        throw new Error(`Cloudflare API Error: ${result.errors.map(e => e.message).join(', ')}`);
      }

      return result;
    } catch (error) {
      logger.error('Cloudflare API request failed:', error);
      throw error;
    }
  }

  /**
   * Configure caching rules
   */
  async configureCachingRules() {
    logger.info('Configuring Cloudflare caching rules...');

    const cachingRules = [
      // Static assets - cache for 1 year
      {
        targets: [
          {
            target: 'url',
            constraint: {
              operator: 'matches',
              value: `${this.domain}/*\\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|pdf|zip)$`
            }
          }
        ],
        actions: [
          {
            id: 'cache_level',
            value: 'cache_everything'
          },
          {
            id: 'edge_cache_ttl',
            value: 31536000 // 1 year
          },
          {
            id: 'browser_cache_ttl',
            value: 31536000 // 1 year
          }
        ],
        priority: 1,
        status: 'active'
      },

      // API responses - cache for 5 minutes
      {
        targets: [
          {
            target: 'url',
            constraint: {
              operator: 'matches',
              value: `${this.domain}/api/v1/(config|public)/*`
            }
          }
        ],
        actions: [
          {
            id: 'cache_level',
            value: 'cache_everything'
          },
          {
            id: 'edge_cache_ttl',
            value: 300 // 5 minutes
          },
          {
            id: 'browser_cache_ttl',
            value: 300 // 5 minutes
          }
        ],
        priority: 2,
        status: 'active'
      },

      // Dynamic content - no cache but optimize
      {
        targets: [
          {
            target: 'url',
            constraint: {
              operator: 'matches',
              value: `${this.domain}/api/*`
            }
          }
        ],
        actions: [
          {
            id: 'cache_level',
            value: 'bypass'
          },
          {
            id: 'rocket_loader',
            value: 'on'
          },
          {
            id: 'minify',
            value: {
              css: 'on',
              html: 'on',
              js: 'on'
            }
          }
        ],
        priority: 3,
        status: 'active'
      },

      // File uploads - no cache
      {
        targets: [
          {
            target: 'url',
            constraint: {
              operator: 'matches',
              value: `${this.domain}/api/files/upload*`
            }
          }
        ],
        actions: [
          {
            id: 'cache_level',
            value: 'bypass'
          }
        ],
        priority: 4,
        status: 'active'
      }
    ];

    for (const rule of cachingRules) {
      try {
        await this.apiRequest(`/zones/${this.zoneId}/rulesets`, 'POST', {
          name: `Caching Rule ${rule.priority}`,
          kind: 'zone',
          phase: 'http_request_cache_settings',
          rules: [rule]
        });
        logger.info(`Created caching rule ${rule.priority}`);
      } catch (error) {
        logger.error(`Failed to create caching rule ${rule.priority}:`, error);
      }
    }
  }

  /**
   * Configure security settings
   */
  async configureSecuritySettings() {
    logger.info('Configuring Cloudflare security settings...');

    const securitySettings = {
      // SSL settings
      ssl: 'flexible', // or 'strict' for end-to-end encryption
      always_use_https: 'on',
      min_tls_version: '1.2',
      tls_1_3: 'on',
      automatic_https_rewrites: 'on',

      // Security features
      security_level: 'medium',
      challenge_ttl: 1800,
      browser_check: 'on',
      server_side_exclude: 'on',

      // Bot management
      bot_management: {
        enabled: true,
        fight_mode: false,
        suppress_session_score: false
      },

      // DDoS protection
      ddos_protection: 'on',

      // Web Application Firewall
      waf: 'on',

      // Rate limiting
      rate_limiting: {
        enabled: true,
        threshold: 1000,
        period: 60,
        action: 'challenge'
      }
    };

    // Apply security settings
    for (const [setting, value] of Object.entries(securitySettings)) {
      if (typeof value === 'object' && value !== null) {
        continue; // Skip complex objects for now
      }

      try {
        await this.apiRequest(`/zones/${this.zoneId}/settings/${setting}`, 'PATCH', {
          value: value
        });
        logger.info(`Updated security setting: ${setting} = ${value}`);
      } catch (error) {
        logger.error(`Failed to update setting ${setting}:`, error);
      }
    }
  }

  /**
   * Configure performance optimization
   */
  async configurePerformanceOptimization() {
    logger.info('Configuring Cloudflare performance optimization...');

    const performanceSettings = {
      // Compression
      brotli: 'on',
      
      // Image optimization
      polish: 'lossless',
      webp: 'on',
      
      // Minification
      minify: {
        css: 'on',
        html: 'on',
        js: 'on'
      },
      
      // HTTP/2 and HTTP/3
      http2: 'on',
      http3: 'on',
      
      // Zero Round Trip Time Resumption
      '0rtt': 'on',
      
      // Rocket Loader for JavaScript optimization
      rocket_loader: 'manual', // Use 'on' to enable automatic optimization
      
      // Auto minify
      auto_minify: {
        css: true,
        html: true,
        js: true
      },
      
      // Early hints
      early_hints: 'on'
    };

    for (const [setting, value] of Object.entries(performanceSettings)) {
      try {
        await this.apiRequest(`/zones/${this.zoneId}/settings/${setting}`, 'PATCH', {
          value: value
        });
        logger.info(`Updated performance setting: ${setting}`);
      } catch (error) {
        logger.error(`Failed to update setting ${setting}:`, error);
      }
    }
  }

  /**
   * Create page rules for specific paths
   */
  async createPageRules() {
    logger.info('Creating Cloudflare page rules...');

    const pageRules = [
      // Admin area - bypass cache and enable security
      {
        targets: [`${this.domain}/admin*`],
        actions: [
          { id: 'cache_level', value: 'bypass' },
          { id: 'security_level', value: 'high' },
          { id: 'disable_performance', value: true }
        ],
        priority: 1,
        status: 'active'
      },

      // API endpoints - custom caching
      {
        targets: [`${this.domain}/api/public/*`],
        actions: [
          { id: 'cache_level', value: 'cache_everything' },
          { id: 'edge_cache_ttl', value: 300 },
          { id: 'browser_cache_ttl', value: 300 }
        ],
        priority: 2,
        status: 'active'
      },

      // File downloads - cache for 1 day
      {
        targets: [`${this.domain}/files/*`],
        actions: [
          { id: 'cache_level', value: 'cache_everything' },
          { id: 'edge_cache_ttl', value: 86400 },
          { id: 'browser_cache_ttl', value: 86400 }
        ],
        priority: 3,
        status: 'active'
      }
    ];

    for (const rule of pageRules) {
      try {
        await this.apiRequest(`/zones/${this.zoneId}/pagerules`, 'POST', rule);
        logger.info(`Created page rule for ${rule.targets[0]}`);
      } catch (error) {
        logger.error(`Failed to create page rule:`, error);
      }
    }
  }

  /**
   * Configure load balancing
   */
  async configureLoadBalancing() {
    logger.info('Configuring Cloudflare load balancing...');

    // Create origin pools
    const pools = [
      {
        name: 'primary-pool',
        origins: [
          {
            name: 'origin-1',
            address: '203.0.113.1',
            enabled: true,
            weight: 1
          },
          {
            name: 'origin-2', 
            address: '203.0.113.2',
            enabled: true,
            weight: 1
          }
        ],
        monitor: 'health-check',
        enabled: true,
        minimum_origins: 1,
        notification_email: 'admin@shell-platform.com'
      }
    ];

    // Create health checks
    const healthCheck = {
      type: 'https',
      name: 'health-check',
      path: '/health',
      interval: 60,
      retries: 2,
      timeout: 5,
      expected_codes: '200',
      method: 'GET',
      header: {
        'User-Agent': 'Cloudflare-HealthCheck'
      }
    };

    try {
      // Create health check
      const healthCheckResult = await this.apiRequest(`/zones/${this.zoneId}/healthchecks`, 'POST', healthCheck);
      const healthCheckId = healthCheckResult.result.id;

      // Create pool with health check
      pools[0].monitor = healthCheckId;
      const poolResult = await this.apiRequest(`/zones/${this.zoneId}/load_balancers/pools`, 'POST', pools[0]);
      
      logger.info('Created load balancer pool and health check');
    } catch (error) {
      logger.error('Failed to configure load balancing:', error);
    }
  }

  /**
   * Purge cache for specific URLs
   */
  async purgeCache(urls = []) {
    logger.info(`Purging cache for ${urls.length > 0 ? urls.length + ' URLs' : 'everything'}`);

    const purgeData = urls.length > 0 ? { files: urls } : { purge_everything: true };

    try {
      await this.apiRequest(`/zones/${this.zoneId}/purge_cache`, 'POST', purgeData);
      logger.info('Cache purge completed');
    } catch (error) {
      logger.error('Failed to purge cache:', error);
      throw error;
    }
  }

  /**
   * Get analytics data
   */
  async getAnalytics(since = '-1440', until = 'now') {
    try {
      const response = await this.apiRequest(
        `/zones/${this.zoneId}/analytics/dashboard?since=${since}&until=${until}&continuous=true`
      );
      
      return response.result;
    } catch (error) {
      logger.error('Failed to get analytics:', error);
      throw error;
    }
  }

  /**
   * Configure custom rules (firewall rules)
   */
  async configureCustomRules() {
    logger.info('Configuring Cloudflare custom rules...');

    const customRules = [
      // Block known bad user agents
      {
        expression: '(http.user_agent contains "sqlmap") or (http.user_agent contains "nikto") or (http.user_agent contains "masscan")',
        action: 'block',
        description: 'Block security scanners'
      },

      // Rate limit login attempts
      {
        expression: '(http.request.uri.path eq "/api/auth/login") and (ip.src ne 127.0.0.1)',
        action: 'challenge',
        description: 'Challenge login attempts'
      },

      // Allow monitoring IPs
      {
        expression: '(ip.src in {203.0.113.0/24}) and (http.request.uri.path eq "/health")',
        action: 'allow',
        description: 'Allow monitoring health checks'
      },

      // Block requests with no user agent
      {
        expression: '(http.user_agent eq "")',
        action: 'challenge',
        description: 'Challenge empty user agents'
      }
    ];

    for (const rule of customRules) {
      try {
        await this.apiRequest(`/zones/${this.zoneId}/firewall/rules`, 'POST', {
          filter: {
            expression: rule.expression,
            paused: false
          },
          action: rule.action,
          priority: null,
          paused: false,
          description: rule.description
        });
        
        logger.info(`Created custom rule: ${rule.description}`);
      } catch (error) {
        logger.error(`Failed to create custom rule: ${rule.description}`, error);
      }
    }
  }

  /**
   * Setup complete Cloudflare configuration
   */
  async setupConfiguration() {
    logger.info('Setting up complete Cloudflare configuration...');

    try {
      await this.configureSecuritySettings();
      await this.configurePerformanceOptimization();
      await this.configureCachingRules();
      await this.createPageRules();
      await this.configureCustomRules();
      // await this.configureLoadBalancing(); // Uncomment if using load balancing

      logger.info('Cloudflare configuration completed successfully');
    } catch (error) {
      logger.error('Failed to setup Cloudflare configuration:', error);
      throw error;
    }
  }

  /**
   * Monitor and report on performance
   */
  async getPerformanceReport() {
    try {
      const analytics = await this.getAnalytics('-1440'); // Last 24 hours
      
      const report = {
        timestamp: new Date().toISOString(),
        requests: {
          total: analytics.totals.requests.all,
          cached: analytics.totals.requests.cached,
          uncached: analytics.totals.requests.uncached,
          cacheRatio: (analytics.totals.requests.cached / analytics.totals.requests.all * 100).toFixed(2)
        },
        bandwidth: {
          total: analytics.totals.bandwidth.all,
          cached: analytics.totals.bandwidth.cached,
          uncached: analytics.totals.bandwidth.uncached,
          saved: ((analytics.totals.bandwidth.cached / analytics.totals.bandwidth.all) * 100).toFixed(2)
        },
        threats: analytics.totals.threats.all,
        pageViews: analytics.totals.pageviews.all,
        uniqueVisitors: analytics.totals.uniques.all
      };

      return report;
    } catch (error) {
      logger.error('Failed to get performance report:', error);
      throw error;
    }
  }
}

// Export configured instance
export const cdnManager = new CloudflareCDNManager({
  apiToken: process.env.CLOUDFLARE_API_TOKEN,
  zoneId: process.env.CLOUDFLARE_ZONE_ID,
  email: process.env.CLOUDFLARE_EMAIL,
  domain: process.env.CLOUDFLARE_DOMAIN || 'shell-platform.com'
});

export default CloudflareCDNManager;