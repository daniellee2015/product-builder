-- Product Builder Workflow Database Schema - Jobs Table Extension
-- Adding scheduler-related fields to support local scheduling

-- Add new columns to jobs table for scheduling support
ALTER TABLE jobs ADD COLUMN priority INTEGER DEFAULT 100;
ALTER TABLE jobs ADD COLUMN not_before_at TEXT;  -- Delayed execution
ALTER TABLE jobs ADD COLUMN retry_count INTEGER DEFAULT 0;
ALTER TABLE jobs ADD COLUMN max_retries INTEGER DEFAULT 3;
ALTER TABLE jobs ADD COLUMN scheduler_state TEXT DEFAULT 'queued'
    CHECK(scheduler_state IN ('queued','runnable','blocked','running','completed','failed','cancelled'));
ALTER TABLE jobs ADD COLUMN parent_job_id TEXT;  -- For job hierarchies
ALTER TABLE jobs ADD COLUMN root_job_id TEXT;  -- Top-level job in hierarchy

-- Add foreign key constraints for parent/root relationships
-- Note: SQLite doesn't support adding foreign keys to existing tables via ALTER TABLE
-- These will be enforced at application level or require table recreation

-- Add indexes for scheduler queries
CREATE INDEX IF NOT EXISTS idx_jobs_scheduler_state ON jobs(scheduler_state, priority DESC, queued_at);
CREATE INDEX IF NOT EXISTS idx_jobs_priority ON jobs(priority DESC, queued_at);
CREATE INDEX IF NOT EXISTS idx_jobs_parent ON jobs(parent_job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_root ON jobs(root_job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_not_before ON jobs(not_before_at);
