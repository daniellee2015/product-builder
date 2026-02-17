# Requirement Locking Mechanism

## Overview

The **Requirement Locking Mechanism** prevents requirement drift during Ralph's auto-retry loops by clearly defining which files can be modified and which must remain immutable.

## Problem Statement

### The Risk

```
Ralph retry → Modify files → JSON changes back to MD → Requirement drift → Bad results
```

**Example Scenario**:
1. User specifies: "Add dark mode with localStorage persistence"
2. OpenSpec review fails due to technical details
3. Ralph auto-fixes by modifying `proposal.md`
4. Core requirement changes to: "Add dark mode" (localStorage requirement lost)
5. Implementation doesn't match user intent

### Root Cause

Without clear boundaries, Ralph might modify **requirement source files** when it should only modify **implementation detail files**.

## Solution: File Classification

### 🔒 Immutable Files (Requirement Sources)

These files define **WHAT** the user wants. They must never be modified during auto-retry.

| File | Purpose | Why Immutable |
|------|---------|---------------|
| `proposal.md` | Core user requirements | Defines user intent |
| Original MDX | Requirement source | Original user input |
| `unified.json` | Merged requirements | Locked after Phase 1.4 |
| `docs.json` | Documentation requirements | Derived from user input |

### ⚠️ Mutable Files (Implementation Details)

These files define **HOW** to implement. They can be modified during auto-retry.

| File | Purpose | When Modifiable |
|------|---------|-----------------|
| `design.md` | Technical approach | Phase 1.3 (OpenSpec review) |
| `tasks.md` | Task breakdown | Phase 1.3 (OpenSpec review) |
| `tasks.json` | Task list | Phase 1.7 (Specs review) |
| `verification.json` | Verification rules | Phase 1.7 (Specs review) |
| `README.md` | Development guide | Phase 1.7 (Specs review) |
| Code files | Implementation | Phase 2 (Execution) |
| Test files | Tests | Phase 2 (Execution) |

## Locking Rules by Phase

### Phase 1.3: OpenSpec Review

**Context**: Multi-model review of OpenSpec

**Modifiable**:
- ✅ `design.md` - Technical solution can be adjusted
- ✅ `tasks.md` - Task breakdown can be refined

**Immutable**:
- 🔒 `proposal.md` - Core requirements locked
- 🔒 Original MDX - Source document locked

**Rationale**: Technical approach can change, but user requirements cannot.

---

### Phase 1.7: Specs Review

**Context**: Multi-model review of development specifications

**Modifiable**:
- ✅ `tasks.json` - Task list can be adjusted
- ✅ `verification.json` - Verification rules can be refined
- ✅ `README.md` - Development guide can be updated

**Immutable**:
- 🔒 `unified.json` - Merged requirements locked
- 🔒 `docs.json` - Documentation requirements locked
- 🔒 Original MDX - Source document locked

**Rationale**: Implementation details can change, but requirement definitions cannot.

---

### Phase 2: Execution (Task Implementation)

**Context**: Implementing individual tasks

**Modifiable**:
- ✅ Code files - Implementation can be modified
- ✅ Test files - Tests can be modified
- ✅ Code documentation - Comments can be updated

**Immutable**:
- 🔒 `tasks.json` - Task definition locked
- 🔒 `verification.json` - Verification standards locked
- 🔒 `unified.json` - Requirements locked

**Rationale**: Code can change to pass tests, but task definition and verification standards cannot.

---

### Phase 3.1: Acceptance Review

**Context**: Multi-model acceptance review

**Modifiable**:
- ✅ Code files - Implementation can be fixed
- ✅ Test files - Tests can be fixed
- ✅ Code documentation - Comments can be updated

**Immutable**:
- 🔒 `tasks.json` - Task definition locked
- 🔒 `unified.json` - Requirements locked

**Rationale**: Implementation can be fixed, but requirements and task definitions cannot.

## Ralph Configuration

### .ralph/PROMPT.md

