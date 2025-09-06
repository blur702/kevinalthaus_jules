import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, JWTPayload, LoginCredentials, AuthResponse } from '../types';
import config from '../utils/config';
import { DatabaseService } from './DatabaseService';

export class AuthService {
  private static instance: AuthService;
  
  // Mock users database
  private users: User[] = [
    {
      id: '1',
      username: 'admin',
      email: 'admin@shellplatform.com',
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

  // Mock password storage (hashed passwords)
  private passwords: Record<string, string> = {
    admin: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewRyp3t2zWRnfmoi', // admin123
    user: '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // user123
  };

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Authenticate user with username and password
   */
  public async authenticateUser(credentials: LoginCredentials): Promise<AuthResponse> {
    const { username, password } = credentials;

    // Try database first
    const db = DatabaseService.getInstance();
    try {
      const result = await db.query(
        'SELECT id, username, email, password_hash, role, is_active, created_at, updated_at FROM users WHERE username = $1 AND is_active = true',
        [username]
      );
      
      if (result.rows.length > 0) {
        const dbUser = result.rows[0];
        const isPasswordValid = await bcrypt.compare(password, dbUser.password_hash);
        
        if (!isPasswordValid) {
          throw new Error('Invalid credentials');
        }
        
        const user = {
          id: dbUser.id,
          username: dbUser.username,
          email: dbUser.email,
          role: dbUser.role,
          createdAt: dbUser.created_at,
          updatedAt: dbUser.updated_at,
        };
        
        const tokens = this.generateTokens(user);
        
        return {
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        };
      }
    } catch (dbError) {
      console.log('Database auth failed, falling back to mock data:', dbError);
    }

    // Fallback to mock data if database fails
    const user = this.users.find(u => u.username === username);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check password
    const hashedPassword = this.passwords[username];
    if (!hashedPassword) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, hashedPassword);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const tokens = this.generateTokens(user);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Generate JWT tokens for user
   */
  public generateTokens(user: User): { accessToken: string; refreshToken: string } {
    const payload: JWTPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };

    const accessToken = jwt.sign(
      payload,
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
    );

    const refreshToken = jwt.sign(
      payload,
      config.jwtRefreshSecret,
      { expiresIn: config.jwtRefreshExpiresIn } as jwt.SignOptions
    );

    return { accessToken, refreshToken };
  }

  /**
   * Verify JWT token
   */
  public verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, config.jwtSecret) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Verify refresh token
   */
  public verifyRefreshToken(refreshToken: string): JWTPayload {
    try {
      return jwt.verify(refreshToken, config.jwtRefreshSecret) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Get user by ID
   */
  public getUserById(userId: string): User | null {
    return this.users.find(u => u.id === userId) || null;
  }

  /**
   * Get user by username
   */
  public getUserByUsername(username: string): User | null {
    return this.users.find(u => u.username === username) || null;
  }

  /**
   * Hash password
   */
  public async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare password with hash
   */
  public async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Create new user (for registration)
   */
  public async createUser(userData: {
    username: string;
    email: string;
    password: string;
    role?: 'admin' | 'user';
  }): Promise<User> {
    const { username, email, password, role = 'user' } = userData;

    // Check if user already exists
    if (this.getUserByUsername(username)) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create new user
    const newUser: User = {
      id: (this.users.length + 1).toString(),
      username,
      email,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add to users and passwords
    this.users.push(newUser);
    this.passwords[username] = hashedPassword;

    return newUser;
  }

  /**
   * Update user
   */
  public async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    // Update user data
    this.users[userIndex] = {
      ...this.users[userIndex],
      ...updates,
      updatedAt: new Date(),
    };

    return this.users[userIndex];
  }

  /**
   * Delete user
   */
  public deleteUser(userId: string): boolean {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return false;
    }

    const user = this.users[userIndex];
    this.users.splice(userIndex, 1);
    delete this.passwords[user.username];

    return true;
  }

  /**
   * Get all users (admin only)
   */
  public getAllUsers(): User[] {
    return this.users;
  }
}

export default AuthService;