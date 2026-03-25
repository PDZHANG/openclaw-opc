import { Request, Response } from 'express';
import { GroupModel } from '../models/Group';
import { Agent } from '../models/Agent';
import { Human } from '../models/Human';
import { Message } from '../models/Message';
import { groupLeaderSupervisor } from '../services/collaboration';
import type { AuthRequest } from '../middleware/auth';

export const groupController = {
  async create(req: AuthRequest, res: Response) {
    try {
      const { name, description, isPublic, memberIds, leaderId, humanMemberIds } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ error: '需要登录' });
      }
      
      const group = GroupModel.create({
        name,
        description,
        createdBy: req.user.id,
        isPublic: isPublic ?? true,
        leaderId
      });
      
      GroupModel.addMember(group.id, req.user.id, 'human', 'admin');
      
      if (memberIds && Array.isArray(memberIds)) {
        for (const memberId of memberIds) {
          const agent = Agent.findById(memberId);
          if (agent) {
            GroupModel.addMember(group.id, memberId, 'agent', 'member');
          }
        }
      }
      
      if (humanMemberIds && Array.isArray(humanMemberIds)) {
        for (const memberId of humanMemberIds) {
          const human = Human.findById(memberId);
          if (human) {
            GroupModel.addMember(group.id, memberId, 'human', 'member');
          }
        }
      }
      
      // 发送欢迎消息
      const welcomeContent = `# 🎉 欢迎加入群组「${name}」！

您可以尝试以下操作，快速开始协作：

## 1️⃣ 完善群组信息
- 添加群组头像，让团队更有辨识度
- 补充群组描述，明确团队目标

## 2️⃣ 设置群公告
- 可以在群公告中发布重要通知
- 记录团队的基本原则和工作方式

## 3️⃣ 添加成员
- 邀请更多 AI 员工加入团队
- 分配不同的角色和职责

## 4️⃣ 开始对话
- 在群里发布任务，让 AI 员工协作完成
- @特定成员进行针对性交流

---

**提示**：如果设置了群组负责人，他们会负责跟进群内事项并督促工作进度哦！`;

      Message.create({
        type: 'text',
        fromId: 'system',
        fromType: 'system',
        fromName: '系统通知',
        toType: 'group',
        toId: group.id,
        content: welcomeContent,
        status: 'sent'
      });
      
      const members = GroupModel.getMembers(group.id);
      res.status(201).json({ ...group, members });
    } catch (error) {
      console.error('Error creating group:', error);
      res.status(500).json({ error: 'Failed to create group' });
    }
  },

  async list(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: '需要登录' });
      }
      
      console.log('=== list groups called ===');
      console.log('req.user.id:', req.user.id);
      
      const groups = GroupModel.getGroupsByMember(req.user.id, 'human');
      console.log('Found groups:', groups.length);
      
      const groupsWithMembers = groups.map(group => ({
        ...group,
        members: GroupModel.getMembers(group.id)
      }));
      res.json(groupsWithMembers);
    } catch (error) {
      console.error('Error listing groups:', error);
      res.status(500).json({ error: 'Failed to list groups' });
    }
  },

  async get(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: '需要登录' });
      }
      
      const group = GroupModel.findById(req.params.id);
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }
      
      // 检查当前用户是否是群组成员
      const members = GroupModel.getMembers(req.params.id);
      const isMember = members.some(m => m.userId === req.user?.id && m.userType === 'human');
      
      if (!isMember) {
        return res.status(403).json({ error: '无权访问该群组' });
      }
      
      res.json({ ...group, members });
    } catch (error) {
      console.error('Error getting group:', error);
      res.status(500).json({ error: 'Failed to get group' });
    }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: '需要登录' });
      }
      
      // 检查当前用户是否是群组成员
      const members = GroupModel.getMembers(req.params.id);
      const isMember = members.some(m => m.userId === req.user?.id && m.userType === 'human');
      
      if (!isMember) {
        return res.status(403).json({ error: '无权操作该群组' });
      }
      
      const group = GroupModel.update(req.params.id, req.body);
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }
      res.json(group);
    } catch (error) {
      console.error('Error updating group:', error);
      res.status(500).json({ error: 'Failed to update group' });
    }
  },

  async delete(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: '需要登录' });
      }
      
      // 检查当前用户是否是群组成员
      const members = GroupModel.getMembers(req.params.id);
      const isMember = members.some(m => m.userId === req.user?.id && m.userType === 'human');
      
      if (!isMember) {
        return res.status(403).json({ error: '无权操作该群组' });
      }
      
      const deleted = GroupModel.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Group not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting group:', error);
      res.status(500).json({ error: 'Failed to delete group' });
    }
  },

  async addMember(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: '需要登录' });
      }
      
      // 检查当前用户是否是群组成员
      const members = GroupModel.getMembers(req.params.id);
      const isMember = members.some(m => m.userId === req.user?.id && m.userType === 'human');
      
      if (!isMember) {
        return res.status(403).json({ error: '无权操作该群组' });
      }
      
      const { userId, userType, role } = req.body;
      const member = GroupModel.addMember(req.params.id, userId, userType, role);
      if (!member) {
        return res.status(400).json({ error: 'Failed to add member' });
      }
      res.status(201).json(member);
    } catch (error) {
      console.error('Error adding member:', error);
      res.status(500).json({ error: 'Failed to add member' });
    }
  },

  async removeMember(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: '需要登录' });
      }
      
      // 检查当前用户是否是群组成员
      const members = GroupModel.getMembers(req.params.id);
      const isMember = members.some(m => m.userId === req.user?.id && m.userType === 'human');
      
      if (!isMember) {
        return res.status(403).json({ error: '无权操作该群组' });
      }
      
      const { userId, userType } = req.body;
      const removed = GroupModel.removeMember(req.params.id, userId, userType);
      if (!removed) {
        return res.status(404).json({ error: 'Member not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing member:', error);
      res.status(500).json({ error: 'Failed to remove member' });
    }
  },

  async getMembers(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: '需要登录' });
      }
      
      // 检查当前用户是否是群组成员
      const members = GroupModel.getMembers(req.params.id);
      const isMember = members.some(m => m.userId === req.user?.id && m.userType === 'human');
      
      if (!isMember) {
        return res.status(403).json({ error: '无权访问该群组' });
      }
      
      res.json(members);
    } catch (error) {
      console.error('Error getting members:', error);
      res.status(500).json({ error: 'Failed to get members' });
    }
  },

  async triggerSupervision(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: '需要登录' });
      }
      
      // 检查当前用户是否是群组成员
      const members = GroupModel.getMembers(req.params.id);
      const isMember = members.some(m => m.userId === req.user?.id && m.userType === 'human');
      
      if (!isMember) {
        return res.status(403).json({ error: '无权操作该群组' });
      }
      
      const groupId = req.params.id;
      const success = await groupLeaderSupervisor.triggerSupervisionForGroup(groupId);
      
      if (success) {
        res.json({ success: true, message: '监督已触发' });
      } else {
        res.status(400).json({ 
          success: false, 
          error: '无法触发监督，请确保群组设置了负责人' 
        });
      }
    } catch (error) {
      console.error('Error triggering supervision:', error);
      res.status(500).json({ error: 'Failed to trigger supervision' });
    }
  },

  async getSupervisionState(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: '需要登录' });
      }
      
      // 检查当前用户是否是群组成员
      const members = GroupModel.getMembers(req.params.id);
      const isMember = members.some(m => m.userId === req.user?.id && m.userType === 'human');
      
      if (!isMember) {
        return res.status(403).json({ error: '无权访问该群组' });
      }
      
      const groupId = req.params.id;
      const state = groupLeaderSupervisor.getGroupState(groupId);
      res.json({
        success: true,
        state: {
          enabled: state.enabled,
          nextCheckTime: state.nextCheckTime.toISOString(),
          lastCheckTime: state.lastCheckTime ? state.lastCheckTime.toISOString() : null
        }
      });
    } catch (error) {
      console.error('Error getting supervision state:', error);
      res.status(500).json({ error: 'Failed to get supervision state' });
    }
  },

  async toggleSupervision(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: '需要登录' });
      }
      
      // 检查当前用户是否是群组成员
      const members = GroupModel.getMembers(req.params.id);
      const isMember = members.some(m => m.userId === req.user?.id && m.userType === 'human');
      
      if (!isMember) {
        return res.status(403).json({ error: '无权操作该群组' });
      }
      
      const groupId = req.params.id;
      const state = groupLeaderSupervisor.toggleSupervision(groupId);
      res.json({
        success: true,
        message: state.enabled ? '监督已开启' : '监督已关闭',
        state: {
          enabled: state.enabled,
          nextCheckTime: state.nextCheckTime.toISOString(),
          lastCheckTime: state.lastCheckTime ? state.lastCheckTime.toISOString() : null
        }
      });
    } catch (error) {
      console.error('Error toggling supervision:', error);
      res.status(500).json({ error: 'Failed to toggle supervision' });
    }
  }
};
