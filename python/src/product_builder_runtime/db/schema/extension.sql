-- Product Builder Workflow Database Schema - Extension
-- Adding 5 additional core tables to complete the 16-table P0 design
-- Based on Codex recommendations for simple CLI workflow orchestration

-- ==================== Git Operations ====================

-- Git Operations: Audit git commands and outcomes
CREATE TABLE IF NOT EXISTS git_operations (
    git_op_id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT,
    step_execution_id INTEGER,
    op_type TEXT NOT NULL,  -- clone, checkout, commit, push, pull, merge, rebase, etc.
    command_text TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('success','failed')),
    exit_code INTEGER,
    stdout_excerpt TEXT,  -- First/last N lines
    stderr_excerpt TEXT,
    duration_ms INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,
    FOREIGN KEY (step_execution_id) REFERENCES step_executions(execution_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_git_ops_job ON git_operations(job_id, created_at);
CREATE INDEX IF NOT EXISTS idx_git_ops_type ON git_operations(op_type, status, created_at);
CREATE INDEX IF NOT EXISTS idx_git_ops_step ON git_operations(step_execution_id);

-- ==================== GitHub Integration ====================

-- GitHub Issues: Local mirror/link for GitHub issues
CREATE TABLE IF NOT EXISTS github_issues (
    issue_pk INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT,
    repo_owner TEXT NOT NULL,
    repo_name TEXT NOT NULL,
    number INTEGER NOT NULL,
    title TEXT,
    state TEXT,  -- open, closed
    labels_json TEXT,  -- JSON array of label names
    assignees_json TEXT,  -- JSON array of usernames
    url TEXT,
    opened_at TEXT,
    closed_at TEXT,
    synced_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE SET NULL,
    UNIQUE(repo_owner, repo_name, number)
);

CREATE INDEX IF NOT EXISTS idx_github_issues_job ON github_issues(job_id);
CREATE INDEX IF NOT EXISTS idx_github_issues_repo ON github_issues(repo_owner, repo_name, state);

-- GitHub Pull Requests: Local mirror/link for GitHub PRs
CREATE TABLE IF NOT EXISTS github_pull_requests (
    pr_pk INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT,
    repo_owner TEXT NOT NULL,
    repo_name TEXT NOT NULL,
    number INTEGER NOT NULL,
    title TEXT,
    state TEXT,  -- open, closed, merged
    head_branch TEXT,
    base_branch TEXT,
    mergeable INTEGER,  -- 0=no, 1=yes, NULL=unknown
    merged INTEGER NOT NULL DEFAULT 0,
    url TEXT,
    opened_at TEXT,
    closed_at TEXT,
    merged_at TEXT,
    synced_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE SET NULL,
    UNIQUE(repo_owner, repo_name, number)
);

CREATE INDEX IF NOT EXISTS idx_github_prs_job ON github_pull_requests(job_id);
CREATE INDEX IF NOT EXISTS idx_github_prs_repo ON github_pull_requests(repo_owner, repo_name, state);

-- ==================== Artifacts ====================

-- Artifacts: Track generated files (specs, review JSON, patches, logs, large prompts/responses)
CREATE TABLE IF NOT EXISTS artifacts (
    artifact_id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL,
    step_execution_id INTEGER,
    artifact_type TEXT NOT NULL,  -- prompt, response, review, patch, log, spec, etc.
    path TEXT NOT NULL,  -- Relative or absolute path
    checksum TEXT,  -- SHA256 or MD5
    size_bytes INTEGER,
    mime_type TEXT,
    metadata_json TEXT,  -- Additional metadata as JSON
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,
    FOREIGN KEY (step_execution_id) REFERENCES step_executions(execution_id) ON DELETE CASCADE,
    UNIQUE(job_id, path)
);

CREATE INDEX IF NOT EXISTS idx_artifacts_job ON artifacts(job_id, artifact_type, created_at);
CREATE INDEX IF NOT EXISTS idx_artifacts_step ON artifacts(step_execution_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_type ON artifacts(artifact_type, created_at);

-- ==================== Schema Migrations ====================

-- Schema Migrations: Track database schema version and migration history
CREATE TABLE IF NOT EXISTS schema_migrations (
    migration_id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT NOT NULL UNIQUE,  -- e.g., "001_initial", "002_add_artifacts"
    description TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now')),
    checksum TEXT,  -- Checksum of the migration SQL file
    execution_time_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON schema_migrations(version);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied ON schema_migrations(applied_at DESC);
