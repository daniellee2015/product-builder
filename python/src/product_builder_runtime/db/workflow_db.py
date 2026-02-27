"""
Database adapter for workflow orchestrator using SQLite.

Provides persistent storage for:
- Job queue and status
- Step execution history
- Review results and scores
- Runtime variables
- Transition history
"""

import sqlite3
import json
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
import time


class WorkflowDatabase:
    """SQLite database adapter for workflow orchestration"""

    def __init__(self, db_path: str = ".product-builder/workflow.db"):
        """Initialize database connection

        Args:
            db_path: Path to SQLite database file (relative to project root)
        """
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = None
        self._connect()
        self._initialize_schema()

    def _connect(self):
        """Establish database connection"""
        self.conn = sqlite3.connect(str(self.db_path))
        self.conn.row_factory = sqlite3.Row  # Enable column access by name
        # Enable foreign keys
        self.conn.execute("PRAGMA foreign_keys = ON")

    def _initialize_schema(self):
        """Initialize database schema from SQL file"""
        schema_file = Path(__file__).parent / "db_schema.sql"
        if schema_file.exists():
            with open(schema_file, 'r') as f:
                schema_sql = f.read()
                self.conn.executescript(schema_sql)
                self.conn.commit()

    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()

    # ==================== Job Management ====================

    def create_job(self, job_id: str, workflow_id: str, workflow_mode: str,
                   metadata: Optional[Dict] = None) -> bool:
        """Create a new job entry

        Args:
            job_id: Unique job identifier
            workflow_id: Workflow definition ID
            workflow_mode: Execution mode (lite/standard/full)
            metadata: Additional job metadata

        Returns:
            True if created successfully
        """
        try:
            self.conn.execute("""
                INSERT INTO jobs (job_id, workflow_id, workflow_mode, status, metadata)
                VALUES (?, ?, ?, 'idle', ?)
            """, (job_id, workflow_id, workflow_mode, json.dumps(metadata or {})))
            self.conn.commit()
            return True
        except sqlite3.IntegrityError:
            # Job already exists
            return False

    def update_job_status(self, job_id: str, status: str,
                         current_phase: Optional[str] = None,
                         current_step: Optional[str] = None):
        """Update job status and current position

        Args:
            job_id: Job identifier
            status: New status (idle/running/completed/failed/halted)
            current_phase: Current phase ID
            current_step: Current step ID
        """
        updates = ["status = ?", "updated_at = CURRENT_TIMESTAMP"]
        params = [status]

        if current_phase is not None:
            updates.append("current_phase = ?")
            params.append(current_phase)

        if current_step is not None:
            updates.append("current_step = ?")
            params.append(current_step)

        # Set timestamps based on status
        if status == 'running' and current_phase is None:
            updates.append("started_at = CURRENT_TIMESTAMP")
        elif status in ('completed', 'failed', 'halted'):
            updates.append("completed_at = CURRENT_TIMESTAMP")

        params.append(job_id)

        self.conn.execute(f"""
            UPDATE jobs
            SET {', '.join(updates)}
            WHERE job_id = ?
        """, params)
        self.conn.commit()

    def get_job(self, job_id: str) -> Optional[Dict]:
        """Get job details

        Args:
            job_id: Job identifier

        Returns:
            Job data as dict or None if not found
        """
        cursor = self.conn.execute("""
            SELECT * FROM job_status_summary WHERE job_id = ?
        """, (job_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

    def list_jobs(self, status: Optional[str] = None, limit: int = 100) -> List[Dict]:
        """List jobs with optional status filter

        Args:
            status: Filter by status (optional)
            limit: Maximum number of jobs to return

        Returns:
            List of job summaries
        """
        if status:
            cursor = self.conn.execute("""
                SELECT * FROM job_status_summary
                WHERE status = ?
                ORDER BY created_at DESC
                LIMIT ?
            """, (status, limit))
        else:
            cursor = self.conn.execute("""
                SELECT * FROM job_status_summary
                ORDER BY created_at DESC
                LIMIT ?
            """, (limit,))

        return [dict(row) for row in cursor.fetchall()]

    # ==================== Step Execution Tracking ====================

    def record_step_execution(self, job_id: str, step_id: str, step_name: str,
                             phase_id: str, status: str, attempt: int = 1,
                             output: Optional[str] = None, error: Optional[str] = None,
                             tool_used: Optional[str] = None,
                             llm_provider: Optional[str] = None,
                             duration_ms: Optional[int] = None) -> int:
        """Record a step execution

        Args:
            job_id: Job identifier
            step_id: Step identifier
            step_name: Human-readable step name
            phase_id: Phase identifier
            status: Execution status (success/failed/skipped)
            attempt: Attempt number (for retries)
            output: Step output (truncated to 5000 chars)
            error: Error message if failed
            tool_used: Tool/adapter used
            llm_provider: LLM provider used
            duration_ms: Execution duration in milliseconds

        Returns:
            execution_id of the created record
        """
        # Truncate output to avoid bloating database
        if output and len(output) > 5000:
            output = output[:5000] + "... (truncated)"

        cursor = self.conn.execute("""
            INSERT INTO step_executions
            (job_id, step_id, step_name, phase_id, status, attempt,
             output, error, tool_used, llm_provider, duration_ms, completed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, (job_id, step_id, step_name, phase_id, status, attempt,
              output, error, tool_used, llm_provider, duration_ms))
        self.conn.commit()
        return cursor.lastrowid

    def get_step_history(self, job_id: str, step_id: Optional[str] = None) -> List[Dict]:
        """Get step execution history

        Args:
            job_id: Job identifier
            step_id: Optional step filter

        Returns:
            List of step executions
        """
        if step_id:
            cursor = self.conn.execute("""
                SELECT * FROM step_executions
                WHERE job_id = ? AND step_id = ?
                ORDER BY started_at DESC
            """, (job_id, step_id))
        else:
            cursor = self.conn.execute("""
                SELECT * FROM step_executions
                WHERE job_id = ?
                ORDER BY started_at ASC
            """, (job_id,))

        return [dict(row) for row in cursor.fetchall()]

    # ==================== Review Results ====================

    def record_review_result(self, job_id: str, step_id: str, review_cycle: int,
                            reviewer_provider: str, review_score: Optional[float] = None,
                            blocking_issues: int = 0, high_issues: int = 0,
                            medium_issues: int = 0, low_issues: int = 0,
                            quality_gate_passed: bool = False,
                            review_data: Optional[Dict] = None) -> int:
        """Record a review result

        Args:
            job_id: Job identifier
            step_id: Review step identifier
            review_cycle: Review cycle number
            reviewer_provider: LLM provider that performed review
            review_score: Numeric score (0-10)
            blocking_issues: Count of blocking issues
            high_issues: Count of high priority issues
            medium_issues: Count of medium priority issues
            low_issues: Count of low priority issues
            quality_gate_passed: Whether quality gate was passed
            review_data: Full review data as dict

        Returns:
            review_id of the created record
        """
        all_issues = blocking_issues + high_issues + medium_issues + low_issues

        cursor = self.conn.execute("""
            INSERT INTO review_results
            (job_id, step_id, review_cycle, reviewer_provider, review_score,
             blocking_issues_count, high_issues_count, medium_issues_count,
             low_issues_count, all_issues_count, quality_gate_passed, review_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (job_id, step_id, review_cycle, reviewer_provider, review_score,
              blocking_issues, high_issues, medium_issues, low_issues, all_issues,
              quality_gate_passed, json.dumps(review_data or {})))
        self.conn.commit()
        return cursor.lastrowid

    def get_review_history(self, job_id: str) -> List[Dict]:
        """Get review history for a job

        Args:
            job_id: Job identifier

        Returns:
            List of review results ordered by cycle
        """
        cursor = self.conn.execute("""
            SELECT * FROM review_results
            WHERE job_id = ?
            ORDER BY review_cycle ASC, created_at ASC
        """, (job_id,))

        return [dict(row) for row in cursor.fetchall()]

    def get_review_cycle_summary(self, job_id: str) -> List[Dict]:
        """Get aggregated review cycle progress

        Args:
            job_id: Job identifier

        Returns:
            List of cycle summaries
        """
        cursor = self.conn.execute("""
            SELECT * FROM review_cycle_progress
            WHERE job_id = ?
            ORDER BY review_cycle ASC
        """, (job_id,))

        return [dict(row) for row in cursor.fetchall()]

    # ==================== Variables Management ====================

    def set_variable(self, job_id: str, variable_name: str, variable_value: Any):
        """Set a runtime variable

        Args:
            job_id: Job identifier
            variable_name: Variable name
            variable_value: Variable value (will be JSON-encoded)
        """
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
            (job_id, variable_name, variable_value, variable_type, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, (job_id, variable_name, json.dumps(variable_value), var_type))
        self.conn.commit()

    def get_variable(self, job_id: str, variable_name: str) -> Optional[Any]:
        """Get a runtime variable

        Args:
            job_id: Job identifier
            variable_name: Variable name

        Returns:
            Variable value or None if not found
        """
        cursor = self.conn.execute("""
            SELECT variable_value, variable_type FROM job_variables
            WHERE job_id = ? AND variable_name = ?
        """, (job_id, variable_name))
        row = cursor.fetchone()

        if row:
            return json.loads(row['variable_value'])
        return None

    def get_all_variables(self, job_id: str) -> Dict[str, Any]:
        """Get all runtime variables for a job

        Args:
            job_id: Job identifier

        Returns:
            Dict of variable_name -> value
        """
        cursor = self.conn.execute("""
            SELECT variable_name, variable_value FROM job_variables
            WHERE job_id = ?
        """, (job_id,))

        return {
            row['variable_name']: json.loads(row['variable_value'])
            for row in cursor.fetchall()
        }

    def set_variables_batch(self, job_id: str, variables: Dict[str, Any]):
        """Set multiple variables at once

        Args:
            job_id: Job identifier
            variables: Dict of variable_name -> value
        """
        for name, value in variables.items():
            self.set_variable(job_id, name, value)

    # ==================== Transition History ====================

    def record_transition(self, job_id: str, from_step: str, to_step: str,
                         transition_type: Optional[str] = None,
                         condition_met: Optional[str] = None,
                         step_status: str = 'success'):
        """Record a transition taken

        Args:
            job_id: Job identifier
            from_step: Source step ID
            to_step: Target step ID
            transition_type: Type of transition
            condition_met: Condition that was satisfied
            step_status: Status of the source step
        """
        self.conn.execute("""
            INSERT INTO transition_history
            (job_id, from_step, to_step, transition_type, condition_met, step_status)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (job_id, from_step, to_step, transition_type, condition_met, step_status))
        self.conn.commit()

    def get_transition_history(self, job_id: str) -> List[Dict]:
        """Get transition history for a job

        Args:
            job_id: Job identifier

        Returns:
            List of transitions in chronological order
        """
        cursor = self.conn.execute("""
            SELECT * FROM transition_history
            WHERE job_id = ?
            ORDER BY created_at ASC
        """, (job_id,))

        return [dict(row) for row in cursor.fetchall()]

    # ==================== Analytics ====================

    def get_job_statistics(self, job_id: str) -> Dict[str, Any]:
        """Get comprehensive job statistics

        Args:
            job_id: Job identifier

        Returns:
            Dict with various statistics
        """
        job = self.get_job(job_id)
        if not job:
            return {}

        # Calculate duration
        duration_seconds = None
        if job['created_at'] and job.get('completed_at'):
            start = datetime.fromisoformat(job['created_at'])
            end = datetime.fromisoformat(job['completed_at'])
            duration_seconds = (end - start).total_seconds()

        # Get review cycles
        review_cycles = self.get_review_cycle_summary(job_id)

        return {
            'job_id': job_id,
            'status': job['status'],
            'duration_seconds': duration_seconds,
            'completed_steps': job['completed_steps'],
            'failed_steps': job['failed_steps'],
            'skipped_steps': job['skipped_steps'],
            'total_review_cycles': len(review_cycles),
            'latest_review_score': job.get('latest_review_score'),
            'review_cycles': review_cycles
        }
