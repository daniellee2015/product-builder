#!/usr/bin/env python3
"""
Product Builder - Workflow Orchestrator
CodeAct-based workflow execution engine with real LLM integration
"""

import json
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional
import os


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

    def __init__(self, workflow_path: str, job_id: str, llm_provider: str = "codex"):
        self.workflow_path = Path(workflow_path)
        self.job_id = job_id
        self.workflow_data = self._load_workflow()
        self.execution_log = []
        self.executor = CodeActExecutor(llm_provider)
        self.state_file = Path(f".product-builder/jobs/{job_id}/state.json")
        self.state = self._load_state()

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
            'status': 'idle'
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

        self.state['current_step'] = step_id
        self._save_state()

        # Check if human approval is required
        if step.get('requires_human_approval', False):
            if not self._wait_for_approval(step):
                print(f"   ❌ Step rejected by user")
                return

        # Prepare context for CodeAct execution
        context = {
            'job_id': self.job_id,
            'step_id': step_id,
            'input_files': self._resolve_paths(step.get('input', [])),
            'output_files': self._resolve_paths(step.get('output', []))
        }

        # Execute using CodeAct
        print(f"   🤖 Executing with {self.executor.llm_provider}...")
        result = self.executor.execute_task(
            task_prompt=step.get('description', step_name),
            context=context
        )

        # Log execution
        log_entry = {
            'step_id': step_id,
            'step_name': step_name,
            'status': result['status'],
            'output': result['output'][:500] if result['output'] else None,  # Truncate for log
            'error': result['error'] if result['error'] else None
        }
        self.execution_log.append(log_entry)

        if result['status'] == 'success':
            print(f"   ✅ Step completed successfully")
            self.state['completed_steps'].append(step_id)
            self._save_state()
        else:
            print(f"   ❌ Step failed: {result['error']}")
            raise Exception(f"Step {step_id} failed: {result['error']}")

    def _resolve_paths(self, paths: List[str]) -> List[str]:
        """Resolve paths with job_id placeholder"""
        resolved = []
        for path in paths:
            # Replace {job_id} placeholder
            resolved_path = path.replace('{job_id}', self.job_id)
            resolved.append(resolved_path)
        return resolved

    def _wait_for_approval(self, step: Dict[str, Any]) -> bool:
        """Wait for human approval"""
        print(f"\\n⏸️  Human approval required for step: {step['name']}")
        print(f"   Description: {step.get('description', 'N/A')}")

        # In interactive mode, ask for approval
        if sys.stdin.isatty():
            response = input("   Approve this step? (y/n): ")
            return response.lower() == 'y'
        else:
            # In non-interactive mode, auto-approve
            print(f"   [Auto-approved in non-interactive mode]")
            return True

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
        print("Usage: python orchestrator.py <workflow.json> <job_id> [llm_provider]")
        print("  llm_provider: codex (default) or gemini")
        sys.exit(1)

    workflow_path = sys.argv[1]
    job_id = sys.argv[2]
    llm_provider = sys.argv[3] if len(sys.argv) > 3 else "codex"

    orchestrator = WorkflowOrchestrator(workflow_path, job_id, llm_provider)
    orchestrator.execute()


if __name__ == "__main__":
    main()
