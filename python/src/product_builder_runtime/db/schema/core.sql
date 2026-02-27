-- Product Builder Workflow Database Schema
-- SQLite database for job queue, execution history, and review tracking

-- Jobs table: tracks all workflow jobs
CREATE TABLE IF NOT EXISTS jobs (
    job_id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    workflow_mode TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('idle', 'running', 'completed', 'failed', 'halted')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    current_phase TEXT,
    current_step TEXT,
    metadata TEXT  -- JSON blob for additional data
);

-- Step executions table: tracks every step execution attempt
CREATE TABLE IF NOT EXISTS step_executions (
    execution_id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL,
    step_id TEXT NOT NULL,
    step_name TEXT NOT NULL,
    phase_id TEXT,
    status TEXT NOT NULL CHECK(status IN ('success', 'failed', 'skipped')),
    attempt INTEGER NOT NULL DEFAULT 1,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    output TEXT,  -- Truncated output (first 5000 chars)
    error TEXT,
    tool_used TEXT,
    llm_provider TEXT,
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE
);

-- Review results table: stores all review scores and issues
CREATE TABLE IF NOT EXISTS review_results (
    review_id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL,
    step_id TEXT NOT NULL,
    review_cycle INTEGER NOT NULL DEFAULT 1,
    reviewer_provider TEXT NOT NULL,  -- codex, gemini, claude
    review_score REAL,
    blocking_issues_count INTEGER DEFAULT 0,
    high_issues_count INTEGER DEFAULT 0,
    medium_issues_count INTEGER DEFAULT 0,
    low_issues_count INTEGER DEFAULT 0,
    all_issues_count INTEGER DEFAULT 0,
    quality_gate_passed BOOLEAN DEFAULT 0,
    review_data TEXT,  -- Full JSON review data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE
);

-- Variables table: stores runtime variables for each job
CREATE TABLE IF NOT EXISTS job_variables (
    variable_id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL,
    variable_name TEXT NOT NULL,
    variable_value TEXT,  -- JSON-encoded value
    variable_type TEXT,  -- boolean, string, number, object
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,
    UNIQUE(job_id, variable_name)
);

-- Transitions table: tracks which transitions were taken
CREATE TABLE IF NOT EXISTS transition_history (
    transition_id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL,
    from_step TEXT NOT NULL,
    to_step TEXT NOT NULL,
    transition_type TEXT,  -- forward, loop_internal, failure, etc.
    condition_met TEXT,  -- The condition that was satisfied
    step_status TEXT,  -- success, failed, skipped
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_step_executions_job_id ON step_executions(job_id);
CREATE INDEX IF NOT EXISTS idx_step_executions_step_id ON step_executions(step_id);
CREATE INDEX IF NOT EXISTS idx_review_results_job_id ON review_results(job_id);
CREATE INDEX IF NOT EXISTS idx_review_results_cycle ON review_results(job_id, review_cycle);
CREATE INDEX IF NOT EXISTS idx_job_variables_job_id ON job_variables(job_id);
CREATE INDEX IF NOT EXISTS idx_transition_history_job_id ON transition_history(job_id);

-- Trigger to update jobs.updated_at on any change
CREATE TRIGGER IF NOT EXISTS update_jobs_timestamp
AFTER UPDATE ON jobs
BEGIN
    UPDATE jobs SET updated_at = CURRENT_TIMESTAMP WHERE job_id = NEW.job_id;
END;

-- View: Latest job status with step counts
CREATE VIEW IF NOT EXISTS job_status_summary AS
SELECT
    j.job_id,
    j.workflow_mode,
    j.status,
    j.current_phase,
    j.current_step,
    j.created_at,
    j.updated_at,
    COUNT(DISTINCT CASE WHEN se.status = 'success' THEN se.step_id END) as completed_steps,
    COUNT(DISTINCT CASE WHEN se.status = 'failed' THEN se.step_id END) as failed_steps,
    COUNT(DISTINCT CASE WHEN se.status = 'skipped' THEN se.step_id END) as skipped_steps,
    MAX(rr.review_cycle) as latest_review_cycle,
    MAX(rr.review_score) as latest_review_score
FROM jobs j
LEFT JOIN step_executions se ON j.job_id = se.job_id
LEFT JOIN review_results rr ON j.job_id = rr.job_id
GROUP BY j.job_id;

-- View: Review cycle progress
CREATE VIEW IF NOT EXISTS review_cycle_progress AS
SELECT
    job_id,
    review_cycle,
    MAX(review_score) as best_score,
    MIN(review_score) as worst_score,
    AVG(review_score) as avg_score,
    SUM(blocking_issues_count) as total_blocking_issues,
    COUNT(*) as reviewer_count,
    MAX(quality_gate_passed) as any_passed
FROM review_results
GROUP BY job_id, review_cycle
ORDER BY job_id, review_cycle;
