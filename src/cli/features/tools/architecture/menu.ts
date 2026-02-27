/**
 * Architecture Tools Menu
 * Placeholder module - functionality to be implemented
 */

import { menu, renderSectionHeader, input } from 'cli-menu-kit';
import chalk from 'chalk';
import { MENUS, buildMenuOptions, findSelectedItem } from '../../../core/menu-registry';
import i18n from '../../../../libs/i18n';

async function promptContinue(): Promise<void> {
  await input.text({
    prompt: i18n.t('common.continue'),
    allowEmpty: true
  });
}

export async function showArchToolsMenu(showMainMenu: () => Promise<void>): Promise<void> {
  const config = MENUS['arch-tools'];

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

  // TODO: Implement architecture tools configuration
  console.log(chalk.yellow(`\n${selected.id} configuration coming soon...\n`));

  await promptContinue();
  await showArchToolsMenu(showMainMenu);
}
