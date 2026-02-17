# Context Isolation Decision Tree

## Overview

Context isolation determines when to use **Subagents** vs **Agent Teams** vs **Main Agent** based on task complexity, context requirements, and collaboration needs.

## Decision Framework

### Three Execution Modes

```
Task Arrives
    ↓
Analyze Task
    ↓
    ├─ Simple (< 100 lines, single file) → Subagent
    ├─ Medium (100-500 lines, 2-5 files) → Main Agent
    └─ Complex (> 500 lines, multi-file, multi-stack) → Agent Team
```

## Mode 1: Subagent

### When to Use

| Criterion | Threshold |
|-----------|-----------|
| **Task Complexity** | Simple (< 100 lines, single file) |
| **Context Needs** | Independent, no main session context needed |
| **Communication** | No need to communicate with other agents |
| **Execution Time** | < 5 minutes |
| **Coordination** | Main agent manually coordinates results |

### Characteristics

- **Isolated Context**: Runs in separate context, doesn't pollute main session
- **No Collaboration**: Works independently, returns result to main agent
- **Manual Coordination**: Main agent decides what to do with result
- **Fast Execution**: Quick turnaround for simple tasks

### Available Subagents

#### 1. simple-task-executor

**Purpose**: Execute simple code tasks

**Input**:
```typescript
{
  taskId: string;
  jobId: string;
  description: string;
  files: string[];
}
```

**Output**:
```typescript
{
  success: boolean;
  changes: FileChange[];
  message: string;
}
```

**Use Cases**:
- Single file modification (< 100 lines)
- Simple logic (CRUD operations)
- No architecture changes

**Example**:
```typescript
// Task: Add a new method to existing class
await executeSubagent('simple-task-executor', {
  taskId: 'task-001',
  jobId: 'job-123',
  description: 'Add getUserById method to UserService',
  files: ['src/services/UserService.ts']
});
```

---

#### 2. quick-test-runner

**Purpose**: Run tests quickly

**Input**:
```typescript
{
  taskId: string;
  jobId: string;
  verificationConfig: VerificationConfig;
}
```

**Output**:
```typescript
{
  success: boolean;
  testResults: TestResult[];
  coverage?: CoverageReport;
}
```

**Use Cases**:
- Run unit tests
- Run integration tests
- Quick verification (no failure analysis)

**Model**: Gemini (fast)

**Example**:
```typescript
// Task: Run tests for UserService
await executeSubagent('quick-test-runner', {
  taskId: 'task-001',
  jobId: 'job-123',
  verificationConfig: {
    command: 'npm test UserService',
    timeout: 60000
  }
});
```

---

#### 3. doc-snippet-generator

**Purpose**: Generate code documentation snippets

**Input**:
```typescript
{
  filePath: string;
  symbols: string[];
}
```

**Output**:
```typescript
{
  success: boolean;
  snippets: DocSnippet[];
}
```

**Use Cases**:
- Add JSDoc comments
- Generate API documentation
- No architecture documentation

**Example**:
```typescript
// Task: Add JSDoc to UserService methods
await executeSubagent('doc-snippet-generator', {
  filePath: 'src/services/UserService.ts',
  symbols: ['getUserById', 'createUser', 'updateUser']
});
```

---

#### 4. git-commit-helper

**Purpose**: Generate Git commit messages

**Input**:
```typescript
{
  changedFiles: string[];
  diff: string;
}
```

**Output**:
```typescript
{
  message: string;
  type: 'feat' | 'fix' | 'chore' | 'docs' | 'refactor';
}
```

**Use Cases**:
- Generate commit messages
- Follow Conventional Commits format

**Model**: Gemini (fast)

**Example**:
```typescript
// Task: Generate commit message
await executeSubagent('git-commit-helper', {
  changedFiles: ['src/services/UserService.ts'],
  diff: '...'
});
```

### Subagent Decision Tree

```
Task Arrives
    ↓
Check Complexity
    ↓
Is it < 100 lines AND single file?
    ↓ YES
Is it independent (no context needed)?
    ↓ YES
Is execution time < 5 minutes?
    ↓ YES
Use Subagent
    ↓
Select Subagent Type
    ├─ Code task → simple-task-executor
    ├─ Test task → quick-test-runner
    ├─ Doc task → doc-snippet-generator
    └─ Git task → git-commit-helper
```

---

## Mode 2: Main Agent

### When to Use

| Criterion | Threshold |
|-----------|-----------|
| **Task Complexity** | Medium (100-500 lines, 2-5 files) |
| **Context Needs** | Needs main session context |
| **Communication** | May need to reference previous work |
| **Execution Time** | 5-30 minutes |
| **Coordination** | Self-coordinated |

### Characteristics

- **Shared Context**: Uses main session context
- **Sequential Execution**: Executes tasks one by one
- **Context Continuity**: Can reference previous work
- **Moderate Complexity**: Handles multi-file changes

### Use Cases

- Multi-file modifications (2-5 files)
- Moderate logic complexity
- Needs context from previous tasks
- Single technology stack

### Example

