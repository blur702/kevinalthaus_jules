import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, JWTPayload, User } from '../types';
import config from '../utils/config';

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        timestamp: new Date().toISOString(),
      });
    }

    const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
    
    // In a real application, you would fetch the user from the database
    // For now, we'll create a mock user from the token payload
    const user: User = {
      id: decoded.userId,
      username: decoded.username,
      email: `${decoded.username}@example.com`,
      role: decoded.role as 'admin' | 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token.',
      timestamp: new Date().toISOString(),
    });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Not authenticated.',
        timestamp: new Date().toISOString(),
      });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
        timestamp: new Date().toISOString(),
      });
    }

    next();
  };
};

const extractToken = (req: AuthenticatedRequest): string | null => {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check cookies
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  // Check query parameter (not recommended for production)
  if (req.query.token && typeof req.query.token === 'string') {
    return req.query.token;
  }

  return null;
};

export default { authenticate, authorize };