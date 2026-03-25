-- Migration 011: Update messages from_type check to include 'system'
-- Adds 'system' to the from_type CHECK constraint

-- In SQLite, we can't directly modify CHECK constraints, so we need to recreate the table

-- First, create a temporary table with the new schema
CREATE TABLE IF NOT EXISTS messages_temp (
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

-- Copy data from old table to new table
INSERT INTO messages_temp SELECT * FROM messages;

-- Drop old table
DROP TABLE messages;

-- Rename temporary table to original name
ALTER TABLE messages_temp RENAME TO messages;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to_type, to_id);
CREATE INDEX IF NOT EXISTS idx_messages_from ON messages(from_id, from_type);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
