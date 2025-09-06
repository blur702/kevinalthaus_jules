# Shell Platform Shared Services

This directory contains shared backend services that are available to all plugins in the Shell Platform.

## Architecture

The Shell Platform follows a true plugin architecture where:

1. **The Shell provides only**:
   - Basic framework infrastructure
   - Plugin loading and lifecycle management
   - Shared services layer
   - Authentication/authorization framework
   - Database connection pooling
   - Event bus for inter-plugin communication

2. **Plugins provide ALL functionality**:
   - Dashboard is a plugin
   - User management is a plugin
   - Settings is a plugin
   - Every feature is a plugin

## Available Services

### Core Services

- **Authentication Service** - JWT tokens, session management, OAuth
- **Database Service** - PostgreSQL connection pool, query builder, migrations
- **Cache Service** - Redis caching layer
- **Storage Service** - File uploads, S3/local storage
- **Queue Service** - Background job processing
- **Email Service** - Transactional emails, templates
- **Websocket Service** - Real-time communication

### Plugin Services

- **Plugin Registry** - Available plugins, versions, dependencies
- **Plugin Installer** - Download, install, update plugins
- **Plugin Config** - Store/retrieve plugin configurations
- **Plugin Data** - Isolated data storage per plugin
- **Hook System** - WordPress-style filters and actions
- **Event Bus** - Inter-plugin communication

## Service Usage

Services are injected into plugins during initialization:

```javascript
// In plugin's main file
export default class MyPlugin {
  constructor(services) {
    this.auth = services.authentication;
    this.db = services.database;
    this.storage = services.storage;
  }
  
  async initialize() {
    // Plugin initialization
    const user = await this.auth.getCurrentUser();
    const data = await this.db.query('SELECT * FROM my_table');
  }
}
```

## Service Implementation

Each service follows a standard interface:

```javascript
class ServiceName {
  constructor(config) {
    this.config = config;
  }
  
  async initialize() {
    // Service initialization
  }
  
  async shutdown() {
    // Cleanup
  }
  
  // Service methods...
}
```

## Database Schema

The core database schema includes:

- `plugins` - Installed plugins and their status
- `plugin_configs` - Plugin configuration data
- `plugin_data` - Generic key-value storage for plugins
- `users` - User accounts (managed by user-management plugin)
- `sessions` - User sessions
- `permissions` - Permission definitions
- `roles` - Role definitions
- `role_permissions` - Role-permission mappings

## API Endpoints

Core API endpoints provided by the shell:

- `/api/plugins` - Plugin management
- `/api/auth/*` - Authentication endpoints
- `/api/system/*` - System information

All other endpoints are provided by plugins.

## Environment Variables

Required environment variables:

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost/shellplatform
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# Storage
STORAGE_TYPE=local|s3
STORAGE_PATH=/var/www/storage
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BUCKET=

# Security
JWT_SECRET=your-secret-key
SESSION_SECRET=your-session-secret

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

## Plugin Development

To create a new plugin:

1. Create plugin directory in `/var/www/public_html/shell-platform/frontend/plugins/`
2. Add `manifest.json` with plugin metadata
3. Implement plugin class with required lifecycle methods
4. Use provided services for all infrastructure needs
5. Register routes, navigation, widgets as needed
6. Test with plugin development tools

## Security

- All plugins run in the same process (for now)
- Plugins must declare required permissions
- Services validate permissions before operations
- Database operations use parameterized queries
- File uploads are validated and sandboxed
- API rate limiting is enforced

## Future Enhancements

- Plugin sandboxing with Web Workers
- Plugin marketplace integration
- Remote plugin repositories
- Plugin dependency resolution
- Automatic plugin updates
- Plugin performance monitoring
- Plugin resource limits