```markdown
# Ralph Auto-Retry Configuration

## Your Role

You are Ralph, an auto-retry agent. Your job is to fix issues found during reviews WITHOUT changing core requirements.

## Critical Rules: Requirement Locking

### 🔒 NEVER MODIFY THESE FILES:

1. **proposal.md** - Core user requirements (IMMUTABLE)
2. **Original MDX files** - Requirement source (IMMUTABLE)
3. **unified.json** - Merged requirements (IMMUTABLE after Phase 1.4)
4. **docs.json** - Documentation requirements (IMMUTABLE after Phase 1.4)
5. **tasks.json** - Task definitions (IMMUTABLE after Phase 1.7)
6. **verification.json** - Verification standards (IMMUTABLE after Phase 1.7)

### ⚠️ YOU CAN MODIFY THESE FILES:

**During OpenSpec Review (Phase 1.3)**:
- design.md - Technical approach
- tasks.md - Task breakdown

**During Specs Review (Phase 1.7)**:
- tasks.json - Task list (ONLY in Phase 1.7)
- verification.json - Verification rules (ONLY in Phase 1.7)
- README.md - Development guide

**During Execution (Phase 2)**:
- Code files - Implementation
- Test files - Tests
- Code documentation - Comments

**During Acceptance (Phase 3.1)**:
- Code files - Implementation fixes
- Test files - Test fixes
- Code documentation - Comment updates

## How to Fix Issues

### Step 1: Identify the Phase

Check which phase you're in:
- Phase 1.3: OpenSpec Review
- Phase 1.7: Specs Review
- Phase 2: Execution
- Phase 3.1: Acceptance

### Step 2: Check File Modification Rules

Refer to the rules above for your current phase.

### Step 3: Fix Within Boundaries

- If the issue is in an IMMUTABLE file → Report to user, DO NOT FIX
- If the issue is in a MUTABLE file → Fix it

### Step 4: Verify Fix

After fixing, verify that:
1. You didn't modify any immutable files
2. The fix addresses the review feedback
3. The fix doesn't introduce new issues

## Examples

### ❌ WRONG: Modifying Core Requirements

```
Review Feedback: "The dark mode feature should use sessionStorage instead of localStorage"

Ralph Action: Modify proposal.md to change requirement
```

**Why Wrong**: This changes the user's core requirement. The user explicitly wanted localStorage.

### ✅ CORRECT: Modifying Implementation

```
Review Feedback: "The dark mode feature should use sessionStorage instead of localStorage"

Ralph Action: Report to user that this conflicts with core requirement in proposal.md
```

**Why Correct**: Ralph recognizes this is a requirement conflict and escalates to user.

---

### ❌ WRONG: Modifying Task Definition During Execution

```
Review Feedback: "Task 3 is too complex, should be split into 2 tasks"

Ralph Action (in Phase 2): Modify tasks.json to split task
```

**Why Wrong**: tasks.json is immutable during Phase 2. Task definitions are locked after Phase 1.7.

### ✅ CORRECT: Implementing Within Task Boundaries

```
Review Feedback: "Task 3 implementation is incomplete"

Ralph Action (in Phase 2): Complete the implementation without changing task definition
```

**Why Correct**: Ralph fixes the implementation without modifying the locked task definition.

## Escalation to User

If you encounter issues that require modifying immutable files, escalate to user:

```
⚠️ REQUIREMENT CONFLICT DETECTED

Issue: Review suggests changing [X] in [immutable_file]
Current Requirement: [current_value]
Suggested Change: [suggested_value]

This file is locked to prevent requirement drift.

Options:
1. Keep current requirement and adjust implementation
2. User manually updates requirement (requires new review cycle)

Please advise.
```
```

### .ralph/fix_plan.md

```markdown
# Ralph Fix Plan

## Phase-Specific Fix Strategies

### Phase 1.3: OpenSpec Review Fix

**Goal**: Fix technical approach without changing requirements

**Allowed Modifications**:
- design.md
- tasks.md

**Fix Strategy**:
1. Read review feedback
2. Identify technical issues (not requirement issues)
3. Update design.md with better technical approach
4. Update tasks.md with refined task breakdown
5. DO NOT touch proposal.md or original MDX

**Verification**:
- Check that proposal.md is unchanged
- Check that core requirements in design.md match proposal.md

---

### Phase 1.7: Specs Review Fix

**Goal**: Fix development specifications without changing requirements

**Allowed Modifications**:
- tasks.json
- verification.json
- README.md

**Fix Strategy**:
1. Read review feedback
2. Identify specification issues
3. Update tasks.json if task list needs adjustment
4. Update verification.json if verification rules need refinement
5. Update README.md if development guide needs clarification
6. DO NOT touch unified.json or docs.json

**Verification**:
- Check that unified.json is unchanged
- Check that tasks in tasks.json align with unified.json

---

### Phase 2: Execution Fix

**Goal**: Fix implementation without changing task definition

**Allowed Modifications**:
- Code files
- Test files
- Code documentation

**Fix Strategy**:
1. Read verification failure
2. Identify code issues
3. Fix code to pass verification
4. Update tests if needed
5. DO NOT touch tasks.json or verification.json

**Verification**:
- Run verification.json tests
- Check that tasks.json is unchanged

---

### Phase 3.1: Acceptance Fix

**Goal**: Fix implementation to meet acceptance criteria

**Allowed Modifications**:
- Code files
- Test files
- Code documentation

**Fix Strategy**:
1. Read acceptance review feedback
2. Identify implementation gaps
3. Fix code to meet acceptance criteria
4. Update tests if needed
5. DO NOT touch tasks.json or unified.json

**Verification**:
- Check that acceptance criteria are met
- Check that tasks.json and unified.json are unchanged

## Prohibited Actions

### NEVER DO THIS:

1. **Modify proposal.md** - This is the user's voice
2. **Modify original MDX** - This is the requirement source
3. **Modify unified.json after Phase 1.4** - Requirements are locked
4. **Modify tasks.json after Phase 1.7** - Task definitions are locked
5. **Change requirement semantics** - Even in mutable files

### Example of Prohibited Semantic Change:

```markdown
# design.md (BEFORE)
## Dark Mode Feature
- Use localStorage to persist user preference
- Default to system preference on first visit

