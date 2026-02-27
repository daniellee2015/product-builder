#!/usr/bin/env python3
"""
Local Scheduler for Product Builder
Manages job queue and concurrent execution with dependency resolution
"""

import time
import uuid
import socket
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
import json

from workflow_db_phase1 import WorkflowDatabase
from workflow_db_scheduler import SchedulerDatabase


class LocalScheduler:
    """
    Local scheduler for managing job queue and concurrent execution

    Features:
    - Dependency-based job scheduling
    - Resource lock management
    - Concurrent job execution with leases
    - Automatic retry and cleanup
    """

    def __init__(
        self,
        max_concurrent_jobs: int = 3,
        lease_duration: int = 300,
        poll_interval: int = 5
    ):
        """
        Initialize the local scheduler

        Args:
            max_concurrent_jobs: Maximum number of jobs to run concurrently
            lease_duration: Lease duration in seconds
            poll_interval: Polling interval in seconds
        """
        self.max_concurrent_jobs = max_concurrent_jobs
        self.lease_duration = lease_duration
        self.poll_interval = poll_interval

        # Generate unique worker ID
        self.worker_id = self._generate_worker_id()

        # Initialize databases
        self.workflow_db = WorkflowDatabase()
        self.scheduler_db = SchedulerDatabase()

        # Track active jobs
        self.active_jobs: Dict[str, Any] = {}

        print(f"🚀 LocalScheduler initialized")
        print(f"   Worker ID: {self.worker_id}")
        print(f"   Max concurrent jobs: {self.max_concurrent_jobs}")
        print(f"   Lease duration: {self.lease_duration}s")

    def _generate_worker_id(self) -> str:
        """Generate a unique worker identifier"""
        hostname = socket.gethostname()
        unique_id = str(uuid.uuid4())[:8]
        return f"worker-{hostname}-{unique_id}"

    def cleanup_expired_resources(self):
        """Clean up expired leases and locks"""
        expired_leases = self.scheduler_db.cleanup_expired_leases()
        expired_locks = self.scheduler_db.cleanup_expired_locks()

        if expired_leases > 0 or expired_locks > 0:
            print(f"🧹 Cleaned up {expired_leases} expired leases, {expired_locks} expired locks")

    def find_runnable_jobs(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Find jobs that are ready to run

        Returns:
            List of runnable job records
        """
        return self.scheduler_db.get_runnable_jobs(limit=limit)

    def claim_job(self, job_id: str) -> bool:
        """
        Attempt to claim a job for execution

        Args:
            job_id: Job to claim

        Returns:
            True if successfully claimed, False otherwise
        """
        # Try to acquire lease
        if not self.scheduler_db.acquire_lease(job_id, self.worker_id, self.lease_duration):
            return False

        # Update job state
        try:
            self.workflow_db.conn.execute("""
                UPDATE jobs
                SET scheduler_state = 'running', started_at = datetime('now')
                WHERE job_id = ?
            """, (job_id,))
            self.workflow_db.conn.commit()

            # Record event
            self.scheduler_db.record_event(job_id, "dispatched", {
                "worker": self.worker_id,
                "claimed_at": datetime.now().isoformat()
            })

            return True
        except Exception as e:
            # Release lease if update fails
            self.scheduler_db.release_lease(job_id, self.worker_id)
            print(f"❌ Failed to claim job {job_id}: {e}")
            return False

    def release_job(self, job_id: str, status: str = "completed"):
        """
        Release a job after execution

        Args:
            job_id: Job to release
            status: Final status (completed/failed)
        """
        # Release lease
        self.scheduler_db.release_lease(job_id, self.worker_id)

        # Release all locks
        self.scheduler_db.release_job_locks(job_id)

        # Update job state
        self.workflow_db.conn.execute("""
            UPDATE jobs
            SET scheduler_state = ?, status = ?, completed_at = datetime('now')
            WHERE job_id = ?
        """, (status, status, job_id))
        self.workflow_db.conn.commit()

        # Record event
        self.scheduler_db.record_event(job_id, status, {
            "worker": self.worker_id,
            "released_at": datetime.now().isoformat()
        })

        # Check for dependent jobs that can now run
        self._unblock_dependent_jobs(job_id)

    def _unblock_dependent_jobs(self, completed_job_id: str):
        """
        Check and unblock jobs that were waiting for this job

        Args:
            completed_job_id: Job that just completed
        """
        dependent_jobs = self.scheduler_db.get_dependent_jobs(completed_job_id)

        for dep_job_id in dependent_jobs:
            # Check if all dependencies are now satisfied
            if self.scheduler_db.check_dependencies_satisfied(dep_job_id):
                # Update state to runnable
                self.workflow_db.conn.execute("""
                    UPDATE jobs
                    SET scheduler_state = 'runnable'
                    WHERE job_id = ? AND scheduler_state = 'blocked'
                """, (dep_job_id,))
                self.workflow_db.conn.commit()

                # Record event
                self.scheduler_db.record_event(dep_job_id, "unblocked", {
                    "unblocked_by": completed_job_id,
                    "unblocked_at": datetime.now().isoformat()
                })

                print(f"✅ Unblocked job: {dep_job_id}")

    def acquire_resource_lock(
        self,
        job_id: str,
        resource_key: str,
        mode: str = "exclusive"
    ) -> bool:
        """
        Acquire a resource lock for a job

        Args:
            job_id: Job requesting the lock
            resource_key: Resource identifier
            mode: 'exclusive' or 'shared'

        Returns:
            True if lock acquired, False otherwise
        """
        return self.scheduler_db.acquire_lock(resource_key, mode, job_id)

    def check_resource_available(self, resource_key: str, mode: str = "exclusive") -> bool:
        """
        Check if a resource is available

        Args:
            resource_key: Resource identifier
            mode: 'exclusive' or 'shared'

        Returns:
            True if resource is available
        """
        return self.scheduler_db.check_lock_available(resource_key, mode)

    def renew_lease(self, job_id: str) -> bool:
        """
        Renew the lease for an active job

        Args:
            job_id: Job to renew lease for

        Returns:
            True if renewed successfully
        """
        return self.scheduler_db.renew_lease(job_id, self.worker_id, self.lease_duration)

    def get_scheduler_stats(self) -> Dict[str, Any]:
        """
        Get current scheduler statistics

        Returns:
            Dictionary with scheduler stats
        """
        # Count jobs by state
        cursor = self.workflow_db.conn.execute("""
            SELECT scheduler_state, COUNT(*) as count
            FROM jobs
            GROUP BY scheduler_state
        """)
        state_counts = {row['scheduler_state']: row['count'] for row in cursor.fetchall()}

        # Get runnable and blocked jobs
        runnable = self.scheduler_db.get_runnable_jobs(limit=100)
        blocked = self.scheduler_db.get_blocked_jobs()

        # Get active leases
        cursor = self.scheduler_db.conn.execute("""
            SELECT COUNT(*) as count FROM job_leases
            WHERE lease_expires_at > datetime('now')
        """)
        active_leases = cursor.fetchone()['count']

        # Get active locks
        cursor = self.scheduler_db.conn.execute("""
            SELECT COUNT(*) as count FROM resource_locks
            WHERE expires_at IS NULL OR expires_at > datetime('now')
        """)
        active_locks = cursor.fetchone()['count']

        return {
            "worker_id": self.worker_id,
            "max_concurrent_jobs": self.max_concurrent_jobs,
            "active_jobs": len(self.active_jobs),
            "state_counts": state_counts,
            "runnable_jobs": len(runnable),
            "blocked_jobs": len(blocked),
            "active_leases": active_leases,
            "active_locks": active_locks
        }

    def print_stats(self):
        """Print current scheduler statistics"""
        stats = self.get_scheduler_stats()

        print("\n" + "=" * 60)
        print("📊 Scheduler Statistics")
        print("=" * 60)
        print(f"Worker ID: {stats['worker_id']}")
        print(f"Active Jobs: {stats['active_jobs']}/{stats['max_concurrent_jobs']}")
        print(f"\nJob States:")
        for state, count in stats['state_counts'].items():
            print(f"  - {state}: {count}")
        print(f"\nQueue Status:")
        print(f"  - Runnable: {stats['runnable_jobs']}")
        print(f"  - Blocked: {stats['blocked_jobs']}")
        print(f"\nResources:")
        print(f"  - Active Leases: {stats['active_leases']}")
        print(f"  - Active Locks: {stats['active_locks']}")
        print("=" * 60)

    def close(self):
        """Close database connections"""
        if self.workflow_db:
            self.workflow_db.close()
        if self.scheduler_db:
            self.scheduler_db.close()


def main():
    """Main entry point for testing"""
    scheduler = LocalScheduler(max_concurrent_jobs=3)

    try:
        # Print initial stats
        scheduler.print_stats()

        # Find runnable jobs
        print("\n🔍 Finding runnable jobs...")
        runnable = scheduler.find_runnable_jobs(limit=5)
        print(f"Found {len(runnable)} runnable job(s)")

        for job in runnable:
            print(f"  - {job['job_id']}: priority={job['priority']}")

        # Cleanup
        print("\n🧹 Cleaning up expired resources...")
        scheduler.cleanup_expired_resources()

        # Final stats
        scheduler.print_stats()

    finally:
        scheduler.close()


if __name__ == "__main__":
    main()
