/**
 * Status Check Menu
 */

import chalk from 'chalk';
import {
  checkAllDependencies,
  checkProductBuilderConfig,
  checkTmuxSession,
  type ToolStatus
} from '../../features/setup/lib/dependency-checkers';
import { promptContinue } from '../../shared/utils/menu-utils';

export async function showStatusCheck(showMainMenu: () => Promise<void>): Promise<void> {
  console.log(chalk.cyan.bold('\nSystem Status Check\n'));

  // Check tmux session
  const tmuxStatus = checkTmuxSession();
  console.log(chalk.bold('Environment:'));
  if (tmuxStatus.inTmux) {
    console.log(chalk.green(`  ✓ Running in tmux session: ${tmuxStatus.sessionName || 'unknown'}`));
  } else {
    console.log(chalk.yellow('  ⚠ Not running in tmux session (recommended for multi-project)'));
  }

  // Check Product Builder config
  const hasConfig = checkProductBuilderConfig();
  if (hasConfig) {
    console.log(chalk.green('  ✓ Product Builder configured in current directory'));
  } else {
    console.log(chalk.yellow('  ⚠ Product Builder not initialized (run "pb init")'));
  }

  console.log('');

  // Check all dependencies
  console.log(chalk.bold('Checking dependencies...\n'));
  const status = await checkAllDependencies();

  // Display Layer 0: Environment
  console.log(chalk.cyan.bold('Layer 0: Runtime Environment'));
  displayToolStatus(status.environment);
  console.log('');

  // Display Layer 1: LLM CLIs
  console.log(chalk.cyan.bold('Layer 1: LLM CLI Tools'));
  const installedLLMs = status.llmCLIs.filter(t => t.installed).length;
  if (installedLLMs === 0) {
    console.log(chalk.red('  ⚠ No LLM CLIs installed - At least 1 required!'));
  }
  displayToolStatus(status.llmCLIs);
  console.log('');

  // Display Layer 2: Architecture Tools
  console.log(chalk.cyan.bold('Layer 2: Architecture Tools'));
  displayToolStatus(status.architectureTools);
  console.log('');

  // Display Layer 3: Documentation Tools
  console.log(chalk.cyan.bold('Layer 3: Documentation Tools'));
  displayToolStatus(status.documentationTools);
  console.log('');

  // Display NPM Packages
  console.log(chalk.cyan.bold('NPM Packages'));
  displayToolStatus(status.npmPackages);
  console.log('');

  // Summary
  const totalRequired = status.environment.filter(t => t.notes?.includes('Required')).length;
  const requiredInstalled = status.environment.filter(t => t.notes?.includes('Required') && t.installed).length;
  const llmCount = status.llmCLIs.filter(t => t.installed).length;

  console.log(chalk.bold('Summary:'));
  if (requiredInstalled === totalRequired && llmCount > 0) {
    console.log(chalk.green('  ✓ All required dependencies are installed'));
    console.log(chalk.green(`  ✓ ${llmCount} LLM CLI(s) available`));
  } else {
    if (requiredInstalled < totalRequired) {
      console.log(chalk.red(`  ✗ Missing ${totalRequired - requiredInstalled} required dependencies`));
    }
    if (llmCount === 0) {
      console.log(chalk.red('  ✗ No LLM CLIs installed (at least 1 required)'));
    }
  }
  console.log('');

  await promptContinue();
  await showMainMenu();
}

/**
 * Display tool status in a formatted way
 */
function displayToolStatus(tools: ToolStatus[]): void {
  for (const tool of tools) {
    if (tool.installed) {
      const versionInfo = tool.version ? ` (${tool.version})` : '';
      const notesInfo = tool.notes ? chalk.gray(` - ${tool.notes}`) : '';
      console.log(chalk.green(`  ✓ ${tool.name}${versionInfo}${notesInfo}`));
      if (tool.path) {
        console.log(chalk.gray(`    ${tool.path}`));
      }
    } else {
      const notesInfo = tool.notes ? chalk.gray(` - ${tool.notes}`) : '';
      console.log(chalk.gray(`  ✗ ${tool.name}${notesInfo}`));
    }
  }
}
