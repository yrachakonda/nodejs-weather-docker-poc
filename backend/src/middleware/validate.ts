import { NextFunction, Request, Response } from 'express';
import { ObjectSchema } from 'joi';
import { logger } from '../config/logger';

export function validateBody(schema: ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body);
    if (error) {
      logger.warn('validation failed', { details: error.details.map((d) => d.message) });
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' } });
      return;
    }
    next();
  };
}
