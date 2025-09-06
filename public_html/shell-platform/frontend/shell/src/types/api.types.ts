export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  status: 'success' | 'error';
  errors?: ApiError[];
  meta?: ApiMeta;
}

export interface ApiError {
  field?: string;
  code: string;
  message: string;
  details?: any;
}

export interface ApiMeta {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;
  requestId: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

export interface ApiRequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cache?: boolean;
  gcTime?: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface FileUploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  allowedTypes?: string[];
  maxSize?: number;
  multiple?: boolean;
}

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
  id: string;
}

export interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}