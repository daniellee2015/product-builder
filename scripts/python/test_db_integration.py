#!/usr/bin/env python3
"""
Test the orchestrator with database integration
"""

import sys
from pathlib import Path

# Add scripts/python to path
sys.path.insert(0, str(Path(__file__).parent))

from orchestrator import WorkflowOrchestrator

def main():
    print("🧪 Testing Orchestrator with Database Integration")
    print("="*60)

    # Use the test workflow
    workflow_path = "scripts/python/test_workflow.json"
    job_id = "test-db-integration-001"

    print(f"\n📋 Workflow: {workflow_path}")
    print(f"🆔 Job ID: {job_id}")
    print(f"💾 Database: Enabled")

    try:
        # Create orchestrator with database enabled
        print("\n🔧 Initializing orchestrator...")
        orchestrator = WorkflowOrchestrator(
            workflow_path=workflow_path,
            job_id=job_id,
            llm_provider="codex",
            auto_approve=True,
            strict_transitions=False,
            use_database=True  # Enable database
        )

        print(f"✅ Orchestrator initialized")
        print(f"   - Project ID: {orchestrator.project_id}")
        print(f"   - Workflow Version: {orchestrator.workflow_version}")
        print(f"   - Database: {orchestrator.db.db_path}")

        # Execute workflow
        print("\n🚀 Executing workflow...")
        orchestrator.execute()

        print("\n✅ Workflow execution completed!")

        # Query database to verify data was saved
        print("\n📊 Querying database...")

        if orchestrator.db:
            # Get job info
            job = orchestrator.db.get_job(job_id)
            if job:
                print(f"\n   Job Status:")
                print(f"   - Status: {job['status']}")
                print(f"   - Completed steps: {job['completed_steps']}")
                print(f"   - Failed steps: {job['failed_steps']}")
                print(f"   - Duration: {job.get('duration_ms', 0)}ms")

            # Get variables
            variables = orchestrator.db.get_all_variables(job_id)
            if variables:
                print(f"\n   Variables ({len(variables)}):")
                for name, value in list(variables.items())[:5]:
                    print(f"   - {name}: {value}")

            orchestrator.db.close()

        print("\n" + "="*60)
        print("✅ Test completed successfully!")
        print("="*60)

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
