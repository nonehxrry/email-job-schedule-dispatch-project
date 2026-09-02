import { Router, Request, Response } from 'express';
import { slackController } from '../controllers/slack.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/authorize-url', requireAuth, (req: Request, res: Response) => slackController.getInstallUrl(req as any, res));
router.get('/callback', (req: Request, res: Response) => slackController.oauthCallback(req, res));
router.post('/connect-webhook', requireAuth, (req: Request, res: Response) => slackController.saveWebhook(req as any, res));
router.post('/test-notification', requireAuth, (req: Request, res: Response) => slackController.sendTestAlert(req as any, res));
router.post('/disconnect', requireAuth, (req: Request, res: Response) => slackController.disconnect(req as any, res));

export default router;
