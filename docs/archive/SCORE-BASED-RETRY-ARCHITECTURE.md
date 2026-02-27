# Score-Based Unlimited Retry Architecture

## Overview

This document describes the score-based unlimited retry mechanism implemented for the workflow orchestrator, replacing the previous count-based retry limit (3 attempts) with a quality-driven approach.

## Key Changes

### 1. Quality Gate Variable

**Location**: `src/config/workflow.json` - P3-AGGREGATE_REVIEW_RESULTS step

```json
"computed_variables": {
  "quality_gate_passed": "(review_score >= 8.5) && (blocking_issues_count == 0)",
  "review_needs_fix": "!quality_gate_passed",
  "review_passed": "quality_gate_passed && (all_issues_count == 0)",
  "review_passed_with_issues": "quality_gate_passed && (all_issues_count > 0)"
}
```

**Purpose**:
- `quality_gate_passed` is the canonical condition for determining if review quality is acceptable
- Requires both score >= 8.5 AND zero blocking issues
- Replaces the previous `auto_repair_attempts < 3` condition

### 2. Unlimited Retry with Safety Valves

**Location**: `src/config/workflow-source/transitions.json`

```json
{
  "from": "P3-FIX_ISSUES",
  "to": "P3-FINAL_REVIEW",
  "type": "loop_internal",
  "condition": "retry_review && !quality_gate_passed && review_cycle_count < 20"
}
```

**Safety Mechanisms**:
- **Maximum cycles**: 20 iterations (prevents infinite loops)
- **Human escalation**: After 12 cycles, workflow can escalate to human intervention
- **Stagnation detection**: Tracks review_cycle_count to identify stuck loops

### 3. Human Escalation Path

**Location**: `src/config/workflow-source/transitions.json`

```json
{
  "from": "P3-FIX_ISSUES",
  "to": "P3-HUMAN_ESCALATION",
  "condition": "review_cycle_count >= 12 && !quality_gate_passed"
}
```

**Purpose**: When automated fixes aren't improving quality after 12 cycles, escalate to human for guidance.

### 4. Multi-LLM Collaboration

**Location**: `src/config/workflow.json` - Step definitions

```json
{
  "id": "P3-FINAL_REVIEW",
  "llm_providers": ["codex", "gemini", "claude"],
  "llm_role": "reviewer"
}
```

```json
{
  "id": "P3-FIX_ISSUES",
  "llm_providers": ["claude"],
  "llm_role": "executor",
  "fallback_providers": ["codex", "gemini"]
}
```

**Features**:
- **Primary providers**: Main LLMs for the task
- **Fallback providers**: Used if primary fails
- **Role-based**: Separates reviewer (codex) from executor (claude)

### 5. Review Cycle Tracking

**Location**: `scripts/python/orchestrator.py` - `_update_variables_from_result` method

```python
# Track review cycle count for review-fix loops
if 'FIX_ISSUES' in step_id:
    if 'review_cycle_count' not in self.state['variables']:
        self.state['variables']['review_cycle_count'] = 0
    self.state['variables']['review_cycle_count'] += 1
    print(f"   📊 Review cycle count: {self.state['variables']['review_cycle_count']}")
```

**Purpose**: Tracks how many fix-review cycles have occurred for stagnation detection.

### 6. Computed Variables Support

**Location**: `scripts/python/orchestrator.py` - `_update_variables_from_result` method

```python
# Process computed_variables (expressions evaluated after step execution)
computed_vars = step.get('computed_variables', {})
for var_name, expression in computed_vars.items():
    try:
        self.state['variables'][var_name] = self._evaluate_expression(expression)
    except Exception as e:
        print(f"   ⚠️  Failed to evaluate computed variable '{var_name}': {e}")
        self.state['variables'][var_name] = False
```

**Purpose**: Allows steps to define variables computed from expressions after execution.

### 7. Enhanced Expression Evaluation

**Location**: `scripts/python/orchestrator.py` - `_evaluate_expression` method

Added support for:
- `>=` operator: `review_cycle_count >= 12`
- `<=` operator: `review_cycle_count <= 5`

## Workflow Execution Flow

```
P3-FINAL_REVIEW (codex reviews code)
    ↓
P3-AGGREGATE_REVIEW_RESULTS (compute quality_gate_passed)
    ↓
    ├─ quality_gate_passed = true → P3-HUMAN_FINAL_CONFIRMATION
    │
    └─ quality_gate_passed = false → P3-FIX_ISSUES (claude fixes issues)
           ↓
           ├─ review_cycle_count < 12 → P3-FINAL_REVIEW (retry)
           │
           ├─ review_cycle_count >= 12 → P3-HUMAN_ESCALATION (ask for help)
           │
           └─ review_cycle_count >= 20 → HALT (safety valve)
```

## Benefits

1. **Quality-Driven**: Continues until quality standards are met, not arbitrary attempt limits
2. **Safe**: Multiple safety valves prevent infinite loops
3. **Transparent**: Tracks cycle count and provides visibility into retry progress
4. **Flexible**: Human escalation path when automation isn't sufficient
5. **Multi-LLM**: Leverages different LLMs for different roles (review vs execution)

## Configuration

### Adjusting Quality Threshold

Edit `P3-AGGREGATE_REVIEW_RESULTS.computed_variables.quality_gate_passed`:

```json
"quality_gate_passed": "(review_score >= 8.0) && (blocking_issues_count == 0)"
```

### Adjusting Safety Limits

Edit transition conditions:

```json
"condition": "retry_review && !quality_gate_passed && review_cycle_count < 30"
```

### Adjusting Escalation Threshold

Edit escalation transition:

```json
"condition": "review_cycle_count >= 15 && !quality_gate_passed"
```

## Future Enhancements

1. **Database Integration**: Store review history in PostgreSQL for analytics
2. **Stagnation Detection**: Detect when score isn't improving across cycles
3. **Dynamic Thresholds**: Adjust quality threshold based on project complexity
4. **LLM Rotation**: Automatically try different LLMs if one consistently fails
5. **Parallel Reviews**: Run multiple reviewers in parallel and aggregate results

## Related Files

- `src/config/workflow.json` - Step definitions with computed_variables
- `src/config/workflow-source/transitions.json` - Transition conditions
- `scripts/python/orchestrator.py` - Execution engine with expression evaluation
- `docs/WORKFLOW-EXECUTOR-DISCUSSION.md` - Original design decisions
