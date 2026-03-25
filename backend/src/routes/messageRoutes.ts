import { Router } from 'express';
import { messageController } from '../controllers/messageController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, messageController.getMessages);
router.get('/with-read-status', authenticateToken, messageController.getMessagesWithReadStatus);
router.get('/conversations', authenticateToken, messageController.getConversations);
router.get('/humans', authenticateToken, messageController.getHumanUsers);
router.get('/conversations/:conversationType/:conversationId', authenticateToken, messageController.getConversationDetail);
router.post('/send', authenticateToken, messageController.sendMessage);
router.post('/mark-read', authenticateToken, messageController.markAsRead);
router.post('/mark-conversation-read', authenticateToken, messageController.markConversationAsRead);
router.get('/unread-count', authenticateToken, messageController.getUnreadCount);
router.get('/:messageId/read-status', authenticateToken, messageController.getMessageReadStatus);
router.delete('/:id', authenticateToken, messageController.deleteMessage);
router.delete('/conversation/:conversationType/:conversationId', authenticateToken, messageController.deleteConversation);

export default router;
