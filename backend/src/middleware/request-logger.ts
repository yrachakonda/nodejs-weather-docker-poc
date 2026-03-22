import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const correlationId = req.header('x-correlation-id');

  res.on('finish', () => {
    logger.http('request_complete', {
      correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
      ip: req.ip
    });
  });

  next();
}
