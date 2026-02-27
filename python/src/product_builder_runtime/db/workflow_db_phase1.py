"""
Database adapter for workflow orchestrator - Phase 1 Core
Implements Codex-recommended schema with 11 core tables
"""

import sqlite3
import json
import hashlib
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime


class WorkflowDatabase:
    """SQLite database adapter for workflow orchestration - Phase 1 Core"""

    def __init__(self, db_path: str = ".product-builder/workflow.db"):
        """Initialize database connection"""
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = None
        self._connect()
        self._initialize_schema()

    def _connect(self):
        """Establish database connection"""
        self.conn = sqlite3.connect(str(self.db_path))
        self.conn.row_factory = sqlite3.Row
        # Enable foreign keys and WAL mode
        self.conn.execute("PRAGMA foreign_keys = ON")
        self.conn.execute("PRAGMA journal_mode = WAL")
        self.conn.execute("PRAGMA busy_timeout = 5000")

    def _initialize_schema(self):
        """Initialize database schema from SQL file"""
        schema_file = Path(__file__).parent / "db_schema_phase1.sql"
        if schema_file.exists():
            with open(schema_file, 'r') as f:
                schema_sql = f.read()
                self.conn.executescript(schema_sql)
                self.conn.commit()

    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()

    # ==================== Project Management ====================

    def create_project(self, project_id: str, name: str, root_path: str,
                      default_workflow_id: Optional[str] = None) -> bool:
        """Create a new project"""
        try:
            self.conn.execute("""
                INSERT INTO projects (project_id, name, root_path, default_workflow_id)
                VALUES (?, ?, ?, ?)
            """, (project_id, name, root_path, default_workflow_id))
            self.conn.commit()
            return True
        except sqlite3.IntegrityError:
            return False

    def get_project_by_path(self, root_path: str) -> Optional[Dict]:
        """Get project by root path"""
        cursor = self.conn.execute("""
            SELECT * FROM projects WHERE root_path = ?
        """, (root_path,))
        row = cursor.fetchone()
        return dict(row) if row else None

    # ==================== Workflow Definition Management ====================

    def save_workflow_definition(self, workflow_id: str, project_id: str,
                                 name: str, mode_default: str,
                                 definition_json: Dict) -> int:
        """Save a new workflow definition version"""
        # Calculate checksum
        definition_str = json.dumps(definition_json, sort_keys=True)
        checksum = hashlib.sha256(definition_str.encode()).hexdigest()

        # Get next version number
        cursor = self.conn.execute("""
            SELECT COALESCE(MAX(version), 0) + 1 as next_version
            FROM workflow_definitions
            WHERE workflow_id = ?
        """, (workflow_id,))
        next_version = cursor.fetchone()['next_version']

        # Insert new version
        self.conn.execute("""
            INSERT INTO workflow_definitions
            (workflow_id, version, project_id, name, mode_default, definition_json, checksum)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (workflow_id, next_version, project_id, name, mode_default,
              json.dumps(definition_json), checksum))

        # Extract and save steps
        if 'phases' in definition_json:
            for phase in definition_json['phases']:
                phase_id = phase.get('phase_id', phase.get('id', ''))
                for step in phase.get('steps', []):
                    step_id = step.get('step_id', step.get('id', ''))
                    self.conn.execute("""
                        INSERT INTO workflow_steps
                        (workflow_id, workflow_version, step_id, phase_id, display_id,
                         name, tool, requires_human_approval, condition_expr,
                         llm_providers, llm_role, step_json)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        workflow_id, next_version, step_id, phase_id,
                        step.get('display_id'),
                        step.get('name', ''),
                        step.get('tool'),
                        1 if step.get('requires_human_approval') else 0,
                        step.get('condition'),
                        json.dumps(step.get('llm_providers', [])),
                        step.get('llm_role'),
                        json.dumps(step)
                    ))

        # Extract and save transitions
        if 'transitions' in definition_json:
            for idx, trans in enumerate(definition_json['transitions']):
                self.conn.execute("""
                    INSERT INTO workflow_transitions
                    (workflow_id, workflow_version, from_step_id, to_step_id,
                     on_status, condition_expr, priority, enabled_modes_json, transition_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    workflow_id, next_version,
                    trans.get('from', ''),
                    trans.get('to', ''),
                    trans.get('on', 'success'),
                    trans.get('condition'),
                    idx,  # Use index as priority
                    json.dumps(trans.get('enabled_in_modes', [])),
                    json.dumps(trans)
                ))

        self.conn.commit()
        return next_version

    # ==================== Job Management ====================

    def create_job(self, job_id: str, project_id: str, workflow_id: str,
                   workflow_version: int, workflow_mode: str,
                   metadata: Optional[Dict] = None) -> bool:
        """Create a new job entry"""
        try:
            self.conn.execute("""
                INSERT INTO jobs
                (job_id, project_id, workflow_id, workflow_version, workflow_mode, metadata)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (job_id, project_id, workflow_id, workflow_version, workflow_mode,
                  json.dumps(metadata or {})))
            self.conn.commit()
            return True
        except sqlite3.IntegrityError:
            return False

    def update_job_status(self, job_id: str, status: str,
                         current_phase: Optional[str] = None,
                         current_step: Optional[str] = None):
        """Update job status and current position"""
        updates = ["status = ?"]
        params = [status]

        if current_phase is not None:
            updates.append("current_phase = ?")
            params.append(current_phase)

        if current_step is not None:
            updates.append("current_step = ?")
            params.append(current_step)

        # Set timestamps based on status
        if status == 'running':
            updates.append("started_at = datetime('now')")
        elif status in ('completed', 'failed', 'halted'):
            updates.append("completed_at = datetime('now')")

        params.append(job_id)

        self.conn.execute(f"""
            UPDATE jobs
            SET {', '.join(updates)}
            WHERE job_id = ?
        """, params)
        self.conn.commit()

    def get_job(self, job_id: str) -> Optional[Dict]:
        """Get job details from dashboard view"""
        cursor = self.conn.execute("""
            SELECT * FROM v_job_dashboard WHERE job_id = ?
        """, (job_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

    # ==================== Step Execution Tracking ====================

    def record_step_execution(self, job_id: str, step_id: str, phase_id: str,
                             status: str, attempt: int = 1,
                             tool_used: Optional[str] = None,
                             llm_provider: Optional[str] = None,
                             duration_ms: Optional[int] = None,
                             exit_code: Optional[int] = None,
                             input_json: Optional[Dict] = None,
                             output: Optional[str] = None,
                             error: Optional[str] = None) -> int:
        """Record a step execution"""
        # Truncate output
        if output and len(output) > 5000:
            output = output[:5000] + "... (truncated)"

        cursor = self.conn.execute("""
            INSERT INTO step_executions
            (job_id, step_id, phase_id, status, attempt, tool_used, llm_provider,
             completed_at, duration_ms, exit_code, input_json, output, error)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?)
        """, (job_id, step_id, phase_id, status, attempt, tool_used, llm_provider,
              duration_ms, exit_code, json.dumps(input_json) if input_json else None,
              output, error))
        self.conn.commit()
        return cursor.lastrowid

    # ==================== Review System ====================

    def record_review_result(self, job_id: str, step_execution_id: Optional[int],
                            review_cycle: int, reviewer_provider: str,
                            reviewer_model: Optional[str] = None,
                            review_score: Optional[float] = None,
                            quality_threshold: float = 8.5,
                            quality_gate_passed: bool = False,
                            blocking_issues: int = 0, high_issues: int = 0,
                            medium_issues: int = 0, low_issues: int = 0,
                            summary: Optional[str] = None,
                            review_data: Optional[Dict] = None) -> int:
        """Record a review result"""
        cursor = self.conn.execute("""
            INSERT INTO review_results
            (job_id, step_execution_id, review_cycle, reviewer_provider, reviewer_model,
             review_score, quality_threshold, quality_gate_passed,
             blocking_issues_count, high_issues_count, medium_issues_count, low_issues_count,
             summary, review_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (job_id, step_execution_id, review_cycle, reviewer_provider, reviewer_model,
              review_score, quality_threshold, 1 if quality_gate_passed else 0,
              blocking_issues, high_issues, medium_issues, low_issues,
              summary, json.dumps(review_data) if review_data else None))
        self.conn.commit()
        return cursor.lastrowid

    def record_review_finding(self, review_id: int, severity: str, title: str,
                             category: Optional[str] = None,
                             details: Optional[str] = None,
                             file_path: Optional[str] = None,
                             line: Optional[int] = None,
                             column: Optional[int] = None) -> int:
        """Record a review finding"""
        # Generate fingerprint for deduplication
        fingerprint_data = f"{file_path}:{line}:{title}"
        fingerprint = hashlib.md5(fingerprint_data.encode()).hexdigest()

        cursor = self.conn.execute("""
            INSERT INTO review_findings
            (review_id, severity, category, title, details, file_path, line, column, fingerprint)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (review_id, severity, category, title, details, file_path, line, column, fingerprint))
        self.conn.commit()
        return cursor.lastrowid

    def get_open_findings(self, job_id: Optional[str] = None) -> List[Dict]:
        """Get open findings"""
        if job_id:
            cursor = self.conn.execute("""
                SELECT * FROM v_open_findings WHERE job_id = ?
                ORDER BY
                    CASE severity
                        WHEN 'blocking' THEN 1
                        WHEN 'high' THEN 2
                        WHEN 'medium' THEN 3
                        WHEN 'low' THEN 4
                    END
            """, (job_id,))
        else:
            cursor = self.conn.execute("SELECT * FROM v_open_findings")

        return [dict(row) for row in cursor.fetchall()]

    # ==================== LLM Tracking ====================

    def record_llm_interaction(self, provider: str, status: str,
                              job_id: Optional[str] = None,
                              step_execution_id: Optional[int] = None,
                              review_id: Optional[int] = None,
                              model: Optional[str] = None,
                              role: Optional[str] = None,
                              request_id: Optional[str] = None,
                              prompt_text: Optional[str] = None,
                              response_text: Optional[str] = None,
                              response_json: Optional[Dict] = None,
                              input_tokens: Optional[int] = None,
                              output_tokens: Optional[int] = None,
                              latency_ms: Optional[int] = None,
                              cost_usd: Optional[float] = None,
                              error_message: Optional[str] = None) -> int:
        """Record an LLM interaction"""
        total_tokens = (input_tokens or 0) + (output_tokens or 0)

        cursor = self.conn.execute("""
            INSERT INTO llm_interactions
            (job_id, step_execution_id, review_id, provider, model, role, request_id,
             prompt_text, response_text, response_json, input_tokens, output_tokens,
             total_tokens, latency_ms, cost_usd, status, error_message)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (job_id, step_execution_id, review_id, provider, model, role, request_id,
              prompt_text, response_text, json.dumps(response_json) if response_json else None,
              input_tokens, output_tokens, total_tokens, latency_ms, cost_usd,
              status, error_message))
        self.conn.commit()
        return cursor.lastrowid

    def get_provider_performance(self) -> List[Dict]:
        """Get LLM provider performance metrics"""
        cursor = self.conn.execute("SELECT * FROM v_provider_performance")
        return [dict(row) for row in cursor.fetchall()]

    # ==================== Variables Management ====================

    def set_variable(self, job_id: str, variable_name: str, variable_value: Any,
                    source_step_id: Optional[str] = None):
        """Set a runtime variable"""
        # Determine type
        if isinstance(variable_value, bool):
            var_type = 'boolean'
        elif isinstance(variable_value, (int, float)):
            var_type = 'number'
        elif isinstance(variable_value, str):
            var_type = 'string'
        else:
            var_type = 'object'

        self.conn.execute("""
            INSERT OR REPLACE INTO job_variables
            (job_id, variable_name, variable_value, variable_type, source_step_id, updated_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
        """, (job_id, variable_name, json.dumps(variable_value), var_type, source_step_id))
        self.conn.commit()

    def get_all_variables(self, job_id: str) -> Dict[str, Any]:
        """Get all runtime variables for a job"""
        cursor = self.conn.execute("""
            SELECT variable_name, variable_value FROM job_variables
            WHERE job_id = ?
        """, (job_id,))

        return {
            row['variable_name']: json.loads(row['variable_value'])
            for row in cursor.fetchall()
        }

    def set_variables_batch(self, job_id: str, variables: Dict[str, Any],
                           source_step_id: Optional[str] = None):
        """Set multiple variables at once"""
        for name, value in variables.items():
            self.set_variable(job_id, name, value, source_step_id)

    # ==================== Transition History ====================

    def record_transition(self, job_id: str, from_step: str, to_step: str,
                         source_execution_id: Optional[int] = None,
                         on_status: Optional[str] = None,
                         condition_expr: Optional[str] = None,
                         condition_result: Optional[bool] = None):
        """Record a transition taken"""
        self.conn.execute("""
            INSERT INTO transition_history
            (job_id, source_execution_id, from_step, to_step, on_status,
             condition_expr, condition_result)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (job_id, source_execution_id, from_step, to_step, on_status,
              condition_expr, 1 if condition_result else 0 if condition_result is not None else None))
        self.conn.commit()

    # ==================== Configuration ====================

    def set_config(self, scope_type: str, scope_id: str, key: str, value: Any,
                  is_secret: bool = False, updated_by: Optional[str] = None):
        """Set a configuration value"""
        # Determine type
        if isinstance(value, bool):
            var_type = 'boolean'
        elif isinstance(value, (int, float)):
            var_type = 'number'
        elif isinstance(value, str):
            var_type = 'string'
        else:
            var_type = 'object'

        self.conn.execute("""
            INSERT OR REPLACE INTO config_entries
            (scope_type, scope_id, key, value_json, value_type, is_secret, updated_by, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        """, (scope_type, scope_id, key, json.dumps(value), var_type,
              1 if is_secret else 0, updated_by))
        self.conn.commit()

    def get_config(self, scope_type: str, scope_id: str, key: str) -> Optional[Any]:
        """Get a configuration value"""
        cursor = self.conn.execute("""
            SELECT value_json FROM config_entries
            WHERE scope_type = ? AND scope_id = ? AND key = ?
        """, (scope_type, scope_id, key))
        row = cursor.fetchone()
        return json.loads(row['value_json']) if row else None

    # ==================== Error Tracking ====================

    def record_error(self, component: str, severity: str, message: str,
                    job_id: Optional[str] = None,
                    step_execution_id: Optional[int] = None,
                    error_code: Optional[str] = None,
                    details_json: Optional[Dict] = None,
                    stack_trace: Optional[str] = None) -> int:
        """Record an error event"""
        # Generate fingerprint for deduplication
        fingerprint_data = f"{component}:{error_code}:{message}"
        fingerprint = hashlib.md5(fingerprint_data.encode()).hexdigest()

        # Check if error already exists
        cursor = self.conn.execute("""
            SELECT error_id, occurrence_count FROM error_events
            WHERE fingerprint = ? AND resolved = 0
        """, (fingerprint,))
        existing = cursor.fetchone()

        if existing:
            # Update existing error
            self.conn.execute("""
                UPDATE error_events
                SET occurrence_count = occurrence_count + 1,
                    last_seen_at = datetime('now')
                WHERE error_id = ?
            """, (existing['error_id'],))
            self.conn.commit()
            return existing['error_id']
        else:
            # Insert new error
            cursor = self.conn.execute("""
                INSERT INTO error_events
                (job_id, step_execution_id, component, error_code, severity,
                 message, details_json, stack_trace, fingerprint)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (job_id, step_execution_id, component, error_code, severity,
                  message, json.dumps(details_json) if details_json else None,
                  stack_trace, fingerprint))
            self.conn.commit()
            return cursor.lastrowid

    def get_error_hotspots(self) -> List[Dict]:
        """Get error hotspots"""
        cursor = self.conn.execute("SELECT * FROM v_error_hotspots")
        return [dict(row) for row in cursor.fetchall()]
