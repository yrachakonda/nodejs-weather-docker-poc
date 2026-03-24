import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

export const redisClient = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  enableReadyCheck: true
});

redisClient.on('connect', () => logger.info('redis_connecting'));
redisClient.on('ready', () => logger.info('redis_ready'));
redisClient.on('error', (err) => logger.error('redis_error', { message: err.message }));
redisClient.on('close', () => logger.warn('redis_closed'));
