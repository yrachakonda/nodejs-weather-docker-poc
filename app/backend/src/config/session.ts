import session from 'express-session';
import RedisStore from 'connect-redis';
import { env } from './env';
import { redisClient } from './redis';

const useRedisInTests = process.env.ENABLE_REDIS_INTEGRATION_TESTS === 'true';
const useRedisStore = env.NODE_ENV !== 'test' || useRedisInTests;

const store = useRedisStore
  ? new RedisStore({ client: redisClient as any, prefix: 'sess:' })
  : new session.MemoryStore();

export const sessionMiddleware = session({
  store,
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60
  }
});
