import { Request, Response } from 'express';
import { KnowledgeBaseModel } from '../models/KnowledgeBase';
import { AgentKnowledgeBaseBindingModel } from '../models/AgentKnowledgeBaseBinding';
import { KnowledgeRetrievalService } from '../services/KnowledgeRetrievalService';
import type { KnowledgeBaseConfig, KnowledgeBaseType } from '../types';

export const knowledgeBaseController = {
  async getAll(req: Request, res: Response) {
    try {
      const knowledgeBases = KnowledgeBaseModel.findAll();
      res.json({ success: true, data: knowledgeBases });
    } catch (error) {
      console.error('[KnowledgeBaseController] getAll error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch knowledge bases' });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const knowledgeBase = KnowledgeBaseModel.findById(id);
      
      if (!knowledgeBase) {
        return res.status(404).json({ success: false, error: 'Knowledge base not found' });
      }
      
      res.json({ success: true, data: knowledgeBase });
    } catch (error) {
      console.error('[KnowledgeBaseController] getById error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch knowledge base' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { name, type, config, description, isGlobal } = req.body;
      
      if (!name || !type || !config) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      const knowledgeBase = KnowledgeBaseModel.create(
        name,
        type as KnowledgeBaseType,
        config as KnowledgeBaseConfig,
        description,
        isGlobal || false
      );
      
      res.json({ success: true, data: knowledgeBase });
    } catch (error) {
      console.error('[KnowledgeBaseController] create error:', error);
      res.status(500).json({ success: false, error: 'Failed to create knowledge base' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      
      const knowledgeBase = KnowledgeBaseModel.update(id, data);
      
      if (!knowledgeBase) {
        return res.status(404).json({ success: false, error: 'Knowledge base not found' });
      }
      
      res.json({ success: true, data: knowledgeBase });
    } catch (error) {
      console.error('[KnowledgeBaseController] update error:', error);
      res.status(500).json({ success: false, error: 'Failed to update knowledge base' });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = KnowledgeBaseModel.delete(id);
      
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Knowledge base not found' });
      }
      
      res.json({ success: true, message: 'Knowledge base deleted successfully' });
    } catch (error) {
      console.error('[KnowledgeBaseController] delete error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete knowledge base' });
    }
  },

  async testConnection(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const knowledgeBase = KnowledgeBaseModel.findById(id);
      
      if (!knowledgeBase) {
        return res.status(404).json({ success: false, error: 'Knowledge base not found' });
      }

      const success = await KnowledgeRetrievalService.testKnowledgeBase(knowledgeBase);
      
      res.json({ success, data: { connected: success } });
    } catch (error) {
      console.error('[KnowledgeBaseController] testConnection error:', error);
      res.status(500).json({ success: false, error: 'Failed to test connection' });
    }
  },

  async getAgentBindings(req: Request, res: Response) {
    try {
      const { agentId } = req.params;
      const bindings = AgentKnowledgeBaseBindingModel.findByAgentId(agentId);
      const knowledgeBases = AgentKnowledgeBaseBindingModel.findKnowledgeBasesByAgentId(agentId);
      
      res.json({ 
        success: true, 
        data: { 
          bindings, 
          knowledgeBases 
        } 
      });
    } catch (error) {
      console.error('[KnowledgeBaseController] getAgentBindings error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch agent bindings' });
    }
  },

  async bindAgent(req: Request, res: Response) {
    try {
      const { agentId, knowledgeBaseId, priority } = req.body;
      
      if (!agentId || !knowledgeBaseId) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      const binding = AgentKnowledgeBaseBindingModel.create(agentId, knowledgeBaseId, priority || 0);
      
      res.json({ success: true, data: binding });
    } catch (error) {
      console.error('[KnowledgeBaseController] bindAgent error:', error);
      res.status(500).json({ success: false, error: 'Failed to bind knowledge base to agent' });
    }
  },

  async unbindAgent(req: Request, res: Response) {
    try {
      const { agentId, knowledgeBaseId } = req.body;
      
      if (!agentId || !knowledgeBaseId) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      const deleted = AgentKnowledgeBaseBindingModel.delete(agentId, knowledgeBaseId);
      
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Binding not found' });
      }
      
      res.json({ success: true, message: 'Knowledge base unbound from agent successfully' });
    } catch (error) {
      console.error('[KnowledgeBaseController] unbindAgent error:', error);
      res.status(500).json({ success: false, error: 'Failed to unbind knowledge base from agent' });
    }
  },

  async updateBindingPriority(req: Request, res: Response) {
    try {
      const { agentId, knowledgeBaseId, priority } = req.body;
      
      if (!agentId || !knowledgeBaseId || priority === undefined) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
      }

      const binding = AgentKnowledgeBaseBindingModel.updatePriority(agentId, knowledgeBaseId, priority);
      
      if (!binding) {
        return res.status(404).json({ success: false, error: 'Binding not found' });
      }
      
      res.json({ success: true, data: binding });
    } catch (error) {
      console.error('[KnowledgeBaseController] updateBindingPriority error:', error);
      res.status(500).json({ success: false, error: 'Failed to update binding priority' });
    }
  },

  async retrieveForAgent(req: Request, res: Response) {
    try {
      const { agentId } = req.params;
      const { query, topK } = req.body;
      
      if (!query) {
        return res.status(400).json({ success: false, error: 'Query is required' });
      }

      const results = await KnowledgeRetrievalService.retrieveForAgent(agentId, query, topK || 10);
      const formattedContent = await KnowledgeRetrievalService.formatKnowledgeForInjection(results);
      
      res.json({ 
        success: true, 
        data: { 
          results, 
          formattedContent 
        } 
      });
    } catch (error) {
      console.error('[KnowledgeBaseController] retrieveForAgent error:', error);
      res.status(500).json({ success: false, error: 'Failed to retrieve knowledge' });
    }
  }
};
