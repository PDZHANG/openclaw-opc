import { Router } from 'express';
import { collaborationController } from '../controllers/collaborationController';

const router = Router();

router.post('/', collaborationController.create);
router.get('/', collaborationController.list);
router.get('/:id', collaborationController.get);
router.put('/:id', collaborationController.update);
router.patch('/:id/progress', collaborationController.updateProgress);
router.delete('/:id', collaborationController.delete);
router.delete('/', collaborationController.deleteAll);
router.delete('/group/:groupId', collaborationController.deleteByGroup);
router.post('/:id/assignees', collaborationController.addAssignee);
router.delete('/:id/assignees', collaborationController.removeAssignee);
router.post('/:id/confirm', collaborationController.confirmTask);
router.post('/:id/reject', collaborationController.rejectTask);

export default router;
