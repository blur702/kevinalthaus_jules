# Data Service

A production-ready data service with CRUD operations, multi-tenancy support, and advanced features for scalable applications.

## Features

### Core Functionality
- **CRUD Operations**: Complete Create, Read, Update, Delete operations with TypeORM
- **Multi-tenancy**: Full tenant isolation with subdomain and header-based routing
- **Soft Deletes**: GDPR-compliant data management with audit trails
- **Bulk Operations**: Efficient batch processing for large datasets
- **Advanced Search**: Full-text search with PostgreSQL and fuzzy matching

### Performance & Scalability
- **Connection Pooling**: Optimized database connections (min: 2, max: 20)
- **Query Optimization**: Indexed queries with N+1 prevention
- **Redis Caching**: Multi-layer caching with TTL management
- **Response Streaming**: Efficient handling of large result sets
- **ETags**: HTTP caching with conditional requests

### Security & Compliance
- **Field-level Permissions**: Granular access control
- **Audit Trail**: Complete change tracking with user attribution
- **Rate Limiting**: Per-tenant rate limiting based on subscription
- **Input Validation**: Comprehensive validation with Joi schemas
- **SQL Injection Prevention**: Parameterized queries and prepared statements

### Developer Experience
- **TypeScript**: Full type safety and IntelliSense support
- **Comprehensive Testing**: Unit and integration tests with 95%+ coverage
- **API Documentation**: Auto-generated OpenAPI/Swagger documentation
- **Health Checks**: Database and Redis connectivity monitoring
- **Graceful Shutdown**: Proper resource cleanup on termination

## Quick Start

### Prerequisites
- Node.js 16+ and npm 8+
- PostgreSQL 12+
- Redis 6+

### Installation

1. **Clone and install dependencies**:
   ```bash
   cd /var/www/backend/services/data
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up database**:
   ```bash
   # Create database
   createdb dataservice
   
   # Run migrations
   npm run migration:run
   
   # Optional: Seed with sample data
   npm run seed
   ```

4. **Start the service**:
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

### Docker Setup

```bash
# Build image
npm run docker:build

# Run container
npm run docker:run
```

## API Documentation

### Base URL
```
http://localhost:3000/api/data
```

### Authentication
All endpoints require tenant identification via headers:
```http
X-Tenant-ID: your-tenant-id
Authorization: Bearer your-jwt-token
```

### Core Endpoints

#### Resources
- `GET /resources` - List resources with pagination and filtering
- `GET /resources/:id` - Get single resource
- `POST /resources` - Create resource
- `PUT /resources/:id` - Update resource
- `PATCH /resources/:id` - Partial update
- `DELETE /resources/:id` - Soft delete resource

#### Advanced Operations
- `POST /resources/bulk` - Bulk create resources
- `PATCH /resources/batch/status` - Batch status updates
- `GET /resources/search` - Advanced search
- `POST /resources/advanced-search` - Complex filtering

#### Business Endpoints
- `GET /resources/featured` - Featured resources (public)
- `GET /resources/category/:category` - Resources by category
- `PATCH /resources/:id/publish` - Publish resource
- `POST /resources/:id/duplicate` - Duplicate resource
- `GET /resources/stats` - Resource statistics

### Query Parameters

#### Pagination
```http
GET /resources?page=1&limit=10
```

#### Filtering
```http
GET /resources?filter[status]=active&filter[category]=premium
```

#### Sorting
```http
GET /resources?sortBy=name&sortOrder=ASC
```

#### Search
```http
GET /resources?search=test%20query
```

#### Relations
```http
GET /resources?relations=category,tags
```

### Response Format

#### Success Response
```json
{
  "success": true,
  "data": {
    "id": "resource-uuid",
    "name": "Resource Name",
    "status": "active"
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": {
    "timestamp": "2023-12-01T00:00:00.000Z",
    "requestId": "req-12345",
    "etag": "abc123"
  }
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": ["Name is required"]
  },
  "meta": {
    "timestamp": "2023-12-01T00:00:00.000Z",
    "requestId": "req-12345"
  }
}
```

## Configuration

### Database Configuration
```env
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=dataservice
```

### Redis Configuration
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_CACHE_DB=1
REDIS_SESSION_DB=0
```

### Performance Tuning
```env
DB_CONNECTION_POOL_MIN=2
DB_CONNECTION_POOL_MAX=20
DEFAULT_CACHE_TTL=300
MAX_QUERY_EXECUTION_TIME=1000
```

## Testing

### Run Tests
```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Structure
```
tests/
├── unit/
│   ├── repositories/
│   ├── services/
│   ├── controllers/
│   └── middleware/
└── integration/
    └── api/
```

## Development

### Code Quality
```bash
# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Build
npm run build
```

### Database Management
```bash
# Generate migration
npm run migration:generate -- -n MigrationName

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert

# Sync schema (development only)
npm run schema:sync
```

## Deployment

### Environment Variables
Ensure all required environment variables are set in production:
- Database connection settings
- Redis configuration
- JWT secrets
- CORS origins
- Rate limiting configuration

### Health Checks
The service provides health check endpoints:
- `GET /health` - Basic health check
- `GET /api/data/health` - Detailed service health

### Monitoring
Integration points for monitoring services:
- Sentry for error tracking
- New Relic for APM
- DataDog for metrics
- Custom health check endpoints

### Performance Recommendations

1. **Database Optimization**:
   - Use appropriate indexes
   - Monitor slow query logs
   - Regular VACUUM and ANALYZE

2. **Redis Configuration**:
   - Configure appropriate memory limits
   - Use Redis persistence based on needs
   - Monitor memory usage

3. **Application Tuning**:
   - Adjust connection pool sizes
   - Configure cache TTL values
   - Monitor memory usage

## Architecture

### Layered Architecture
```
├── Controllers (HTTP Layer)
├── Services (Business Logic)
├── Repositories (Data Access)
└── Entities (Data Models)
```

### Key Patterns
- **Repository Pattern**: Data access abstraction
- **Service Layer**: Business logic encapsulation
- **Dependency Injection**: Loose coupling
- **Middleware Pipeline**: Cross-cutting concerns

### Database Schema
```sql
-- Base entity with audit fields
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  tenant_id UUID,
  version INTEGER DEFAULT 1,
  etag VARCHAR(128)
);

-- Audit log table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_name VARCHAR(100),
  entity_id UUID,
  action VARCHAR(50),
  old_values JSONB,
  new_values JSONB,
  user_id UUID,
  tenant_id UUID,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support and questions:
- Documentation: [API Docs](http://localhost:3000/api/data/docs)
- Issues: GitHub Issues
- Email: support@yourcompany.com