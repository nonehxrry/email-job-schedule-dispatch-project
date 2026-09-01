import { Router } from 'express';
import { emailController } from '../controllers/email.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/scheduled', requireAuth, (req, res) => emailController.getScheduledEmails(req, res));
router.get('/sent', requireAuth, (req, res) => emailController.getSentEmails(req, res));
router.get('/search', requireAuth, (req, res) => emailController.searchEmails(req, res));
router.get('/stats', requireAuth, (req, res) => emailController.getStats(req, res));

export default router;
