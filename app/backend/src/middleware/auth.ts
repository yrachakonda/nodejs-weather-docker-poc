import { Request, Response, NextFunction } from 'express';
import { Role } from '../types';
import { logger } from '../config/logger';

export function requireSession(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

export function requireRole(allowed: Exclude<Role, 'anonymous'>[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.session.user;
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!allowed.includes(user.role)) {
      logger.warn('authorization_denied', { username: user.username, role: user.role, path: req.path });
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
}
