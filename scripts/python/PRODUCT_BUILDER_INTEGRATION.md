# Product Builder Integration Guide

## Overview

This document explains how the Python Workflow Engine integrates with Product Builder's TypeScript CLI.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Product Builder (TypeScript/Node.js)                        │
│  ├── CLI Commands (pb init, pb start, pb status)            │
│  ├── Workflow Configuration (workflow.json)                 │
│  └── Orchestrator (src/orchestrator/index.ts)               │
└──────────────────────┬──────────────────────────────────────┘
                       │ Calls Python CLI
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ Python Workflow Engine                                      │
│  ├── ProductBuilderCLI (product_builder_cli.py)             │
│  ├── WorkflowExecutor (workflow_executor.py)                │
│  ├── LocalScheduler (scheduler.py)                          │
│  ├── Database (SQLite - 22 tables)                          │
│  └── Adapters (Git, GitHub, LLM)                            │
└─────────────────────────────────────────────────────────────┘
```

## Integration Points

### 1. Workflow Definition

**Product Builder** defines workflows in `src/config/workflow.json`:
- Phases (P0-P4)
- Steps with IDs (e.g., "P1-CREATE_JOB")
- Transitions and conditions

**Python Engine** loads this workflow and executes it.

### 2. Execution Flow

```typescript
// In src/orchestrator/index.ts
async function executeStep(step: StepConfig, context: ExecutionContext): Promise<void> {
  // Call Python CLI to execute the step
  const result = await executePythonStep(step.id, context);

  // Update workflow state based on result
  updateWorkflowState(result);
}
```

### 3. Data Sharing

**Database Location:** `.product-builder/workflow.db`

**Shared Tables:**
- `jobs` - Job metadata and status
- `step_executions` - Step execution history
- `git_operations` - Git operations log
- `github_issues` - Linked GitHub issues
- `github_pull_requests` - Linked PRs

### 4. CLI Integration

**TypeScript calls Python:**
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function executePythonStep(stepId: string, context: any): Promise<any> {
  const command = `python3 scripts/python/product_builder_cli.py run \\
    --workflow-file src/config/workflow.json \\
    --step-id ${stepId} \\
    --context '${JSON.stringify(context)}' \\
    --json`;

  const { stdout } = await execAsync(command);
  return JSON.parse(stdout);
}
```

## Usage Scenarios

### Scenario 1: Start a New Workflow

**User runs:**
```bash
pb start "Build authentication feature"
```

**Product Builder:**
1. Loads workflow.json
2. Creates initial context
3. Calls Python CLI: `python3 product_builder_cli.py run --workflow-file workflow.json`

**Python Engine:**
1. Creates job in database
2. Executes Phase 0 steps (requirement collection)
3. Returns job_id and status

**Product Builder:**
1. Displays progress
2. Stores job_id for future reference

### Scenario 2: Resume a Workflow

**User runs:**
```bash
pb resume <job_id>
```

**Product Builder:**
1. Calls Python CLI: `python3 product_builder_cli.py resume <job_id>`

**Python Engine:**
1. Loads job state from database
2. Resumes from last completed step
3. Executes remaining steps

### Scenario 3: Check Status

**User runs:**
```bash
pb status
```

**Product Builder:**
1. Calls Python CLI: `python3 product_builder_cli.py status --json`
2. Parses JSON output
3. Displays formatted status

## Implementation Steps

### Phase 1: Basic Integration (Current)
- [x] Python CLI with run/resume/status commands
- [x] Database schema (22 tables)
- [x] LocalScheduler
- [x] Git/GitHub integration
- [ ] TypeScript wrapper for Python CLI

### Phase 2: Workflow Execution
- [ ] Load Product Builder's workflow.json
- [ ] Map workflow steps to Python executors
- [ ] Execute steps with proper context
- [ ] Return results in expected format

### Phase 3: Advanced Features
- [ ] Parallel step execution (Scenario 2)
- [ ] Multi-workflow concurrency (Scenario 3)
- [ ] Resource management
- [ ] Failure recovery

## Configuration

### Database Location

Default: `.product-builder/workflow.db`

Can be configured in Product Builder's config:
```json
{
  "workflow": {
    "engine": "python",
    "database": ".product-builder/workflow.db"
  }
}
```

### Python Environment

Product Builder checks for Python dependencies:
```bash
# Check if Python workflow engine is available
pb check workflow-engine

# Install Python dependencies
pb install workflow-engine
```

## API Reference

### Python CLI Commands

All commands support `--json` flag for machine-readable output.

#### `run` - Start a new workflow
```bash
python3 product_builder_cli.py run \\
  --workflow-file <path> \\
  [--step-id <step>] \\
  [--context <json>] \\
  [--json]
```

#### `resume` - Resume a workflow
```bash
python3 product_builder_cli.py resume <job_id> [--json]
```

#### `status` - Get workflow status
```bash
python3 product_builder_cli.py status [--job-id <id>] [--json]
```

#### `cancel` - Cancel a workflow
```bash
python3 product_builder_cli.py cancel <job_id> [--json]
```

#### `logs` - View workflow logs
```bash
python3 product_builder_cli.py logs <job_id> [--json]
```

### JSON Output Format

All commands return JSON in this format:
```json
{
  "success": true,
  "data": {
    "job_id": "job_123",
    "status": "running",
    "current_step": "P1-CREATE_JOB",
    "progress": 25
  },
  "error": null
}
```

## Next Steps

1. **Create TypeScript wrapper** (`src/libs/workflow-engine.ts`)
2. **Implement orchestrator integration** (update `src/orchestrator/index.ts`)
3. **Add workflow engine checker** (check Python and dependencies)
4. **Update CLI commands** to use Python engine
5. **Add tests** for integration

## See Also

- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - Python CLI usage
- [USAGE_EXAMPLES.sh](./USAGE_EXAMPLES.sh) - Example commands
- [DATABASE_SCHEMA_SUMMARY.md](./DATABASE_SCHEMA_SUMMARY.md) - Database schema
