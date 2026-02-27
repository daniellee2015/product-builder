#!/usr/bin/env node

/**
 * Example: Using Product Builder with Python Workflow Engine
 *
 * This example demonstrates how to use the integrated workflow system.
 */

const { createWorkflowEngine } = require('../dist/libs/workflow-engine');
const { executeWorkflow, resumeWorkflow, getWorkflowStatus } = require('../dist/orchestrator/index-python');

async function main() {
  console.log('=== Product Builder + Python Workflow Engine Example ===\n');

  // 1. Check if Python engine is available
  const engine = createWorkflowEngine();
  const available = await engine.isAvailable();

  if (!available) {
    console.error('❌ Python workflow engine is not available');
    console.error('Please ensure:');
    console.error('  1. Python 3 is installed');
    console.error('  2. scripts/python/product_builder_cli.py exists');
    process.exit(1);
  }

  console.log('✅ Python workflow engine is available\n');

  // 2. Initialize database
  console.log('Initializing database...');
  const dbInitialized = await engine.initDatabase();
  if (dbInitialized) {
    console.log('✅ Database initialized\n');
  } else {
    console.log('⚠️  Database initialization skipped (may already exist)\n');
  }

  // 3. Example: Start a new workflow
  console.log('--- Example 1: Start New Workflow ---\n');

  const result = await engine.runWorkflow('src/config/workflow.json', {
    context: {
      requirement: 'Build authentication feature',
      mode: 'standard'
    }
  });

  if (result.success && result.data) {
    console.log(`✅ Workflow started`);
    console.log(`   Job ID: ${result.data.job_id}`);
    console.log(`   Status: ${result.data.status}\n`);

    const jobId = result.data.job_id;

    // 4. Example: Check status
    console.log('--- Example 2: Check Status ---\n');
    await getWorkflowStatus(jobId);

    // 5. Example: Get logs
    console.log('--- Example 3: Get Logs ---\n');
    const logsResult = await engine.getLogs(jobId, { tail: 10 });
    if (logsResult.success && logsResult.data) {
      console.log('Recent logs:');
      console.log(logsResult.data.logs || 'No logs available');
      console.log();
    }

    // 6. Example: Resume workflow (if needed)
    // Uncomment to test resume functionality
    // console.log('--- Example 4: Resume Workflow ---\n');
    // await resumeWorkflow(jobId);

  } else {
    console.error(`❌ Failed to start workflow: ${result.error}`);
  }
}

// Run the example
main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
