import { Request, Response } from 'express';
import { z } from 'zod';
import { userService } from '../services/user-service';
import { logger } from '../config/logger';

const authSchema = z.object({ username: z.string().min(3), password: z.string().min(6) });

export const register = (req: Request, res: Response): void => {
  const payload = authSchema.parse(req.body);
  try {
    const created = userService.create(payload.username, payload.password);
    req.session.user = { id: created.id, username: created.username, role: created.role };
    logger.info('auth_register_success', { username: created.username });
    res.status(201).json({ user: req.session.user });
  } catch (e) {
    res.status(400).json({ error: 'Invalid credentials' });
  }
};

export const login = (req: Request, res: Response): void => {
  const payload = authSchema.parse(req.body);
  const user = userService.authenticate(payload.username, payload.password);
  if (!user) {
    logger.warn('auth_login_failed', { username: payload.username });
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  req.session.user = { id: user.id, username: user.username, role: user.role };
  logger.info('auth_login_success', { username: user.username, role: user.role });
  res.json({ user: req.session.user });
};

export const logout = (req: Request, res: Response): void => {
  req.session.destroy(() => {
    res.status(204).send();
  });
};

export const me = (req: Request, res: Response): void => {
  if (!req.session.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  res.json({ user: req.session.user });
};
