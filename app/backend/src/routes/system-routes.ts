import { Router } from 'express';
import { health, live, ready, version } from '../controllers/system-controller';

const router = Router();
router.get('/live', live);
router.get('/ready', ready);
router.get('/health', health);
router.get('/version', version);
export default router;
