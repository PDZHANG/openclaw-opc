-- Migration 002: Create missing tables and columns
-- Adds tables and columns that may be missing in existing databases

-- Create humans table if not exists
CREATE TABLE IF NOT EXISTS humans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  avatar TEXT,
  password_hash TEXT,
  role TEXT DEFAULT 'user',
  permissions TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
