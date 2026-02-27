/**
 * Jobs & Tasks Menu
 */

import { menu, renderSectionHeader } from 'cli-menu-kit';
import chalk from 'chalk';
import { promptContinue } from '../../shared/utils/menu-utils';
import { MENUS, buildMenuOptions, findSelectedItem } from '../../core/menu-registry';

export async function showJobsTasksMenu(showMainMenu: () => Promise<void>): Promise<void> {
  const config = MENUS['jobs-tasks'];

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

  // TODO: Implement jobs & tasks functionality
  console.log(chalk.yellow(`\n${selected.id} coming soon...`));
  console.log(chalk.gray('This will show jobs and tasks from the workflow data.'));
  console.log('');

  await promptContinue();
  await showJobsTasksMenu(showMainMenu);
}
