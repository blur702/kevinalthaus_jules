# Comprehensive Code Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Backend Services](#backend-services)
3. [Frontend Application](#frontend-application)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Classes and Interfaces](#classes-and-interfaces)
7. [Configuration Files](#configuration-files)
8. [Testing Infrastructure](#testing-infrastructure)

---

## Architecture Overview

### Technology Stack
- **Backend**: Node.js, Express, TypeScript
- **Frontend**: React, TypeScript, Vite, Redux Toolkit
- **Database**: PostgreSQL with connection pooling
- **Authentication**: JWT with RS256 signing
- **Container**: Docker, Docker Compose
- **Testing**: Jest, Playwright, Vitest
- **Monitoring**: Prometheus, Grafana, ELK Stack

### Microservices Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                             │
│                   (Port 3000/8080)                          │
└──────────┬──────────────────────────────────────────────────┘
           │
     ┌─────┴─────┬──────────┬──────────┬────────────┐
     │           │          │          │            │
┌────▼────┐ ┌───▼───┐ ┌────▼───┐ ┌───▼───┐ ┌──────▼──────┐
│Auth     │ │Data   │ │File    │ │External│ │Plugin       │
│Service  │ │Service│ │Service │ │Service │ │Service      │
└─────────┘ └───────┘ └────────┘ └────────┘ └─────────────┘
```

---

## Backend Services

### 1. API Gateway (`/backend/api-gateway/`)

#### Main Entry Point
**File**: `/backend/api-gateway/src/index.ts`

**Key Components**:
- Express application setup
- Security middleware (Helmet, CORS)
- Rate limiting
- Request correlation
- Graceful shutdown handling

**Variables**:
- `app`: Express application instance
- `server`: HTTP server instance
- `gracefulShutdown`: Shutdown handler

**Middleware Stack**:
1. `helmet`: Security headers
2. `compression`: Response compression
3. `correlationMiddleware`: Request tracking
4. `corsMiddleware`: CORS handling
5. `rateLimitMiddleware`: Request rate limiting
6. `errorHandler`: Global error handling

#### Configuration
**File**: `/backend/api-gateway/src/utils/config.ts`

**Interface**: `AppConfig`
```typescript
interface AppConfig {
  port: number;
  nodeEnv: string;
  logLevel: string;
  corsOrigins: string[];
  rateLimitWindow: number;
  rateLimitRequests: number;
  circuitBreakerTimeout: number;
  circuitBreakerThreshold: number;
  serviceUrls: {
    auth: string;
    data: string;
    file: string;
    external: string;
  };
}
```

### 2. Authentication Service (`/backend/services/auth/`)

#### JWT Service
**File**: `/backend/services/auth/src/services/jwt.service.ts`

**Class**: `JWTService`

**Key Methods**:
- `generateAccessToken(payload: TokenPayload): Promise<string>`
- `generateRefreshToken(payload: TokenPayload, family?: string): Promise<{token: string; family: string}>`
- `generateTokenPair(payload: TokenPayload): Promise<TokenPair>`
- `verifyToken(token: string): Promise<DecodedToken>`
- `rotateRefreshToken(currentToken: string, newPayload: TokenPayload): Promise<TokenPair>`
- `blacklistToken(token: string): void`
- `invalidateUserTokens(userId: string): Promise<void>`

**Interfaces**:
```typescript
interface TokenPayload {
  sub: string;      // User ID
  email: string;
  role: string;
  sessionId: string;
  fingerprint: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
  jti?: string;     // JWT ID for tracking
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}
```

**Security Features**:
- RS256 signing algorithm
- Token rotation with family tracking
- Token blacklisting
- Timing-safe comparison for fingerprints
- Token replay detection

#### Authentication Controller
**File**: `/backend/services/auth/src/controllers/auth.controller.ts`

**Key Endpoints**:
- `POST /register`: User registration
- `POST /login`: User authentication
- `POST /refresh`: Token refresh
- `POST /logout`: Session termination
- `POST /verify-2fa`: Two-factor authentication
- `GET /profile`: User profile retrieval

### 3. Data Service (`/backend/services/data/`)

#### Database Configuration
**File**: `/backend/services/data/config/database.ts`

**Connection Pool Settings**:
- Max connections: 20
- Idle timeout: 30000ms
- Connection timeout: 2000ms

#### Base Entity
**File**: `/backend/services/data/entities/base.entity.ts`

**Abstract Class**: `BaseEntity`
```typescript
abstract class BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

#### Base Repository
**File**: `/backend/services/data/repositories/base.repository.ts`

**Generic Methods**:
- `findAll(options?: QueryOptions): Promise<T[]>`
- `findById(id: string): Promise<T | null>`
- `create(data: CreateDto): Promise<T>`
- `update(id: string, data: UpdateDto): Promise<T>`
- `delete(id: string): Promise<boolean>`
- `softDelete(id: string): Promise<boolean>`

### 4. File Service (`/backend/services/file/`)

#### Storage Providers
**Files**:
- `/backend/services/file/src/services/storage-providers/s3.provider.ts`
- `/backend/services/file/src/services/storage-providers/azure.provider.ts`
- `/backend/services/file/src/services/storage-providers/local.provider.ts`

**Interface**: `StorageProvider`
```typescript
interface StorageProvider {
  upload(file: Buffer, key: string): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  getUrl(key: string): Promise<string>;
}
```

#### Image Processor
**File**: `/backend/services/file/src/services/image-processor.service.ts`

**Methods**:
- `resize(buffer: Buffer, width: number, height: number): Promise<Buffer>`
- `optimize(buffer: Buffer): Promise<Buffer>`
- `generateThumbnail(buffer: Buffer): Promise<Buffer>`

#### Virus Scanner
**File**: `/backend/services/file/src/services/virus-scanner.service.ts`

**Integration**: VirusTotal API

---

## Frontend Application

### Shell Platform (`/public_html/shell-platform/`)

#### Main Application Entry
**File**: `/public_html/shell-platform/backend/src/index.ts`

**Server Configuration**:
- Port: 3001 (configurable)
- Middleware: Helmet, CORS, compression, rate limiting
- Cookie parser for session management

#### Database Service
**File**: `/public_html/shell-platform/backend/src/services/DatabaseService.ts`

**Class**: `DatabaseService` (Singleton Pattern)

**Key Methods**:
```typescript
class DatabaseService {
  static getInstance(): DatabaseService
  async query<T>(text: string, params?: any[]): Promise<QueryResult<T>>
  async getClient(): Promise<PoolClient>
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>
  async testConnection(): Promise<boolean>
  async getStats(): Promise<ConnectionStats>
  async close(): Promise<void>
}
```

**Connection Pool Configuration**:
- Max connections: 20
- Idle timeout: 30000ms
- Connection timeout: 5000ms
- SSL: Enabled in production

#### Authentication Service
**File**: `/public_html/shell-platform/backend/src/services/AuthService.ts`

**Methods**:
- `register(username: string, email: string, password: string): Promise<User>`
- `login(email: string, password: string): Promise<AuthResult>`
- `refresh(refreshToken: string): Promise<AuthResult>`
- `logout(userId: string): Promise<void>`
- `verifyToken(token: string): Promise<TokenPayload>`

#### Plugin Service
**File**: `/public_html/shell-platform/backend/src/services/PluginService.ts`

**Plugin Management**:
- Dynamic plugin loading
- Version management
- Configuration storage
- Enable/disable functionality

#### File Service
**File**: `/public_html/shell-platform/backend/src/services/FileService.ts`

**Features**:
- File upload with validation
- MIME type checking
- Size restrictions
- Checksum generation
- Permission management

---

## Database Schema

### Tables

#### 1. Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
- `idx_users_username`: Username lookup
- `idx_users_email`: Email lookup
- `idx_users_role`: Role-based queries
- `idx_users_created_at`: Time-based sorting

#### 2. Sessions Table
```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    refresh_expires_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. Plugins Table
```sql
CREATE TABLE plugins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    version VARCHAR(20) NOT NULL,
    description TEXT,
    author VARCHAR(100),
    enabled BOOLEAN NOT NULL DEFAULT false,
    config JSONB,
    install_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    update_date TIMESTAMP WITH TIME ZONE,
    UNIQUE(name, version)
);
```

#### 4. Files Table
```sql
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    path TEXT NOT NULL,
    size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    checksum VARCHAR(64),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_public BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 5. File Permissions Table
```sql
CREATE TABLE file_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(20) NOT NULL CHECK (permission IN ('read', 'write', 'delete')),
    granted_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(file_id, user_id, permission)
);
```

#### 6. Audit Logs Table
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 7. System Settings Table
```sql
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Database Triggers

**Auto-update Timestamp Trigger**:
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';
```

Applied to: users, sessions, plugins, files, system_settings

---

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/auth/register` | User registration | `{username, email, password}` | `{user, tokens}` |
| POST | `/auth/login` | User login | `{email, password}` | `{user, tokens}` |
| POST | `/auth/refresh` | Refresh tokens | `{refreshToken}` | `{tokens}` |
| POST | `/auth/logout` | Logout user | - | `{success}` |
| GET | `/auth/profile` | Get profile | - | `{user}` |
| POST | `/auth/verify-2fa` | Verify 2FA | `{code}` | `{success}` |

### Plugin Endpoints

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/plugins` | List plugins | - | `{plugins[]}` |
| GET | `/plugins/:id` | Get plugin | - | `{plugin}` |
| POST | `/plugins` | Install plugin | `{name, version}` | `{plugin}` |
| PUT | `/plugins/:id` | Update plugin | `{config}` | `{plugin}` |
| DELETE | `/plugins/:id` | Remove plugin | - | `{success}` |
| POST | `/plugins/:id/enable` | Enable plugin | - | `{success}` |
| POST | `/plugins/:id/disable` | Disable plugin | - | `{success}` |

### File Endpoints

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/files` | List files | - | `{files[]}` |
| GET | `/files/:id` | Get file info | - | `{file}` |
| GET | `/files/:id/download` | Download file | - | Binary data |
| POST | `/files/upload` | Upload file | FormData | `{file}` |
| DELETE | `/files/:id` | Delete file | - | `{success}` |
| POST | `/files/:id/share` | Share file | `{userId, permission}` | `{success}` |

### Health Endpoints

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| GET | `/health` | Basic health | `{status: 'ok'}` |
| GET | `/health/database` | DB health | `{connected, stats}` |
| GET | `/health/services` | Service health | `{services: {...}}` |
| GET | `/ready` | Readiness probe | `{ready: boolean}` |
| GET | `/live` | Liveness probe | `{alive: boolean}` |

---

## Classes and Interfaces

### Core Classes

#### 1. CircuitBreaker
**File**: `/backend/api-gateway/src/utils/circuit-breaker.ts`

```typescript
class CircuitBreaker {
  constructor(options: CircuitBreakerOptions)
  async execute<T>(fn: () => Promise<T>): Promise<T>
  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN'
  getStats(): CircuitBreakerStats
  reset(): void
}
```

#### 2. Logger
**File**: Various `logger.ts` files

```typescript
class Logger {
  info(message: string, meta?: any): void
  error(message: string, error?: Error, meta?: any): void
  warn(message: string, meta?: any): void
  debug(message: string, meta?: any): void
  audit(action: string, userId: string, details?: any): void
  logSecurityEvent(event: SecurityEvent): void
}
```

#### 3. CryptoUtils
**File**: `/backend/services/auth/src/utils/crypto.utils.ts`

```typescript
class CryptoUtils {
  static async hashPassword(password: string): Promise<string>
  static async verifyPassword(password: string, hash: string): Promise<boolean>
  static generateSecureToken(length: number): Promise<string>
  static hashData(data: string): string
  static timingSafeEqual(a: string, b: string): boolean
  static maskSensitiveData(data: string): string
}
```

### TypeScript Interfaces

#### Request Extensions
```typescript
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  correlationId?: string;
  rawBody?: Buffer;
}
```

#### Service Response Types
```typescript
interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: Date;
    requestId: string;
    duration?: number;
  };
}
```

#### Pagination
```typescript
interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

