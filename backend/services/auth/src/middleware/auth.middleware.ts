import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../services/jwt.service';
import { logger, SecurityEventType } from '../utils/logger.utils';
import { CryptoUtils } from '../utils/crypto.utils';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    sessionId: string;
  };
  token?: string;
  fingerprint?: string;
}

const jwtService = new JWTService();

/**
 * Authentication middleware following OWASP guidelines
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.logSecurityEvent({
        type: SecurityEventType.PERMISSION_DENIED,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        details: {
          reason: 'Missing or invalid authorization header',
          path: req.path
        }
      });
      
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    const token = authHeader.substring(7);
    req.token = token;

    // Generate device fingerprint
    const fingerprint = CryptoUtils.generateFingerprint(
      req.get('user-agent') || '',
      req.ip || '',
      req.get('accept') || ''
    );
    req.fingerprint = fingerprint;

    // Verify token
    const decoded = await jwtService.verifyToken(token);

    // Validate token binding
    if (!jwtService.validateTokenBinding(decoded, fingerprint)) {
      logger.logSecurityEvent({
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        userId: decoded.payload.sub,
        email: decoded.payload.email,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        details: {
          reason: 'Token binding validation failed',
          path: req.path
        }
      });
      
      res.status(401).json({
        error: 'Invalid token binding',
        code: 'INVALID_TOKEN_BINDING'
      });
      return;
    }

    // Attach user to request
    req.user = {
      id: decoded.payload.sub,
      email: decoded.payload.email,
      role: decoded.payload.role,
      sessionId: decoded.payload.sessionId
    };

    // Log successful authentication
    logger.debug('User authenticated', {
      userId: req.user.id,
      path: req.path,
      method: req.method
    });

    next();
  } catch (error: any) {
    logger.logSecurityEvent({
      type: SecurityEventType.INVALID_TOKEN,
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
      details: {
        error: error.message,
        path: req.path
      }
    });

    if (error.message === 'Token has expired') {
      res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    } else {
      res.status(401).json({
        error: 'Authentication failed',
        code: 'AUTH_FAILED'
      });
    }
  }
};

/**
 * Role-based access control middleware
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.logSecurityEvent({
        type: SecurityEventType.PERMISSION_DENIED,
        userId: req.user.id,
        email: req.user.email,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        details: {
          requiredRoles: allowedRoles,
          userRole: req.user.role,
          path: req.path
        }
      });

      res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
      return;
    }

    next();
  };
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  try {
    const token = authHeader.substring(7);
    const fingerprint = CryptoUtils.generateFingerprint(
      req.get('user-agent') || '',
      req.ip || '',
      req.get('accept') || ''
    );

    const decoded = await jwtService.verifyToken(token);
    
    if (jwtService.validateTokenBinding(decoded, fingerprint)) {
      req.user = {
        id: decoded.payload.sub,
        email: decoded.payload.email,
        role: decoded.payload.role,
        sessionId: decoded.payload.sessionId
      };
      req.token = token;
      req.fingerprint = fingerprint;
    }
  } catch {
    // Ignore errors for optional auth
  }

  next();
};