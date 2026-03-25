import { ReactNode } from 'react';
import { Agent, Group, Human, Message } from '../../types';
import {
  fetchMessagesWithReadStatus,
  markConversationAsRead,
  deleteMessage,
  fetchCollaborationTasks
} from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export interface ChatHandler {
  type: 'agent' | 'group' | 'human';
  target: Agent | Group | Human;
  
  loadMessages(): Promise<Message[]>;
  sendMessage: (content: string, mentions?: string[]) => any;
  markAsRead(): Promise<void>;
  deleteMessage?: (messageId: string) => Promise<void>;
  
  getHeaderInfo(): {
    name: string;
    subtitle: string;
    avatar: ReactNode;
  };
  getExtraComponents?(): ReactNode;
}

export function createAgentChatHandler(
  agent: Agent,
  sendMessageFn: (content: string) => void
): ChatHandler {
  const user = useAuthStore.getState().user;
  
  return {
    type: 'agent',
    target: agent,
    
    async loadMessages() {
      return await fetchMessagesWithReadStatus('direct', agent.id, 50, 'user', 'human');
    },
    
    sendMessage: sendMessageFn,
    
    async markAsRead() {
      await markConversationAsRead('direct', agent.id, 'user', 'human');
    },
    
    async deleteMessage(messageId: string) {
      await deleteMessage(messageId);
    },
    
    getHeaderInfo() {
      return {
        name: agent.name,
        subtitle: '在线',
        avatar: (
          <div className="w-9 h-9 bg-gradient-to-br from-purple-400 to-blue-500 rounded-lg flex items-center justify-center text-white font-medium">
            {agent.name.charAt(0)}
          </div>
        )
      };
    }
  };
}

export function createGroupChatHandler(
  group: Group,
  sendMessageFn: (content: string, mentions?: string[]) => void
): ChatHandler {
  const user = useAuthStore.getState().user;
  
  return {
    type: 'group',
    target: group,
    
    async loadMessages() {
      return await fetchMessagesWithReadStatus('group', group.id, 50, 'user', 'human');
    },
    
    sendMessage: sendMessageFn,
    
    async markAsRead() {
      await markConversationAsRead('group', group.id, 'user', 'human');
    },
    
    async deleteMessage(messageId: string) {
      await deleteMessage(messageId);
    },
    
    getHeaderInfo() {
      return {
        name: group.name,
        subtitle: '群组',
        avatar: null
      };
    }
  };
}

export function createHumanChatHandler(
  human: Human,
  sendMessageFn: (content: string) => void
): ChatHandler {
  const user = useAuthStore.getState().user;
  
  return {
    type: 'human',
    target: human,
    
    async loadMessages() {
      return await fetchMessagesWithReadStatus('direct', human.id, 50, user?.id, 'human');
    },
    
    sendMessage: sendMessageFn,
    
    async markAsRead() {
      await markConversationAsRead('direct', human.id, user?.id || '', 'human');
    },
    
    async deleteMessage(messageId: string) {
      await deleteMessage(messageId);
    },
    
    getHeaderInfo() {
      return {
        name: human.name,
        subtitle: human.email || '用户',
        avatar: human.avatar ? (
          <img
            src={human.avatar}
            alt={human.name}
            className="w-9 h-9 rounded-lg object-cover"
          />
        ) : (
          <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center text-white font-medium">
            {human.name.charAt(0)}
          </div>
        )
      };
    }
  };
}

export function createChatHandler(
  type: 'agent' | 'group' | 'human',
  target: Agent | Group | Human,
  sendMessageFn: (content: string, mentions?: string[]) => void
): ChatHandler {
  switch (type) {
    case 'agent':
      return createAgentChatHandler(target as Agent, sendMessageFn);
    case 'group':
      return createGroupChatHandler(target as Group, sendMessageFn);
    case 'human':
      return createHumanChatHandler(target as Human, sendMessageFn);
    default:
      throw new Error(`Unsupported chat type: ${type}`);
  }
}
