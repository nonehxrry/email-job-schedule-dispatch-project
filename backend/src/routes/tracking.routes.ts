import { Router, Request, Response } from 'express';
import { trackingController } from '../controllers/tracking.controller';

const router = Router();

// Public endpoints called by email clients when email is opened, clicked, or unsubscribed
router.get('/open/:jobId', (req: Request, res: Response) => trackingController.trackOpen(req, res));
router.get('/click/:jobId', (req: Request, res: Response) => trackingController.trackClick(req, res));
router.get('/unsubscribe/:jobId', (req: Request, res: Response) => trackingController.trackUnsubscribe(req, res));

export default router;
