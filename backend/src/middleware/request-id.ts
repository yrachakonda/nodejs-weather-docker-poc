import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.header('x-correlation-id') || uuidv4();
  req.headers['x-correlation-id'] = requestId;
  res.setHeader('x-correlation-id', requestId);
  next();
}
