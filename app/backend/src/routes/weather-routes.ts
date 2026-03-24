import { Router } from 'express';
import { getCurrent, getPremiumForecast } from '../controllers/weather-controller';
import { attachApiKeyPrincipal } from '../middleware/api-key';
import { requireAuthenticatedPrincipal, requireRole } from '../middleware/auth';

const router = Router();

router.use(attachApiKeyPrincipal);

router.get('/current', requireAuthenticatedPrincipal, getCurrent);
router.get('/premium-forecast', requireAuthenticatedPrincipal, requireRole(['premium', 'admin']), getPremiumForecast);

export default router;
