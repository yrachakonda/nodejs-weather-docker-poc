import winston from 'winston';
import { env } from './env';

export const logger = winston.createLogger({
  level: env.logLevel,
  levels: winston.config.npm.levels,
  defaultMeta: { service: 'weather-sim-api', env: env.nodeEnv },
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});
