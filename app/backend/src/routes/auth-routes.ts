import { Router } from 'express';
import { login, logout, me, register } from '../controllers/auth-controller';
import { requireSession } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', requireSession, logout);
router.get('/me', requireSession, me);

export default router;
