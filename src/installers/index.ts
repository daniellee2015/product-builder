/**
 * Dependency Installer Module
 *
 * Handles installation of required dependencies and tools
 */

import { execSync } from 'child_process';
import chalk from 'chalk';
import type { DependencyStatus } from '../checkers';

export interface InstallResult {
  success: boolean;
  message: string;
}

/**
 * Install a system dependency
 */
async function installSystemDependency(name: string): Promise<InstallResult> {
  console.log(chalk.blue(`📦 Installing ${name}...`));

  try {
    switch (name) {
      case 'Node.js':
        return {
          success: false,
          message: 'Please install Node.js manually from https://nodejs.org/'
        };

      case 'npm':
        return {
          success: false,
          message: 'npm comes with Node.js. Please install Node.js first.'
        };

      case 'Git':
        return {
          success: false,
          message: 'Please install Git manually from https://git-scm.com/'
        };

      default:
        return {
          success: false,
          message: `Unknown system dependency: ${name}`
        };
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to install ${name}: ${error}`
    };
  }
}

/**
 * Install a CLI tool
 */
async function installCLITool(name: string): Promise<InstallResult> {
  console.log(chalk.blue(`⚡ Installing ${name}...`));

  try {
    switch (name) {
      case 'gh (GitHub CLI)':
        // Try to install via Homebrew on macOS
        if (process.platform === 'darwin') {
          execSync('brew install gh', { stdio: 'inherit' });
          return {
            success: true,
            message: `${name} installed successfully`
          };
        } else {
          return {
            success: false,
            message: 'Please install GitHub CLI manually from https://cli.github.com/'
          };
        }

      case 'ccb (Claude Code Bridge)':
        return {
          success: false,
          message: 'Please install CCB manually. See documentation for instructions.'
        };

      case 'cca (Cross-Claude Agent)':
        return {
          success: false,
          message: 'Please install CCA manually. See documentation for instructions.'
        };

      default:
        return {
          success: false,
          message: `Unknown CLI tool: ${name}`
        };
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to install ${name}: ${error}`
    };
  }
}

/**
 * Install an MCP server
 */
async function installMCPServer(name: string): Promise<InstallResult> {
  console.log(chalk.blue(`🔌 Installing ${name}...`));

  try {
    execSync(`npm install -g ${name}`, { stdio: 'inherit' });
    return {
      success: true,
      message: `${name} installed successfully`
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to install ${name}: ${error}`
    };
  }
}

/**
 * Install dependencies by category
 */
export async function installDependencies(
  dependencies: DependencyStatus[],
  category?: 'system' | 'cli' | 'mcp'
): Promise<InstallResult[]> {
  const results: InstallResult[] = [];

  // Filter dependencies to install
  const toInstall = dependencies.filter(d => {
    if (d.installed) return false;
    if (category && d.category !== category) return false;
    return true;
  });

  if (toInstall.length === 0) {
    console.log(chalk.green('\n✅ All dependencies are already installed!\n'));
    return results;
  }

  console.log(chalk.cyan.bold(`\n📦 Installing ${toInstall.length} dependencies...\n`));

  for (const dep of toInstall) {
    let result: InstallResult;

    switch (dep.category) {
      case 'system':
        result = await installSystemDependency(dep.name);
        break;
      case 'cli':
        result = await installCLITool(dep.name);
        break;
      case 'mcp':
        result = await installMCPServer(dep.name);
        break;
      default:
        result = {
          success: false,
          message: `Unknown category: ${dep.category}`
        };
    }

    results.push(result);

    if (result.success) {
      console.log(chalk.green(`✅ ${result.message}`));
    } else {
      console.log(chalk.yellow(`⚠️  ${result.message}`));
    }
  }

  console.log();

  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(chalk.bold('Installation Summary:'));
  console.log(`  Successful: ${chalk.green(successful)}`);
  if (failed > 0) {
    console.log(`  Failed:     ${chalk.yellow(failed)}`);
  }
  console.log();

  return results;
}

/**
 * Install all missing dependencies
 */
export async function installAll(dependencies: DependencyStatus[]): Promise<InstallResult[]> {
  return installDependencies(dependencies);
}

/**
 * Install system dependencies only
 */
export async function installSystem(dependencies: DependencyStatus[]): Promise<InstallResult[]> {
  return installDependencies(dependencies, 'system');
}

/**
 * Install CLI tools only
 */
export async function installCLI(dependencies: DependencyStatus[]): Promise<InstallResult[]> {
  return installDependencies(dependencies, 'cli');
}

/**
 * Install MCP servers only
 */
export async function installMCP(dependencies: DependencyStatus[]): Promise<InstallResult[]> {
  return installDependencies(dependencies, 'mcp');
}
