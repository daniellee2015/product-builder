#!/usr/bin/env python3
"""
Workflow Database Scheduler Adapter
Provides database operations for scheduling tables:
- job_dependencies
- job_leases
- resource_locks
- scheduler_events
"""

import sqlite3
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import json


class SchedulerDatabase:
    """Database adapter for scheduler-related tables"""

    def __init__(self, db_path: str = ".product-builder/workflow.db"):
        self.db_path = Path(db_path)
        if not self.db_path.exists():
            raise FileNotFoundError(f"Database not found: {self.db_path}")

        self.conn = sqlite3.connect(str(self.db_path))
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON")

    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()

    # ==================== Job Dependencies ====================

    def add_job_dependency(
        self,
        job_id: str,
        depends_on_job_id: str,
        dependency_type: str = "success",
        condition_expr: Optional[str] = None
    ) -> None:
        """
        Add a dependency between jobs

        Args:
            job_id: The job that has the dependency
            depends_on_job_id: The job that must complete first
            dependency_type: 'success', 'completion', or 'always'
            condition_expr: Optional condition expression
        """
        self.conn.execute("""
            INSERT INTO job_dependencies (job_id, depends_on_job_id, dependency_type, condition_expr)
            VALUES (?, ?, ?, ?)
        """, (job_id, depends_on_job_id, dependency_type, condition_expr))
        self.conn.commit()

    def get_job_dependencies(self, job_id: str) -> List[Dict[str, Any]]:
        """
        Get all dependencies for a job

        Returns:
            List of dependency records with job details
        """
        cursor = self.conn.execute("""
            SELECT
                jd.depends_on_job_id,
                jd.dependency_type,
                jd.condition_expr,
                j.status as depends_on_status,
                j.scheduler_state as depends_on_scheduler_state
            FROM job_dependencies jd
            JOIN jobs j ON jd.depends_on_job_id = j.job_id
            WHERE jd.job_id = ?
        """, (job_id,))
        return [dict(row) for row in cursor.fetchall()]

    def get_dependent_jobs(self, job_id: str) -> List[str]:
        """
        Get all jobs that depend on this job

        Returns:
            List of job IDs that depend on the given job
        """
        cursor = self.conn.execute("""
            SELECT job_id FROM job_dependencies
            WHERE depends_on_job_id = ?
        """, (job_id,))
        return [row['job_id'] for row in cursor.fetchall()]

    def check_dependencies_satisfied(self, job_id: str) -> bool:
        """
        Check if all dependencies for a job are satisfied

        Returns:
            True if all dependencies are satisfied, False otherwise
        """
        dependencies = self.get_job_dependencies(job_id)

        for dep in dependencies:
            dep_type = dep['dependency_type']
            dep_status = dep['depends_on_status']

            if dep_type == 'success' and dep_status != 'completed':
                return False
            elif dep_type == 'completion' and dep_status not in ('completed', 'failed'):
                return False
            # 'always' type doesn't block

        return True

    # ==================== Job Leases ====================

    def acquire_lease(
        self,
        job_id: str,
        owner: str,
        duration_seconds: int = 300
    ) -> bool:
        """
        Acquire a lease on a job

        Args:
            job_id: Job to lease
            owner: Worker/instance identifier
            duration_seconds: Lease duration in seconds

        Returns:
            True if lease acquired, False if already leased
        """
        expires_at = (datetime.now() + timedelta(seconds=duration_seconds)).isoformat()

        try:
            self.conn.execute("""
                INSERT INTO job_leases (job_id, lease_owner, lease_expires_at, heartbeat_at)
                VALUES (?, ?, ?, datetime('now'))
            """, (job_id, owner, expires_at))
            self.conn.commit()
            return True
        except sqlite3.IntegrityError:
            # Lease already exists
            return False

    def renew_lease(self, job_id: str, owner: str, duration_seconds: int = 300) -> bool:
        """
        Renew an existing lease

        Returns:
            True if renewed, False if not owned by this owner
        """
        expires_at = (datetime.now() + timedelta(seconds=duration_seconds)).isoformat()

        cursor = self.conn.execute("""
            UPDATE job_leases
            SET lease_expires_at = ?, heartbeat_at = datetime('now')
            WHERE job_id = ? AND lease_owner = ?
        """, (expires_at, job_id, owner))
        self.conn.commit()

        return cursor.rowcount > 0

    def release_lease(self, job_id: str, owner: str) -> bool:
        """
        Release a lease

        Returns:
            True if released, False if not owned by this owner
        """
        cursor = self.conn.execute("""
            DELETE FROM job_leases
            WHERE job_id = ? AND lease_owner = ?
        """, (job_id, owner))
        self.conn.commit()

        return cursor.rowcount > 0

    def get_expired_leases(self) -> List[Dict[str, Any]]:
        """
        Get all expired leases

        Returns:
            List of expired lease records
        """
        cursor = self.conn.execute("""
            SELECT job_id, lease_owner, lease_expires_at
            FROM job_leases
            WHERE lease_expires_at < datetime('now')
        """)
        return [dict(row) for row in cursor.fetchall()]

    def cleanup_expired_leases(self) -> int:
        """
        Remove all expired leases

        Returns:
            Number of leases removed
        """
        cursor = self.conn.execute("""
            DELETE FROM job_leases
            WHERE lease_expires_at < datetime('now')
        """)
        self.conn.commit()
        return cursor.rowcount

    def get_job_lease(self, job_id: str) -> Optional[Dict[str, Any]]:
        """
        Get lease information for a job

        Returns:
            Lease record or None if not leased
        """
        cursor = self.conn.execute("""
            SELECT job_id, lease_owner, lease_expires_at, heartbeat_at, created_at
            FROM job_leases
            WHERE job_id = ?
        """, (job_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

    # ==================== Resource Locks ====================

    def acquire_lock(
        self,
        lock_key: str,
        mode: str,
        owner_job_id: str,
        owner_step_id: Optional[str] = None,
        expires_at: Optional[str] = None
    ) -> bool:
        """
        Acquire a resource lock

        Args:
            lock_key: Resource identifier (e.g., "repo:owner/name")
            mode: 'exclusive' or 'shared'
            owner_job_id: Job that owns the lock
            owner_step_id: Optional step identifier
            expires_at: Optional expiration time

        Returns:
            True if lock acquired, False if conflict
        """
        # Check if lock is available
        if not self.check_lock_available(lock_key, mode):
            return False

        try:
            self.conn.execute("""
                INSERT INTO resource_locks (lock_key, lock_mode, owner_job_id, owner_step_id, expires_at)
                VALUES (?, ?, ?, ?, ?)
            """, (lock_key, mode, owner_job_id, owner_step_id, expires_at))
            self.conn.commit()
            return True
        except sqlite3.IntegrityError:
            return False

    def release_lock(self, lock_key: str, owner_job_id: str) -> bool:
        """
        Release a resource lock

        Returns:
            True if released, False if not owned
        """
        cursor = self.conn.execute("""
            DELETE FROM resource_locks
            WHERE lock_key = ? AND owner_job_id = ?
        """, (lock_key, owner_job_id))
        self.conn.commit()

        return cursor.rowcount > 0

    def check_lock_available(self, lock_key: str, mode: str) -> bool:
        """
        Check if a lock can be acquired

        Args:
            lock_key: Resource identifier
            mode: 'exclusive' or 'shared'

        Returns:
            True if lock can be acquired
        """
        cursor = self.conn.execute("""
            SELECT lock_mode FROM resource_locks
            WHERE lock_key = ?
              AND (expires_at IS NULL OR expires_at > datetime('now'))
        """, (lock_key,))

        existing_locks = [row['lock_mode'] for row in cursor.fetchall()]

        if not existing_locks:
            return True

        # If requesting exclusive, no other locks can exist
        if mode == 'exclusive':
            return False

        # If any existing lock is exclusive, cannot acquire
        if 'exclusive' in existing_locks:
            return False

        # Shared locks can coexist with other shared locks
        return True

    def get_job_locks(self, job_id: str) -> List[Dict[str, Any]]:
        """
        Get all locks held by a job

        Returns:
            List of lock records
        """
        cursor = self.conn.execute("""
            SELECT lock_key, lock_mode, owner_step_id, expires_at, created_at
            FROM resource_locks
            WHERE owner_job_id = ?
        """, (job_id,))
        return [dict(row) for row in cursor.fetchall()]

    def release_job_locks(self, job_id: str) -> int:
        """
        Release all locks held by a job

        Returns:
            Number of locks released
        """
        cursor = self.conn.execute("""
            DELETE FROM resource_locks
            WHERE owner_job_id = ?
        """, (job_id,))
        self.conn.commit()
        return cursor.rowcount

    def cleanup_expired_locks(self) -> int:
        """
        Remove all expired locks

        Returns:
            Number of locks removed
        """
        cursor = self.conn.execute("""
            DELETE FROM resource_locks
            WHERE expires_at IS NOT NULL AND expires_at < datetime('now')
        """)
        self.conn.commit()
        return cursor.rowcount

    # ==================== Scheduler Events ====================

    def record_event(
        self,
        job_id: str,
        event_type: str,
        payload: Optional[Dict[str, Any]] = None
    ) -> int:
        """
        Record a scheduler event

        Args:
            job_id: Job identifier
            event_type: Event type (dispatched, blocked, unblocked, retry, failed, completed)
            payload: Optional event data

        Returns:
            Event ID
        """
        payload_json = json.dumps(payload) if payload else None

        cursor = self.conn.execute("""
            INSERT INTO scheduler_events (job_id, event_type, payload_json)
            VALUES (?, ?, ?)
        """, (job_id, event_type, payload_json))
        self.conn.commit()

        return cursor.lastrowid

    def get_job_events(
        self,
        job_id: str,
        event_type: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get events for a job

        Args:
            job_id: Job identifier
            event_type: Optional filter by event type
            limit: Maximum number of events to return

        Returns:
            List of event records
        """
        if event_type:
            cursor = self.conn.execute("""
                SELECT event_id, job_id, event_type, payload_json, created_at
                FROM scheduler_events
                WHERE job_id = ? AND event_type = ?
                ORDER BY created_at DESC
                LIMIT ?
            """, (job_id, event_type, limit))
        else:
            cursor = self.conn.execute("""
                SELECT event_id, job_id, event_type, payload_json, created_at
                FROM scheduler_events
                WHERE job_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            """, (job_id, limit))

        events = []
        for row in cursor.fetchall():
            event = dict(row)
            if event['payload_json']:
                event['payload'] = json.loads(event['payload_json'])
            events.append(event)

        return events

    def get_recent_events(
        self,
        event_type: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get recent scheduler events across all jobs

        Args:
            event_type: Optional filter by event type
            limit: Maximum number of events to return

        Returns:
            List of event records
        """
        if event_type:
            cursor = self.conn.execute("""
                SELECT event_id, job_id, event_type, payload_json, created_at
                FROM scheduler_events
                WHERE event_type = ?
                ORDER BY created_at DESC
                LIMIT ?
            """, (event_type, limit))
        else:
            cursor = self.conn.execute("""
                SELECT event_id, job_id, event_type, payload_json, created_at
                FROM scheduler_events
                ORDER BY created_at DESC
                LIMIT ?
            """, (limit,))

        events = []
        for row in cursor.fetchall():
            event = dict(row)
            if event['payload_json']:
                event['payload'] = json.loads(event['payload_json'])
            events.append(event)

        return events

    # ==================== Query Helpers ====================

    def get_runnable_jobs(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get jobs that are ready to run

        A job is runnable if:
        - scheduler_state is 'queued' or 'runnable'
        - All dependencies are satisfied
        - Not currently leased
        - not_before_at is in the past (or NULL)

        Returns:
            List of runnable job records
        """
        cursor = self.conn.execute("""
            SELECT j.job_id, j.project_id, j.workflow_id, j.workflow_version,
                   j.workflow_mode, j.priority, j.queued_at, j.metadata
            FROM jobs j
            WHERE j.scheduler_state IN ('queued', 'runnable')
              AND (j.not_before_at IS NULL OR j.not_before_at <= datetime('now'))
              AND j.job_id NOT IN (
                  -- Exclude jobs with unsatisfied dependencies
                  SELECT jd.job_id
                  FROM job_dependencies jd
                  JOIN jobs dep_job ON jd.depends_on_job_id = dep_job.job_id
                  WHERE (jd.dependency_type = 'success' AND dep_job.status != 'completed')
                     OR (jd.dependency_type = 'completion' AND dep_job.status NOT IN ('completed', 'failed'))
              )
              AND j.job_id NOT IN (
                  -- Exclude jobs that are currently leased
                  SELECT job_id FROM job_leases
                  WHERE lease_expires_at > datetime('now')
              )
            ORDER BY j.priority DESC, j.queued_at
            LIMIT ?
        """, (limit,))

        return [dict(row) for row in cursor.fetchall()]

    def get_blocked_jobs(self) -> List[Dict[str, Any]]:
        """
        Get jobs that are blocked by dependencies

        Returns:
            List of blocked job records with blocking reasons
        """
        cursor = self.conn.execute("""
            SELECT DISTINCT
                j.job_id,
                j.metadata,
                j.priority,
                GROUP_CONCAT(dep_job.job_id) as blocking_jobs
            FROM jobs j
            JOIN job_dependencies jd ON j.job_id = jd.job_id
            JOIN jobs dep_job ON jd.depends_on_job_id = dep_job.job_id
            WHERE j.scheduler_state IN ('queued', 'blocked')
              AND (
                  (jd.dependency_type = 'success' AND dep_job.status != 'completed')
                  OR (jd.dependency_type = 'completion' AND dep_job.status NOT IN ('completed', 'failed'))
              )
            GROUP BY j.job_id
        """)

        return [dict(row) for row in cursor.fetchall()]
