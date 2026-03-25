import { Agent } from '../../models/Agent';
import { GroupModel } from '../../models/Group';
import { CollaborationTaskModel } from '../../models/CollaborationTask';
import { MentionHandler } from './MentionHandler';
import { TaskManager } from './TaskManager';
import { AgentMessageRouter } from './AgentMessageRouter';
import { DeliverableService } from './DeliverableService';
import type { CollaborationContext } from './types';
import type { CollaborationTask } from '../../types';
import { v4 as uuidv4 } from 'uuid';

interface CollaborationOrchestratorOptions {
  setAgentBusy: (agentId: string, taskTitle?: string) => void;
  setAgentIdle: (agentId: string) => void;
  sendGroupMessage: (
    fromId: string,
    fromType: 'human' | 'agent' | 'system',
    fromName: string,
    content: string,
    groupId: string,
    taskId?: string
  ) => Promise<void>;
}

export class CollaborationOrchestrator {
  private agentMessageRouter: AgentMessageRouter;
  private sendGroupMessage: CollaborationOrchestratorOptions['sendGroupMessage'];

  constructor(options: CollaborationOrchestratorOptions) {
    this.sendGroupMessage = options.sendGroupMessage;
    this.agentMessageRouter = new AgentMessageRouter({
      setAgentBusy: options.setAgentBusy,
      setAgentIdle: options.setAgentIdle,
      onAgentReply: this.handleAgentReply.bind(this)
    });
  }

  private async handleAgentReply(agentId: string, content: string, originalContext: CollaborationContext): Promise<void> {
    console.log('=== Agent reply received, checking for mentions ===');
    console.log('Agent:', agentId);
    console.log('Content:', content.substring(0, 100) + '...');

    const agent = Agent.findById(agentId);
    if (!agent) {
      console.log('Agent not found, skipping');
      return;
    }

    const newContext: CollaborationContext = {
      messageData: {
        fromId: agentId,
        fromType: 'agent',
        fromName: agent.name,
        content: content
      },
      groupId: originalContext.groupId,
      io: originalContext.io
    };

    await this.handleGroupMessage(newContext);
  }

  async handleGroupMessage(context: CollaborationContext): Promise<void> {
    console.log('=== CollaborationOrchestrator.handleGroupMessage ===');
    console.log('Context:', {
      fromId: context.messageData.fromId,
      fromType: context.messageData.fromType,
      groupId: context.groupId,
      content: context.messageData.content.substring(0, 100) + '...',
      mentions: context.messageData.mentions
    });

    const parsed = MentionHandler.parse(
      context.messageData.content,
      context.messageData.mentions,
      context.messageData.isTaskMode
    );

    console.log('Parsed message:', {
      mentions: parsed.mentions,
      hasTaskIntent: parsed.hasTaskIntent,
      taskTitle: parsed.taskTitle
    });

    const hasActiveTask = this.hasActiveTaskInGroup(context.groupId);
    console.log('Has active task in group:', hasActiveTask);

    if (context.messageData.fromType === 'human') {
      const hasPendingProposal = this.hasPendingProposalInGroup(context.groupId);
      
      const isTaskMode = context.messageData.isTaskMode === true;
      
      const group = GroupModel.findById(context.groupId);
      const groupLeaderId = group?.leaderId;
      
      if (isTaskMode && !hasPendingProposal) {
        console.log('Task mode is enabled, creating task');
        const taskTitle = parsed.taskTitle || context.messageData.content.substring(0, 30);
        const forcedParsed = {
          ...parsed,
          hasTaskIntent: true,
          taskTitle: taskTitle
        };
        const task = await TaskManager.maybeCreateTask(
          forcedParsed, 
          context, 
          true, 
          groupLeaderId
        );
        
        const agentsToSend = new Set<string>();
        
        if (task && task.assignees && task.assignees.length > 0) {
          task.assignees.forEach(a => agentsToSend.add(a));
        }
        
        if (parsed.mentions && parsed.mentions.length > 0) {
          parsed.mentions.forEach(a => agentsToSend.add(a));
        }
        
        if (agentsToSend.size > 0) {
          await this.agentMessageRouter.sendToAgents(Array.from(agentsToSend), context);
        }
      } else if (parsed.mentions.length > 0) {
        if (!hasActiveTask) {
          console.log('Human message with mentions but no active task, will proceed after task is confirmed');
        } else {
          console.log('Human message with mentions and active task, proceeding');
          await this.agentMessageRouter.sendToAgents(parsed.mentions, context);
        }
      } else if (!isTaskMode) {
        await this.handleNoMentions(context, parsed);
      } else {
        console.log('Task mode is not enabled, skipping task creation');
      }
    } else if (context.messageData.fromType === 'agent') {
      if (parsed.hasTaskCompletion && hasActiveTask) {
        console.log('Agent message with task completion keyword, marking task as completed');
        const activeTask = CollaborationTaskModel.findByGroup(context.groupId).find(task => 
          task.status === 'pending' || task.status === 'in_progress'
        );
        
        if (activeTask) {
          console.log('Found active task to complete:', activeTask.id);
          CollaborationTaskModel.updateProgress(activeTask.id, 100);
          await this.checkAndDeliverTask(activeTask, context.groupId);
        }
      }
      
      if (parsed.mentions.length > 0 && hasActiveTask) {
        console.log('Agent message with mentions and active task, proceeding');
        await this.agentMessageRouter.sendToAgents(parsed.mentions, context);
      } else if (parsed.mentions.length > 0 && !hasActiveTask) {
        console.log('Agent message with mentions but no active task, stopping to prevent infinite loop');
      }
    }
  }

