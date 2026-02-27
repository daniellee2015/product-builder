import { renderPage, generateMenuHints } from 'cli-menu-kit';
import chalk from 'chalk';
import * as path from 'path';
import { MENUS, buildMenuOptions, findSelectedItem } from './core/menu-registry';
import { initCLI } from './core/init-cli';
import { showSetupMenu } from './features/setup/menu';
import { showProjectMgmtMenu } from './features/project/menu';
import { showWorkflowMenu } from './features/workflow/menu';
import { showJobMgmtMenu } from './features/jobs/menu';
import { showAgentsMenu } from './features/agents/menu';
import { showAIGatewayMenu } from './features/ai/menu';
import { showToolsMenu } from './features/tools/menu';
import { showSettingsMenu } from './features/settings';

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
  'setup': (back) => showSetupMenu(back),
  'project-mgmt': (back) => showProjectMgmtMenu(back),
  'workflow': (back) => showWorkflowMenu(back),
  'job-mgmt': (back) => showJobMgmtMenu(back),
  'agents': (back) => showAgentsMenu(back),
  'ai-gateway': (back) => showAIGatewayMenu(back),
  'tools': (back) => showToolsMenu(back),
  'settings': (back) => showSettingsMenu(back),
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
