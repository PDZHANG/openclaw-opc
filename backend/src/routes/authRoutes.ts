import express from 'express';
import { authController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/me', authenticateToken, authController.getCurrentUser);
router.put('/me', authenticateToken, authController.updateProfile);
router.get('/users', authenticateToken, authController.listUsers);
router.put('/users/role', authenticateToken, authController.updateUserRole);
router.post('/users', authenticateToken, authController.createUser);
router.put('/users/approve', authenticateToken, authController.approveUser);

export default router;
