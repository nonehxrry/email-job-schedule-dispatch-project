import { Router } from 'express';
import { slackController } from '../controllers/slack.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/install', requireAuth, (req, res) => slackController.getInstallUrl(req, res));
router.get('/oauth_callback', (req, res) => slackController.oauthCallback(req, res));
router.post('/webhook', requireAuth, (req, res) => slackController.saveWebhook(req, res));
router.post('/disconnect', requireAuth, (req, res) => slackController.disconnect(req, res));
router.post('/test', requireAuth, (req, res) => slackController.sendTestAlert(req, res));

export default router;
