import { Request, Response, NextFunction } from 'express';
import { apiKeyService } from '../services/api-key-service';
import { logger } from '../config/logger';

export function attachApiKeyPrincipal(req: Request, _res: Response, next: NextFunction): void {
  const key = req.header('x-api-key');
  if (!key) {
    next();
    return;
  }

  const found = apiKeyService.validate(key);
  if (!found) {
    logger.warn('auth_api_key_failed', { keyPresent: true, path: req.path });
    next();
    return;
  }

  req.apiKeyPrincipal = { owner: found.owner, role: found.role };
  next();
}
