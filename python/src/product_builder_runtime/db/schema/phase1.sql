-- Product Builder Workflow Database Schema - Phase 1 Core
-- SQLite database for workflow orchestration with LLM tracking and error management
-- Based on Codex recommendations

-- Enable foreign keys and WAL mode for better concurrency
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;

-- ==================== Core Entities ====================

-- Projects: Root entity for one CLI workspace/repo context
CREATE TABLE IF NOT EXISTS projects (
    project_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    root_path TEXT NOT NULL UNIQUE,
    default_workflow_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Workflow Definitions: Versioned workflow definitions (snapshot of workflow.json)
CREATE TABLE IF NOT EXISTS workflow_definitions (
    workflow_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    mode_default TEXT NOT NULL,
    definition_json TEXT NOT NULL,  -- Full workflow.json content
    checksum TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (workflow_id, version),
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
);

-- Workflow Steps: Queryable step metadata extracted from workflow definition
CREATE TABLE IF NOT EXISTS workflow_steps (
    workflow_id TEXT NOT NULL,
    workflow_version INTEGER NOT NULL,
    step_id TEXT NOT NULL,
    phase_id TEXT NOT NULL,
    display_id TEXT,
    name TEXT NOT NULL,
    tool TEXT,
    requires_human_approval INTEGER NOT NULL DEFAULT 0,
    condition_expr TEXT,
    llm_providers TEXT,  -- JSON array of provider names
    llm_role TEXT,
    step_json TEXT NOT NULL,  -- Full step definition
    PRIMARY KEY (workflow_id, workflow_version, step_id),
    FOREIGN KEY (workflow_id, workflow_version)
        REFERENCES workflow_definitions(workflow_id, version) ON DELETE CASCADE
);

-- Workflow Transitions: Queryable transition graph with explicit semantics
CREATE TABLE IF NOT EXISTS workflow_transitions (
    workflow_id TEXT NOT NULL,
    workflow_version INTEGER NOT NULL,
    transition_id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_step_id TEXT NOT NULL,
    to_step_id TEXT NOT NULL,
    on_status TEXT NOT NULL DEFAULT 'success'
        CHECK(on_status IN ('success','failed','skipped','always')),
    condition_expr TEXT,
    priority INTEGER NOT NULL DEFAULT 100,
    enabled_modes_json TEXT,  -- JSON array of enabled modes
    transition_json TEXT,  -- Full transition definition
    FOREIGN KEY (workflow_id, workflow_version)
        REFERENCES workflow_definitions(workflow_id, version) ON DELETE CASCADE
);

-- ==================== Job Execution ====================

-- Jobs: Workflow run queue + top-level status
CREATE TABLE IF NOT EXISTS jobs (
    job_id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    workflow_id TEXT NOT NULL,
    workflow_version INTEGER NOT NULL,
    workflow_mode TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending','idle','running','completed','failed','halted','cancelled')),
    priority INTEGER NOT NULL DEFAULT 100,
    queued_at TEXT NOT NULL DEFAULT (datetime('now')),
    started_at TEXT,
    completed_at TEXT,
    current_phase TEXT,
    current_step TEXT,
    trigger_source TEXT,
    parent_job_id TEXT,
    metadata TEXT,  -- JSON blob for additional data
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    FOREIGN KEY (workflow_id, workflow_version)
        REFERENCES workflow_definitions(workflow_id, version),
    FOREIGN KEY (parent_job_id) REFERENCES jobs(job_id) ON DELETE SET NULL
);

-- Step Executions: Every step attempt (including retries/skips)
CREATE TABLE IF NOT EXISTS step_executions (
    execution_id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL,
    step_id TEXT NOT NULL,
    phase_id TEXT,
    status TEXT NOT NULL CHECK(status IN ('success','failed','skipped')),
    attempt INTEGER NOT NULL DEFAULT 1,
    tool_used TEXT,
    llm_provider TEXT,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    duration_ms INTEGER,
    exit_code INTEGER,
    input_json TEXT,  -- Input context
    output TEXT,  -- Truncated output (first 5000 chars)
    error TEXT,
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE
);

-- Transition History: Actual runtime path taken by each job
CREATE TABLE IF NOT EXISTS transition_history (
    transition_history_id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL,
    source_execution_id INTEGER,
    from_step TEXT NOT NULL,
    to_step TEXT NOT NULL,
    on_status TEXT,
    condition_expr TEXT,
    condition_result INTEGER,  -- 1 for true, 0 for false
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,
    FOREIGN KEY (source_execution_id) REFERENCES step_executions(execution_id) ON DELETE SET NULL
);

-- Job Variables: Current runtime variable state for expression evaluation
CREATE TABLE IF NOT EXISTS job_variables (
    variable_id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL,
    variable_name TEXT NOT NULL,
    variable_value TEXT NOT NULL,  -- JSON-encoded value
    variable_type TEXT NOT NULL,  -- boolean, string, number, object
    source_step_id TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(job_id, variable_name),
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE
);

-- ==================== Review System ====================

-- Review Results: Per-review-cycle score/gate outcome
CREATE TABLE IF NOT EXISTS review_results (
    review_id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL,
    step_execution_id INTEGER,
    review_cycle INTEGER NOT NULL DEFAULT 1,
    reviewer_provider TEXT NOT NULL,
    reviewer_model TEXT,
    review_score REAL,
    quality_threshold REAL NOT NULL DEFAULT 8.5,
    quality_gate_passed INTEGER NOT NULL DEFAULT 0,
    blocking_issues_count INTEGER NOT NULL DEFAULT 0,
    high_issues_count INTEGER NOT NULL DEFAULT 0,
    medium_issues_count INTEGER NOT NULL DEFAULT 0,
    low_issues_count INTEGER NOT NULL DEFAULT 0,
    summary TEXT,
    review_data TEXT,  -- Full JSON review data
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,
    FOREIGN KEY (step_execution_id) REFERENCES step_executions(execution_id) ON DELETE SET NULL
);

-- Review Findings: Normalized findings to track fix loop progress
CREATE TABLE IF NOT EXISTS review_findings (
    finding_id INTEGER PRIMARY KEY AUTOINCREMENT,
    review_id INTEGER NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('blocking','high','medium','low')),
    category TEXT,
    title TEXT NOT NULL,
    details TEXT,
    file_path TEXT,
    line INTEGER,
    column INTEGER,
    fingerprint TEXT,  -- Hash for deduplication
    status TEXT NOT NULL DEFAULT 'open'
        CHECK(status IN ('open','fixed','deferred','false_positive')),
    resolved_in_execution_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at TEXT,
    FOREIGN KEY (review_id) REFERENCES review_results(review_id) ON DELETE CASCADE,
    FOREIGN KEY (resolved_in_execution_id) REFERENCES step_executions(execution_id) ON DELETE SET NULL
);

