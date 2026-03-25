-- Migration 001: Initial Schema
-- Creates the complete initial database structure

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar TEXT,
  workspace_path TEXT NOT NULL,
  role TEXT,
  department TEXT,
  tags TEXT,
  is_active INTEGER DEFAULT 1,
  is_pinned INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS humans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  avatar TEXT,
  password_hash TEXT,
  role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user')),
  permissions TEXT,
  is_active INTEGER DEFAULT 1,
  is_approved INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  avatar TEXT,
  created_by TEXT NOT NULL,
  is_public INTEGER DEFAULT 0,
  leader_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES humans(id)
);

CREATE TABLE IF NOT EXISTS group_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK(user_type IN ('human', 'agent')),
  role TEXT DEFAULT 'member' CHECK(role IN ('admin', 'member')),
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  UNIQUE(group_id, user_id, user_type)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'text' CHECK(type IN ('text', 'image', 'file', 'system')),
  from_id TEXT NOT NULL,
  from_type TEXT NOT NULL CHECK(from_type IN ('human', 'agent', 'system')),
  from_name TEXT NOT NULL,
  to_type TEXT NOT NULL CHECK(to_type IN ('direct', 'group')),
  to_id TEXT NOT NULL,
  content TEXT NOT NULL,
  attachments TEXT,
  status TEXT DEFAULT 'sent' CHECK(status IN ('sent', 'delivered', 'read', 'streaming')),
  thread_id TEXT,
  collaboration_type TEXT CHECK(collaboration_type IN ('task_assignment', 'task_update', 'task_complete', 'question')),
  task_id TEXT,
  mentions TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL UNIQUE,
  connection_status TEXT DEFAULT 'offline' CHECK(connection_status IN ('online', 'offline', 'connecting')),
  availability_status TEXT DEFAULT 'idle' CHECK(availability_status IN ('idle', 'busy', 'away', 'dnd')),
  current_task TEXT,
  task_queue TEXT,
  last_active_at DATETIME,
  last_message_at DATETIME,
  last_task_completed_at DATETIME,
  uptime INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  average_response_time INTEGER DEFAULT 0,
  collaboration_stats TEXT,
  resource_usage TEXT,
  health_status TEXT DEFAULT 'healthy' CHECK(health_status IN ('healthy', 'warning', 'error')),
  health_checks TEXT,
  tags TEXT,
  current_activity TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS collaboration_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending_confirmation', 'pending', 'in_progress', 'completed', 'failed', 'rejected')),
  type TEXT DEFAULT 'collaborative' CHECK(type IN ('independent', 'collaborative')),
  created_by TEXT NOT NULL,
  group_id TEXT,
  parent_message_id TEXT,
  assignees TEXT,
  dependencies TEXT,
  progress INTEGER DEFAULT 0,
  workspace_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  due_at DATETIME,
  deliverable_summary TEXT,
  deliverable_generated_at DATETIME,
  proposed_at TEXT,
  confirmed_at TEXT,
  rejected_at TEXT,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to_type, to_id);
CREATE INDEX IF NOT EXISTS idx_messages_from ON messages(from_id, from_type);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_agent_status_agent ON agent_status(agent_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_tasks_status ON collaboration_tasks(status);
CREATE INDEX IF NOT EXISTS idx_collaboration_tasks_group ON collaboration_tasks(group_id);

CREATE TABLE IF NOT EXISTS interaction_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL CHECK(event_type IN ('task_assignment', 'task_update', 'task_complete', 'message', 'status_change')),
  from_agent_id TEXT,
  to_agent_id TEXT,
  task_id TEXT,
  content TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_agent_id) REFERENCES agents(id) ON DELETE SET NULL,
  FOREIGN KEY (to_agent_id) REFERENCES agents(id) ON DELETE SET NULL,
  FOREIGN KEY (task_id) REFERENCES collaboration_tasks(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_interaction_events_created ON interaction_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interaction_events_task ON interaction_events(task_id);
CREATE INDEX IF NOT EXISTS idx_interaction_events_from ON interaction_events(from_agent_id);
CREATE INDEX IF NOT EXISTS idx_interaction_events_to ON interaction_events(to_agent_id);

CREATE TABLE IF NOT EXISTS knowledge_bases (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('aliyun', 'lexiang', 'dify', 'custom')),
  config TEXT NOT NULL,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  is_global INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_knowledge_base_bindings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  knowledge_base_id TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  UNIQUE(agent_id, knowledge_base_id)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_bases_active ON knowledge_bases(is_active);
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_global ON knowledge_bases(is_global);
CREATE INDEX IF NOT EXISTS idx_agent_kb_bindings_agent ON agent_knowledge_base_bindings(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_kb_bindings_kb ON agent_knowledge_base_bindings(knowledge_base_id);

CREATE TABLE IF NOT EXISTS message_read (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK(user_type IN ('human', 'agent')),
  read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  UNIQUE(message_id, user_id, user_type)
);
