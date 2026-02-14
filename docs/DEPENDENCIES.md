# Dependency Management

## Overview
Dependencies are managed via decoupled JSON files in the `dependencies/` directory.

## Categories

### 1. System Dependencies (`system.json`)
*   **tmux**: Required for session management.
*   **mongodb**: Optional database backend.
*   **node**: Runtime environment.

### 2. CLI Tools (`cli-tools.json`)
*   **ccb**: Claude Code CLI.
*   **cca**: Multi-model coordinator (Context-Aware Assistant).
*   **ralph**: Auto-retry and loop mechanism.
*   **openclaw**: Task monitoring and execution engine.

### 3. NPM Packages (`npm-packages.json`)
Custom helper packages (placeholders):
*   `@waoooo/[skill-installer]`: Skill management.
*   `@waoooo/[session-sync]`: Session synchronization.
*   `@waoooo/[cca-helper]`: CCA orchestration.

### 4. MCP Servers (`mcp-servers.json`)
Model Context Protocol servers:
*   `@modelcontextprotocol/server-github`
*   `@modelcontextprotocol/server-mongodb`
*   `@context7/mcp-server`
*   `@executeautomation/playwright-mcp-server`

### 5. Skills (`skills.json`)
List of skills available to the Product Builder (e.g., `mdx-to-openspec`, `task-execute`).

### 6. Hooks (`hooks.json`)
Lifecycle hooks for the build process (e.g., `pre-init`, `post-generate`).

### 7. Plugins (`plugins.json`)
Extensions to the Product Builder core.
