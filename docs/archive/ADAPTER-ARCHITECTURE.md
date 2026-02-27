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

#### 2. Git Adapter (✅ Implemented)

**Purpose**: Version control operations

**File**: `scripts/python/adapters/git_adapter.py`

**Supported Operations**:
- `status` - Get git status (porcelain format)
- `add` - Stage files for commit
- `commit` - Create commits with messages
- `push` - Push to remote (with force option)
- `branch` - Branch management (list, create, checkout)
- `diff` - Show differences (with cached/stat options)

**Implementation**:
- Direct git CLI calls via subprocess
- 30-second timeout per operation
- Structured output with status/output/error
- Repository path context support

**Known Limitations**:
- No support for complex merge operations
- No interactive rebase support
- Force push requires explicit flag

#### 3. GitHub Adapter (✅ Implemented)

**Purpose**: GitHub API operations via gh CLI

**File**: `scripts/python/adapters/github_adapter.py`

**Supported Operations**:
- `pr-create` - Create pull requests (with draft option)
- `pr-list` - List PRs with filters (state, limit)
- `pr-merge` - Merge PRs (merge/squash/rebase methods)
- `issue-create` - Create issues (with labels, assignees)
- `issue-list` - List issues with filters
- `repo-view` - View repository information

**Implementation**:
- Uses `gh` CLI tool
- 60-second timeout per operation
- JSON output parsing
- Repository path context support (fixed in latest version)

**Known Limitations**:
- Requires gh CLI authentication
- No support for GitHub Actions operations
- No support for release management

#### 4. Test Adapter (✅ Implemented)

**Purpose**: Run test suites with framework auto-detection

**File**: `scripts/python/adapters/test_adapter.py`

**Supported Frameworks**:
- `pytest` - Python testing (auto-detected from pytest.ini)
- `jest` - JavaScript testing (auto-detected from package.json)
- `vitest` - Vite testing (auto-detected from package.json)
- `mocha` - JavaScript testing (auto-detected from package.json)

**Features**:
- Automatic framework detection
- Coverage reporting support
- Configurable test paths and markers
- 5-minute timeout for long test suites
- Proper exit code handling (non-zero = failed)

**Implementation**:
- Framework detection from config files
- Subprocess execution with output capture
- Status correctly reflects test pass/fail

**Known Limitations**:
- No support for parallel test execution
- No support for test result parsing (JUnit XML, etc.)
- Coverage reports not structured

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

The workflow executor implements the following routing logic:

1. **Tool Detection** (Priority Order):
   - Check explicit `tool` field in step configuration
   - If not present, infer from `required_tools` array
   - Fallback to CodeAct executor if no match

2. **Adapter Routing**:
   - Map tool name to registered adapter
   - Pass step configuration and execution context
   - Handle adapter response (status, output, error)

3. **Tool Mapping**:
   ```python
   tool_mapping = {
       'git': 'git',
       'gh': 'github',
       'github': 'github',
       'pytest': 'test',
       'jest': 'test',
       'vitest': 'test',
       'mocha': 'test'
   }
   ```

4. **Execution Context**:
   - `job_id`: Current job identifier
   - `step_id`: Current step identifier
   - `input_files`: Resolved input file paths
   - `output_files`: Resolved output file paths

5. **Response Handling**:
   - Log execution results
   - Update state (completed_steps/failed_steps)
   - Trigger retry logic on failure

## Implementation Status

✅ **Completed**:
- Adapter registry and routing system
- Git adapter (6 operations)
- GitHub adapter (6 operations)
- Test adapter (4 frameworks)
- Tool inference from required_tools
- Proper error handling and state management

⏳ **Remaining**:
- Routing adapter (model selection)
- Additional adapters as needed (file system, API, etc.)
- Automated test suite for adapters
- Performance optimization for large workflows
