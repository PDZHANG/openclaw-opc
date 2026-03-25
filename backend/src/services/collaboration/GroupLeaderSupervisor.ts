import { GroupModel } from '../../models/Group';
import { Agent } from '../../models/Agent';
import { Message } from '../../models/Message';
import { CollaborationTaskModel } from '../../models/CollaborationTask';
import { AgentStatusModel } from '../../models/AgentStatus';
import { openclawService } from '../../services/openclawService';
import { MentionHandler } from './MentionHandler';
import type { Server } from 'socket.io';
import type { CollaborationTask } from '../../types';
import type { CollaborationOrchestrator } from './CollaborationOrchestrator';

interface SupervisorConfig {
  checkIntervalMinutes: number;
  taskStagnationMinutes: number;
}

const DEFAULT_CONFIG: SupervisorConfig = {
  checkIntervalMinutes: 5,
  taskStagnationMinutes: 30
};

interface GroupSupervisionState {
  enabled: boolean;
  nextCheckTime: Date;
  lastCheckTime?: Date;
}

export class GroupLeaderSupervisor {
  private io: Server | null = null;
  private config: SupervisorConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private groupStates: Map<string, GroupSupervisionState> = new Map();
  private onSupervisionMessage?: (
    leaderId: string,
    leaderName: string,
    content: string,
    groupId: string
  ) => Promise<void>;

  constructor(config: Partial<SupervisorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  setIo(io: Server) {
    this.io = io;
  }

  setOnSupervisionMessage(
    callback: (
      leaderId: string,
      leaderName: string,
      content: string,
      groupId: string
    ) => Promise<void>
  ) {
    this.onSupervisionMessage = callback;
  }

  start() {
    console.log('[GroupLeaderSupervisor] Starting supervisor service...');
    
    this.intervalId = setInterval(
      () => this.checkAllGroups(),
      30 * 1000
    );
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[GroupLeaderSupervisor] Supervisor service stopped');
    }
  }

  getGroupState(groupId: string): GroupSupervisionState {
    if (!this.groupStates.has(groupId)) {
      this.groupStates.set(groupId, {
        enabled: false,
        nextCheckTime: new Date()
      });
    }
    return this.groupStates.get(groupId)!;
  }

  enableSupervision(groupId: string): GroupSupervisionState {
    const state = this.getGroupState(groupId);
    state.enabled = true;
    state.nextCheckTime = new Date(Date.now() + 30 * 1000);
    console.log(`[GroupLeaderSupervisor] Supervision enabled for group ${groupId}`);
    return state;
  }

  disableSupervision(groupId: string): GroupSupervisionState {
    const state = this.getGroupState(groupId);
    state.enabled = false;
    console.log(`[GroupLeaderSupervisor] Supervision disabled for group ${groupId}`);
    return state;
  }

  toggleSupervision(groupId: string): GroupSupervisionState {
    const state = this.getGroupState(groupId);
    if (state.enabled) {
      return this.disableSupervision(groupId);
    } else {
      return this.enableSupervision(groupId);
    }
  }

  private checkAllGroups() {
    const now = new Date();
    
    for (const [groupId, state] of this.groupStates.entries()) {
      if (state.enabled && now >= state.nextCheckTime) {
        this.triggerSupervisionForGroup(groupId);
      }
    }
  }

  async triggerSupervisionForGroup(groupId: string): Promise<boolean> {
    console.log(`[GroupLeaderSupervisor] Triggering supervision for group: ${groupId}`);

    const group = GroupModel.findById(groupId);
    if (!group) {
      console.log(`[GroupLeaderSupervisor] Group not found: ${groupId}`);
      return false;
    }

    if (!group.leaderId) {
      console.log(`[GroupLeaderSupervisor] Group has no leader: ${group.name}`);
      return false;
    }

    const leader = Agent.findById(group.leaderId);
    if (!leader) {
      console.log(`[GroupLeaderSupervisor] Leader not found for group: ${group.name}`);
      return false;
    }

    const tasks = CollaborationTaskModel.findByGroup(group.id);
    const stagnantTasks = this.findStagnantTasks(tasks);
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');

    console.log(`[GroupLeaderSupervisor] Triggering supervision for ${group.name} (leader: ${leader.name})`);
    console.log(`[GroupLeaderSupervisor] Tasks - Stagnant: ${stagnantTasks.length}, Pending: ${pendingTasks.length}, InProgress: ${inProgressTasks.length}`);

    const state = this.getGroupState(groupId);
    state.lastCheckTime = new Date();
    state.nextCheckTime = new Date(Date.now() + this.config.checkIntervalMinutes * 60 * 1000);

    await this.triggerLeaderSupervision(group, leader, {
      stagnantTasks,
      pendingTasks,
      inProgressTasks,
      allTasks: tasks
    });

    return true;
  }

