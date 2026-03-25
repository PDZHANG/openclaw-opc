export interface Agent {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  workspacePath: string;
  role?: string;
  department?: string;
  tags?: string[];
  isActive: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Human {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'user';
  permissions?: string[];
  isActive: boolean;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: Human;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  createdBy: string;
  isPublic: boolean;
  leaderId?: string;
  createdAt: string;
  updatedAt: string;
  members?: GroupMember[];
}

export interface GroupMember {
  id?: number;
  groupId: string;
  userId: string;
  userType: 'human' | 'agent';
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface Message {
  id: string;
  type: 'text' | 'image' | 'file' | 'system';
  fromId: string;
  fromType: 'human' | 'agent' | 'system';
  fromName: string;
  toType: 'direct' | 'group';
  toId: string;
  content: string;
  fullContent?: string;
  isStreaming?: boolean;
  attachments?: any[];
  status: 'sent' | 'delivered' | 'read' | 'streaming';
  threadId?: string;
  collaborationType?: 'task_assignment' | 'task_update' | 'task_complete' | 'question';
  taskId?: string;
  mentions?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface AgentStatus {
  id?: number;
  agentId: string;
  connectionStatus: 'online' | 'offline' | 'connecting';
  availabilityStatus: 'idle' | 'busy' | 'away' | 'dnd';
  currentTask?: {
    id: string;
    title: string;
    progress: number;
    collaborators?: string[];
  };
  taskQueue?: any[];
  lastActiveAt?: string;
  lastMessageAt?: string;
  lastTaskCompletedAt?: string;
  uptime: number;
  messagesSent: number;
  messagesReceived: number;
  tasksCompleted: number;
  averageResponseTime: number;
  collaborationStats?: {
    tasksAssigned: number;
    tasksCompleted: number;
    activeCollaborations: number;
  };
  resourceUsage?: {
    cpu: number;
    memory: number;
    disk: number;
  };
  healthStatus: 'healthy' | 'warning' | 'error';
  healthChecks?: any[];
  tags?: string[];
  updatedAt: string;
}

export interface CollaborationTask {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending_confirmation' | 'pending' | 'in_progress' | 'completed' | 'failed' | 'rejected';
  type: 'independent' | 'collaborative';
  createdBy: string;
  groupId?: string;
  parentMessageId?: string;
  assignees?: string[];
  dependencies?: string[];
  progress: number;
  workspacePath?: string;
  createdAt: string;
  updatedAt: string;
  dueAt?: string;
  deliverableSummary?: string;
  deliverableGeneratedAt?: string;
  proposedAt?: string;
  confirmedAt?: string;
  rejectedAt?: string;
}

export interface TaskFile {
  path: string;
  name: string;
  size: number;
  type: 'file' | 'directory';
  modifiedAt: string;
}

export interface InteractionEvent {
  id: string;
  eventType: 'task_assignment' | 'task_update' | 'task_complete' | 'message' | 'status_change';
  fromAgentId?: string;
  toAgentId?: string;
  taskId?: string;
  content: string;
  metadata?: any;
  createdAt: string;
}

export interface DashboardData {
  totalAgents: number;
  online: number;
  offline: number;
  busy: number;
  idle: number;
  collaborating: number;
  agents: {
    id: string;
    name: string;
    role?: string;
    status: string;
    availability: string;
    currentTask?: any;
    messagesSent: number;
    messagesReceived: number;
    tasksCompleted: number;
    lastActiveAt?: string;
    currentActivity?: string;
  }[];
  collaborationTasks?: CollaborationTask[];
  interactionEvents?: InteractionEvent[];
}

export interface MessageRead {
  id: string;
  messageId: string;
  userId: string;
  userType: 'human' | 'agent';
  readAt: string;
}

export interface MessageWithReadStatus extends Message {
  readBy?: MessageRead[];
  unreadCount?: number;
}

export interface ConversationUnreadCount {
  conversationType: 'direct' | 'group';
  conversationId: string;
  unreadCount: number;
  lastReadMessageId?: string;
}

export type KnowledgeBaseType = 'aliyun' | 'lexiang' | 'dify' | 'custom';

export interface KnowledgeBase {
  id: string;
  name: string;
  type: KnowledgeBaseType;
  config: any;
  description?: string;
  isActive: boolean;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentKnowledgeBaseBinding {
  id?: number;
  agentId: string;
  knowledgeBaseId: string;
  priority: number;
  createdAt: string;
}

export interface Conversation {
  id: string;
  type: 'agent' | 'group' | 'human';
  name: string;
  avatar?: string;
  role?: string;
  email?: string;
  description?: string;
  lastMessage?: {
    content: string;
    timestamp: string;
    fromType: 'human' | 'agent' | 'system';
    fromName?: string;
  };
  unreadCount: number;
}
