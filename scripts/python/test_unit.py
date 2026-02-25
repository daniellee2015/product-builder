#!/usr/bin/env python3
"""
Unit tests for Workflow Orchestrator
Tests core functionality without LLM calls
"""

import unittest
import json
import tempfile
import shutil
from pathlib import Path
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from orchestrator import WorkflowOrchestrator

class TestWorkflowOrchestrator(unittest.TestCase):
    """Test cases for WorkflowOrchestrator"""

    def setUp(self):
        """Set up test fixtures"""
        self.test_dir = Path(tempfile.mkdtemp())
        self.workflow_file = self.test_dir / "test_workflow.json"
        self.job_id = "test-job-001"

        # Create minimal test workflow
        self.workflow_data = {
            "name": "Test Workflow",
            "mode": "test",
            "phases": [
                {
                    "phase_id": "P0",
                    "name": "Test Phase",
                    "steps": [
                        {
                            "step_id": "STEP1",
                            "name": "Step 1",
                            "description": "Test step 1"
                        }
                    ]
                }
            ],
            "available_modes": {
                "test": {
                    "enabled_steps": ["STEP1"]
                }
            }
        }

        with open(self.workflow_file, 'w') as f:
            json.dump(self.workflow_data, f)

    def tearDown(self):
        """Clean up test fixtures"""
        if self.test_dir.exists():
            shutil.rmtree(self.test_dir)

    def test_initialization(self):
        """Test orchestrator initialization"""
        orchestrator = WorkflowOrchestrator(
            str(self.workflow_file),
            self.job_id
        )

        self.assertEqual(orchestrator.job_id, self.job_id)
        self.assertEqual(orchestrator.workflow_data['name'], "Test Workflow")
        self.assertIsNotNone(orchestrator.state)

    def test_state_initialization(self):
        """Test state initialization"""
        orchestrator = WorkflowOrchestrator(
            str(self.workflow_file),
            self.job_id
        )

        self.assertEqual(orchestrator.state['status'], 'idle')
        self.assertEqual(orchestrator.state['completed_steps'], [])
        self.assertEqual(orchestrator.state['skipped_steps'], [])
        self.assertIn('variables', orchestrator.state)

    def test_step_map_building(self):
        """Test step map building"""
        orchestrator = WorkflowOrchestrator(
            str(self.workflow_file),
            self.job_id
        )

        self.assertIn('STEP1', orchestrator.step_map)
        self.assertEqual(
            orchestrator.step_map['STEP1']['step']['name'],
            "Step 1"
        )

    def test_condition_evaluation_simple(self):
        """Test simple condition evaluation"""
        orchestrator = WorkflowOrchestrator(
            str(self.workflow_file),
            self.job_id
        )

        # Test simple variable
        orchestrator.state['variables']['test_var'] = True
        self.assertTrue(orchestrator._evaluate_expression('test_var'))

        orchestrator.state['variables']['test_var'] = False
        self.assertFalse(orchestrator._evaluate_expression('test_var'))

    def test_condition_evaluation_equality(self):
        """Test equality condition evaluation"""
        orchestrator = WorkflowOrchestrator(
            str(self.workflow_file),
            self.job_id
        )

        orchestrator.state['variables']['mode'] = 'test'
        self.assertTrue(orchestrator._evaluate_expression('mode == "test"'))
        self.assertFalse(orchestrator._evaluate_expression('mode == "prod"'))

    def test_condition_evaluation_negation(self):
        """Test negation condition evaluation"""
        orchestrator = WorkflowOrchestrator(
            str(self.workflow_file),
            self.job_id
        )

        orchestrator.state['variables']['flag'] = True
        self.assertFalse(orchestrator._evaluate_expression('!flag'))

        orchestrator.state['variables']['flag'] = False
        self.assertTrue(orchestrator._evaluate_expression('!flag'))

    def test_step_completion_tracking(self):
        """Test step completion tracking"""
        orchestrator = WorkflowOrchestrator(
            str(self.workflow_file),
            self.job_id
        )

        # Initially not completed
        self.assertFalse(orchestrator._is_step_completed('STEP1'))

        # Mark as completed
        orchestrator.state['completed_steps'].append('STEP1')
        self.assertTrue(orchestrator._is_step_completed('STEP1'))

    def test_display_id_mapping(self):
        """Test display ID to step ID mapping"""
        # Add display_id to workflow
        self.workflow_data['phases'][0]['steps'][0]['display_id'] = 'P0-01'

        with open(self.workflow_file, 'w') as f:
            json.dump(self.workflow_data, f)

        orchestrator = WorkflowOrchestrator(
            str(self.workflow_file),
            self.job_id
        )

        # Test mapping
        self.assertEqual(
            orchestrator.display_id_map.get('P0-01'),
            'STEP1'
        )

    def test_transition_loading(self):
        """Test transition loading"""
        # Add transitions to workflow
        self.workflow_data['transitions'] = [
            {
                "from": "STEP1",
                "to": "END",
                "on": "success"
            }
        ]

        with open(self.workflow_file, 'w') as f:
            json.dump(self.workflow_data, f)

        orchestrator = WorkflowOrchestrator(
            str(self.workflow_file),
            self.job_id
        )

        self.assertEqual(len(orchestrator.transitions), 1)
        self.assertEqual(orchestrator.transitions[0]['from'], 'STEP1')
        self.assertEqual(orchestrator.transitions[0]['to'], 'END')

    def test_find_next_step_with_status(self):
        """Test finding next step based on status"""
        # Add transitions
        self.workflow_data['transitions'] = [
            {
                "from": "STEP1",
                "to": "STEP2",
                "on": "success"
            },
            {
                "from": "STEP1",
                "to": "STEP3",
                "on": "failed"
            }
        ]

        # Add more steps
        self.workflow_data['phases'][0]['steps'].extend([
            {"step_id": "STEP2", "name": "Step 2", "description": "Success path"},
            {"step_id": "STEP3", "name": "Step 3", "description": "Failure path"}
        ])

        self.workflow_data['available_modes']['test']['enabled_steps'] = [
            "STEP1", "STEP2", "STEP3"
        ]

        with open(self.workflow_file, 'w') as f:
            json.dump(self.workflow_data, f)

        orchestrator = WorkflowOrchestrator(
            str(self.workflow_file),
            self.job_id
        )

        enabled_steps = ["STEP1", "STEP2", "STEP3"]

        # Test success path
        next_step = orchestrator._find_next_step("STEP1", enabled_steps, 'success')
        self.assertEqual(next_step, "STEP2")

        # Test failure path
        next_step = orchestrator._find_next_step("STEP1", enabled_steps, 'failed')
        self.assertEqual(next_step, "STEP3")

    def test_strict_mode_initialization(self):
        """Test strict mode initialization"""
        orchestrator = WorkflowOrchestrator(
            str(self.workflow_file),
            self.job_id,
            strict_transitions=True
        )

        self.assertTrue(orchestrator.strict_transitions)

    def test_auto_approve_initialization(self):
        """Test auto-approve initialization"""
        orchestrator = WorkflowOrchestrator(
            str(self.workflow_file),
            self.job_id,
            auto_approve=True
        )

        self.assertTrue(orchestrator.auto_approve)


if __name__ == '__main__':
    # Run tests with verbose output
    unittest.main(verbosity=2)
