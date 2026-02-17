# CCA Model Routing Rules

## Overview

CCA (Cross-Context Assistant) coordinates multiple AI models (Claude, Gemini, Codex) by routing tasks to the most appropriate model based on task type, complexity, and model capabilities.

## Model Capability Matrix

### Claude (Sonnet 4.5)

| Capability | Rating | Notes |
|------------|--------|-------|
| Conversation | ⭐⭐⭐⭐⭐ | Best for natural dialogue |
| Code Generation | ⭐⭐⭐⭐⭐ | Strongest code implementation |
| Execution | ⭐⭐⭐⭐⭐ | Best at following instructions |
| Context Window | 200K tokens | Good for medium-sized contexts |
| Speed | Medium | Balanced speed/quality |

**Best For**:
- Requirement discussion with users
- Code implementation
- Git operations
- Task execution
- Documentation writing

---

### Gemini (2.0 Flash)

| Capability | Rating | Notes |
|------------|--------|-------|
| Multi-angle Analysis | ⭐⭐⭐⭐⭐ | Excellent at finding issues |
| Large Content | ⭐⭐⭐⭐⭐ | Handles massive contexts |
| Web Search | ⭐⭐⭐⭐⭐ | Built-in web search |
| Context Window | 1M+ tokens | Best for large codebases |
| Speed | Fast | Fastest response time |

**Best For**:
- SPEC review (multi-angle analysis)
- Code review (finding issues)
- Documentation generation (large context)
- Quick tasks (fast turnaround)

---

### Codex (GPT-4)

| Capability | Rating | Notes |
|------------|--------|-------|
| Codebase Familiarity | ⭐⭐⭐⭐⭐ | Excellent code understanding |
| Code Search | ⭐⭐⭐⭐⭐ | Best at finding code patterns |
| Pattern Recognition | ⭐⭐⭐⭐⭐ | Identifies code smells |
| Context Window | 128K tokens | Good for focused analysis |
| Speed | Medium | Balanced speed/quality |

**Best For**:
- Codebase exploration
- Code search and analysis
- Pattern recognition
- Technical review

## Routing Rules by Task Type

### 1. Requirement Review (需求审查)

**Models**: Claude + Gemini + Codex (Multi-model)

**Routing Logic**:
```yaml
task: requirement_review
phase: 1.3
models:
  - name: claude
    role: primary_reviewer
    prompt: "Review OpenSpec for clarity and completeness"

  - name: gemini
    role: second_opinion
    prompt: "Review OpenSpec from different angle, find potential issues"

  - name: codex
    role: technical_reviewer
    prompt: "Review OpenSpec for technical feasibility"

aggregation:
  method: weighted_vote
  weights:
    claude: 0.4
    gemini: 0.4
    codex: 0.2

  success_criteria:
    pass_rate: ">= 75%"
    critical_issues: "== 0"
    medium_issues: "<= 2"
```

**Why Multi-Model**:
- Cross-validation prevents single-model bias
- Different perspectives catch more issues
- Reduces false positives/negatives

---

### 2. Code Generation (代码生成)

**Model**: Claude (Single-model)

**Routing Logic**:
```yaml
task: code_generation
phase: 2.1
model: claude
reason: "Strongest code implementation capability"

decision_tree:
  - if: task_complexity == 'simple'
    then: use_subagent(claude)

  - if: task_complexity == 'medium'
    then: main_agent(claude)

  - if: task_complexity == 'complex'
    then: agent_team(claude_frontend, claude_backend, gemini_testing)
```

**Why Claude**:
- Best code generation quality
- Follows specifications accurately
- Good at handling edge cases

---

### 3. Code Review (代码审查)

**Models**: Claude + Gemini + Codex (Multi-model)

**Routing Logic**:
```yaml
task: code_review
phase: 3.1
models:
  - name: claude
    role: primary_reviewer
    prompt: "Review code for correctness and quality"

  - name: gemini
    role: comprehensive_reviewer
    prompt: "Review entire codebase for issues and improvements"

  - name: codex
    role: pattern_reviewer
    prompt: "Review code for patterns and best practices"

aggregation:
  method: consensus
  success_criteria:
    pass_rate: ">= 75%"
    critical_issues: "== 0"
    medium_issues: "<= 2"
```

**Why Multi-Model**:
- Comprehensive coverage
- Different models catch different issues
- Reduces chance of missing critical bugs

---

### 4. Documentation Generation (文档生成)

**Model**: Claude (Single-model)

**Routing Logic**:
```yaml
task: documentation_generation
phase: 1.8, 4.4, 4.5
model: claude
reason: "Best documentation writing capability"

subtasks:
  - global_view: claude
  - planning_docs: claude
  - api_docs: claude
  - architecture_docs: claude
```

**Why Claude**:
- Best natural language generation
- Understands context well
- Produces clear, structured docs

