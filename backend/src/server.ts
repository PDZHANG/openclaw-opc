import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server, Socket } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { config } from './config';
import { initDatabase } from './config/database';
import agentRoutes from './routes/agentRoutes';
import messageRoutes from './routes/messageRoutes';
import groupRoutes from './routes/groupRoutes';
import statusRoutes from './routes/statusRoutes';
import collaborationRoutes from './routes/collaborationRoutes';

import authRoutes from './routes/authRoutes';
import knowledgeBaseRoutes from './routes/knowledgeBaseRoutes';
import { AgentStatusModel } from './models/AgentStatus';
import { Agent } from './models/Agent';
import { Message } from './models/Message';
import { MessageReadModel } from './models/MessageRead';
import { Human } from './models/Human';
import { CollaborationTaskModel } from './models/CollaborationTask';
import { openclawService } from './services/openclawService';
import { CollaborationOrchestrator, groupLeaderSupervisor, DeliverableService } from './services/collaboration';
import type { CollaborationTask } from './types';


const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: config.corsOrigin === '*' ? true : config.corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

(global as any).io = io;

app.use(cors({
  origin: config.corsOrigin === '*' ? true : config.corsOrigin,
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/collaborations', collaborationRoutes);
app.use('/api/knowledge-bases', knowledgeBaseRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/tasks/:taskId/files', (req, res) => {
  console.log('=== GET /api/tasks/:taskId/files ===');
  console.log('Task ID:', req.params.taskId);

  const task = CollaborationTaskModel.findById(req.params.taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (!task.workspacePath) {
    return res.json({ files: [] });
  }

  try {
    const files = DeliverableService.scanWorkspace(task.workspacePath);
    res.json({ files });
  } catch (error) {
    console.error('Error scanning workspace:', error);
    res.status(500).json({ error: 'Failed to scan workspace' });
  }
});

app.get('/api/tasks/:taskId/download', (req, res) => {
  console.log('=== GET /api/tasks/:taskId/download ===');
  console.log('Task ID:', req.params.taskId);

  const task = CollaborationTaskModel.findById(req.params.taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (!task.workspacePath) {
    return res.status(400).json({ error: 'Task has no workspace' });
  }

  const expectedZipPath = path.join(task.workspacePath, '..', `task-${task.id}-deliverable.zip`);

  if (fs.existsSync(expectedZipPath)) {
    console.log('Using existing zip:', expectedZipPath);
    res.download(expectedZipPath, `${task.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}-交付物.zip`);
    return;
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${task.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}-交付物.zip"`);

  const archive = require('archiver')('zip', { zlib: { level: 9 } });
  archive.pipe(res);
  archive.directory(task.workspacePath, false);
  archive.finalize();
});

interface ConnectedClient {
  socketId: string;
  userId?: string;
  userType?: 'human' | 'agent';
  rooms: string[];
}

const connectedClients = new Map<string, ConnectedClient>();

interface MessageQueueItem {
  data: {
    fromId: string;
    fromType: 'human' | 'agent';
    fromName: string;
    toType: 'direct' | 'group';
    toId: string;
    content: string;
    mentions?: string[];
    isTaskMode?: boolean;
    messageId: string;
  };
  socket: Socket;
}

const agentMessageQueues = new Map<string, MessageQueueItem[]>();
const agentProcessingStatus = new Map<string, boolean>();

const ACTIVITY_TIMEOUT = 5 * 60 * 1000;
const IDLE_TIMEOUT = 30 * 60 * 1000;

let collaborationOrchestrator: any = null;

setInterval(() => {
  const agents = Agent.findAll();
  const now = Date.now();
  
  for (const agent of agents) {
    const status = AgentStatusModel.findByAgentId(agent.id);
    if (status && status.lastActiveAt) {
      const lastActive = new Date(status.lastActiveAt).getTime();
      const timeSinceActive = now - lastActive;
      
      let updated = false;
      const updateData: any = {};
      
      if (timeSinceActive > IDLE_TIMEOUT && status.availabilityStatus === 'busy') {
        updateData.availabilityStatus = 'idle';
        updateData.currentTask = undefined;
        updated = true;
      }
      
      if (updated) {
        AgentStatusModel.update(agent.id, updateData);
        io.emit('status:update', { agentId: agent.id, ...updateData });
      }
    }
  }
}, ACTIVITY_TIMEOUT);

io.on('connection', (socket: Socket) => {
  console.log('Client connected:', socket.id);
  
  connectedClients.set(socket.id, {
    socketId: socket.id,
    rooms: []
  });

  const setAgentBusy = (agentId: string, taskTitle: string = '处理消息') => {
    AgentStatusModel.upsert(agentId, {
      connectionStatus: 'online',
      availabilityStatus: 'busy',
      currentTask: {
        id: `task-${Date.now()}`,
        title: taskTitle,
        description: '正在处理用户消息',
        startedAt: new Date(),
        progress: 0
      },
      lastActiveAt: new Date()
    });
    io.emit('status:update', { agentId, status: 'busy' });
  };

  const setAgentIdle = (agentId: string) => {
    AgentStatusModel.upsert(agentId, {
      connectionStatus: 'online',
      availabilityStatus: 'idle',
      currentTask: undefined,
      lastActiveAt: new Date()
    });
    io.emit('status:update', { agentId, status: 'idle' });
  };

  const processAgentMessageQueue = async (agentId: string) => {
    if (agentProcessingStatus.get(agentId)) {
      return;
    }

    const queue = agentMessageQueues.get(agentId) || [];
    if (queue.length === 0) {
      return;
    }

    agentProcessingStatus.set(agentId, true);
    const queueItem = queue.shift()!;
    agentMessageQueues.set(agentId, queue);

    try {
      const { data, socket } = queueItem;
      const agent = Agent.findById(data.toId);
      if (agent) {
        MessageReadModel.markAsRead(data.messageId, data.toId, 'agent');
        
        setAgentBusy(data.toId, '回复消息');
        
        io.emit('typing:indicator', { agentId: data.toId, isTyping: true });
        
        const aiMessage = Message.create({
          type: 'text',
          fromId: data.toId,
          fromType: 'agent',
          fromName: agent.name,
          toType: 'direct',
          toId: data.fromId,
          content: '',
          status: 'streaming'
        });
        
        io.emit('message:new', aiMessage);
        
        let finalContent = '';
        await openclawService.sendMessageStreaming(data.toId, data.content, async (chunk) => {
          finalContent = chunk;
          Message.update(aiMessage.id, {
            content: chunk,
            updatedAt: new Date().toISOString()
          });
          io.emit('message:update', {
            ...aiMessage,
            content: chunk,
            updatedAt: new Date().toISOString()
          });
        }, data.fromId);
        
        Message.update(aiMessage.id, {
          content: finalContent,
          status: 'sent',
          updatedAt: new Date().toISOString()
        });
        io.emit('message:update', {
          ...aiMessage,
          content: finalContent,
          status: 'sent',
          updatedAt: new Date().toISOString()
        });
        
        AgentStatusModel.incrementMessagesReceived(data.toId);
        AgentStatusModel.incrementMessagesSent(data.toId);
        
        AgentStatusModel.update(data.toId, {
          lastActiveAt: new Date(),
          lastMessageAt: new Date(),
          messagesSent: (AgentStatusModel.findByAgentId(data.toId)?.messagesSent || 0) + 1,
          currentActivity: '回复用户消息'
        });
        
        io.emit('typing:indicator', { agentId: data.toId, isTyping: false });
        
        setAgentIdle(data.toId);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      io.emit('typing:indicator', { agentId, isTyping: false });
      setAgentIdle(agentId);
    } finally {
      agentProcessingStatus.set(agentId, false);
      processAgentMessageQueue(agentId);
    }
  };

  const sendGroupMessage = async (
    fromId: string,
    fromType: 'human' | 'agent' | 'system',
    fromName: string,
    content: string,
    groupId: string,
    taskId?: string
  ) => {
    const message = Message.create({
      type: 'text',
      fromId,
      fromType,
      fromName,
      toType: 'group',
      toId: groupId,
      content,
      status: 'sent',
      taskId
    });
    io.to(`group:${groupId}`).emit('message:new', message);
  };

  collaborationOrchestrator = new CollaborationOrchestrator({
    setAgentBusy,
    setAgentIdle,
    sendGroupMessage
  });

  socket.on('authenticate', (data: { userId: string; userType: 'human' | 'agent' }) => {
    const client = connectedClients.get(socket.id);
    if (client) {
      client.userId = data.userId;
      client.userType = data.userType;
      
      if (data.userType === 'agent') {
        AgentStatusModel.upsert(data.userId, {
          connectionStatus: 'online',
          lastActiveAt: new Date()
        });
        io.emit('agent:online', { agentId: data.userId });
      }
    }
  });

  socket.on('join:group', (groupId: string) => {
    socket.join(`group:${groupId}`);
    const client = connectedClients.get(socket.id);
    if (client && !client.rooms.includes(`group:${groupId}`)) {
      client.rooms.push(`group:${groupId}`);
    }
    socket.to(`group:${groupId}`).emit('user:joined', { socketId: socket.id });
  });

  socket.on('leave:group', (groupId: string) => {
    socket.leave(`group:${groupId}`);
    const client = connectedClients.get(socket.id);
    if (client) {
      client.rooms = client.rooms.filter(r => r !== `group:${groupId}`);
    }
  });

  socket.on('message:send', async (data: {
    fromId: string;
    fromType: 'human' | 'agent';
    fromName: string;
    toType: 'direct' | 'group';
    toId: string;
    content: string;
    mentions?: string[];
    isTaskMode?: boolean;
  }) => {
    console.log('=== Message received ===');
    console.log('Data:', JSON.stringify(data, null, 2));
    
    const message = Message.create({
      type: 'text',
      fromId: data.fromId,
      fromType: data.fromType,
      fromName: data.fromName,
      toType: data.toType,
      toId: data.toId,
      content: data.content,
      status: 'sent',
      mentions: data.mentions
    });
    console.log('User message created:', message);
    
    if (data.fromType === 'agent') {
      AgentStatusModel.upsert(data.fromId, {
        lastActiveAt: new Date(),
        lastMessageAt: new Date(),
        messagesSent: (AgentStatusModel.findByAgentId(data.fromId)?.messagesSent || 0) + 1,
        currentActivity: '发送消息'
      });
    }
    
    if (data.toType === 'direct' && data.fromType === 'human') {
      const agent = Agent.findById(data.toId);
      if (agent) {
        AgentStatusModel.upsert(data.toId, {
          lastActiveAt: new Date(),
          lastMessageAt: new Date(),
          messagesReceived: (AgentStatusModel.findByAgentId(data.toId)?.messagesReceived || 0) + 1,
          currentActivity: '接收用户消息'
        });
      }
    }

    if (data.toType === 'group') {
      io.to(`group:${data.toId}`).emit('message:new', message);
      
      await collaborationOrchestrator.handleGroupMessage({
        messageData: {
          fromId: data.fromId,
          fromType: data.fromType,
          fromName: data.fromName,
          content: data.content,
          mentions: data.mentions,
          isTaskMode: data.isTaskMode
        },
        groupId: data.toId,
        messageId: message.id,
        io
      });
    } else {
      io.emit('message:new', message);
      
      const isToHuman = Human.findById(data.toId) !== null;
      
      if (isToHuman) {
        console.log('Sending message to human user:', data.toId);
        MessageReadModel.markAsRead(message.id, data.toId, 'human');
        
        for (const [socketId, client] of connectedClients.entries()) {
          if (client.userId === data.toId && client.userType === 'human') {
            io.to(socketId).emit('message:new', message);
          }
        }
      } else if (data.toId && data.fromType === 'human') {
        const queueItem: MessageQueueItem = {
          data: {
            ...data,
            messageId: message.id
          },
          socket
        };

        const currentQueue = agentMessageQueues.get(data.toId) || [];
        currentQueue.push(queueItem);
        agentMessageQueues.set(data.toId, currentQueue);

        processAgentMessageQueue(data.toId);
      }
    }
  });

  socket.on('message:read', (data: { messageId: string }) => {
    Message.updateStatus(data.messageId, 'read');
    io.emit('message:updated', { messageId: data.messageId, status: 'read' });
  });

  socket.on('typing:start', (data: { groupId?: string; agentId?: string }) => {
    if (data.groupId) {
      socket.to(`group:${data.groupId}`).emit('typing:indicator', {
        userId: connectedClients.get(socket.id)?.userId,
        isTyping: true
      });
    } else {
      io.emit('typing:indicator', {
        agentId: data.agentId,
        isTyping: true
      });
    }
  });

  socket.on('typing:stop', (data: { groupId?: string; agentId?: string }) => {
    if (data.groupId) {
      socket.to(`group:${data.groupId}`).emit('typing:indicator', {
        userId: connectedClients.get(socket.id)?.userId,
        isTyping: false
      });
    } else {
      io.emit('typing:indicator', {
        agentId: data.agentId,
        isTyping: false
      });
    }
  });

  socket.on('status:request', () => {
    const statuses = AgentStatusModel.findAll();
    socket.emit('status:update', statuses);
  });

  socket.on('agent:heartbeat', (data: { agentId: string; availabilityStatus?: string; currentTask?: any }) => {
    AgentStatusModel.upsert(data.agentId, {
      connectionStatus: 'online',
      availabilityStatus: data.availabilityStatus as any,
      currentTask: data.currentTask,
      lastActiveAt: new Date()
    });
  });

  socket.on('collaboration:start', (data: { taskId: string; agentIds: string[] }) => {
    io.emit('collaboration:start', data);
  });

  socket.on('collaboration:update', (data: { taskId: string; progress: number; status: string }) => {
    io.emit('collaboration:update', data);
  });

  socket.on('collaboration:complete', (data: { taskId: string; result: any }) => {
    io.emit('collaboration:complete', data);
  });

  socket.on('task:update', async (data: { taskId: string; progress?: number; status?: string }) => {
    console.log('=== task:update received ===');
    console.log('Data:', data);

    const task = CollaborationTaskModel.findById(data.taskId);
    if (!task) {
      console.log('Task not found');
      return;
    }

    if (data.progress !== undefined) {
      CollaborationTaskModel.updateProgress(data.taskId, data.progress);
    }
    if (data.status) {
      CollaborationTaskModel.updateStatus(data.taskId, data.status as any);
    }

    const updatedTask = CollaborationTaskModel.findById(data.taskId);
    if (updatedTask) {
      io.emit('task:update', updatedTask);

      if (updatedTask.groupId && collaborationOrchestrator) {
        await collaborationOrchestrator.checkAndDeliverTask(updatedTask, updatedTask.groupId);
      }
    }
  });

  socket.on('task:confirm', async (data: { taskId: string; groupId: string }) => {
    console.log('=== task:confirm received ===');
    console.log('Data:', data);

    const client = connectedClients.get(socket.id);
    if (!client?.userId || client.userType !== 'human') {
      console.log('Only human users can confirm tasks');
      return;
    }

    if (collaborationOrchestrator) {
      await collaborationOrchestrator.handleTaskConfirm(data.taskId, {
        messageData: {
          fromId: client.userId,
          fromType: 'human',
          fromName: 'User',
          content: ''
        },
        groupId: data.groupId,
        io
      });
    }
  });

  socket.on('task:reject', async (data: { taskId: string; groupId: string }) => {
    console.log('=== task:reject received ===');
    console.log('Data:', data);

    const client = connectedClients.get(socket.id);
    if (!client?.userId || client.userType !== 'human') {
      console.log('Only human users can reject tasks');
      return;
    }

    if (collaborationOrchestrator) {
      collaborationOrchestrator.handleTaskReject(data.taskId, {
        messageData: {
          fromId: client.userId,
          fromType: 'human',
          fromName: 'User',
          content: ''
        },
        groupId: data.groupId,
        io
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    const client = connectedClients.get(socket.id);
    if (client && client.userType === 'agent' && client.userId) {
      AgentStatusModel.update(client.userId, { connectionStatus: 'offline' });
      io.emit('agent:offline', { agentId: client.userId });
    }
    
    connectedClients.delete(socket.id);
  });
});

async function startServer() {
  try {
    console.log('Initializing database...');
    await initDatabase();
    console.log('Database initialized.');
    
    server.listen(config.port, '0.0.0.0', () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Health check: http://localhost:${config.port}/api/health`);
      console.log(`WebSocket: ws://localhost:${config.port}`);
      
      groupLeaderSupervisor.setIo(io);
      groupLeaderSupervisor.setOnSupervisionMessage(async (
        leaderId: string,
        leaderName: string,
        content: string,
        groupId: string
      ) => {
        console.log('=== Supervision message received, checking for mentions ===');
        if (collaborationOrchestrator) {
          await collaborationOrchestrator.handleGroupMessage({
            messageData: {
              fromId: leaderId,
              fromType: 'agent',
              fromName: leaderName,
              content: content
            },
            groupId: groupId,
            io: io
          });
        }
      });
      groupLeaderSupervisor.start();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { io };
