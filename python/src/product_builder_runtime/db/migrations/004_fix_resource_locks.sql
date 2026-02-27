-- Migration 004: Fix resource_locks table to support multiple shared locks
-- Problem: lock_key as PRIMARY KEY prevents multiple shared locks on same resource
-- Solution: Use composite primary key (lock_key, owner_job_id)

-- Drop old table
DROP TABLE IF EXISTS resource_locks;

-- Recreate with correct structure
CREATE TABLE IF NOT EXISTS resource_locks (
    lock_key TEXT NOT NULL,  -- e.g., "repo:owner/name", "worktree:/path", "provider:codex"
    lock_mode TEXT NOT NULL CHECK(lock_mode IN ('exclusive','shared')),
    owner_job_id TEXT NOT NULL,
    owner_step_id TEXT,
    expires_at TEXT,  -- NULL for permanent locks
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY(lock_key, owner_job_id),
    FOREIGN KEY (owner_job_id) REFERENCES jobs(job_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_resource_locks_owner ON resource_locks(owner_job_id);
CREATE INDEX IF NOT EXISTS idx_resource_locks_expires ON resource_locks(expires_at);
CREATE INDEX IF NOT EXISTS idx_resource_locks_key ON resource_locks(lock_key);
