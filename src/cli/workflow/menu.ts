/**
 * Workflow Configuration Menu
 * Menu navigation and routing
 */

import {
  renderPage,
  generateMenuHints,
  showError
} from 'cli-menu-kit';
import chalk from 'chalk';
import { MENUS, buildMenuOptions, findSelectedItem } from '../../config/menu-registry';
import { loadWorkflow } from '../../services/workflow-service';
import { viewWorkflow } from './view';
import { editWorkflow } from './edit';
import { switchWorkflowMode } from './switch';
import { importWorkflowPage } from './import';
import { exportWorkflowPage } from './export';
import { resetWorkflowPage } from './reset';
import i18n from '../../libs/i18n';

/**
 * Show workflow configuration menu
 */
export async function showWorkflowMenu(showMainMenu: () => Promise<void>): Promise<void> {
  const data = loadWorkflow();
  const modeLabel = data ? `${data.available_modes[data.mode]?.label || data.mode}` : '?';
  const menuConfig = MENUS.workflow;

  const result = await renderPage({
    header: {
      type: 'section',
      text: menuConfig.title,
      width: menuConfig.headerWidth
    },
    mainArea: {
      type: 'display',
      render: () => {
        if (menuConfig.desc) {
          console.log(chalk.gray(`  ${menuConfig.desc}`));
          console.log('');
        }
        console.log(chalk.gray(`  Current mode: ${chalk.white(modeLabel)}`));
        console.log('');
      }
    },
    footer: {
      menu: {
        options: buildMenuOptions(menuConfig),
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
    await showMainMenu();
    return;
  }

  const selected = findSelectedItem(menuConfig, action);

  if (selected?.id === 'view') {
    if (data) {
      const action = await viewWorkflow(data);

      // Check if user selected edit
      if (action.includes(i18n.t('workflow.view.edit'))) {
        await editWorkflow(data);
      }

      await showWorkflowMenu(showMainMenu);
    } else {
      showError('No workflow.json found.');
      await showWorkflowMenu(showMainMenu);
    }
  } else if (selected?.id === 'switch-mode') {
    if (data) {
      await switchWorkflowMode(data);
      await showWorkflowMenu(showMainMenu);
    } else {
      showError('No workflow.json found.');
      await showWorkflowMenu(showMainMenu);
    }
  } else if (selected?.id === 'import') {
    if (data) {
      await importWorkflowPage(data);
      await showWorkflowMenu(showMainMenu);
    } else {
      showError('No workflow.json found.');
      await showWorkflowMenu(showMainMenu);
    }
  } else if (selected?.id === 'export') {
    if (data) {
      await exportWorkflowPage(data);
      await showWorkflowMenu(showMainMenu);
    } else {
      showError('No workflow.json found.');
      await showWorkflowMenu(showMainMenu);
    }
  } else if (selected?.id === 'reset') {
    if (data) {
      await resetWorkflowPage(data);
      await showWorkflowMenu(showMainMenu);
    } else {
      showError('No workflow.json found.');
      await showWorkflowMenu(showMainMenu);
    }
  } else if (selected?.id === 'edit') {
    if (data) {
      await editWorkflow(data);
      await showWorkflowMenu(showMainMenu);
    } else {
      showError('No workflow.json found.');
      await showWorkflowMenu(showMainMenu);
    }
  }
}
