-- Migration 005: Add leader_id to groups
-- Adds the leader_id column to the groups table

ALTER TABLE groups ADD COLUMN leader_id TEXT;