---

### 5. Data Analysis (数据分析)

**Model**: Claude (Single-model)

**Routing Logic**:
```yaml
task: data_analysis
phase: 1.5
model: claude
reason: "Strongest reasoning capability"

subtasks:
  - capability_comparison: claude
  - gap_analysis: claude
  - recommendation: claude
```

**Why Claude**:
- Best reasoning and analysis
- Good at comparing and contrasting
- Clear recommendations

---

### 6. Quick Tasks (快速任务)

**Model**: Gemini (Single-model)

**Routing Logic**:
```yaml
task: quick_task
phase: any
model: gemini
reason: "Fastest response time, lowest cost"

examples:
  - git_commit_message: gemini
  - test_execution: gemini
  - simple_refactoring: gemini
```

**Why Gemini**:
- Fastest response
- Lowest cost
- Good enough quality for simple tasks

---

### 7. Codebase Exploration (代码库探索)

**Model**: Codex (Single-model)

**Routing Logic**:
```yaml
task: codebase_exploration
phase: any
model: codex
reason: "Best code search and understanding"

subtasks:
  - find_similar_code: codex
  - understand_architecture: codex
  - identify_patterns: codex
```

**Why Codex**:
- Best at understanding existing code
- Excellent code search
- Good pattern recognition

## Multi-Model Review Aggregation

### Aggregation Algorithm

```typescript
interface ReviewResult {
  model: 'claude' | 'gemini' | 'codex';
  pass: boolean;
  issues: Issue[];
}

interface Issue {
  severity: 'critical' | 'medium' | 'low';
  description: string;
  file?: string;
  line?: number;
}

function aggregateReviews(results: ReviewResult[]): AggregatedResult {
  // Calculate pass rate
  const passCount = results.filter(r => r.pass).length;
  const passRate = passCount / results.length;

  // Aggregate issues
  const allIssues = results.flatMap(r => r.issues);
  const criticalCount = allIssues.filter(i => i.severity === 'critical').length;
  const mediumCount = allIssues.filter(i => i.severity === 'medium').length;

  // Determine overall result
  const success =
    passRate >= 0.75 &&
    criticalCount === 0 &&
    mediumCount <= 2;

  return {
    success,
    passRate,
    criticalCount,
    mediumCount,
    issues: deduplicateIssues(allIssues)
  };
}

function deduplicateIssues(issues: Issue[]): Issue[] {
  // Group similar issues from different models
  const grouped = new Map<string, Issue[]>();

  for (const issue of issues) {
    const key = `${issue.file}:${issue.line}:${issue.severity}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(issue);
  }

  // Keep issues mentioned by multiple models
  return Array.from(grouped.values())
    .filter(group => group.length >= 2)
    .map(group => group[0]);
}
```

### Success Criteria

```yaml
success_criteria:
  # At least 75% of models must pass
  pass_rate: ">= 75%"

  # No critical issues allowed
  critical_issues: "== 0"

  # Maximum 2 medium issues
  medium_issues: "<= 2"

  # Low issues are acceptable
  low_issues: "any"
```

### Example Scenarios

#### Scenario 1: All Pass
```
Claude: PASS (0 critical, 0 medium, 1 low)
Gemini: PASS (0 critical, 1 medium, 0 low)
Codex: PASS (0 critical, 0 medium, 2 low)

Result: SUCCESS
- Pass rate: 100% (3/3)
- Critical: 0
- Medium: 1
```

#### Scenario 2: One Fail, But Acceptable
```
Claude: PASS (0 critical, 1 medium, 0 low)
Gemini: FAIL (0 critical, 2 medium, 1 low)
Codex: PASS (0 critical, 0 medium, 1 low)

Result: FAIL (medium issues > 2)
- Pass rate: 67% (2/3) - Below 75%
- Critical: 0
- Medium: 3 - Exceeds limit
```

#### Scenario 3: Critical Issue
```
Claude: PASS (0 critical, 0 medium, 0 low)
Gemini: PASS (0 critical, 0 medium, 0 low)
Codex: FAIL (1 critical, 0 medium, 0 low)

