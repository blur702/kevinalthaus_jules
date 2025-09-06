import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { User, UserStatus } from '../models/user.model';
import { RefreshToken } from '../models/refresh-token.model';
import { AuditLog, AuditAction } from '../models/audit-log.model';
import { LoginAttempt, LoginAttemptStatus } from '../models/login-attempt.model';
import { JWTService } from '../services/jwt.service';
import { EmailService } from '../services/email.service';
import { TwoFactorService } from '../services/two-factor.service';
import { CryptoUtils } from '../utils/crypto.utils';
import { ValidationUtils, PasswordPolicy } from '../utils/validation.utils';
import { logger, SecurityEventType } from '../utils/logger.utils';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const jwtService = new JWTService();
const emailService = new EmailService();
const twoFactorService = new TwoFactorService();

const passwordPolicy: PasswordPolicy = {
  minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '12'),
  requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE === 'true',
  requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE === 'true',
  requireNumbers: process.env.PASSWORD_REQUIRE_NUMBER === 'true',
  requireSpecial: process.env.PASSWORD_REQUIRE_SPECIAL === 'true',
  minEntropy: 50
};

export class AuthController {
  /**
   * User registration with email verification
   */
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, username, password, firstName, lastName } = req.body;

      // Validate input
      const emailValidation = ValidationUtils.validateEmail(email);
      if (!emailValidation.isValid) {
        res.status(400).json({
          error: 'Invalid email',
          details: emailValidation.errors
        });
        return;
      }

      const usernameValidation = ValidationUtils.validateUsername(username);
      if (!usernameValidation.isValid) {
        res.status(400).json({
          error: 'Invalid username',
          details: usernameValidation.errors
        });
        return;
      }

      const passwordValidation = ValidationUtils.validatePassword(password, passwordPolicy);
      if (!passwordValidation.isValid) {
        res.status(400).json({
          error: 'Password does not meet requirements',
          details: passwordValidation.errors
        });
        return;
      }

      // Check if user already exists
      const userRepo = getRepository(User);
      const existingUser = await userRepo.findOne({
        where: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }]
      });

      if (existingUser) {
        res.status(409).json({
          error: 'User already exists',
          code: 'USER_EXISTS'
        });
        return;
      }

      // Create new user
      const hashedPassword = await CryptoUtils.hashPassword(password);
      const emailVerificationToken = await CryptoUtils.generateSecureToken();
      const emailVerificationExpires = new Date();
      emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 24);

      const user = userRepo.create({
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        status: UserStatus.PENDING,
        emailVerificationToken,
        emailVerificationExpires
      });

      await userRepo.save(user);

      // Send verification email
      await emailService.sendVerificationEmail(
        user.email,
        emailVerificationToken
      );

      // Log audit event
      await getRepository(AuditLog).save(
        AuditLog.createAuditLog({
          userId: user.id,
          action: AuditAction.REGISTER,
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('user-agent') || 'unknown',
          resource: '/register',
          method: 'POST',
          statusCode: 201
        })
      );

      logger.info('User registered', {
        userId: user.id,
        email: user.email
      });

      res.status(201).json({
        message: 'Registration successful. Please check your email to verify your account.',
        userId: user.id
      });
    } catch (error) {
      logger.error('Registration failed', error);
      res.status(500).json({
        error: 'Registration failed',
        code: 'REGISTRATION_ERROR'
      });
    }
  }

  /**
   * User login with rate limiting and account lockout
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, totpCode } = req.body;
      const ipAddress = req.ip || 'unknown';
      const userAgent = req.get('user-agent') || 'unknown';
      const fingerprint = CryptoUtils.generateFingerprint(
        userAgent,
        ipAddress,
        req.get('accept') || ''
      );

      // Validate input
      const emailValidation = ValidationUtils.validateEmail(email);
      if (!emailValidation.isValid) {
        res.status(400).json({
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
        return;
      }

      // Check login attempts
      const attemptRepo = getRepository(LoginAttempt);
      const recentAttempts = await attemptRepo.count({
        where: {
          email: email.toLowerCase(),
          status: LoginAttemptStatus.FAILED,
          createdAt: new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
        }
      });

      if (recentAttempts >= parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5')) {
        await attemptRepo.save({
          email: email.toLowerCase(),
          status: LoginAttemptStatus.RATE_LIMITED,
          ipAddress,
          userAgent,
          fingerprint,
          failureReason: 'Rate limited'
        });

        logger.logSecurityEvent({
          type: SecurityEventType.RATE_LIMIT_EXCEEDED,
          email: email.toLowerCase(),
          ipAddress,
          userAgent,
          details: { attemptCount: recentAttempts }
        });

        res.status(429).json({
          error: 'Too many login attempts. Please try again later.',
          code: 'RATE_LIMITED'
        });
        return;
      }

      // Find user
      const userRepo = getRepository(User);
      const user = await userRepo.findOne({
        where: { email: email.toLowerCase() },
        select: ['id', 'email', 'username', 'password', 'role', 'status', 
                 'emailVerified', 'twoFactorEnabled', 'twoFactorSecret',
                 'failedLoginAttempts', 'lockoutUntil', 'securitySettings']
      });

      if (!user) {
        await attemptRepo.save({
          email: email.toLowerCase(),
          status: LoginAttemptStatus.FAILED,
          ipAddress,
          userAgent,
          fingerprint,
          failureReason: 'User not found'
        });

        res.status(401).json({
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
        return;
      }

      // Check if account is locked
      if (user.isLocked()) {
        await attemptRepo.save({
          userId: user.id,
          email: user.email,
          status: LoginAttemptStatus.BLOCKED,
          ipAddress,
          userAgent,
          fingerprint,
          failureReason: 'Account locked'
        });

        logger.logSecurityEvent({
          type: SecurityEventType.ACCOUNT_LOCKED,
          userId: user.id,
          email: user.email,
          ipAddress,
          userAgent
        });

        res.status(423).json({
          error: 'Account is locked. Please contact support.',
          code: 'ACCOUNT_LOCKED'
        });
        return;
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        user.incrementFailedAttempts();
        
        if (user.failedLoginAttempts >= parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5')) {
          user.lockAccount(parseInt(process.env.LOCKOUT_DURATION_MINUTES || '30'));
        }
        
        await userRepo.save(user);

        await attemptRepo.save({
          userId: user.id,
          email: user.email,
          status: LoginAttemptStatus.FAILED,
          ipAddress,
          userAgent,
          fingerprint,
          failureReason: 'Invalid password'
        });

        logger.logSecurityEvent({
          type: SecurityEventType.LOGIN_FAILURE,
          userId: user.id,
          email: user.email,
          ipAddress,
          userAgent,
          details: { attemptCount: user.failedLoginAttempts }
        });

        res.status(401).json({
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        });
        return;
      }

      // Check email verification
      if (!user.emailVerified) {
        res.status(403).json({
          error: 'Email not verified. Please check your email.',
          code: 'EMAIL_NOT_VERIFIED'
        });
        return;
      }

      // Check 2FA
      if (user.twoFactorEnabled) {
        if (!totpCode) {
          res.status(200).json({
            requiresTwoFactor: true,
            message: 'Please provide 2FA code'
          });
          return;
        }

        const isValidTOTP = twoFactorService.verifyTOTP(
          user.twoFactorSecret!,
          totpCode
        );

        if (!isValidTOTP) {
          await attemptRepo.save({
            userId: user.id,
            email: user.email,
            status: LoginAttemptStatus.FAILED,
            ipAddress,
            userAgent,
            fingerprint,
            failureReason: 'Invalid 2FA code',
            usedTwoFactor: true
          });

          logger.logSecurityEvent({
            type: SecurityEventType.TWO_FA_VERIFICATION_FAILURE,
            userId: user.id,
            email: user.email,
            ipAddress,
            userAgent
          });

          res.status(401).json({
            error: 'Invalid 2FA code',
            code: 'INVALID_2FA'
          });
          return;
        }
      }

      // Check IP restrictions
      if (!user.isIpAllowed(ipAddress)) {
        await attemptRepo.save({
          userId: user.id,
          email: user.email,
          status: LoginAttemptStatus.BLOCKED,
          ipAddress,
          userAgent,
          fingerprint,
          failureReason: 'IP not allowed'
        });

        logger.logSecurityEvent({
          type: SecurityEventType.SUSPICIOUS_ACTIVITY,
          userId: user.id,
          email: user.email,
          ipAddress,
          userAgent,
          details: { reason: 'IP not in whitelist' }
        });

        res.status(403).json({
          error: 'Access denied from this location',
          code: 'IP_NOT_ALLOWED'
        });
        return;
      }

      // Generate tokens
      const sessionId = await CryptoUtils.generateSessionId();
      const tokenPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        sessionId,
        fingerprint
      };

      const tokens = await jwtService.generateTokenPair(tokenPayload);

      // Save refresh token
      const refreshTokenRepo = getRepository(RefreshToken);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await refreshTokenRepo.save({
        token: tokens.refreshToken,
        userId: user.id,
        family: await CryptoUtils.generateSecureToken(16),
        generation: 0,
        ipAddress,
        userAgent,
        fingerprint,
        expiresAt,
        metadata: {
          browser: this.parseBrowser(userAgent),
          os: this.parseOS(userAgent)
        }
      });

      // Update user login info
      user.resetFailedAttempts();
      user.updateLastLogin(ipAddress, userAgent, fingerprint);
      
      // Add trusted device if new
      if (!user.isTrustedDevice(fingerprint)) {
        user.addTrustedDevice(fingerprint, `${this.parseBrowser(userAgent)} on ${this.parseOS(userAgent)}`);
      }
      
      await userRepo.save(user);

      // Log successful login
      await attemptRepo.save({
        userId: user.id,
        email: user.email,
        status: LoginAttemptStatus.SUCCESS,
        ipAddress,
        userAgent,
        fingerprint,
        usedTwoFactor: user.twoFactorEnabled
      });

      await getRepository(AuditLog).save(
        AuditLog.createAuditLog({
          userId: user.id,
          action: AuditAction.LOGIN,
          ipAddress,
          userAgent,
          fingerprint,
          resource: '/login',
          method: 'POST',
          statusCode: 200
        })
      );

      logger.logSecurityEvent({
        type: SecurityEventType.LOGIN_SUCCESS,
        userId: user.id,
        email: user.email,
        ipAddress,
        userAgent
      });

      res.status(200).json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: tokens.tokenType,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName
        }
      });
    } catch (error) {
      logger.error('Login failed', error);
      res.status(500).json({
        error: 'Login failed',
        code: 'LOGIN_ERROR'
      });
    }
  }

  /**
   * Logout and invalidate tokens
   */
  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.token) {
        res.status(401).json({
          error: 'Not authenticated',
          code: 'NOT_AUTHENTICATED'
        });
        return;
      }

      // Blacklist current access token
      jwtService.blacklistToken(req.token);

      // Revoke all refresh tokens for this session
      const refreshTokenRepo = getRepository(RefreshToken);
      await refreshTokenRepo.update(
        {
          userId: req.user.id,
          fingerprint: req.fingerprint,
          isRevoked: false
        },
        {
          isRevoked: true,
          revokedAt: new Date(),
          revokedReason: 'logout'
        }
      );

      // Log audit event
      await getRepository(AuditLog).save(
        AuditLog.createAuditLog({
          userId: req.user.id,
          action: AuditAction.LOGOUT,
          ipAddress: req.ip || 'unknown',
          userAgent: req.get('user-agent') || 'unknown',
          fingerprint: req.fingerprint,
          resource: '/logout',
          method: 'POST',
          statusCode: 200
        })
      );

      logger.info('User logged out', {
        userId: req.user.id,
        sessionId: req.user.sessionId
      });

      res.status(200).json({
        message: 'Logged out successfully'
      });
    } catch (error) {
      logger.error('Logout failed', error);
      res.status(500).json({
        error: 'Logout failed',
        code: 'LOGOUT_ERROR'
      });
    }
  }

  // Helper methods
  private static parseBrowser(userAgent: string): string {
    // Simple browser detection
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private static parseOS(userAgent: string): string {
    // Simple OS detection
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }
}