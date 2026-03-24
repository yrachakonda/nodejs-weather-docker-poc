import { Request, Response, NextFunction } from 'express';
import { apiKeyService } from '../services/api-key-service';
import { logger } from '../config/logger';
import { getRequestLogContext } from '../utils/request-log-context';

export function attachApiKeyPrincipal(req: Request, _res: Response, next: NextFunction): void {
  const key = req.header('x-api-key');
  if (!key) {
    next();
    return;
  }

  const found = apiKeyService.validate(key);
  if (!found) {
    logger.warn('auth_api_key_failed', { keyPresent: true, ...getRequestLogContext(req) });
    next();
    return;
  }

  req.apiKeyPrincipal = { owner: found.owner, role: found.role };
  logger.info('auth_api_key_authenticated', {
    keyPresent: true,
    keyOwner: found.owner,
    keyRole: found.role,
    ...getRequestLogContext(req)
  });
  next();
}