Result: FAIL (critical issue found)
- Pass rate: 67% (2/3)
- Critical: 1 - Not allowed
- Medium: 0
```

## CCA Configuration

### .autoflow/roles.json

```json
{
  "version": "1.0.0",
  "roles": {
    "claude": {
      "model": "claude-sonnet-4-5",
      "capabilities": [
        "conversation",
        "code_generation",
        "documentation",
        "execution"
      ],
      "primary_tasks": [
        "requirement_discussion",
        "code_implementation",
        "git_operations",
        "documentation_writing"
      ]
    },
    "gemini": {
      "model": "gemini-2.0-flash",
      "capabilities": [
        "multi_angle_analysis",
        "large_content",
        "web_search",
        "fast_execution"
      ],
      "primary_tasks": [
        "spec_review",
        "code_review",
        "quick_tasks",
        "documentation_generation"
      ]
    },
    "codex": {
      "model": "gpt-4",
      "capabilities": [
        "codebase_familiarity",
        "code_search",
        "pattern_recognition"
      ],
      "primary_tasks": [
        "codebase_exploration",
        "code_search",
        "technical_review"
      ]
    }
  },
  "routing_rules": {
    "requirement_review": {
      "type": "multi_model",
      "models": ["claude", "gemini", "codex"],
      "aggregation": "weighted_vote"
    },
    "code_generation": {
      "type": "single_model",
      "model": "claude"
    },
    "code_review": {
      "type": "multi_model",
      "models": ["claude", "gemini", "codex"],
      "aggregation": "consensus"
    },
    "documentation_generation": {
      "type": "single_model",
      "model": "claude"
    },
    "quick_task": {
      "type": "single_model",
      "model": "gemini"
    },
    "codebase_exploration": {
      "type": "single_model",
      "model": "codex"
    }
  }
}
```

## Routing Decision Tree

```
Task Arrives
    ↓
Identify Task Type
    ↓
    ├─ Requirement Review → Multi-model (Claude + Gemini + Codex)
    ├─ Code Generation → Single-model (Claude)
    ├─ Code Review → Multi-model (Claude + Gemini + Codex)
    ├─ Documentation → Single-model (Claude)
    ├─ Data Analysis → Single-model (Claude)
    ├─ Quick Task → Single-model (Gemini)
    └─ Codebase Exploration → Single-model (Codex)
    ↓
Route to Model(s)
    ↓
Execute Task
    ↓
    ├─ Single-model → Return result
    └─ Multi-model → Aggregate results
    ↓
Return to CCA
```

## Implementation

### Router Implementation

```typescript
// src/cca/router.ts

export enum TaskType {
  RequirementReview = 'requirement_review',
  CodeGeneration = 'code_generation',
  CodeReview = 'code_review',
  Documentation = 'documentation_generation',
  DataAnalysis = 'data_analysis',
  QuickTask = 'quick_task',
  CodebaseExploration = 'codebase_exploration'
}

export enum Model {
  Claude = 'claude',
  Gemini = 'gemini',
  Codex = 'codex'
}

export interface RoutingDecision {
  type: 'single_model' | 'multi_model';
  models: Model[];
  aggregation?: 'weighted_vote' | 'consensus';
}

export class CCARouter {
  private rules: Map<TaskType, RoutingDecision>;

  constructor() {
    this.rules = new Map([
      [TaskType.RequirementReview, {
        type: 'multi_model',
        models: [Model.Claude, Model.Gemini, Model.Codex],
        aggregation: 'weighted_vote'
      }],
      [TaskType.CodeGeneration, {
        type: 'single_model',
        models: [Model.Claude]
      }],
      [TaskType.CodeReview, {
        type: 'multi_model',
        models: [Model.Claude, Model.Gemini, Model.Codex],
        aggregation: 'consensus'
      }],
      [TaskType.Documentation, {
        type: 'single_model',
        models: [Model.Claude]
      }],
      [TaskType.QuickTask, {
        type: 'single_model',
        models: [Model.Gemini]
      }],
      [TaskType.CodebaseExploration, {
        type: 'single_model',
        models: [Model.Codex]
      }]
    ]);
  }

  route(taskType: TaskType): RoutingDecision {
    const decision = this.rules.get(taskType);
    if (!decision) {
      throw new Error(`No routing rule for task type: ${taskType}`);
    }
    return decision;
  }
}
```

### Usage Example

```typescript
import { CCARouter, TaskType } from './cca/router';

const router = new CCARouter();

// Route requirement review
const decision = router.route(TaskType.RequirementReview);
console.log(decision);
// {
//   type: 'multi_model',
//   models: ['claude', 'gemini', 'codex'],
//   aggregation: 'weighted_vote'
// }

// Execute task with routed models
if (decision.type === 'multi_model') {
  const results = await Promise.all(
    decision.models.map(model => executeTask(model, task))
  );
  const aggregated = aggregateReviews(results);
  return aggregated;
} else {
  return await executeTask(decision.models[0], task);
}
```

## Benefits

1. **Optimal Model Selection**: Each task goes to the best model
2. **Cost Efficiency**: Use cheaper models for simple tasks
3. **Quality Assurance**: Multi-model review catches more issues
4. **Speed Optimization**: Fast models for quick tasks
5. **Flexibility**: Easy to add new models or routing rules

## Related Documentation

- [FLEXIBLE-WORKFLOW.md](./FLEXIBLE-WORKFLOW.md) - Workflow phases
- [CONTEXT-ISOLATION.md](./CONTEXT-ISOLATION.md) - Subagent vs Agent Team decisions
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Overall architecture
