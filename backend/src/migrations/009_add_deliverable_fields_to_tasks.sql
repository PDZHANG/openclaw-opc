
-- Migration 009: Add deliverable fields to collaboration_tasks
-- Adds deliverable summary and generated at timestamp

ALTER TABLE collaboration_tasks ADD COLUMN deliverable_summary TEXT;
ALTER TABLE collaboration_tasks ADD COLUMN deliverable_generated_at DATETIME;

