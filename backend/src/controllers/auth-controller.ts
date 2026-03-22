import { Request, Response } from 'express';
import { logger } from '../config/logger';
import { findUserByUsername, registerUser, verifyUser } from '../services/user-service';

export async function register(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body;
  if (findUserByUsername(username)) {
    res.status(409).json({ error: { code: 'CONFLICT', message: 'Username already exists' } });
    return;
  }
  const user = await registerUser(username, password);
  logger.info('register success', { userId: user.id, username: user.username });
  res.status(201).json({ data: { id: user.id, username: user.username, role: user.role, isPremium: user.isPremium } });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body;
  const user = await verifyUser(username, password);
  if (!user) {
    logger.warn('auth failure', { username });
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication failed' } });
    return;
  }
  req.session.user = { id: user.id, username: user.username, role: user.role, isPremium: user.isPremium };
  logger.info('auth success', { userId: user.id, role: user.role });
  res.json({ data: req.session.user });
}

export function logout(req: Request, res: Response): void {
  req.session.destroy(() => {
    res.json({ data: { status: 'logged_out' } });
  });
}

export function me(req: Request, res: Response): void {
  if (!req.session.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication failed' } });
    return;
  }
  res.json({ data: req.session.user });
}
