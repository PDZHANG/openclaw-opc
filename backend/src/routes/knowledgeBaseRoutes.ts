import { Router } from 'express';
import { knowledgeBaseController } from '../controllers/knowledgeBaseController';

const router = Router();

router.get('/', knowledgeBaseController.getAll);
router.get('/:id', knowledgeBaseController.getById);
router.post('/', knowledgeBaseController.create);
router.put('/:id', knowledgeBaseController.update);
router.delete('/:id', knowledgeBaseController.delete);
router.post('/:id/test', knowledgeBaseController.testConnection);

router.get('/agent/:agentId/bindings', knowledgeBaseController.getAgentBindings);
router.post('/agent/bind', knowledgeBaseController.bindAgent);
router.post('/agent/unbind', knowledgeBaseController.unbindAgent);
router.post('/agent/bindings/priority', knowledgeBaseController.updateBindingPriority);

router.post('/agent/:agentId/retrieve', knowledgeBaseController.retrieveForAgent);

export default router;
