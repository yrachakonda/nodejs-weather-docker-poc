import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

export const redis = new Redis(env.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });

redis.on('connect', () => logger.info('redis connected'));
redis.on('error', (err) => logger.error('redis error', { err: err.message }));
