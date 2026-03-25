-- Migration 003: Add department to agents
-- Adds the department column to the agents table

ALTER TABLE agents ADD COLUMN department TEXT;
