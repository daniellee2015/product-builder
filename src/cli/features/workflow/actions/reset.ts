/**
 * Reset Workflow Page
 * Reset custom workflow to base mode
 */

import {
  renderPage,
  showInfo,
  showError,
  showSuccess,
  generateMenuHints
} from 'cli-menu-kit';
import chalk from 'chalk';
import { WorkflowData } from '../../../../types/workflow';
import { resetToBaseMode } from '../../../../services/workflow-service';
import i18n from '../../../../libs/i18n';

/**
 * Reset custom workflow to base mode
 */
export async function resetWorkflowPage(data: WorkflowData): Promise<string> {
  const currentMode = data.available_modes[data.mode];

  // Check if current mode is custom
  if (!currentMode.is_custom) {
    await renderPage({
      header: { type: 'simple', text: i18n.t('workflow.reset.title') },
      mainArea: {
        type: 'display',
        render: () => {
          showInfo(i18n.t('workflow.reset.notCustom'));
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

  const baseMode = currentMode.base_mode || 'standard';
  const baseModeLabel = data.available_modes[baseMode]?.label || baseMode;

  const result = await renderPage({
    header: {
      type: 'simple',
      text: i18n.t('workflow.reset.title')
    },
    mainArea: {
      type: 'display',
      render: () => {
        showInfo(i18n.t('workflow.reset.confirmMessage', {
          mode: baseModeLabel
        }));
        console.log('');
      }
    },
    footer: {
      menu: {
        options: [
          i18n.t('workflow.reset.confirmYes'),
          i18n.t('workflow.reset.confirmNo')
        ],
        allowNumberKeys: true,
        preserveOnSelect: true
      },
      hints: generateMenuHints({
        hasMultipleOptions: true,
        allowNumberKeys: true
      })
    }
  });

  if (result.index === 0) {
    try {
      resetToBaseMode(data, baseMode);
      showSuccess(i18n.t('workflow.reset.success', { mode: baseModeLabel }));
    } catch (e) {
      const error = e as Error;
      showError(i18n.t('workflow.reset.error', { message: error.message }));
    }
  } else {
    showInfo(i18n.t('workflow.reset.cancelled'));
  }

  console.log('');
  return 'back';
}
