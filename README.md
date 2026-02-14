# Product Builder

Configuration manager and workflow orchestrator for AI-driven product development.

## Overview

Product Builder is a CLI tool that helps you set up and orchestrate AI-powered development workflows. It acts like `create-react-app` or `vue-cli` but for AI-driven product development.

### What it does:
- ✅ Checks and installs dependencies (tmux, ccb, cca, ralph, openclaw)
- ✅ Generates configuration files (MCP servers, Skills, LLM APIs, CCA roles, Ralph prompts)
- ✅ Orchestrates flexible, layered workflows
- ✅ Provides utility tools for skill installation and session sync

### What it doesn't do:
- ❌ Implement ccb, cca, ralph, or openclaw (it uses them)
- ❌ Replace your existing tools (it configures and orchestrates them)

## Installation

```bash
npm install -g product-builder
```

## Quick Start

```bash
# Initialize Product Builder in your project
pb init

# Start a workflow
pb start "Build a new feature"

# Check status
pb status
```

## Architecture

Product Builder uses a decoupled dependency management system:

- `dependencies/system.json` - System-level tools (tmux, mongodb)
- `dependencies/cli-tools.json` - CLI tools (ccb, cca, ralph, openclaw)
- `dependencies/npm-packages.json` - Helper npm packages
- `dependencies/mcp-servers.json` - MCP server configurations
- `dependencies/skills.json` - Available skills
- `dependencies/hooks.json` - Lifecycle hooks
- `dependencies/plugins.json` - Plugin system

## Workflow Design

Workflows are hierarchical and flexible:

- **Phase** → High-level stage (Planning, Execution, Review)
- **Sub-phase** → Logical grouping (Requirement Analysis, Spec Generation)
- **Step** → Atomic unit (mdx-to-openspec, task-execute)

Workflows are configurable via YAML/JSON and can be adapted to different project types.

## Documentation

- [Architecture Design](docs/ARCHITECTURE.md)
- [Workflow Design](docs/WORKFLOW-DESIGN.md)
- [Dependencies](docs/DEPENDENCIES.md)

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Development mode
npm run dev

# Run tests
npm test
```

## License

MIT
