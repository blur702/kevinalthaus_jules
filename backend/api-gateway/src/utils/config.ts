import { config } from 'dotenv';
import { AppConfig } from '@/types';

// Load environment variables
config();

const requiredEnvVars = ['JWT_SECRET'] as const;

// Validate required environment variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const appConfig: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  jwtSecret: process.env.JWT_SECRET!,
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
  rateLimitRequests: parseInt(process.env.RATE_LIMIT_REQUESTS || '100', 10),
  circuitBreakerTimeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '3000', 10),
  circuitBreakerThreshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '50', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
} as const;

export const serviceConfig = {
  auth: {
    name: 'auth-service',
    url: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
    path: '/auth',
    timeout: parseInt(process.env.AUTH_SERVICE_TIMEOUT || '5000', 10),
  },
  data: {
    name: 'data-service',
    url: process.env.DATA_SERVICE_URL || 'http://data-service:3002',
    path: '/data',
    timeout: parseInt(process.env.DATA_SERVICE_TIMEOUT || '5000', 10),
  },
  files: {
    name: 'file-service',
    url: process.env.FILE_SERVICE_URL || 'http://file-service:3003',
    path: '/files',
    timeout: parseInt(process.env.FILE_SERVICE_TIMEOUT || '10000', 10),
  },
  external: {
    name: 'external-service',
    url: process.env.EXTERNAL_SERVICE_URL || 'http://external-service:3004',
    path: '/external',
    timeout: parseInt(process.env.EXTERNAL_SERVICE_TIMEOUT || '8000', 10),
  },
} as const;

export const isProduction = (): boolean => appConfig.nodeEnv === 'production';
export const isDevelopment = (): boolean => appConfig.nodeEnv === 'development';
export const isTest = (): boolean => appConfig.nodeEnv === 'test';