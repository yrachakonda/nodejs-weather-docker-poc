import { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = req.header('x-correlation-id') ?? uuid();
  res.setHeader('x-correlation-id', id);
  req.headers['x-correlation-id'] = id;
  next();
}
