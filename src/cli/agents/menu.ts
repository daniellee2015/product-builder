/**
 * Agents Configuration Menu
 * Configure agents and related plugins
 */

import { menu, renderSectionHeader } from 'cli-menu-kit';
import chalk from 'chalk';
import { MENUS, buildMenuOptions, findSelectedItem } from '../../config/menu-registry';
import { showMCPMenu, showSkillsMenu } from '../menu-functions';

/**
 * Show agents configuration menu
 */
export async function showAgentsMenu(showMainMenu: () => Promise<void>): Promise<void> {
  const config = MENUS.agents;

  renderSectionHeader(config.title, config.headerWidth);
  if (config.desc) {
    console.log(chalk.gray(config.desc + '\n'));
  }

  const result = await menu.radio({
    options: buildMenuOptions(config),
    allowLetterKeys: true,
    allowNumberKeys: true,
    preserveOnSelect: true
  });

  const selected = findSelectedItem(config, result.value);
  if (!selected) return;

  // Handle back
  if (result.value.includes('Back')) {
    await showMainMenu();
    return;
  }

  // Route to handlers
  if (selected.id === 'scheduling-agents') {
    console.log(chalk.yellow('\nScheduling agents configuration coming soon...\n'));
  } else if (selected.id === 'workflow-agents') {
    console.log(chalk.yellow('\nWorkflow agents configuration coming soon...\n'));
  } else if (selected.id === 'mcp') {
    await showMCPMenu(showMainMenu);
    return; // MCP menu handles its own loop
  } else if (selected.id === 'skills') {
    await showSkillsMenu(showMainMenu);
    return; // Skills menu handles its own loop
  } else if (selected.id === 'hooks') {
    console.log(chalk.yellow('\nHooks configuration coming soon...\n'));
  } else if (selected.id === 'prompts') {
    console.log(chalk.yellow('\nPrompts configuration coming soon...\n'));
  } else if (selected.id === 'agent-interfaces') {
    console.log(chalk.yellow('\nAgent interfaces configuration coming soon...\n'));
  }

  // Show menu again
  await showAgentsMenu(showMainMenu);
}
