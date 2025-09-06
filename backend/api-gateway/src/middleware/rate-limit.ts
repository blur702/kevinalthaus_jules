import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { appConfig } from '@/utils/config';
import { CustomRequest } from '@/types';
import { RateLimitError } from '@/utils/errors';
import { createContextLogger } from '@/utils/logger';

// Create rate limiter with Redis store for production
export const rateLimitMiddleware = rateLimit({
  windowMs: appConfig.rateLimitWindow,
  max: appConfig.rateLimitRequests,
  
  // Key generator for rate limiting
  keyGenerator: (req: Request): string => {
    const customReq = req as CustomRequest;
    
    // Use user ID if authenticated, otherwise use IP
    if (customReq.user?.id) {
      return `user:${customReq.user.id}`;
    }
    
    // Get real IP from various headers
    const forwarded = req.headers['x-forwarded-for'] as string;
    const realIp = req.headers['x-real-ip'] as string;
    const ip = forwarded?.split(',')[0] || realIp || req.ip || req.connection.remoteAddress || 'unknown';
    
    return `ip:${ip}`;
  },

  // Custom handler for rate limit exceeded
  handler: (req: Request, res: Response): void => {
    const customReq = req as CustomRequest;
    const logger = createContextLogger({
      correlationId: customReq.correlationId,
      method: req.method,
      url: req.url,
      ip: req.ip || 'unknown',
      userId: customReq.user?.id,
      userAgent: req.headers['user-agent'],
    });

    logger.warn('Rate limit exceeded', {
      rateLimitKey: rateLimitMiddleware.keyGenerator(req),
      limit: appConfig.rateLimitRequests,
      window: appConfig.rateLimitWindow,
    });

    const error = new RateLimitError(
      'Too many requests, please try again later',
      customReq.correlationId
    );

    res.status(error.statusCode).json({
      error: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        correlationId: customReq.correlationId,
        timestamp: new Date().toISOString(),
        retryAfter: Math.ceil(appConfig.rateLimitWindow / 1000),
      },
    });
  },

  // Skip successful requests for rate limiting in development
  skip: (req: Request): boolean => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/ready';
  },

  // Add rate limit info to headers
  standardHeaders: true,
  legacyHeaders: false,

  // Custom success handler to add additional headers
  onLimitReached: (req: Request): void => {
    const customReq = req as CustomRequest;
    const logger = createContextLogger({
      correlationId: customReq.correlationId,
      method: req.method,
      url: req.url,
      ip: req.ip || 'unknown',
      userId: customReq.user?.id,
    });

    logger.warn('Rate limit threshold reached', {
      limit: appConfig.rateLimitRequests,
      window: appConfig.rateLimitWindow,
    });
  },
});

// Enhanced rate limiter for authentication endpoints
export const authRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs for auth endpoints
  
  keyGenerator: (req: Request): string => {
    const forwarded = req.headers['x-forwarded-for'] as string;
    const realIp = req.headers['x-real-ip'] as string;
    const ip = forwarded?.split(',')[0] || realIp || req.ip || req.connection.remoteAddress || 'unknown';
    return `auth:${ip}`;
  },

  handler: (req: Request, res: Response): void => {
    const customReq = req as CustomRequest;
    const logger = createContextLogger({
      correlationId: customReq.correlationId,
      method: req.method,
      url: req.url,
      ip: req.ip || 'unknown',
    });

    logger.warn('Authentication rate limit exceeded', {
      endpoint: req.path,
      limit: 5,
      window: '15 minutes',
    });

    const error = new RateLimitError(
      'Too many authentication attempts, please try again later',
      customReq.correlationId
    );

    res.status(error.statusCode).json({
      error: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        correlationId: customReq.correlationId,
        timestamp: new Date().toISOString(),
        retryAfter: 900, // 15 minutes in seconds
      },
    });
  },

  standardHeaders: true,
  legacyHeaders: false,
});