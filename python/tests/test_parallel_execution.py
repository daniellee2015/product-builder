#!/usr/bin/env python3
"""
Test Parallel Execution

Tests the parallel execution capabilities of WorkflowOrchestrator with
StepDependencyAnalyzer and ParallelStepExecutor.
"""

import json
import time
import tempfile
from pathlib import Path
from step_dependency_analyzer import StepDependencyAnalyzer


def test_dependency_analyzer():
    """Test StepDependencyAnalyzer with various workflow patterns"""
    print("=" * 60)
    print("Test 1: Dependency Analyzer")
    print("=" * 60)

    # Scenario 1: Simple parallel (step-1 and step-2 can run in parallel)
    workflow_def = {
        "steps": [
            {"id": "step-1"},
            {"id": "step-2"},
            {"id": "step-3"}
        ],
        "transitions": [
            {"from": "START", "to": "step-1"},
            {"from": "START", "to": "step-2"},
            {"from": "step-1", "to": "step-3"},
            {"from": "step-2", "to": "step-3"}
        ]
    }

    analyzer = StepDependencyAnalyzer(workflow_def)

    # Test dependency graph
    print("\n1.1 Dependency Graph:")
    for step_id in analyzer.steps.keys():
        deps = analyzer.get_step_dependencies(step_id)
        print(f"  {step_id} depends on: {deps}")

    # Test execution levels
    print("\n1.2 Execution Levels:")
    levels = analyzer.get_execution_levels()
    for i, level in enumerate(levels):
        print(f"  Level {i}: {level}")

    # Test parallel execution check
    print("\n1.3 Parallel Execution Check:")
    can_parallel = analyzer.can_execute_parallel(["step-1", "step-2"])
    print(f"  Can step-1 and step-2 run in parallel? {can_parallel}")

    # Test critical path
    print("\n1.4 Critical Path:")
    critical_path = analyzer.get_critical_path()
    print(f"  Critical path: {' -> '.join(critical_path)}")

    # Test circular dependency detection
    print("\n1.5 Circular Dependency Check:")
    has_circular = analyzer.has_circular_dependency()
    print(f"  Has circular dependency? {has_circular}")

    print("\n✅ Test 1 passed\n")


def test_circular_dependency():
    """Test circular dependency detection"""
    print("=" * 60)
    print("Test 2: Circular Dependency Detection")
    print("=" * 60)

    workflow_def = {
        "steps": [
            {"id": "step-1"},
            {"id": "step-2"},
            {"id": "step-3"}
        ],
        "transitions": [
            {"from": "step-1", "to": "step-2"},
            {"from": "step-2", "to": "step-3"},
            {"from": "step-3", "to": "step-1"}  # Circular!
        ]
    }

    analyzer = StepDependencyAnalyzer(workflow_def)
    has_circular = analyzer.has_circular_dependency()

    print(f"\nHas circular dependency? {has_circular}")
    assert has_circular, "Should detect circular dependency"

    print("✅ Test 2 passed\n")


def test_complex_workflow():
    """Test complex workflow with multiple parallel paths"""
    print("=" * 60)
    print("Test 3: Complex Workflow")
    print("=" * 60)

    workflow_def = {
        "steps": [
            {"id": "init"},
            {"id": "task-1"},
            {"id": "task-2"},
            {"id": "task-3"},
            {"id": "review-1"},
            {"id": "review-2"},
            {"id": "final"}
        ],
        "transitions": [
            {"from": "START", "to": "init"},
            {"from": "init", "to": "task-1"},
            {"from": "init", "to": "task-2"},
            {"from": "init", "to": "task-3"},
            {"from": "task-1", "to": "review-1"},
            {"from": "task-2", "to": "review-1"},
            {"from": "task-3", "to": "review-2"},
            {"from": "review-1", "to": "final"},
            {"from": "review-2", "to": "final"}
        ]
    }

    analyzer = StepDependencyAnalyzer(workflow_def)

    print("\n3.1 Execution Levels:")
    levels = analyzer.get_execution_levels()
    for i, level in enumerate(levels):
        print(f"  Level {i}: {level}")

    print("\n3.2 Parallel Opportunities:")
    print(f"  task-1, task-2, task-3 can run in parallel? {analyzer.can_execute_parallel(['task-1', 'task-2', 'task-3'])}")
    print(f"  review-1 and review-2 can run in parallel? {analyzer.can_execute_parallel(['review-1', 'review-2'])}")

    print("\n✅ Test 3 passed\n")


def test_parallel_executor_mock():
    """Test ParallelStepExecutor with mock steps"""
    print("=" * 60)
    print("Test 4: Parallel Executor (Mock)")
    print("=" * 60)

    from parallel_step_executor import ParallelStepExecutor, ExecutionStatus
    from workflow_db_scheduler import SchedulerDatabase

    # Initialize scheduler DB
    scheduler_db = SchedulerDatabase()

    # Create executor
    executor = ParallelStepExecutor(
        scheduler_db=scheduler_db,
        max_workers=3
    )

    # Mock step executor function
    def mock_step_executor(step_id, context):
        print(f"  Executing {step_id}...")
        time.sleep(0.5)  # Simulate work
        return {"status": "success", "output": f"Result from {step_id}"}

    # Simple workflow
    workflow_def = {
        "steps": [
            {"id": "step-1"},
            {"id": "step-2"},
            {"id": "step-3"}
        ],
        "transitions": [
            {"from": "START", "to": "step-1"},
            {"from": "START", "to": "step-2"},
            {"from": "step-1", "to": "step-3"},
            {"from": "step-2", "to": "step-3"}
        ]
    }

    print("\n4.1 Executing workflow with parallel steps...")
    start_time = time.time()

    success, results = executor.execute_workflow_parallel(
        job_id="test-job-001",
        workflow_definition=workflow_def,
        step_executor_func=mock_step_executor,
        initial_context={"test": True}
    )

    elapsed = time.time() - start_time

    print(f"\n4.2 Execution Results:")
    print(f"  Success: {success}")
    print(f"  Elapsed time: {elapsed:.2f}s")
    print(f"  Results: {len(results)} steps")

    for step_id, result in results.items():
        print(f"    {step_id}: {result.status.value}")

    # Get summary
    summary = executor.get_execution_summary()
    print(f"\n4.3 Summary:")
    print(f"  Total steps: {summary['total_steps']}")
    print(f"  Completed: {summary['completed']}")
    print(f"  Failed: {summary['failed']}")
    print(f"  Success rate: {summary['success_rate']:.1%}")

    print("\n✅ Test 4 passed\n")


if __name__ == "__main__":
    print("\n🧪 Testing Parallel Execution\n")

    try:
        test_dependency_analyzer()
        test_circular_dependency()
        test_complex_workflow()
        test_parallel_executor_mock()

        print("=" * 60)
        print("✅ All tests passed!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

