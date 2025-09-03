# Development
npm run dev                    # Start all services in development
npm run dev:shell             # Start only shell application
npm run dev:backend           # Start only backend services
npm run build                 # Build for production
npm run build:shell           # Build shell only
npm run build:plugins         # Build all plugins

# Testing (MANDATORY before any deployment)
npm run test                  # Run all tests
npm run test:unit             # Run unit tests
npm run test:integration      # Run integration tests
npm run test:e2e              # Run E2E tests (MUST PASS 100%)
npm run test:e2e:auth         # Test authentication flows
npm run test:e2e:plugins      # Test plugin system
npm run test:e2e:mobile       # Test mobile responsiveness
npm run test:e2e:performance  # Run performance tests
npm run test:security         # Run security tests

# Docker Operations
npm run docker:dev            # Start development environment
npm run docker:prod           # Start production environment
npm run docker:build          # Build all containers
npm run docker:push           # Push to registry

# Database Operations
npm run db:migrate            # Run database migrations
npm run db:seed              # Seed test data
npm run db:reset             # Reset database (dev only)

# Deployment
npm run deploy:staging        # Deploy to staging
npm run deploy:prod          # Deploy to production (ONLY after all tests pass)

---

## Critical Requirements & Subagent Utilization

### Critical Requirements
1.  **NO SHORTCUTS**: Every component must be implemented completely with full security and testing.
2.  **SECURITY FIRST**: If there's any doubt about security, implement the most secure option.
3.  **TEST EVERYTHING**: Nothing is deployed without passing E2E tests.
4.  **DOCUMENT EVERYTHING**: Code must be self-documenting with comprehensive comments.
5.  **ERROR HANDLING**: Every possible error condition must be handled gracefully.
6.  **PERFORMANCE**: All components must meet performance benchmarks.
7.  **ACCESSIBILITY**: All UI components must be accessible (WCAG 2.1 AA).

### Subagent Utilization
-   **`Security Subagent`**: Review ALL code for security vulnerabilities.
-   **`Testing Subagent`**: Validate ALL test coverage and effectiveness.
-   **`Performance Subagent`**: Optimize ALL components for speed and efficiency.
-   **`Code Review Subagent`**: Ensure code quality and consistency.
-   **`Documentation Subagent`**: Validate ALL documentation is complete.

---

## Conclusion & Next Steps

This blueprint is the single source of truth. The development process begins now, starting with **Phase 1: Foundation Setup**. The `test-automator` and `backend-architect` are now tasked with creating the initial project structure and Docker/Nginx configurations as defined. All work will be tracked against the checklists, and no shortcuts will be tolerated.