/**
 * Architecture Tools Configuration Menu
 */

import { menu, renderSectionHeader } from 'cli-menu-kit';
import chalk from 'chalk';
import { promptContinue } from './utils';
import { MENUS, buildMenuOptions, findSelectedItem } from '../../config/menu-registry';

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
