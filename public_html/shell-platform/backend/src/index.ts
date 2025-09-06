// Load environment variables first
import dotenv from 'dotenv';
import path from 'path';

// Try multiple paths for .env file
const envPaths = [
  path.join(__dirname, '../.env'),
  path.join(__dirname, '../../.env'),
  '.env'
];

let envLoaded = false;
for (const envPath of envPaths) {
  try {
    dotenv.config({ path: envPath });
    if (process.env.JWT_SECRET) {
      envLoaded = true;
      console.log(`Environment loaded from: ${envPath}`);
      break;
    }
  } catch (error) {
    // Continue trying other paths
  }
}

if (!envLoaded) {
  console.warn('No valid .env file found, using defaults');
  // Set default values
  process.env.JWT_SECRET = 'your-super-secret-jwt-key-change-this-in-production';
  process.env.JWT_REFRESH_SECRET = 'your-super-secret-refresh-key-change-this';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  process.env.PORT = '3001';
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

// Import routes
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import pluginRoutes from './routes/plugins';
import fileRoutes from './routes/files';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

// Import database initialization
import { DatabaseInitializer } from './utils/initDb';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://kevinalthaus.com', 'https://www.kevinalthaus.com']
    : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// Middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Routes
app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/plugins', pluginRoutes);
app.use('/files', fileRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Shell Platform Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    console.log('🔧 Testing database connection...');
    const { getDatabase } = await import('./services/DatabaseService');
    const db = getDatabase();
    const isConnected = await db.testConnection();
    
    if (isConnected) {
      console.log('✅ Database connection successful');
    } else {
      console.warn('⚠️  Database connection failed, but continuing startup');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Shell Platform Backend API running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 Database health: http://localhost:${PORT}/health/database`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

export default app;