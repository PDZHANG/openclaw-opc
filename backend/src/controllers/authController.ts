import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { Human } from '../models/Human';
import { generateToken, AuthRequest } from '../middleware/auth';

export const authController = {
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: '邮箱和密码必填' });
      }

      const human = Human.findByEmail(email);
      
      console.log('authController.login - human:', human);
      
      if (!human) {
        return res.status(401).json({ error: '邮箱或密码错误' });
      }

      if (!human.isActive) {
        return res.status(403).json({ error: '账户已被禁用' });
      }

      console.log('authController.login - isApproved:', human.isApproved);
      
      if (!human.isApproved) {
        return res.status(403).json({ error: '账户正在审核中，请联系管理员' });
      }

      if (!human.passwordHash) {
        return res.status(401).json({ error: '该账户未设置密码' });
      }

      const passwordMatch = await bcrypt.compare(password, human.passwordHash);
      
      if (!passwordMatch) {
        return res.status(401).json({ error: '邮箱或密码错误' });
      }

      const token = generateToken({
        id: human.id,
        email: human.email,
        role: human.role
      });

      const { passwordHash, ...userWithoutPassword } = human;

      res.json({
        token,
        user: userWithoutPassword
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: '登录失败' });
    }
  },

  async register(req: Request, res: Response) {
    try {
      const { name, email, password } = req.body;
      
      if (!name || !email || !password) {
        return res.status(400).json({ error: '姓名、邮箱和密码必填' });
      }

      const existingHuman = Human.findByEmail(email);
      
      if (existingHuman) {
        return res.status(400).json({ error: '该邮箱已被注册' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const isFirstUser = Human.findAll().length === 0;

      const human = Human.create({
        name,
        email,
        passwordHash,
        role: isFirstUser ? 'admin' : 'user',
        isActive: true,
        isApproved: isFirstUser
      });

      const { passwordHash: _, ...userWithoutPassword } = human;

      if (isFirstUser) {
        const token = generateToken({
          id: human.id,
          email: human.email,
          role: human.role
        });

        res.status(201).json({
          token,
          user: userWithoutPassword
        });
      } else {
        res.status(201).json({
          message: '注册成功，请等待管理员审核'
        });
      }
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: '注册失败' });
    }
  },

  async getCurrentUser(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
      return res.sendStatus(401);
    }

    const human = Human.findById(req.user.id);
    
    if (!human) {
      return res.sendStatus(404);
    }

    const { passwordHash, ...userWithoutPassword } = human;
    res.json(userWithoutPassword);
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: '获取用户信息失败' });
    }
  },

  async updateProfile(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.sendStatus(401);
      }

      const { name, avatar, password } = req.body;
      const updateData: any = {};

      if (name !== undefined) updateData.name = name;
      if (avatar !== undefined) updateData.avatar = avatar;
      if (password) {
        updateData.passwordHash = await bcrypt.hash(password, 10);
      }

      const updatedHuman = Human.update(req.user.id, updateData);
      
      if (!updatedHuman) {
        return res.sendStatus(404);
      }

      const { passwordHash, ...userWithoutPassword } = updatedHuman;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: '更新用户信息失败' });
    }
  },

  async listUsers(req: AuthRequest, res: Response) {
    try {
      const users = Human.findAll();
      const usersWithoutPassword = users.map(({ passwordHash, ...user }) => user);
      res.json(usersWithoutPassword);
    } catch (error) {
      console.error('List users error:', error);
      res.status(500).json({ error: '获取用户列表失败' });
    }
  },

  async updateUserRole(req: AuthRequest, res: Response) {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: '需要管理员权限' });
      }

      const { userId, role } = req.body;
      
      if (!userId || !['admin', 'user'].includes(role)) {
        return res.status(400).json({ error: '无效的用户ID或角色' });
      }

      if (userId === req.user.id) {
        return res.status(400).json({ error: '不能修改自己的角色' });
      }

      const updatedUser = Human.update(userId, { role: role as 'admin' | 'user' });
      
      if (!updatedUser) {
        return res.sendStatus(404);
      }

      const { passwordHash, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({ error: '更新用户角色失败' });
    }
  },

  async createUser(req: AuthRequest, res: Response) {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: '需要管理员权限' });
      }

      const { name, email, password, role = 'user' } = req.body;
      
      if (!name || !email || !password) {
        return res.status(400).json({ error: '姓名、邮箱和密码必填' });
      }

      if (!['admin', 'user'].includes(role)) {
        return res.status(400).json({ error: '无效的角色' });
      }

      const existingHuman = Human.findByEmail(email);
      
      if (existingHuman) {
        return res.status(400).json({ error: '该邮箱已被注册' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const human = Human.create({
        name,
        email,
        passwordHash,
        role: role as 'admin' | 'user',
        isActive: true,
        isApproved: true
      });

      const { passwordHash: _, ...userWithoutPassword } = human;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: '创建用户失败' });
    }
  },

  async approveUser(req: AuthRequest, res: Response) {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: '需要管理员权限' });
      }

      const { userId, isApproved } = req.body;
      
      if (!userId || typeof isApproved !== 'boolean') {
        return res.status(400).json({ error: '无效的用户ID或审核状态' });
      }

      const updatedUser = Human.update(userId, { isApproved });
      
      if (!updatedUser) {
        return res.sendStatus(404);
      }

      const { passwordHash, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Approve user error:', error);
      res.status(500).json({ error: '审核用户失败' });
    }
  }
};
