# Flexible Workflow Design

## 1. Design Principles

*   **Hierarchical**: Workflows are broken down into Phases, Sub-phases, and Steps.
*   **Configurable**: Workflows are defined in YAML/JSON, not hardcoded.
*   **Elastic**: The number of steps can vary based on project needs (e.g., auto-healing loops).
*   **Adaptable**: Different project types (monorepo, library) have different default workflows.

## 2. Workflow Structure

### Phase (Level 1)
High-level stages of the product lifecycle.
*   Examples: `planning`, `execution`, `review`, `documentation`.
*   Properties: `id`, `name`, `required`, `sub-phases`.

### Sub-phase (Level 2)
Logical groupings of steps.
*   Examples: `requirement-analysis`, `spec-generation`, `task-management`.
*   Properties: `id`, `name`, `steps`.

### Step (Level 3)
Atomic units of work executed by tools or agents.
*   Examples: `mdx-to-openspec`, `task-execute`, `acceptance-review`.
*   Properties: `id`, `name`, `tool`, `retry-policy`.

## 3. Configuration Example (YAML)

```yaml
phases:
  - id: planning
    name: Planning Phase
    required: true
    sub-phases:
      - id: requirement-analysis
        name: Requirement Analysis
        steps:
          - capability-tree-query
          - job-create
          - mdx-to-openspec
          - openspec-review
      - id: spec-generation
        name: Spec Generation
        steps:
          - requirement-parse
          - capability-analyze
          - spec-generate
          - specs-review

  - id: execution
    name: Execution Phase
    required: true
    sub-phases:
      - id: task-management
        name: Task Management
        steps:
          - roadmap-generate
          - task-execute
          - task-verify
          - progress-update

  - id: review
    name: Review Phase
    required: false
    sub-phases:
      - id: acceptance
        name: Acceptance
        steps:
          - acceptance-review
```

## 4. Extension Mechanisms

### Custom Steps
Users can define custom steps in their project configuration that override or extend the default workflow.

### Skipping Steps
Workflows can be configured to skip certain steps based on conditions (e.g., skipping `roadmap-generate` for small libraries).

### Auto-healing Loops
Steps can be configured with retry policies that allow for "loops" (e.g., `task-execute` -> `task-verify` -> fail -> `task-execute`).
