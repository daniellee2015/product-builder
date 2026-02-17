# Configuration Abstraction Layer

## Overview

Product Builder uses a **decoupled configuration system** to achieve project-agnostic replicability. Instead of hardcoding paths and settings, all project-specific information is abstracted into configuration files.

## Design Principles

1. **Separation of Concerns**: Dependencies, paths, and project settings are in separate files
2. **Replicability**: Any project can use Product Builder by providing its own configuration
3. **Version Control**: Configuration files can be committed to track project evolution
4. **Extensibility**: New configuration categories can be added without breaking existing setups

## Configuration Structure

```
.product-builder/
├── config.json              # Project metadata and settings
├── paths.json               # Path mappings (absolute and relative)
└── dependencies/            # Decoupled dependency configurations
    ├── system.json          # System-level dependencies (tmux, node, mongodb)
    ├── cli-tools.json       # CLI tools (ccb, cca, ralph, openclaw)
    ├── npm-packages.json    # NPM packages (@waoooo/*)
    ├── mcp-servers.json     # MCP servers (github, mongodb, context7, playwright)
    ├── skills.json          # Available skills
    ├── hooks.json           # Lifecycle hooks
    └── plugins.json         # Extensions
```

## Core Configuration Files

### 1. config.json - Project Metadata

Defines project-level settings and metadata.

```json
{
  "version": "1.0.0",
  "project": {
    "name": "waoooo",
    "type": "monorepo",
    "structure": {
      "frontend": "./waoooo-web",
      "backend": "./waoooo-service",
      "docs": "./waoooo-docs/developer-docs",
      "openspec": "./openspec"
    }
  },
  "productBuilder": {
    "location": "./waoooo-web/tools/waoooo-product-builder",
    "exports": "./waoooo-web/tools/waoooo-product-builder/exports"
  },
  "git": {
    "branchPrefix": "feature/",
    "commitConvention": "conventional-commits"
  },
  "models": {
    "primary": "claude-sonnet-4",
    "secondary": ["gemini-2.0-flash", "codex"],
    "fast": "gemini-2.0-flash"
  }
}
```

### 2. paths.json - Path Mappings

Defines both absolute and relative paths for flexible access.

```json
{
  "version": "1.0.0",
  "absolute": {
    "projectRoot": "/Users/danlio/Repositories/waoooo",
    "frontend": "/Users/danlio/Repositories/waoooo/waoooo-web",
    "backend": "/Users/danlio/Repositories/waoooo/waoooo-service",
    "docs": "/Users/danlio/Repositories/waoooo/waoooo-docs/developer-docs"
  },
  "relative": {
    "fromProductBuilder": {
      "projectRoot": "../../../",
      "frontend": "../../",
      "backend": "../../../../waoooo-service",
      "docs": "../../../../waoooo-docs/developer-docs",
      "openspec": "../../../openspec"
    }
  },
  "capabilities": {
    "tree": "./exports/capability-tree/capability-tree.json",
    "docs": "./waoooo-docs/developer-docs/capabilities"
  },
  "jobs": {
    "output": "./exports/jobs",
    "generated": "./exports/generated"
  }
}
```

## Dependency Configuration Files

All dependency configurations are in `dependencies/` directory. See [DEPENDENCIES.md](./DEPENDENCIES.md) for details.

### Key Files:
- **system.json**: System dependencies (tmux, mongodb, node)
- **cli-tools.json**: CLI tools (ccb, cca, ralph, openclaw)
- **npm-packages.json**: NPM packages for helpers
- **mcp-servers.json**: MCP server configurations
- **skills.json**: Available skills list
- **hooks.json**: Lifecycle hooks
- **plugins.json**: Plugin extensions

## Usage in Code

### Reading Configuration

```typescript
// src/config/index.ts
import { readFileSync } from 'fs';
import { join } from 'path';

export interface ProjectConfig {
  version: string;
  project: {
    name: string;
    type: 'monorepo' | 'single-repo';
    structure: Record<string, string>;
  };
  productBuilder: {
    location: string;
    exports: string;
  };
  git: {
    branchPrefix: string;
    commitConvention: string;
  };
  models: {
    primary: string;
    secondary: string[];
    fast: string;
  };
}

export interface PathsConfig {
  version: string;
  absolute: Record<string, string>;
  relative: {
    fromProductBuilder: Record<string, string>;
  };
  capabilities: {
    tree: string;
    docs: string;
  };
  jobs: {
    output: string;
    generated: string;
  };
}

export function getProjectConfig(): ProjectConfig {
  const configPath = join(process.cwd(), '.product-builder', 'config.json');
  return JSON.parse(readFileSync(configPath, 'utf-8'));
}

export function getPathsConfig(): PathsConfig {
  const pathsPath = join(process.cwd(), '.product-builder', 'paths.json');
  return JSON.parse(readFileSync(pathsPath, 'utf-8'));
}

export function resolveProjectPath(key: string): string {
  const paths = getPathsConfig();
  return paths.absolute[key] || paths.relative.fromProductBuilder[key];
}
```

### Using in Skills

```typescript
// ❌ WRONG: Hardcoded paths
const projectRoot = '/Users/danlio/Repositories/waoooo';

// ✅ CORRECT: Use configuration
import { resolveProjectPath } from './config';
const projectRoot = resolveProjectPath('projectRoot');
```

### Using in CLAUDE.md

