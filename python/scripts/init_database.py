#!/usr/bin/env python3
"""
Initialize and test the workflow database
Creates the database with schema and inserts sample data
"""

import sys
from pathlib import Path

# Add scripts/python to path
sys.path.insert(0, str(Path(__file__).parent))

from workflow_db_phase1 import WorkflowDatabase
import json

def main():
    print("🔧 Initializing workflow database...")

    # Create database (will create schema automatically)
    db = WorkflowDatabase()

    print("✅ Database created at: .product-builder/workflow.db")
    print("\n📊 Database schema initialized with:")
    print("   - 11 core tables")
    print("   - 5 analytical views")
    print("   - Complete indexes and triggers")

    # Create a test project
    print("\n🏗️  Creating test project...")
    project_id = "test-project-001"
    db.create_project(
        project_id=project_id,
        name="Test Project",
        root_path="/Users/danlio/Repositories/product-builder"
    )
    print(f"   ✅ Project created: {project_id}")

    # Create a test workflow definition
    print("\n📋 Creating test workflow definition...")
    workflow_def = {
        "workflow_id": "test-workflow",
        "name": "Test Workflow",
        "mode": "standard",
        "phases": [
            {
                "phase_id": "P0",
                "name": "Test Phase",
                "steps": [
                    {
                        "step_id": "P0-TEST-STEP",
                        "name": "Test Step",
                        "description": "A test step",
                        "llm_providers": ["codex"],
                        "llm_role": "executor"
                    }
                ]
            }
        ],
        "transitions": [
            {
                "from": "P0-TEST-STEP",
                "to": "END",
                "on": "success"
            }
        ]
    }

    version = db.save_workflow_definition(
        workflow_id="test-workflow",
        project_id=project_id,
        name="Test Workflow",
        mode_default="standard",
        definition_json=workflow_def
    )
    print(f"   ✅ Workflow definition saved: version {version}")

    # Create a test job
    print("\n🚀 Creating test job...")
    job_id = "test-job-001"
    db.create_job(
        job_id=job_id,
        project_id=project_id,
        workflow_id="test-workflow",
        workflow_version=version,
        workflow_mode="standard",
        metadata={"test": True}
    )
    print(f"   ✅ Job created: {job_id}")

    # Update job status
    db.update_job_status(job_id, "running", current_phase="P0", current_step="P0-TEST-STEP")
    print(f"   ✅ Job status updated to: running")

    # Record a step execution
    print("\n📝 Recording step execution...")
    exec_id = db.record_step_execution(
        job_id=job_id,
        step_id="P0-TEST-STEP",
        phase_id="P0",
        status="success",
        attempt=1,
        tool_used="codeact",
        llm_provider="codex",
        duration_ms=1500,
        output="Test output"
    )
    print(f"   ✅ Step execution recorded: {exec_id}")

    # Record an LLM interaction
    print("\n🤖 Recording LLM interaction...")
    llm_id = db.record_llm_interaction(
        job_id=job_id,
        step_execution_id=exec_id,
        provider="codex",
        model="claude-sonnet-4",
        role="executor",
        status="success",
        input_tokens=1000,
        output_tokens=500,
        latency_ms=1500,
        cost_usd=0.015
    )
    print(f"   ✅ LLM interaction recorded: {llm_id}")

    # Record a review result
    print("\n📊 Recording review result...")
    review_id = db.record_review_result(
        job_id=job_id,
        step_execution_id=exec_id,
        review_cycle=1,
        reviewer_provider="codex",
        reviewer_model="claude-sonnet-4",
        review_score=8.7,
        quality_threshold=8.5,
        quality_gate_passed=True,
        blocking_issues=0,
        high_issues=1,
        medium_issues=2,
        low_issues=3,
        summary="Good quality, minor issues"
    )
    print(f"   ✅ Review result recorded: {review_id}")

    # Record some review findings
    print("\n🔍 Recording review findings...")
    finding_id = db.record_review_finding(
        review_id=review_id,
        severity="high",
        title="Missing error handling",
        category="error-handling",
        details="Function should handle null input",
        file_path="src/main.py",
        line=42
    )
    print(f"   ✅ Review finding recorded: {finding_id}")

    # Set some variables
    print("\n💾 Setting job variables...")
    db.set_variables_batch(job_id, {
        "test_passed": True,
        "review_score": 8.7,
        "quality_gate_passed": True,
        "review_cycle_count": 1
    }, source_step_id="P0-TEST-STEP")
    print(f"   ✅ Variables set: 4 variables")

    # Record a config entry
    print("\n⚙️  Recording config entry...")
    db.set_config(
        scope_type="project",
        scope_id=project_id,
        key="llm_provider",
        value="codex"
    )
    print(f"   ✅ Config entry recorded")

    # Record an error
    print("\n❌ Recording test error...")
    error_id = db.record_error(
        job_id=job_id,
        step_execution_id=exec_id,
        component="orchestrator",
        severity="warning",
        message="Test warning message",
        error_code="TEST_001"
    )
    print(f"   ✅ Error recorded: {error_id}")

    # Complete the job
    db.update_job_status(job_id, "completed")
    print(f"\n✅ Job completed")

    # Query some data
    print("\n📈 Querying data...")

    # Get job dashboard
    job = db.get_job(job_id)
    print(f"\n   Job Dashboard:")
    print(f"   - Status: {job['status']}")
    print(f"   - Completed steps: {job['completed_steps']}")
    print(f"   - Latest review score: {job['latest_review_score']}")
    print(f"   - Quality gate passed: {job['quality_gate_passed']}")

    # Get provider performance
    perf = db.get_provider_performance()
    if perf:
        print(f"\n   Provider Performance:")
        for p in perf:
            print(f"   - {p['provider']}/{p['model']}: {p['success_rate']}% success, "
                  f"avg {p['avg_latency_ms']}ms, ${p['total_cost_usd']}")

    # Get open findings
    findings = db.get_open_findings(job_id)
    print(f"\n   Open Findings: {len(findings)}")
    for f in findings:
        print(f"   - [{f['severity']}] {f['title']} ({f['file_path']}:{f['line']})")

    db.close()

    print("\n" + "="*60)
    print("✅ Database initialization complete!")
    print("="*60)
    print("\n📍 Database location:")
    print(f"   {Path('.product-builder/workflow.db').absolute()}")
    print("\n🔍 View with DBeaver:")
    print("   1. Open DBeaver")
    print("   2. New Connection → SQLite")
    print(f"   3. Path: {Path('.product-builder/workflow.db').absolute()}")
    print("   4. Connect and explore!")
    print("\n📊 Available tables:")
    print("   - projects, workflow_definitions, workflow_steps, workflow_transitions")
    print("   - jobs, step_executions, transition_history, job_variables")
    print("   - review_results, review_findings")
    print("   - llm_interactions")
    print("   - config_entries, error_events")
    print("\n📈 Available views:")
    print("   - v_job_dashboard")
    print("   - v_latest_review_per_job")
    print("   - v_open_findings")
    print("   - v_provider_performance")
    print("   - v_error_hotspots")

if __name__ == "__main__":
    main()
