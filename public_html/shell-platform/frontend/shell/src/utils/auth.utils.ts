import { jwtDecode } from 'jwt-decode';
import Cookies from 'js-cookie';
import { TokenPayload } from '@/types';

export const AUTH_STORAGE_KEY = 'shell-auth';
export const ACCESS_TOKEN_KEY = 'shell-access-token';
export const REFRESH_TOKEN_KEY = 'shell-refresh-token';

export const setAuthTokens = (accessToken: string, refreshToken: string): void => {
  // Store access token in memory/sessionStorage for security
  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  
  // Store refresh token in httpOnly cookie (more secure)
  Cookies.set(REFRESH_TOKEN_KEY, refreshToken, {
    httpOnly: false, // Note: httpOnly won't work from client-side, server should set this
    secure: window.location.protocol === 'https:',
    sameSite: 'strict',
    expires: 7, // 7 days
  });
};

export const getAccessToken = (): string | null => {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = (): string | null => {
  return Cookies.get(REFRESH_TOKEN_KEY) || null;
};

export const removeAuthTokens = (): void => {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  Cookies.remove(REFRESH_TOKEN_KEY);
  localStorage.removeItem(AUTH_STORAGE_KEY);
};

export const isTokenValid = (token: string): boolean => {
  try {
    const decoded = jwtDecode<TokenPayload>(token);
    const currentTime = Date.now() / 1000;
    
    // Check if token is expired (with 5 minute buffer)
    return decoded.exp > currentTime + 300;
  } catch {
    return false;
  }
};

export const isTokenExpiring = (token: string, bufferMinutes: number = 5): boolean => {
  try {
    const decoded = jwtDecode<TokenPayload>(token);
    const currentTime = Date.now() / 1000;
    const bufferTime = bufferMinutes * 60;
    
    return decoded.exp - currentTime < bufferTime;
  } catch {
    return true;
  }
};

export const getTokenPayload = (token: string): TokenPayload | null => {
  try {
    return jwtDecode<TokenPayload>(token);
  } catch {
    return null;
  }
};

export const hasPermission = (userPermissions: string[], requiredPermission: string): boolean => {
  if (!userPermissions || !requiredPermission) return false;
  
  // Check for exact permission match
  if (userPermissions.includes(requiredPermission)) return true;
  
  // Check for wildcard permissions
  const parts = requiredPermission.split('.');
  for (let i = parts.length - 1; i >= 0; i--) {
    const wildcardPermission = parts.slice(0, i).join('.') + '.*';
    if (userPermissions.includes(wildcardPermission)) return true;
  }
  
  // Check for admin permission
  return userPermissions.includes('admin.*') || userPermissions.includes('*');
};

export const hasRole = (userRoles: string[], requiredRole: string): boolean => {
  if (!userRoles || !requiredRole) return false;
  return userRoles.includes(requiredRole) || userRoles.includes('admin');
};

export const getUserInitials = (firstName?: string, lastName?: string, username?: string): string => {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  
  if (username && username.length >= 2) {
    return username.substring(0, 2).toUpperCase();
  }
  
  return 'U';
};

export const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const isPasswordStrong = (password: string): { isStrong: boolean; feedback: string[] } => {
  const feedback: string[] = [];
  let isStrong = true;
  
  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters long');
    isStrong = false;
  }
  
  if (!/[a-z]/.test(password)) {
    feedback.push('Password must contain at least one lowercase letter');
    isStrong = false;
  }
  
  if (!/[A-Z]/.test(password)) {
    feedback.push('Password must contain at least one uppercase letter');
    isStrong = false;
  }
  
  if (!/\d/.test(password)) {
    feedback.push('Password must contain at least one number');
    isStrong = false;
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    feedback.push('Password must contain at least one special character');
    isStrong = false;
  }
  
  return { isStrong, feedback };
};

export const sanitizeRedirectUrl = (url: string): string => {
  // Ensure redirect URL is safe and within the same origin
  try {
    const redirectUrl = new URL(url, window.location.origin);
    
    // Only allow same origin redirects
    if (redirectUrl.origin !== window.location.origin) {
      return '/dashboard';
    }
    
    return redirectUrl.pathname + redirectUrl.search + redirectUrl.hash;
  } catch {
    return '/dashboard';
  }
};