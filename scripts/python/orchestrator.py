#!/usr/bin/env python3
"""
Product Builder - Workflow Orchestrator
CodeAct-based workflow execution engine with real LLM integration
"""

import json
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict, List, Any, Optional
import os

# Import adapters
try:
    from adapters import GitAdapter, GitHubAdapter, TestAdapter
except ImportError:
    # Fallback for when running from different directory
    sys.path.insert(0, str(Path(__file__).parent))
    from adapters import GitAdapter, GitHubAdapter, TestAdapter


class CodeActExecutor:
    """CodeAct execution layer - calls LLM to generate and execute code"""

    def __init__(self, llm_provider: str = "codex"):
        self.llm_provider = llm_provider

    def execute_task(self, task_prompt: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a task using CodeAct mode:
        1. Call LLM to generate Python code
        2. Execute the generated code
        3. Return standardized output
        """
        # Prepare the prompt with context
        full_prompt = self._prepare_prompt(task_prompt, context)

        # Call LLM CLI
        result = self._call_llm(full_prompt)

        return {
            'status': 'success' if result['exit_code'] == 0 else 'failed',
            'output': result['stdout'],
            'error': result['stderr'],
            'exit_code': result['exit_code']
        }

    def _prepare_prompt(self, task_prompt: str, context: Dict[str, Any]) -> str:
        """Prepare the prompt with context information"""
        prompt_parts = [
            "# Task",
            task_prompt,
            "",
            "# Context",
            f"Job ID: {context.get('job_id', 'N/A')}",
            f"Step ID: {context.get('step_id', 'N/A')}",
            "",
            "# Input Files"
        ]

        # Add input files information
        for input_file in context.get('input_files', []):
            if Path(input_file).exists():
                prompt_parts.append(f"- {input_file} (exists)")
            else:
                prompt_parts.append(f"- {input_file} (missing)")

        prompt_parts.extend([
            "",
            "# Expected Output",
            f"Output files: {', '.join(context.get('output_files', []))}",
            "",
            "# Instructions",
            "Generate Python code to complete this task.",
            "The code should:",
            "1. Read input files if needed",
            "2. Process the data",
            "3. Write output to the specified files",
            "4. Return a JSON result with status and summary"
        ])

        return "\\n".join(prompt_parts)

    def _call_llm(self, prompt: str) -> Dict[str, Any]:
        """Call LLM CLI to execute the task"""
        try:
            if self.llm_provider == "codex":
                cmd = [
                    'codex', 'exec',
                    '--full-auto',  # Auto-approve all actions
                    '--json',  # JSON output
                    '--sandbox', 'workspace-write',  # Allow writing to workspace
                    prompt
                ]
            elif self.llm_provider == "gemini":
                cmd = [
                    'gemini',
                    '-p', prompt,  # Non-interactive mode
                    '--yolo',  # Auto-approve all actions
                    '--output-format', 'json'
                ]
            else:
                raise ValueError(f"Unsupported LLM provider: {self.llm_provider}")

            # Execute the command
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5 minutes timeout
            )

            return {
                'stdout': result.stdout,
                'stderr': result.stderr,
                'exit_code': result.returncode
            }

        except subprocess.TimeoutExpired:
            return {
                'stdout': '',
                'stderr': 'Execution timeout (5 minutes)',
                'exit_code': 124
            }
        except Exception as e:
            return {
                'stdout': '',
                'stderr': str(e),
                'exit_code': 1
            }


class WorkflowOrchestrator:
    """Main workflow orchestrator using CodeAct approach"""

    def __init__(self, workflow_path: str, job_id: str, llm_provider: str = "codex", auto_approve: bool = False):
        self.workflow_path = Path(workflow_path)
        self.job_id = job_id
        self.workflow_data = self._load_workflow()
        self.execution_log = []
        self.executor = CodeActExecutor(llm_provider)
        self.state_file = Path(f".product-builder/jobs/{job_id}/state.json")
        self.state = self._load_state()
        self.auto_approve = auto_approve  # Explicit auto-approve flag

        # Initialize adapters
        self.adapters = {
            'git': GitAdapter(),
            'github': GitHubAdapter(),
            'gh': GitHubAdapter(),  # Alias
            'test': TestAdapter()
        }

    def _load_workflow(self) -> Dict[str, Any]:
        """Load workflow.json"""
        with open(self.workflow_path, 'r') as f:
            return json.load(f)

    def _load_state(self) -> Dict[str, Any]:
        """Load execution state from file"""
        if self.state_file.exists():
            with open(self.state_file, 'r') as f:
                return json.load(f)
        return {
            'current_phase': None,
            'current_step': None,
            'completed_steps': [],
            'status': 'idle',
            'variables': {}  # Runtime variables for condition evaluation
        }

    def _save_state(self):
        """Save execution state to file"""
        self.state_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.state_file, 'w') as f:
            json.dump(self.state, f, indent=2)

    def execute(self):
        """Execute the workflow"""
        print(f"🚀 Starting workflow execution for job: {self.job_id}")
        print(f"📋 Mode: {self.workflow_data['mode']}")
        print(f"🤖 LLM Provider: {self.executor.llm_provider}")

        # Get enabled steps for current mode
        enabled_steps = []
        if 'available_modes' in self.workflow_data:
            mode_config = self.workflow_data['available_modes'][self.workflow_data['mode']]
            enabled_steps = mode_config.get('enabled_steps', [])
        else:
            # For simple workflows without mode config, enable all steps
            for phase in self.workflow_data['phases']:
                for step in phase['steps']:
                    enabled_steps.append(step.get('step_id', step.get('id', '')))

        print(f"📊 Total steps: {len(enabled_steps)}")

        self.state['status'] = 'running'
        self._save_state()

        try:
            # Execute phases
            for phase in self.workflow_data['phases']:
                self._execute_phase(phase, enabled_steps)

            self.state['status'] = 'completed'
            print(f"\\n✅ Workflow execution completed")

        except Exception as e:
            self.state['status'] = 'failed'
            print(f"\\n❌ Workflow execution failed: {e}")
            raise

        finally:
            self._save_state()
            self._save_execution_log()

    def _execute_phase(self, phase: Dict[str, Any], enabled_steps: List[str]):
        """Execute a single phase"""
        phase_name = phase['name']
        print(f"\\n{'='*60}")
        print(f"📦 Phase: {phase_name}")
        print(f"{'='*60}")

        phase_id = phase.get('phase_id', phase.get('id', ''))
        self.state['current_phase'] = phase_id
        self._save_state()

        for step in phase['steps']:
            step_id = step.get('step_id', step.get('id', ''))
            if step_id in enabled_steps:
                # Skip if already completed
                if step_id in self.state['completed_steps']:
                    print(f"\\n⏭️  Step {step_id}: {step['name']} (already completed)")
                    continue

                self._execute_step(step)

    def _execute_step(self, step: Dict[str, Any]):
        """Execute a single step using CodeAct"""
        step_id = step.get('step_id', step.get('id', ''))
        step_name = step['name']

        print(f"\\n🔹 Step {step_id}: {step_name}")
        print(f"   Description: {step.get('description', 'N/A')}")

        # Check condition if specified
        if 'condition' in step:
            if not self._evaluate_condition(step['condition']):
                print(f"   ⏭️  Step skipped (condition not met)")
                return

        self.state['current_step'] = step_id
        self._save_state()

        # Check if human approval is required
        if step.get('requires_human_approval', False):
            if not self._wait_for_approval(step):
                print(f"   ❌ Step rejected by user")
                # Mark as failed and raise exception to stop workflow
                if 'failed_steps' not in self.state:
                    self.state['failed_steps'] = []
                if step_id not in self.state['failed_steps']:
                    self.state['failed_steps'].append(step_id)
                self.state['status'] = 'failed'
                self._save_state()
                raise Exception(f"Step {step_id} rejected by user - workflow stopped")

        # Prepare context for execution
        context = {
            'job_id': self.job_id,
            'step_id': step_id,
            'input_files': self._resolve_paths(step.get('input', [])),
            'output_files': self._resolve_paths(step.get('output', []))
        }

        # Get retry configuration
        max_retries = step.get('retry', {}).get('max_attempts', 1)
        retry_delay = step.get('retry', {}).get('delay_seconds', 0)

        # Determine execution method: adapter or CodeAct
        # Priority: 1) explicit 'tool' field, 2) infer from 'required_tools', 3) CodeAct fallback
        tool = step.get('tool')

        if not tool:
            # Try to infer from required_tools
            required_tools = step.get('required_tools', [])
            if required_tools:
                # Map required_tools to adapter names
                tool_mapping = {
                    'git': 'git',
                    'gh': 'github',
                    'github': 'github',
                    'pytest': 'test',
                    'jest': 'test',
                    'vitest': 'test',
                    'mocha': 'test'
                }

                # Use first recognized tool
                for req_tool in required_tools:
                    if req_tool in tool_mapping:
                        tool = tool_mapping[req_tool]
                        break

        if not tool:
            tool = 'codeact'  # Default fallback

        # Execute with retry logic
        last_error = None
        for attempt in range(max_retries):
            if attempt > 0:
                print(f"   🔄 Retry attempt {attempt + 1}/{max_retries}")
                if retry_delay > 0:
                    print(f"   ⏳ Waiting {retry_delay} seconds before retry...")
                    time.sleep(retry_delay)

            # Route to appropriate executor
            if tool in self.adapters:
                print(f"   🔧 Executing with {tool} adapter...")
                result = self.adapters[tool].execute(step, context)
            else:
                print(f"   🤖 Executing with {self.executor.llm_provider}...")
                result = self.executor.execute_task(
                    task_prompt=step.get('description', step_name),
                    context=context
                )

            # Log execution
            log_entry = {
                'step_id': step_id,
                'step_name': step_name,
                'attempt': attempt + 1,
                'status': result['status'],
                'output': result['output'][:500] if result['output'] else None,
                'error': result['error'] if result['error'] else None
            }
            self.execution_log.append(log_entry)

            if result['status'] == 'success':
                print(f"   ✅ Step completed successfully")
                # Remove from failed_steps if it was there
                if 'failed_steps' not in self.state:
                    self.state['failed_steps'] = []
                if step_id in self.state['failed_steps']:
                    self.state['failed_steps'].remove(step_id)
                # Add to completed_steps (avoid duplicates)
                if step_id not in self.state['completed_steps']:
                    self.state['completed_steps'].append(step_id)
                self._save_state()
                return

            last_error = result['error']
            print(f"   ❌ Attempt {attempt + 1} failed: {last_error}")

        # All retries exhausted
        print(f"   ❌ Step failed after {max_retries} attempts")
        if 'failed_steps' not in self.state:
            self.state['failed_steps'] = []
        # Add to failed_steps (avoid duplicates)
        if step_id not in self.state['failed_steps']:
            self.state['failed_steps'].append(step_id)
        self._save_state()
        raise Exception(f"Step {step_id} failed after {max_retries} attempts: {last_error}")

    def _resolve_paths(self, paths) -> List[str]:
        """Resolve paths with job_id placeholder

        Args:
            paths: Can be a string or list of strings
        """
        # Normalize to list
        if isinstance(paths, str):
            paths = [paths]
        elif not isinstance(paths, list):
            paths = []

        resolved = []
        for path in paths:
            # Replace {job_id} placeholder
            resolved_path = str(path).replace('{job_id}', self.job_id)
            resolved.append(resolved_path)
        return resolved

    def _evaluate_condition(self, condition) -> bool:
        """Evaluate a condition to determine if step should execute

        Supports both dict-style and string-style conditions:
        - Dict: {'type': 'step_completed', 'step_id': 'step-1'}
        - String: Expression-style conditions (e.g., 'has_executable_task', 'input_mode == "ui_form"')

        Supported dict condition types:
        - step_completed: Check if a specific step was completed
        - step_failed: Check if a specific step failed
        - file_exists: Check if a file exists
        - env_var: Check if environment variable matches value
        """
        # Handle string conditions (expression-style)
        if isinstance(condition, str):
            return self._evaluate_expression(condition)

        # Handle dict conditions
        if not isinstance(condition, dict):
            print(f"   ⚠️  Invalid condition type: {type(condition)}, allowing step")
            return True

        condition_type = condition.get('type')

        if condition_type == 'step_completed':
            step_id = condition.get('step_id')
            return step_id in self.state['completed_steps']

        elif condition_type == 'step_failed':
            step_id = condition.get('step_id')
            # Check if step was attempted but not completed
            return step_id in self.state.get('failed_steps', [])

        elif condition_type == 'file_exists':
            file_path = self._resolve_paths([condition.get('path')])[0]
            return Path(file_path).exists()

        elif condition_type == 'env_var':
            var_name = condition.get('name')
            expected_value = condition.get('value')
            actual_value = os.environ.get(var_name)
            return actual_value == expected_value

        else:
            print(f"   ⚠️  Unknown condition type: {condition_type}, allowing step")
            return True

    def _evaluate_expression(self, expr: str) -> bool:
        """Evaluate a string expression safely

        Supported patterns:
        - Simple variables: 'has_more_tasks', 'all_tasks_done'
        - Negation: '!has_more_tasks'
        - Equality: 'input_mode == "ui_form"', 'human_approved == true'
        - Inequality: 'auto_repair_attempts < 3'
        - Logical AND: 'retry_review && auto_repair_attempts < 3'
        - Function calls: 'done("step-1")', 'review_passed("step-2")'
        """
        expr = expr.strip()

        # Handle logical AND
        if '&&' in expr:
            parts = [p.strip() for p in expr.split('&&')]
            return all(self._evaluate_expression(p) for p in parts)

        # Handle logical OR
        if '||' in expr:
            parts = [p.strip() for p in expr.split('||')]
            return any(self._evaluate_expression(p) for p in parts)

        # Handle negation
        if expr.startswith('!'):
            return not self._evaluate_expression(expr[1:].strip())

        # Handle equality comparisons
        if '==' in expr:
            left, right = [p.strip() for p in expr.split('==', 1)]
            left_val = self._get_expression_value(left)
            right_val = self._get_expression_value(right)
            return left_val == right_val

        # Handle inequality comparisons
        if '<' in expr:
            left, right = [p.strip() for p in expr.split('<', 1)]
            left_val = self._get_expression_value(left)
            right_val = self._get_expression_value(right)
            try:
                return float(left_val) < float(right_val)
            except (ValueError, TypeError):
                return False

        if '>' in expr:
            left, right = [p.strip() for p in expr.split('>', 1)]
            left_val = self._get_expression_value(left)
            right_val = self._get_expression_value(right)
            try:
                return float(left_val) > float(right_val)
            except (ValueError, TypeError):
                return False

        # Handle function calls
        if '(' in expr and expr.endswith(')'):
            func_name = expr[:expr.index('(')].strip()
            args_str = expr[expr.index('(') + 1:-1].strip()
            args = [a.strip().strip('"').strip("'") for a in args_str.split(',') if a.strip()]

            if func_name == 'done':
                step_id = args[0] if args else ''
                return step_id in self.state['completed_steps']

            elif func_name == 'review_passed':
                # For now, treat as step completed
                step_id = args[0] if args else ''
                return step_id in self.state['completed_steps']

            else:
                print(f"   ⚠️  Unknown function: {func_name}, returning false")
                return False

        # Handle simple variable lookup
        value = self._get_expression_value(expr)
        # Treat truthy values as true
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            return value.lower() in ('true', 'yes', '1')
        if isinstance(value, (int, float)):
            return value != 0
        return bool(value)

    def _get_expression_value(self, expr: str):
        """Get the value of an expression variable or literal"""
        expr = expr.strip()

        # Handle string literals
        if (expr.startswith('"') and expr.endswith('"')) or \
           (expr.startswith("'") and expr.endswith("'")):
            return expr[1:-1]

        # Handle boolean literals
        if expr == 'true':
            return True
        if expr == 'false':
            return False

        # Handle numeric literals
        try:
            if '.' in expr:
                return float(expr)
            return int(expr)
        except ValueError:
            pass

        # Handle variable lookup from state
        # Check workflow_data for variables
        if 'variables' in self.workflow_data:
            if expr in self.workflow_data['variables']:
                return self.workflow_data['variables'][expr]

        # Check state for variables
        if 'variables' in self.state:
            if expr in self.state['variables']:
                return self.state['variables'][expr]

        # Default: return the expression as-is (for unknown variables)
        print(f"   ℹ️  Variable '{expr}' not found in state, treating as false")
        return False

    def _wait_for_approval(self, step: Dict[str, Any]) -> bool:
        """Wait for human approval"""
        print(f"\\n⏸️  Human approval required for step: {step['name']}")
        print(f"   Description: {step.get('description', 'N/A')}")

        # In interactive mode, ask for approval
        if sys.stdin.isatty():
            response = input("   Approve this step? (y/n): ")
            return response.lower() == 'y'
        else:
            # In non-interactive mode, check auto_approve flag
            if self.auto_approve:
                print(f"   [Auto-approved via --auto-approve flag]")
                return True
            else:
                print(f"   ❌ Approval required but running in non-interactive mode without --auto-approve")
                print(f"   Use --auto-approve flag to enable automatic approval in CI/headless environments")
                return False

    def _save_execution_log(self):
        """Save execution log to file"""
        log_path = Path(f".product-builder/jobs/{self.job_id}/execution.log")
        log_path.parent.mkdir(parents=True, exist_ok=True)

        with open(log_path, 'w') as f:
            json.dump(self.execution_log, f, indent=2)

        print(f"\\n📝 Execution log saved to: {log_path}")


def main():
    """Main entry point"""
    if len(sys.argv) < 3:
        print("Usage: python orchestrator.py <workflow.json> <job_id> [llm_provider] [--auto-approve]")
        print("  llm_provider: codex (default) or gemini")
        print("  --auto-approve: Enable automatic approval in non-interactive mode")
        sys.exit(1)

    workflow_path = sys.argv[1]
    job_id = sys.argv[2]
    llm_provider = "codex"
    auto_approve = False

    # Parse remaining arguments
    for arg in sys.argv[3:]:
        if arg == "--auto-approve":
            auto_approve = True
        elif arg in ["codex", "gemini"]:
            llm_provider = arg

    orchestrator = WorkflowOrchestrator(workflow_path, job_id, llm_provider, auto_approve)
    orchestrator.execute()


if __name__ == "__main__":
    main()