```markdown
❌ WRONG: Hardcoded
cd /Users/danlio/Repositories/waoooo/waoooo-web

✅ CORRECT: Use variables
cd ${PROJECT_ROOT}/waoooo-web
```

### Using in CCA Configuration

```json
❌ WRONG: Hardcoded
{
  "workingDirectory": "/Users/danlio/Repositories/waoooo"
}

✅ CORRECT: Use configuration
{
  "workingDirectory": "${PROJECT_ROOT}"
}
```

## Initialization Workflow

### Command: `npx @waoooo/product-builder init`

```bash
# 1. Run initialization in any project
cd /path/to/your-project
npx @waoooo/product-builder init

# 2. Interactive configuration
? Project name: your-project
? Project type: (monorepo / single-repo)
? Frontend path: ./frontend
? Backend path: ./backend
? Docs path: ./docs

# 3. Generated files
✅ Created .product-builder/config.json
✅ Created .product-builder/paths.json
✅ Created .product-builder/dependencies/ (copied from template)

# 4. Install Product Builder
✅ Installed Product Builder to ./tools/product-builder
```

### Implementation Steps

1. **Detect Project Structure**
   ```typescript
   function detectProjectStructure(rootPath: string): ProjectStructure {
     // Scan for common directories
     const hasFrontend = existsSync(join(rootPath, 'frontend')) ||
                        existsSync(join(rootPath, 'src'));
     const hasBackend = existsSync(join(rootPath, 'backend')) ||
                       existsSync(join(rootPath, 'server'));
     // ...
   }
   ```

2. **Generate config.json**
   ```typescript
   function generateConfig(answers: InitAnswers): ProjectConfig {
     return {
       version: '1.0.0',
       project: {
         name: answers.projectName,
         type: answers.projectType,
         structure: answers.structure
       },
       // ...
     };
   }
   ```

3. **Generate paths.json**
   ```typescript
   function generatePaths(rootPath: string, structure: ProjectStructure): PathsConfig {
     return {
       version: '1.0.0',
       absolute: {
         projectRoot: rootPath,
         frontend: join(rootPath, structure.frontend),
         // ...
       },
       // ...
     };
   }
   ```

4. **Copy Dependency Templates**
   ```typescript
   function copyDependencyTemplates(targetDir: string): void {
     const templateDir = join(__dirname, '../templates/dependencies');
     copySync(templateDir, join(targetDir, 'dependencies'));
   }
   ```

## Migration from Hardcoded Paths

### Step 1: Identify Hardcoded Paths

```bash
# Search for hardcoded waoooo paths
grep -r "/Users/danlio/Repositories/waoooo" .
grep -r "waoooo-web" .
grep -r "waoooo-service" .
```

### Step 2: Replace with Configuration

```typescript
// Before
const docsPath = '/Users/danlio/Repositories/waoooo/waoooo-docs/developer-docs';

// After
import { resolveProjectPath } from './config';
const docsPath = resolveProjectPath('docs');
```

### Step 3: Update CLAUDE.md

```markdown
# Before
cd /Users/danlio/Repositories/waoooo/waoooo-web
npm run dev

# After
cd ${PROJECT_ROOT}/${FRONTEND_DIR}
npm run dev
```

### Step 4: Update Skills

All skills should use configuration instead of hardcoded paths:

```typescript
// skill-template.ts
import { getProjectConfig, resolveProjectPath } from '@waoooo/product-builder/config';

export async function executeSkill() {
  const config = getProjectConfig();
  const projectRoot = resolveProjectPath('projectRoot');
  const frontend = resolveProjectPath('frontend');

  // Use config values
  console.log(`Working on project: ${config.project.name}`);
  console.log(`Frontend path: ${frontend}`);
}
```

## Configuration Validation

### Validator Implementation

```typescript
// src/config/validator.ts
import Ajv from 'ajv';

const configSchema = {
  type: 'object',
  required: ['version', 'project', 'productBuilder'],
  properties: {
    version: { type: 'string' },
    project: {
      type: 'object',
      required: ['name', 'type', 'structure'],
      properties: {
        name: { type: 'string' },
        type: { enum: ['monorepo', 'single-repo'] },
        structure: { type: 'object' }
      }
    }
    // ...
  }
};

export function validateConfig(config: unknown): boolean {
  const ajv = new Ajv();
  const validate = ajv.compile(configSchema);
  return validate(config);
}
```

### Usage

```typescript
import { getProjectConfig, validateConfig } from './config';

const config = getProjectConfig();
if (!validateConfig(config)) {
  throw new Error('Invalid configuration');
}
```

## Best Practices

1. **Never Hardcode Paths**: Always use configuration
2. **Version Configuration**: Track config changes in git
3. **Validate on Load**: Always validate configuration before use
4. **Document Defaults**: Provide sensible defaults for optional fields
5. **Support Migration**: Provide tools to migrate from hardcoded to config-based

## Future Enhancements

1. **Environment-Specific Configs**: Support dev/staging/prod configurations
2. **Config Inheritance**: Allow projects to extend base configurations
3. **Remote Configs**: Support loading configs from remote sources
4. **Config UI**: Web interface for editing configurations
5. **Auto-Detection**: Smarter project structure detection

## Related Documentation

- [DEPENDENCIES.md](./DEPENDENCIES.md) - Dependency management details
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Overall architecture
- [WORKFLOW-DESIGN.md](./WORKFLOW-DESIGN.md) - Workflow configuration
