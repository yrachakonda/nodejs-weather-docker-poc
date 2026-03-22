import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { redis } from './config/redis';

async function start(): Promise<void> {
  await redis.connect();
  app.listen(env.port, () => {
    logger.info('server started', { port: env.port, version: env.appVersion });
  });
}

start().catch((err) => {
  logger.error('startup failed', { err: err.message });
  process.exit(1);
});
