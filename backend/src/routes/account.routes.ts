import { Router, Request, Response } from 'express';
import { accountController } from '../controllers/account.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', requireAuth, (req: Request, res: Response) => accountController.getAccounts(req as any, res));
router.post('/', requireAuth, (req: Request, res: Response) => accountController.createAccount(req as any, res));
router.put('/:id', requireAuth, (req: Request, res: Response) => accountController.updateAccount(req as any, res));
router.delete('/:id', requireAuth, (req: Request, res: Response) => accountController.deleteAccount(req as any, res));

export default router;
