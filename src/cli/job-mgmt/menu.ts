/**
 * Job Management Menu
 * Manage jobs and tasks
 */

import { menu, renderSectionHeader } from 'cli-menu-kit';
import chalk from 'chalk';
import { MENUS, buildMenuOptions, findSelectedItem } from '../../config/menu-registry';

/**
 * Show job management menu
 */
export async function showJobMgmtMenu(showMainMenu: () => Promise<void>): Promise<void> {
  const config = MENUS['job-mgmt'];

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
  if (selected.id === 'job-operations') {
    console.log(chalk.yellow('\nJob operations coming soon...\n'));
  } else if (selected.id === 'job-viewing') {
    console.log(chalk.yellow('\nJob viewing coming soon...\n'));
  } else if (selected.id === 'task-management') {
    console.log(chalk.yellow('\nTask management coming soon...\n'));
  } else if (selected.id === 'roadmap') {
    console.log(chalk.yellow('\nRoadmap view coming soon...\n'));
  }

  // Show menu again
  await showJobMgmtMenu(showMainMenu);
}
