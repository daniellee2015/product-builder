#!/usr/bin/env python3
"""
Worker - Multi-Worker Support for Product Builder CLI

Enables multiple tmux panes to run workflows concurrently with proper
coordination through job leases and resource locks.
"""

import os
import time
import socket
import hashlib
import logging
from typing import Optional, Dict, Any, List
from pathlib import Path
from datetime import datetime

from workflow_db_scheduler import SchedulerDatabase
from scheduler import LocalScheduler


class Worker:
    """
    Worker process for executing jobs in a distributed environment.

    Features:
    - Worker registration and heartbeat
    - Job claiming with lease mechanism
    - Resource lock coordination
    - Graceful shutdown
    - Status reporting
    """

    def __init__(
        self,
        scheduler_db: SchedulerDatabase,
        worker_id: Optional[str] = None,
        heartbeat_interval: int = 30,
        lease_duration: int = 300
    ):
        """
        Initialize Worker.

        Args:
            scheduler_db: Database adapter for scheduler operations
            worker_id: Unique worker ID (auto-generated if not provided)
            heartbeat_interval: Heartbeat interval in seconds
            lease_duration: Job lease duration in seconds
        """
        self.scheduler_db = scheduler_db
        self.worker_id = worker_id or self._generate_worker_id()
        self.heartbeat_interval = heartbeat_interval
        self.lease_duration = lease_duration
        self.logger = logging.getLogger(__name__)

        # Initialize scheduler
        self.scheduler = LocalScheduler(
            max_concurrent_jobs=1,  # Worker processes one job at a time
            lease_duration=lease_duration
        )

        # Worker state
        self.running = False
        self.current_job_id = None
        self.last_heartbeat = None

    def _generate_worker_id(self) -> str:
        """Generate unique worker ID based on hostname and PID"""
        hostname = socket.gethostname()
        pid = os.getpid()
        timestamp = int(time.time())
        unique_str = f"{hostname}-{pid}-{timestamp}"
        hash_str = hashlib.md5(unique_str.encode()).hexdigest()[:8]
        return f"worker-{hash_str}"

    def start(self, max_jobs: Optional[int] = None):
        """
        Start worker loop.

        Args:
            max_jobs: Maximum number of jobs to process (None for infinite)
        """
        self.logger.info(f"Starting worker {self.worker_id}")
        self.running = True
        jobs_processed = 0

        try:
            while self.running:
                # Send heartbeat
                self._send_heartbeat()

                # Try to claim and execute a job
                job_claimed = self._claim_and_execute_job()

                if job_claimed:
                    jobs_processed += 1
                    if max_jobs and jobs_processed >= max_jobs:
                        self.logger.info(f"Reached max jobs limit ({max_jobs})")
                        break
                else:
                    # No job available, wait before retry
                    time.sleep(5)

        except KeyboardInterrupt:
            self.logger.info("Worker interrupted by user")
        except Exception as e:
            self.logger.error(f"Worker error: {e}")
            raise
        finally:
            self.stop()

    def stop(self):
        """Stop worker gracefully"""
        self.logger.info(f"Stopping worker {self.worker_id}")
        self.running = False

        # Release current job if any
        if self.current_job_id:
            try:
                self.scheduler.release_job(self.current_job_id)
                self.logger.info(f"Released job {self.current_job_id}")
            except Exception as e:
                self.logger.error(f"Error releasing job: {e}")

    def _send_heartbeat(self):
        """Send heartbeat to indicate worker is alive"""
        now = time.time()

        # Only send if interval has passed
        if self.last_heartbeat and (now - self.last_heartbeat) < self.heartbeat_interval:
            return

        try:
            # Record heartbeat event
            self.scheduler_db.record_event(
                job_id=self.current_job_id or "system",
                event_type="worker_heartbeat",
                payload={
                    "worker_id": self.worker_id,
                    "timestamp": datetime.now().isoformat(),
                    "current_job": self.current_job_id
                }
            )
            self.last_heartbeat = now
            self.logger.debug(f"Heartbeat sent by {self.worker_id}")

        except Exception as e:
            self.logger.error(f"Error sending heartbeat: {e}")

    def _claim_and_execute_job(self) -> bool:
        """
        Try to claim and execute a job.

        Returns:
            True if a job was claimed and executed, False otherwise
        """
        try:
            # Get runnable jobs
            runnable_jobs = self.scheduler.get_runnable_jobs()

            if not runnable_jobs:
                self.logger.debug("No runnable jobs available")
                return False

            # Try to claim the first runnable job
            for job_info in runnable_jobs:
                job_id = job_info["job_id"]

                # Try to claim the job
                claimed = self.scheduler.claim_job(job_id, lease_duration=self.lease_duration)

                if claimed:
                    self.logger.info(f"Claimed job {job_id}")
                    self.current_job_id = job_id

                    # Execute the job
                    self._execute_job(job_id)

                    # Release the job
                    self.scheduler.release_job(job_id)
                    self.current_job_id = None

                    return True

            self.logger.debug("Failed to claim any runnable job")
            return False

        except Exception as e:
            self.logger.error(f"Error in claim_and_execute_job: {e}")
            return False

    def _execute_job(self, job_id: str):
        """
        Execute a job.

        Args:
            job_id: Job ID to execute
        """
        self.logger.info(f"Executing job {job_id}")

        try:
            # Record job start
            self.scheduler_db.record_event(
                job_id=job_id,
                event_type="job_started",
                payload={
                    "worker_id": self.worker_id,
                    "start_time": datetime.now().isoformat()
                }
            )

            # TODO: Integrate with WorkflowOrchestrator
            # For now, just simulate work
            self.logger.info(f"Job {job_id} execution would happen here")
            time.sleep(2)  # Simulate work

            # Record job completion
            self.scheduler_db.record_event(
                job_id=job_id,
                event_type="job_completed",
                payload={
                    "worker_id": self.worker_id,
                    "end_time": datetime.now().isoformat()
                }
            )

            self.logger.info(f"Job {job_id} completed successfully")

        except Exception as e:
            self.logger.error(f"Error executing job {job_id}: {e}")

            # Record job failure
            self.scheduler_db.record_event(
                job_id=job_id,
                event_type="job_failed",
                payload={
                    "worker_id": self.worker_id,
                    "error": str(e),
                    "end_time": datetime.now().isoformat()
                }
            )

            raise

    def get_status(self) -> Dict[str, Any]:
        """
        Get worker status.

        Returns:
            Status dict with worker information
        """
        status = {
            "worker_id": self.worker_id,
            "running": self.running,
            "current_job": self.current_job_id,
            "last_heartbeat": self.last_heartbeat
        }

        # Try to get scheduler stats, but don't fail if it errors
        try:
            status["scheduler_stats"] = self.scheduler.get_scheduler_stats()
        except Exception as e:
            status["scheduler_stats_error"] = str(e)

        return status


if __name__ == "__main__":
    # Example usage
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # Initialize worker
    scheduler_db = SchedulerDatabase()
    worker = Worker(scheduler_db)

    # Start worker
    print(f"Starting worker: {worker.worker_id}")
    worker.start(max_jobs=5)  # Process up to 5 jobs

