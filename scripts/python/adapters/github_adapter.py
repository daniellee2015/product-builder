#!/usr/bin/env python3
"""
GitHub Adapter for Product Builder Workflow Executor
Provides GitHub operations via gh CLI
"""

import subprocess
import json
from typing import Dict, Any, List


class GitHubAdapter:
    """Adapter for GitHub operations using gh CLI"""

    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a GitHub operation

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
            if operation == 'pr-create':
                return self._create_pr(task)
            elif operation == 'pr-list':
                return self._list_prs(task)
            elif operation == 'pr-merge':
                return self._merge_pr(task)
            elif operation == 'issue-create':
                return self._create_issue(task)
            elif operation == 'issue-list':
                return self._list_issues(task)
            elif operation == 'repo-view':
                return self._view_repo(task)
            else:
                return {
                    'status': 'failed',
                    'output': '',
                    'error': f"Unknown GitHub operation: {operation}"
                }
        except Exception as e:
            return {
                'status': 'failed',
                'output': '',
                'error': str(e)
            }

    def _run_gh_command(self, args: List[str]) -> Dict[str, Any]:
        """Run a gh command and return structured output"""
        try:
            result = subprocess.run(
                ['gh'] + args,
                capture_output=True,
                text=True,
                timeout=60
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
                'error': 'GitHub command timed out after 60 seconds'
            }
        except FileNotFoundError:
            return {
                'status': 'failed',
                'output': '',
                'error': 'gh CLI not found. Please install GitHub CLI: https://cli.github.com/'
            }
        except Exception as e:
            return {
                'status': 'failed',
                'output': '',
                'error': str(e)
            }

    def _create_pr(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Create a pull request"""
        title = task.get('title')
        body = task.get('body', '')
        base = task.get('base', 'main')
        head = task.get('head')

        if not title:
            return {
                'status': 'failed',
                'output': '',
                'error': 'No PR title specified'
            }

        args = ['pr', 'create', '--title', title, '--body', body, '--base', base]

        if head:
            args.extend(['--head', head])

        if task.get('draft', False):
            args.append('--draft')

        return self._run_gh_command(args)

    def _list_prs(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """List pull requests"""
        args = ['pr', 'list', '--json', 'number,title,state,author']

        state = task.get('state', 'open')
        if state:
            args.extend(['--state', state])

        limit = task.get('limit', 30)
        args.extend(['--limit', str(limit)])

        return self._run_gh_command(args)

    def _merge_pr(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Merge a pull request"""
        pr_number = task.get('number')
        if not pr_number:
            return {
                'status': 'failed',
                'output': '',
                'error': 'No PR number specified'
            }

        args = ['pr', 'merge', str(pr_number)]

        merge_method = task.get('method', 'merge')
        if merge_method == 'squash':
            args.append('--squash')
        elif merge_method == 'rebase':
            args.append('--rebase')

        if task.get('delete_branch', False):
            args.append('--delete-branch')

        return self._run_gh_command(args)

    def _create_issue(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Create an issue"""
        title = task.get('title')
        body = task.get('body', '')

        if not title:
            return {
                'status': 'failed',
                'output': '',
                'error': 'No issue title specified'
            }

        args = ['issue', 'create', '--title', title, '--body', body]

        labels = task.get('labels', [])
        if labels:
            args.extend(['--label', ','.join(labels)])

        assignees = task.get('assignees', [])
        if assignees:
            args.extend(['--assignee', ','.join(assignees)])

        return self._run_gh_command(args)

    def _list_issues(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """List issues"""
        args = ['issue', 'list', '--json', 'number,title,state,author']

        state = task.get('state', 'open')
        if state:
            args.extend(['--state', state])

        limit = task.get('limit', 30)
        args.extend(['--limit', str(limit)])

        labels = task.get('labels', [])
        if labels:
            args.extend(['--label', ','.join(labels)])

        return self._run_gh_command(args)

    def _view_repo(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """View repository information"""
        args = ['repo', 'view', '--json', 'name,description,url,defaultBranch']

        repo = task.get('repo')
        if repo:
            args.append(repo)

        return self._run_gh_command(args)


if __name__ == '__main__':
    # Test the adapter
    adapter = GitHubAdapter()

    # Test repo view
    result = adapter.execute({'operation': 'repo-view'}, {})
    print(json.dumps(result, indent=2))
