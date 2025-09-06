import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { ApiResponse, AuthResponse, LoginCredentials, User, JWTPayload } from '../types';
import { authenticate } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types';
import config from '../utils/config';

const router = Router();

// Mock users database - In production, this would be a real database
const mockUsers: User[] = [
  {
    id: '1',
    username: 'admin',
    email: 'kevin.althaus@gmail.com',
    role: 'admin',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    username: 'user',
    email: 'user@shellplatform.com',
    role: 'user',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// Mock password storage (hashed passwords using bcryptjs)
const mockPasswords: Record<string, string> = {
  admin: '$2a$10$xwhygXSQTvAnH98.FienieRokU7eSp5Zr.XzvBlXokWVY/SsDmJiy', // (130Bpm)
  user: '$2a$10$YQq8ZE0qOxKj3xGvx2tVaOxjJGQnHnQn7B7hPxK4RIhUzqN/sUuze', // user123
};

/**
 * POST /auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', [
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
], async (req: Request, res: Response<ApiResponse<AuthResponse>>) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: errors.array().map(err => err.msg).join(', '),
        timestamp: new Date().toISOString(),
      });
    }

    // Accept both email and username for login
    const { email, username, password } = req.body;
    const loginIdentifier = email || username;
    
    if (!loginIdentifier) {
      return res.status(400).json({
        success: false,
        message: 'Email or username is required',
        timestamp: new Date().toISOString(),
      });
    }

    // Find user by email or username
    const user = mockUsers.find(u => 
      u.email === loginIdentifier || u.username === loginIdentifier
    );
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        timestamp: new Date().toISOString(),
      });
    }

    // Check password
    const hashedPassword = mockPasswords[user.username];
    if (!hashedPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        timestamp: new Date().toISOString(),
      });
    }

    const isPasswordValid = await bcrypt.compare(password, hashedPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
        timestamp: new Date().toISOString(),
      });
    }

    // Generate JWT token
    const payload: JWTPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };

    const token = jwt.sign(
      payload,
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
    );

    const refreshToken = jwt.sign(
      payload,
      config.jwtRefreshSecret,
      { expiresIn: config.jwtRefreshExpiresIn } as jwt.SignOptions
    );

    // Set secure cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000, // 1 hour
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 604800000, // 7 days
    });

    const authResponse: AuthResponse = {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      accessToken: token,
      refreshToken,
    };

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: authResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /auth/status
 * Check authentication status
 */
router.get('/status', authenticate, (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
        timestamp: new Date().toISOString(),
      });
    }

    res.status(200).json({
      success: true,
      message: 'User is authenticated',
      data: {
        user: {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          role: req.user.role,
        },
        authenticated: true,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Status check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /auth/logout
 * Logout user and clear cookies
 */
router.post('/logout', (req: Request, res: Response<ApiResponse>) => {
  try {
    // Clear cookies
    res.clearCookie('token');
    res.clearCookie('refreshToken');

    res.status(200).json({
      success: true,
      message: 'Logout successful',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /auth/refresh
 * Refresh JWT token using refresh token
 */
router.post('/refresh', (req: Request, res: Response<ApiResponse>) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not provided',
        timestamp: new Date().toISOString(),
      });
    }

    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as JWTPayload;

    // Generate new access token
    const payload: JWTPayload = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
    };

    const newToken = jwt.sign(
      payload,
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
    );

    // Set new token cookie
    res.cookie('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000, // 1 hour
    });

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: { token: newToken },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /auth/me
 * Get current user (alias for profile)
 */
router.get('/me', authenticate, (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
        timestamp: new Date().toISOString(),
      });
    }

    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: req.user,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get user',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /auth/profile
 * Get user profile
 */
router.get('/profile', authenticate, (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
        timestamp: new Date().toISOString(),
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        createdAt: req.user.createdAt,
        updatedAt: req.user.updatedAt,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;