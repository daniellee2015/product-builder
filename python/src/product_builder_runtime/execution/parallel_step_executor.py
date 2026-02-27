"""
Parallel Step Executor for Product Builder CLI

Executes workflow steps concurrently using ThreadPoolExecutor with resource lock management.
Integrates with StepDependencyAnalyzer to identify parallel execution opportunities.
"""

import logging
from typing import Dict, List, Set, Optional, Tuple, Any
from concurrent.futures import ThreadPoolExecutor, Future, as_completed
from dataclasses import dataclass
from enum import Enum
import time

from step_dependency_analyzer import StepDependencyAnalyzer
from workflow_db_scheduler import SchedulerDatabase


class ExecutionStatus(Enum):
    """Step execution status"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class StepExecutionResult:
    """Result of a step execution"""
    step_id: str
    status: ExecutionStatus
    output: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    execution_time: float = 0.0


class ParallelStepExecutor:
    """
    Executes workflow steps in parallel based on dependency analysis.

    Features:
    - Concurrent execution using ThreadPoolExecutor
    - Resource lock management (exclusive/shared)
    - Execution level-based scheduling
    - Error handling and rollback
    - Progress tracking
    """

    def __init__(
        self,
        scheduler_db: SchedulerDatabase,
        max_workers: int = 4,
        timeout: Optional[float] = None
    ):
        """
        Initialize ParallelStepExecutor.

        Args:
            scheduler_db: Database adapter for scheduler operations
            max_workers: Maximum number of concurrent workers
            timeout: Timeout for step execution (seconds)
        """
        self.scheduler_db = scheduler_db
        self.max_workers = max_workers
        self.timeout = timeout
        self.logger = logging.getLogger(__name__)

        # Track execution state
        self.step_results: Dict[str, StepExecutionResult] = {}
        self.step_futures: Dict[str, Future] = {}
        self.acquired_locks: Dict[str, List[str]] = {}  # step_id -> [lock_keys]

    def execute_workflow_parallel(
        self,
        job_id: str,
        workflow_definition: Dict[str, Any],
        step_executor_func,
        initial_context: Optional[Dict[str, Any]] = None
    ) -> Tuple[bool, Dict[str, StepExecutionResult]]:
        """
        Execute workflow with parallel step execution.

        Args:
            job_id: Job ID for resource locking
            workflow_definition: Workflow definition with steps and transitions
            step_executor_func: Function to execute a single step (step_id, context) -> result
            initial_context: Initial execution context

        Returns:
            Tuple of (success, results_dict)
        """
        self.logger.info(f"Starting parallel workflow execution for job {job_id}")

        # Analyze dependencies
        analyzer = StepDependencyAnalyzer(workflow_definition)

        # Check for circular dependencies
        if analyzer.has_circular_dependency():
            self.logger.error("Circular dependency detected in workflow")
            return False, {}

        # Get execution levels
        execution_levels = analyzer.get_execution_levels()
        self.logger.info(f"Workflow has {len(execution_levels)} execution levels")

        # Initialize context
        context = initial_context or {}
        overall_success = True

        # Execute level by level
        for level_idx, level_steps in enumerate(execution_levels):
            self.logger.info(f"Executing level {level_idx} with {len(level_steps)} steps")

            # Execute steps in this level concurrently
            level_success = self._execute_level(
                job_id=job_id,
                level_steps=level_steps,
                step_executor_func=step_executor_func,
                context=context,
                workflow_definition=workflow_definition
            )

            if not level_success:
                self.logger.error(f"Level {level_idx} execution failed")
                overall_success = False
                break

            # Update context with results from this level
            for step_id in level_steps:
                result = self.step_results.get(step_id)
                if result and result.output:
                    context.update(result.output)

        return overall_success, self.step_results

    def _execute_level(
        self,
        job_id: str,
        level_steps: List[str],
        step_executor_func,
        context: Dict[str, Any],
        workflow_definition: Dict[str, Any]
    ) -> bool:
        """
        Execute all steps in a level concurrently.

        Args:
            job_id: Job ID for resource locking
            level_steps: List of step IDs to execute
            step_executor_func: Function to execute a single step
            context: Execution context
            workflow_definition: Workflow definition

        Returns:
            True if all steps succeeded, False otherwise
        """
        if not level_steps:
            return True

        # Use ThreadPoolExecutor for concurrent execution
        with ThreadPoolExecutor(max_workers=min(self.max_workers, len(level_steps))) as executor:
            # Submit all steps in this level
            for step_id in level_steps:
                future = executor.submit(
                    self._execute_step_with_locks,
                    job_id=job_id,
                    step_id=step_id,
                    step_executor_func=step_executor_func,
                    context=context.copy(),  # Each step gets its own context copy
                    workflow_definition=workflow_definition
                )
                self.step_futures[step_id] = future

            # Wait for all steps to complete
            level_success = True
            for step_id in level_steps:
                future = self.step_futures[step_id]
                try:
                    result = future.result(timeout=self.timeout)
                    self.step_results[step_id] = result

                    if result.status == ExecutionStatus.FAILED:
                        self.logger.error(f"Step {step_id} failed: {result.error}")
                        level_success = False

                except Exception as e:
                    self.logger.error(f"Step {step_id} raised exception: {e}")
                    self.step_results[step_id] = StepExecutionResult(
                        step_id=step_id,
                        status=ExecutionStatus.FAILED,
                        error=str(e)
                    )
                    level_success = False

        return level_success

    def _execute_step_with_locks(
        self,
        job_id: str,
        step_id: str,
        step_executor_func,
        context: Dict[str, Any],
        workflow_definition: Dict[str, Any]
    ) -> StepExecutionResult:
        """
        Execute a single step with resource lock management.

        Args:
            job_id: Job ID for resource locking
            step_id: Step ID to execute
            step_executor_func: Function to execute the step
            context: Execution context
            workflow_definition: Workflow definition

        Returns:
            StepExecutionResult
        """
        start_time = time.time()

        try:
            # Get step definition
            step_def = self._get_step_definition(step_id, workflow_definition)
            if not step_def:
                return StepExecutionResult(
                    step_id=step_id,
                    status=ExecutionStatus.FAILED,
                    error=f"Step {step_id} not found in workflow definition"
                )

            # Acquire resource locks if specified
            required_locks = step_def.get("resource_locks", [])
            if not self._acquire_step_locks(job_id, step_id, required_locks):
                return StepExecutionResult(
                    step_id=step_id,
                    status=ExecutionStatus.FAILED,
                    error=f"Failed to acquire resource locks: {required_locks}"
                )

            # Execute the step
            self.logger.info(f"Executing step {step_id}")
            result = step_executor_func(step_id, context)

            execution_time = time.time() - start_time

            return StepExecutionResult(
                step_id=step_id,
                status=ExecutionStatus.COMPLETED,
                output=result,
                execution_time=execution_time
            )

        except Exception as e:
            self.logger.error(f"Error executing step {step_id}: {e}")
            execution_time = time.time() - start_time

            return StepExecutionResult(
                step_id=step_id,
                status=ExecutionStatus.FAILED,
                error=str(e),
                execution_time=execution_time
            )

        finally:
            # Always release locks
            self._release_step_locks(job_id, step_id)

    def _acquire_step_locks(
        self,
        job_id: str,
        step_id: str,
        required_locks: List[Dict[str, str]]
    ) -> bool:
        """
        Acquire all required resource locks for a step.

        Args:
            job_id: Job ID
            step_id: Step ID
            required_locks: List of lock specifications [{"key": "...", "mode": "exclusive|shared"}]

        Returns:
            True if all locks acquired, False otherwise
        """
        if not required_locks:
            return True

        acquired = []

        try:
            for lock_spec in required_locks:
                lock_key = lock_spec.get("key")
                lock_mode = lock_spec.get("mode", "exclusive")

                success = self.scheduler_db.acquire_lock(
                    lock_key=lock_key,
                    owner_job_id=job_id,
                    lock_mode=lock_mode
                )

                if success:
                    acquired.append(lock_key)
                    self.logger.debug(f"Acquired {lock_mode} lock on {lock_key} for step {step_id}")
                else:
                    self.logger.warning(f"Failed to acquire {lock_mode} lock on {lock_key} for step {step_id}")
                    # Release already acquired locks
                    for acquired_key in acquired:
                        self.scheduler_db.release_lock(acquired_key, job_id)
                    return False

            # Track acquired locks
            self.acquired_locks[step_id] = acquired
            return True

        except Exception as e:
            self.logger.error(f"Error acquiring locks for step {step_id}: {e}")
            # Release any acquired locks
            for acquired_key in acquired:
                try:
                    self.scheduler_db.release_lock(acquired_key, job_id)
                except Exception:
                    pass
            return False

    def _release_step_locks(self, job_id: str, step_id: str):
        """
        Release all locks acquired by a step.

        Args:
            job_id: Job ID
            step_id: Step ID
        """
        locks = self.acquired_locks.get(step_id, [])

        for lock_key in locks:
            try:
                self.scheduler_db.release_lock(lock_key, job_id)
                self.logger.debug(f"Released lock on {lock_key} for step {step_id}")
            except Exception as e:
                self.logger.error(f"Error releasing lock {lock_key} for step {step_id}: {e}")

        # Clear tracking
        if step_id in self.acquired_locks:
            del self.acquired_locks[step_id]

    def _get_step_definition(
        self,
        step_id: str,
        workflow_definition: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Get step definition from workflow.

        Args:
            step_id: Step ID
            workflow_definition: Workflow definition

        Returns:
            Step definition dict or None
        """
        steps = workflow_definition.get("steps", [])
        for step in steps:
            if step.get("id") == step_id:
                return step
        return None

    def get_execution_summary(self) -> Dict[str, Any]:
        """
        Get summary of execution results.

        Returns:
            Summary dict with statistics
        """
        total = len(self.step_results)
        completed = sum(1 for r in self.step_results.values() if r.status == ExecutionStatus.COMPLETED)
        failed = sum(1 for r in self.step_results.values() if r.status == ExecutionStatus.FAILED)
        total_time = sum(r.execution_time for r in self.step_results.values())

        return {
            "total_steps": total,
            "completed": completed,
            "failed": failed,
            "success_rate": completed / total if total > 0 else 0,
            "total_execution_time": total_time,
            "results": {step_id: {
                "status": result.status.value,
                "execution_time": result.execution_time,
                "error": result.error
            } for step_id, result in self.step_results.items()}
        }


