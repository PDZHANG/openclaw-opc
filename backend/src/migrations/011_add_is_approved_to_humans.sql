-- Migration 011: Add is_approved field to humans table
-- Adds user approval functionality for registration

ALTER TABLE humans ADD COLUMN is_approved INTEGER DEFAULT 0;

-- Set existing users as approved
UPDATE humans SET is_approved = 1 WHERE is_approved IS NULL;
