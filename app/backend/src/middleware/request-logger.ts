import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { getRequestLogContext } from '../utils/request-log-context';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    logger.http('request_complete', {
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
      ...getRequestLogContext(req)
    });
  });

  next();
}
