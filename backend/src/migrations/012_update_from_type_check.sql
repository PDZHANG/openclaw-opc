-- Migration 012: Update from_type check constraint to include 'system'
-- SQLite doesn't allow modifying CHECK constraints, so we need to recreate the table

-- First, backup existing data
CREATE TABLE messages_backup AS SELECT * FROM messages;

-- Drop the old table
DROP TABLE messages;

-- Create new table with updated constraint
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

-- Restore data
INSERT INTO messages SELECT * FROM messages_backup;

-- Drop backup table
DROP TABLE messages_backup;
