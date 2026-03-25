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
  createdAt: Date;
  updatedAt: Date;
}

export interface Human {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  passwordHash?: string;
  role: 'admin' | 'user';
  permissions?: string[];
  isActive: boolean;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  createdBy: string;
  isPublic: boolean;
  leaderId?: string;
  createdAt: Date;
  updatedAt: Date;
  members?: GroupMember[];
}

export interface GroupMember {
  id?: string | number;
  groupId: string;
  userId: string;
  userType: 'human' | 'agent';
  role: 'admin' | 'member';
  joinedAt: Date;
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
  createdAt: Date;
  updatedAt?: Date | string;
}

export interface AgentStatus {
  id?: number;
  agentId: string;
  connectionStatus: 'online' | 'offline' | 'connecting';
  availabilityStatus: 'idle' | 'busy' | 'away' | 'dnd';
  currentTask?: any;
  taskQueue?: any[];
  lastActiveAt?: Date;
  lastMessageAt?: Date;
  lastTaskCompletedAt?: Date;
  uptime: number;
  messagesSent: number;
  messagesReceived: number;
  tasksCompleted: number;
  averageResponseTime: number;
  collaborationStats?: any;
  resourceUsage?: any;
  healthStatus: 'healthy' | 'warning' | 'error';
  healthChecks?: any[];
  tags?: string[];
  currentActivity?: string;
  updatedAt: Date;
}

export interface InteractionEvent {
  id: string;
  eventType: 'task_assignment' | 'task_update' | 'task_complete' | 'message' | 'status_change';
  fromAgentId?: string;
  toAgentId?: string;
  taskId?: string;
  content: string;
  metadata?: any;
  createdAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
  dueAt?: Date;
  deliverableSummary?: string;
  deliverableGeneratedAt?: Date;
  proposedAt?: Date;
  confirmedAt?: Date;
  rejectedAt?: Date;
}

export interface TaskFile {
  path: string;
  name: string;
  size: number;
  type: 'file' | 'directory';
  modifiedAt: Date;
}

export interface TaskDeliverable {
  taskId: string;
  files: TaskFile[];
  summary: string;
  zipPath?: string;
  generatedAt: Date;
}

export interface MessageRead {
  id: string;
  messageId: string;
  userId: string;
  userType: 'human' | 'agent';
  readAt: Date;
}

export interface MessageWithReadStatus extends Message {
  readBy?: MessageRead[];
  unreadCount?: number;
}

export type KnowledgeBaseType = 'aliyun' | 'lexiang' | 'dify' | 'custom';

export interface AliyunKnowledgeBaseConfig {
  type: 'aliyun';
  accessKeyId: string;
  accessKeySecret: string;
  regionId: string;
  instanceId: string;
}

export interface LexiangKnowledgeBaseConfig {
  type: 'lexiang';
  apiKey: string;
  baseUrl: string;
  workspaceId?: string;
}

export interface DifyKnowledgeBaseConfig {
  type: 'dify';
  apiKey: string;
  baseUrl: string;
  datasetId: string;
}

export interface CustomKnowledgeBaseConfig {
  type: 'custom';
  apiKey?: string;
  baseUrl?: string;
  [key: string]: any;
}

export type KnowledgeBaseConfig = 
  | AliyunKnowledgeBaseConfig 
  | LexiangKnowledgeBaseConfig 
  | DifyKnowledgeBaseConfig 
  | CustomKnowledgeBaseConfig;

export interface KnowledgeBase {
  id: string;
  name: string;
  type: KnowledgeBaseType;
  config: KnowledgeBaseConfig;
  description?: string;
  isActive: boolean;
  isGlobal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentKnowledgeBaseBinding {
  id?: number;
  agentId: string;
  knowledgeBaseId: string;
  priority: number;
  createdAt: Date;
}

export interface KnowledgeRetrievalResult {
  content: string;
  source: string;
  score: number;
  metadata?: any;
}
