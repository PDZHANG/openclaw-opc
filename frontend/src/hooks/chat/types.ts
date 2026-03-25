import { ReactNode } from 'react';
import { Agent, Group, Human, Message, CollaborationTask } from '../../types';

export interface ChatHandler {
  type: 'agent' | 'group' | 'human';
  target: Agent | Group | Human;
  
  loadMessages(): Promise<Message[]>;
  sendMessage(content: string, mentions?: string[]): Promise<void>;
  markAsRead(): Promise<void>;
  deleteMessage?(messageId: string): Promise<void>;
  
  getHeaderInfo(): {
    name: string;
    subtitle: string;
    avatar: ReactNode;
  };
  getExtraComponents?(): ReactNode;
}

export interface ChatState {
  messages: Message[];
  tasks: CollaborationTask[];
  isLoading: boolean;
  isSending: boolean;
}

export interface ChatActions {
  sendMessage: (content: string, mentions?: string[]) => Promise<void>;
  loadMessages: () => Promise<void>;
  markAsRead: () => Promise<void>;
  deleteMessage?: (messageId: string) => Promise<void>;
}
