#!/usr/bin/env python3
"""
Git/GitHub Database Adapter

Provides database operations for Git/GitHub integration tables:
- git_operations: Record all git operations
- github_issues: Link GitHub issues to jobs
- github_pull_requests: Link GitHub PRs to jobs
- artifacts: Store build artifacts and outputs
"""

import sqlite3
import json
from typing import Optional, Dict, Any, List
from datetime import datetime
from pathlib import Path


class GitHubDatabase:
    """Database adapter for Git/GitHub operations"""

    def __init__(self, db_path: str = "workflow.db"):
        """
        Initialize Git/GitHub database adapter.

        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path, timeout=5000)
        self.conn.row_factory = sqlite3.Row
        # Enable WAL mode for better concurrency
        self.conn.execute("PRAGMA journal_mode=WAL")

    def record_git_operation(
        self,
        job_id: str,
        operation_type: str,
        repo_path: str,
        command: str,
        exit_code: int,
        stdout: Optional[str] = None,
        stderr: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> int:
        """
        Record a git operation to the database.

        Args:
            job_id: Job ID that performed the operation
            operation_type: Type of operation (clone, pull, push, commit, etc.)
            repo_path: Path to the repository
            command: Full git command executed
            exit_code: Exit code of the command
            stdout: Standard output
            stderr: Standard error
            metadata: Additional metadata (branch, commit_hash, etc.)

        Returns:
            operation_id: ID of the recorded operation
        """
        cursor = self.conn.execute("""
            INSERT INTO git_operations (
                job_id, operation_type, repo_path, command,
                exit_code, stdout, stderr, metadata, executed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        """, (
            job_id,
            operation_type,
            repo_path,
            command,
            exit_code,
            stdout,
            stderr,
            json.dumps(metadata) if metadata else None
        ))

        self.conn.commit()
        return cursor.lastrowid

    def get_job_git_operations(
        self,
        job_id: str,
        operation_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get all git operations for a job.

        Args:
            job_id: Job ID
            operation_type: Optional filter by operation type

        Returns:
            List of git operations
        """
        if operation_type:
            cursor = self.conn.execute("""
                SELECT * FROM git_operations
                WHERE job_id = ? AND operation_type = ?
                ORDER BY executed_at DESC
            """, (job_id, operation_type))
        else:
            cursor = self.conn.execute("""
                SELECT * FROM git_operations
                WHERE job_id = ?
                ORDER BY executed_at DESC
            """, (job_id,))

        return [dict(row) for row in cursor.fetchall()]

    def link_github_issue(
        self,
        job_id: str,
        issue_number: int,
        issue_url: str,
        issue_title: Optional[str] = None,
        issue_state: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> int:
        """
        Link a GitHub issue to a job.

        Args:
            job_id: Job ID
            issue_number: GitHub issue number
            issue_url: Full URL to the issue
            issue_title: Issue title
            issue_state: Issue state (open, closed)
            metadata: Additional metadata

        Returns:
            link_id: ID of the link record
        """
        cursor = self.conn.execute("""
            INSERT INTO github_issues (
                job_id, issue_number, issue_url, issue_title,
                issue_state, metadata, linked_at
            ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        """, (
            job_id,
            issue_number,
            issue_url,
            issue_title,
            issue_state,
            json.dumps(metadata) if metadata else None
        ))

        self.conn.commit()
        return cursor.lastrowid

    def get_job_github_issues(self, job_id: str) -> List[Dict[str, Any]]:
        """
        Get all GitHub issues linked to a job.

        Args:
            job_id: Job ID

        Returns:
            List of linked issues
        """
        cursor = self.conn.execute("""
            SELECT * FROM github_issues
            WHERE job_id = ?
            ORDER BY linked_at DESC
        """, (job_id,))

        return [dict(row) for row in cursor.fetchall()]

    def link_github_pr(
        self,
        job_id: str,
        pr_number: int,
        pr_url: str,
        pr_title: Optional[str] = None,
        pr_state: Optional[str] = None,
        base_branch: Optional[str] = None,
        head_branch: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> int:
        """
        Link a GitHub pull request to a job.

        Args:
            job_id: Job ID
            pr_number: PR number
            pr_url: Full URL to the PR
            pr_title: PR title
            pr_state: PR state (open, closed, merged)
            base_branch: Base branch
            head_branch: Head branch
            metadata: Additional metadata

        Returns:
            link_id: ID of the link record
        """
        cursor = self.conn.execute("""
            INSERT INTO github_pull_requests (
                job_id, pr_number, pr_url, pr_title, pr_state,
                base_branch, head_branch, metadata, linked_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        """, (
            job_id,
            pr_number,
            pr_url,
            pr_title,
            pr_state,
            base_branch,
            head_branch,
            json.dumps(metadata) if metadata else None
        ))

        self.conn.commit()
        return cursor.lastrowid

    def get_job_github_prs(self, job_id: str) -> List[Dict[str, Any]]:
        """
        Get all GitHub PRs linked to a job.

        Args:
            job_id: Job ID

        Returns:
            List of linked PRs
        """
        cursor = self.conn.execute("""
            SELECT * FROM github_pull_requests
            WHERE job_id = ?
            ORDER BY linked_at DESC
        """, (job_id,))

        return [dict(row) for row in cursor.fetchall()]

    def store_artifact(
        self,
        job_id: str,
        artifact_type: str,
        artifact_path: str,
        artifact_name: Optional[str] = None,
        size_bytes: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> int:
        """
        Store an artifact reference in the database.

        Args:
            job_id: Job ID
            artifact_type: Type of artifact (diff, patch, log, binary, etc.)
            artifact_path: Path to the artifact file
            artifact_name: Human-readable name
            size_bytes: Size in bytes
            metadata: Additional metadata

        Returns:
            artifact_id: ID of the artifact record
        """
        # Get file size if not provided
        if size_bytes is None and Path(artifact_path).exists():
            size_bytes = Path(artifact_path).stat().st_size

        cursor = self.conn.execute("""
            INSERT INTO artifacts (
                job_id, artifact_type, artifact_path, artifact_name,
                size_bytes, metadata, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        """, (
            job_id,
            artifact_type,
            artifact_path,
            artifact_name or Path(artifact_path).name,
            size_bytes,
            json.dumps(metadata) if metadata else None
        ))

        self.conn.commit()
        return cursor.lastrowid

    def get_job_artifacts(
        self,
        job_id: str,
        artifact_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get all artifacts for a job.

        Args:
            job_id: Job ID
            artifact_type: Optional filter by artifact type

        Returns:
            List of artifacts
        """
        if artifact_type:
            cursor = self.conn.execute("""
                SELECT * FROM artifacts
                WHERE job_id = ? AND artifact_type = ?
                ORDER BY created_at DESC
            """, (job_id, artifact_type))
        else:
            cursor = self.conn.execute("""
                SELECT * FROM artifacts
                WHERE job_id = ?
                ORDER BY created_at DESC
            """, (job_id,))

        return [dict(row) for row in cursor.fetchall()]

    def update_github_issue_state(
        self,
        job_id: str,
        issue_number: int,
        new_state: str
    ) -> bool:
        """
        Update the state of a linked GitHub issue.

        Args:
            job_id: Job ID
            issue_number: Issue number
            new_state: New state (open, closed)

        Returns:
            True if updated, False if not found
        """
        cursor = self.conn.execute("""
            UPDATE github_issues
            SET issue_state = ?
            WHERE job_id = ? AND issue_number = ?
        """, (new_state, job_id, issue_number))

        self.conn.commit()
        return cursor.rowcount > 0

    def update_github_pr_state(
        self,
        job_id: str,
        pr_number: int,
        new_state: str
    ) -> bool:
        """
        Update the state of a linked GitHub PR.

        Args:
            job_id: Job ID
            pr_number: PR number
            new_state: New state (open, closed, merged)

        Returns:
            True if updated, False if not found
        """
        cursor = self.conn.execute("""
            UPDATE github_pull_requests
            SET pr_state = ?
            WHERE job_id = ? AND pr_number = ?
        """, (new_state, job_id, pr_number))

        self.conn.commit()
        return cursor.rowcount > 0

    def get_git_operation_stats(self, job_id: str) -> Dict[str, Any]:
        """
        Get statistics about git operations for a job.

        Args:
            job_id: Job ID

        Returns:
            Statistics dict
        """
        cursor = self.conn.execute("""
            SELECT
                operation_type,
                COUNT(*) as count,
                SUM(CASE WHEN exit_code = 0 THEN 1 ELSE 0 END) as success_count,
                SUM(CASE WHEN exit_code != 0 THEN 1 ELSE 0 END) as failure_count
            FROM git_operations
            WHERE job_id = ?
            GROUP BY operation_type
        """, (job_id,))

        stats = {}
        for row in cursor.fetchall():
            stats[row['operation_type']] = {
                'total': row['count'],
                'success': row['success_count'],
                'failure': row['failure_count']
            }

        return stats

    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()

    def __enter__(self):
        """Context manager entry"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.close()


if __name__ == "__main__":
    # Example usage
    db = GitHubDatabase()

    # Record a git operation
    op_id = db.record_git_operation(
        job_id="job-001",
        operation_type="commit",
        repo_path="/path/to/repo",
        command="git commit -m 'test'",
        exit_code=0,
        metadata={"branch": "main", "commit_hash": "abc123"}
    )
    print(f"Recorded git operation: {op_id}")

    # Link a GitHub issue
    issue_id = db.link_github_issue(
        job_id="job-001",
        issue_number=123,
        issue_url="https://github.com/owner/repo/issues/123",
        issue_title="Test issue",
        issue_state="open"
    )
    print(f"Linked GitHub issue: {issue_id}")

    # Store an artifact
    artifact_id = db.store_artifact(
        job_id="job-001",
        artifact_type="diff",
        artifact_path="/path/to/changes.diff",
        metadata={"lines_added": 10, "lines_removed": 5}
    )
    print(f"Stored artifact: {artifact_id}")

    db.close()

