import session from 'express-session';
import RedisStore from 'connect-redis';
import { env } from './env';
import { redisClient } from './redis';

const store = env.NODE_ENV === 'test'
  ? new session.MemoryStore()
  : new RedisStore({ client: redisClient as any, prefix: 'sess:' });

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
