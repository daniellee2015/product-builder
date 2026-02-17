/**
 * File Generator Module
 *
 * Generates project files and directory structures
 */

import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import type { ProjectConfig } from '../config';

/**
 * Generate project directory structure
 */
export async function generateDirectoryStructure(config: ProjectConfig): Promise<void> {
  console.log(chalk.blue('\n📁 Creating directory structure...\n'));

  const directories = [
    config.paths.specs,
    config.paths.capabilities,
    config.paths.exports,
    config.paths.docs,
    config.paths.config,
    path.join(config.paths.exports, 'proposals'),
    path.join(config.paths.exports, 'specs'),
    path.join(config.paths.exports, 'capabilities'),
    path.join(config.paths.exports, 'code')
  ];

  for (const dir of directories) {
    const fullPath = path.join(config.projectRoot, dir);
    try {
      await fs.mkdir(fullPath, { recursive: true });
      console.log(chalk.green(`  ✓ Created ${dir}`));
    } catch (error) {
      console.log(chalk.yellow(`  ⚠️  Failed to create ${dir}: ${error}`));
    }
  }

  console.log();
}

/**
 * Generate README.md
 */
export async function generateReadme(config: ProjectConfig): Promise<void> {
  const content = `# ${config.projectName}

AI-Driven Product Development Project

## Overview

This project uses Product Builder for automated product development workflow.

## Directory Structure

\`\`\`
${config.paths.specs}/          # OpenSpec requirement documents
${config.paths.capabilities}/   # Reusable capability modules
${config.paths.exports}/        # Generated outputs
${config.paths.docs}/           # Project documentation
${config.paths.config}/         # Configuration files
\`\`\`

## Getting Started

1. Initialize the project:
   \`\`\`bash
   pb init
   \`\`\`

2. Start a new workflow:
   \`\`\`bash
   pb start
   \`\`\`

3. Check workflow status:
   \`\`\`bash
   pb status
   \`\`\`

## Documentation

- [Architecture](${config.paths.docs}/ARCHITECTURE.md)
- [Workflow Design](${config.paths.docs}/WORKFLOW-DESIGN.md)
- [Configuration](${config.paths.docs}/CONFIG.md)

## License

MIT
`;

  const readmePath = path.join(config.projectRoot, 'README.md');
  await fs.writeFile(readmePath, content, 'utf-8');
  console.log(chalk.green(`✅ Generated README.md`));
}

/**
 * Generate .gitignore
 */
export async function generateGitignore(config: ProjectConfig): Promise<void> {
  const content = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
*.tsbuildinfo

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Product Builder
${config.paths.config}/
${config.paths.exports}/
.product-builder-cache/

# Logs
logs/
*.log
`;

  const gitignorePath = path.join(config.projectRoot, '.gitignore');
  await fs.writeFile(gitignorePath, content, 'utf-8');
  console.log(chalk.green(`✅ Generated .gitignore`));
}

/**
 * Generate package.json
 */
export async function generatePackageJson(config: ProjectConfig): Promise<void> {
  const packageJson = {
    name: config.projectName,
    version: '0.1.0',
    description: 'AI-Driven Product Development Project',
    main: 'index.js',
    scripts: {
      dev: 'pb start',
      build: 'pb build',
      test: 'echo "No tests yet"'
    },
    keywords: ['product-builder', 'ai', 'development'],
    author: '',
    license: 'MIT',
    devDependencies: {
      '@waoooo/product-builder': '^0.1.0'
    }
  };

  const packagePath = path.join(config.projectRoot, 'package.json');
  await fs.writeFile(packagePath, JSON.stringify(packageJson, null, 2), 'utf-8');
  console.log(chalk.green(`✅ Generated package.json`));
}

/**
 * Generate all project files
 */
export async function generateProjectFiles(config: ProjectConfig): Promise<void> {
  console.log(chalk.cyan.bold('\n🏗️  Generating project files...\n'));

  await generateDirectoryStructure(config);
  await generateReadme(config);
  await generateGitignore(config);
  await generatePackageJson(config);

  console.log(chalk.green('\n✅ Project files generated successfully!\n'));
}

/**
 * Generate MDX template
 */
export async function generateMDXTemplate(
  title: string,
  outputPath: string
): Promise<void> {
  const content = `---
title: "${title}"
description: ""
date: ${new Date().toISOString().split('T')[0]}
status: draft
---

# ${title}

## Problem Statement

[Describe the problem this product solves]

## Target Users

[Describe the target users and their pain points]

## Competitive Analysis

[Analyze similar products and their strengths/weaknesses]

## Our Approach

[Describe our unique approach and differentiators]

## User Flow

[Describe the user journey and key interactions]

## Feature Breakdown

### Core Features

1. [Feature 1]
2. [Feature 2]
3. [Feature 3]

### Secondary Features

1. [Feature 1]
2. [Feature 2]

## Technical Considerations

[List technical requirements and constraints]

## Success Metrics

[Define how success will be measured]
`;

  await fs.writeFile(outputPath, content, 'utf-8');
  console.log(chalk.green(`✅ Generated MDX template: ${outputPath}`));
}
