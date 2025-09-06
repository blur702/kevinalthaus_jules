/**
 * Authentication Service
 * Provides authentication functionality to plugins
 */

export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  avatar?: string;
}

export class AuthService {
  private currentUser: User | null;
  private token: string | null;
  private refreshToken: string | null;
  private config: any;

  constructor(config: any) {
    this.config = config;
    this.currentUser = null;
    this.token = null;
    this.refreshToken = null;
  }

  /**
   * Initialize the auth service
   */
  async initialize(): Promise<void> {
    // Load stored token
    this.token = localStorage.getItem('auth_token');
    this.refreshToken = localStorage.getItem('refresh_token');

    if (this.token) {
      await this.validateToken();
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null && this.token !== null;
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      
      this.token = data.token;
      this.refreshToken = data.refreshToken;
      this.currentUser = data.user;

      // Store tokens
      localStorage.setItem('auth_token', this.token);
      localStorage.setItem('refresh_token', this.refreshToken);

      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
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
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearSession();
    }
  }

  /**
   * Validate current token
   */
  private async validateToken(): Promise<boolean> {
    if (!this.token) return false;

    try {
      const response = await fetch('/api/auth/validate', {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          return await this.refreshAccessToken();
        }
        return false;
      }

      const data = await response.json();
      this.currentUser = data.user;
      
      return true;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  /**
   * Refresh access token
   */
  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          refreshToken: this.refreshToken 
        })
      });

      if (!response.ok) {
        this.clearSession();
        return false;
      }

      const data = await response.json();
      
      this.token = data.token;
      this.refreshToken = data.refreshToken;
      
      localStorage.setItem('auth_token', this.token);
      localStorage.setItem('refresh_token', this.refreshToken);
      
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearSession();
      return false;
    }
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
   * Get auth headers
   */
  getAuthHeaders(): Record<string, string> {
    if (!this.token) return {};
    
    return {
      'Authorization': `Bearer ${this.token}`
    };
  }

  /**
   * Clear session
   */
  private clearSession(): void {
    this.currentUser = null;
    this.token = null;
    this.refreshToken = null;
    
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    // Cleanup any auth listeners
    this.clearSession();
  }
}