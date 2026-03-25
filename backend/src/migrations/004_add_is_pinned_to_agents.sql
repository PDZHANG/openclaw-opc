-- Migration 004: Add is_pinned to agents
-- Adds the is_pinned column to the agents table

ALTER TABLE agents ADD COLUMN is_pinned INTEGER DEFAULT 0;
