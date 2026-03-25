-- Migration 006: Add current_activity to agent_status
-- Adds the current_activity column to the agent_status table

ALTER TABLE agent_status ADD COLUMN current_activity TEXT;
