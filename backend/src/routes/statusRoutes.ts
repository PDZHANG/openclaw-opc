import { Router } from 'express';
import { statusController } from '../controllers/statusController';

const router = Router();

router.get('/dashboard', statusController.getDashboard);
router.get('/', statusController.list);
router.get('/:agentId', statusController.get);
router.put('/:agentId', statusController.update);
router.post('/:agentId/heartbeat', statusController.heartbeat);

export default router;
