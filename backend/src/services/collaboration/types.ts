import type { Agent, Message, Group, CollaborationTask } from '../../types';

export interface ParsedMessage {
  mentions: string[];
  hasTaskIntent: boolean;
  taskTitle?: string;
  hasTaskCompletion?: boolean;
}

export interface CollaborationContext {
  messageData: {
    fromId: string;
    fromType: 'human' | 'agent';
    fromName: string;
    content: string;
    mentions?: string[];
    isTaskMode?: boolean;
  };
  groupId: string;
  messageId?: string;
  io?: any;
}

export interface GroupMemberInfo {
  id: string;
  name: string;
  role?: string;
  description?: string;
}
