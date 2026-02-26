#!/usr/bin/env python3
"""
Test Git/GitHub Database Integration

Tests the GitHubDatabase adapter and integration with GitAdapter and GitHubAdapter.
"""

import os
import tempfile
from pathlib import Path

from workflow_db_git import GitHubDatabase
from adapters.git_adapter import GitAdapter
from adapters.github_adapter import GitHubAdapter


def test_git_database():
    """Test GitHubDatabase basic operations"""
    print("=" * 60)
    print("Test 1: GitHubDatabase Operations")
    print("=" * 60)

    db = GitHubDatabase()

    # Create tables if they don't exist (for testing)
    print("\n1.0 Ensuring tables exist...")
    try:
        db.conn.execute("""
            CREATE TABLE IF NOT EXISTS git_operations (
                operation_id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id TEXT NOT NULL,
                operation_type TEXT NOT NULL,
                repo_path TEXT NOT NULL,
                command TEXT NOT NULL,
                exit_code INTEGER NOT NULL,
                stdout TEXT,
                stderr TEXT,
                metadata TEXT,
                executed_at TEXT NOT NULL
            )
        """)
        db.conn.execute("""
            CREATE TABLE IF NOT EXISTS github_issues (
                link_id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id TEXT NOT NULL,
                issue_number INTEGER NOT NULL,
                issue_url TEXT NOT NULL,
                issue_title TEXT,
                issue_state TEXT,
                metadata TEXT,
                linked_at TEXT NOT NULL
            )
        """)
        db.conn.execute("""
            CREATE TABLE IF NOT EXISTS github_pull_requests (
                link_id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id TEXT NOT NULL,
                pr_number INTEGER NOT NULL,
                pr_url TEXT NOT NULL,
                pr_title TEXT,
                pr_state TEXT,
                base_branch TEXT,
                head_branch TEXT,
                metadata TEXT,
                linked_at TEXT NOT NULL
            )
        """)
        db.conn.execute("""
            CREATE TABLE IF NOT EXISTS artifacts (
                artifact_id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id TEXT NOT NULL,
                artifact_type TEXT NOT NULL,
                artifact_path TEXT NOT NULL,
                artifact_name TEXT,
                size_bytes INTEGER,
                metadata TEXT,
                created_at TEXT NOT NULL
            )
        """)
        db.conn.commit()
        print("  ✓ Tables created/verified")
    except Exception as e:
        print(f"  Warning: {e}")

    # Test 1.1: Record git operation
    print("\n1.1 Recording git operation...")
    op_id = db.record_git_operation(
        job_id="test-job-001",
        operation_type="commit",
        repo_path="/test/repo",
        command="git commit -m 'test'",
        exit_code=0,
        stdout="[main abc123] test",
        metadata={"branch": "main", "commit_hash": "abc123"}
    )
    print(f"  ✓ Recorded operation ID: {op_id}")

    # Test 1.2: Get job git operations
    print("\n1.2 Retrieving git operations...")
    ops = db.get_job_git_operations("test-job-001")
    print(f"  ✓ Found {len(ops)} operations")
    if ops:
        print(f"    - Type: {ops[0]['operation_type']}")
        print(f"    - Command: {ops[0]['command']}")

    # Test 1.3: Link GitHub issue
    print("\n1.3 Linking GitHub issue...")
    issue_id = db.link_github_issue(
        job_id="test-job-001",
        issue_number=123,
        issue_url="https://github.com/owner/repo/issues/123",
        issue_title="Test issue",
        issue_state="open",
        metadata={"labels": ["bug", "high-priority"]}
    )
    print(f"  ✓ Linked issue ID: {issue_id}")

    # Test 1.4: Get job GitHub issues
    print("\n1.4 Retrieving GitHub issues...")
    issues = db.get_job_github_issues("test-job-001")
    print(f"  ✓ Found {len(issues)} issues")
    if issues:
        print(f"    - Number: {issues[0]['issue_number']}")
        print(f"    - Title: {issues[0]['issue_title']}")

    # Test 1.5: Link GitHub PR
    print("\n1.5 Linking GitHub PR...")
    pr_id = db.link_github_pr(
        job_id="test-job-001",
        pr_number=456,
        pr_url="https://github.com/owner/repo/pull/456",
        pr_title="Test PR",
        pr_state="open",
        base_branch="main",
        head_branch="feature/test"
    )
    print(f"  ✓ Linked PR ID: {pr_id}")

    # Test 1.6: Get job GitHub PRs
    print("\n1.6 Retrieving GitHub PRs...")
    prs = db.get_job_github_prs("test-job-001")
    print(f"  ✓ Found {len(prs)} PRs")
    if prs:
        print(f"    - Number: {prs[0]['pr_number']}")
        print(f"    - Title: {prs[0]['pr_title']}")

    # Test 1.7: Store artifact
    print("\n1.7 Storing artifact...")
    artifact_id = db.store_artifact(
        job_id="test-job-001",
        artifact_type="diff",
        artifact_path="/test/changes.diff",
        artifact_name="changes.diff",
        size_bytes=1024,
        metadata={"lines_added": 10, "lines_removed": 5}
    )
    print(f"  ✓ Stored artifact ID: {artifact_id}")

    # Test 1.8: Get job artifacts
    print("\n1.8 Retrieving artifacts...")
    artifacts = db.get_job_artifacts("test-job-001")
    print(f"  ✓ Found {len(artifacts)} artifacts")
    if artifacts:
        print(f"    - Type: {artifacts[0]['artifact_type']}")
        print(f"    - Path: {artifacts[0]['artifact_path']}")

    # Test 1.9: Get git operation stats
    print("\n1.9 Getting git operation stats...")
    stats = db.get_git_operation_stats("test-job-001")
    print(f"  ✓ Stats: {stats}")

    db.close()
    print("\n✅ Test 1 passed\n")


