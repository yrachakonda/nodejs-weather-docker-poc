import { Request, Response } from 'express';
import { env } from '../config/env';

export const live = (_req: Request, res: Response): void => {
  res.json({ status: 'ok' });
};

export const ready = (_req: Request, res: Response): void => {
  res.json({ status: 'ready' });
};

export const health = (_req: Request, res: Response): void => {
  res.json({ status: 'healthy' });
};

export const version = (_req: Request, res: Response): void => {
  res.json({ version: env.APP_VERSION });
};
