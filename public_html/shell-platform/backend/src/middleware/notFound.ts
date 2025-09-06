import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

export const notFound = (req: Request, res: Response<ApiResponse>, next: NextFunction) => {
  const error = new Error(`Route not found - ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route not found - ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString(),
  });
};

export default notFound;