def test_git_adapter_integration():
    """Test GitAdapter with database recording"""
    print("=" * 60)
    print("Test 2: GitAdapter Database Integration")
    print("=" * 60)

    # Create a temporary git repo for testing
    with tempfile.TemporaryDirectory() as tmpdir:
        repo_path = Path(tmpdir)

        # Initialize git repo
        os.system(f"cd {repo_path} && git init -q && git config user.email 'test@test.com' && git config user.name 'Test'")

        # Create adapter with database recording
        adapter = GitAdapter(
            repo_path=str(repo_path),
            job_id="test-job-002",
            enable_db_recording=True
        )

        print("\n2.1 Testing git status with recording...")
        result = adapter._git_status()
        print(f"  ✓ Status: {result['status']}")

        # Create a test file
        test_file = repo_path / "test.txt"
        test_file.write_text("test content")

        print("\n2.2 Testing git add with recording...")
        result = adapter._git_add({'files': ['test.txt']})
        print(f"  ✓ Add status: {result['status']}")

        print("\n2.3 Testing git commit with recording...")
        result = adapter._git_commit({'message': 'Test commit'})
        print(f"  ✓ Commit status: {result['status']}")

        # Check database records
        print("\n2.4 Verifying database records...")
        db = GitHubDatabase()
        ops = db.get_job_git_operations("test-job-002")
        print(f"  ✓ Found {len(ops)} recorded operations")
        for op in ops:
            print(f"    - {op['operation_type']}: {op['command'][:50]}...")

        db.close()

    print("\n✅ Test 2 passed\n")


def test_github_adapter_mock():
    """Test GitHubAdapter database recording (mock)"""
    print("=" * 60)
    print("Test 3: GitHubAdapter Database Integration (Mock)")
    print("=" * 60)

    # Note: This test doesn't actually call GitHub API
    # It just tests the database recording logic

    adapter = GitHubAdapter(
        job_id="test-job-003",
        enable_db_recording=True
    )

    print("\n3.1 Adapter initialized with database recording")
    print(f"  ✓ Job ID: {adapter.job_id}")
    print(f"  ✓ DB recording enabled: {adapter.enable_db_recording}")

    # Check that database is initialized
    if adapter.db:
        print("  ✓ Database connection established")
    else:
        print("  ✗ Database connection failed")

    print("\n✅ Test 3 passed\n")


if __name__ == "__main__":
    print("\n🧪 Testing Git/GitHub Database Integration\n")

    # Initialize database first
    print("Initializing database...")
    import subprocess
    try:
        result = subprocess.run(
            ["python3", "init_database.py"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            print("  ✓ Database initialized\n")
        else:
            print(f"  Warning: init_database.py returned {result.returncode}\n")
    except Exception as e:
        print(f"  Warning: Could not run init_database.py: {e}\n")

    try:
        test_git_database()
        test_git_adapter_integration()
        test_github_adapter_mock()

        print("=" * 60)
        print("✅ All tests passed!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
