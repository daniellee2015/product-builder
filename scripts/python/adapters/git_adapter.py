#!/usr/bin/env python3
"""
Git Adapter for Product Builder Workflow Executor
Provides git operations with structured output
"""

import subprocess
import json
from typing import Dict, Any, List
from pathlib import Path


class GitAdapter:
    """Adapter for git operations"""

    def __init__(self, repo_path: str = "."):
        self.repo_path = Path(repo_path)

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

    def _run_git_command(self, args: List[str]) -> Dict[str, Any]:
        """Run a git command and return structured output"""
        try:
            result = subprocess.run(
                ['git'] + args,
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=30
            )

            return {
                'status': 'success' if result.returncode == 0 else 'failed',
                'output': result.stdout.strip(),
                'error': result.stderr.strip() if result.returncode != 0 else None
            }
        except subprocess.TimeoutExpired:
            return {
                'status': 'failed',
                'output': '',
                'error': 'Git command timed out after 30 seconds'
            }
        except Exception as e:
            return {
                'status': 'failed',
                'output': '',
                'error': str(e)
            }

    def _git_status(self) -> Dict[str, Any]:
        """Get git status"""
        return self._run_git_command(['status', '--porcelain'])

    def _git_add(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Stage files for commit"""
        files = task.get('files', [])
        if not files:
            return {
                'status': 'failed',
                'output': '',
                'error': 'No files specified for git add'
            }

        return self._run_git_command(['add'] + files)

    def _git_commit(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Create a git commit"""
        message = task.get('message')
        if not message:
            return {
                'status': 'failed',
                'output': '',
                'error': 'No commit message specified'
            }

        return self._run_git_command(['commit', '-m', message])

    def _git_push(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Push commits to remote"""
        remote = task.get('remote', 'origin')
        branch = task.get('branch', 'main')

        args = ['push', remote, branch]
        if task.get('force', False):
            args.insert(1, '--force')

        return self._run_git_command(args)

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
