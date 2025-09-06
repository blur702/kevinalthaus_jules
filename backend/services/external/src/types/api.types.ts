export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringWindow: number;
  minRequestsThreshold: number;
  successThreshold?: number;
}

export interface ApiMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  errorRate: number;
  lastRequestTime: Date;
  currentConnections: number;
}

export interface ApiConfig {
  id: string;
  name: string;
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  circuitBreakerConfig: CircuitBreakerConfig;
  rateLimit: {
    requests: number;
    window: number;
  };
  authentication: {
    type: 'none' | 'bearer' | 'basic' | 'api_key';
    credentials: Record<string, any>;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}