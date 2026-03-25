# 多智能体AI工程 - 技术设计文档

## 1. 系统架构

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户层                                    │
├─────────────────────────────────────────────────────────────────┤
│  Web界面  │  REST API  │  WebSocket  │  (未来扩展渠道)        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      应用服务层 (后端)                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  AI员工管理  │  │  消息路由层   │  │  状态监控服务 │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  群组管理    │  │  协作引擎     │  │  WebSocket服务│        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│   数据库         │ │  OpenClaw网关    │ │   文件系统       │
│  (SQLite)        │ │  (多工作区)      │ │  (工作区存储)    │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

### 1.2 技术栈

**后端：**
- Node.js + TypeScript
- Express.js (API框架)
- Socket.io (WebSocket)
- SQLite (数据库)
- better-sqlite3 / Prisma (ORM)

**前端：**
- React + TypeScript
- Tailwind CSS (样式)
- Zustand (状态管理)
- React Query (数据获取)
- Socket.io-client (WebSocket客户端)
- Monaco Editor (代码编辑器 - 用于编辑SOUL.md)

**OpenClaw集成：**
- OpenClaw原生网关
- 通过子进程/API调用管理工作区

---

## 2. AI员工自主协作设计

### 2.1 协作场景示例

```
场景：用户在群里@产品经理提需求

用户: @产品经理 我们需要做一个登录功能
     ↓
产品经理 (分析需求):
  - 理解需求
  - 分解任务
  - 识别需要协作的角色
     ↓
产品经理 @设计师: 请设计登录界面
产品经理 @开发工程师: 请实现登录功能
     ↓
设计师: 开始设计...
开发工程师: 开始开发...
     ↓
设计师完成 → @产品经理: 设计完成
开发工程师完成 → @产品经理: 开发完成
     ↓
产品经理整合 → @用户: 功能已完成
```

### 2.2 协作引擎架构

```
┌─────────────────────────────────────────────────────────────┐
│                     协作引擎 (Collaboration Engine)          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  消息解析器 (Message Parser)                        │   │
│  │  - 检测@提及                                         │   │
│  │  - 识别消息意图                                      │   │
│  │  - 提取任务信息                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ↓                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  协作决策器 (Collaboration Decider)                │   │
│  │  - 判断是否需要协作                                  │   │
│  │  - 确定协作对象                                      │   │
│  │  - 生成协作指令                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ↓                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  任务管理器 (Task Manager)                          │   │
│  │  - 创建协作任务                                      │   │
│  │  - 跟踪任务进度                                      │   │
│  │  - 处理任务依赖                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ↓                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  消息路由器 (Message Router)                        │   │
│  │  - 发送协作消息                                      │   │
│  │  - 转发给目标Agent                                   │   │
│  │  - 触发OpenClaw处理                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 SOUL.md协作配置模板

**产品经理 SOUL.md 中的协作配置：**
```markdown
## 协作能力

### 可协作的角色
- 设计师：负责UI/UX设计
- 开发工程师：负责代码实现
- 测试工程师：负责质量保证

### 协作流程
1. 收到需求后，分析需要哪些角色参与
2. @相关角色分配任务
3. 跟踪各角色的进度
4. 整合结果并反馈给用户

### 协作触发规则
- 当涉及界面设计时，@设计师
- 当涉及代码实现时，@开发工程师
- 当需要验证时，@测试工程师
```

### 2.4 协作消息数据结构

```typescript
interface CollaborationMessage {
  id: string;
  parentMessageId?: string; // 父消息ID（用于对话链）
  
  // 协作元数据
  collaboration: {
    type: 'task_assignment' | 'task_update' | 'task_complete' | 'question' | 'coordination';
    taskId?: string;
    assignees?: string[]; // 被@的Agent ID列表
    dependencies?: string[]; // 依赖的任务ID
  };
  
