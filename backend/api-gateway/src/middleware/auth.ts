import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { appConfig } from '@/utils/config';
import { CustomRequest, AuthenticatedUser, JwtPayload } from '@/types';
import { AuthenticationError, AuthorizationError } from '@/utils/errors';
import { createContextLogger } from '@/utils/logger';

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const customReq = req as CustomRequest;
  
  const logger = createContextLogger({
    correlationId: customReq.correlationId,
    method: req.method,
    url: req.url,
    ip: req.ip || 'unknown',
    userAgent: req.headers['user-agent'],
  });

  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      logger.warn('Missing authorization header');
      throw new AuthenticationError('Authorization header is required', customReq.correlationId);
    }

    if (!authHeader.startsWith('Bearer ')) {
      logger.warn('Invalid authorization header format');
      throw new AuthenticationError('Authorization header must start with Bearer', customReq.correlationId);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      logger.warn('Missing JWT token');
      throw new AuthenticationError('JWT token is required', customReq.correlationId);
    }

    // Verify and decode JWT token
    const decoded = jwt.verify(token, appConfig.jwtSecret) as JwtPayload;

    // Check if token is expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < currentTime) {
      logger.warn('JWT token expired', { 
        exp: decoded.exp, 
        current: currentTime 
      });
      throw new AuthenticationError('JWT token has expired', customReq.correlationId);
    }

    // Create authenticated user object
    const authenticatedUser: AuthenticatedUser = {
      id: decoded.sub,
      email: decoded.email,
      roles: decoded.roles || [],
      permissions: decoded.permissions || [],
      sessionId: decoded.sessionId,
      iat: decoded.iat,
      exp: decoded.exp,
    };

    // Attach user to request
    customReq.user = authenticatedUser;

    logger.info('User authenticated successfully', {
      userId: authenticatedUser.id,
      email: authenticatedUser.email,
      roles: authenticatedUser.roles,
      sessionId: authenticatedUser.sessionId,
    });

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.error('JWT verification failed', error);
      next(new AuthenticationError('Invalid JWT token', customReq.correlationId));
    } else if (error instanceof jwt.TokenExpiredError) {
      logger.warn('JWT token expired');
      next(new AuthenticationError('JWT token has expired', customReq.correlationId));
    } else {
      next(error);
    }
  }
};

// Middleware for optional authentication
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const customReq = req as CustomRequest;
  
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No auth header, continue without authentication
      return next();
    }

    // Use the regular auth middleware
    await authenticateToken(req, res, next);
  } catch (error) {
    // If authentication fails but it's optional, just continue
    next();
  }
};

// Authorization middleware factory
export const requirePermissions = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const customReq = req as CustomRequest;
    
    const logger = createContextLogger({
      correlationId: customReq.correlationId,
      method: req.method,
      url: req.url,
      ip: req.ip || 'unknown',
      userId: customReq.user?.id,
    });

    if (!customReq.user) {
      logger.warn('User not authenticated for permission check');
      return next(new AuthenticationError('Authentication required', customReq.correlationId));
    }

    const userPermissions = customReq.user.permissions || [];
    const hasPermission = permissions.every(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      logger.warn('Insufficient permissions', {
        required: permissions,
        userPermissions,
        userId: customReq.user.id,
      });
      
      return next(new AuthorizationError(
        `Required permissions: ${permissions.join(', ')}`,
        customReq.correlationId
      ));
    }

    logger.debug('Permission check passed', {
      required: permissions,
      userId: customReq.user.id,
    });

    next();
  };
};

// Role-based authorization middleware factory
export const requireRoles = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const customReq = req as CustomRequest;
    
    const logger = createContextLogger({
      correlationId: customReq.correlationId,
      method: req.method,
      url: req.url,
      ip: req.ip || 'unknown',
      userId: customReq.user?.id,
    });

    if (!customReq.user) {
      logger.warn('User not authenticated for role check');
      return next(new AuthenticationError('Authentication required', customReq.correlationId));
    }

    const userRoles = customReq.user.roles || [];
    const hasRole = roles.some(role => userRoles.includes(role));

    if (!hasRole) {
      logger.warn('Insufficient role access', {
        required: roles,
        userRoles,
        userId: customReq.user.id,
      });
      
      return next(new AuthorizationError(
        `Required roles: ${roles.join(', ')}`,
        customReq.correlationId
      ));
    }

    logger.debug('Role check passed', {
      required: roles,
      userId: customReq.user.id,
    });

    next();
  };
};

// Admin role check
export const requireAdmin = requireRoles(['admin']);

// User can only access their own resources
export const requireOwnership = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const customReq = req as CustomRequest;
    
    const logger = createContextLogger({
      correlationId: customReq.correlationId,
      method: req.method,
      url: req.url,
      ip: req.ip || 'unknown',
      userId: customReq.user?.id,
    });

    if (!customReq.user) {
      logger.warn('User not authenticated for ownership check');
      return next(new AuthenticationError('Authentication required', customReq.correlationId));
    }

    const requestedUserId = req.params[userIdParam] || req.body[userIdParam] || req.query[userIdParam];
    
    if (!requestedUserId) {
      logger.warn('User ID parameter not found in request', {
        paramName: userIdParam,
        params: req.params,
      });
      return next(new AuthorizationError('User ID parameter is required', customReq.correlationId));
    }

    // Admin can access any user's resources
    if (customReq.user.roles?.includes('admin')) {
      logger.debug('Admin access granted for ownership check', {
        adminUserId: customReq.user.id,
        targetUserId: requestedUserId,
      });
      return next();
    }

    // User can only access their own resources
    if (customReq.user.id !== requestedUserId) {
      logger.warn('Ownership check failed', {
        userId: customReq.user.id,
        requestedUserId,
      });
      
      return next(new AuthorizationError(
        'You can only access your own resources',
        customReq.correlationId
      ));
    }

    logger.debug('Ownership check passed', {
      userId: customReq.user.id,
      requestedUserId,
    });

    next();
  };
};