  private hasActiveTaskInGroup(groupId: string): boolean {
    const tasks = CollaborationTaskModel.findByGroup(groupId);
    return tasks.some(task => 
      task.status === 'pending' || task.status === 'in_progress'
    );
  }

  private hasPendingProposalInGroup(groupId: string): boolean {
    const tasks = CollaborationTaskModel.findByGroup(groupId);
    return tasks.some(task => task.status === 'pending_confirmation');
  }

  async handleTaskConfirm(taskId: string, context: CollaborationContext): Promise<void> {
    console.log('=== CollaborationOrchestrator.handleTaskConfirm ===');
    console.log('Task ID:', taskId);

    const task = await TaskManager.confirmTask(taskId, context);
    if (task && task.assignees) {
      await this.agentMessageRouter.sendToAgents(task.assignees, context);
    }
  }

  handleTaskReject(taskId: string, context: CollaborationContext): void {
    console.log('=== CollaborationOrchestrator.handleTaskReject ===');
    console.log('Task ID:', taskId);

    TaskManager.rejectTask(taskId, context);
  }

  private async handleNoMentions(context: CollaborationContext, parsed: any): Promise<void> {
    console.log('No mentions found in group message, selecting default agent');

    const group = GroupModel.findById(context.groupId);
    console.log('Group found:', group);
    console.log('Group leaderId:', group?.leaderId);

    let selectedAgent = null;

    if (group?.leaderId) {
      selectedAgent = Agent.findById(group.leaderId);
      console.log('Selected agent from leaderId:', selectedAgent);
      if (selectedAgent) {
        console.log(`Selected group leader: ${selectedAgent.name}`);
      }
    }

    if (!selectedAgent) {
      const agents = Agent.findAll();
      console.log('All agents found:', agents);
      if (agents.length > 0) {
        selectedAgent = agents[0];
        console.log(`Selected first available agent: ${selectedAgent.name}`);
      }
    }

    if (selectedAgent) {
      await this.agentMessageRouter.sendToAgents([selectedAgent.id], context);
    }
  }

  async checkAndDeliverTask(task: CollaborationTask, groupId: string): Promise<void> {
    console.log('=== CollaborationOrchestrator.checkAndDeliverTask ===');
    console.log('Task:', task.id);
    console.log('Group:', groupId);

    if (!TaskManager.checkTaskCompletion(task)) {
      console.log('Task not ready for delivery');
      return;
    }

    const group = GroupModel.findById(groupId);
    if (!group) {
      console.log('Group not found');
      return;
    }

    const leader = group.leaderId ? Agent.findById(group.leaderId) : null;
    if (!leader) {
      console.log('Group leader not found');
      return;
    }

    try {
      console.log('Generating deliverable...');
      const deliverable = await DeliverableService.generateDeliverable(task);

      console.log('Marking task as completed...');
      TaskManager.markTaskAsCompleted(task.id, deliverable.summary);

      console.log('Sending deliverable summary to group...');
      await this.sendGroupMessage(
        leader.id,
        'agent',
        leader.name,
        deliverable.summary,
        groupId,
        task.id
      );

      console.log('Emitting task update via WebSocket...');
      const updatedTask = CollaborationTaskModel.findById(task.id);
      if (updatedTask) {
        const io = (global as any).io;
        if (io) {
          io.to(`group:${groupId}`).emit('task:update', updatedTask);
        }
      }

      console.log('Task delivery completed successfully');
    } catch (error) {
      console.error('Error delivering task:', error);
    }
  }
}
