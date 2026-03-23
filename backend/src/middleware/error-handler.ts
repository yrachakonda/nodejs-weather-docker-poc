import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    logger.warn('validation_failed', { path: req.path, issues: err.issues });
    res.status(400).json({ error: 'Invalid request' });
    return;
  }

  logger.error('unhandled_error', { path: req.path, message: err.message });
  res.status(500).json({ error: 'Internal server error' });
}
