import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import type { AxiosResponse } from 'axios';
import { ApiResponse, ApiRequestConfig } from '@/types';
import { getAccessToken, isTokenValid, isTokenExpiring } from '@/utils/auth.utils';
import { store } from '@/store';
import { refreshTokenAsync, logoutAsync } from '@/store/auth.slice';

class ApiService {
  private api: AxiosInstance;
  private refreshPromise: Promise<any> | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      async (config) => {
        const token = getAccessToken();

        if (token) {
          // Check if token is valid
          if (!isTokenValid(token)) {
            // Token is invalid, try to refresh
            try {
              await this.refreshTokenIfNeeded();
              const newToken = getAccessToken();
              if (newToken) {
                config.headers.Authorization = `Bearer ${newToken}`;
              }
            } catch {
              // Refresh failed, redirect to login
              store.dispatch(logoutAsync());
              window.location.href = '/login';
              return Promise.reject(new Error('Authentication required'));
            }
          } else {
            config.headers.Authorization = `Bearer ${token}`;

            // Check if token is expiring soon and refresh proactively
            if (isTokenExpiring(token, 5)) {
              this.refreshTokenIfNeeded().catch(() => {
                // Ignore errors for proactive refresh
              });
            }
          }
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await this.refreshTokenIfNeeded();
            const newToken = getAccessToken();
            
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.api(originalRequest);
            }
          } catch {
            store.dispatch(logoutAsync());
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshTokenIfNeeded(): Promise<void> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = store.dispatch(refreshTokenAsync()).unwrap();
    
    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  // Generic request method
  async request<T = any>(
    config: AxiosRequestConfig & ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    const { retries = 3, retryDelay = 1000, ...axiosConfig } = config;
    
    let lastError: any;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response: AxiosResponse<ApiResponse<T>> = await this.api(axiosConfig);
        return response.data;
      } catch (error: any) {
        lastError = error;

        // Don't retry on authentication errors or client errors (4xx)
        if (error.response?.status >= 400 && error.response?.status < 500) {
          break;
        }

        // Don't retry on the last attempt
        if (attempt === retries) {
          break;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
      }
    }

    throw lastError;
  }

  // HTTP method helpers
  async get<T = any>(
    url: string, 
    config?: AxiosRequestConfig & ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  async post<T = any>(
    url: string, 
    data?: any, 
    config?: AxiosRequestConfig & ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  async put<T = any>(
    url: string, 
    data?: any, 
    config?: AxiosRequestConfig & ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  async patch<T = any>(
    url: string, 
    data?: any, 
    config?: AxiosRequestConfig & ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }

  async delete<T = any>(
    url: string, 
    config?: AxiosRequestConfig & ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  // File upload with progress
  async upload<T = any>(
    url: string,
    formData: FormData,
    onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: 'POST',
      url,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage,
          });
        }
      },
    });
  }

  // Download file
  async download(url: string, filename?: string): Promise<void> {
    const response = await this.api({
      method: 'GET',
      url,
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  // Cancel request
  createCancelToken() {
    const controller = new AbortController();
    return {
      token: controller.signal,
      cancel: (message?: string) => controller.abort()
    };
  }

  // Get API instance for custom requests
  getAxiosInstance(): AxiosInstance {
    return this.api;
  }
}

export const apiService = new ApiService();