-- ==================== LLM Tracking ====================

-- LLM Interactions: Prompt/response + token/cost/latency accounting
CREATE TABLE IF NOT EXISTS llm_interactions (
    interaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT,
    step_execution_id INTEGER,
    review_id INTEGER,
    provider TEXT NOT NULL,
    model TEXT,
    role TEXT,  -- reviewer, executor, planner, etc.
    request_id TEXT,
    prompt_text TEXT,
    response_text TEXT,
    response_json TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    latency_ms INTEGER,
    cost_usd REAL,
    status TEXT NOT NULL CHECK(status IN ('success','failed','timeout','cancelled')),
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,
    FOREIGN KEY (step_execution_id) REFERENCES step_executions(execution_id) ON DELETE CASCADE,
    FOREIGN KEY (review_id) REFERENCES review_results(review_id) ON DELETE CASCADE
);

-- ==================== Configuration & Errors ====================

-- Config Entries: Global/project/workflow/job scoped config key-values
CREATE TABLE IF NOT EXISTS config_entries (
    config_id INTEGER PRIMARY KEY AUTOINCREMENT,
    scope_type TEXT NOT NULL CHECK(scope_type IN ('global','project','workflow','job')),
    scope_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value_json TEXT NOT NULL,
    value_type TEXT NOT NULL,
    is_secret INTEGER NOT NULL DEFAULT 0,
    updated_by TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(scope_type, scope_id, key)
);

