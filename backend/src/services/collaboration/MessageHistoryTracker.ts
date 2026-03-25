import { Message } from '../../models/Message';
import type { Message as MessageType } from '../../types';

interface AgentMessageHistory {
  agentId: string;
  groupId: string;
  lastReceivedMessageId: string | null;
  lastReceivedAt: Date;
}

export class MessageHistoryTracker {
  private static instance: MessageHistoryTracker;
  private history: Map<string, AgentMessageHistory> = new Map();

  private constructor() {}

  static getInstance(): MessageHistoryTracker {
    if (!MessageHistoryTracker.instance) {
      MessageHistoryTracker.instance = new MessageHistoryTracker();
    }
    return MessageHistoryTracker.instance;
  }

  private getKey(agentId: string, groupId: string): string {
    return `${agentId}:${groupId}`;
  }

  recordAgentReceipt(agentId: string, groupId: string, messageId: string): void {
    const key = this.getKey(agentId, groupId);
    this.history.set(key, {
      agentId,
      groupId,
      lastReceivedMessageId: messageId,
      lastReceivedAt: new Date()
    });
  }

  getLastReceivedMessageId(agentId: string, groupId: string): string | null {
    const key = this.getKey(agentId, groupId);
    const record = this.history.get(key);
    return record?.lastReceivedMessageId || null;
  }

  getIncrementalMessages(agentId: string, groupId: string): MessageType[] {
    const lastMessageId = this.getLastReceivedMessageId(agentId, groupId);
    
    const allMessages = Message.findByConversation('group', groupId, undefined, undefined, 100);
    
    if (!lastMessageId) {
      return allMessages;
    }

    const lastMessageIndex = allMessages.findIndex(msg => msg.id === lastMessageId);
    
    if (lastMessageIndex === -1) {
      return allMessages;
    }

    return allMessages.slice(lastMessageIndex + 1);
  }

  hasReceivedMessage(agentId: string, groupId: string, messageId: string): boolean {
    const lastMessageId = this.getLastReceivedMessageId(agentId, groupId);
    if (!lastMessageId) return false;

    const allMessages = Message.findByConversation('group', groupId, undefined, undefined, 100);
    const lastMessageIndex = allMessages.findIndex(msg => msg.id === lastMessageId);
    const targetMessageIndex = allMessages.findIndex(msg => msg.id === messageId);

    if (lastMessageIndex === -1 || targetMessageIndex === -1) return false;

    return targetMessageIndex <= lastMessageIndex;
  }

  resetAgentHistory(agentId: string, groupId: string): void {
    const key = this.getKey(agentId, groupId);
    this.history.delete(key);
  }

  resetGroupHistory(groupId: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.history.keys()) {
      if (key.endsWith(`:${groupId}`)) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      this.history.delete(key);
    }
  }
}
