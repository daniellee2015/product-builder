/**
 * Dependency Checker Module
 *
 * Checks for required dependencies and tools
 */

import { execSync } from 'child_process';
import chalk from 'chalk';

export interface DependencyStatus {
  name: string;
  category: 'system' | 'cli' | 'mcp';
  installed: boolean;
  version?: string;
  required: boolean;
}

/**
 * Check if a command exists in the system
 */
function commandExists(command: string): boolean {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get version of a command
 */
function getCommandVersion(command: string, versionFlag = '--version'): string | undefined {
  try {
    const output = execSync(`${command} ${versionFlag}`, { encoding: 'utf-8' });
    return output.trim().split('\n')[0];
  } catch {
    return undefined;
  }
}

/**
 * Check all dependencies
 */
export async function checkAllDependencies(): Promise<DependencyStatus[]> {
  const dependencies: DependencyStatus[] = [];

  // System dependencies
  dependencies.push({
    name: 'Node.js',
    category: 'system',
    installed: commandExists('node'),
    version: getCommandVersion('node', '--version'),
    required: true
  });

  dependencies.push({
    name: 'npm',
    category: 'system',
    installed: commandExists('npm'),
    version: getCommandVersion('npm', '--version'),
    required: true
  });

  dependencies.push({
    name: 'Git',
    category: 'system',
    installed: commandExists('git'),
    version: getCommandVersion('git', '--version'),
    required: true
  });

  // CLI tools
  dependencies.push({
    name: 'gh (GitHub CLI)',
    category: 'cli',
    installed: commandExists('gh'),
    version: getCommandVersion('gh', '--version'),
    required: true
  });

  dependencies.push({
    name: 'ccb (Claude Code Bridge)',
    category: 'cli',
    installed: commandExists('ccb'),
    version: getCommandVersion('ccb', '--version'),
    required: true
  });

  dependencies.push({
    name: 'cca (Cross-Claude Agent)',
    category: 'cli',
    installed: commandExists('cca'),
    version: getCommandVersion('cca', '--version'),
    required: false
  });

  // MCP servers (check via npm global packages)
  const mcpServers = [
    '@modelcontextprotocol/server-filesystem',
    '@modelcontextprotocol/server-github',
    '@anthropic-ai/spec-workflow'
  ];

  for (const server of mcpServers) {
    try {
      const output = execSync(`npm list -g ${server}`, { encoding: 'utf-8' });
      dependencies.push({
        name: server,
        category: 'mcp',
        installed: !output.includes('(empty)'),
        version: undefined,
        required: false
      });
    } catch {
      dependencies.push({
        name: server,
        category: 'mcp',
        installed: false,
        required: false
      });
    }
  }

  return dependencies;
}

/**
 * Print dependency status
 */
export function printDependencyStatus(dependencies: DependencyStatus[]): void {
  console.log(chalk.cyan.bold('\n🔍 Dependency Status\n'));

  const categories = ['system', 'cli', 'mcp'] as const;

  for (const category of categories) {
    const categoryDeps = dependencies.filter(d => d.category === category);
    if (categoryDeps.length === 0) continue;

    const categoryName = {
      system: '🖥️  System Dependencies',
      cli: '⚡ CLI Tools',
      mcp: '🔌 MCP Servers'
    }[category];

    console.log(chalk.bold(`\n${categoryName}:`));

    for (const dep of categoryDeps) {
      const status = dep.installed
        ? chalk.green('✓')
        : dep.required
        ? chalk.red('✗')
        : chalk.yellow('○');

      const name = dep.name.padEnd(40);
      const version = dep.version ? chalk.gray(`(${dep.version})`) : '';

      console.log(`  ${status}  ${name} ${version}`);
    }
  }

  console.log();

  // Summary
  const total = dependencies.length;
  const installed = dependencies.filter(d => d.installed).length;
  const missing = dependencies.filter(d => !d.installed && d.required).length;

  console.log(chalk.bold('Summary:'));
  console.log(`  Total:     ${total}`);
  console.log(`  Installed: ${chalk.green(installed)}`);
  if (missing > 0) {
    console.log(`  Missing:   ${chalk.red(missing)} (required)`);
  }
  console.log();
}

/**
 * Check if all required dependencies are installed
 */
export function hasAllRequiredDependencies(dependencies: DependencyStatus[]): boolean {
  return dependencies
    .filter(d => d.required)
    .every(d => d.installed);
}
