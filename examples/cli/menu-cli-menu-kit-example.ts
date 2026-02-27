/**
 * Example: Using cli-menu-kit in Product Builder
 * This shows how to replace inquirer with cli-menu-kit
 */

import { menu, input } from 'cli-menu-kit';
import chalk from 'chalk';

/**
 * Example main menu using cli-menu-kit
 */
export async function showMainMenuWithCliMenuKit(): Promise<void> {
  console.clear();
  printHeader();

  const result = await menu.radio({
    title: 'Product Builder - Main Menu',
    options: [
      '1. Initialize configuration - Set up Product Builder',
      '2. Check status - View system dependencies',
      '3. Reset configuration - Clear and reconfigure',
      '4. Configure workflow - Set up workflow phases',
      '5. LLM CLI configuration - Configure AI models',
      '6. Architecture tools - CCB, CCA, CCH, Ralph',
      '7. Documentation - OpenSpec, Mint, MD',
      '8. Agents - Subagents and teams',
      '9. MCP Servers - Model Context Protocol',
      '0. Skills - Reusable workflows',
      'v. View configuration - Show current settings',
      'd. Dependencies - Install requirements',
      'h. Help - Show documentation',
      'q. Exit - Quit Product Builder'
    ],
    allowLetterKeys: true
  });

  // Map selection to action
  const actions = [
    'init', 'status', 'reset', 'workflow', 'llm-cli',
    'arch-tools', 'documentation', 'agents', 'mcp', 'skills',
    'view-config', 'dependencies', 'help', 'exit'
  ];

  const action = actions[result.index];

  switch (action) {
    case 'init':
      await showInitMenuWithCliMenuKit();
      break;
    case 'exit':
      console.log(chalk.green('\n👋 Goodbye!\n'));
      process.exit(0);
    default:
      console.log(chalk.yellow(`\n⚠️  ${action} implementation coming soon...\n`));
      await promptContinue();
      await showMainMenuWithCliMenuKit();
  }
}

/**
 * Example init menu using cli-menu-kit
 */
async function showInitMenuWithCliMenuKit(): Promise<void> {
  console.clear();
  console.log(chalk.cyan.bold('\n🎯 Initialize Project\n'));

  // Text input with validation
  const projectName = await input.text({
    prompt: 'Project name',
    defaultValue: 'my-product',
    minLength: 1,
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Please provide a project name';
      }
      return true;
    }
  });

  console.log(chalk.blue('\n📦 Initializing Product Builder...\n'));
  console.log(chalk.gray('  ├─ Creating directory structure'));
  console.log(chalk.gray('  ├─ Generating config.json'));
  console.log(chalk.gray('  ├─ Generating paths.json'));
  console.log(chalk.gray('  ├─ Creating workflow templates'));
  console.log(chalk.gray('  └─ Setting up tool configurations'));
  console.log();

  console.log(chalk.green(`✅ Project "${projectName}" initialized successfully!\n`));
  console.log(chalk.gray('Next steps:'));
  console.log(chalk.gray('  1. Run "pb status" to check dependencies'));
  console.log(chalk.gray('  2. Configure workflow phases'));
  console.log(chalk.gray('  3. Configure tools for each stage'));
  console.log();

  await promptContinue();
  await showMainMenuWithCliMenuKit();
}

/**
 * Print CLI header
 */
function printHeader(): void {
  console.log(chalk.cyan.bold('\n╔════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan.bold('║                                                            ║'));
  console.log(chalk.cyan.bold('║              🏗️  Product Builder CLI v0.1.0               ║'));
  console.log(chalk.cyan.bold('║                                                            ║'));
  console.log(chalk.cyan.bold('║        AI-Driven Product Development Orchestrator          ║'));
  console.log(chalk.cyan.bold('║                                                            ║'));
  console.log(chalk.cyan.bold('╚════════════════════════════════════════════════════════════╝'));
  console.log();
}

/**
 * Prompt user to continue
 */
async function promptContinue(): Promise<void> {
  await input.text({
    prompt: 'Press Enter to continue',
    allowEmpty: true
  });
}
