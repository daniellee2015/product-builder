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


class WorkflowHalted(Exception):
    """Exception raised when workflow is halted in strict mode"""
    pass


class WorkflowFailed(Exception):
    """Exception raised when workflow fails"""
    pass

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

    def __init__(self, workflow_path: str, job_id: str, llm_provider: str = "codex", auto_approve: bool = False, strict_transitions: bool = False):
        self.workflow_path = Path(workflow_path)
        self.job_id = job_id
        self.workflow_data = self._load_workflow()
        self.transitions = self._load_transitions()  # Load transitions
        self.execution_log = []
        self.executor = CodeActExecutor(llm_provider)
        self.state_file = Path(f".product-builder/jobs/{job_id}/state.json")
        self.state = self._load_state()
        self.auto_approve = auto_approve  # Explicit auto-approve flag
        self.strict_transitions = strict_transitions  # Strict transition mode

        # Initialize adapters
        self.adapters = {
            'git': GitAdapter(),
            'github': GitHubAdapter(),
            'gh': GitHubAdapter(),  # Alias
            'test': TestAdapter()
        }

        # Build step lookup map
        self.step_map = self._build_step_map()
        # Build display ID to step ID mapping
        self.display_id_map = self._build_display_id_map()

    def _load_workflow(self) -> Dict[str, Any]:
        """Load workflow.json"""
        with open(self.workflow_path, 'r') as f:
            return json.load(f)

    def _load_transitions(self) -> List[Dict[str, Any]]:
        """Load transitions from workflow data or external file"""
        # Priority 1: Load from embedded workflow data
        if 'transitions' in self.workflow_data:
            return self.workflow_data['transitions']

        # Priority 2: Load from sibling transitions.json file
        transitions_file = self.workflow_path.parent / 'transitions.json'
        if transitions_file.exists():
            with open(transitions_file, 'r') as f:
                data = json.load(f)
                return data.get('transitions', [])

        return []

    def _build_step_map(self) -> Dict[str, Dict[str, Any]]:
        """Build a map of step_id -> step for quick lookup"""
        step_map = {}
        for phase in self.workflow_data['phases']:
            for step in phase['steps']:
                step_id = step.get('step_id', step.get('id', ''))
                step_map[step_id] = {
                    'step': step,
                    'phase': phase
                }
        return step_map

    def _build_display_id_map(self) -> Dict[str, str]:
        """Build a map of display_id -> step_id for ID normalization

        Uses actual display_id field from workflow steps as source of truth.
        Falls back to generated index-based IDs if display_id is not present.
        """
        display_map = {}

        # First pass: Use actual display_id fields from workflow
        for phase in self.workflow_data['phases']:
            for step in phase['steps']:
                step_id = step.get('step_id', step.get('id', ''))
                if not step_id:
                    continue

                # Use actual display_id if present
                display_id = step.get('display_id')
                if display_id:
                    display_map[display_id] = step_id

                # Always map step_id to itself for consistency
                display_map[step_id] = step_id

        # Second pass: Generate fallback IDs for steps without display_id
        # Group steps by phase prefix for fallback generation
        phase_steps = {}
        for phase in self.workflow_data['phases']:
            for step in phase['steps']:
                step_id = step.get('step_id', step.get('id', ''))
                if not step_id or step.get('display_id'):
                    continue  # Skip if already has display_id

                # Extract phase prefix from step_id
                if '-' in step_id:
                    phase_prefix = step_id.split('-')[0]
                    if phase_prefix not in phase_steps:
                        phase_steps[phase_prefix] = []
                    phase_steps[phase_prefix].append(step_id)

        # Generate fallback display IDs for steps without explicit display_id
        for phase_prefix, steps in phase_steps.items():
            for idx, step_id in enumerate(steps, start=1):
                display_id = f"{phase_prefix}-{idx:02d}"
                # Only add if not already mapped
                if display_id not in display_map:
                    display_map[display_id] = step_id

        return display_map

    def _load_state(self) -> Dict[str, Any]:
        """Load execution state from file"""
        if self.state_file.exists():
            with open(self.state_file, 'r') as f:
                return json.load(f)
        return {
            'current_phase': None,
            'current_step': None,
            'completed_steps': [],
            'skipped_steps': [],  # Track skipped steps
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
            if self.transitions:
                # Use transition-driven execution
                print(f"🔀 Using transition-driven execution ({len(self.transitions)} transitions)")
                self._execute_with_transitions(enabled_steps)
            else:
                # Fallback to linear execution
                print(f"📝 Using linear execution (no transitions defined)")
                for phase in self.workflow_data['phases']:
                    self._execute_phase(phase, enabled_steps)

            self.state['status'] = 'completed'
            print(f"\\n✅ Workflow execution completed")

        except WorkflowHalted as e:
            # Preserve halted status (already set before raising)
            print(f"\\n⏸️  Workflow halted: {e}")

        except Exception as e:
            self.state['status'] = 'failed'
            print(f"\\n❌ Workflow execution failed: {e}")
            raise

        finally:
            self._save_state()
            self._save_execution_log()

    def _execute_with_transitions(self, enabled_steps: List[str]):
        """Execute workflow using transition-driven control flow"""
        # Find the first step (no incoming transitions or explicitly marked as start)
        current_step_id = self._find_start_step(enabled_steps)

        if not current_step_id:
            print("⚠️  No start step found, falling back to linear execution")
            for phase in self.workflow_data['phases']:
                self._execute_phase(phase, enabled_steps)
            return

        visited_steps = set()
        max_iterations = len(enabled_steps) * 10  # Prevent infinite loops
        iteration = 0

        while current_step_id and current_step_id != 'END' and iteration < max_iterations:
            iteration += 1

            # Check if step is enabled
            if current_step_id not in enabled_steps:
                print(f"⏭️  Step {current_step_id} not enabled in current mode")
                current_step_id = self._find_next_step(current_step_id, enabled_steps)
                continue

            # Check if already completed (for resume)
            if current_step_id in self.state['completed_steps']:
                print(f"⏭️  Step {current_step_id} already completed")
                current_step_id = self._find_next_step(current_step_id, enabled_steps)
                continue

            # Execute the step
            if current_step_id in self.step_map:
                step_info = self.step_map[current_step_id]
                step = step_info['step']
                phase = step_info['phase']

                print(f"\\n{'='*60}")
                print(f"📦 Phase: {phase['name']}")
                print(f"{'='*60}")

                step_result = self._execute_step(step)
                visited_steps.add(current_step_id)

                # Handle skipped steps
                if step_result.get('status') == 'skipped':
                    print(f"   ⏭️  Step skipped, continuing to next transition")
                    # Track skipped step
                    if 'skipped_steps' not in self.state:
                        self.state['skipped_steps'] = []
                    if current_step_id not in self.state['skipped_steps']:
                        self.state['skipped_steps'].append(current_step_id)
                    self._save_state()

                    # Find next step for skipped status
                    next_step_after_skip = self._find_next_step(current_step_id, enabled_steps, 'skipped')

                    # Check if no transition found in strict mode
                    if not next_step_after_skip:
                        if self.strict_transitions:
                            print(f"\\n⚠️  No matching transition from skipped step {current_step_id} (strict mode)")
                            print(f"   Halting execution")
                            self.state['status'] = 'halted'
                            self._save_state()
                            raise WorkflowHalted(f"No matching transition from skipped step {current_step_id} in strict mode")
                        else:
                            # Permissive mode: try sequential fallback
                            print(f"\\n⚠️  No matching transition from skipped step {current_step_id}")
                            print(f"   Falling back to sequential execution")
                            next_step_after_skip = self._find_next_enabled_step(current_step_id, enabled_steps)

                    current_step_id = next_step_after_skip
                    continue

                # Check if step failed
                if step_result['status'] == 'failed':
                    # Try to find failure transition
                    failure_transition = self._find_next_step(current_step_id, enabled_steps, 'failed')
                    if failure_transition:
                        print(f"   🔀 Following failure transition to {failure_transition}")
                        current_step_id = failure_transition
                        continue
                    else:
                        # No failure transition found, workflow fails
                        print(f"   ❌ No failure transition found, workflow failed")
                        self.state['status'] = 'failed'
                        self._save_state()
                        raise Exception(f"Step {current_step_id} failed and no failure transition exists")

            # Find next step based on transitions (for successful steps)
            next_step = self._find_next_step(current_step_id, enabled_steps, 'success')

            # If no transition found, handle based on strict mode
            if not next_step:
                if self.strict_transitions:
                    # Strict mode: halt when no transition matches
                    print(f"\\n⚠️  No matching transition from {current_step_id} (strict mode)")
                    print(f"   Halting execution")
                    self.state['status'] = 'halted'
                    self._save_state()
                    raise WorkflowHalted(f"No matching transition from {current_step_id} in strict mode")
                else:
                    # Permissive mode: try sequential fallback
                    print(f"\\n⚠️  No matching transition from {current_step_id}")
                    print(f"   Falling back to sequential execution")
                    next_step = self._find_next_enabled_step(current_step_id, enabled_steps)

            current_step_id = next_step

        if iteration >= max_iterations:
            raise Exception(f"Maximum iterations ({max_iterations}) exceeded - possible infinite loop")

        # Check if there are any remaining enabled steps that weren't executed
        # Only in permissive mode
        if not self.strict_transitions:
            # Exclude completed, failed, and skipped steps
            completed_or_failed_or_skipped = (
                set(self.state['completed_steps']) |
                set(self.state.get('failed_steps', [])) |
                set(self.state.get('skipped_steps', []))
            )
            remaining_steps = [s for s in enabled_steps if s not in completed_or_failed_or_skipped]
            if remaining_steps:
                print(f"\\n⚠️  {len(remaining_steps)} enabled steps were not reached by transitions")
                print(f"   Executing remaining steps in sequence (permissive mode)...")
                for step_id in remaining_steps:
                    if step_id in self.step_map:
                        step_info = self.step_map[step_id]
                        step_result = self._execute_step(step_info['step'])

                        # Handle safety-net step results
                        if step_result.get('status') == 'failed':
                            print(f"   ❌ Safety-net step {step_id} failed")
                            self.state['status'] = 'failed'
                            self._save_state()
                            raise Exception(f"Safety-net step {step_id} failed: {step_result.get('error', 'Unknown error')}")
                        elif step_result.get('status') == 'skipped':
                            # Track skipped step from safety-net
                            if 'skipped_steps' not in self.state:
                                self.state['skipped_steps'] = []
                            if step_id not in self.state['skipped_steps']:
                                self.state['skipped_steps'].append(step_id)
                            self._save_state()
                            print(f"   ⏭️  Safety-net step {step_id} skipped")

    def _find_start_step(self, enabled_steps: List[str]) -> Optional[str]:
        """Find the first step to execute"""
        # Find steps that have no incoming transitions
        all_targets = set()
        for transition in self.transitions:
            all_targets.add(transition['to'])

        for step_id in enabled_steps:
            if step_id not in all_targets:
                return step_id

        # Fallback: return first enabled step
        return enabled_steps[0] if enabled_steps else None

    def _find_next_step(self, current_step_id: str, enabled_steps: List[str], step_status: str = 'success') -> Optional[str]:
        """Find the next step based on transitions

        Args:
            current_step_id: The current step ID
            enabled_steps: List of enabled step IDs
            step_status: Status of the current step ('success', 'failed', 'skipped')

        Returns:
            Next step ID or None if no matching transition found
        """
        current_mode = self.workflow_data.get('mode', 'standard')

        # Find all transitions from current step
        matching_transitions = []
        for transition in self.transitions:
            if transition['from'] == current_step_id:
                # Check if transition is enabled in current mode
                enabled_modes = transition.get('enabled_in_modes', [])
                if not enabled_modes or current_mode in enabled_modes:
                    # Check transition trigger condition (on: success/failure/always)
                    on_condition = transition.get('on', 'success')  # Default to success
                    if on_condition == 'always' or on_condition == step_status:
                        matching_transitions.append(transition)

        # Evaluate conditions and find first matching transition
        for transition in matching_transitions:
            condition = transition.get('condition')
            if not condition or self._evaluate_condition(condition):
                return transition['to']

        # No matching transition found
        return None

    def _find_next_enabled_step(self, current_step_id: str, enabled_steps: List[str]) -> Optional[str]:
        """Find the next enabled step in sequence (fallback when no transition matches)"""
        # Find current step's position in enabled_steps
        try:
            current_index = enabled_steps.index(current_step_id)
            # Return next enabled step that hasn't been completed
            for i in range(current_index + 1, len(enabled_steps)):
                next_step = enabled_steps[i]
                if next_step not in self.state['completed_steps']:
                    return next_step
        except ValueError:
            # Current step not in enabled_steps, return first uncompleted step
            for step in enabled_steps:
                if step not in self.state['completed_steps']:
                    return step

        return None

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

                step_result = self._execute_step(step)

                # Check if step failed in linear mode
                if step_result.get('status') == 'failed':
                    print(f"\\n❌ Step {step_id} failed in linear mode")
                    self.state['status'] = 'failed'
                    self._save_state()
                    raise Exception(f"Step {step_id} failed: {step_result.get('error', 'Unknown error')}")

    def _execute_step(self, step: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single step using CodeAct

        Returns:
            Dict with 'status' ('success' or 'failed') and other execution details
        """
        step_id = step.get('step_id', step.get('id', ''))
        step_name = step['name']

        print(f"\\n🔹 Step {step_id}: {step_name}")
        print(f"   Description: {step.get('description', 'N/A')}")

        # Check condition if specified
        if 'condition' in step:
            if not self._evaluate_condition(step['condition']):
                print(f"   ⏭️  Step skipped (condition not met)")
                return {'status': 'skipped', 'step_id': step_id}

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

                # Update runtime variables based on step result
                self._update_variables_from_result(step_id, step, result)

                self._save_state()
                return {'status': 'success', 'step_id': step_id}

            last_error = result['error']
            print(f"   ❌ Attempt {attempt + 1} failed: {last_error}")

        # All retries exhausted
        print(f"   ❌ Step failed after {max_retries} attempts")

        # Update variables for failure case
        result = {'status': 'failed', 'error': last_error, 'output': ''}
        self._update_variables_from_result(step_id, step, result)

        if 'failed_steps' not in self.state:
            self.state['failed_steps'] = []
        if step_id not in self.state['failed_steps']:
            self.state['failed_steps'].append(step_id)
        self._save_state()

        # Return failure status instead of raising exception
        # This allows transition-driven execution to handle failure branches
        return {'status': 'failed', 'step_id': step_id, 'error': last_error}

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

    def _update_variables_from_result(self, step_id: str, step: Dict[str, Any], result: Dict[str, Any]):
        """Update runtime variables based on step execution result"""
        if 'variables' not in self.state:
            self.state['variables'] = {}

        # Extract variables from step configuration
        variable_updates = step.get('output_variables', {})
        for var_name, var_config in variable_updates.items():
            if isinstance(var_config, dict):
                # Complex variable extraction (e.g., from output parsing)
                source = var_config.get('source', 'output')
                if source == 'output':
                    # Parse output for specific patterns
                    pattern = var_config.get('pattern')
                    if pattern and result.get('output'):
                        import re
                        match = re.search(pattern, result['output'])
                        if match:
                            self.state['variables'][var_name] = match.group(1) if match.groups() else match.group(0)
            else:
                # Simple variable assignment
                self.state['variables'][var_name] = var_config

        # Common variable patterns based on step type and result
        # These are heuristics for common workflow patterns

        # Test-related variables
        if 'test' in step_id.lower() or step.get('tool') == 'test':
            self.state['variables']['test_passed'] = (result['status'] == 'success')
            self.state['variables']['test_failed'] = (result['status'] != 'success')

        # Review-related variables
        if 'review' in step_id.lower():
            self.state['variables'][f'review_passed'] = (result['status'] == 'success')
            self.state['variables'][f'{step_id}_passed'] = (result['status'] == 'success')

        # Task execution variables
        if 'task' in step_id.lower() or 'execute' in step_id.lower():
            # Check if there are more tasks (heuristic: look for task count in output)
            if result.get('output'):
                output_lower = result['output'].lower()
                if 'no more tasks' in output_lower or 'all tasks done' in output_lower:
                    self.state['variables']['has_more_tasks'] = False
                    self.state['variables']['all_tasks_done'] = True
                elif 'more tasks' in output_lower or 'next task' in output_lower:
                    self.state['variables']['has_more_tasks'] = True
                    self.state['variables']['all_tasks_done'] = False

        # Approval variables
        if 'approval' in step_id.lower() or step.get('requires_human_approval'):
            self.state['variables']['human_approved'] = (result['status'] == 'success')

        # Generic success/failure tracking
        self.state['variables'][f'{step_id}_completed'] = True
        self.state['variables'][f'{step_id}_success'] = (result['status'] == 'success')

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
                # Check both the provided ID and normalized variations
                return self._is_step_completed(step_id)

            elif func_name == 'review_passed':
                step_id = args[0] if args else ''
                # Check both the provided ID and normalized variations
                return self._is_step_completed(step_id)

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

    def _is_step_completed(self, step_id: str) -> bool:
        """Check if a step is completed, supporting multiple ID formats"""
        if not step_id:
            return False

        # Normalize the step_id using display_id_map
        # This handles cases like done("P1-02") -> actual step_id
        normalized_id = self.display_id_map.get(step_id, step_id)

        # Check if the normalized ID is in completed steps
        return normalized_id in self.state['completed_steps']

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
        print("Usage: python orchestrator.py <workflow.json> <job_id> [llm_provider] [--auto-approve] [--strict-transitions]")
        print("  llm_provider: codex (default) or gemini")
        print("  --auto-approve: Enable automatic approval in non-interactive mode")
        print("  --strict-transitions: Enable strict transition mode (halt on no-match)")
        sys.exit(1)

    workflow_path = sys.argv[1]
    job_id = sys.argv[2]
    llm_provider = "codex"
    auto_approve = False
    strict_transitions = False

    # Parse remaining arguments
    for arg in sys.argv[3:]:
        if arg == "--auto-approve":
            auto_approve = True
        elif arg == "--strict-transitions":
            strict_transitions = True
        elif arg in ["codex", "gemini"]:
            llm_provider = arg

    orchestrator = WorkflowOrchestrator(workflow_path, job_id, llm_provider, auto_approve, strict_transitions)
    orchestrator.execute()


if __name__ == "__main__":
    main()
