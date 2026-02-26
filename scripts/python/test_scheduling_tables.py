#!/usr/bin/env python3
"""
Test script for scheduling tables
Tests the 4 new scheduling tables: job_dependencies, job_leases, resource_locks, scheduler_events
"""

import sqlite3
import sys
from pathlib import Path
from datetime import datetime, timedelta

def test_scheduling_tables():
    """Test the new scheduling tables"""

    db_path = Path(".product-builder/workflow.db")
    if not db_path.exists():
        print(f"❌ Database not found: {db_path}")
        sys.exit(1)

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    print("🧪 Testing Scheduling Tables")
    print("=" * 60)

    try:
        # Test 1: Create test jobs
        print("\n📋 Test 1: Creating test jobs...")
        test_project_id = "test-project-scheduling"

        # Create project if not exists
        cursor.execute("""
            INSERT OR IGNORE INTO projects (project_id, name, root_path)
            VALUES (?, ?, ?)
        """, (test_project_id, "Test Scheduling Project", "/tmp/test-scheduling"))

        # Create test jobs
        jobs_data = [
            ("job-001", "Job 1 - Independent", 100),
            ("job-002", "Job 2 - Depends on Job 1", 90),
            ("job-003", "Job 3 - Depends on Job 2", 80),
            ("job-004", "Job 4 - Independent", 100),
        ]

        for job_id, metadata, priority in jobs_data:
            cursor.execute("""
                INSERT OR REPLACE INTO jobs (
                    job_id, project_id, workflow_id, workflow_version,
                    workflow_mode, status, priority, scheduler_state, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (job_id, test_project_id, "test-workflow", 1, "test",
                  "pending", priority, "queued", metadata))

        conn.commit()
        print(f"✅ Created {len(jobs_data)} test jobs")

        # Test 2: Job Dependencies
        print("\n📋 Test 2: Testing job_dependencies...")
        dependencies = [
            ("job-002", "job-001", "success"),  # Job 2 depends on Job 1
            ("job-003", "job-002", "success"),  # Job 3 depends on Job 2
        ]

        for job_id, depends_on, dep_type in dependencies:
            cursor.execute("""
                INSERT INTO job_dependencies (job_id, depends_on_job_id, dependency_type)
                VALUES (?, ?, ?)
            """, (job_id, depends_on, dep_type))

        conn.commit()

        # Query dependencies
        cursor.execute("""
            SELECT jd.job_id, jd.depends_on_job_id, jd.dependency_type,
                   j1.metadata as job_name, j2.metadata as depends_on_name
            FROM job_dependencies jd
            JOIN jobs j1 ON jd.job_id = j1.job_id
            JOIN jobs j2 ON jd.depends_on_job_id = j2.job_id
        """)

        deps = cursor.fetchall()
        print(f"✅ Created {len(dependencies)} dependencies:")
        for dep in deps:
            print(f"   - {dep['job_name']} depends on {dep['depends_on_name']} ({dep['dependency_type']})")

        # Test 3: Job Leases
        print("\n📋 Test 3: Testing job_leases...")
        lease_owner = "worker-001"
        lease_expires = (datetime.now() + timedelta(minutes=5)).isoformat()

        cursor.execute("""
            INSERT INTO job_leases (job_id, lease_owner, lease_expires_at, heartbeat_at)
            VALUES (?, ?, ?, datetime('now'))
        """, ("job-001", lease_owner, lease_expires))

        conn.commit()

        # Query leases
        cursor.execute("""
            SELECT jl.job_id, jl.lease_owner, jl.lease_expires_at,
                   j.metadata as job_name, j.scheduler_state
            FROM job_leases jl
            JOIN jobs j ON jl.job_id = j.job_id
        """)

        leases = cursor.fetchall()
        print(f"✅ Created {len(leases)} lease(s):")
        for lease in leases:
            print(f"   - {lease['job_name']} leased by {lease['lease_owner']}")
            print(f"     Expires: {lease['lease_expires_at']}")

        # Test 4: Resource Locks
        print("\n📋 Test 4: Testing resource_locks...")
        locks_data = [
            ("repo:owner/repo1", "exclusive", "job-001", None),
            ("worktree:/tmp/worktree1", "exclusive", "job-001", "step-1"),
            ("provider:codex", "shared", "job-002", None),
        ]

        for lock_key, lock_mode, owner_job, owner_step in locks_data:
            cursor.execute("""
                INSERT INTO resource_locks (lock_key, lock_mode, owner_job_id, owner_step_id)
                VALUES (?, ?, ?, ?)
            """, (lock_key, lock_mode, owner_job, owner_step))

        conn.commit()

        # Query locks
        cursor.execute("""
            SELECT rl.lock_key, rl.lock_mode, rl.owner_job_id, rl.owner_step_id,
                   j.metadata as job_name
            FROM resource_locks rl
            JOIN jobs j ON rl.owner_job_id = j.job_id
        """)

        locks = cursor.fetchall()
        print(f"✅ Created {len(locks)} resource lock(s):")
        for lock in locks:
            step_info = f" (step: {lock['owner_step_id']})" if lock['owner_step_id'] else ""
            print(f"   - {lock['lock_key']} ({lock['lock_mode']}) by {lock['job_name']}{step_info}")

        # Test 5: Scheduler Events
        print("\n📋 Test 5: Testing scheduler_events...")
        events_data = [
            ("job-001", "dispatched", '{"worker": "worker-001"}'),
            ("job-002", "blocked", '{"reason": "waiting for job-001"}'),
            ("job-004", "dispatched", '{"worker": "worker-002"}'),
        ]

        for job_id, event_type, payload in events_data:
            cursor.execute("""
                INSERT INTO scheduler_events (job_id, event_type, payload_json)
                VALUES (?, ?, ?)
            """, (job_id, event_type, payload))

        conn.commit()

        # Query events
        cursor.execute("""
            SELECT se.event_id, se.job_id, se.event_type, se.payload_json,
                   j.metadata as job_name, se.created_at
            FROM scheduler_events se
            JOIN jobs j ON se.job_id = j.job_id
            ORDER BY se.created_at
        """)

        events = cursor.fetchall()
        print(f"✅ Created {len(events)} scheduler event(s):")
        for event in events:
            print(f"   - {event['job_name']}: {event['event_type']}")
            print(f"     Payload: {event['payload_json']}")

        # Test 6: Query runnable jobs (no dependencies or dependencies satisfied)
        print("\n📋 Test 6: Finding runnable jobs...")
        cursor.execute("""
            SELECT j.job_id, j.metadata, j.priority, j.scheduler_state
            FROM jobs j
            WHERE j.scheduler_state = 'queued'
              AND j.job_id NOT IN (
                  SELECT jd.job_id
                  FROM job_dependencies jd
                  JOIN jobs dep_job ON jd.depends_on_job_id = dep_job.job_id
                  WHERE dep_job.status != 'completed'
              )
              AND j.job_id NOT IN (SELECT job_id FROM job_leases)
            ORDER BY j.priority DESC, j.queued_at
        """)

        runnable = cursor.fetchall()
        print(f"✅ Found {len(runnable)} runnable job(s):")
        for job in runnable:
            print(f"   - {job['metadata']} (priority: {job['priority']})")

        # Summary
        print("\n" + "=" * 60)
        print("✅ All scheduling table tests passed!")
        print("\n📊 Summary:")
        print(f"   - Jobs: {len(jobs_data)}")
        print(f"   - Dependencies: {len(dependencies)}")
        print(f"   - Leases: {len(leases)}")
        print(f"   - Resource Locks: {len(locks)}")
        print(f"   - Scheduler Events: {len(events)}")
        print(f"   - Runnable Jobs: {len(runnable)}")

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    test_scheduling_tables()