```typescript
// Task: Refactor UserService and update tests
// This needs context from previous work, so use main agent
await mainAgent.execute({
  taskId: 'task-002',
  description: 'Refactor UserService to use async/await and update tests',
  files: [
    'src/services/UserService.ts',
    'tests/services/UserService.test.ts'
  ]
});
```

### Main Agent Decision Tree

```
Task Arrives
    ↓
Check Complexity
    ↓
Is it 100-500 lines AND 2-5 files?
    ↓ YES
Does it need main session context?
    ↓ YES
Is it single technology stack?
    ↓ YES
Use Main Agent
```

---

## Mode 3: Agent Team

### When to Use

| Criterion | Threshold |
|-----------|-----------|
| **Task Complexity** | Complex (> 500 lines, multi-file) |
| **Technology Stack** | Cross-stack (Frontend + Backend) |
| **Collaboration** | Agents need to communicate |
| **Execution Time** | > 30 minutes |
| **Coordination** | Self-coordinated with shared task list |

### Characteristics

- **Shared Information**: Agents share task list and communicate
- **Parallel Execution**: Multiple agents work simultaneously
- **Self-Coordination**: Agents coordinate among themselves
- **Complex Tasks**: Handles large, multi-stack projects

### Available Agent Teams

#### 1. Full-Stack Development Team

**Activation Criteria**:
- File count > 5
- Involves Frontend + Backend
- Estimated time > 8 hours

**Roles**:

##### Frontend Agent (Claude)
```typescript
{
  role: 'frontend',
  model: 'claude',
  responsibilities: [
    'Frontend code development',
    'React/TypeScript/CSS',
    'Component testing'
  ],
  output: {
    code: 'src/components/**/*',
    tests: 'tests/components/**/*'
  }
}
```

##### Backend Agent (Claude)
```typescript
{
  role: 'backend',
  model: 'claude',
  responsibilities: [
    'Backend code development',
    'Node.js/Python/API',
    'API testing'
  ],
  output: {
    code: 'src/api/**/*',
    tests: 'tests/api/**/*'
  }
}
```

##### Testing Agent (Gemini)
```typescript
{
  role: 'testing',
  model: 'gemini',
  responsibilities: [
    'Integration testing',
    'E2E testing',
    'Test reporting'
  ],
  output: {
    tests: 'tests/e2e/**/*',
    reports: 'test-reports/**/*'
  }
}
```

**Collaboration Mechanism**:
```yaml
shared_state:
  - task_list: tasks.json
  - progress: progress.json

communication:
  - frontend_done → notify_backend
  - backend_done → notify_testing
  - testing_failed → notify_responsible_agent

conflict_resolution:
  - shared_files: require_coordination
  - api_contracts: frontend_and_backend_agree
```

**Example**:
```typescript
// Task: Implement user authentication system
await executeAgentTeam('full-stack-dev', {
  taskId: 'task-003',
  description: 'Implement user authentication with JWT',
  scope: {
    frontend: ['Login page', 'Register page', 'Auth context'],
    backend: ['Auth API', 'JWT middleware', 'User model'],
    testing: ['E2E auth flow', 'API tests']
  }
});
```

---

#### 2. Refactoring Team

**Activation Criteria**:
- Refactoring task
- Affects > 10 files
- Needs backward compatibility

**Roles**:

##### Refactor Agent (Claude)
```typescript
{
  role: 'refactor',
  model: 'claude',
  responsibilities: [
    'Execute refactoring',
    'Maintain functionality'
  ],
  output: {
    code: 'refactored code'
  }
}
```

##### Compatibility Agent (Claude)
```typescript
{
  role: 'compatibility',
  model: 'claude',
  responsibilities: [
    'Check backward compatibility',
    'Identify breaking changes'
  ],
  output: {
    report: 'compatibility-report.md'
  }
}
```

##### Test Agent (Gemini)
```typescript
{
  role: 'testing',
  model: 'gemini',
  responsibilities: [
    'Ensure tests pass',
    'Verify no regressions'
  ],
  output: {
    results: 'test-results.json'
  }
}
```

**Collaboration Mechanism**:
```yaml
workflow:
  - refactor_complete → compatibility_check
  - compatibility_pass → test_run
  - test_fail → refactor_fix
```

---

#### 3. Documentation Team

**Activation Criteria**:
- Documentation generation task
- Multiple doc types (API + Architecture + Integration)

**Roles**:

##### API Doc Agent (Claude)
```typescript
{
  role: 'api_docs',
  model: 'claude',
  responsibilities: [
    'Generate API documentation',
    'OpenAPI specs'
  ],
  output: {
    docs: 'docs/api/**/*'
  }
}
```

##### Architecture Doc Agent (Claude)
```typescript
{
  role: 'architecture_docs',
  model: 'claude',
  responsibilities: [
    'Generate architecture docs',
    'Diagrams and explanations'
  ],
  output: {
    docs: 'docs/architecture/**/*'
  }
}
```

##### Integration Doc Agent (Gemini)
```typescript
{
  role: 'integration_docs',
  model: 'gemini',
  responsibilities: [
    'Generate integration guides',
    'Setup instructions'
  ],
  output: {
    docs: 'docs/integration/**/*'
  }
}
```

