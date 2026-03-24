import { Request, Response, NextFunction } from 'express';
import { Role } from '../types';
import { logger } from '../config/logger';
import { getRequestLogContext } from '../utils/request-log-context';

function getRequestRole(req: Request): Exclude<Role, 'anonymous'> | null {
  return req.session.user?.role || req.apiKeyPrincipal?.role || null;
}

export function requireSession(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.user) {
    logger.warn('auth_session_required', getRequestLogContext(req));
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

export function requireAuthenticatedPrincipal(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.user && !req.apiKeyPrincipal) {
    logger.warn('auth_principal_required', getRequestLogContext(req));
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

export function requireRole(allowed: Exclude<Role, 'anonymous'>[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = getRequestRole(req);
    if (!role) {
      logger.warn('auth_role_missing', { allowedRoles: allowed, ...getRequestLogContext(req) });
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!allowed.includes(role)) {
      logger.warn('authorization_denied', {
        allowedRoles: allowed,
        ...getRequestLogContext(req),
        role
      });
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
}