---

## Configuration Files

### Environment Variables

#### API Gateway (.env)
```env
PORT=3000
NODE_ENV=production
LOG_LEVEL=info
CORS_ORIGINS=https://kevinalthaus.com
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_REQUESTS=100
CIRCUIT_BREAKER_TIMEOUT=3000
CIRCUIT_BREAKER_THRESHOLD=50
SERVICE_AUTH_URL=http://auth-service:8001
SERVICE_DATA_URL=http://data-service:8002
SERVICE_FILE_URL=http://file-service:8003
SERVICE_EXTERNAL_URL=http://external-service:8004
```

#### Authentication Service (.env)
```env
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=auth-service
JWT_AUDIENCE=api-gateway
JWT_KEY_PASSPHRASE=your-key-passphrase
BCRYPT_ROUNDS=10
TWO_FACTOR_SECRET=your-2fa-secret
EMAIL_SERVICE_API_KEY=your-email-api-key
```

#### Database Configuration
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shell_platform
DB_USER=shell_user
DB_PASSWORD=secure_password
DB_SSL=true
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=5000
```

### TypeScript Configuration

#### Base tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### Docker Configuration

#### docker-compose.yml (Production)
```yaml
version: '3.8'

services:
  api-gateway:
    build: ./backend/api-gateway
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - auth-service
      - data-service
      - file-service
      - postgres
      - redis

  auth-service:
    build: ./backend/services/auth
    environment:
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis

  data-service:
    build: ./backend/services/data
    environment:
      - NODE_ENV=production
    depends_on:
      - postgres

  file-service:
    build: ./backend/services/file
    volumes:
      - ./uploads:/app/uploads
    environment:
      - NODE_ENV=production

  postgres:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=shell_platform
      - POSTGRES_USER=shell_user
      - POSTGRES_PASSWORD=secure_password

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

