import { Agent } from '../../models/Agent';
import { Message } from '../../models/Message';
import { MessageReadModel } from '../../models/MessageRead';
import { GroupModel } from '../../models/Group';
import { AgentStatusModel } from '../../models/AgentStatus';
import { CollaborationTaskModel } from '../../models/CollaborationTask';
import { openclawService } from '../../services/openclawService';
import { MessageHistoryTracker } from './MessageHistoryTracker';
import type { CollaborationContext, GroupMemberInfo } from './types';
import type { Agent as AgentType } from '../../types';
import type { Message as MessageType } from '../../types';

interface AgentMessageRouterOptions {
  setAgentBusy: (agentId: string, taskTitle?: string) => void;
  setAgentIdle: (agentId: string) => void;
  onAgentReply?: (agentId: string, content: string, context: CollaborationContext) => Promise<void>;
}

export class AgentMessageRouter {
  private setAgentBusy: (agentId: string, taskTitle?: string) => void;
  private setAgentIdle: (agentId: string) => void;
  private onAgentReply?: (agentId: string, content: string, context: CollaborationContext) => Promise<void>;
  constructor(options: AgentMessageRouterOptions) {
    this.setAgentBusy = options.setAgentBusy;
    this.setAgentIdle = options.setAgentIdle;
    this.onAgentReply = options.onAgentReply;
  }
  async sendToAgents(
    agentIds: string[],
    context: CollaborationContext
  ): Promise<void> {
    for (const agentId of agentIds) {
      await this.sendToSingleAgent(agentId, context);
    }
  }

