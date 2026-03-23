import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.header('x-correlation-id') || randomUUID();
  req.headers['x-correlation-id'] = requestId;
  res.setHeader('x-correlation-id', requestId);
  next();
}
