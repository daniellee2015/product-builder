/**
 * Jobs & Tasks Menu
 * Placeholder module - functionality to be implemented
 */

import { menu, renderSectionHeader, input } from 'cli-menu-kit';
import chalk from 'chalk';
import { MENUS, buildMenuOptions, findSelectedItem } from '../../config/menu-registry';
import i18n from '../../libs/i18n';

async function promptContinue(): Promise<void> {
  await input.text({
    prompt: i18n.t('common.continue'),
    allowEmpty: true
  });
}

export async function showJobsTasksMenu(showMainMenu: () => Promise<void>): Promise<void> {
  const config = MENUS['jobs'];

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

  // TODO: Implement jobs & tasks management
  console.log(chalk.yellow(`\n${selected.id} management coming soon...\n`));

  await promptContinue();
  await showJobsTasksMenu(showMainMenu);
}
