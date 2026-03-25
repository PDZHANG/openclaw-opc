import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { Message } from '../types';

interface UseNotificationOptions {
  onNewMessage?: (message: Message) => void;
  onRead?: (messageId: string) => void;
}

interface UnreadCount {
  [conversationId: string]: {
    type: 'agent' | 'group' | 'human';
    count: number;
  };
}

export function useNotification(options: UseNotificationOptions = {}) {
  const { user } = useAuthStore();
  const [unreadCounts, setUnreadCounts] = useState<UnreadCount>({});

  const getUnreadCount = useCallback((conversationId: string, type: 'agent' | 'group' | 'human') => {
    return unreadCounts[`${type}-${conversationId}`]?.count || 0;
  }, [unreadCounts]);

  const incrementUnreadCount = useCallback((conversationId: string, type: 'agent' | 'group' | 'human') => {
    setUnreadCounts(prev => ({
      ...prev,
      [`${type}-${conversationId}`]: {
        type,
        count: (prev[`${type}-${conversationId}`]?.count || 0) + 1
      }
    }));
  }, []);

  const clearUnreadCount = useCallback((conversationId: string, type: 'agent' | 'group' | 'human') => {
    setUnreadCounts(prev => {
      const newCounts = { ...prev };
      delete newCounts[`${type}-${conversationId}`];
      return newCounts;
    });
  }, []);

  const handleNewMessage = useCallback((message: Message) => {
    if (!user || !message) return;

    const isFromMe = message.fromId === user.id;
    
    if (!isFromMe) {
      let conversationId: string;
      let type: 'agent' | 'group' | 'human';
      
      if (message.toType === 'group') {
        conversationId = message.toId;
        type = 'group';
      } else {
        conversationId = message.fromId;
        type = message.fromType as 'agent' | 'human';
      }
      
      incrementUnreadCount(conversationId, type);
      options.onNewMessage?.(message);
    }
  }, [user, incrementUnreadCount, options.onNewMessage]);

  return {
    unreadCounts,
    getUnreadCount,
    incrementUnreadCount,
    clearUnreadCount,
    handleNewMessage
  };
}
