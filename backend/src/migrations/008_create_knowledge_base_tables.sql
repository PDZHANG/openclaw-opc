-- Migration 008: Create Knowledge Base Tables
-- Adds tables for knowledge base management

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