  // 标准消息字段
  from: {
    id: string;
    type: 'human' | 'agent';
    name: string;
  };
  to: {
    type: 'direct' | 'group';
    id: string;
  };
  content: string;
  timestamp: Date;
}
```

### 2.5 协作工作流

```typescript
async function handleCollaboration(message: Message, group: Group) {
  // 1. 解析消息，提取@提及和任务信息
  const parsed = parseMessage(message.content, group.members);
  
  // 2. 检查是否需要协作
  if (!needsCollaboration(parsed)) {
    return;
  }
  
  // 3. 确定协作对象
  const targetAgents = identifyCollaborators(parsed, group);
  
  // 4. 创建协作任务
  const task = await createCollaborationTask({
    from: message.from.id,
    to: targetAgents,
    content: message.content,
    groupId: group.id,
    parentMessageId: message.id
  });
  
  // 5. 生成协作消息
  for (const agentId of targetAgents) {
    const collabMessage = generateCollaborationMessage(
      message,
      agentId,
      task.id
    );
    
    // 6. 通过OpenClaw路由发送给目标Agent
    await routeToOpenClaw(agentId, collabMessage);
    
    // 7. 广播到群里（可选）
    await broadcastToGroup(group.id, collabMessage);
  }
  
  // 8. 更新任务状态
  await updateAgentStatus(message.from.id, {
    availabilityStatus: 'busy',
    currentTask: {
      id: task.id,
      title: parsed.taskTitle
    }
  });
}
```

---

## 3. AI员工管理设计

### 3.1 OpenClaw多工作区配置

**openclaw.json 配置示例：**
```json
{
  "agent": {
    "workspace": "~/.openclaw/workspace"
  },
  "agents": {
    "main": {
      "workspace": "~/.openclaw/workspaces/main"
    },
    "product-manager": {
      "workspace": "~/.openclaw/workspaces/product-manager"
    },
    "developer": {
      "workspace": "~/.openclaw/workspaces/developer"
    }
  },
  "agentToAgent": {
    "enabled": true,
    "allowedAgents": ["*"]
  }
}
```

### 3.2 工作区目录结构

```
~/.openclaw/workspaces/
├── {agent-id}/
│   ├── SOUL.md
│   ├── TOOLS.md
│   ├── BOOTSTRAP.md
│   ├── AGENTS.md
│   ├── USER.md (可选)
│   └── skills/
└── ...
```

### 3.3 AI员工创建流程

```
1. 用户在Web界面填写员工基本信息
   ↓
2. 后端创建工作区目录
   ↓
3. 后端生成默认配置文件模板（包含协作配置）
   ↓
4. 用户在Web界面编辑SOUL.md等配置
   ↓
5. 后端将配置写入文件
   ↓
6. 后端更新openclaw.json配置
   ↓
7. 重启/重载OpenClaw网关
   ↓
8. AI员工创建完成
```

---

## 4. 消息路由层设计

### 4.1 消息数据结构

```typescript
interface Message {
  id: string;
  type: 'text' | 'image' | 'file' | 'system';
  from: {
    id: string;
    type: 'human' | 'agent';
    name: string;
    avatar?: string;
  };
  to: {
    type: 'direct' | 'group';
    id: string;
  };
  content: string;
  attachments?: Attachment[];
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
  threadId?: string;
  
  // 协作相关字段
  collaboration?: {
    type: 'task_assignment' | 'task_update' | 'task_complete' | 'question';
    taskId?: string;
    mentions?: string[]; // @提及的用户ID列表
  };
  
  metadata?: Record<string, any>;
}

interface Attachment {
  id: string;
  type: 'image' | 'document' | 'audio';
  name: string;
  url: string;
  size: number;
}
```

### 4.2 消息路由流程

```
发送者 (Web/API)
    │
    ▼
┌─────────────────┐
│  消息验证服务   │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  权限检查       │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  协作引擎检查   │ ← 新增：检查是否需要协作
└─────────────────┘
    │
    ├───────────────┬───────────────┐
    ▼               ▼               ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ 单聊消息 │  │ 群组消息 │  │ 系统消息 │
