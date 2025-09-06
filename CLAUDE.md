# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web directory structure located at `/var/www`, typically used for serving web content. The main directory for web files is `public_html/`.

## Directory Structure

- `/var/www/` - Root web directory
  - `public_html/` - Public web files directory (document root)
  - `instructions/` - Comprehensive documentation for all available subagents

## Development Commands

### Development
```bash
npm run dev                    # Start all services in development
npm run dev:shell             # Start only shell application
npm run dev:backend           # Start only backend services
npm run build                 # Build for production
npm run build:shell           # Build shell only
npm run build:plugins         # Build all plugins
```

### Testing (MANDATORY before any deployment)
```bash
npm run test                  # Run all tests
npm run test:unit             # Run unit tests
npm run test:integration      # Run integration tests
npm run test:e2e              # Run E2E tests (MUST PASS 100%)
npm run test:e2e:auth         # Test authentication flows
npm run test:e2e:plugins      # Test plugin system
npm run test:e2e:mobile       # Test mobile responsiveness
npm run test:e2e:performance  # Run performance tests
npm run test:security         # Run security tests
```

### Docker Operations
```bash
npm run docker:dev            # Start development environment
npm run docker:prod           # Start production environment
npm run docker:build          # Build all containers
npm run docker:push           # Push to registry
```

### Database Operations
```bash
npm run db:migrate            # Run database migrations
npm run db:seed              # Seed test data
npm run db:reset             # Reset database (dev only)
```

### Deployment
```bash
npm run deploy:staging        # Deploy to staging
npm run deploy:prod          # Deploy to production (ONLY after all tests pass)
```

### Permission Management
```bash
# Set proper permissions for web files
find public_html -type f -exec chmod 644 {} \;
find public_html -type d -exec chmod 755 {} \;
```

## Critical Requirements

1. **NO SHORTCUTS**: Every component must be implemented completely with full security and testing
2. **SECURITY FIRST**: If there's any doubt about security, implement the most secure option
3. **TEST EVERYTHING**: Nothing is deployed without passing E2E tests
4. **DOCUMENT EVERYTHING**: Code must be self-documenting with comprehensive comments
5. **ERROR HANDLING**: Every possible error condition must be handled gracefully
6. **PERFORMANCE**: All components must meet performance benchmarks
7. **ACCESSIBILITY**: All UI components must be accessible (WCAG 2.1 AA)

## Available Subagents

All subagents are configured with specific Claude models based on task complexity for optimal performance and cost-effectiveness. The complete list includes 76 specialized agents:

### 🚀 Haiku (Fast & Cost-Effective) - 16 agents
Model: haiku

- **data-scientist** - SQL queries and data analysis
- **api-documenter** - OpenAPI/Swagger documentation
- **reference-builder** - Exhaustive technical references and API documentation
- **business-analyst** - Metrics and KPI tracking
- **content-marketer** - Blog posts and social media
- **customer-support** - Support tickets and FAQs
- **sales-automator** - Cold emails and proposals
- **search-specialist** - Web research and information gathering
- **legal-advisor** - Privacy policies and compliance documents
- **seo-meta-optimizer** - Meta title and description optimization
- **seo-keyword-strategist** - Keyword density and semantic analysis
- **seo-structure-architect** - Content structure and schema markup
- **seo-snippet-hunter** - Featured snippet formatting
- **seo-content-refresher** - Content freshness updates
- **seo-cannibalization-detector** - Keyword overlap detection
- **seo-content-planner** - Content calendars and outlines

### ⚡ Sonnet (Balanced Performance) - 45 agents
Model: sonnet

#### Development & Languages:
- **python-pro** - Python development with advanced features
- **ruby-pro** - Ruby development with metaprogramming, Rails patterns, and gem development
- **javascript-pro** - Modern JavaScript and Node.js
- **typescript-pro** - Advanced TypeScript with type systems
- **golang-pro** - Go concurrency and idiomatic patterns
- **rust-pro** - Rust memory safety and systems programming
- **c-pro** - C programming and embedded systems
- **cpp-pro** - Modern C++ with STL and templates
- **php-pro** - Modern PHP with advanced features
- **java-pro** - Modern Java with streams and concurrency
- **elixir-pro** - Elixir with OTP patterns and Phoenix
- **csharp-pro** - Modern C# with .NET frameworks and patterns
- **scala-pro** - Enterprise Scala with Apache Pekko, Akka, Spark, and ZIO/Cats Effect
- **flutter-expert** - Flutter development with state management and animations
- **unity-developer** - Unity game development and optimization
- **minecraft-bukkit-pro** - Minecraft plugin development with Bukkit/Spigot/Paper
- **ios-developer** - Native iOS development with Swift/SwiftUI
- **frontend-developer** - React components and UI
- **ui-ux-designer** - Interface design and wireframes
- **backend-architect** - API design and microservices
- **mobile-developer** - React Native/Flutter apps
- **sql-pro** - Complex SQL optimization
- **graphql-architect** - GraphQL schemas and resolvers