  private findStagnantTasks(tasks: CollaborationTask[]): CollaborationTask[] {
    const now = Date.now();
    const stagnationThreshold = this.config.taskStagnationMinutes * 60 * 1000;

    return tasks.filter(task => {
      if (task.status === 'completed' || task.status === 'failed') {
        return false;
      }

      const lastUpdate = new Date(task.updatedAt).getTime();
      const timeSinceUpdate = now - lastUpdate;

      return timeSinceUpdate > stagnationThreshold;
    });
  }

  private async triggerLeaderSupervision(
    group: any,
    leader: any,
    taskSummary: {
      stagnantTasks: CollaborationTask[];
      pendingTasks: CollaborationTask[];
      inProgressTasks: CollaborationTask[];
      allTasks: CollaborationTask[];
    }
  ) {
    if (!this.io) {
      console.log('[GroupLeaderSupervisor] IO not set, skipping supervision');
      return;
    }

    const supervisionPrompt = this.buildSupervisionPrompt(group, leader, taskSummary);

    try {
      console.log(`[GroupLeaderSupervisor] Triggering supervision for ${leader.name} in group ${group.name}`);

      AgentStatusModel.upsert(leader.id, {
        connectionStatus: 'online',
        availabilityStatus: 'busy',
        currentTask: {
          id: `supervision-${Date.now()}`,
          title: '监督项目进度',
          description: '正在检查和督促团队工作进度',
          startedAt: new Date(),
          progress: 0
        },
        lastActiveAt: new Date()
      });

      this.io.to(`group:${group.id}`).emit('typing:indicator', {
        agentId: leader.id,
        isTyping: true
      });

      const aiMessage = Message.create({
        type: 'text',
        fromId: leader.id,
        fromType: 'agent',
        fromName: leader.name,
        toType: 'group',
        toId: group.id,
        content: '',
        status: 'streaming'
      });

      this.io.to(`group:${group.id}`).emit('message:new', aiMessage);

      let finalContent = '';
      await openclawService.sendMessageStreaming(
        leader.id,
        supervisionPrompt,
        async (chunk) => {
          finalContent = chunk;
          Message.update(aiMessage.id, {
            content: chunk,
            updatedAt: new Date().toISOString()
          });
          this.io!.to(`group:${group.id}`).emit('message:update', {
            ...aiMessage,
            content: chunk,
            updatedAt: new Date().toISOString()
          });
        },
        'system'
      );

      Message.update(aiMessage.id, {
        content: finalContent,
        status: 'sent',
        updatedAt: new Date().toISOString()
      });

      this.io.to(`group:${group.id}`).emit('message:update', {
        ...aiMessage,
        content: finalContent,
        status: 'sent',
        updatedAt: new Date().toISOString()
      });

      AgentStatusModel.update(leader.id, {
        availabilityStatus: 'idle',
        currentTask: undefined,
        lastActiveAt: new Date()
      });

      this.io.to(`group:${group.id}`).emit('typing:indicator', {
        agentId: leader.id,
        isTyping: false
      });

      console.log(`[GroupLeaderSupervisor] Supervision message sent by ${leader.name}`);

      if (this.onSupervisionMessage) {
        try {
          await this.onSupervisionMessage(leader.id, leader.name, finalContent, group.id);
        } catch (error) {
          console.error('[GroupLeaderSupervisor] Error handling supervision message mentions:', error);
        }
      }
    } catch (error) {
      console.error('[GroupLeaderSupervisor] Error during leader supervision:', error);
      
      if (this.io) {
        this.io.to(`group:${group.id}`).emit('typing:indicator', {
          agentId: leader.id,
          isTyping: false
        });
      }
    }
  }