**Collaboration Mechanism**:
```yaml
workflow:
  - parallel_generation
  - cross_reference
  - consistency_check
```

### Agent Team Decision Tree

```
Task Arrives
    ↓
Check Complexity
    ↓
Is it > 500 lines OR multi-file OR multi-stack?
    ↓ YES
Identify Task Type
    ↓
    ├─ Full-stack development → Full-Stack Development Team
    ├─ Refactoring → Refactoring Team
    └─ Documentation → Documentation Team
    ↓
Activate Agent Team
    ↓
    ├─ Create shared task list
    ├─ Assign roles
    ├─ Execute (parallel/sequential)
    └─ Aggregate results
```

---

## Complete Decision Tree

```
Task Arrives
    ↓
Analyze Task Complexity
    ↓
    ├─ Simple (< 100 lines, single file)
    │   ↓
    │   Check Context Independence
    │   ↓
    │   ├─ Independent → Subagent
    │   │   ├─ Code task → simple-task-executor
    │   │   ├─ Test task → quick-test-runner
    │   │   ├─ Doc task → doc-snippet-generator
    │   │   └─ Git task → git-commit-helper
    │   │
    │   └─ Needs Context → Main Agent
    │
    ├─ Medium (100-500 lines, 2-5 files)
    │   ↓
    │   Check Technology Stack
    │   ↓
    │   ├─ Single stack → Main Agent
    │   └─ Multi-stack → Agent Team
    │
    └─ Complex (> 500 lines, multi-file)
        ↓
        Identify Task Type
        ↓
        ├─ Full-stack → Full-Stack Development Team
        ├─ Refactoring → Refactoring Team
        └─ Documentation → Documentation Team
```

## Implementation

### Decision Engine

```typescript
// src/context-isolation/decision-engine.ts

export enum ExecutionMode {
  Subagent = 'subagent',
  MainAgent = 'main_agent',
  AgentTeam = 'agent_team'
}

export interface TaskAnalysis {
  lineCount: number;
  fileCount: number;
  techStacks: string[];
  needsContext: boolean;
  estimatedTime: number; // minutes
}

export class ContextIsolationDecision {
  decide(analysis: TaskAnalysis): ExecutionMode {
    // Simple task
    if (analysis.lineCount < 100 && analysis.fileCount === 1) {
      if (!analysis.needsContext && analysis.estimatedTime < 5) {
        return ExecutionMode.Subagent;
      }
      return ExecutionMode.MainAgent;
    }

    // Medium task
    if (
      analysis.lineCount >= 100 &&
      analysis.lineCount <= 500 &&
      analysis.fileCount >= 2 &&
      analysis.fileCount <= 5
    ) {
      if (analysis.techStacks.length === 1) {
        return ExecutionMode.MainAgent;
      }
      return ExecutionMode.AgentTeam;
    }

    // Complex task
    if (analysis.lineCount > 500 || analysis.fileCount > 5) {
      return ExecutionMode.AgentTeam;
    }

    // Default to main agent
    return ExecutionMode.MainAgent;
  }

  selectSubagent(taskType: string): string {
    const subagentMap: Record<string, string> = {
      code: 'simple-task-executor',
      test: 'quick-test-runner',
      doc: 'doc-snippet-generator',
      git: 'git-commit-helper'
    };

    return subagentMap[taskType] || 'simple-task-executor';
  }

  selectAgentTeam(taskType: string): string {
    const teamMap: Record<string, string> = {
      fullstack: 'full-stack-dev',
      refactor: 'refactoring-team',
      documentation: 'documentation-team'
    };

    return teamMap[taskType] || 'full-stack-dev';
  }
}
```

### Usage Example

```typescript
import { ContextIsolationDecision, TaskAnalysis } from './decision-engine';

const decision = new ContextIsolationDecision();

// Analyze task
const analysis: TaskAnalysis = {
  lineCount: 50,
  fileCount: 1,
  techStacks: ['typescript'],
  needsContext: false,
  estimatedTime: 3
};

// Make decision
const mode = decision.decide(analysis);
console.log(mode); // 'subagent'

// Execute based on decision
if (mode === 'subagent') {
  const subagent = decision.selectSubagent('code');
  await executeSubagent(subagent, task);
} else if (mode === 'main_agent') {
  await mainAgent.execute(task);
} else {
  const team = decision.selectAgentTeam('fullstack');
  await executeAgentTeam(team, task);
}
```

## Benefits

1. **Optimal Resource Usage**: Right execution mode for each task
2. **Context Protection**: Subagents don't pollute main context
3. **Parallel Execution**: Agent teams work simultaneously
4. **Scalability**: Easy to add new subagents or teams
5. **Flexibility**: Decision logic can be customized

## Related Documentation

- [CCA-ROUTING.md](./CCA-ROUTING.md) - Model routing rules
- [FLEXIBLE-WORKFLOW.md](./FLEXIBLE-WORKFLOW.md) - Workflow phases
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Overall architecture
