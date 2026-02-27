-- Product Builder Workflow Database Schema - Scheduling Extension
-- Adding local scheduler support for scenarios 2-3 (parallel execution)
-- Based on Codex recommendation for Option C (Hybrid, lean)

-- ==================== Job Dependencies ====================

-- Job Dependencies: Cross-job DAG edges for dependency management
CREATE TABLE IF NOT EXISTS job_dependencies (
    job_id TEXT NOT NULL,
    depends_on_job_id TEXT NOT NULL,
    dependency_type TEXT NOT NULL DEFAULT 'success' CHECK(dependency_type IN ('success','completion','always')),
    condition_expr TEXT,  -- Optional condition expression
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY(job_id, depends_on_job_id),
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,
    FOREIGN KEY (depends_on_job_id) REFERENCES jobs(job_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_job_deps_depends_on ON job_dependencies(depends_on_job_id);
CREATE INDEX IF NOT EXISTS idx_job_deps_job ON job_dependencies(job_id);

-- ==================== Job Leases ====================

-- Job Leases: Safe job claiming by concurrent workers/tmux panes
CREATE TABLE IF NOT EXISTS job_leases (
    job_id TEXT PRIMARY KEY,
    lease_owner TEXT NOT NULL,  -- Worker/instance identifier
    lease_expires_at TEXT NOT NULL,
    heartbeat_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_job_leases_expires ON job_leases(lease_expires_at);
CREATE INDEX IF NOT EXISTS idx_job_leases_owner ON job_leases(lease_owner);

-- ==================== Resource Locks ====================

-- Resource Locks: Prevent conflicting runs on shared resources
CREATE TABLE IF NOT EXISTS resource_locks (
    lock_key TEXT PRIMARY KEY,  -- e.g., "repo:owner/name", "worktree:/path", "provider:codex"
    lock_mode TEXT NOT NULL CHECK(lock_mode IN ('exclusive','shared')),
    owner_job_id TEXT NOT NULL,
    owner_step_id TEXT,
    expires_at TEXT,  -- NULL for permanent locks
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (owner_job_id) REFERENCES jobs(job_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_resource_locks_owner ON resource_locks(owner_job_id);
CREATE INDEX IF NOT EXISTS idx_resource_locks_expires ON resource_locks(expires_at);

-- ==================== Scheduler Events ====================

-- Scheduler Events: Audit scheduler decisions (dispatch, retry, block, unblocked)
CREATE TABLE IF NOT EXISTS scheduler_events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT,
    event_type TEXT NOT NULL,  -- dispatched, blocked, unblocked, retry, failed, completed
    payload_json TEXT,  -- Additional event data
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scheduler_events_job ON scheduler_events(job_id, created_at);
CREATE INDEX IF NOT EXISTS idx_scheduler_events_type ON scheduler_events(event_type, created_at);