-- Error Events: Structured error tracking and deduplication
CREATE TABLE IF NOT EXISTS error_events (
    error_id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT,
    step_execution_id INTEGER,
    component TEXT NOT NULL,
    error_code TEXT,
    severity TEXT NOT NULL CHECK(severity IN ('info','warning','error','fatal')),
    message TEXT NOT NULL,
    details_json TEXT,
    stack_trace TEXT,
    fingerprint TEXT,  -- Hash for deduplication
    occurrence_count INTEGER NOT NULL DEFAULT 1,
    first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
    resolved INTEGER NOT NULL DEFAULT 0,
    resolved_at TEXT,
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,
    FOREIGN KEY (step_execution_id) REFERENCES step_executions(execution_id) ON DELETE CASCADE
);

-- ==================== Indexes ====================

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_root_path ON projects(root_path);

-- Workflow Definitions
CREATE INDEX IF NOT EXISTS idx_workflow_defs_project ON workflow_definitions(project_id, is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_defs_version ON workflow_definitions(workflow_id, version DESC);

-- Workflow Steps
CREATE INDEX IF NOT EXISTS idx_workflow_steps_phase ON workflow_steps(workflow_id, workflow_version, phase_id);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_display ON workflow_steps(workflow_id, workflow_version, display_id);

-- Workflow Transitions
CREATE INDEX IF NOT EXISTS idx_workflow_trans_from ON workflow_transitions(workflow_id, workflow_version, from_step_id, priority);
CREATE INDEX IF NOT EXISTS idx_workflow_trans_to ON workflow_transitions(workflow_id, workflow_version, to_step_id);

-- Jobs
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status, priority, queued_at);
CREATE INDEX IF NOT EXISTS idx_jobs_project ON jobs(project_id, queued_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_workflow ON jobs(workflow_id, workflow_version);

-- Step Executions
CREATE INDEX IF NOT EXISTS idx_step_exec_job ON step_executions(job_id, step_id, attempt DESC);
CREATE INDEX IF NOT EXISTS idx_step_exec_time ON step_executions(job_id, started_at);
CREATE INDEX IF NOT EXISTS idx_step_exec_status ON step_executions(status, started_at);

-- Transition History
CREATE INDEX IF NOT EXISTS idx_trans_hist_job ON transition_history(job_id, created_at);
CREATE INDEX IF NOT EXISTS idx_trans_hist_from ON transition_history(job_id, from_step);

-- Job Variables
CREATE INDEX IF NOT EXISTS idx_job_vars_job ON job_variables(job_id, updated_at);

-- Review Results
CREATE INDEX IF NOT EXISTS idx_review_job_cycle ON review_results(job_id, review_cycle DESC);
CREATE INDEX IF NOT EXISTS idx_review_time ON review_results(job_id, created_at);
CREATE INDEX IF NOT EXISTS idx_review_gate ON review_results(quality_gate_passed, review_score);

-- Review Findings
CREATE INDEX IF NOT EXISTS idx_findings_review ON review_findings(review_id, severity);
CREATE INDEX IF NOT EXISTS idx_findings_status ON review_findings(status, severity);
CREATE INDEX IF NOT EXISTS idx_findings_fingerprint ON review_findings(fingerprint);

-- LLM Interactions
CREATE INDEX IF NOT EXISTS idx_llm_job ON llm_interactions(job_id, created_at);
CREATE INDEX IF NOT EXISTS idx_llm_provider ON llm_interactions(provider, model, created_at);
CREATE INDEX IF NOT EXISTS idx_llm_step ON llm_interactions(step_execution_id);

-- Config Entries
CREATE INDEX IF NOT EXISTS idx_config_scope ON config_entries(scope_type, scope_id);

-- Error Events
CREATE INDEX IF NOT EXISTS idx_errors_job ON error_events(job_id, severity, last_seen_at);
CREATE INDEX IF NOT EXISTS idx_errors_fingerprint ON error_events(fingerprint);
CREATE INDEX IF NOT EXISTS idx_errors_resolved ON error_events(resolved, severity);

-- ==================== Triggers ====================

-- Auto-update timestamps
CREATE TRIGGER IF NOT EXISTS update_projects_timestamp
AFTER UPDATE ON projects
BEGIN
    UPDATE projects SET updated_at = datetime('now') WHERE project_id = NEW.project_id;
END;

-- ==================== Views ====================

-- Job Dashboard: One-row-per-job summary
CREATE VIEW IF NOT EXISTS v_job_dashboard AS
SELECT
    j.job_id,
    j.project_id,
    j.workflow_mode,
    j.status,
    j.current_phase,
    j.current_step,
    j.queued_at,
    j.started_at,
    j.completed_at,
    CAST((julianday(COALESCE(j.completed_at, datetime('now'))) - julianday(j.started_at)) * 86400000 AS INTEGER) as duration_ms,
    COUNT(DISTINCT CASE WHEN se.status = 'success' THEN se.step_id END) as completed_steps,
    COUNT(DISTINCT CASE WHEN se.status = 'failed' THEN se.step_id END) as failed_steps,
    COUNT(DISTINCT CASE WHEN se.status = 'skipped' THEN se.step_id END) as skipped_steps,
    MAX(rr.review_cycle) as latest_review_cycle,
    MAX(rr.review_score) as latest_review_score,
    MAX(rr.quality_gate_passed) as quality_gate_passed
FROM jobs j
LEFT JOIN step_executions se ON j.job_id = se.job_id
LEFT JOIN review_results rr ON j.job_id = rr.job_id
GROUP BY j.job_id;

-- Latest Review Per Job
CREATE VIEW IF NOT EXISTS v_latest_review_per_job AS
SELECT
    rr.job_id,
    rr.review_cycle,
    rr.reviewer_provider,
    rr.review_score,
    rr.quality_gate_passed,
    rr.blocking_issues_count,
    rr.high_issues_count,
    rr.medium_issues_count,
    rr.low_issues_count,
    rr.created_at
FROM review_results rr
INNER JOIN (
    SELECT job_id, MAX(review_cycle) as max_cycle
    FROM review_results
    GROUP BY job_id
) latest ON rr.job_id = latest.job_id AND rr.review_cycle = latest.max_cycle;

-- Open Findings
CREATE VIEW IF NOT EXISTS v_open_findings AS
SELECT
    rf.finding_id,
    rr.job_id,
    rr.review_cycle,
    rf.severity,
    rf.category,
    rf.title,
    rf.file_path,
    rf.line,
    rf.created_at
FROM review_findings rf
INNER JOIN review_results rr ON rf.review_id = rr.review_id
WHERE rf.status = 'open'
ORDER BY
    CASE rf.severity
        WHEN 'blocking' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
    END,
    rf.created_at DESC;

-- Provider Performance
CREATE VIEW IF NOT EXISTS v_provider_performance AS
SELECT
    provider,
    model,
    COUNT(*) as total_calls,
    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_calls,
    ROUND(100.0 * SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate,
    ROUND(AVG(latency_ms), 0) as avg_latency_ms,
    ROUND(AVG(total_tokens), 0) as avg_tokens,
    ROUND(SUM(cost_usd), 4) as total_cost_usd
FROM llm_interactions
GROUP BY provider, model
ORDER BY total_calls DESC;

-- Error Hotspots
CREATE VIEW IF NOT EXISTS v_error_hotspots AS
SELECT
    component,
    error_code,
    severity,
    COUNT(DISTINCT fingerprint) as unique_errors,
    SUM(occurrence_count) as total_occurrences,
    MAX(last_seen_at) as last_seen
FROM error_events
WHERE resolved = 0
GROUP BY component, error_code, severity
ORDER BY total_occurrences DESC;