# design.md (AFTER - WRONG)
## Dark Mode Feature
- Use sessionStorage to persist user preference  ← WRONG: Changed requirement
- Default to light mode on first visit  ← WRONG: Changed requirement
```

Even though design.md is mutable, changing the **semantic meaning** of requirements is prohibited.

## Correct Approach:

```markdown
# design.md (AFTER - CORRECT)
## Dark Mode Feature
- Use localStorage to persist user preference (as per proposal.md)
- Default to system preference on first visit (as per proposal.md)
- Implementation: Use window.matchMedia() to detect system preference
- Implementation: Use localStorage.setItem/getItem for persistence
```

Add implementation details without changing requirement semantics.
```

## Implementation

### File Lock Checker

```typescript
// src/ralph/lock-checker.ts

export enum Phase {
  OpenSpecReview = '1.3',
  SpecsReview = '1.7',
  Execution = '2',
  Acceptance = '3.1'
}

export interface LockRule {
  phase: Phase;
  immutable: string[];
  mutable: string[];
}

const LOCK_RULES: LockRule[] = [
  {
    phase: Phase.OpenSpecReview,
    immutable: ['proposal.md', '*.mdx', 'unified.json', 'docs.json'],
    mutable: ['design.md', 'tasks.md']
  },
  {
    phase: Phase.SpecsReview,
    immutable: ['proposal.md', '*.mdx', 'unified.json', 'docs.json'],
    mutable: ['tasks.json', 'verification.json', 'README.md']
  },
  {
    phase: Phase.Execution,
    immutable: ['proposal.md', '*.mdx', 'unified.json', 'docs.json', 'tasks.json', 'verification.json'],
    mutable: ['src/**/*.ts', 'src/**/*.tsx', 'tests/**/*']
  },
  {
    phase: Phase.Acceptance,
    immutable: ['proposal.md', '*.mdx', 'unified.json', 'docs.json', 'tasks.json'],
    mutable: ['src/**/*.ts', 'src/**/*.tsx', 'tests/**/*']
  }
];

export function isFileModifiable(filePath: string, phase: Phase): boolean {
  const rule = LOCK_RULES.find(r => r.phase === phase);
  if (!rule) return false;

  // Check if file matches immutable patterns
  for (const pattern of rule.immutable) {
    if (matchPattern(filePath, pattern)) {
      return false;
    }
  }

  // Check if file matches mutable patterns
  for (const pattern of rule.mutable) {
    if (matchPattern(filePath, pattern)) {
      return true;
    }
  }

  return false;
}

export function validateModifications(
  modifiedFiles: string[],
  phase: Phase
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  for (const file of modifiedFiles) {
    if (!isFileModifiable(file, phase)) {
      violations.push(`Cannot modify ${file} in phase ${phase}`);
    }
  }

  return {
    valid: violations.length === 0,
    violations
  };
}
```

### Usage in Ralph

```typescript
// Before modifying files
const phase = getCurrentPhase();
const filesToModify = ['design.md', 'proposal.md'];

const validation = validateModifications(filesToModify, phase);

if (!validation.valid) {
  console.error('Modification violations:', validation.violations);
  escalateToUser(validation.violations);
  return;
}

// Proceed with modifications
await modifyFiles(filesToModify);
```

## Benefits

1. **Prevents Requirement Drift**: Core requirements stay intact
2. **Clear Boundaries**: Developers know what can/cannot change
3. **Automatic Enforcement**: Ralph configuration enforces rules
4. **User Confidence**: Users trust that their requirements won't be silently changed
5. **Debugging**: Easy to trace when requirements changed

## Related Documentation

- [FLEXIBLE-WORKFLOW.md](./FLEXIBLE-WORKFLOW.md) - Workflow phases
- [CCA-ROUTING.md](./CCA-ROUTING.md) - Model routing
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Overall architecture
