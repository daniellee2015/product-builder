#!/usr/bin/env python3
"""
Test script for Workflow Orchestrator
Tests various execution scenarios
"""

import sys
import json
import subprocess
from pathlib import Path

def run_test(name, workflow_path, job_id, args=None, expected_status='completed'):
    """Run a single test case"""
    print(f"\n{'='*60}")
    print(f"Test: {name}")
    print(f"{'='*60}")

    cmd = ['python3', 'scripts/python/orchestrator.py', workflow_path, job_id]
    if args:
        cmd.extend(args)

    print(f"Command: {' '.join(cmd)}")

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30
        )

        print(f"\nExit code: {result.returncode}")
        print(f"\nOutput:\n{result.stdout}")

        if result.stderr:
            print(f"\nErrors:\n{result.stderr}")

        # Check state file
        state_file = Path(f".product-builder/jobs/{job_id}/state.json")
        if state_file.exists():
            with open(state_file) as f:
                state = json.load(f)
                print(f"\nFinal state: {state['status']}")
                print(f"Completed steps: {state.get('completed_steps', [])}")
                print(f"Failed steps: {state.get('failed_steps', [])}")
                print(f"Skipped steps: {state.get('skipped_steps', [])}")

                # Verify expected status
                if state['status'] == expected_status:
                    print(f"✅ Test PASSED - Status matches expected: {expected_status}")
                    return True
                else:
                    print(f"❌ Test FAILED - Expected {expected_status}, got {state['status']}")
                    return False
        else:
            print(f"❌ Test FAILED - State file not found")
            return False

    except subprocess.TimeoutExpired:
        print(f"❌ Test FAILED - Timeout")
        return False
    except Exception as e:
        print(f"❌ Test FAILED - Exception: {e}")
        return False

def main():
    """Run all test cases"""
    print("Workflow Orchestrator Test Suite")
    print("="*60)

    tests = []

    # Test 1: Basic execution with transitions
    tests.append(run_test(
        "Basic Execution",
        "scripts/python/test_workflow.json",
        "test-basic-001",
        expected_status='completed'
    ))

    # Test 2: Strict mode (should halt if no transition)
    tests.append(run_test(
        "Strict Mode",
        "scripts/python/test_workflow.json",
        "test-strict-001",
        args=['--strict-transitions'],
        expected_status='completed'  # Should complete with our test workflow
    ))

    # Test 3: Permissive mode (default)
    tests.append(run_test(
        "Permissive Mode",
        "scripts/python/test_workflow.json",
        "test-permissive-001",
        expected_status='completed'
    ))

    # Summary
    print(f"\n{'='*60}")
    print("Test Summary")
    print(f"{'='*60}")
    passed = sum(tests)
    total = len(tests)
    print(f"Passed: {passed}/{total}")

    if passed == total:
        print("✅ All tests passed!")
        return 0
    else:
        print(f"❌ {total - passed} test(s) failed")
        return 1

if __name__ == '__main__':
    sys.exit(main())
