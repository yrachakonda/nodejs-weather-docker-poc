import { Request, Response, NextFunction } from 'express';
import { apiKeyService } from '../services/api-key-service';
import { logger } from '../config/logger';

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const key = req.header('x-api-key');
  if (!key) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const found = apiKeyService.validate(key);
  if (!found) {
    logger.warn('auth_api_key_failed', { keyPresent: true, path: req.path });
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}
