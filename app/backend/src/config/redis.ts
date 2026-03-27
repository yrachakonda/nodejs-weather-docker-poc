import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

const useRedisInTests = process.env.ENABLE_REDIS_INTEGRATION_TESTS === 'true';
const shouldUseRedis = env.NODE_ENV !== 'test' || useRedisInTests;

export const redisClient = shouldUseRedis
  ? new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true
    })
  : new Redis(env.REDIS_URL, {
      lazyConnect: true
    });

if (!shouldUseRedis) {
  redisClient.disconnect();
}

if (shouldUseRedis) {
  redisClient.on('connect', () => logger.info('redis_connecting'));
  redisClient.on('ready', () => logger.info('redis_ready'));
  redisClient.on('error', (err) => logger.error('redis_error', { message: err.message }));
  redisClient.on('close', () => logger.warn('redis_closed'));
}
