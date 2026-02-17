/**
 * Main Menu - New Architecture Version
 * Uses fixed regions and diff-based rendering
 */

import {
  screenManager,
  hintManager,
  computeLayout
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
} from './menus/index.js';
import { initializeProject } from './init.js';
import { MENUS, buildMenuOptions, findSelectedItem } from '../config/menu-registry.js';
import { createSimpleMenuComponent, SimpleMenuOption } from './components/simple-menu.js';
import {
  createSimpleHeaderComponent,
  createSimpleHintsComponent,
  createSimplePromptComponent
} from './components/simple-components.js';

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
 * Using new architecture with fixed regions
 */
export async function showMainMenuNew(): Promise<void> {
  const config = MENUS.main;
  const menuOptions = buildMenuOptions(config);

  // Convert menu options to SimpleMenuOption format
  const simpleOptions: SimpleMenuOption[] = menuOptions.map((opt, index) => {
    // Extract shortcut from label (e.g., "Init Project" -> 'i')
    const label = typeof opt === 'string' ? opt : (opt.label || opt.value || '');
    const value = typeof opt === 'string' ? opt : (opt.value || '');

    const match = label.match(/^([a-zA-Z])/);
    const shortcut = match ? match[1].toLowerCase() : undefined;

    return {
      label,
      value,
      shortcut
    };
  });

  // Enter alt screen
  screenManager.enter();

  // Compute layout
  const layout = computeLayout();

  // Register regions
  screenManager.registerRegion('header', layout.header);
  screenManager.registerRegion('main', layout.main);
  screenManager.registerRegion('footerHints', layout.footerHints);
  screenManager.registerRegion('footerPrompt', layout.footerPrompt);

  // Create components
  const headerComponent = createSimpleHeaderComponent({
    title: config.title,
    subtitle: config.desc
  });

  const menuComponent = createSimpleMenuComponent({
    title: '',
    options: simpleOptions,
    allowNumberKeys: true,
    allowLetterKeys: true,
    onSelect: async (value) => {
      const selected = findSelectedItem(config, value);
      if (!selected) {
        screenManager.exit();
        return;
      }

      if (selected.id === 'exit') {
        screenManager.exit();
        console.log(chalk.green('\n👋 Goodbye!\n'));
        process.exit(0);
      }

      const handler = MAIN_ROUTES[selected.id];
      if (handler) {
        screenManager.exit();
        await handler(showMainMenuNew);
      }
    }
  });

  const hintsComponent = createSimpleHintsComponent();
  const promptComponent = createSimplePromptComponent('↑/↓ Arrow keys • 0-9 Number keys • Letter Shortcuts • ⏎ Confirm');

  // Phase 1: Initial render
  screenManager.renderRegion('header', headerComponent.render(layout.header));
  screenManager.renderRegion('main', menuComponent.render(layout.main));
  screenManager.renderRegion('footerHints', hintsComponent.render(layout.footerHints));
  screenManager.renderRegion('footerPrompt', promptComponent.render(layout.footerPrompt));

  // Setup hint manager listener
  hintManager.on('change', (text: string) => {
    screenManager.renderRegion('footerHints', [text]);
  });

  // Phase 2: Handle interaction
  if (menuComponent.interact) {
    await menuComponent.interact();
  }

  // Exit alt screen
  screenManager.exit();
}

/**
 * Export main menu function
 */
export { showMainMenuNew as default };
