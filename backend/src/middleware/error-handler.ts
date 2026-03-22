import { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  logger.error('unhandled error', { err: err.message, path: req.originalUrl });
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error' } });
}
