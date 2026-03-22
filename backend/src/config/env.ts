import dotenv from 'dotenv';

dotenv.config();

const required = ['SESSION_SECRET', 'REDIS_URL'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 8080),
  sessionSecret: process.env.SESSION_SECRET as string,
  redisUrl: process.env.REDIS_URL as string,
  appVersion: process.env.APP_VERSION ?? '1.0.0',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS ?? 3600),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX ?? 100),
  enableNegativeRoutes: process.env.ENABLE_NEGATIVE_TEST_ROUTES === 'true'
};
