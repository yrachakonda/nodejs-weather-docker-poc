import { Request, Response, NextFunction } from 'express';
import { Role } from '../types';
import { logger } from '../config/logger';

function getRequestRole(req: Request): Exclude<Role, 'anonymous'> | null {
  return req.session.user?.role || req.apiKeyPrincipal?.role || null;
}

export function requireSession(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

export function requireAuthenticatedPrincipal(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.user && !req.apiKeyPrincipal) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

export function requireRole(allowed: Exclude<Role, 'anonymous'>[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = getRequestRole(req);
    if (!role) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!allowed.includes(role)) {
      logger.warn('authorization_denied', {
        username: req.session.user?.username || req.apiKeyPrincipal?.owner,
        role,
        path: req.path
      });
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
}
