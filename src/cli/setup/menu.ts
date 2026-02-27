/**
 * Setup Menu
 * Initialize and configure system
 */

import { menu, renderSectionHeader } from 'cli-menu-kit';
import chalk from 'chalk';
import { MENUS, buildMenuOptions, findSelectedItem } from '../../config/menu-registry';
import { initializeProject } from '../init';
import { showStatusCheck } from '../status/menu';
import { showResetMenu } from '../menu-functions';

/**
 * Show setup menu
 */
export async function showSetupMenu(showMainMenu: () => Promise<void>): Promise<void> {
  const config = MENUS.setup;

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
  if (selected.id === 'init') {
    await initializeProject(() => showSetupMenu(showMainMenu));
  } else if (selected.id === 'status') {
    await showStatusCheck(() => showSetupMenu(showMainMenu));
  } else if (selected.id === 'reset') {
    await showResetMenu(showMainMenu);
  }

  // Show menu again
  await showSetupMenu(showMainMenu);
}
