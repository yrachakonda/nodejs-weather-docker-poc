import { Router } from 'express';
import { getCurrent, getPremiumForecast } from '../controllers/weather-controller';
import { requireApiKey } from '../middleware/api-key';
import { requireRole, requireSession } from '../middleware/auth';

const router = Router();

router.get('/current', requireApiKey, getCurrent);
router.get('/premium-forecast', requireApiKey, requireSession, requireRole(['premium', 'admin']), getPremiumForecast);

export default router;
