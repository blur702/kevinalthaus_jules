import { Request, Response, NextFunction } from 'express';
import { Server } from 'http';

export interface AppConfig {
  readonly port: number;
  readonly nodeEnv: string;
  readonly corsOrigins: string[];
  readonly jwtSecret: string;
  readonly rateLimitWindow: number;
  readonly rateLimitRequests: number;
  readonly circuitBreakerTimeout: number;
  readonly circuitBreakerThreshold: number;
  readonly logLevel: string;
}

export interface ServiceConfig {
  readonly name: string;
  readonly url: string;
  readonly path: string;
  readonly timeout: number;
}

export interface CircuitBreakerOptions {
  timeout: number;
  errorThresholdPercentage: number;
  resetTimeout: number;
  rollingCountTimeout: number;
  rollingCountBuckets: number;
  name: string;
  group: string;
}

export interface CorrelationContext {
  correlationId: string;
  userId?: string;
  sessionId?: string;
  requestStartTime: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  iat: number;
  exp: number;
}

export interface CustomRequest extends Request {
  correlationId: string;
  user?: AuthenticatedUser;
  startTime: number;
}

export interface CustomResponse extends Response {
  correlationId: string;
}

export interface ApiError extends Error {
  statusCode: number;
  code: string;
  details?: Record<string, unknown>;
  correlationId?: string;
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  services: ServiceHealthStatus[];
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
}

export interface ServiceHealthStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
}

export interface RequestMetrics {
  correlationId: string;
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  userAgent?: string;
  ip: string;
  userId?: string;
  error?: string;
}

export type AsyncMiddleware = (
  req: CustomRequest,
  res: CustomResponse,
  next: NextFunction
) => Promise<void>;

export type ErrorHandler = (
  err: ApiError,
  req: CustomRequest,
  res: CustomResponse,
  next: NextFunction
) => void;

export type ShutdownHandler = (server: Server) => Promise<void>;

export interface ProxyConfig {
  target: string;
  pathRewrite?: Record<string, string>;
  changeOrigin: boolean;
  timeout: number;
  retries?: number;
}

export interface ValidationSchema {
  body?: object;
  query?: object;
  params?: object;
  headers?: object;
}

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  iat: number;
  exp: number;
}

export interface LogContext {
  correlationId: string;
  userId?: string;
  method: string;
  url: string;
  ip: string;
  userAgent?: string;
  [key: string]: unknown;
}