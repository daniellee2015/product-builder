import {
  renderPageV2,
  createFullHeaderComponentV2,
  createRadioMenuComponentV2,
  createDynamicHintsComponent,
  createCustomComponent,
  generateMenuHints,
  setLanguage,
  hintManager,
  type Rect
} from 'cli-menu-kit';
import chalk from 'chalk';
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

// Set language to English for consistency
setLanguage('en');

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
  'help': (back) => showHelpMenu(back),
};

/**
 * Main interactive menu for Product Builder
 * Using Page Layout V2 with component-based architecture
 */
export async function showMainMenu(): Promise<void> {
  const config = MENUS.main;
  const menuOptions = buildMenuOptions(config);

  // Generate hints based on menu options (caller handles logic)
  const hints = generateMenuHints({
    hasMultipleOptions: true,
    allowNumberKeys: true,
    allowLetterKeys: true
  });

  // Set initial hints BEFORE rendering
  hintManager.set('menu', hints.join(' • '), 10);

  // Render page using Page Layout V2
  await renderPageV2({
    // Header area - Full header with ASCII art
    header: {
      components: [
        createFullHeaderComponentV2({
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
          url: 'https://github.com/product-builder/cli'
        })
      ]
    },

    // Main area - Menu options
    mainArea: {
      components: [
        createRadioMenuComponentV2({
          menuConfig: {
            options: menuOptions,
            allowLetterKeys: true,
            allowNumberKeys: true,
            preserveOnSelect: true
          },
          onResult: async (result) => {
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
        })
      ]
    },

    // Footer area - Hints and Prompt
    footer: {
      components: [
        createDynamicHintsComponent(),
        createCustomComponent(
          'prompt',
          'footerPrompt',
          (rect: Rect) => [''], // Empty prompt for now
          undefined
        )
      ]
    }
  });
}

/**
 * Export main menu function
 */
export { showMainMenu as default };
