/**
 * Tools Configuration Menu
 * Configure development tools and services
 */

import { menu, renderSectionHeader } from 'cli-menu-kit';
import chalk from 'chalk';
import { MENUS, buildMenuOptions, findSelectedItem } from '../../core/menu-registry';
import { showArchToolsMenu } from './architecture/menu';
import { showDocumentationMenu, showDependenciesMenu } from '../../legacy/menu-functions';

/**
 * Show tools configuration menu
 */
export async function showToolsMenu(showMainMenu: () => Promise<void>): Promise<void> {
  const config = MENUS.tools;

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
  if (selected.id === 'arch-tools') {
    await showArchToolsMenu(() => showToolsMenu(showMainMenu));
  } else if (selected.id === 'docs') {
    await showDocumentationMenu(() => showToolsMenu(showMainMenu));
  } else if (selected.id === 'deps') {
    await showDependenciesMenu(() => showToolsMenu(showMainMenu));
  }

  // Show menu again
  await showToolsMenu(showMainMenu);
}
