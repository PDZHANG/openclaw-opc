import { Request, Response } from 'express';
import { CollaborationTaskModel } from '../models/CollaborationTask';
import { Agent } from '../models/Agent';
import { GroupModel } from '../models/Group';
import { Message } from '../models/Message';
import { openclawService } from '../services/openclawService';

export const collaborationController = {
  async create(req: Request, res: Response) {
    try {
      const { title, description, priority, type, groupId, parentMessageId, assignees, dependencies, dueAt } = req.body;
      
      const task = CollaborationTaskModel.create({
        title,
        description,
        priority: priority || 'medium',
        status: 'pending',
        type: type || 'collaborative',
        createdBy: 'system',
        groupId,
        parentMessageId,
        assignees,
        dependencies,
        progress: 0,
        dueAt: dueAt ? new Date(dueAt) : undefined
      });
      
      res.status(201).json(task);
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ error: 'Failed to create task' });
    }
  },

  async list(req: Request, res: Response) {
    try {
      const { status, groupId, assigneeId } = req.query;
      
      let tasks;
      if (status) {
        tasks = CollaborationTaskModel.findByStatus(status as any);
      } else if (groupId) {
        tasks = CollaborationTaskModel.findByGroup(groupId as string);
      } else if (assigneeId) {
        tasks = CollaborationTaskModel.findByAssignee(assigneeId as string);
      } else {
        tasks = CollaborationTaskModel.findAll();
      }
      
      res.json(tasks);
    } catch (error) {
      console.error('Error listing tasks:', error);
      res.status(500).json({ error: 'Failed to list tasks' });
    }
  },

  async get(req: Request, res: Response) {
    try {
      const task = CollaborationTaskModel.findById(req.params.id);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json(task);
    } catch (error) {
      console.error('Error getting task:', error);
      res.status(500).json({ error: 'Failed to get task' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const task = CollaborationTaskModel.update(req.params.id, req.body);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json(task);
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ error: 'Failed to update task' });
    }
  },

  async updateProgress(req: Request, res: Response) {
    try {
      const { progress } = req.body;
      const task = CollaborationTaskModel.updateProgress(req.params.id, progress);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json(task);
    } catch (error) {
      console.error('Error updating progress:', error);
      res.status(500).json({ error: 'Failed to update progress' });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const deleted = CollaborationTaskModel.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({ error: 'Failed to delete task' });
    }
  },

  async addAssignee(req: Request, res: Response) {
    try {
      const { assigneeId } = req.body;
      const task = CollaborationTaskModel.addAssignee(req.params.id, assigneeId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json(task);
    } catch (error) {
      console.error('Error adding assignee:', error);
      res.status(500).json({ error: 'Failed to add assignee' });
    }
  },

  async removeAssignee(req: Request, res: Response) {
    try {
      const { assigneeId } = req.body;
      const task = CollaborationTaskModel.removeAssignee(req.params.id, assigneeId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json(task);
    } catch (error) {
      console.error('Error removing assignee:', error);
      res.status(500).json({ error: 'Failed to remove assignee' });
    }
  },

  async deleteAll(req: Request, res: Response) {
    try {
      const deletedCount = CollaborationTaskModel.deleteAll();
      res.json({ success: true, deletedCount });
    } catch (error) {
      console.error('Error deleting all tasks:', error);
      res.status(500).json({ error: 'Failed to delete all tasks' });
    }
  },

  async deleteByGroup(req: Request, res: Response) {
    try {
      const { groupId } = req.params;
      const deletedCount = CollaborationTaskModel.deleteByGroup(groupId);
      res.json({ success: true, deletedCount });
    } catch (error) {
      console.error('Error deleting tasks by group:', error);
      res.status(500).json({ error: 'Failed to delete tasks by group' });
    }
  },

  async confirmTask(req: Request, res: Response) {
    try {
      const task = CollaborationTaskModel.findById(req.params.id);
      if (!task || task.status !== 'pending_confirmation') {
        return res.status(404).json({ error: 'Task not found or not in pending_confirmation state' });
      }

      const updatedTask = CollaborationTaskModel.update(req.params.id, {
        status: 'pending',
        confirmedAt: new Date()
      });

      res.json(updatedTask);
    } catch (error) {
      console.error('Error confirming task:', error);
      res.status(500).json({ error: 'Failed to confirm task' });
    }
  },

  async rejectTask(req: Request, res: Response) {
    try {
      const task = CollaborationTaskModel.findById(req.params.id);
      if (!task || task.status !== 'pending_confirmation') {
        return res.status(404).json({ error: 'Task not found or not in pending_confirmation state' });
      }

      const updatedTask = CollaborationTaskModel.update(req.params.id, {
        status: 'rejected',
        rejectedAt: new Date()
      });

      res.json(updatedTask);
    } catch (error) {
      console.error('Error rejecting task:', error);
      res.status(500).json({ error: 'Failed to reject task' });
    }
  },
};

export class CollaborationEngine {
  static parseMessage(content: string, members: { userId: string; userType: string }[]): { mentions: string[], taskInfo: any } {
    const mentionRegex = /@([^\s@]+)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(content)) !== null) {
      const mentionedName = match[1];
      const member = members.find(m => {
        if (m.userType === 'agent') {
          const agent = Agent.findById(m.userId);
          return agent && (agent.name === mentionedName || agent.id === mentionedName);
        }
        return false;
      });
      if (member && !mentions.includes(member.userId)) {
        mentions.push(member.userId);
      }
    }
    
    const taskKeywords = ['需要', '请', '帮忙', '完成', '实现', '设计', '开发', '测试'];
    const hasTaskIntent = taskKeywords.some(keyword => content.includes(keyword));
    
    return {
      mentions,
      taskInfo: hasTaskIntent ? { title: content.substring(0, 100) } : null
    };
  }

  static needsCollaboration(parsed: { mentions: string[], taskInfo: any }): boolean {
    return parsed.mentions.length > 0 && parsed.taskInfo !== null;
  }

  static async handleCollaboration(
    message: { fromId: string; fromType: string; fromName: string; content: string; toId: string },
    groupId: string,
    io?: any
  ): Promise<any> {
    const members = GroupModel.getMembers(groupId);
    const parsed = this.parseMessage(message.content, members);
    
    if (parsed.mentions.length === 0) {
      return null;
    }
    
    let task = null;
    
    if (parsed.taskInfo !== null) {
      const taskId = Date.now().toString();
      
      const centralWorkspacePath = await openclawService.createCentralTaskWorkspace(
        taskId, 
        parsed.taskInfo.title
      );
      
      task = CollaborationTaskModel.create({
        title: parsed.taskInfo.title,
        description: message.content,
        priority: 'medium',
        status: 'pending',
        type: 'collaborative',
        createdBy: message.fromId,
        groupId,
        assignees: parsed.mentions,
        progress: 0,
        workspacePath: centralWorkspacePath
      });
      
      if (io && task) {
        io.to(`group:${groupId}`).emit('task:new', task);
      }
    }
    
    return task;
  }
}
