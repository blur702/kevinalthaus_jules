# Directory Structure

This document provides a comprehensive overview of the `/var/www/` directory structure.

## Root Directory: `/var/www/`

The main web server directory containing all project files and configurations.

## Directory Tree

```
/var/www/
├── backend/                      # Backend services and APIs
│   ├── api-gateway/              # API Gateway service
│   │   ├── src/                  # Source code
│   │   │   ├── middleware/       # Express middleware
│   │   │   ├── routes/           # API routes
│   │   │   ├── types/            # TypeScript types
│   │   │   └── utils/            # Utility functions
│   │   ├── mock-services/        # Mock service endpoints
│   │   └── package.json          # Dependencies
│   └── services/                 # Microservices
│       ├── auth/                 # Authentication service
│       ├── data/                 # Data management service
│       ├── external/             # External API integrations
│       └── file/                 # File storage service
│
├── config/                       # Configuration files
│   └── plugin-registry.json     # Plugin configuration
│
├── deployment/                   # Deployment configurations
│   └── scripts/                  # Deployment scripts
│       ├── backup.sh             # Database backup script
│       └── blue-green-deploy.sh  # Blue-green deployment
│
├── docs/                         # Documentation
│   ├── agents/                   # Agent documentation
│   │   ├── diagrams/             # Mermaid diagrams
│   │   └── reference/            # API references
│   └── shell-platform/           # Platform documentation
│       ├── deployment/           # Deployment guides
│       └── security/             # Security documentation
│
├── html/                         # Static HTML files
│   └── index.nginx-debian.html   # Default nginx page
│
├── instructions/                 # Agent instruction files
│   └── [76 agent instruction files]
│
├── logs/                         # Application logs
│
├── monitoring/                   # Monitoring configuration
│   ├── alertmanager/             # Alert manager config
│   ├── docker/                   # Docker monitoring setup
│   │   ├── elk/                  # ELK stack configuration
│   │   └── prometheus/           # Prometheus config
│   ├── grafana/                  # Grafana dashboards
│   └── prometheus/               # Prometheus rules
│
├── performance/                  # Performance optimization
│   ├── cdn/                      # CDN configuration
│   ├── database/                 # Database optimization
│   └── service-worker/           # Service worker scripts
│
├── public_html/                  # Public web files (document root)
│   ├── index.html                # Main entry point
│   └── shell-platform/           # Shell platform application
│       ├── assets/               # Compiled JavaScript/CSS
│       ├── backend/              # Backend server code
│       │   ├── src/              # TypeScript source
│       │   ├── scripts/          # Utility scripts
│       │   └── videos/           # Test recordings
│       ├── frontend/             # Frontend application
│       │   ├── plugins/          # Plugin modules
│       │   ├── shared-components/# Shared UI components
│       │   └── shell/            # Main shell application
│       └── tests/                # Test files
│
├── secrets/                      # Sensitive configuration (gitignored)
│
├── security/                     # Security configurations
│   ├── csp/                      # Content Security Policy
│   └── nginx-security/           # Nginx security rules
│
├── services/                     # Service configurations
│   └── database/                 # Database services
│
├── tests/                        # Test suites
│   ├── e2e/                      # End-to-end tests
│   │   ├── complete/             # Complete test flows
│   │   ├── fixtures/             # Test fixtures
│   │   ├── pages/                # Page objects
│   │   └── screenshots/          # Test screenshots
│   ├── integration/              # Integration tests
│   │   ├── auth/                 # Auth integration tests
│   │   └── data/                 # Data integration tests
│   └── unit/                     # Unit tests
│       ├── auth/                 # Auth unit tests
│       ├── data/                 # Data unit tests
│       └── frontend/             # Frontend unit tests
│
├── .claude/                      # Claude Code configuration
│   └── agents/                   # Agent configurations
│
├── .git/                         # Git repository
├── .gitignore                    # Git ignore rules
├── .env.production               # Production environment variables
├── CLAUDE.md                     # Claude Code instructions
├── PRODUCTION_DEPLOYMENT_README.md # Production deployment guide
└── display_agents.py             # Agent display utility

```

## Key Directories Explained

### `/backend/`
Contains all backend services following a microservices architecture:
- **api-gateway**: Central API gateway handling routing and authentication
- **services/auth**: Authentication and authorization service
- **services/data**: Data management and database operations
- **services/external**: External API integrations
- **services/file**: File upload and storage management

### `/public_html/`
The web-accessible document root containing:
- Static assets and the main application
- Shell platform with modular plugin architecture
- Frontend components and backend API endpoints

### `/monitoring/`
Comprehensive monitoring setup including:
- Prometheus for metrics collection
- Grafana for visualization
- ELK stack for log aggregation
- Alertmanager for alert routing

### `/tests/`
Complete testing infrastructure:
- Unit tests for individual components
- Integration tests for service interactions
- E2E tests for full user workflows
- Performance and security testing

### `/deployment/`
Deployment and CI/CD configurations:
- Docker compositions for different environments
- Kubernetes manifests
- Blue-green deployment scripts
- Backup and restore procedures

### `/security/`
Security configurations and policies:
- Content Security Policy (CSP) rules
- Nginx security headers
- Web Application Firewall (WAF) rules
- Rate limiting configurations

## File Types

### Configuration Files
- `.json` - Configuration and manifest files
- `.yml/.yaml` - Docker Compose and Kubernetes configs
- `.env` - Environment variables

### Code Files
- `.ts` - TypeScript source files
- `.js` - JavaScript files
- `.tsx/.jsx` - React components
- `.html` - HTML templates
- `.css` - Stylesheets

### Documentation
- `.md` - Markdown documentation
- `.mmd` - Mermaid diagram files

### Scripts
- `.sh` - Shell scripts for automation
- `.sql` - Database scripts and migrations

## Environment Structure

The project supports multiple environments:
- **Development**: Local development with hot reload
- **Staging**: Pre-production testing
- **Production**: Live production environment

## Security Notes

- `/secrets/` directory is gitignored and contains sensitive data
- `.env.production` contains production environment variables
- All sensitive configurations are managed through environment variables
- SSL certificates are stored separately in deployment configurations

## Access Permissions

Standard web server permissions:
- Directories: 755 (rwxr-xr-x)
- Files: 644 (rw-r--r--)
- Scripts: 755 (rwxr-xr-x)
- Sensitive files: 600 (rw-------)

## Related Documentation

- [CLAUDE.md](/var/www/CLAUDE.md) - Claude Code instructions
- [PRODUCTION_DEPLOYMENT_README.md](/var/www/PRODUCTION_DEPLOYMENT_README.md) - Production deployment guide
- [Agent Documentation](/var/www/docs/agents/) - Comprehensive agent documentation
- [Shell Platform Documentation](/var/www/docs/shell-platform/) - Platform-specific documentation

---

*Last Updated: September 2024*
*Location: /var/www/docs/DIRECTORY_STRUCTURE.md*