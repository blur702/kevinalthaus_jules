export interface RateLimitConfig {
  requests: number;
  window: number;
  burst: number;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  hashedKey: string;
  apiConfigId: string;
  userId: string;
  permissions: {
    resource: string;
    actions: ("GET" | "POST" | "PUT" | "PATCH" | "DELETE")[];
    conditions?: any;
  }[];
  rateLimit: RateLimitConfig;
  isActive: boolean;
  expiresAt?: Date;
  allowedIps: string[];
  allowedDomains: string[];
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
}