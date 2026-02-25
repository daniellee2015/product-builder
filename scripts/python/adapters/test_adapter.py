#!/usr/bin/env python3
"""
Test Adapter for Product Builder Workflow Executor
Provides test execution with framework detection
"""

import subprocess
import json
from typing import Dict, Any, List
from pathlib import Path


class TestAdapter:
    """Adapter for running tests"""

    def __init__(self, project_path: str = "."):
        self.project_path = Path(project_path)

    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute tests

        Args:
            task: Task configuration with test parameters
            context: Execution context

        Returns:
            {
                'status': 'success' | 'failed',
                'output': str,
                'error': str | None
            }
        """
        try:
            # Detect test framework if not specified
            framework = task.get('framework')
            if not framework:
                framework = self._detect_framework()

            if not framework:
                return {
                    'status': 'failed',
                    'output': '',
                    'error': 'Could not detect test framework'
                }

            # Run tests based on framework
            if framework == 'pytest':
                return self._run_pytest(task)
            elif framework == 'jest':
                return self._run_jest(task)
            elif framework == 'vitest':
                return self._run_vitest(task)
            elif framework == 'mocha':
                return self._run_mocha(task)
            else:
                return {
                    'status': 'failed',
                    'output': '',
                    'error': f"Unsupported test framework: {framework}"
                }
        except Exception as e:
            return {
                'status': 'failed',
                'output': '',
                'error': str(e)
            }

    def _detect_framework(self) -> str:
        """Detect test framework from project files"""
        # Check for Python test frameworks
        if (self.project_path / 'pytest.ini').exists() or \
           (self.project_path / 'setup.cfg').exists():
            return 'pytest'

        # Check for JavaScript test frameworks
        package_json = self.project_path / 'package.json'
        if package_json.exists():
            try:
                with open(package_json) as f:
                    data = json.load(f)
                    deps = {**data.get('dependencies', {}), **data.get('devDependencies', {})}

                    if 'vitest' in deps:
                        return 'vitest'
                    elif 'jest' in deps:
                        return 'jest'
                    elif 'mocha' in deps:
                        return 'mocha'
            except:
                pass

        return None

    def _run_command(self, cmd: List[str]) -> Dict[str, Any]:
        """Run a test command and return structured output"""
        try:
            result = subprocess.run(
                cmd,
                cwd=self.project_path,
                capture_output=True,
                text=True,
                timeout=300  # 5 minutes timeout
            )

            # Test commands return non-zero on test failures
            # Treat non-zero exit as failed status
            status = 'success' if result.returncode == 0 else 'failed'
            error = None if result.returncode == 0 else f"Tests failed with exit code {result.returncode}"

            return {
                'status': status,
                'output': result.stdout + '\n' + result.stderr,
                'error': error,
                'exit_code': result.returncode
            }
        except subprocess.TimeoutExpired:
            return {
                'status': 'failed',
                'output': '',
                'error': 'Tests timed out after 5 minutes'
            }
        except Exception as e:
            return {
                'status': 'failed',
                'output': '',
                'error': str(e)
            }

    def _run_pytest(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Run pytest tests"""
        cmd = ['pytest']

        # Add verbose flag
        if task.get('verbose', False):
            cmd.append('-v')

        # Add coverage flag
        if task.get('coverage', False):
            cmd.extend(['--cov', '--cov-report=term'])

        # Add specific test paths
        paths = task.get('paths', [])
        if paths:
            cmd.extend(paths)

        # Add markers
        markers = task.get('markers', [])
        for marker in markers:
            cmd.extend(['-m', marker])

        return self._run_command(cmd)

    def _run_jest(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Run Jest tests"""
        cmd = ['npm', 'run', 'test', '--']

        # Add coverage flag
        if task.get('coverage', False):
            cmd.append('--coverage')

        # Add specific test paths
        paths = task.get('paths', [])
        if paths:
            cmd.extend(paths)

        # Run in CI mode (no watch)
        cmd.append('--ci')

        return self._run_command(cmd)

    def _run_vitest(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Run Vitest tests"""
        cmd = ['npm', 'run', 'test', '--', '--run']

        # Add coverage flag
        if task.get('coverage', False):
            cmd.append('--coverage')

        # Add specific test paths
        paths = task.get('paths', [])
        if paths:
            cmd.extend(paths)

        return self._run_command(cmd)

    def _run_mocha(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Run Mocha tests"""
        cmd = ['npm', 'run', 'test']

        # Add specific test paths
        paths = task.get('paths', [])
        if paths:
            cmd.extend(paths)

        return self._run_command(cmd)


if __name__ == '__main__':
    # Test the adapter
    adapter = TestAdapter()

    # Detect framework
    framework = adapter._detect_framework()
    print(f"Detected framework: {framework}")

    # Test execution
    if framework:
        result = adapter.execute({'framework': framework}, {})
        print(json.dumps(result, indent=2))
