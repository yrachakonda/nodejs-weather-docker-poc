import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.string().default('8080'),
  SESSION_SECRET: z.string().min(16),
  REDIS_URL: z.string().default('redis://redis:6379'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.string().default('info'),
  APP_VERSION: z.string().default('1.0.0'),
  RATE_LIMIT_WINDOW_MS: z.string().default('60000'),
  RATE_LIMIT_MAX: z.string().default('100'),
  WEATHER_SEED_CITY: z.string().default('seattle')
});

export const env = envSchema.parse(process.env);
