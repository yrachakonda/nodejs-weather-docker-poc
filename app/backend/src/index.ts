import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';

const server = app.listen(Number(env.API_PORT), () => {
  logger.info('server_started', { port: env.API_PORT, env: env.NODE_ENV });
});

process.on('SIGTERM', () => {
  logger.warn('server_shutdown_start');
  server.close(() => {
    logger.info('server_shutdown_complete');
    process.exit(0);
  });
});
