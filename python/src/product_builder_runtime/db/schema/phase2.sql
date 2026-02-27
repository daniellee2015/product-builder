-- Product Builder Workflow Database Schema - Phase 2 Domain
-- Git/GitHub integration, Capability Tree, Spec Documents, Task Queue
-- Based on Codex recommendations

-- ==================== Git & Repository Management ====================

-- Repositories: Git repository registry per project
CREATE TABLE IF NOT EXISTS repositories (
    repo_id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    remote_url TEXT,
    default_branch TEXT,
    provider TEXT,  -- github, gitlab, bitbucket, etc.
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    UNIQUE(project_id, name)
);

-- Worktrees: Track temporary/per-job worktrees
CREATE TABLE IF NOT EXISTS worktrees (
    worktree_id TEXT PRIMARY KEY,
    repo_id TEXT NOT NULL,
    job_id TEXT,
    branch_name TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    base_commit TEXT,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK(status IN ('active','cleaned','orphaned')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    cleaned_at TEXT,
    FOREIGN KEY (repo_id) REFERENCES repositories(repo_id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE SET NULL
);

-- Git Operations: Audit git commands and outcomes
CREATE TABLE IF NOT EXISTS git_operations (
    git_op_id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT,
    step_execution_id INTEGER,
    repo_id TEXT,
    worktree_id TEXT,
    op_type TEXT NOT NULL,  -- clone, checkout, commit, push, pull, merge, etc.
    command_text TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('success','failed')),
    exit_code INTEGER,
    stdout_excerpt TEXT,
    stderr_excerpt TEXT,
    duration_ms INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,
    FOREIGN KEY (step_execution_id) REFERENCES step_executions(execution_id) ON DELETE CASCADE,
    FOREIGN KEY (repo_id) REFERENCES repositories(repo_id) ON DELETE CASCADE,
    FOREIGN KEY (worktree_id) REFERENCES worktrees(worktree_id) ON DELETE CASCADE
);

-- ==================== GitHub Integration ====================

-- GitHub Issues: Local mirror/link for GitHub issues
CREATE TABLE IF NOT EXISTS github_issues (
    issue_pk INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id TEXT NOT NULL,
    number INTEGER NOT NULL,
    job_id TEXT,
    title TEXT,
    state TEXT,  -- open, closed
    labels_json TEXT,  -- JSON array
    assignees_json TEXT,  -- JSON array
    url TEXT,
    opened_at TEXT,
    closed_at TEXT,
    synced_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (repo_id) REFERENCES repositories(repo_id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE SET NULL,
    UNIQUE(repo_id, number)
);

-- GitHub Pull Requests: Local mirror/link for GitHub PRs
CREATE TABLE IF NOT EXISTS github_pull_requests (
    pr_pk INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id TEXT NOT NULL,
    number INTEGER NOT NULL,
    job_id TEXT,
    title TEXT,
    state TEXT,  -- open, closed, merged
    head_branch TEXT,
    base_branch TEXT,
    mergeable INTEGER,
    merged INTEGER DEFAULT 0,
    url TEXT,
    opened_at TEXT,
    closed_at TEXT,
    merged_at TEXT,
    synced_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (repo_id) REFERENCES repositories(repo_id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE SET NULL,
    UNIQUE(repo_id, number)
);

-- ==================== Capability Tree ====================

-- Capability Nodes: Capability tree nodes
CREATE TABLE IF NOT EXISTS capability_nodes (
    node_id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    parent_node_id TEXT,
    name TEXT NOT NULL,
    slug TEXT,
    status TEXT,  -- planned, in_progress, completed, deprecated
    metadata_json TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    FOREIGN KEY (parent_node_id) REFERENCES capability_nodes(node_id) ON DELETE CASCADE,
    UNIQUE(project_id, slug)
);

-- Capability Changes: Audit trail for capability tree mutations
CREATE TABLE IF NOT EXISTS capability_changes (
    change_id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL,
    job_id TEXT,
    node_id TEXT,
    action TEXT NOT NULL CHECK(action IN ('add','update','delete','move','link')),
    before_json TEXT,
    after_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE SET NULL,
    FOREIGN KEY (node_id) REFERENCES capability_nodes(node_id) ON DELETE SET NULL
);

-- ==================== Specification Documents ====================

-- Spec Documents: Document registry for OpenSpec and related specs
CREATE TABLE IF NOT EXISTS spec_documents (
    spec_id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    job_id TEXT,
    doc_type TEXT NOT NULL,  -- openspec, devspec, api_spec, etc.
    title TEXT NOT NULL,
    path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK(status IN ('draft','in_review','approved','archived')),
    current_revision INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE SET NULL,
    UNIQUE(project_id, path)
);

-- Spec Revisions: Version history for spec content
CREATE TABLE IF NOT EXISTS spec_revisions (
    revision_id INTEGER PRIMARY KEY AUTOINCREMENT,
    spec_id TEXT NOT NULL,
    revision_no INTEGER NOT NULL,
    source_step_execution_id INTEGER,
    author_provider TEXT,
    content_hash TEXT,
    artifact_id INTEGER,
    change_summary TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (spec_id) REFERENCES spec_documents(spec_id) ON DELETE CASCADE,
    FOREIGN KEY (source_step_execution_id) REFERENCES step_executions(execution_id) ON DELETE SET NULL,
    FOREIGN KEY (artifact_id) REFERENCES artifacts(artifact_id) ON DELETE SET NULL,
    UNIQUE(spec_id, revision_no)
);

-- ==================== Task Queue ====================

-- Tasks: Task queue entries (sub-work units beyond step graph)
CREATE TABLE IF NOT EXISTS tasks (
    task_id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    step_id TEXT,
    parent_task_id TEXT,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending','running','blocked','completed','failed','cancelled')),
    priority INTEGER NOT NULL DEFAULT 100,
    scheduled_at TEXT,
    started_at TEXT,
    completed_at TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    assignee_provider TEXT,
    payload_json TEXT,
    result_json TEXT,
    error_json TEXT,
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,
    FOREIGN KEY (parent_task_id) REFERENCES tasks(task_id) ON DELETE CASCADE
);

-- Task Dependencies: DAG edges for queued tasks
CREATE TABLE IF NOT EXISTS task_dependencies (
    task_id TEXT NOT NULL,
    depends_on_task_id TEXT NOT NULL,
    condition_expr TEXT,
    PRIMARY KEY(task_id, depends_on_task_id),
    FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
    FOREIGN KEY (depends_on_task_id) REFERENCES tasks(task_id) ON DELETE CASCADE
);

-- ==================== Artifacts ====================

-- Artifacts: Track generated files (specs, review JSON, patches, logs)
CREATE TABLE IF NOT EXISTS artifacts (
    artifact_id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL,
    step_execution_id INTEGER,
    artifact_type TEXT NOT NULL,  -- spec, review, patch, log, etc.
    path TEXT NOT NULL,
    checksum TEXT,
    size_bytes INTEGER,
    mime_type TEXT,
    metadata_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,
    FOREIGN KEY (step_execution_id) REFERENCES step_executions(execution_id) ON DELETE CASCADE,
    UNIQUE(job_id, path)
);

-- ==================== Command History ====================

-- Command History: CLI command execution history (for debugging/audit)
CREATE TABLE IF NOT EXISTS command_history (
    command_id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT,
    step_execution_id INTEGER,
    command_text TEXT NOT NULL,
    cwd TEXT,
    status TEXT NOT NULL CHECK(status IN ('success','failed','timeout','cancelled')),
    exit_code INTEGER,
    stdout_excerpt TEXT,
    stderr_excerpt TEXT,
    duration_ms INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE,
    FOREIGN KEY (step_execution_id) REFERENCES step_executions(execution_id) ON DELETE CASCADE
);

-- ==================== Indexes ====================

-- Repositories
CREATE INDEX IF NOT EXISTS idx_repos_project ON repositories(project_id);

-- Worktrees
CREATE INDEX IF NOT EXISTS idx_worktrees_repo ON worktrees(repo_id, status);
CREATE INDEX IF NOT EXISTS idx_worktrees_job ON worktrees(job_id);

-- Git Operations
CREATE INDEX IF NOT EXISTS idx_git_ops_job ON git_operations(job_id, created_at);
CREATE INDEX IF NOT EXISTS idx_git_ops_repo ON git_operations(repo_id, op_type, created_at);

-- GitHub Issues
CREATE INDEX IF NOT EXISTS idx_github_issues_repo ON github_issues(repo_id, state);
CREATE INDEX IF NOT EXISTS idx_github_issues_job ON github_issues(job_id);

-- GitHub PRs
CREATE INDEX IF NOT EXISTS idx_github_prs_repo ON github_pull_requests(repo_id, state);
CREATE INDEX IF NOT EXISTS idx_github_prs_job ON github_pull_requests(job_id);

-- Capability Nodes
CREATE INDEX IF NOT EXISTS idx_capability_nodes_project ON capability_nodes(project_id, parent_node_id);
CREATE INDEX IF NOT EXISTS idx_capability_nodes_slug ON capability_nodes(project_id, slug);

-- Capability Changes
CREATE INDEX IF NOT EXISTS idx_capability_changes_project ON capability_changes(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_capability_changes_job ON capability_changes(job_id);

-- Spec Documents
CREATE INDEX IF NOT EXISTS idx_spec_docs_project ON spec_documents(project_id, doc_type, status);
CREATE INDEX IF NOT EXISTS idx_spec_docs_path ON spec_documents(project_id, path);

-- Spec Revisions
CREATE INDEX IF NOT EXISTS idx_spec_revs_spec ON spec_revisions(spec_id, revision_no DESC);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status, priority, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_tasks_job ON tasks(job_id, status);

-- Task Dependencies
CREATE INDEX IF NOT EXISTS idx_task_deps_depends ON task_dependencies(depends_on_task_id);

-- Artifacts
CREATE INDEX IF NOT EXISTS idx_artifacts_job ON artifacts(job_id, artifact_type, created_at);
CREATE INDEX IF NOT EXISTS idx_artifacts_path ON artifacts(job_id, path);

-- Command History
CREATE INDEX IF NOT EXISTS idx_cmd_hist_job ON command_history(job_id, created_at);
CREATE INDEX IF NOT EXISTS idx_cmd_hist_step ON command_history(step_execution_id);

-- ==================== Triggers ====================

-- Auto-update timestamps
CREATE TRIGGER IF NOT EXISTS update_capability_nodes_timestamp
AFTER UPDATE ON capability_nodes
BEGIN
    UPDATE capability_nodes SET updated_at = datetime('now') WHERE node_id = NEW.node_id;
END;

CREATE TRIGGER IF NOT EXISTS update_spec_documents_timestamp
AFTER UPDATE ON spec_documents
BEGIN
    UPDATE spec_documents SET updated_at = datetime('now') WHERE spec_id = NEW.spec_id;
END;

-- ==================== Views ====================

-- Git/GitHub Activity
CREATE VIEW IF NOT EXISTS v_git_github_activity AS
SELECT
    j.job_id,
    j.status as job_status,
    COUNT(DISTINCT go.git_op_id) as git_operations_count,
    COUNT(DISTINCT gi.issue_pk) as linked_issues_count,
    COUNT(DISTINCT gpr.pr_pk) as linked_prs_count,
    MAX(go.created_at) as last_git_operation
FROM jobs j
LEFT JOIN git_operations go ON j.job_id = go.job_id
LEFT JOIN github_issues gi ON j.job_id = gi.job_id
LEFT JOIN github_pull_requests gpr ON j.job_id = gpr.job_id
GROUP BY j.job_id;

-- Queue Ready Tasks
CREATE VIEW IF NOT EXISTS v_queue_ready_tasks AS
SELECT
    t.task_id,
    t.job_id,
    t.title,
    t.priority,
    t.scheduled_at,
    t.assignee_provider
FROM tasks t
WHERE t.status = 'pending'
AND NOT EXISTS (
    SELECT 1 FROM task_dependencies td
    INNER JOIN tasks dep ON td.depends_on_task_id = dep.task_id
    WHERE td.task_id = t.task_id
    AND dep.status NOT IN ('completed', 'cancelled')
)
ORDER BY t.priority DESC, t.scheduled_at ASC;

-- Capability Tree Summary
CREATE VIEW IF NOT EXISTS v_capability_tree_summary AS
SELECT
    project_id,
    COUNT(*) as total_nodes,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_nodes,
    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_nodes,
    SUM(CASE WHEN status = 'planned' THEN 1 ELSE 0 END) as planned_nodes,
    MAX(updated_at) as last_updated
FROM capability_nodes
GROUP BY project_id;

-- Spec Document Status
CREATE VIEW IF NOT EXISTS v_spec_document_status AS
SELECT
    sd.spec_id,
    sd.project_id,
    sd.doc_type,
    sd.title,
    sd.status,
    sd.current_revision,
    COUNT(sr.revision_id) as total_revisions,
    MAX(sr.created_at) as last_revision_date
FROM spec_documents sd
LEFT JOIN spec_revisions sr ON sd.spec_id = sr.spec_id
GROUP BY sd.spec_id;