└──────────┘  └──────────┘  └──────────┘
    │               │               │
    └───────────────┼───────────────┘
                    ▼
         ┌─────────────────┐
         │  消息持久化     │
         └─────────────────┘
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ WebSocket│  │ OpenClaw │  │ 状态更新  │
│  推送    │  │  路由    │  │          │
└──────────┘  └──────────┘  └──────────┘
```

### 4.3 群组实现

**群组数据结构：**
```typescript
interface Group {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  members: GroupMember[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
}

interface GroupMember {
  userId: string;
  userType: 'human' | 'agent';
  role: 'admin' | 'member';
  joinedAt: Date;
}
```

**群组消息广播：**
```typescript
async function broadcastToGroup(groupId: string, message: Message) {
  const group = await Group.findById(groupId);
  const deliveryPromises = group.members.map(member => {
    return deliverMessage(member.userId, message);
  });
  await Promise.all(deliveryPromises);
}
```

---

## 5. 状态监控设计

### 5.1 详细状态指标

```typescript
interface AgentStatus {
  agentId: string;
  
  // 基础状态
  connectionStatus: 'online' | 'offline' | 'connecting';
  availabilityStatus: 'idle' | 'busy' | 'away' | 'dnd';
  
  // 任务信息
  currentTask?: {
    id: string;
    title: string;
    description: string;
    startedAt: Date;
    estimatedDuration?: number;
    progress: number; // 0-100
    collaborationType?: 'task_assignment' | 'coordination';
    collaborators?: string[]; // 协作的Agent ID
  };
  taskQueue: Task[];
  
  // 活动信息
  lastActiveAt: Date;
  lastMessageAt?: Date;
  lastTaskCompletedAt?: Date;
  
  // 性能指标
  uptime: number; // 毫秒
  messagesSent: number;
  messagesReceived: number;
  tasksCompleted: number;
  averageResponseTime: number; // 毫秒
  
  // 协作统计
  collaborationStats: {
    tasksAssigned: number;
    tasksCompleted: number;
    activeCollaborations: number;
  };
  
  // 资源使用
  resourceUsage: {
    cpu: number; // 0-100
    memory: number; // 0-100
    disk: number; // 0-100
  };
  
  // 健康状态
  healthStatus: 'healthy' | 'warning' | 'error';
  healthChecks: {
    name: string;
    status: 'pass' | 'fail' | 'warn';
    lastChecked: Date;
    message?: string;
  }[];
  
  // 自定义标签
  tags: string[];
  