  private buildSupervisionPrompt(
    group: any,
    leader: any,
    taskSummary: {
      stagnantTasks: CollaborationTask[];
      pendingTasks: CollaborationTask[];
      inProgressTasks: CollaborationTask[];
      allTasks: CollaborationTask[];
    }
  ): string {
    const groupMembers = GroupModel.getMembers(group.id);
    const agentMembers = groupMembers
      .filter(m => m.userType === 'agent' && m.userId !== leader.id)
      .map(m => {
        const agent = Agent.findById(m.userId);
        return agent ? `@${agent.name} (${agent.role || 'AI 员工'})` : null;
      })
      .filter(Boolean);

    let prompt = `【主动监督】作为群组 "${group.name}" 的负责人，请你履行监督职责。\n\n`;

    if (taskSummary.allTasks.length === 0) {
      prompt += `📋 当前没有待处理的协作任务。\n\n`;
      prompt += `请你主动在群里发言：\n`;
      prompt += `1. 问候大家，询问团队是否有新的工作需要开始\n`;
      prompt += `2. 提醒大家可以随时 @你或其他团队成员开始新的协作\n`;
    } else {
      prompt += `📊 当前项目状态：\n\n`;
      
      if (taskSummary.pendingTasks.length > 0) {
        prompt += `⏳ 待开始任务 (${taskSummary.pendingTasks.length}个)：\n`;
        taskSummary.pendingTasks.forEach(task => {
          prompt += `- [${task.id.substring(0, 8)}] ${task.title}\n`;
          if (task.assignees && task.assignees.length > 0) {
            const assigneeNames = task.assignees.map(aid => {
              const agent = Agent.findById(aid);
              return agent ? `@${agent.name}` : aid;
            }).join(', ');
            prompt += `  负责人：${assigneeNames}\n`;
          }
        });
        prompt += `\n`;
      }

      if (taskSummary.inProgressTasks.length > 0) {
        prompt += `🔄 进行中任务 (${taskSummary.inProgressTasks.length}个)：\n`;
        taskSummary.inProgressTasks.forEach(task => {
          prompt += `- [${task.id.substring(0, 8)}] ${task.title} (进度: ${task.progress}%)\n`;
          if (task.assignees && task.assignees.length > 0) {
            const assigneeNames = task.assignees.map(aid => {
              const agent = Agent.findById(aid);
              return agent ? `@${agent.name}` : aid;
            }).join(', ');
            prompt += `  负责人：${assigneeNames}\n`;
          }
          prompt += `  最后更新：${new Date(task.updatedAt).toLocaleString('zh-CN')}\n`;
        });
        prompt += `\n`;
      }

      if (taskSummary.stagnantTasks.length > 0) {
        prompt += `⚠️ 停滞任务 (超过${this.config.taskStagnationMinutes}分钟未更新，${taskSummary.stagnantTasks.length}个)：\n`;
        taskSummary.stagnantTasks.forEach(task => {
          prompt += `- [${task.id.substring(0, 8)}] ${task.title}\n`;
          if (task.assignees && task.assignees.length > 0) {
            const assigneeNames = task.assignees.map(aid => {
              const agent = Agent.findById(aid);
              return agent ? `@${agent.name}` : aid;
            }).join(', ');
            prompt += `  负责人：${assigneeNames}\n`;
          }
          prompt += `  状态：${task.status}\n`;
          prompt += `  最后更新：${new Date(task.updatedAt).toLocaleString('zh-CN')}\n`;
        });
        prompt += `\n`;
      }

      prompt += `请你：\n`;
      prompt += `1. 总结当前项目整体进度\n`;
      prompt += `2. 对于停滞的任务，@相关负责人询问进度和遇到的问题\n`;
      prompt += `3. 对于待开始的任务，督促负责人尽快开始\n`;
      prompt += `4. 对于进行中的任务，了解当前状态和下一步计划\n`;
      prompt += `5. 协调解决可能存在的阻塞问题\n`;
    }

    if (agentMembers.length > 0) {
      prompt += `\n团队成员：${agentMembers.join('、')}\n`;
    }

    prompt += `\n请用友好且专业的语气与团队沟通。`;

    return prompt;
  }
}

export const groupLeaderSupervisor = new GroupLeaderSupervisor();
