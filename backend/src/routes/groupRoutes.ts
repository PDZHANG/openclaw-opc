import { Router } from 'express';
import { groupController } from '../controllers/groupController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/', authenticateToken, groupController.create);
router.get('/', authenticateToken, groupController.list);
router.get('/:id', authenticateToken, groupController.get);
router.put('/:id', authenticateToken, groupController.update);
router.delete('/:id', authenticateToken, groupController.delete);
router.post('/:id/members', authenticateToken, groupController.addMember);
router.delete('/:id/members', authenticateToken, groupController.removeMember);
router.get('/:id/members', authenticateToken, groupController.getMembers);
router.post('/:id/trigger-supervision', authenticateToken, groupController.triggerSupervision);
router.get('/:id/supervision-state', authenticateToken, groupController.getSupervisionState);
router.post('/:id/toggle-supervision', authenticateToken, groupController.toggleSupervision);

export default router;
