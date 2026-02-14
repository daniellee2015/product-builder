# Product Builder Architecture Design

## 1. Core Positioning

**Product Builder** is positioned as a **Configuration Manager**, **Dependency Installer**, and **Flexible Workflow Orchestrator**. It acts similarly to `create-react-app` or `vue-cli` but for AI-driven product development workflows.

### What it DOES:
1.  **Check Dependencies**: Verifies the presence of required tools (tmux, ccb, cca, ralph, openclaw, etc.).
2.  **Install Dependencies**: Automatically installs missing tools.
3.  **Generate Configuration**: Creates necessary config files (MCP servers, Skills lists, LLM API configs, CCA roles, Ralph prompts).
4.  **Orchestrate Workflows**: Executes flexible, layered workflows defined by configuration.
5.  **Provide Glue Tools**: Offers utilities for specific tasks via npm packages (e.g., skill installation, session sync).

### What it does NOT do:
*   ❌ Implement the core logic of `ccb`, `cca`, `ralph`, or `openclaw`. It only configures and invokes them.

## 2. Architecture Overview

```mermaid
graph TD
    PB[Product Builder CLI] --> DC[Dependency Checker]
    PB --> DI[Dependency Installer]
    PB --> CG[Config Generator]
    PB --> WE[Workflow Engine]

    subgraph Dependencies
        DC --> SYS[System (tmux, mongodb)]
        DC --> CLI[CLI Tools (ccb, cca, ralph)]
        DC --> NPM[NPM Packages]
        DC --> MCP[MCP Servers]
    end

    subgraph Configuration
        CG --> LLM[LLM API Config]
        CG --> CCA[CCA Roles]
        CG --> RALPH[Ralph Prompts]
        CG --> SKILLS[Skills List]
        CG --> HOOKS[Hooks Config]
    end

    subgraph Workflow
        WE --> PLAN[Planning Phase]
        WE --> EXEC[Execution Phase]
        WE --> REV[Review Phase]
    end
```

## 3. Dependency Management (Decoupled)

Dependencies are managed via decoupled JSON configuration files in the `dependencies/` directory:

*   `system.json`: System-level tools (e.g., tmux, mongodb).
*   `cli-tools.json`: Core AI CLI tools (ccb, cca, ralph, openclaw).
*   `npm-packages.json`: Custom helper packages (e.g., skill-installer, session-sync).
*   `mcp-servers.json`: Model Context Protocol server configurations.
*   `skills.json`: List of available skills and their metadata.
*   `hooks.json`: Configuration for lifecycle hooks (e.g., pre-commit, post-generate).
*   `plugins.json`: Extensions for the builder itself.

## 4. Flexible Workflow Design

The workflow engine is designed to be **layered**, **elastic**, and **configurable**.

### Structure
*   **Phase**: High-level stage (e.g., Planning, Execution, Review).
*   **Sub-phase**: Logical grouping within a phase (e.g., Requirement Analysis, Spec Generation).
*   **Step**: Atomic unit of work (e.g., `mdx-to-openspec`, `task-execute`).

### Configuration
Workflows are defined in YAML/JSON, allowing for:
*   **Project Type Adaptation**: Different flows for Monorepo vs. Single-repo vs. Library.
*   **Dynamic Steps**: Steps can be skipped or repeated based on context.
*   **Custom Extensions**: Users can inject custom steps or modify existing ones.

## 5. NPM Package Placeholders

The following internal tools are referenced by placeholder names until finalized:

*   `@waoooo/[skill-installer]`: Installs skills to the target directory.
*   `@waoooo/[session-sync]`: Synchronizes sessions across multiple tmux windows.
*   `@waoooo/[cca-helper]`: Assists with CCA multi-model orchestration.

## 6. Directory Structure

```
product-builder/
├── package.json
├── bin/
│   └── pb.js                  # CLI Entry Point
├── src/
│   ├── cli/                   # Command implementations (init, install, start)
│   ├── checkers/              # Dependency checks
│   ├── installers/            # Installation logic
│   ├── generators/            # Config generation logic
│   ├── orchestrator/          # Workflow engine
│   └── config/                # Internal config
├── templates/                 # Config templates
├── dependencies/              # Decoupled dependency configs
│   ├── system.json
│   ├── cli-tools.json
│   ├── npm-packages.json
│   ├── mcp-servers.json
│   ├── skills.json
│   ├── hooks.json
│   └── plugins.json
└── docs/                      # Documentation
    ├── ARCHITECTURE.md
    ├── WORKFLOW-DESIGN.md
    └── DEPENDENCIES.md
```
