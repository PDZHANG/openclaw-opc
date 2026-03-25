-- Migration 007: Add password_hash to humans
-- Adds the password_hash column to the humans table

ALTER TABLE humans ADD COLUMN password_hash TEXT;
