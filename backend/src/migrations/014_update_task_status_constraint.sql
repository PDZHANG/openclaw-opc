-- Migration 014: Update task status constraint to support pending_confirmation and rejected
-- SQLite doesn't allow ALTER TABLE to modify CHECK constraints, so we need to:
-- 1. Create a new table with updated constraints
-- 2. Copy all data from old table
-- 3. Drop old table
-- 4. Rename new table to original name

BEGIN TRANSACTION;

-- Create new table with updated CHECK constraint
CREATE TABLE IF NOT EXISTS collaboration_tasks_new (
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

-- Copy all data from old table
INSERT INTO collaboration_tasks_new
SELECT 
  id, title, description, priority, status, type, created_by, group_id, 
  parent_message_id, assignees, dependencies, progress, workspace_path, 
  created_at, updated_at, due_at, deliverable_summary, deliverable_generated_at,
  proposed_at, confirmed_at, rejected_at
FROM collaboration_tasks;

-- Drop old table
DROP TABLE collaboration_tasks;

-- Rename new table
ALTER TABLE collaboration_tasks_new RENAME TO collaboration_tasks;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_collaboration_tasks_status ON collaboration_tasks(status);
CREATE INDEX IF NOT EXISTS idx_collaboration_tasks_group ON collaboration_tasks(group_id);

COMMIT;