  updatedAt: Date;
}

interface Task {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  type: 'independent' | 'collaborative';
  collaborators?: string[];
  createdAt: Date;
  dueDate?: Date;
}
```

### 5.2 状态更新机制

**心跳机制：**
```typescript
// Agent每30秒发送一次心跳
const HEARTBEAT_INTERVAL = 30000;

// 如果超过90秒没收到心跳，标记为离线
const OFFLINE_THRESHOLD = 90000;
```

**协作状态更新：**
```typescript
// 当Agent参与协作时自动更新状态
async function updateCollaborationStatus(agentId: string, task: Task) {
  await AgentStatus.update(agentId, {
    availabilityStatus: 'busy',
    currentTask: {
      id: task.id,
      title: task.title,
      collaborationType: task.type === 'collaborative' ? 'coordination' : 'task_assignment',
      collaborators: task.collaborators,
      progress: 0
    }
  });
}
```

**状态看板界面布局：**
```
┌─────────────────────────────────────────────────────────────────┐
│  状态看板                    [筛选] [刷新]                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ 在线: 5  │ │ 忙碌: 2  │ │ 协作中:3 │ │ 离线: 1  │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Agent卡片列表 (网格/列表视图切换)                        │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐                │   │
│  │ │ [在线]   │ │ [协作中] │ │ [在线]   │                │   │
│  │ │ Alice    │ │ Bob      │ │ Charlie  │                │   │
│  │ │ [空闲]   │ │ @设计... │ │ [空闲]   │                │   │
│  │ └──────────┘ └──────────┘ └──────────┘                │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  详细信息面板 (点击Agent卡片展开)                               │
│  - 当前协作任务                                                  │
│  - 协作对象                                                      │
│  - 任务进度                                                      │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Agent卡片详情

```
┌─────────────────────────────────────┐
│ 🔵 Alice (产品经理)                  │
│ [在线] [协作中]                       │
├─────────────────────────────────────┤
│ 当前任务: 设计登录功能               │
│ 协作对象: @设计师, @开发工程师       │
│ 进度: 30%                            │
│                                      │
│ 最后活动: 1分钟前                    │
│ 今日消息: 15条                       │
│ 今日协作: 2个任务                     │
│                                      │
│ CPU: 12% | 内存: 45%                │
│                                      │
│ [查看详情] [查看协作链] [编辑配置]    │
└─────────────────────────────────────┘
```

---

## 6. API接口设计

### 6.1 REST API

**AI员工管理：**
```
POST   /api/agents                    创建AI员工
GET    /api/agents                    获取AI员工列表
GET    /api/agents/:id                获取AI员工详情
PUT    /api/agents/:id                更新AI员工信息
DELETE /api/agents/:id                删除AI员工
GET    /api/agents/:id/status         获取AI员工状态
GET    /api/agents/:id/config         获取配置文件
PUT    /api/agents/:id/config         更新配置文件
```

**消息管理：**
```
POST   /api/messages                  发送消息
GET    /api/messages                  获取消息列表
GET    /api/messages/:id              获取消息详情
GET    /api/conversations             获取会话列表
GET    /api/conversations/:id         获取会话详情
```

**群组管理：**
```
POST   /api/groups                    创建群组
GET    /api/groups                    获取群组列表
GET    /api/groups/:id                获取群组详情
PUT    /api/groups/:id                更新群组
DELETE /api/groups/:id                删除群组
POST   /api/groups/:id/members        添加成员
DELETE /api/groups/:id/members/:userId 移除成员
```

**协作管理：**
```
GET    /api/collaborations/tasks      获取协作任务列表
GET    /api/collaborations/tasks/:id  获取协作任务详情
PUT    /api/collaborations/tasks/:id  更新协作任务状态
GET    /api/collaborations/chains/:id  获取协作链（对话历史）
```

**状态监控：**
```
GET    /api/status/dashboard          获取看板数据
GET    /api/status/agents             获取所有Agent状态
GET    /api/status/agents/:id         获取单个Agent状态
GET    /api/status/history            获取历史状态数据
```

### 6.2 WebSocket事件

**客户端 → 服务器：**
```
message:send           发送消息
message:read           标记消息已读
status:request         请求状态更新
typing:start           开始输入
typing:stop            停止输入
```

**服务器 → 客户端：**
```
message:new            新消息
message:updated        消息更新
status:update          状态更新
agent:online           Agent上线
agent:offline          Agent离线
typing:indicator       输入状态指示
collaboration:start    协作开始
collaboration:update   协作更新
collaboration:complete 协作完成
```

---

## 7. 数据模型 (SQLite)

### 7.1 SQLite表结构设计

**agents (AI员工表)：**
```sql
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar TEXT,
  workspace_path TEXT NOT NULL,
  role TEXT,
  tags TEXT, -- JSON数组
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**humans (真人用户表)：**
```sql
CREATE TABLE humans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  avatar TEXT,
  role TEXT DEFAULT 'user',
  permissions TEXT, -- JSON数组
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**groups (群组表)：**
```sql
CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar TEXT,
  created_by TEXT NOT NULL,
  is_public INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES humans(id)
);
```

**group_members (群组成员表)：**
```sql
CREATE TABLE group_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK(user_type IN ('human', 'agent')),
  role TEXT DEFAULT 'member' CHECK(role IN ('admin', 'member')),
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  UNIQUE(group_id, user_id, user_type)
);
```

**messages (消息表)：**
```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'text' CHECK(type IN ('text', 'image', 'file', 'system')),
  from_id TEXT NOT NULL,
  from_type TEXT NOT NULL CHECK(from_type IN ('human', 'agent')),
  from_name TEXT NOT NULL,
  to_type TEXT NOT NULL CHECK(to_type IN ('direct', 'group')),
  to_id TEXT NOT NULL,
  content TEXT NOT NULL,
  attachments TEXT, -- JSON数组
  status TEXT DEFAULT 'sent' CHECK(status IN ('sent', 'delivered', 'read')),
  thread_id TEXT,
  collaboration_type TEXT CHECK(collaboration_type IN ('task_assignment', 'task_update', 'task_complete', 'question')),
  task_id TEXT,
  mentions TEXT, -- JSON数组
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**agent_status (Agent状态表)：**
```sql
CREATE TABLE agent_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL UNIQUE,
  connection_status TEXT DEFAULT 'offline' CHECK(connection_status IN ('online', 'offline', 'connecting')),
  availability_status TEXT DEFAULT 'idle' CHECK(availability_status IN ('idle', 'busy', 'away', 'dnd')),
  current_task TEXT, -- JSON对象
  task_queue TEXT, -- JSON数组
  last_active_at DATETIME,
  last_message_at DATETIME,
  last_task_completed_at DATETIME,
  uptime INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  average_response_time INTEGER DEFAULT 0,
  collaboration_stats TEXT, -- JSON对象
  resource_usage TEXT, -- JSON对象
  health_status TEXT DEFAULT 'healthy' CHECK(health_status IN ('healthy', 'warning', 'error')),
  health_checks TEXT, -- JSON数组
  tags TEXT, -- JSON数组
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);
```

**collaboration_tasks (协作任务表)：**
```sql
CREATE TABLE collaboration_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'failed')),
  type TEXT DEFAULT 'collaborative' CHECK(type IN ('independent', 'collaborative')),
  created_by TEXT NOT NULL,
  group_id TEXT,
  parent_message_id TEXT,
  assignees TEXT, -- JSON数组
  dependencies TEXT, -- JSON数组
  progress INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  due_at DATETIME,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
);
```

**索引：**
```sql
CREATE INDEX idx_messages_to ON messages(to_type, to_id);
CREATE INDEX idx_messages_from ON messages(from_id, from_type);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_group_members_group ON group_members(group_id);
CREATE INDEX idx_group_members_user ON group_members(user_id, user_type);
CREATE INDEX idx_agent_status_agent ON agent_status(agent_id);
CREATE INDEX idx_collaboration_tasks_status ON collaboration_tasks(status);
CREATE INDEX idx_collaboration_tasks_group ON collaboration_tasks(group_id);
```

---

## 8. 安全设计

### 8.1 认证与授权

- **JWT Token认证**
- **基于角色的访问控制(RBAC)**
- **API密钥验证** (用于外部API调用)

### 8.2 数据安全

- **数据库加密**
- **文件系统权限控制**
- **敏感数据脱敏**

### 8.3 消息安全

- **消息签名验证**
- **端到端加密** (可选)
- **消息审计日志**

---

## 9. 扩展性设计

### 9.1 插件系统

- 支持自定义消息处理器
- 支持自定义协作策略
- 支持自定义状态收集器
- 支持自定义通知渠道

### 9.2 微服务架构 (未来)

- 消息路由服务可独立部署
- 协作引擎可独立部署
- 状态监控服务可独立部署
- 支持水平扩展

---

## 10. 部署架构

### 10.1 开发环境

```
localhost:3000 (前端)
localhost:4000 (后端API)
./data/db.sqlite (SQLite数据库文件)
OpenClaw网关 (本地运行)
```

### 10.2 生产环境

```
Nginx (反向代理)
    │
    ├─→ 前端 (静态文件)
    │
    └─→ 后端服务 (Docker容器)
          │
          ├─→ SQLite数据库文件 (挂载卷)
          │
          └─→ OpenClaw网关 (Docker容器)
```

### 10.3 Docker Compose配置示例

```yaml
version: '3.8'
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "4000:4000"
    volumes:
      - ./data:/app/data
      - ~/.openclaw:/root/.openclaw
    environment:
      - DATABASE_PATH=/app/data/db.sqlite
      - OPENCLAW_PATH=/root/.openclaw
  
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    depends_on:
      - backend
  
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - backend
      - frontend

volumes:
  data:
```
