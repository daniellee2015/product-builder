/**
 * Export Workflow Page
 * Save custom workflow configuration to .product-builder/workflows/
 */

import {
  renderPage,
  showInfo,
  showError,
  showSuccess,
  generateMenuHints
} from 'cli-menu-kit';
import chalk from 'chalk';
import { WorkflowData } from '../../types/workflow';
import { exportCustomWorkflow } from '../../services/workflow-service';
import i18n from '../../libs/i18n';

/**
 * Export custom workflow
 */
export async function exportWorkflowPage(data: WorkflowData): Promise<string> {
  const currentMode = data.available_modes[data.mode];

  // Check if current mode is custom
  if (!currentMode.is_custom) {
    await renderPage({
      header: { type: 'simple', text: i18n.t('workflow.export.title') },
      mainArea: {
        type: 'display',
        render: () => {
          showInfo(i18n.t('workflow.export.notCustom'));
          console.log('');
        }
      },
      footer: {
        menu: {
          options: [i18n.t('common.back')],
          preserveOnSelect: true
        }
      }
    });
    return 'back';
  }

  const defaultName = i18n.t('workflow.export.defaultName', { mode: data.mode });

  const result = await renderPage({
    header: {
      type: 'simple',
      text: i18n.t('workflow.export.title')
    },
    mainArea: {
      type: 'display',
      render: () => {
        console.log(chalk.gray(`  Mode: ${chalk.white(currentMode.label)}`));
        console.log(chalk.gray(`  ${currentMode.description}`));
        console.log('');
      }
    },
    footer: {
      input: {
        prompt: i18n.t('workflow.export.promptName'),
        defaultValue: defaultName,
        allowEmpty: false
      }
    }
  });

  const name = result as string;
  if (!name || name.trim() === '') {
    showError(i18n.t('workflow.export.emptyName'));
    console.log('');
    return 'back';
  }

  try {
    const filepath = exportCustomWorkflow(data, name.trim());
    showSuccess(i18n.t('workflow.export.success', { path: filepath }));
  } catch (e) {
    const error = e as Error;
    showError(i18n.t('workflow.export.error', { message: error.message }));
  }

  console.log('');
  return 'back';
}
