/**
 * Test data fixtures for Shell Platform E2E tests
 */
export const TestData = {
  // User credentials
  users: {
    validUser: {
      email: 'test@shellplatform.dev',
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User'
    },
    adminUser: {
      email: 'admin@shellplatform.dev',
      password: 'AdminPassword123!',
      firstName: 'Admin',
      lastName: 'User'
    },
    invalidUser: {
      email: 'invalid@example.com',
      password: 'wrongpassword'
    },
    newUser: {
      email: 'newuser@shellplatform.dev',
      password: 'NewPassword123!',
      firstName: 'New',
      lastName: 'User',
      confirmPassword: 'NewPassword123!'
    }
  },

  // Form validation test cases
  validation: {
    email: {
      valid: [
        'test@example.com',
        'user.name@domain.co.uk',
        'test+tag@example.org'
      ],
      invalid: [
        'invalid-email',
        '@domain.com',
        'test@',
        'test..test@example.com',
        ''
      ]
    },
    password: {
      valid: [
        'Password123!',
        'MySecure@Pass1',
        'Complex#Pass99'
      ],
      invalid: [
        'weak',
        '12345678',
        'password',
        'PASSWORD',
        'Pass!1',
        ''
      ]
    },
    phone: {
      valid: [
        '+1-555-123-4567',
        '(555) 123-4567',
        '555.123.4567'
      ],
      invalid: [
        '123',
        'invalid-phone',
        '555-123-456',
        ''
      ]
    }
  },

  // Plugin test data
  plugins: {
    testPlugin: {
      name: 'test-plugin',
      version: '1.0.0',
      description: 'Test plugin for E2E testing',
      author: 'Shell Platform Team',
      permissions: ['read', 'write'],
      config: {
        theme: 'dark',
        features: ['chat', 'notifications'],
        apiEndpoint: 'https://api.testplugin.com'
      }
    },
    analyticsPlugin: {
      name: 'analytics-plugin',
      version: '2.1.0',
      description: 'Analytics and reporting plugin',
      author: 'Analytics Team',
      permissions: ['read', 'analytics'],
      config: {
        trackingId: 'GA-12345678',
        enableRealTime: true,
        reportingInterval: 3600
      }
    },
    maliciousPlugin: {
      name: 'malicious-plugin',
      version: '1.0.0',
      description: 'Plugin with security issues',
      author: 'Unknown',
      permissions: ['admin', 'system'],
      config: {
        script: '<script>alert("xss")</script>',
        dangerousHtml: '<img src="x" onerror="alert(1)">'
      }
    }
  },

  // API test data
  api: {
    endpoints: {
      auth: {
        login: '/api/auth/login',
        register: '/api/auth/register',
        logout: '/api/auth/logout',
        refresh: '/api/auth/refresh',
        resetPassword: '/api/auth/reset-password',
        verify: '/api/auth/verify'
      },
      users: {
        profile: '/api/users/profile',
        list: '/api/users',
        update: '/api/users/:id',
        delete: '/api/users/:id'
      },
      plugins: {
        list: '/api/plugins',
        install: '/api/plugins/install',
        uninstall: '/api/plugins/:id/uninstall',
        config: '/api/plugins/:id/config'
      },
      files: {
        upload: '/api/files/upload',
        download: '/api/files/:id/download',
        delete: '/api/files/:id'
      }
    },
    responses: {
      success: {
        login: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
          refreshToken: 'refresh-token-123',
          user: {
            id: 1,
            email: 'test@shellplatform.dev',
            firstName: 'Test',
            lastName: 'User',
            isAdmin: false
          }
        },
        register: {
          message: 'User registered successfully',
          user: {
            id: 2,
            email: 'newuser@shellplatform.dev',
            firstName: 'New',
            lastName: 'User'
          }
        },
        plugins: [
          {
            id: 1,
            name: 'test-plugin',
            version: '1.0.0',
            status: 'active',
            installedAt: '2023-01-01T00:00:00Z'
          },
          {
            id: 2,
            name: 'analytics-plugin',
            version: '2.1.0',
            status: 'inactive',
            installedAt: '2023-01-02T00:00:00Z'
          }
        ]
      },
      errors: {
        unauthorized: {
          error: 'Unauthorized',
          message: 'Invalid credentials',
          code: 'AUTH_FAILED',
          statusCode: 401
        },
        validation: {
          error: 'Validation Error',
          message: 'Invalid input data',
          code: 'VALIDATION_FAILED',
          statusCode: 400,
          details: [
            {
              field: 'email',
              message: 'Email is required'
            },
            {
              field: 'password',
              message: 'Password must be at least 8 characters'
            }
          ]
        },
        serverError: {
          error: 'Internal Server Error',
          message: 'Something went wrong',
          code: 'INTERNAL_ERROR',
          statusCode: 500
        },
        rateLimited: {
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          code: 'RATE_LIMITED',
          statusCode: 429,
          retryAfter: 60
        }
      }
    }
  },

  // File upload test data
  files: {
    valid: {
      image: {
        name: 'test-image.jpg',
        type: 'image/jpeg',
        size: 1024 * 1024, // 1MB
        content: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA...' // Base64 encoded image
      },
      document: {
        name: 'test-document.pdf',
        type: 'application/pdf',
        size: 2 * 1024 * 1024, // 2MB
        content: 'data:application/pdf;base64,JVBERi0xLjQK...' // Base64 encoded PDF
      }
    },
    invalid: {
      tooLarge: {
        name: 'large-file.jpg',
        type: 'image/jpeg',
        size: 20 * 1024 * 1024, // 20MB (exceeds limit)
        content: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA...'
      },
      wrongType: {
        name: 'script.exe',
        type: 'application/x-executable',
        size: 1024,
        content: 'data:application/x-executable;base64,TVqQAAMAAAAE...'
      },
      malicious: {
        name: 'malicious.svg',
        type: 'image/svg+xml',
        size: 1024,
        content: 'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9ImFsZXJ0KDEpIj4='
      }
    }
  },

  // Performance test thresholds
  performance: {
    thresholds: {
      pageLoad: 3000, // 3 seconds
      apiResponse: 1000, // 1 second
      firstPaint: 1500, // 1.5 seconds
      firstContentfulPaint: 2000, // 2 seconds
      largestContentfulPaint: 2500, // 2.5 seconds
      cumulativeLayoutShift: 0.1, // CLS score
      firstInputDelay: 100, // 100ms
      memoryUsage: 100 * 1024 * 1024 // 100MB
    },
    scenarios: {
      lightLoad: {
        users: 1,
        duration: 30,
        requests: 10
      },
      moderateLoad: {
        users: 10,
        duration: 60,
        requests: 100
      },
      heavyLoad: {
        users: 50,
        duration: 120,
        requests: 500
      }
    }
  },

  // Security test data
  security: {
    xss: {
      payloads: [
        '<script>alert("XSS")</script>',
        '"><script>alert("XSS")</script>',
        '<img src="x" onerror="alert(\'XSS\')">',
        '<svg onload="alert(\'XSS\')">',
        'javascript:alert("XSS")',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>'
      ]
    },
    csrf: {
      tokens: [
        'invalid-token',
        'expired-token',
        '',
        null,
        'malformed.token.here'
      ]
    },
    sql: {
      payloads: [
        "'; DROP TABLE users; --",
        "' OR 1=1 --",
        "admin' --",
        "' UNION SELECT * FROM users --",
        "'; INSERT INTO users VALUES ('hacker', 'password'); --"
      ]
    },
    pathTraversal: [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '....//....//....//etc/passwd'
    ]
  },

  // Theme and visual test data
  themes: {
    light: {
      name: 'light',
      primaryColor: '#1976d2',
      backgroundColor: '#ffffff',
      textColor: '#000000'
    },
    dark: {
      name: 'dark',
      primaryColor: '#90caf9',
      backgroundColor: '#121212',
      textColor: '#ffffff'
    },
    highContrast: {
      name: 'high-contrast',
      primaryColor: '#000000',
      backgroundColor: '#ffffff',
      textColor: '#000000'
    }
  },

  // Device and viewport configurations
  viewports: {
    mobile: {
      width: 375,
      height: 667,
      name: 'iPhone SE'
    },
    tablet: {
      width: 768,
      height: 1024,
      name: 'iPad'
    },
    desktop: {
      width: 1920,
      height: 1080,
      name: 'Desktop HD'
    },
    ultrawide: {
      width: 3440,
      height: 1440,
      name: 'Ultrawide'
    }
  },

  // Error messages and notifications
  messages: {
    success: {
      login: 'Successfully logged in',
      register: 'Account created successfully',
      passwordReset: 'Password reset email sent',
      pluginInstalled: 'Plugin installed successfully',
      fileSaved: 'File saved successfully'
    },
    errors: {
      loginFailed: 'Invalid email or password',
      registrationFailed: 'Registration failed. Please try again.',
      networkError: 'Network error. Please check your connection.',
      sessionExpired: 'Your session has expired. Please log in again.',
      pluginError: 'Failed to load plugin',
      fileUploadError: 'File upload failed'
    },
    validation: {
      emailRequired: 'Email is required',
      emailInvalid: 'Please enter a valid email address',
      passwordRequired: 'Password is required',
      passwordWeak: 'Password must be at least 8 characters with uppercase, lowercase, number and special character',
      passwordMismatch: 'Passwords do not match',
      nameRequired: 'Name is required'
    }
  }
};