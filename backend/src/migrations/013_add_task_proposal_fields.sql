
-- Add task proposal fields to collaboration_tasks table
BEGIN TRANSACTION;

ALTER TABLE collaboration_tasks ADD COLUMN proposed_at TEXT;
ALTER TABLE collaboration_tasks ADD COLUMN confirmed_at TEXT;
ALTER TABLE collaboration_tasks ADD COLUMN rejected_at TEXT;

COMMIT;