#### Infrastructure & Operations:
- **devops-troubleshooter** - Production debugging
- **deployment-engineer** - CI/CD pipelines
- **database-optimizer** - Query optimization
- **database-admin** - Database operations
- **terraform-specialist** - Infrastructure as Code
- **network-engineer** - Network configuration
- **dx-optimizer** - Developer experience
- **data-engineer** - ETL pipelines
- **hybrid-cloud-architect** - Hybrid cloud infrastructure across AWS/Azure/GCP and OpenStack
- **kubernetes-architect** - Cloud-native infrastructure with Kubernetes and GitOps

#### Quality & Support:
- **test-automator** - Test suite creation
- **code-reviewer** - Code quality analysis
- **debugger** - Error investigation
- **error-detective** - Log analysis
- **ml-engineer** - ML model deployment
- **legacy-modernizer** - Framework migrations
- **payment-integration** - Payment processing
- **mermaid-expert** - Mermaid diagrams and visual documentation
- **seo-content-auditor** - Content quality and E-E-A-T analysis
- **seo-authority-builder** - Authority signal optimization
- **seo-content-writer** - SEO-optimized content creation
- **hr-pro** - HR operations and compliance

### 🧠 Opus (Maximum Capability) - 15 agents
Model: opus

- **ai-engineer** - LLM applications and RAG systems
- **security-auditor** - Vulnerability analysis
- **performance-engineer** - Application optimization
- **incident-responder** - Production incident handling
- **mlops-engineer** - ML infrastructure
- **architect-reviewer** - Architectural consistency
- **cloud-architect** - Cloud infrastructure design
- **prompt-engineer** - LLM prompt optimization
- **context-manager** - Multi-agent coordination
- **quant-analyst** - Financial modeling
- **risk-manager** - Portfolio risk management
- **docs-architect** - Comprehensive technical documentation from codebases
- **tutorial-engineer** - Step-by-step tutorials and educational content
- **playwright-visual-qa-tester** - Comprehensive end-to-end testing of web applications with visual regression testing

### Special Agents

#### 🎭 playwright-visual-qa-tester
**Model**: opus (for comprehensive testing capabilities)

Use this agent when you need comprehensive end-to-end testing of a web application before release, particularly when you want to catch visual regressions, console errors, and user experience issues that automated tests might miss. This agent acts as a meticulous manual QA tester using Playwright to validate every interactive element, monitor client-side health, and ensure pixel-perfect visual integrity.

**Key capabilities:**
- Complete E2E testing of checkout flows and critical user paths
- Visual regression detection and screenshot comparison
- Console error monitoring and JavaScript health checks
- Link validation and broken resource detection
- Cross-browser testing support
- Performance monitoring during interactions
- Accessibility validation
- Form validation testing
- Mobile responsiveness verification

**Example usage scenarios:**
- Pre-release validation of new features
- Comprehensive QA testing of checkout flows
- Detecting broken links and JavaScript errors on production sites
- Visual consistency verification across deployments
- User interaction testing with detailed reporting

## Subagent Utilization Guidelines

When working with the codebase, utilize these specialized subagents proactively:

1. **Security Subagent** - Review ALL code for security vulnerabilities
2. **Testing Subagent** - Validate ALL test coverage and effectiveness
3. **Performance Subagent** - Optimize ALL components for speed and efficiency
4. **Code Review Subagent** - Ensure code quality and consistency
5. **Documentation Subagent** - Validate ALL documentation is complete

## Important Notes

- This is a standard web server directory structure
- The `public_html/` directory is typically the document root for web content
- Always consider security when placing files in public_html as they will be web-accessible
- When creating or modifying files, sudo access may be required (password available in user memory)
- All work must be tracked against checklists, and no shortcuts will be tolerated
- E2E tests must pass 100% before any deployment

## Workflow Best Practices

1. Always start with understanding the existing codebase structure
2. Use appropriate subagents for specialized tasks
3. Run tests frequently during development
4. Document all changes comprehensively
5. Follow security best practices at all times
6. Ensure accessibility standards are met
7. Optimize for performance from the beginning

## Getting Started

For detailed information about any specific subagent, refer to the corresponding documentation file in the `/var/www/instructions/` directory. Each file contains comprehensive guidance on the agent's capabilities, best practices, and example usage patterns.

---

This blueprint serves as the single source of truth for development in this repository. All development must adhere to these guidelines and utilize the appropriate subagents for optimal results.
- always test using https://kevinalthaus.com