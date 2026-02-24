import { renderPage, generateMenuHints } from 'cli-menu-kit';
import chalk from 'chalk';
import * as path from 'path';
import {
  showLLMCLIMenu,
  showArchToolsMenu,
  showAgentsMenu,
  showMCPMenu,
  showSkillsMenu,
  showDependenciesMenu,
  showStatusCheck,
  showResetMenu,
  showDocumentationMenu,
  showViewConfigMenu,
  showHelpMenu,
  showWorkflowMenu,
  showJobsTasksMenu,
} from './menus';
import { initializeProject } from './init';
import { MENUS, buildMenuOptions, findSelectedItem } from '../config/menu-registry';
import { showSettingsMenu } from './settings';
import { initCLI } from './init-cli';

// Initialize CLI with unified configuration
initCLI({
  appName: 'product-builder',
  languagesPath: path.join(__dirname, '../../languages.json'),
  defaults: {
    language: 'en',
    workflow_mode: 'full',
    auto_save: true
  }
});

// Route map: menu item id → handler
const MAIN_ROUTES: Record<string, (back: () => Promise<void>) => Promise<void>> = {
  'init': (back) => initializeProject(back),
  'status': (back) => showStatusCheck(back),
  'reset': (back) => showResetMenu(back),
  'workflow': (back) => showWorkflowMenu(back),
  'jobs': (back) => showJobsTasksMenu(back),
  'llm-cli': (back) => showLLMCLIMenu(back),
  'arch-tools': (back) => showArchToolsMenu(back),
  'docs': (back) => showDocumentationMenu(back),
  'mcp': (back) => showMCPMenu(back),
  'skills': (back) => showSkillsMenu(back),
  'agents': (back) => showAgentsMenu(back),
  'view-config': (back) => showViewConfigMenu(back),
  'deps': (back) => showDependenciesMenu(back),
  'settings': (back) => showSettingsMenu(back),
  'help': (back) => showHelpMenu(back),
};

/**
 * Main interactive menu for Product Builder
 */
export async function showMainMenu(): Promise<void> {
  const config = MENUS.main;

  const result = await renderPage({
    header: {
      type: 'full',
      asciiArt: [
        '██╗    ██╗ █████╗  ██████╗  ██████╗  ██████╗  ██████╗ ',
        '██║    ██║██╔══██╗██╔═══██╗██╔═══██╗██╔═══██╗██╔═══██╗',
        '██║ █╗ ██║███████║██║   ██║██║   ██║██║   ██║██║   ██║',
        '██║███╗██║██╔══██║██║   ██║██║   ██║██║   ██║██║   ██║',
        '╚███╔███╔╝██║  ██║╚██████╔╝╚██████╔╝╚██████╔╝╚██████╔╝',
        ' ╚══╝╚══╝ ╚═╝  ╚═╝ ╚═════╝  ╚═════╝  ╚═════╝  ╚═════╝ '
      ],
      title: config.title,
      description: config.desc,
      version: '0.1.0',
      url: 'https://github.com/product-builder/cli',
      menuTitle: 'Select an option:'
    },
    mainArea: {
      type: 'menu',
      menu: {
        options: buildMenuOptions(config),
        allowLetterKeys: true,
        allowNumberKeys: true,
        preserveOnSelect: true
      }
    },
    footer: {
      hints: generateMenuHints({
        hasMultipleOptions: true,
        allowNumberKeys: true,
        allowLetterKeys: true
      })
    }
  });

  const selected = findSelectedItem(config, result.value);
  if (!selected) return;

  if (selected.id === 'exit') {
    console.log(chalk.green('\n👋 Goodbye!\n'));
    process.exit(0);
  }

  const handler = MAIN_ROUTES[selected.id];
  if (handler) {
    await handler(showMainMenu);
  }
}

/**
 * Export main menu function
 */
export { showMainMenu as default };
