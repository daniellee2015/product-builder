#!/usr/bin/env python3
"""
Test Product Builder CLI

Tests the standardized CLI interface.
"""

import subprocess
import json


def run_cli(args):
    """Run CLI command and return result"""
    result = subprocess.run(
        ['python3', 'product_builder_cli.py'] + args,
        capture_output=True,
        text=True
    )
    return result


def test_help():
    """Test help command"""
    print("=" * 60)
    print("Test 1: Help Command")
    print("=" * 60)

    result = run_cli(['--help'])
    print(f"\nExit code: {result.returncode}")
    print(f"Output length: {len(result.stdout)} chars")

    assert result.returncode == 0, "Help should succeed"
    assert 'product-builder' in result.stdout.lower(), "Should show program name"
    assert 'run' in result.stdout, "Should list run command"
    assert 'status' in result.stdout, "Should list status command"

    print("✅ Test 1 passed\n")


def test_status_json():
    """Test status command with JSON output"""
    print("=" * 60)
    print("Test 2: Status Command (JSON)")
    print("=" * 60)

    result = run_cli(['status', 'test-job-001', '--json'])
    print(f"\nExit code: {result.returncode}")

    # Should fail because job doesn't exist, but should return valid JSON
    if result.stdout:
        try:
            data = json.loads(result.stdout)
            print(f"JSON output: {json.dumps(data, indent=2)}")
            assert 'status' in data, "Should have status field"
            assert 'job_id' in data, "Should have job_id field"
            print("✅ Valid JSON output")
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON: {e}")
            raise

    print("✅ Test 2 passed\n")


def test_worker_help():
    """Test worker command help"""
    print("=" * 60)
    print("Test 3: Worker Command Help")
    print("=" * 60)

    result = run_cli(['worker', '--help'])
    print(f"\nExit code: {result.returncode}")

    assert result.returncode == 0, "Worker help should succeed"
    assert 'max-jobs' in result.stdout, "Should show max-jobs option"
    assert 'worker-id' in result.stdout, "Should show worker-id option"

    print("✅ Test 3 passed\n")


def test_cancel_json():
    """Test cancel command with JSON output"""
    print("=" * 60)
    print("Test 4: Cancel Command (JSON)")
    print("=" * 60)

    result = run_cli(['cancel', 'test-job-999', '--json'])
    print(f"\nExit code: {result.returncode}")

    # Should fail because job doesn't exist
    if result.stdout:
        try:
            data = json.loads(result.stdout)
            print(f"JSON output: {json.dumps(data, indent=2)}")
            assert 'status' in data, "Should have status field"
            print("✅ Valid JSON output")
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON: {e}")
            raise

    print("✅ Test 4 passed\n")


def test_logs_json():
    """Test logs command with JSON output"""
    print("=" * 60)
    print("Test 5: Logs Command (JSON)")
    print("=" * 60)

    result = run_cli(['logs', 'test-job-999', '--json'])
    print(f"\nExit code: {result.returncode}")

    # Should fail because job doesn't exist
    if result.stdout:
        try:
            data = json.loads(result.stdout)
            print(f"JSON output: {json.dumps(data, indent=2)}")
            assert 'status' in data, "Should have status field"
            print("✅ Valid JSON output")
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON: {e}")
            raise

    print("✅ Test 5 passed\n")


if __name__ == "__main__":
    print("\n🧪 Testing Product Builder CLI\n")

    try:
        test_help()
        test_status_json()
        test_worker_help()
        test_cancel_json()
        test_logs_json()

        print("=" * 60)
        print("✅ All CLI tests passed!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
