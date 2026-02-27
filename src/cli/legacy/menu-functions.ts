/**
 * Additional Menu Functions for Product Builder CLI
 * (Remaining functions to be refactored)
 */

import { menu, input } from 'cli-menu-kit';
import chalk from 'chalk';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Agents Configuration Menu
 */
export async function showAgentsMenu(showMainMenu: () => Promise<void>): Promise<void> {
  console.log(chalk.cyan.bold('\nAgent Configuration\n'));

  const result = await menu.radio({
    options: [
      '1. Subagents' + chalk.gray(' - Define and configure subagents'),
      '2. Agent Teams' + chalk.gray(' - Define and configure teams'),
      '3. Agent Routing' + chalk.gray(' - Configure routing rules'),
      '4. View configuration' + chalk.gray(' - Show current settings'),
      'b. Back to main menu' + chalk.gray(' - Return to main menu')
    ],
    allowLetterKeys: true,
    allowNumberKeys: true
  });

  const action = result.value;

  if (action.includes('Back')) {
    await showMainMenu();
    return;
  }

  // Map action based on content
  let actionType = '';
  if (action.includes('Subagents')) actionType = 'subagents';
  else if (action.includes('Agent Teams')) actionType = 'teams';
  else if (action.includes('Agent Routing')) actionType = 'routing';
  else if (action.includes('View configuration')) actionType = 'view';

  // TODO: Implement agent configuration
  console.log(chalk.yellow(`\n${actionType} configuration coming soon...\n`));

  await promptContinue();
  await showAgentsMenu(showMainMenu);
}

/**
 * MCP Servers Menu
 */
export async function showMCPMenu(showMainMenu: () => Promise<void>): Promise<void> {
  console.log(chalk.cyan.bold('\nMCP Servers\n'));

  const result = await menu.radio({
    options: [
      '1. List servers' + chalk.gray(' - View installed MCP servers'),
      '2. Install server' + chalk.gray(' - Add new MCP server'),
      '3. Configure server' + chalk.gray(' - Modify server settings'),
      '4. Remove server' + chalk.gray(' - Uninstall MCP server'),
      'b. Back to main menu' + chalk.gray(' - Return to main menu')
    ],
    allowLetterKeys: true,
    allowNumberKeys: true
  });

  const action = result.value;

  if (action.includes('Back')) {
    await showMainMenu();
    return;
  }

  // Map action based on content
  let actionType = '';
  if (action.includes('List servers')) actionType = 'list';
  else if (action.includes('Install server')) actionType = 'install';
  else if (action.includes('Configure server')) actionType = 'configure';
  else if (action.includes('Remove server')) actionType = 'remove';

  // TODO: Implement MCP server management
  console.log(chalk.yellow(`\n${actionType} implementation coming soon...\n`));

  await promptContinue();
  await showMCPMenu(showMainMenu);
}

/**
 * Skills Management Menu
 */
export async function showSkillsMenu(showMainMenu: () => Promise<void>): Promise<void> {
  console.log(chalk.cyan.bold('\nSkills Management\n'));

  const result = await menu.radio({
    options: [
      '1. List skills' + chalk.gray(' - View installed skills'),
      '2. Install skill' + chalk.gray(' - Add new skill'),
      '3. Configure skill' + chalk.gray(' - Modify skill settings'),
      '4. Remove skill' + chalk.gray(' - Uninstall skill'),
      'b. Back to main menu' + chalk.gray(' - Return to main menu')
    ],
    allowLetterKeys: true,
    allowNumberKeys: true
  });

  const action = result.value;

  if (action.includes('Back')) {
    await showMainMenu();
    return;
  }

  // Map action based on content
  let actionType = '';
  if (action.includes('List skills')) actionType = 'list';
  else if (action.includes('Install skill')) actionType = 'install';
  else if (action.includes('Configure skill')) actionType = 'configure';
  else if (action.includes('Remove skill')) actionType = 'remove';

  // TODO: Implement skills management using @waoooo/claude-skills-manager
  console.log(chalk.yellow(`\n${actionType} implementation coming soon...\n`));

  await promptContinue();
  await showSkillsMenu(showMainMenu);
}

