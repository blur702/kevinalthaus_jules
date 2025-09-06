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

export interface ErrorWithMessage {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

// Type guard to check if error has message
export const isErrorWithMessage = (error: unknown): error is ErrorWithMessage => {
  return typeof error === 'object' && error !== null && 'message' in error;
};

// Convert unknown error to ErrorWithMessage
export const toErrorWithMessage = (error: unknown): ErrorWithMessage => {
  if (isErrorWithMessage(error)) {
    return error;
  }

  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: String(error) };
  }
};