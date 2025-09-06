import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { 
  LoginCredentials, 
  RegisterCredentials, 
  AuthResponse, 
  User,
  PasswordResetRequest,
  PasswordReset 
} from '@/types';
import { getAccessToken, getRefreshToken, setAuthTokens, removeAuthTokens } from '@/utils/auth.utils';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

class AuthService {
  private baseURL = `${API_BASE_URL}/auth`;

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await axios.post(
      `${this.baseURL}/login`,
      credentials
    );
    
    // Handle backend response format: {success: true, data: {accessToken, user, ...}}
    const authData = response.data.data || response.data;
    const { token, accessToken, refreshToken, user } = authData;
    
    // Store tokens
    const finalAccessToken = token || accessToken;
    setAuthTokens(finalAccessToken, refreshToken);
    
    // Return the expected AuthResponse format
    return {
      user,
      accessToken: finalAccessToken,
      refreshToken,
      expiresIn: authData.expiresIn || 3600 // Default to 1 hour if not provided
    };
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await axios.post(
      `${this.baseURL}/register`,
      credentials
    );
    
    // Handle backend response format: {success: true, data: {accessToken, user, ...}}
    const authData = response.data.data || response.data;
    const { token, accessToken, refreshToken, user } = authData;
    
    // Store tokens
    const finalAccessToken = token || accessToken;
    setAuthTokens(finalAccessToken, refreshToken);
    
    // Return the expected AuthResponse format
    return {
      user,
      accessToken: finalAccessToken,
      refreshToken,
      expiresIn: authData.expiresIn || 3600 // Default to 1 hour if not provided
    };
  }

  async logout(): Promise<void> {
    try {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await axios.post(`${this.baseURL}/logout`, { refreshToken });
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      removeAuthTokens();
    }
  }

  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(
      `${this.baseURL}/refresh`,
      { refreshToken }
    );
    
    // Handle backend response format: {success: true, data: {accessToken, user, ...}}
    const authData = response.data.data || response.data;
    const { accessToken, refreshToken: newRefreshToken, user } = authData;
    setAuthTokens(accessToken, newRefreshToken);
    
    // Return the expected AuthResponse format
    return {
      user,
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: authData.expiresIn || 3600 // Default to 1 hour if not provided
    };
  }

  async getCurrentUser(): Promise<User> {
    const response: AxiosResponse<User> = await axios.get(
      `${this.baseURL}/me`,
      {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
      }
    );
    
    return response.data;
  }

  async updateProfile(userData: Partial<User>): Promise<User> {
    const response: AxiosResponse<User> = await axios.put(
      `${this.baseURL}/profile`,
      userData,
      {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
      }
    );
    
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await axios.put(
      `${this.baseURL}/change-password`,
      { currentPassword, newPassword },
      {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
      }
    );
  }

  async requestPasswordReset(data: PasswordResetRequest): Promise<void> {
    await axios.post(`${this.baseURL}/request-password-reset`, data);
  }

  async resetPassword(data: PasswordReset): Promise<void> {
    await axios.post(`${this.baseURL}/reset-password`, data);
  }

  async verifyEmail(token: string): Promise<void> {
    await axios.post(`${this.baseURL}/verify-email`, { token });
  }

  async resendVerificationEmail(): Promise<void> {
    await axios.post(
      `${this.baseURL}/resend-verification`,
      {},
      {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
      }
    );
  }

  async validateToken(): Promise<boolean> {
    try {
      await this.getCurrentUser();
      return true;
    } catch {
      return false;
    }
  }

  async revokeAllSessions(): Promise<void> {
    await axios.post(
      `${this.baseURL}/revoke-sessions`,
      {},
      {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
      }
    );
    
    removeAuthTokens();
  }

  async getUserSessions(): Promise<any[]> {
    const response = await axios.get(
      `${this.baseURL}/sessions`,
      {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
      }
    );
    
    return response.data;
  }

  async revokeSession(sessionId: string): Promise<void> {
    await axios.delete(
      `${this.baseURL}/sessions/${sessionId}`,
      {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
      }
    );
  }
}

export const authService = new AuthService();