  private async sendToSingleAgent(
    agentId: string,
    context: CollaborationContext
  ): Promise<void> {
    const agent = Agent.findById(agentId);
    if (!agent) {
      console.log(`Agent not found for ID: ${agentId}`);
      return;
    }

    try {
      console.log(`Processing agent mention: ${agentId}`);

      if (context.messageId) {
        MessageReadModel.markAsRead(context.messageId, agentId, 'agent');
      }

      this.setAgentBusy(agentId, '回复消息');

      console.log(`Sending typing indicator for ${agent.name}`);
      const typingData = { agentId, isTyping: true };
      context.io?.to(`group:${context.groupId}`).emit('typing:indicator', typingData);

      const aiMessage = Message.create({
        type: 'text',
        fromId: agentId,
        fromType: 'agent',
        fromName: agent.name,
        toType: 'group',
        toId: context.groupId,
        content: '',
        status: 'streaming'
      });
      console.log(`AI streaming message created:`, aiMessage);

      context.io?.to(`group:${context.groupId}`).emit('message:new', aiMessage);

      console.log(`Sending message to OpenClaw for ${agent.name}`);

      const otherAgents = this.getOtherAgentsInGroup(context.groupId, agentId);
      console.log(`[AgentMessageRouter] Original message: "${context.messageData.content.substring(0, 100)}${context.messageData.content.length > 100 ? '...' : ''}"`);
      const messageToSend = this.buildMessageWithCollaborationHint(
        context.messageData.content,
        otherAgents,
        context
      );
      console.log(`[AgentMessageRouter] Message with hint: "${messageToSend.substring(0, 100)}${messageToSend.length > 100 ? '...' : ''}"`);

      const historyTracker = MessageHistoryTracker.getInstance();
      const incrementalMessages = historyTracker.getIncrementalMessages(agentId, context.groupId);
      console.log(`Got ${incrementalMessages.length} incremental messages for agent ${agentId}`);

      const chatHistory = incrementalMessages.map((msg: MessageType) => ({
        role: (msg.fromType === 'agent' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: `${msg.fromName}: ${msg.content}`
      }));

      let finalContent = '';
      await openclawService.sendMessageStreaming(
        agentId,
        messageToSend,
        async (chunk) => {
          finalContent = chunk;
          Message.update(aiMessage.id, {
            content: chunk,
            updatedAt: new Date().toISOString()
          });
          context.io?.to(`group:${context.groupId}`).emit('message:update', {
            ...aiMessage,
            content: chunk,
            updatedAt: new Date().toISOString()
          });
        },
        context.messageData.fromId,
        chatHistory
      );

      Message.update(aiMessage.id, {
        content: finalContent,
        status: 'sent',
        updatedAt: new Date().toISOString()
      });
      context.io?.to(`group:${context.groupId}`).emit('message:update', {
        ...aiMessage,
        content: finalContent,
        status: 'sent',
        updatedAt: new Date().toISOString()
      });

      AgentStatusModel.incrementMessagesReceived(agentId);
      AgentStatusModel.incrementMessagesSent(agentId);

      AgentStatusModel.update(agentId, {
        lastActiveAt: new Date(),
        lastMessageAt: new Date(),
        messagesSent: (AgentStatusModel.findByAgentId(agentId)?.messagesSent || 0) + 1,
        currentActivity: '回复群组消息'
      });

      context.io?.to(`group:${context.groupId}`).emit('typing:indicator', { agentId, isTyping: false });

      this.setAgentIdle(agentId);

      if (context.messageId) {
        historyTracker.recordAgentReceipt(agentId, context.groupId, context.messageId);
      } else if (incrementalMessages.length > 0) {
        const lastMessage = incrementalMessages[incrementalMessages.length - 1];
        historyTracker.recordAgentReceipt(agentId, context.groupId, lastMessage.id);
      }

      if (this.onAgentReply) {
        try {
          await this.onAgentReply(agentId, finalContent, context);
        } catch (error) {
          console.error('Error handling agent reply:', error);
        }
      }
    } catch (error) {
      console.error(`Error getting AI response from agent ${agentId}:`, error);
      this.handleAgentError(agent, context, error);
    }
  }

  private getOtherAgentsInGroup(groupId: string, excludeAgentId: string): GroupMemberInfo[] {
    const groupMembers = GroupModel.getMembers(groupId);
    return groupMembers
      .filter(m => m.userType === 'agent' && m.userId !== excludeAgentId)
      .map(m => {
        const a = Agent.findById(m.userId);
        if (a) {
          return {
            id: a.id,
            name: a.name,
            role: a.role || 'AI 员工',
            description: a.description || ''
          };
        }
        return null;
      })
      .filter(Boolean) as GroupMemberInfo[];
  }

  private buildMessageWithCollaborationHint(
    originalContent: string,
    otherAgents: GroupMemberInfo[],
    context: CollaborationContext
  ): string {
    let message = originalContent;
    
    const activeTasks = CollaborationTaskModel.findByGroup(context.groupId).filter(task => 
      task.status === 'pending' || task.status === 'in_progress'
    );
    
    if (activeTasks.length > 0) {
      const task = activeTasks[0];
      message += `\n\n[任务说明]`;
      message += `\n任务标题: ${task.title}`;
      message += `\n任务描述: ${task.description || '无'}`;
      message += `\n工作区路径: ${task.workspacePath || '已创建'}`;
      message += `\n\n[重要指令] 当你完成这个任务后，请在回复末尾添加 [TASK_COMPLETE] 标记，这样系统会自动将任务标记为完成并生成交付物。`;
      message += `\n例如: "任务已完成！[TASK_COMPLETE]"`;
    }

    if (otherAgents.length > 0) {
      const agentsInfo = otherAgents.map(a => {
        let info = `@${a.name} (${a.role})`;
        if (a.description) {
          info += ` - ${a.description}`;
        }
        return info;
      }).join('\n');

      message += `\n\n[协作提示] 群组中有以下 AI 员工可以协作：\n${agentsInfo}\n\n重要提示：只有在有活跃的协作任务时，才可以在回复中 @ 相应的 AI 员工来协作完成工作！如果没有活跃任务，请直接回复用户而不要 @ 其他 AI 员工。`;
    }

    return message;
  }

  private handleAgentError(
    agent: AgentType,
    context: CollaborationContext,
    error: unknown
  ): void {
    const errorMessage = Message.create({
      type: 'text',
      fromId: agent.id,
      fromType: 'agent',
      fromName: agent.name,
      toType: 'group',
      toId: context.groupId,
      content: `⚠️ 抱歉，暂时无法处理您的请求。\n\n错误信息：${(error as Error).message || 'API 服务暂时不可用，请稍后重试。'}`,
      status: 'sent'
    });
    context.io?.to(`group:${context.groupId}`).emit('message:new', errorMessage);

    context.io?.to(`group:${context.groupId}`).emit('typing:indicator', { agentId: agent.id, isTyping: false });
    this.setAgentIdle(agent.id);
  }

  private getGroupChatHistory(
    groupId: string
  ): Array<{ role: 'user' | 'assistant', content: string }> {
    const messages = Message.findByConversation('group', groupId, undefined, undefined, 30);
    
    return messages.map((msg: MessageType) => ({
      role: msg.fromType === 'agent' ? 'assistant' : 'user',
      content: `${msg.fromName}: ${msg.content}`
    }));
  }
}
