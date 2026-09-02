import { Router, Request, Response } from 'express';
import { campaignController } from '../controllers/campaign.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.post('/schedule', requireAuth, (req: Request, res: Response) => campaignController.scheduleCampaign(req as any, res));
router.get('/', requireAuth, (req: Request, res: Response) => campaignController.getCampaigns(req as any, res));
router.delete('/:id', requireAuth, (req: Request, res: Response) => campaignController.deleteCampaign(req as any, res));

export default router;
