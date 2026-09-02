import { Router, Request, Response } from 'express';
import { emailController } from '../controllers/email.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/scheduled', requireAuth, (req: Request, res: Response) => emailController.getScheduledEmails(req as any, res));
router.get('/sent', requireAuth, (req: Request, res: Response) => emailController.getSentEmails(req as any, res));
router.get('/search', requireAuth, (req: Request, res: Response) => emailController.searchEmails(req as any, res));
router.get('/stats', requireAuth, (req: Request, res: Response) => emailController.getStats(req as any, res));
router.get('/export', requireAuth, (req: Request, res: Response) => emailController.exportCsv(req as any, res));
router.post('/retry-failed', requireAuth, (req: Request, res: Response) => emailController.retryFailed(req as any, res));
router.delete('/:id', requireAuth, (req: Request, res: Response) => emailController.deleteJob(req as any, res));

export default router;
