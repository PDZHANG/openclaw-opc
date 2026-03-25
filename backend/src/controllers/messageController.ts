import { Request, Response } from 'express';
import { openclawService } from '../services/openclawService';
import { Agent } from '../models/Agent';
import { Message } from '../models/Message';
import { MessageReadModel } from '../models/MessageRead';
import { GroupModel } from '../models/Group';
import { Human } from '../models/Human';
import type { AuthRequest } from '../middleware/auth';

export const messageController = {
  async sendMessage(req: Request, res: Response) {
    try {
      const { agentId, message, conversationType, conversationId } = req.body;
      
      const agent = Agent.findById(agentId);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      const userMessage = Message.create({
        type: 'text',
        fromId: 'user',
        fromType: 'human',
        fromName: 'User',
        toType: 'direct',
        toId: agentId,
        content: message,
        status: 'sent'
      });
      
      let response: string;
      
      try {
        response = await openclawService.sendMessage(agentId, message);
      } catch (error) {
        response = `Error: Could not communicate with OpenClaw. ${(error as Error).message}`;
      }
      
      const aiMessage = Message.create({
        type: 'text',
        fromId: agentId,
        fromType: 'agent',
        fromName: agent.name,
        toType: 'direct',
        toId: 'user',
        content: response,
        status: 'sent'
      });
      
      res.json({
        success: true,
        response,
        userMessage,
        aiMessage,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  },
  
  async getMessages(req: AuthRequest, res: Response) {
    try {
      const { conversationType, conversationId, limit } = req.query;
      
      if (!conversationType || !conversationId) {
        return res.status(400).json({ error: 'conversationType and conversationId are required' });
      }
      
      if (!req.user) {
        return res.status(401).json({ error: '需要登录' });
      }
      
      // 如果是群组消息，检查用户是否是群组成员
      if (conversationType === 'group') {
        const members = GroupModel.getMembers(conversationId as string);
        const isMember = members.some(m => m.userId === req.user?.id && m.userType === 'human');
        
        if (!isMember) {
          return res.status(403).json({ error: '无权访问该群组' });
        }
      }
      
      const messages = Message.findByConversation(
        conversationType as 'direct' | 'group',
        conversationId as string,
        conversationType === 'direct' ? 'human' : undefined,
        conversationType === 'direct' ? req.user.id : undefined,
        limit ? parseInt(limit as string) : 50
      );
      
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  },

  async deleteMessage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const deleted = Message.delete(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Message not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting message:', error);
      res.status(500).json({ error: 'Failed to delete message' });
    }
  },

  async deleteConversation(req: AuthRequest, res: Response) {
    try {
      const { conversationType, conversationId } = req.params;
      
      if (!conversationType || !conversationId) {
        return res.status(400).json({ error: 'conversationType and conversationId are required' });
      }
      
      if (!req.user) {
        return res.status(401).json({ error: '需要登录' });
      }
      
      // 如果是群组消息，检查用户是否是群组成员
      if (conversationType === 'group') {
        const members = GroupModel.getMembers(conversationId as string);
        const isMember = members.some(m => m.userId === req.user?.id && m.userType === 'human');
        
        if (!isMember) {
          return res.status(403).json({ error: '无权访问该群组' });
        }
      }
      
      const count = Message.deleteByConversation(
        conversationType as 'direct' | 'group',
        conversationId as string
      );
      
      res.json({ success: true, deletedCount: count });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      res.status(500).json({ error: 'Failed to delete conversation' });
    }
  },

  async getMessagesWithReadStatus(req: AuthRequest, res: Response) {
    try {
      const { conversationType, conversationId, limit, userId, userType } = req.query;
      
      if (!conversationType || !conversationId) {
        return res.status(400).json({ error: 'conversationType and conversationId are required' });
      }
      
      if (!req.user) {
        return res.status(401).json({ error: '需要登录' });
      }
      
      // 如果是群组消息，检查用户是否是群组成员
      if (conversationType === 'group') {
        const members = GroupModel.getMembers(conversationId as string);
        const isMember = members.some(m => m.userId === req.user?.id && m.userType === 'human');
        
        if (!isMember) {
          return res.status(403).json({ error: '无权访问该群组' });
        }
      }
      
      // 对于直接对话，优先使用当前用户的ID
      const effectiveUserId = conversationType === 'direct' ? req.user.id : (userId as string | undefined);
      const effectiveUserType = conversationType === 'direct' ? 'human' : (userType as 'human' | 'agent' | undefined);
      
      const messages = Message.findByConversationWithReadStatus(
        conversationType as 'direct' | 'group',
        conversationId as string,
        limit ? parseInt(limit as string) : 50,
        effectiveUserId,
        effectiveUserType
      );
      
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages with read status:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  },

  async markAsRead(req: Request, res: Response) {
    try {
      const { messageId, userId, userType } = req.body;
      
      if (!messageId || !userId || !userType) {
        return res.status(400).json({ error: 'messageId, userId, and userType are required' });
      }
      
      const readRecord = MessageReadModel.markAsRead(
        messageId,
        userId,
        userType as 'human' | 'agent'
      );
      
      if (!readRecord) {
        return res.status(500).json({ error: 'Failed to mark message as read' });
      }
      
      res.json({ success: true, readRecord });
    } catch (error) {
      console.error('Error marking message as read:', error);
      res.status(500).json({ error: 'Failed to mark message as read' });
    }
  },

  async markConversationAsRead(req: Request, res: Response) {
    try {
      const { conversationType, conversationId, userId, userType } = req.body;
      
      if (!conversationType || !conversationId || !userId || !userType) {
        return res.status(400).json({ error: 'All fields are required' });
      }
      
      const count = MessageReadModel.markConversationAsRead(
        conversationType as 'direct' | 'group',
        conversationId as string,
        userId as string,
        userType as 'human' | 'agent'
      );
      
      res.json({ success: true, markedCount: count });
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      res.status(500).json({ error: 'Failed to mark conversation as read' });
    }
  },

  async getUnreadCount(req: Request, res: Response) {
    try {
      const { conversationType, conversationId, userId, userType } = req.query;
      
      if (!conversationType || !conversationId || !userId || !userType) {
        return res.status(400).json({ error: 'All fields are required' });
      }
      
      const unreadCount = MessageReadModel.getUnreadCount(
        conversationType as 'direct' | 'group',
        conversationId as string,
        userId as string,
        userType as 'human' | 'agent'
      );
      
      res.json({ conversationType, conversationId, unreadCount });
    } catch (error) {
      console.error('Error getting unread count:', error);
      res.status(500).json({ error: 'Failed to get unread count' });
    }
  },

  async getMessageReadStatus(req: Request, res: Response) {
    try {
      const { messageId } = req.params;
      
      if (!messageId) {
        return res.status(400).json({ error: 'messageId is required' });
      }
      
      const readBy = MessageReadModel.findByMessageId(messageId);
      
      res.json({ messageId, readBy });
    } catch (error) {
      console.error('Error getting message read status:', error);
      res.status(500).json({ error: 'Failed to get message read status' });
    }
  },

  async getHumanUsers(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: '需要登录' });
      }
      
      const users = Human.findAll();
      const usersWithoutPassword = users.map(({ passwordHash, ...user }) => user);
      res.json(usersWithoutPassword);
    } catch (error) {
      console.error('Error getting human users:', error);
      res.status(500).json({ error: 'Failed to get human users' });
    }
  },

  async getConversations(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: '需要登录' });
      }
      
      const agents = Agent.findAll();
      const groups = GroupModel.getGroupsByMember(req.user.id, 'human');
      const humans = Human.findAll();
      
      const conversations: any[] = [];
      
      for (const agent of agents) {
        const lastMessage = Message.findLastMessageForConversation('direct', agent.id);
        const unreadCount = MessageReadModel.getUnreadCount('direct', agent.id, req.user.id, 'human');
        
        conversations.push({
          id: agent.id,
          type: 'agent',
          name: agent.name,
          avatar: agent.avatar,
          role: agent.role,
          lastMessage: lastMessage ? {
            content: lastMessage.content.substring(0, 100),
            timestamp: lastMessage.createdAt,
            fromType: lastMessage.fromType
          } : null,
          unreadCount: unreadCount
        });
      }
      
      for (const group of groups) {
        const lastMessage = Message.findLastMessageForConversation('group', group.id);
        const unreadCount = MessageReadModel.getUnreadCount('group', group.id, req.user.id, 'human');
        
        conversations.push({
          id: group.id,
          type: 'group',
          name: group.name,
          avatar: group.avatar,
          description: group.description,
          lastMessage: lastMessage ? {
            content: lastMessage.content.substring(0, 100),
            timestamp: lastMessage.createdAt,
            fromType: lastMessage.fromType,
            fromName: lastMessage.fromName
          } : null,
          unreadCount: unreadCount
        });
      }
      
      for (const human of humans) {
        if (human.id !== req.user.id) {
          const lastMessage = Message.findLastMessageForConversation('direct', human.id, req.user.id);
          const unreadCount = MessageReadModel.getUnreadCount('direct', human.id, req.user.id, 'human');
          
          if (lastMessage || unreadCount > 0) {
            conversations.push({
              id: human.id,
              type: 'human',
              name: human.name,
              avatar: human.avatar,
              email: human.email,
              lastMessage: lastMessage ? {
                content: lastMessage.content.substring(0, 100),
                timestamp: lastMessage.createdAt,
                fromType: lastMessage.fromType,
                fromName: lastMessage.fromName
              } : null,
              unreadCount: unreadCount
            });
          }
        }
      }
      
      conversations.sort((a, b) => {
        const aTime = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
        const bTime = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
        return bTime - aTime;
      });
      
      res.json(conversations);
    } catch (error) {
      console.error('Error getting conversations:', error);
      res.status(500).json({ error: 'Failed to get conversations' });
    }
  },

  async getConversationDetail(req: AuthRequest, res: Response) {
    try {
      const { conversationType, conversationId } = req.params;
      
      if (!conversationType || !conversationId) {
        return res.status(400).json({ error: 'conversationType and conversationId are required' });
      }
      
      if (!req.user) {
        return res.status(401).json({ error: '需要登录' });
      }
      
      if (conversationType === 'agent') {
        const agent = Agent.findById(conversationId);
        if (!agent) {
          return res.status(404).json({ error: 'Agent not found' });
        }
        
        const messages = Message.findByConversation('direct', conversationId, 'human', req.user.id, 100);
        const unreadCount = MessageReadModel.getUnreadCount('direct', conversationId, req.user.id, 'human');
        
        res.json({
          type: 'agent',
          data: agent,
          messages,
          unreadCount
        });
      } else if (conversationType === 'group') {
        const group = GroupModel.findById(conversationId);
        if (!group) {
          return res.status(404).json({ error: 'Group not found' });
        }
        
        // 检查用户是否是群组成员
        const members = GroupModel.getMembers(conversationId);
        const isMember = members.some(m => m.userId === req.user?.id && m.userType === 'human');
        
        if (!isMember) {
          return res.status(403).json({ error: '无权访问该群组' });
        }
        
        const messages = Message.findByConversation('group', conversationId, undefined, undefined, 100);
        const unreadCount = MessageReadModel.getUnreadCount('group', conversationId, req.user.id, 'human');
        
        res.json({
          type: 'group',
          data: group,
          members,
          messages,
          unreadCount
        });
      } else {
        res.status(400).json({ error: 'Invalid conversation type' });
      }
    } catch (error) {
      console.error('Error getting conversation detail:', error);
      res.status(500).json({ error: 'Failed to get conversation detail' });
    }
  },
};
