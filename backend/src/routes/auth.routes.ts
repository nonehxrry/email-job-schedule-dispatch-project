import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.post('/google', (req, res) => authController.googleLogin(req, res));
router.get('/me', requireAuth, (req, res) => authController.getMe(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));

export default router;
