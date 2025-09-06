import { Request } from 'express';

// User types
export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

// Authentication types
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  accessToken: string;
  refreshToken?: string;
}

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Request with user
export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Plugin types
export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  installDate: Date;
  updateDate?: Date;
  config?: Record<string, any>;
}

export interface PluginInstallRequest {
  name: string;
  source: string;
  version?: string;
}

// File types
export interface FileInfo {
  id: string;
  name: string;
  path: string;
  size: number;
  mimeType: string;
  createdAt: Date;
  updatedAt: Date;
  owner: string;
}

export interface FileUploadRequest {
  file: Express.Multer.File;
  metadata?: Record<string, any>;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
  code?: string;
  details?: any;
}

// Health check types
export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    database?: 'connected' | 'disconnected';
    redis?: 'connected' | 'disconnected';
    [key: string]: string | undefined;
  };
}

// Configuration types
export interface AppConfig {
  port: number;
  nodeEnv: string;
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;
  dbHost: string;
  dbPort: number;
  dbUser: string;
  dbPassword: string;
  dbName: string;
  redisHost: string;
  redisPort: number;
  redisPassword: string;
}

// Export everything as types only - no need for default export with value references