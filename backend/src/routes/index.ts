import { Router } from 'express';
import { login, logout, me, register } from '../controllers/auth-controller';
import { currentWeather, premiumForecast } from '../controllers/weather-controller';
import { live, ready, version } from '../controllers/system-controller';
import { requireApiKey, requireAuth, requirePremium } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { loginSchema, registerSchema } from '../validators/auth-validator';

export const router = Router();

router.get('/health/live', live);
router.get('/health/ready', ready);
router.get('/version', version);

router.post('/auth/register', validateBody(registerSchema), register);
router.post('/auth/login', validateBody(loginSchema), login);
router.post('/auth/logout', requireAuth, logout);
router.get('/auth/me', requireAuth, me);

router.get('/weather/current', requireApiKey, currentWeather);
router.get('/weather/premium/forecast', requireApiKey, requireAuth, requirePremium, premiumForecast);
