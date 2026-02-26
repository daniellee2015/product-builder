#!/usr/bin/env python3
"""
Step Dependency Analyzer
Analyzes workflow transitions to build step dependency graph
and identify parallel execution opportunities
"""

from typing import Dict, List, Set, Any
from collections import defaultdict, deque


class StepDependencyAnalyzer:
    """
    Analyzes workflow structure to determine step dependencies
    and identify opportunities for parallel execution
    """

    def __init__(self, workflow_def: Dict[str, Any]):
        """
        Initialize analyzer with workflow definition

        Args:
            workflow_def: Workflow definition with steps and transitions
        """
        self.workflow_def = workflow_def
        self.steps = {step['id']: step for step in workflow_def.get('steps', [])}
        self.transitions = workflow_def.get('transitions', [])

        # Build dependency graph
        self.dependencies = self._build_dependency_graph()
        self.reverse_dependencies = self._build_reverse_dependencies()

    def _build_dependency_graph(self) -> Dict[str, Set[str]]:
        """
        Build dependency graph from transitions

        Returns:
            Dict mapping step_id to set of step_ids it depends on
        """
        dependencies = defaultdict(set)

        for transition in self.transitions:
            from_step = transition.get('from')
            to_step = transition.get('to')

            # Skip START transitions (no dependency)
            if from_step == 'START':
                continue

            # Skip END transitions
            if to_step == 'END':
                continue

            # to_step depends on from_step
            if to_step in self.steps:
                if from_step in self.steps:
                    dependencies[to_step].add(from_step)

        return dict(dependencies)

    def _build_reverse_dependencies(self) -> Dict[str, Set[str]]:
        """
        Build reverse dependency graph (what depends on each step)

        Returns:
            Dict mapping step_id to set of step_ids that depend on it
        """
        reverse_deps = defaultdict(set)

        for step_id, deps in self.dependencies.items():
            for dep in deps:
                reverse_deps[dep].add(step_id)

        return dict(reverse_deps)

    def get_step_dependencies(self, step_id: str) -> Set[str]:
        """
        Get all steps that a given step depends on

        Args:
            step_id: Step identifier

        Returns:
            Set of step IDs that must complete before this step
        """
        return self.dependencies.get(step_id, set())

    def get_dependent_steps(self, step_id: str) -> Set[str]:
        """
        Get all steps that depend on a given step

        Args:
            step_id: Step identifier

        Returns:
            Set of step IDs that depend on this step
        """
        return self.reverse_dependencies.get(step_id, set())

    def get_initial_steps(self) -> List[str]:
        """
        Get steps that have no dependencies (can start immediately)

        Returns:
            List of step IDs with no dependencies
        """
        initial_steps = []

        for step_id in self.steps.keys():
            if step_id not in self.dependencies or len(self.dependencies[step_id]) == 0:
                initial_steps.append(step_id)

        return initial_steps

    def can_execute_parallel(self, step_ids: List[str]) -> bool:
        """
        Check if a set of steps can be executed in parallel

        Args:
            step_ids: List of step IDs to check

        Returns:
            True if steps have no dependencies on each other
        """
        step_set = set(step_ids)

        for step_id in step_ids:
            deps = self.get_step_dependencies(step_id)
            # If any dependency is in the same set, cannot parallel
            if deps & step_set:
                return False

        return True

    def get_execution_levels(self) -> List[List[str]]:
        """
        Get steps grouped by execution level (topological sort)

        Each level contains steps that can be executed in parallel.
        Steps in level N depend only on steps in levels < N.

        Returns:
            List of levels, where each level is a list of step IDs
        """
        # Calculate in-degree for each step
        in_degree = {}
        for step_id in self.steps.keys():
            in_degree[step_id] = len(self.get_step_dependencies(step_id))

        # Initialize queue with steps that have no dependencies
        queue = deque([step_id for step_id, degree in in_degree.items() if degree == 0])

        levels = []
        while queue:
            # All steps in current queue can execute in parallel
            current_level = list(queue)
            levels.append(current_level)

            # Process current level
            next_queue = []
            for step_id in current_level:
                # Reduce in-degree for dependent steps
                for dependent in self.get_dependent_steps(step_id):
                    in_degree[dependent] -= 1
                    if in_degree[dependent] == 0:
                        next_queue.append(dependent)

            queue = deque(next_queue)

        return levels

    def has_circular_dependency(self) -> bool:
        """
        Check if workflow has circular dependencies

        Returns:
            True if circular dependency detected
        """
        visited = set()
        rec_stack = set()

        def has_cycle(step_id: str) -> bool:
            visited.add(step_id)
            rec_stack.add(step_id)

            # Check all dependencies
            for dep in self.get_step_dependencies(step_id):
                if dep not in visited:
                    if has_cycle(dep):
                        return True
                elif dep in rec_stack:
                    return True

            rec_stack.remove(step_id)
            return False

        for step_id in self.steps.keys():
            if step_id not in visited:
                if has_cycle(step_id):
                    return True

        return False

    def get_critical_path(self) -> List[str]:
        """
        Get the critical path (longest path) through the workflow

        Returns:
            List of step IDs in the critical path
        """
        # Calculate longest path to each step
        longest_path = {}
        path_steps = {}

        def calculate_longest_path(step_id: str) -> int:
            if step_id in longest_path:
                return longest_path[step_id]

            deps = self.get_step_dependencies(step_id)
            if not deps:
                longest_path[step_id] = 1
                path_steps[step_id] = [step_id]
                return 1

            max_length = 0
            max_path = []
            for dep in deps:
                dep_length = calculate_longest_path(dep)
                if dep_length > max_length:
                    max_length = dep_length
                    max_path = path_steps[dep]

            longest_path[step_id] = max_length + 1
            path_steps[step_id] = max_path + [step_id]
            return longest_path[step_id]

        # Calculate for all steps
        for step_id in self.steps.keys():
            calculate_longest_path(step_id)

        # Find the longest path
        if not longest_path:
            return []

        critical_step = max(longest_path.keys(), key=lambda k: longest_path[k])
        return path_steps[critical_step]

    def print_analysis(self):
        """Print dependency analysis summary"""
        print("\n" + "=" * 60)
        print("📊 Step Dependency Analysis")
        print("=" * 60)

        print(f"\nTotal Steps: {len(self.steps)}")
        print(f"Total Transitions: {len(self.transitions)}")

        # Check for circular dependencies
        has_cycle = self.has_circular_dependency()
        print(f"Circular Dependencies: {'⚠️  Yes' if has_cycle else '✅ No'}")

        # Initial steps
        initial = self.get_initial_steps()
        print(f"\nInitial Steps (no dependencies): {len(initial)}")
        for step_id in initial:
            print(f"  - {step_id}")

        # Execution levels
        levels = self.get_execution_levels()
        print(f"\nExecution Levels: {len(levels)}")
        for i, level in enumerate(levels):
            print(f"  Level {i + 1}: {len(level)} step(s) - {', '.join(level)}")

        # Critical path
        critical = self.get_critical_path()
        print(f"\nCritical Path Length: {len(critical)}")
        print(f"Critical Path: {' -> '.join(critical)}")

        # Dependencies
        print(f"\nStep Dependencies:")
        for step_id in sorted(self.steps.keys()):
            deps = self.get_step_dependencies(step_id)
            if deps:
                print(f"  {step_id} depends on: {', '.join(sorted(deps))}")
            else:
                print(f"  {step_id}: no dependencies")

        print("=" * 60)


