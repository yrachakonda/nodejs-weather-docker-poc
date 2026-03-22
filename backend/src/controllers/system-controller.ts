import { Request, Response } from 'express';
import { env } from '../config/env';
import { redis } from '../config/redis';

export async function ready(_req: Request, res: Response): Promise<void> {
  const pong = await redis.ping();
  res.json({ data: { status: pong === 'PONG' ? 'ready' : 'not-ready' } });
}

export function live(_req: Request, res: Response): void {
  res.json({ data: { status: 'live' } });
}

export function version(_req: Request, res: Response): void {
  res.json({ data: { version: env.appVersion } });
}
