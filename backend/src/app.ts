import cors from 'cors';
import express from 'express';
import session from 'express-session';
import RedisStore from 'connect-redis';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { logger } from './config/logger';
import { redis } from './config/redis';
import { errorHandler } from './middleware/error-handler';
import { requestId } from './middleware/request-id';
import { requestLogger } from './middleware/request-log';
import { router } from './routes';
import openapi from './openapi.json';

const app = express();
const store = new RedisStore({ client: redis as any, prefix: 'session:' });

app.use(requestId);
app.use(requestLogger);
app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());
app.use(
  rateLimit({
    windowMs: env.rateLimitWindowMs,
    limit: env.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false
  })
);
app.use(
  session({
    store,
    secret: env.sessionSecret,
    name: 'weather.sid',
    saveUninitialized: false,
    resave: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.nodeEnv !== 'development',
      maxAge: env.sessionTtlSeconds * 1000
    }
  })
);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi));
app.use('/api/v1', router);
app.use(errorHandler);

process.on('SIGTERM', () => logger.info('shutdown signal received'));

export default app;
