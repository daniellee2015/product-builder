#!/usr/bin/env python3
"""
Test script for LocalScheduler
Tests job claiming, dependency resolution, and resource management
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from scheduler import LocalScheduler
from workflow_db_phase1 import WorkflowDatabase
from workflow_db_scheduler import SchedulerDatabase


def test_local_scheduler():
    """Test the LocalScheduler"""

    print("🧪 Testing LocalScheduler")
    print("=" * 60)

    # Setup: Create test jobs with dependencies
    print("\n📋 Setup: Creating test scenario...")
    workflow_db = WorkflowDatabase()
    scheduler_db = SchedulerDatabase()

    # Cleanup old test data
    workflow_db.conn.execute("DELETE FROM job_dependencies WHERE job_id LIKE 'test-sched-%'")
    workflow_db.conn.execute("DELETE FROM job_leases WHERE job_id LIKE 'test-sched-%'")
    workflow_db.conn.execute("DELETE FROM resource_locks WHERE owner_job_id LIKE 'test-sched-%'")
    workflow_db.conn.execute("DELETE FROM scheduler_events WHERE job_id LIKE 'test-sched-%'")
    workflow_db.conn.execute("DELETE FROM jobs WHERE job_id LIKE 'test-sched-%'")
    workflow_db.conn.commit()

    # Create project
    project_id = "test-scheduler"
    workflow_db.create_project(project_id, "Test Scheduler", "/tmp/test-scheduler")

    # Create jobs
    jobs = [
        ("test-sched-1", 100, None),  # Independent job
        ("test-sched-2", 90, "test-sched-1"),  # Depends on job 1
        ("test-sched-3", 80, "test-sched-2"),  # Depends on job 2
        ("test-sched-4", 100, None),  # Independent job
    ]

    for job_id, priority, depends_on in jobs:
        workflow_db.create_job(
            job_id=job_id,
            project_id=project_id,
            workflow_id="test-workflow",
            workflow_version=1,
            workflow_mode="test"
        )
        # Set priority
        workflow_db.conn.execute("""
            UPDATE jobs SET priority = ? WHERE job_id = ?
        """, (priority, job_id))
        workflow_db.conn.commit()

        # Add dependency
        if depends_on:
            scheduler_db.add_job_dependency(job_id, depends_on, "success")

    print(f"✅ Created {len(jobs)} test jobs with dependencies")

    workflow_db.close()
    scheduler_db.close()

    # Initialize scheduler
    scheduler = LocalScheduler(max_concurrent_jobs=2)

    try:
        # Test 1: Find runnable jobs
        print("\n📋 Test 1: Finding runnable jobs")
        runnable = scheduler.find_runnable_jobs(limit=10)
        print(f"✅ Found {len(runnable)} runnable job(s)")
        assert len(runnable) >= 2  # Should have at least 2 independent jobs

        # Test 2: Claim a job
        print("\n📋 Test 2: Claiming a job")
        job_to_claim = runnable[0]['job_id']
        claimed = scheduler.claim_job(job_to_claim)
        print(f"✅ Claimed job: {job_to_claim} = {claimed}")
        assert claimed

        # Try to claim again (should fail)
        claimed_again = scheduler.claim_job(job_to_claim)
        print(f"✅ Duplicate claim blocked: {not claimed_again}")
        assert not claimed_again

        # Test 3: Renew lease
        print("\n📋 Test 3: Renewing lease")
        renewed = scheduler.renew_lease(job_to_claim)
        print(f"✅ Lease renewed: {renewed}")
        assert renewed

        # Test 4: Resource locks
        print("\n📋 Test 4: Resource locks")
        locked = scheduler.acquire_resource_lock(job_to_claim, "repo:test/repo", "exclusive")
        print(f"✅ Resource locked: {locked}")
        assert locked

        available = scheduler.check_resource_available("repo:test/repo", "shared")
        print(f"✅ Resource conflict detected: {not available}")
        assert not available

        # Test 5: Release job
        print("\n📋 Test 5: Releasing job")
        scheduler.release_job(job_to_claim, "completed")
        print(f"✅ Job released: {job_to_claim}")

        # Check if dependent job is unblocked
        runnable_after = scheduler.find_runnable_jobs(limit=10)
        print(f"✅ Runnable jobs after release: {len(runnable_after)}")

        # Test 6: Scheduler stats
        print("\n📋 Test 6: Scheduler statistics")
        stats = scheduler.get_scheduler_stats()
        print(f"✅ Stats retrieved:")
        print(f"   - Runnable: {stats['runnable_jobs']}")
        print(f"   - Blocked: {stats['blocked_jobs']}")
        print(f"   - Active leases: {stats['active_leases']}")

        # Print final stats
        scheduler.print_stats()

        print("\n" + "=" * 60)
        print("✅ All LocalScheduler tests passed!")

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
    finally:
        scheduler.close()


if __name__ == "__main__":
    test_local_scheduler()