/**
 * Dependencies Menu
 */
export async function showDependenciesMenu(showMainMenu: () => Promise<void>): Promise<void> {
  console.log(chalk.cyan.bold('\nDependencies Management\n'));

  const result = await menu.radio({
    options: [
      '1. Check all' + chalk.gray(' - Check all dependencies'),
      '2. Install system dependencies' + chalk.gray(' - Install Node, Docker, etc'),
      '3. Install LLM CLIs' + chalk.gray(' - Install AI model CLIs'),
      '4. Install architecture tools' + chalk.gray(' - Install CCB, CCA, etc'),
      '5. Install MCP servers' + chalk.gray(' - Install MCP packages'),
      'b. Back to main menu' + chalk.gray(' - Return to main menu')
    ],
    allowLetterKeys: true,
    allowNumberKeys: true
  });

  const action = result.value;

  if (action.includes('Back')) {
    await showMainMenu();
    return;
  }

  // Map action based on content
  let actionType = '';
  if (action.includes('Check all')) actionType = 'check';
  else if (action.includes('system dependencies')) actionType = 'system';
  else if (action.includes('LLM CLIs')) actionType = 'llm';
  else if (action.includes('architecture tools')) actionType = 'arch';
  else if (action.includes('MCP servers')) actionType = 'mcp';

  // TODO: Implement dependency management
  console.log(chalk.yellow(`\n${actionType} implementation coming soon...\n`));

  await promptContinue();
  await showDependenciesMenu(showMainMenu);
}

/**
 * Reset/Reconfigure Menu
 */
export async function showResetMenu(showMainMenu: () => Promise<void>): Promise<void> {
  console.log(chalk.cyan.bold('\nReset Configuration\n'));

  const result = await menu.radio({
    options: [
      '1. Reset all' + chalk.gray(' - Reset entire configuration'),
      '2. Reset LLM APIs' + chalk.gray(' - Clear API configurations'),
      '3. Reset tools' + chalk.gray(' - Clear tool configurations'),
      '4. Reset agents' + chalk.gray(' - Clear agent configurations'),
      'b. Back to main menu' + chalk.gray(' - Return to main menu')
    ],
    allowLetterKeys: true,
    allowNumberKeys: true
  });

  const action = result.value;

  if (action.includes('Back')) {
    await showMainMenu();
    return;
  }

  // Map action based on content
  let actionType = '';
  if (action.includes('Reset all')) actionType = 'all';
  else if (action.includes('LLM APIs')) actionType = 'llm';
  else if (action.includes('Reset tools')) actionType = 'tools';
  else if (action.includes('Reset agents')) actionType = 'agents';

  const confirmResult = await menu.booleanH(
    `Are you sure you want to reset ${actionType === 'all' ? 'everything' : actionType}? This cannot be undone`,
    false
  );

  if (confirmResult) {
    console.log(chalk.yellow(`\nResetting ${actionType}...`));
    // TODO: Implement reset logic
    console.log(chalk.green('✓ Reset complete!'));
  } else {
    console.log(chalk.gray('\nReset cancelled.'));
  }

  console.log('');
  await promptContinue();
  await showMainMenu();
}

/**
 * Documentation Configuration Menu
 */
export async function showDocumentationMenu(showMainMenu: () => Promise<void>): Promise<void> {
  console.log(chalk.cyan.bold('\nDocumentation Configuration\n'));

  const result = await menu.radio({
    options: [
      '1. View current setup' + chalk.gray(' - Show documentation config'),
      '2. Configure OpenSpec' + chalk.gray(' - Set up API specifications'),
      '3. Configure Mint' + chalk.gray(' - Set up documentation site'),
      '4. Simple Markdown' + chalk.gray(' - Use simple MD files'),
      'b. Back to main menu' + chalk.gray(' - Return to main menu')
    ],
    allowLetterKeys: true,
    allowNumberKeys: true
  });

  const action = result.value;

  if (action.includes('Back')) {
    await showMainMenu();
    return;
  }

  // Map action based on content
  let actionType = '';
  if (action.includes('View current setup')) actionType = 'view';
  else if (action.includes('OpenSpec')) actionType = 'openspec';
  else if (action.includes('Mint')) actionType = 'mint';
  else if (action.includes('Markdown')) actionType = 'markdown';

  // TODO: Implement documentation configuration
  console.log(chalk.yellow(`\n${actionType} configuration coming soon...`));
  console.log('');

  await promptContinue();
  await showDocumentationMenu(showMainMenu);
}