---

## Testing Infrastructure

### Unit Tests
**Framework**: Jest
**Location**: `/tests/unit/`

**Test Structure**:
```typescript
describe('ServiceName', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  describe('methodName', () => {
    it('should do something', async () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

### Integration Tests
**Framework**: Jest + Supertest
**Location**: `/tests/integration/`

**API Testing Example**:
```typescript
describe('Auth API', () => {
  it('should register a new user', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'SecurePass123!'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('user');
    expect(response.body).toHaveProperty('tokens');
  });
});
```

### E2E Tests
**Framework**: Playwright
**Location**: `/tests/e2e/`

**Test Configuration**:
```typescript
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
```

### Test Coverage Requirements
- Unit Tests: >80% coverage
- Integration Tests: All API endpoints
- E2E Tests: Critical user flows
- Performance Tests: Load testing with k6
- Security Tests: OWASP ZAP integration

---

## Code Conventions

### Naming Conventions
- **Files**: kebab-case (e.g., `user-service.ts`)
- **Classes**: PascalCase (e.g., `UserService`)
- **Interfaces**: PascalCase with 'I' prefix (e.g., `IUserService`)
- **Functions**: camelCase (e.g., `getUserById`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)
- **Environment Variables**: UPPER_SNAKE_CASE

### File Organization
```
service/
├── src/
│   ├── controllers/     # Request handlers
│   ├── services/        # Business logic
│   ├── models/          # Data models
│   ├── repositories/    # Data access
│   ├── middleware/      # Express middleware
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript types
│   └── index.ts         # Entry point
├── tests/               # Test files
├── config/              # Configuration
└── package.json
```

### Error Handling Pattern
```typescript
try {
  // Operation
} catch (error) {
  logger.error('Operation failed', error);
  
  if (error instanceof ValidationError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details
    });
  }
  
  if (error instanceof NotFoundError) {
    return res.status(404).json({
      error: 'Resource not found'
    });
  }
  
  // Generic error
  return res.status(500).json({
    error: 'Internal server error'
  });
}
```

### Async/Await Pattern
```typescript
// Always use async/await over callbacks
async function processRequest(data: RequestData): Promise<ResponseData> {
  const validated = await validateData(data);
  const processed = await processData(validated);
  const saved = await saveToDatabase(processed);
  
  return formatResponse(saved);
}
```

---

## Security Implementations

### Authentication Flow
1. User provides credentials
2. Validate credentials against database
3. Generate JWT token pair (access + refresh)
4. Store refresh token hash in database
5. Return tokens to client
6. Client includes access token in Authorization header
7. Middleware validates token on each request
8. Refresh token used to get new access token

### Security Headers
```typescript
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
})
```

### Rate Limiting
- Window: 15 minutes
- Max requests: 100 per window
- Headers: X-RateLimit-Limit, X-RateLimit-Remaining

### Input Validation
- All inputs validated using Joi or class-validator
- SQL injection prevention via parameterized queries
- XSS prevention via input sanitization
- File upload restrictions (type, size)

---

## Performance Optimizations

### Database
- Connection pooling (max 20 connections)
- Indexed columns for frequent queries
- Prepared statements for repeated queries
- Query result caching with Redis

### API
- Response compression
- HTTP/2 support
- CDN for static assets
- Circuit breaker for external services

### Frontend
- Code splitting
- Lazy loading
- Image optimization
- Service worker for offline support

---

## Monitoring and Logging

### Metrics Collection
- Prometheus for metrics
- Grafana for visualization
- Custom business metrics

### Log Aggregation
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Structured logging with correlation IDs
- Log levels: ERROR, WARN, INFO, DEBUG

### Health Checks
- Liveness probe: `/live`
- Readiness probe: `/ready`
- Deep health check: `/health/database`

### Alerts
- Database connection failures
- High error rates (>1%)
- Response time degradation (>500ms p95)
- Memory usage (>80%)
- Disk usage (>80%)

---

## Deployment

### Environments
1. **Development**: Local Docker Compose
2. **Staging**: Kubernetes cluster
3. **Production**: Kubernetes with auto-scaling

### CI/CD Pipeline
1. Code push to GitHub
2. GitHub Actions triggered
3. Run tests (unit, integration, E2E)
4. Build Docker images
5. Push to registry
6. Deploy to staging
7. Run smoke tests
8. Manual approval for production
9. Blue-green deployment
10. Post-deployment verification

### Rollback Strategy
- Keep 3 previous versions
- Automated rollback on health check failure
- Database migration rollback scripts

---

## Maintenance

### Regular Tasks
- Weekly dependency updates
- Monthly security audits
- Quarterly performance reviews
- Annual penetration testing

### Backup Strategy
- Database: Daily automated backups
- Files: Incremental backups every 6 hours
- Retention: 30 days
- Off-site backup storage

### Disaster Recovery
- RPO (Recovery Point Objective): 1 hour
- RTO (Recovery Time Objective): 4 hours
- Regular DR drills
- Multi-region failover capability

---

*Document Version: 1.0.0*
*Last Updated: September 2024*
*Total Files Documented: 100+*
*Total Lines of Code: ~50,000*