def main():
    """Test the analyzer with a sample workflow"""
    import json

    # Sample workflow with parallel opportunities
    workflow = {
        "steps": [
            {"id": "step-1", "name": "Step 1"},
            {"id": "step-2", "name": "Step 2"},
            {"id": "step-3", "name": "Step 3"},
            {"id": "step-4", "name": "Step 4"},
            {"id": "step-5", "name": "Step 5"},
        ],
        "transitions": [
            {"from": "START", "to": "step-1"},
            {"from": "START", "to": "step-2"},
            {"from": "step-1", "to": "step-3"},
            {"from": "step-2", "to": "step-3"},
            {"from": "step-3", "to": "step-4"},
            {"from": "step-3", "to": "step-5"},
        ]
    }

    analyzer = StepDependencyAnalyzer(workflow)
    analyzer.print_analysis()

    # Test parallel execution check
    print("\n🔍 Parallel Execution Tests:")
    print(f"Can step-1 and step-2 run in parallel? {analyzer.can_execute_parallel(['step-1', 'step-2'])}")
    print(f"Can step-4 and step-5 run in parallel? {analyzer.can_execute_parallel(['step-4', 'step-5'])}")
    print(f"Can step-1 and step-3 run in parallel? {analyzer.can_execute_parallel(['step-1', 'step-3'])}")


if __name__ == "__main__":
    main()
