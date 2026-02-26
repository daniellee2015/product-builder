#!/usr/bin/env python3
"""
Test script for SchedulerDatabase adapter
Tests all scheduler-related database operations
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from workflow_db_scheduler import SchedulerDatabase
from workflow_db_phase1 import WorkflowDatabase

def test_scheduler_database():
    """Test the SchedulerDatabase adapter"""

    print("🧪 Testing SchedulerDatabase Adapter")
    print("=" * 60)

    # Initialize databases
    workflow_db = WorkflowDatabase()

    try:
        # Cleanup: Remove old test data
        print("\n📋 Cleanup: Removing old test data...")
        workflow_db.conn.execute("DELETE FROM job_dependencies WHERE job_id LIKE 'sched-job-%'")
        workflow_db.conn.execute("DELETE FROM job_leases WHERE job_id LIKE 'sched-job-%'")
        workflow_db.conn.execute("DELETE FROM resource_locks WHERE owner_job_id LIKE 'sched-job-%'")
        workflow_db.conn.execute("DELETE FROM scheduler_events WHERE job_id LIKE 'sched-job-%'")
        workflow_db.conn.execute("DELETE FROM jobs WHERE job_id LIKE 'sched-job-%'")
        workflow_db.conn.commit()
        print("✅ Cleanup complete")

        # Setup: Create test project and jobs
        print("\n📋 Setup: Creating test jobs...")
        project_id = "test-scheduler-adapter"
        workflow_db.create_project(project_id, "Test Scheduler", "/tmp/test")

        job_ids = ["sched-job-1", "sched-job-2", "sched-job-3"]
        for job_id in job_ids:
            workflow_db.create_job(
                job_id=job_id,
                project_id=project_id,
                workflow_id="test-workflow",
                workflow_version=1,
                workflow_mode="test"
            )
        print(f"✅ Created {len(job_ids)} test jobs")

        # Close workflow_db before opening scheduler_db
        workflow_db.close()

        # Now open scheduler_db
        sched_db = SchedulerDatabase()

        # Test 1: Job Dependencies
        print("\n📋 Test 1: Job Dependencies")
        sched_db.add_job_dependency("sched-job-2", "sched-job-1", "success")
        sched_db.add_job_dependency("sched-job-3", "sched-job-2", "success")

        deps = sched_db.get_job_dependencies("sched-job-2")
        print(f"✅ Job 2 dependencies: {len(deps)}")
        assert len(deps) == 1
        assert deps[0]['depends_on_job_id'] == "sched-job-1"

        satisfied = sched_db.check_dependencies_satisfied("sched-job-2")
        print(f"✅ Dependencies satisfied: {satisfied}")
        assert not satisfied  # Job 1 not completed yet

        # Test 2: Job Leases
        print("\n📋 Test 2: Job Leases")
        acquired = sched_db.acquire_lease("sched-job-1", "worker-test", 300)
        print(f"✅ Lease acquired: {acquired}")
        assert acquired

        # Try to acquire again (should fail)
        acquired_again = sched_db.acquire_lease("sched-job-1", "worker-other", 300)
        print(f"✅ Duplicate lease blocked: {not acquired_again}")
        assert not acquired_again

        lease = sched_db.get_job_lease("sched-job-1")
        print(f"✅ Lease info: owner={lease['lease_owner']}")
        assert lease['lease_owner'] == "worker-test"

        # Renew lease
        renewed = sched_db.renew_lease("sched-job-1", "worker-test", 300)
        print(f"✅ Lease renewed: {renewed}")
        assert renewed

        # Release lease
        released = sched_db.release_lease("sched-job-1", "worker-test")
        print(f"✅ Lease released: {released}")
        assert released

        # Test 3: Resource Locks
        print("\n📋 Test 3: Resource Locks")
        locked = sched_db.acquire_lock("repo:test/repo", "exclusive", "sched-job-1")
        print(f"✅ Exclusive lock acquired: {locked}")
        assert locked

        # Check availability
        available = sched_db.check_lock_available("repo:test/repo", "shared")
        print(f"✅ Lock conflict detected: {not available}")
        assert not available

        locks = sched_db.get_job_locks("sched-job-1")
        print(f"✅ Job locks: {len(locks)}")
        assert len(locks) == 1

        # Shared locks
        shared1 = sched_db.acquire_lock("provider:codex", "shared", "sched-job-2")
        shared2 = sched_db.acquire_lock("provider:codex", "shared", "sched-job-3")
        print(f"✅ Shared locks: {shared1 and shared2}")
        assert shared1 and shared2

        # Release locks
        released_count = sched_db.release_job_locks("sched-job-1")
        print(f"✅ Released {released_count} lock(s)")

        # Test 4: Scheduler Events
        print("\n📋 Test 4: Scheduler Events")
        event_id = sched_db.record_event("sched-job-1", "dispatched", {"worker": "worker-test"})
        print(f"✅ Event recorded: ID={event_id}")
        assert event_id > 0

        sched_db.record_event("sched-job-2", "blocked", {"reason": "waiting for job-1"})
        sched_db.record_event("sched-job-1", "completed", {"duration_ms": 5000})

        events = sched_db.get_job_events("sched-job-1")
        print(f"✅ Job events: {len(events)}")
        assert len(events) == 2

        recent = sched_db.get_recent_events(limit=10)
        print(f"✅ Recent events: {len(recent)}")
        assert len(recent) >= 3

        # Test 5: Query Helpers
        print("\n📋 Test 5: Query Helpers")
        runnable = sched_db.get_runnable_jobs(limit=10)
        print(f"✅ Runnable jobs: {len(runnable)}")

        blocked = sched_db.get_blocked_jobs()
        print(f"✅ Blocked jobs: {len(blocked)}")

        # Summary
        print("\n" + "=" * 60)
        print("✅ All SchedulerDatabase adapter tests passed!")

        sched_db.close()

    except AssertionError as e:
        print(f"\n❌ Assertion failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    test_scheduler_database()
