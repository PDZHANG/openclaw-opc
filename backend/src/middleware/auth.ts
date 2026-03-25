import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Human } from '../models/Human';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'admin' | 'user';
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }
    
    const decodedUser = user as any;
    const human = Human.findById(decodedUser.id);
    
    if (!human || !human.isApproved) {
      return res.status(403).json({ error: '账户未审核或已被禁用' });
    }
    
    if (!human.isActive) {
      return res.status(403).json({ error: '账户已被禁用' });
    }
    
    req.user = decodedUser;
    next();
  });
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
};

export const generateToken = (user: { id: string; email: string; role: 'admin' | 'user' }) => {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
};
