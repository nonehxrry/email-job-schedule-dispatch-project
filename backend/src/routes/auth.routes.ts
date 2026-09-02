import { Router, Request, Response } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.post('/google', (req: Request, res: Response) => authController.googleLogin(req, res));
router.post('/fast-login', (req: Request, res: Response) => authController.googleLogin(req, res));
router.get('/me', requireAuth, (req: Request, res: Response) => authController.getMe(req as any, res));
router.post('/logout', (req: Request, res: Response) => authController.logout(req, res));

export default router;
