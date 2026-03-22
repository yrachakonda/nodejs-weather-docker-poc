import { NextFunction, Request, Response } from 'express';
import { Role, SessionUser } from '../types/auth';
import { logger } from '../config/logger';
import { validateApiKey } from '../services/api-key-service';

declare module 'express-session' {
  interface SessionData {
    user?: SessionUser;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.user) {
    logger.warn('auth failure', { reason: 'missing session' });
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication failed' } });
    return;
  }
  next();
}

export function requireRole(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.session.user;
    if (!user || !roles.includes(user.role)) {
      logger.warn('authorization denied', { requiredRoles: roles, actualRole: user?.role ?? 'anonymous' });
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Forbidden' } });
      return;
    }
    next();
  };
}

export function requirePremium(req: Request, res: Response, next: NextFunction): void {
  const user = req.session.user;
  if (!user || !user.isPremium) {
    logger.warn('authorization denied', { reason: 'premium_required' });
    res.status(403).json({ error: { code: 'PREMIUM_REQUIRED', message: 'Premium subscription required' } });
    return;
  }
  next();
}

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const key = req.header('x-api-key');
  const validated = validateApiKey(key);
  if (!validated) {
    logger.warn('api key failure', { provided: Boolean(key) });
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication failed' } });
    return;
  }
  next();
}
