import { Request, Response } from 'express';
import { Agent } from '../models/Agent';
import { AgentStatusModel } from '../models/AgentStatus';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { openclawService } from '../services/openclawService';
import { AuthRequest } from '../middleware/auth';

export const agentController = {
  async create(req: AuthRequest, res: Response) {
    try {
      console.log('=== create agent called ===');
      console.log('Request body:', req.body);
      
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: '需要管理员权限才能创建 AI 员工' });
      }
      
      const { agentId, name, description, role, department, tags, soul, identity, tools, bootstrap, user } = req.body;
      
      if (!agentId) {
        console.log('Error: agentId is required');
        return res.status(400).json({ error: 'agentId is required' });
      }
      
      console.log('Creating agent in database...');
      const agent = Agent.create({
        id: agentId,
        name,
        description,
        role,
        department,
        tags,
        workspacePath: '',
        isActive: true,
        isPinned: false
      });
      console.log('Agent created in database:', agent);
      
      console.log('Creating OpenClaw workspace...');
      await openclawService.createWorkspace(agent.id, {
        soul,
        identity,
        tools,
        bootstrap,
        user
      });
      console.log('OpenClaw workspace created');
      
      console.log('Updating agent workspace path...');
      Agent.update(agent.id, {
        workspacePath: path.join(config.openclawPath, `workspace-${agent.id}`)
      });
      console.log('Agent workspace path updated');
      
      // 为新创建的 AI 员工设置默认在线状态
      console.log('Creating default online status for agent...');
      AgentStatusModel.upsert(agent.id, {
        connectionStatus: 'online',
        availabilityStatus: 'idle',
        lastActiveAt: new Date()
      });
      console.log('Agent status created');
      
      console.log('Agent creation complete');
      res.status(201).json(agent);
    } catch (error) {
      console.error('Error creating agent:', error);
      res.status(500).json({ error: 'Failed to create agent', details: (error as Error).message });
    }
  },

  async list(req: Request, res: Response) {
    try {
      console.log('Fetching agents...');
      const agents = Agent.findAll();
      console.log('Agents found:', agents.length);
      res.json(agents);
    } catch (error) {
      console.error('Error fetching agents:', error);
      res.status(500).json({ error: 'Failed to fetch agents', details: (error as Error).message });
    }
  },

  async get(req: Request, res: Response) {
    try {
      const agent = Agent.findById(req.params.id);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      res.json(agent);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch agent' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const agent = Agent.update(req.params.id, req.body);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      res.json(agent);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update agent' });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const agent = Agent.findById(req.params.id);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      await openclawService.deleteAgent(agent.id);
      
      const deleted = Agent.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete agent' });
    }
  },

  async getConfig(req: Request, res: Response) {
    try {
      const agent = Agent.findById(req.params.id);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      const configs = await openclawService.getAllConfigs(agent.id);
      
      res.json(configs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch config' });
    }
  },

  async updateConfig(req: Request, res: Response) {
    try {
      const agent = Agent.findById(req.params.id);
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      await openclawService.updateAllConfigs(agent.id, req.body);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update config' });
    }
  }
};
