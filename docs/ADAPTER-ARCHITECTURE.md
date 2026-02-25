# Workflow Executor - Adapter Architecture

## Overview

The workflow executor uses adapters to integrate with external tools. Each adapter provides a standardized interface for executing specific types of tasks.

## Current Implementation

### CodeAct Executor (Built-in)

The `CodeActExecutor` class is the core execution engine that calls LLM CLI tools:

- **Supported Providers**: `codex`, `gemini`
- **Execution Mode**: Agent/CodeAct mode
- **Input**: Task prompt + context (job_id, input/output files)
- **Output**: Structured result with status, output, error

### Adapter Types

#### 1. LLM Adapters (Implemented)

**Purpose**: Execute tasks using LLM agents

**Implementation**: Direct CLI calls
- `codex exec --full-auto --json --sandbox workspace-write <prompt>`
- `gemini exec --full-auto --json --sandbox workspace-write <prompt>`

**Features**:
- Auto-approval mode for non-interactive execution
- JSON output for structured results
- Workspace write permissions
- Sandbox isolation

#### 2. Git Adapter (TODO)

**Purpose**: Version control operations

**Planned Operations**:
- `git commit`
- `git push`
- `git branch`
- `git merge`
- `git status`

**Implementation Approach**:
- Direct git CLI calls
- Structured output parsing
- Error handling and retry

#### 3. GitHub Adapter (TODO)

**Purpose**: GitHub API operations

**Planned Operations**:
- Create/update issues
- Create/merge PRs
- Add comments
- Manage labels
- Check CI status

**Implementation Approach**:
- Use `gh` CLI tool
- JSON output parsing
- Rate limiting handling

#### 4. Test Adapter (TODO)

**Purpose**: Run test suites

**Planned Operations**:
- Run unit tests
- Run integration tests
- Parse test results
- Generate coverage reports

**Implementation Approach**:
- Detect test framework (pytest, jest, etc.)
- Execute tests with appropriate runner
- Parse output for pass/fail status

#### 5. Routing Adapter (TODO)

**Purpose**: Model routing and selection

**Planned Operations**:
- Select best model for task
- Route to appropriate provider
- Handle fallbacks
- Track usage and costs

**Implementation Approach**:
- Rule-based routing logic
- Provider availability checking
- Cost optimization

## Adapter Interface

All adapters should implement a common interface:

```python
class Adapter:
    def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a task using this adapter

        Args:
            task: Task configuration (tool, input, output, etc.)
            context: Execution context (job_id, step_id, etc.)

        Returns:
            {
                'status': 'success' | 'failed',
                'output': str,
                'error': str | None
            }
        """
        pass
```

## Integration with Workflow

The workflow executor should:

1. Detect the `tool` field in each step
2. Route to the appropriate adapter
3. Pass task configuration and context
4. Handle adapter response
5. Log execution results

## Next Steps

1. Implement adapter registry and routing
2. Create git adapter
3. Create gh adapter
4. Create test adapter
5. Add adapter configuration to workflow.json
