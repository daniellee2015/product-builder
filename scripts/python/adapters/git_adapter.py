#!/usr/bin/env python3
"""
Git Adapter for Product Builder Workflow Executor
Provides git operations with structured output and automatic database recording
"""

import subprocess
import json
import sys
from typing import Dict, Any, List, Optional
from pathlib import Path

# Import GitHubDatabase for recording operations
try:
    from workflow_db_git import GitHubDatabase
except ImportError:
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from workflow_db_git import GitHubDatabase


class GitAdapter:
    """Adapter for git operations with automatic database recording"""

    def __init__(self, repo_path: str = ".", job_id: Optional[str] = None, enable_db_recording: bool = True):
        """
        Initialize GitAdapter.

        Args:
            repo_path: Path to git repository
            job_id: Job ID for database recording
            enable_db_recording: Whether to record operations to database
        """
        self.repo_path = Path(repo_path)
        self.job_id = job_id
        self.enable_db_recording = enable_db_recording
        self.db = GitHubDatabase() if enable_db_recording else None

    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a git operation

        Args:
            task: Task configuration with 'operation' and parameters
            context: Execution context

        Returns:
            {
                'status': 'success' | 'failed',
                'output': str,
                'error': str | None
            }
        """
        operation = task.get('operation', 'status')

        try:
            if operation == 'status':
                return self._git_status()
            elif operation == 'commit':
                return self._git_commit(task)
            elif operation == 'push':
                return self._git_push(task)
            elif operation == 'branch':
                return self._git_branch(task)
            elif operation == 'add':
                return self._git_add(task)
            elif operation == 'diff':
                return self._git_diff(task)
            else:
                return {
                    'status': 'failed',
                    'output': '',
                    'error': f"Unknown git operation: {operation}"
                }
        except Exception as e:
            return {
                'status': 'failed',
                'output': '',
                'error': str(e)
            }

    def _run_git_command(self, args: List[str], operation_type: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Run a git command and return structured output.
        Automatically records operation to database if enabled.

        Args:
            args: Git command arguments
            operation_type: Type of operation (for database recording)
            metadata: Additional metadata to store

        Returns:
            Result dict with status, output, error
        """
        command = 'git ' + ' '.join(args)

        try:
            result = subprocess.run(
                ['git'] + args,
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=30
            )

            # Record to database if enabled
            if self.enable_db_recording and self.db and self.job_id:
                try:
                    self.db.record_git_operation(
                        job_id=self.job_id,
                        operation_type=operation_type or args[0],
                        repo_path=str(self.repo_path),
                        command=command,
                        exit_code=result.returncode,
                        stdout=result.stdout.strip() if result.stdout else None,
                        stderr=result.stderr.strip() if result.stderr else None,
                        metadata=metadata
                    )
                except Exception as e:
                    # Don't fail the operation if database recording fails
                    print(f"Warning: Failed to record git operation to database: {e}")

            return {
                'status': 'success' if result.returncode == 0 else 'failed',
                'output': result.stdout.strip(),
                'error': result.stderr.strip() if result.returncode != 0 else None,
                'exit_code': result.returncode
            }
        except subprocess.TimeoutExpired:
            # Record timeout to database
            if self.enable_db_recording and self.db and self.job_id:
                try:
                    self.db.record_git_operation(
                        job_id=self.job_id,
                        operation_type=operation_type or args[0],
                        repo_path=str(self.repo_path),
                        command=command,
                        exit_code=-1,
                        stderr="Git command timed out after 30 seconds",
                        metadata=metadata
                    )
                except Exception:
                    pass

            return {
                'status': 'failed',
                'output': '',
                'error': 'Git command timed out after 30 seconds',
                'exit_code': -1
            }
        except Exception as e:
            # Record error to database
            if self.enable_db_recording and self.db and self.job_id:
                try:
                    self.db.record_git_operation(
                        job_id=self.job_id,
                        operation_type=operation_type or args[0],
                        repo_path=str(self.repo_path),
                        command=command,
                        exit_code=-1,
                        stderr=str(e),
                        metadata=metadata
                    )
                except Exception:
                    pass

            return {
                'status': 'failed',
                'output': '',
                'error': str(e),
                'exit_code': -1
            }

    def _git_status(self) -> Dict[str, Any]:
        """Get git status"""
        return self._run_git_command(['status', '--porcelain'], operation_type='status')

    def _git_add(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Stage files for commit"""
        files = task.get('files', [])
        if not files:
            return {
                'status': 'failed',
                'output': '',
                'error': 'No files specified for git add'
            }

        return self._run_git_command(
            ['add'] + files,
            operation_type='add',
            metadata={'files': files}
        )

    def _git_commit(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Create a git commit"""
        message = task.get('message')
        if not message:
            return {
                'status': 'failed',
                'output': '',
                'error': 'No commit message specified'
            }

        result = self._run_git_command(
            ['commit', '-m', message],
            operation_type='commit',
            metadata={'message': message}
        )

        # Extract commit hash if successful
        if result['status'] == 'success' and result.get('output'):
            # Try to get commit hash
            hash_result = self._run_git_command(['rev-parse', 'HEAD'], operation_type='rev-parse')
            if hash_result['status'] == 'success':
                result['commit_hash'] = hash_result['output']

        return result

    def _git_push(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Push commits to remote"""
        remote = task.get('remote', 'origin')
        branch = task.get('branch', 'main')

        args = ['push', remote, branch]
        if task.get('force', False):
            args.insert(1, '--force')

        return self._run_git_command(
            args,
            operation_type='push',
            metadata={'remote': remote, 'branch': branch, 'force': task.get('force', False)}
        )

    def _git_branch(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Branch operations"""
        action = task.get('action', 'list')

        if action == 'list':
            return self._run_git_command(['branch', '-a'])
        elif action == 'create':
            branch_name = task.get('name')
            if not branch_name:
                return {
                    'status': 'failed',
                    'output': '',
                    'error': 'No branch name specified'
                }
            return self._run_git_command(['branch', branch_name])
        elif action == 'checkout':
            branch_name = task.get('name')
            if not branch_name:
                return {
                    'status': 'failed',
                    'output': '',
                    'error': 'No branch name specified'
                }
            return self._run_git_command(['checkout', branch_name])
        else:
            return {
                'status': 'failed',
                'output': '',
                'error': f"Unknown branch action: {action}"
            }

    def _git_diff(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Show git diff"""
        args = ['diff']

        if task.get('cached', False):
            args.append('--cached')

        if task.get('stat', False):
            args.append('--stat')

        files = task.get('files', [])
        if files:
            args.extend(files)

        return self._run_git_command(args)


if __name__ == '__main__':
    # Test the adapter
    adapter = GitAdapter()

    # Test git status
    result = adapter.execute({'operation': 'status'}, {})
    print(json.dumps(result, indent=2))
