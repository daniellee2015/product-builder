/**
 * Workflow Configuration Menu
 * Menu navigation and routing
 */

import {
  renderPage,
  generateMenuHints,
  showError,
  menu,
  renderSectionHeader
} from 'cli-menu-kit';
import chalk from 'chalk';
import { MENUS, buildMenuOptions, findSelectedItem } from '../../core/menu-registry';
import { loadWorkflow } from '../../../services/workflow-service';
import { viewWorkflow } from './actions/view';
import { editWorkflow } from './actions/edit';
import { switchWorkflowMode } from './actions/switch';
import { importWorkflowPage } from './actions/import';
import { exportWorkflowPage } from './actions/export';
import { resetWorkflowPage } from './actions/reset';
import i18n from '../../../libs/i18n';

/**
 * Show workflow configuration menu (main workflow menu with 3 options)
 */
export async function showWorkflowMenu(showMainMenu: () => Promise<void>): Promise<void> {
  const config = MENUS.workflow;

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

  // Route to sub-menus
  if (selected.id === 'scheduling-workflow') {
    await showSchedulingWorkflowMenu(() => showWorkflowMenu(showMainMenu));
  } else if (selected.id === 'development-workflow') {
    await showDevelopmentWorkflowMenu(() => showWorkflowMenu(showMainMenu));
  } else if (selected.id === 'coordination') {
    await showCoordinationMenu(() => showWorkflowMenu(showMainMenu));
  }

  // Show menu again
  await showWorkflowMenu(showMainMenu);
}

/**
 * Show scheduling workflow sub-menu
 */
async function showSchedulingWorkflowMenu(back: () => Promise<void>): Promise<void> {
  console.log(chalk.yellow('\nScheduling workflow management coming soon...\n'));
  await back();
}

/**
 * Show development workflow sub-menu
 */
async function showDevelopmentWorkflowMenu(back: () => Promise<void>): Promise<void> {
  const data = loadWorkflow();
  const modeLabel = data ? `${data.available_modes[data.mode]?.label || data.mode}` : '?';
  const menuConfig = MENUS.workflow;

  const result = await renderPage({
    header: {
      type: 'section',
      text: 'Development Workflow',
      width: 50
    },
    mainArea: {
      type: 'display',
      render: () => {
        console.log(chalk.gray(`  Manage Phase 0-7 development workflow`));
        console.log('');
        console.log(chalk.gray(`  Current mode: ${chalk.white(modeLabel)}`));
        console.log('');
      }
    },
    footer: {
      menu: {
        options: [
          '1. View workflow - Show Phase 0-7',
          '2. Switch mode - Change mode (lite/standard/full)',
          '3. Edit workflow - Enable/disable steps',
          '4. Import workflow - Load custom workflow',
          '5. Export workflow - Save current workflow',
          '6. Reset workflow - Reset to defaults',
          'b. Back - Return to workflow menu'
        ],
        allowLetterKeys: true,
        allowNumberKeys: true,
        preserveOnSelect: true
      },
      hints: generateMenuHints({
        hasMultipleOptions: true,
        allowNumberKeys: true,
        allowLetterKeys: true
      })
    }
  });

  const action = result.value;

  if (action.includes('Back')) {
    await back();
    return;
  }

  if (action.includes('View workflow')) {
    if (data) {
      const action = await viewWorkflow(data);
      if (action.includes(i18n.t('workflow.view.edit'))) {
        await editWorkflow(data);
      }
      await showDevelopmentWorkflowMenu(back);
    } else {
      showError('No workflow.json found.');
      await showDevelopmentWorkflowMenu(back);
    }
  } else if (action.includes('Switch mode')) {
    if (data) {
      await switchWorkflowMode(data);
      await showDevelopmentWorkflowMenu(back);
    } else {
      showError('No workflow.json found.');
      await showDevelopmentWorkflowMenu(back);
    }
  } else if (action.includes('Edit workflow')) {
    if (data) {
      await editWorkflow(data);
      await showDevelopmentWorkflowMenu(back);
    } else {
      showError('No workflow.json found.');
      await showDevelopmentWorkflowMenu(back);
    }
  } else if (action.includes('Import workflow')) {
    if (data) {
      await importWorkflowPage(data);
      await showDevelopmentWorkflowMenu(back);
    } else {
      showError('No workflow.json found.');
      await showDevelopmentWorkflowMenu(back);
    }
  } else if (action.includes('Export workflow')) {
    if (data) {
      await exportWorkflowPage(data);
      await showDevelopmentWorkflowMenu(back);
    } else {
      showError('No workflow.json found.');
      await showDevelopmentWorkflowMenu(back);
    }
  } else if (action.includes('Reset workflow')) {
    if (data) {
      await resetWorkflowPage(data);
      await showDevelopmentWorkflowMenu(back);
    } else {
      showError('No workflow.json found.');
      await showDevelopmentWorkflowMenu(back);
    }
  }
}

/**
 * Show coordination sub-menu
 */
async function showCoordinationMenu(back: () => Promise<void>): Promise<void> {
  console.log(chalk.yellow('\nCoordination management coming soon...\n'));
  await back();
}