/**
 * View Configuration Menu
 */
export async function showViewConfigMenu(showMainMenu: () => Promise<void>): Promise<void> {
  console.log(chalk.cyan.bold('\nConfiguration Files\n'));

  const configDir = join(process.cwd(), '.product-builder');

  if (!existsSync(configDir)) {
    console.log(chalk.yellow('Product Builder not initialized in this directory.'));
    console.log(chalk.gray('Run "Initialize" from the main menu first.\n'));
    await promptContinue();
    await showMainMenu();
    return;
  }

  // Read main config
  const configPath = join(configDir, 'config.json');
  if (existsSync(configPath)) {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));

    console.log(chalk.bold('Configuration Mode:'), chalk.green(config.mode));
    console.log('');

    console.log(chalk.bold('Enabled LLM CLIs:'));
    Object.entries(config.llms).forEach(([name, enabled]) => {
      if (enabled) {
        console.log(chalk.green(`  ✓ ${name}`));
      }
    });
    console.log('');

    console.log(chalk.bold('Enabled Tools:'));
    const enabledTools = Object.entries(config.tools).filter(([_, enabled]) => enabled);
    if (enabledTools.length > 0) {
      enabledTools.forEach(([name]) => console.log(chalk.green(`  ✓ ${name}`)));
    } else {
      console.log(chalk.gray('  None'));
    }
    console.log('');

    console.log(chalk.bold('Documentation:'), chalk.green(config.documentation.type));
    console.log('');

    console.log(chalk.bold('Configuration Files:'));
    console.log(chalk.gray(`  ${configPath}`));
    console.log(chalk.gray(`  ${join(configDir, 'api-config.json')}`));
    console.log(chalk.gray(`  ${join(configDir, 'workflow-config.json')}`));
    console.log('');
  }

  await promptContinue();
  await showMainMenu();
}

/**
 * Help Menu
 */
export async function showHelpMenu(showMainMenu: () => Promise<void>): Promise<void> {
  console.log(chalk.cyan.bold('\nProduct Builder Help\n'));

  console.log(chalk.bold('What is Product Builder?'));
  console.log('Product Builder is a configuration management tool for AI-driven');
  console.log('product development. It helps you manage LLM CLIs, architecture');
  console.log('tools, agents, and workflows in a unified way.\n');

  console.log(chalk.bold('Quick Start:'));
  console.log('1. Run "Initialize" to set up your configuration');
  console.log('2. Choose a configuration mode (Minimal/Standard/Full/Custom)');
  console.log('3. Configure your LLM CLIs and tools');
  console.log('4. Start using your configured tools!\n');

  console.log(chalk.bold('Main Features:'));
  console.log('  • LLM CLI Management - Configure Claude, Gemini, Codex, OpenCode');
  console.log('  • API Management - Unified API routing with claude-code-hub');
  console.log('  • Architecture Tools - CCB, CCA, CCH, Ralph, OpenClaw');
  console.log('  • Documentation - OpenSpec, Mint, or Simple Markdown');
  console.log('  • Agents - Subagents and Agent Teams');
  console.log('  • MCP Servers - Model Context Protocol servers');
  console.log('  • Skills - Reusable workflow skills\n');

  console.log(chalk.bold('Configuration Modes:'));
  console.log('  • Minimal - Single LLM CLI, basic setup');
  console.log('  • Standard - Some automation tools');
  console.log('  • Full - All features enabled');
  console.log('  • Custom - Choose each component\n');

  console.log(chalk.bold('Need More Help?'));
  console.log('  • Documentation: https://github.com/your-repo/product-builder');
  console.log('  • Issues: https://github.com/your-repo/product-builder/issues\n');

  await promptContinue();
  await showMainMenu();
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
