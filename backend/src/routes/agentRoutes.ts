import express from 'express';
import { agentController } from '../controllers/agentController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

router.post('/', authenticateToken, requireAdmin, agentController.create);
router.get('/', authenticateToken, agentController.list);
router.get('/:id', authenticateToken, agentController.get);
router.put('/:id', authenticateToken, requireAdmin, agentController.update);
router.delete('/:id', authenticateToken, requireAdmin, agentController.delete);
router.get('/:id/config', authenticateToken, agentController.getConfig);
router.put('/:id/config', authenticateToken, requireAdmin, agentController.updateConfig);

export default router;
