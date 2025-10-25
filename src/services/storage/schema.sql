-- Task Management Database Schema
-- Sprint 1-2: Task Persistence Layer
-- SQLite with Full-Text Search (FTS5)

-- Main tasks table
CREATE TABLE IF NOT EXISTS tasks (
  -- Primary key
  id TEXT PRIMARY KEY,

  -- Core fields
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',

  -- Timestamps
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  completedAt INTEGER,

  -- Conversation data
  conversationId TEXT NOT NULL,
  messages TEXT NOT NULL,  -- JSON array of ClineMessage

  -- API metrics (JSON object)
  apiMetrics TEXT NOT NULL,

  -- Context tracking
  contextTokens INTEGER DEFAULT 0,
  contextWindow INTEGER DEFAULT 200000,

  -- Checkpoints (JSON array)
  checkpoints TEXT DEFAULT '[]',
  currentCheckpoint TEXT,

  -- Metadata (JSON object)
  metadata TEXT NOT NULL,

  -- Unique constraint
  UNIQUE(conversationId)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_status
  ON tasks(status);

CREATE INDEX IF NOT EXISTS idx_tasks_createdAt
  ON tasks(createdAt DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_updatedAt
  ON tasks(updatedAt DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_conversationId
  ON tasks(conversationId);

-- Full-text search table (FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS tasks_fts USING fts5(
  id UNINDEXED,
  text,
  content=tasks,
  content_rowid=rowid
);

-- FTS triggers to keep search index in sync

-- Trigger: Insert
CREATE TRIGGER IF NOT EXISTS tasks_fts_insert
AFTER INSERT ON tasks
BEGIN
  INSERT INTO tasks_fts(rowid, id, text)
  VALUES (new.rowid, new.id, new.text);
END;

-- Trigger: Delete
CREATE TRIGGER IF NOT EXISTS tasks_fts_delete
AFTER DELETE ON tasks
BEGIN
  DELETE FROM tasks_fts
  WHERE rowid = old.rowid;
END;

-- Trigger: Update
CREATE TRIGGER IF NOT EXISTS tasks_fts_update
AFTER UPDATE ON tasks
BEGIN
  UPDATE tasks_fts
  SET text = new.text
  WHERE rowid = old.rowid;
END;
