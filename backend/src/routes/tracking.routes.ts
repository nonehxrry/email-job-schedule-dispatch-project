import { Router } from 'express';
import { trackingController } from '../controllers/tracking.controller';

const router = Router();

// Public endpoints called by email clients when email is opened or clicked
router.get('/open/:jobId', (req, res) => trackingController.trackOpen(req, res));
router.get('/click/:jobId', (req, res) => trackingController.trackClick(req, res));
router.get('/unsubscribe/:jobId', (req, res) => trackingController.trackUnsubscribe(req, res));

export default router;
