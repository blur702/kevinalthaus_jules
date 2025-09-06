/**
 * AuthenticationService - Handles authentication for all plugins
 */

export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  avatar?: string;
  metadata?: Record<string, any>;
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
}

export class AuthenticationService {
  private currentUser: User | null = null;
  private token: AuthToken | null = null;
  private listeners: Set<(user: User | null) => void> = new Set();

  async initialize(): Promise<void> {
    // Load saved session
    await this.loadSession();
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<User> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      this.currentUser = data.user;
      this.token = data.token;
      
      // Save session
      this.saveSession();
      
      // Notify listeners
      this.notifyListeners();
      
      return this.currentUser;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      if (this.token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: this.getAuthHeaders(),
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.currentUser = null;
      this.token = null;
      this.clearSession();
      this.notifyListeners();
    }
  }

  /**
   * Register new user
   */
  async register(data: {
    email: string;
    password: string;
    name: string;
  }): Promise<User> {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Registration failed');
    }

    const result = await response.json();
    return result.user;
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<void> {
    if (!this.token?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.token.refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    this.token = data.token;
    this.saveSession();
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null && this.token !== null;
  }

  /**
   * Check if user has permission
   */
  hasPermission(permission: string): boolean {
    if (!this.currentUser) return false;
    return this.currentUser.permissions.includes(permission);
  }

  /**
   * Check if user has role
   */
  hasRole(role: string): boolean {
    if (!this.currentUser) return false;
    return this.currentUser.roles.includes(role);
  }

  /**
   * Get authentication headers
   */
  getAuthHeaders(): HeadersInit {
    if (!this.token) {
      return {};
    }
    
    return {
      'Authorization': `${this.token.tokenType} ${this.token.accessToken}`,
    };
  }

  /**
   * Subscribe to authentication changes
   */
  onAuthChange(callback: (user: User | null) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Load saved session
   */
  private async loadSession(): Promise<void> {
    try {
      const sessionData = localStorage.getItem('auth_session');
      if (!sessionData) return;

      const session = JSON.parse(sessionData);
      
      // Validate token expiry
      if (session.token && session.token.expiresAt > Date.now()) {
        this.currentUser = session.user;
        this.token = session.token;
        
        // Verify with server
        await this.verifySession();
      } else {
        this.clearSession();
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      this.clearSession();
    }
  }

  /**
   * Save session
   */
  private saveSession(): void {
    if (!this.currentUser || !this.token) return;

    const session = {
      user: this.currentUser,
      token: {
        ...this.token,
        expiresAt: Date.now() + this.token.expiresIn * 1000,
      },
    };

    localStorage.setItem('auth_session', JSON.stringify(session));
  }

  /**
   * Clear session
   */
  private clearSession(): void {
    localStorage.removeItem('auth_session');
  }

  /**
   * Verify session with server
   */
  private async verifySession(): Promise<void> {
    try {
      const response = await fetch('/api/auth/verify', {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Session invalid');
      }

      const data = await response.json();
      this.currentUser = data.user;
    } catch (error) {
      console.error('Session verification failed:', error);
      this.clearSession();
      this.currentUser = null;
      this.token = null;
    }
  }

  /**
   * Notify listeners of auth changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentUser));
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<User>): Promise<User> {
    const response = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Profile update failed');
    }

    const data = await response.json();
    this.currentUser = data.user;
    this.saveSession();
    this.notifyListeners();
    
    return this.currentUser;
  }

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (!response.ok) {
      throw new Error('Password change failed');
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error('Password reset request failed');
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<void> {
    const response = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      throw new Error('Email verification failed');
    }
  }
}