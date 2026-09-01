import { Router } from 'express';
import authRoutes from './auth.routes';
import campaignRoutes from './campaign.routes';
import emailRoutes from './email.routes';
import slackRoutes from './slack.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/emails', emailRoutes);
router.use('/slack', slackRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'reachinbox-scheduler-api',
  });
});

export default router;
