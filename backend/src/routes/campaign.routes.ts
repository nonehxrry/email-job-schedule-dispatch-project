import { Router } from 'express';
import { campaignController } from '../controllers/campaign.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.post('/schedule', requireAuth, (req, res) => campaignController.scheduleCampaign(req, res));
router.get('/', requireAuth, (req, res) => campaignController.getCampaigns(req, res));
router.delete('/:id', requireAuth, (req, res) => campaignController.deleteCampaign(req, res));

export default router;
