import { Request, Response } from 'express';
import { AgentStatusModel } from '../models/AgentStatus';
import { Agent } from '../models/Agent';
import { CollaborationTaskModel } from '../models/CollaborationTask';
// import { InteractionEventModel } from '../models/InteractionEvent';

export const statusController = {
  async list(req: Request, res: Response) {
    try {
      const statuses = AgentStatusModel.findAll();
      res.json(statuses);
    } catch (error) {
      console.error('Error listing statuses:', error);
      res.status(500).json({ error: 'Failed to list statuses' });
    }
  },

  async get(req: Request, res: Response) {
    try {
      const status = AgentStatusModel.findByAgentId(req.params.agentId);
      if (!status) {
        return res.status(404).json({ error: 'Status not found' });
      }
      res.json(status);
    } catch (error) {
      console.error('Error getting status:', error);
      res.status(500).json({ error: 'Failed to get status' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const status = AgentStatusModel.upsert(req.params.agentId, req.body);
      res.json(status);
    } catch (error) {
      console.error('Error updating status:', error);
      res.status(500).json({ error: 'Failed to update status' });
    }
  },

  async getDashboard(req: Request, res: Response) {
    try {
      console.log('=== getDashboard called ===');
      const agents = Agent.findAll();
      console.log('Agents found:', agents.length);
      
      const collaborationTasks = CollaborationTaskModel.findAll();
      
      let total = agents.length;
      let online = 0;
      let busy = 0;
      let idle = 0;
      
      const dashboardAgents = agents.map(agent => {
        const status = AgentStatusModel.findByAgentId(agent.id);
        
        const connectionStatus = 'online';
        const availabilityStatus = status?.availabilityStatus || 'idle';
        const isBusy = availabilityStatus === 'busy';
        
        online++;
        if (isBusy) {
          busy++;
        } else {
          idle++;
        }
        
        return {
          id: agent.id,
          name: agent.name,
          role: agent.role,
          status: connectionStatus,
          availability: availabilityStatus,
          currentTask: status?.currentTask,
          messagesSent: status?.messagesSent || 0,
          messagesReceived: status?.messagesReceived || 0,
          tasksCompleted: status?.tasksCompleted || 0,
          lastActiveAt: status?.lastActiveAt ? new Date(status.lastActiveAt).toISOString() : undefined,
          currentActivity: (status as any)?.currentActivity
        };
      });
      
      const dashboard = {
        totalAgents: total,
        online,
        offline: 0,
        busy,
        idle,
        collaborating: busy,
        agents: dashboardAgents,
        collaborationTasks
      };
      
      console.log('Dashboard data:', dashboard);
      res.json(dashboard);
    } catch (error) {
      console.error('Error getting dashboard:', error);
      res.status(500).json({ error: 'Failed to get dashboard' });
    }
  },

  async heartbeat(req: Request, res: Response) {
    try {
      const { agentId } = req.params;
      const { availabilityStatus, currentTask } = req.body;
      
      const updateData: any = {
        connectionStatus: 'online',
        lastActiveAt: new Date()
      };
      
      if (availabilityStatus) updateData.availabilityStatus = availabilityStatus;
      if (currentTask) updateData.currentTask = currentTask;
      
      const status = AgentStatusModel.upsert(agentId, updateData);
      res.json(status);
    } catch (error) {
      console.error('Error processing heartbeat:', error);
      res.status(500).json({ error: 'Failed to process heartbeat' });
    }
  }
};
