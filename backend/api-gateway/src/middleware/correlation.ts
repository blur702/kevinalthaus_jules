import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CustomRequest, CustomResponse } from '@/types';

export const correlationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const customReq = req as CustomRequest;
  const customRes = res as CustomResponse;

  // Generate or extract correlation ID
  const correlationId = 
    (req.headers['x-correlation-id'] as string) ||
    (req.headers['x-request-id'] as string) ||
    uuidv4();

  // Set correlation ID on request and response
  customReq.correlationId = correlationId;
  customRes.correlationId = correlationId;
  customReq.startTime = Date.now();

  // Set response header
  customRes.setHeader('X-Correlation-ID', correlationId);
  customRes.setHeader('X-Request-ID', correlationId);

  next();
};