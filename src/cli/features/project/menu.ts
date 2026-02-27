/**
 * Project Management Menu
 * Configure scheduling layer
 */

import { menu, renderSectionHeader } from 'cli-menu-kit';
import chalk from 'chalk';
import { MENUS, buildMenuOptions, findSelectedItem } from '../../core/menu-registry';

/**
 * Show project management menu
 */
export async function showProjectMgmtMenu(showMainMenu: () => Promise<void>): Promise<void> {
  const config = MENUS['project-mgmt'];

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
  if (selected.id === 'scheduler-impl') {
    console.log(chalk.yellow('\nScheduler implementation configuration coming soon...\n'));
  } else if (selected.id === 'scheduling-policies') {
    console.log(chalk.yellow('\nScheduling policies configuration coming soon...\n'));
  } else if (selected.id === 'project-config') {
    console.log(chalk.yellow('\nProject configuration coming soon...\n'));
  }

  // Show menu again
  await showProjectMgmtMenu(showMainMenu);
}
