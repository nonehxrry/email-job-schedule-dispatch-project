import { Router } from 'express';
import { accountController } from '../controllers/account.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', requireAuth, (req, res) => accountController.getAccounts(req, res));
router.post('/', requireAuth, (req, res) => accountController.createAccount(req, res));
router.put('/:id', requireAuth, (req, res) => accountController.updateAccount(req, res));
router.delete('/:id', requireAuth, (req, res) => accountController.deleteAccount(req, res));

export default router;
