import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebSocketOptions {
  onMessage?: (message: any) => void;
  onMessageUpdate?: (message: any) => void;
  onAgentOnline?: (data: { agentId: string }) => void;
  onAgentOffline?: (data: { agentId: string }) => void;
  onStatusUpdate?: (statuses: any[]) => void;
  onTypingIndicator?: (data: { userId?: string; agentId?: string; isTyping: boolean }) => void;
  onCollaborationStart?: (data: { taskId: string; agentIds: string[] }) => void;
  onCollaborationUpdate?: (data: { taskId: string; progress: number; status: string }) => void;
  onCollaborationComplete?: (data: { taskId: string; result: any }) => void;
  onTaskNew?: (task: any) => void;
  onTaskUpdate?: (task: any) => void;
  onTaskProposal?: (task: any) => void;
  onTaskConfirmed?: (task: any) => void;
  onTaskRejected?: (task: any) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const optionsRef = useRef(options);
  
  optionsRef.current = options;

  useEffect(() => {
    const socket = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    socket.on('message:new', (message) => {
      optionsRef.current.onMessage?.(message);
    });

    socket.on('message:update', (message) => {
      optionsRef.current.onMessageUpdate?.(message);
    });

    socket.on('message:updated', (data) => {
      console.log('Message updated:', data);
    });

    socket.on('agent:online', (data) => {
      optionsRef.current.onAgentOnline?.(data);
    });

    socket.on('agent:offline', (data) => {
      optionsRef.current.onAgentOffline?.(data);
    });

    socket.on('status:update', (statuses) => {
      optionsRef.current.onStatusUpdate?.(statuses);
    });

    socket.on('typing:indicator', (data) => {
      optionsRef.current.onTypingIndicator?.(data);
    });

    socket.on('collaboration:start', (data) => {
      optionsRef.current.onCollaborationStart?.(data);
    });

    socket.on('collaboration:update', (data) => {
      optionsRef.current.onCollaborationUpdate?.(data);
    });

    socket.on('collaboration:complete', (data) => {
      optionsRef.current.onCollaborationComplete?.(data);
    });

    socket.on('task:new', (task) => {
      optionsRef.current.onTaskNew?.(task);
    });

    socket.on('task:update', (task) => {
      optionsRef.current.onTaskUpdate?.(task);
    });

    socket.on('task:proposal', (task) => {
      optionsRef.current.onTaskProposal?.(task);
    });

    socket.on('task:confirmed', (task) => {
      optionsRef.current.onTaskConfirmed?.(task);
    });

    socket.on('task:rejected', (task) => {
      optionsRef.current.onTaskRejected?.(task);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const authenticate = useCallback((userId: string, userType: 'human' | 'agent') => {
    socketRef.current?.emit('authenticate', { userId, userType });
  }, []);

  const joinGroup = useCallback((groupId: string) => {
    socketRef.current?.emit('join:group', groupId);
  }, []);

  const leaveGroup = useCallback((groupId: string) => {
    socketRef.current?.emit('leave:group', groupId);
  }, []);

  const sendMessage = useCallback((data: {
    fromId: string;
    fromType: 'human' | 'agent';
    fromName: string;
    toType: 'direct' | 'group';
    toId: string;
    content: string;
    mentions?: string[];
    isTaskMode?: boolean;
  }) => {
    socketRef.current?.emit('message:send', data);
  }, []);

  const startTyping = useCallback((data: { groupId?: string; agentId?: string }) => {
    socketRef.current?.emit('typing:start', data);
  }, []);

  const stopTyping = useCallback((data: { groupId?: string; agentId?: string }) => {
    socketRef.current?.emit('typing:stop', data);
  }, []);

  const requestStatus = useCallback(() => {
    socketRef.current?.emit('status:request');
  }, []);

  const sendHeartbeat = useCallback((agentId: string, availabilityStatus?: string, currentTask?: any) => {
    socketRef.current?.emit('agent:heartbeat', { agentId, availabilityStatus, currentTask });
  }, []);

  const confirmTask = useCallback((taskId: string, groupId: string) => {
    socketRef.current?.emit('task:confirm', { taskId, groupId });
  }, []);

  const rejectTask = useCallback((taskId: string, groupId: string) => {
    socketRef.current?.emit('task:reject', { taskId, groupId });
  }, []);

  return {
    socket: socketRef.current,
    authenticate,
    joinGroup,
    leaveGroup,
    sendMessage,
    startTyping,
    stopTyping,
    requestStatus,
    sendHeartbeat,
    confirmTask,
    rejectTask
  };
}
