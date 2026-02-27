#!/usr/bin/env python3
"""
Product Builder CLI

Standardized command-line interface for workflow orchestration.
Supports external scheduler integration (e.g., Lobster).
"""

import sys
import json
import argparse
from pathlib import Path
from typing import Dict, Any, Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from orchestrator import WorkflowOrchestrator
from worker import Worker
from workflow_db_phase1 import WorkflowDatabase
from workflow_db_scheduler import SchedulerDatabase


class ProductBuilderCLI:
    """Command-line interface for Product Builder"""

    def __init__(self):
        self.parser = self._create_parser()

    def _create_parser(self) -> argparse.ArgumentParser:
        """Create argument parser"""
        parser = argparse.ArgumentParser(
            prog='product-builder',
            description='Product Builder - Workflow Orchestration CLI'
        )

        subparsers = parser.add_subparsers(dest='command', help='Command to execute')

        # Run command
        run_parser = subparsers.add_parser('run', help='Run a workflow')
        run_parser.add_argument('workflow', help='Path to workflow JSON file')
        run_parser.add_argument('--job-id', required=True, help='Unique job ID')
        run_parser.add_argument('--llm-provider', default='codex', help='LLM provider (default: codex)')
        run_parser.add_argument('--parallel', action='store_true', help='Enable parallel execution')
        run_parser.add_argument('--max-workers', type=int, default=4, help='Max parallel workers (default: 4)')
        run_parser.add_argument('--auto-approve', action='store_true', help='Auto-approve all steps')
        run_parser.add_argument('--strict', action='store_true', help='Strict transition mode')
        run_parser.add_argument('--json', action='store_true', help='Output JSON format')

        # Resume command
        resume_parser = subparsers.add_parser('resume', help='Resume a workflow')
        resume_parser.add_argument('job_id', help='Job ID to resume')
        resume_parser.add_argument('--json', action='store_true', help='Output JSON format')

        # Status command
        status_parser = subparsers.add_parser('status', help='Get job status')
        status_parser.add_argument('job_id', help='Job ID to check')
        status_parser.add_argument('--json', action='store_true', help='Output JSON format')

        # Cancel command
        cancel_parser = subparsers.add_parser('cancel', help='Cancel a job')
        cancel_parser.add_argument('job_id', help='Job ID to cancel')
        cancel_parser.add_argument('--json', action='store_true', help='Output JSON format')

        # Logs command
        logs_parser = subparsers.add_parser('logs', help='Get job logs')
        logs_parser.add_argument('job_id', help='Job ID')
        logs_parser.add_argument('--tail', type=int, help='Show last N lines')
        logs_parser.add_argument('--json', action='store_true', help='Output JSON format')

        # Worker command
        worker_parser = subparsers.add_parser('worker', help='Start a worker')
        worker_parser.add_argument('--max-jobs', type=int, help='Max jobs to process')
        worker_parser.add_argument('--worker-id', help='Custom worker ID')
        worker_parser.add_argument('--json', action='store_true', help='Output JSON format')

        return parser

    def run(self, args: argparse.Namespace) -> int:
        """Run a workflow"""
        try:
            # Create orchestrator
            orchestrator = WorkflowOrchestrator(
                workflow_path=args.workflow,
                job_id=args.job_id,
                llm_provider=args.llm_provider,
                auto_approve=args.auto_approve,
                strict_transitions=args.strict,
                use_database=True,
                parallel_execution=args.parallel,
                max_workers=args.max_workers
            )

            # Execute workflow
            orchestrator.execute()

            # Get final state
            result = {
                'status': 'success',
                'job_id': args.job_id,
                'state': orchestrator.state
            }

            if args.json:
                print(json.dumps(result, indent=2))
            else:
                print(f"✅ Workflow completed successfully")
                print(f"Job ID: {args.job_id}")
                print(f"Status: {orchestrator.state.get('status', 'unknown')}")

            return 0

        except Exception as e:
            result = {
                'status': 'error',
                'job_id': args.job_id,
                'error': str(e)
            }

            if args.json:
                print(json.dumps(result, indent=2))
            else:
                print(f"❌ Workflow failed: {e}")

            return 1

    def resume(self, args: argparse.Namespace) -> int:
        """Resume a workflow"""
        try:
            # Get job info from database
            db = WorkflowDatabase()
            job = db.get_job(args.job_id)

            if not job:
                result = {
                    'status': 'error',
                    'job_id': args.job_id,
                    'error': 'Job not found'
                }

                if args.json:
                    print(json.dumps(result, indent=2))
                else:
                    print(f"❌ Job not found: {args.job_id}")

                return 1

            # Get workflow definition
            workflow_def = db.get_workflow_definition(job['workflow_id'], job['workflow_version'])

            # Create orchestrator and resume
            # TODO: Implement resume logic
            result = {
                'status': 'error',
                'job_id': args.job_id,
                'error': 'Resume not yet implemented'
            }

            if args.json:
                print(json.dumps(result, indent=2))
            else:
                print(f"⚠️  Resume not yet implemented")

            return 1

        except Exception as e:
            result = {
                'status': 'error',
                'job_id': args.job_id,
                'error': str(e)
            }

            if args.json:
                print(json.dumps(result, indent=2))
            else:
                print(f"❌ Resume failed: {e}")

            return 1

    def status(self, args: argparse.Namespace) -> int:
        """Get job status"""
        try:
            db = WorkflowDatabase()
            job = db.get_job(args.job_id)

            if not job:
                result = {
                    'status': 'error',
                    'job_id': args.job_id,
                    'error': 'Job not found'
                }

                if args.json:
                    print(json.dumps(result, indent=2))
                else:
                    print(f"❌ Job not found: {args.job_id}")

                return 1

            # Get step executions
            executions = db.conn.execute("""
                SELECT step_id, status, started_at, completed_at
                FROM step_executions
                WHERE job_id = ?
                ORDER BY started_at
            """, (args.job_id,)).fetchall()

            result = {
                'status': 'success',
                'job_id': args.job_id,
                'job_status': job['status'],
                'workflow_id': job['workflow_id'],
                'created_at': job['created_at'],
                'step_count': len(executions),
                'steps': [dict(row) for row in executions]
            }

            if args.json:
                print(json.dumps(result, indent=2))
            else:
                print(f"Job ID: {args.job_id}")
                print(f"Status: {job['status']}")
                print(f"Workflow: {job['workflow_id']}")
                print(f"Created: {job['created_at']}")
                print(f"\nSteps executed: {len(executions)}")
                for exec in executions:
                    print(f"  - {exec['step_id']}: {exec['status']}")

            return 0

        except Exception as e:
            result = {
                'status': 'error',
                'job_id': args.job_id,
                'error': str(e)
            }

            if args.json:
                print(json.dumps(result, indent=2))
            else:
                print(f"❌ Status check failed: {e}")

            return 1

    def cancel(self, args: argparse.Namespace) -> int:
        """Cancel a job"""
        try:
            db = WorkflowDatabase()
            job = db.get_job(args.job_id)

            if not job:
                result = {
                    'status': 'error',
                    'job_id': args.job_id,
                    'error': 'Job not found'
                }

                if args.json:
                    print(json.dumps(result, indent=2))
                else:
                    print(f"❌ Job not found: {args.job_id}")

                return 1

            # Update job status to cancelled
            db.conn.execute("""
                UPDATE jobs
                SET status = 'cancelled'
                WHERE job_id = ?
            """, (args.job_id,))
            db.conn.commit()

            result = {
                'status': 'success',
                'job_id': args.job_id,
                'message': 'Job cancelled'
            }

            if args.json:
                print(json.dumps(result, indent=2))
            else:
                print(f"✅ Job cancelled: {args.job_id}")

            return 0

        except Exception as e:
            result = {
                'status': 'error',
                'job_id': args.job_id,
                'error': str(e)
            }

            if args.json:
                print(json.dumps(result, indent=2))
            else:
                print(f"❌ Cancel failed: {e}")

            return 1

    def logs(self, args: argparse.Namespace) -> int:
        """Get job logs"""
        try:
            db = WorkflowDatabase()

            # Get step executions with output
            query = """
                SELECT step_id, status, started_at, completed_at, output
                FROM step_executions
                WHERE job_id = ?
                ORDER BY started_at
            """

            if args.tail:
                query += f" LIMIT {args.tail}"

            executions = db.conn.execute(query, (args.job_id,)).fetchall()

            if not executions:
                result = {
                    'status': 'error',
                    'job_id': args.job_id,
                    'error': 'No logs found'
                }

                if args.json:
                    print(json.dumps(result, indent=2))
                else:
                    print(f"⚠️  No logs found for job: {args.job_id}")

                return 1

            result = {
                'status': 'success',
                'job_id': args.job_id,
                'logs': [dict(row) for row in executions]
            }

            if args.json:
                print(json.dumps(result, indent=2))
            else:
                print(f"Logs for job: {args.job_id}\n")
                for exec in executions:
                    print(f"[{exec['started_at']}] {exec['step_id']}: {exec['status']}")
                    if exec['output']:
                        print(f"  Output: {exec['output'][:200]}...")

            return 0

        except Exception as e:
            result = {
                'status': 'error',
                'job_id': args.job_id,
                'error': str(e)
            }

            if args.json:
                print(json.dumps(result, indent=2))
            else:
                print(f"❌ Logs retrieval failed: {e}")

            return 1

    def worker(self, args: argparse.Namespace) -> int:
        """Start a worker"""
        try:
            scheduler_db = SchedulerDatabase()

            worker = Worker(
                scheduler_db=scheduler_db,
                worker_id=args.worker_id
            )

            if args.json:
                # Print initial status
                status = worker.get_status()
                print(json.dumps({
                    'status': 'started',
                    'worker': status
                }, indent=2))

            else:
                print(f"🚀 Starting worker: {worker.worker_id}")
                if args.max_jobs:
                    print(f"   Max jobs: {args.max_jobs}")

            # Start worker
            worker.start(max_jobs=args.max_jobs)

            return 0

        except KeyboardInterrupt:
            if not args.json:
                print("\n⏹️  Worker stopped by user")
            return 0

        except Exception as e:
            result = {
                'status': 'error',
                'error': str(e)
            }

            if args.json:
                print(json.dumps(result, indent=2))
            else:
                print(f"❌ Worker failed: {e}")

            return 1

    def execute(self, argv: Optional[list] = None) -> int:
        """Execute CLI command"""
        args = self.parser.parse_args(argv)

        if not args.command:
            self.parser.print_help()
            return 1

        # Route to command handler
        if args.command == 'run':
            return self.run(args)
        elif args.command == 'resume':
            return self.resume(args)
        elif args.command == 'status':
            return self.status(args)
        elif args.command == 'cancel':
            return self.cancel(args)
        elif args.command == 'logs':
            return self.logs(args)
        elif args.command == 'worker':
            return self.worker(args)
        else:
            print(f"Unknown command: {args.command}")
            return 1


def main():
    """Main entry point"""
    cli = ProductBuilderCLI()
    sys.exit(cli.execute())


if __name__ == '__main__':
    main()

