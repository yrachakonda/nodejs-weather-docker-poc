import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger';
import { getRequestLogContext } from '../utils/request-log-context';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    logger.warn('validation_failed', { issues: err.issues, ...getRequestLogContext(req) });
    res.status(400).json({ error: 'Invalid request' });
    return;
  }

  logger.error('unhandled_error', {
    errorName: err.name,
    message: err.message,
    stack: err.stack,
    ...getRequestLogContext(req)
  });
  res.status(500).json({ error: 'Internal server error' });
}
