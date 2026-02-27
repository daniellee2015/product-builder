/**
 * AI Gateway Configuration Menu
 * Configure LLM API and routing
 */

import { menu, renderSectionHeader } from 'cli-menu-kit';
import chalk from 'chalk';
import { MENUS, buildMenuOptions, findSelectedItem } from '../../core/menu-registry';
import { showLLMCLIMenu } from './actions/llm-menu';

/**
 * Show AI Gateway configuration menu
 */
export async function showAIGatewayMenu(showMainMenu: () => Promise<void>): Promise<void> {
  const config = MENUS['ai-gateway'];

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

  // All AI Gateway options route to LLM CLI menu for now
  await showLLMCLIMenu(showMainMenu);
}
