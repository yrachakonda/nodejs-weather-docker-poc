import { Request, Response } from 'express';
import { z } from 'zod';
import { userService } from '../services/user-service';
import { logger } from '../config/logger';
import { getRequestLogContext } from '../utils/request-log-context';

const authSchema = z.object({ username: z.string().min(3), password: z.string().min(6) });

export const register = (req: Request, res: Response): void => {
  const payload = authSchema.parse(req.body);
  try {
    const created = userService.create(payload.username, payload.password);
    req.session.user = { id: created.id, username: created.username, role: created.role };
    logger.info('auth_register_success', {
      createdUserId: created.id,
      createdUsername: created.username,
      createdRole: created.role,
      ...getRequestLogContext(req)
    });
    res.status(201).json({ user: req.session.user });
  } catch (e) {
    logger.warn('auth_register_failed', {
      attemptedUsername: payload.username,
      reason: e instanceof Error ? e.message : 'unknown',
      ...getRequestLogContext(req)
    });
    res.status(400).json({ error: 'Invalid credentials' });
  }
};

export const login = (req: Request, res: Response): void => {
  const payload = authSchema.parse(req.body);
  const user = userService.authenticate(payload.username, payload.password);
  if (!user) {
    logger.warn('auth_login_failed', {
      attemptedUsername: payload.username,
      ...getRequestLogContext(req)
    });
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  req.session.user = { id: user.id, username: user.username, role: user.role };
  logger.info('auth_login_success', {
    authenticatedUserId: user.id,
    authenticatedUsername: user.username,
    authenticatedRole: user.role,
    ...getRequestLogContext(req)
  });
  res.json({ user: req.session.user });
};

export const logout = (req: Request, res: Response): void => {
  logger.info('auth_logout', getRequestLogContext(req));
  req.session.destroy(() => {
    res.status(204).send();
  });
};

export const me = (req: Request, res: Response): void => {
  if (!req.session.user) {
    logger.warn('auth_me_unauthorized', getRequestLogContext(req));
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  logger.info('auth_me_success', getRequestLogContext(req));
  res.json({ user: req.session.user });
};
