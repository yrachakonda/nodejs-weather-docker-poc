import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import authRoutes from './routes/auth-routes';
import weatherRoutes from './routes/weather-routes';
import systemRoutes from './routes/system-routes';
import { requestIdMiddleware } from './middleware/request-id';
import { requestLogger } from './middleware/request-logger';
import { apiRateLimiter } from './middleware/rate-limit';
import { sessionMiddleware } from './config/session';
import { errorHandler } from './middleware/error-handler';

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(requestIdMiddleware);
app.use(requestLogger);
app.use(apiRateLimiter);
app.use(sessionMiddleware);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/weather', weatherRoutes);
app.use('/api/v1/system', systemRoutes);

app.use(errorHandler);
