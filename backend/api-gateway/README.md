# Shell Platform API Gateway

A production-ready API Gateway service built with Express.js and TypeScript for the Shell Platform microservices architecture.

## Features

- **Express.js with TypeScript** - Type-safe Node.js web framework
- **Comprehensive Middleware Stack**:
  - CORS with configurable origins
  - Rate limiting with express-rate-limit
  - Request validation using Joi
  - JWT authentication verification
  - Morgan for HTTP request logging
  - Global error handling with proper error responses
- **Service Routing & Proxying**:
  - `/auth/*` → http://auth-service:3001
  - `/data/*` → http://data-service:3002  
  - `/files/*` → http://file-service:3003
  - `/external/*` → http://external-service:3004
- **Circuit Breaker Pattern** - Using opossum for fault tolerance
- **Health Monitoring**:
  - `/health` - Basic health check
  - `/ready` - Readiness probe with dependency checks
  - `/live` - Liveness probe
  - `/status` - Detailed system status
- **Request Correlation IDs** - For distributed tracing
- **Graceful Shutdown** - Clean server shutdown with connection draining
- **Security Best Practices**:
  - Helmet for security headers
  - Request compression
  - Body parsing limits
  - Rate limiting per user/IP
- **Production Ready**:
  - Docker containerization
  - Multi-stage builds
  - Non-root user execution
  - Health checks
  - Structured logging

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
vim .env

# Start in development mode
npm run dev
```

### Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Docker

```bash
# Development
docker-compose -f docker-compose.dev.yml up --build

# Production
docker-compose up --build
```

## API Endpoints

### Health & Status
- `GET /health` - Basic health check
- `GET /live` - Liveness probe
- `GET /ready` - Readiness probe with service checks
- `GET /status` - Detailed system status with metrics

### Service Proxying
- `POST /auth/login` - Proxy to auth service
- `GET /data/users` - Proxy to data service (requires auth)
- `POST /files/upload` - Proxy to file service (requires auth)
- `GET /external/api/endpoint` - Proxy to external service (requires auth)

## Configuration

Environment variables (see `.env.example`):

```bash
# Server
PORT=3000
NODE_ENV=production

# Security
JWT_SECRET=your-secret-key
CORS_ORIGINS=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_REQUESTS=100   # per window

# Circuit Breaker
CIRCUIT_BREAKER_TIMEOUT=3000    # 3 seconds
CIRCUIT_BREAKER_THRESHOLD=50    # 50% error rate

# Services
AUTH_SERVICE_URL=http://auth-service:3001
DATA_SERVICE_URL=http://data-service:3002
FILE_SERVICE_URL=http://file-service:3003
EXTERNAL_SERVICE_URL=http://external-service:3004
```

## Authentication

The gateway expects JWT tokens in the Authorization header:

```
Authorization: Bearer <jwt-token>
```

JWT payload should include:
- `sub` - User ID
- `email` - User email
- `roles` - Array of user roles
- `permissions` - Array of permissions
- `sessionId` - Session identifier

## Circuit Breaker

Each service has its own circuit breaker with configurable:
- Timeout threshold
- Error rate threshold  
- Reset timeout
- Rolling window settings

Circuit breaker states:
- **Closed** - Normal operation
- **Open** - Failing fast, not calling service
- **Half-Open** - Testing if service recovered

## Request Tracing

Every request gets a correlation ID for tracing:
- Generated automatically if not provided
- Forwarded to downstream services
- Included in all log entries
- Returned in response headers

## Graceful Shutdown

The service handles shutdown signals gracefully:
1. Stop accepting new requests
2. Complete existing requests
3. Close circuit breakers
4. Run cleanup procedures
5. Close server connections
6. Exit process

## Monitoring & Observability

### Metrics Available
- Request rate and response times
- Circuit breaker states
- Memory and CPU usage
- Active connections
- Service health status

### Log Structure
- Structured JSON logging
- Correlation ID in all logs
- Request/response logging
- Error tracking with stack traces
- Configurable log levels

## Development

### Scripts
- `npm run dev` - Start with hot reload
- `npm run build` - Build TypeScript
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run test:coverage` - Test coverage

### Project Structure
```
src/
├── index.ts              # Main application entry
├── middleware/           # Express middleware
│   ├── auth.ts          # JWT authentication
│   ├── cors.ts          # CORS configuration
│   ├── correlation.ts   # Request correlation
│   ├── error-handler.ts # Error handling
│   ├── rate-limit.ts    # Rate limiting
│   └── validation.ts    # Request validation
├── routes/              # Route handlers
│   ├── health.ts        # Health check endpoints
│   └── proxy.ts         # Service proxy routes
├── types/               # TypeScript definitions
│   └── index.ts         # Type definitions
└── utils/               # Utility modules
    ├── circuit-breaker.ts # Circuit breaker logic
    ├── config.ts          # Configuration
    ├── errors.ts          # Error classes
    ├── graceful-shutdown.ts # Shutdown handling
    └── logger.ts          # Logging utilities
```

## Production Deployment

### Docker
```bash
# Build production image
docker build --target production -t shell-api-gateway .

# Run container
docker run -d \
  --name api-gateway \
  -p 3000:3000 \
  --env-file .env \
  shell-api-gateway
```

### Kubernetes
Deploy using the provided Kubernetes manifests (deployment, service, ingress).

### Health Checks
Configure your orchestrator to use:
- Liveness: `GET /live`
- Readiness: `GET /ready`

## Security Considerations

- JWT secrets should be strong and rotated regularly
- CORS origins should be explicitly configured
- Rate limits should be tuned for your traffic patterns
- Monitor for suspicious request patterns
- Keep dependencies updated
- Use HTTPS in production
- Implement proper network segmentation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality  
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details.