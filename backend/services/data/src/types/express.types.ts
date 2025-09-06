import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  tenantId?: string;
  isAdmin?: boolean;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}