/**
 * Import Workflow Page
 * Load custom workflow configuration from .product-builder/workflows/
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  renderPage,
  showInfo,
  showError,
  showSuccess,
  generateMenuHints
} from 'cli-menu-kit';
import chalk from 'chalk';
import { WorkflowData } from '../../types/workflow';
import { importCustomWorkflow, listCustomWorkflows } from '../../services/workflow-service';
import i18n from '../../libs/i18n';

/**
 * Import custom workflow
 */
export async function importWorkflowPage(data: WorkflowData): Promise<string> {
  const filepaths = listCustomWorkflows();

  if (filepaths.length === 0) {
    await renderPage({
      header: { type: 'simple', text: i18n.t('workflow.import.title') },
      mainArea: {
        type: 'display',
        render: () => {
          showInfo(i18n.t('workflow.import.noWorkflows'));
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

  // Read each workflow file to get metadata
  const workflows = filepaths.map(filepath => {
    try {
      const content = fs.readFileSync(filepath, 'utf-8');
      const config = JSON.parse(content);
      const filename = path.basename(filepath);
      return { filepath, filename, config };
    } catch (e) {
      return null;
    }
  }).filter((w): w is {
    filepath: string; filename: string; config: any;
  } => w !== null);

  if (workflows.length === 0) {
    await renderPage({
      header: { type: 'simple', text: i18n.t('workflow.import.title') },
      mainArea: {
        type: 'display',
        render: () => {
          showError(i18n.t('workflow.import.noValidFiles'));
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

  // Build menu options
  const options = workflows.map(w => {
    const baseModeLabel = data.available_modes[w.config.base_mode]?.label || w.config.base_mode;
    return `${w.config.name}` + chalk.gray(` — ${i18n.t('workflow.import.basedOn', {
      mode: baseModeLabel, steps: String(w.config.enabled_steps.length)
    })}`);
  });
  options.push(
    `b. ${i18n.t('workflow.import.back')}`
    + chalk.gray(` - ${i18n.t('workflow.import.backDesc')}`)
  );

  const result = await renderPage({
    header: {
      type: 'simple',
      text: i18n.t('workflow.import.title')
    },
    mainArea: {
      type: 'display',
      render: () => {
        console.log(chalk.gray(`  ${i18n.t('workflow.import.description', {
          count: String(workflows.length)
        })}`));
        console.log('');
      }
    },
    footer: {
      menu: {
        options,
        allowNumberKeys: true,
        allowLetterKeys: true,
        preserveOnSelect: true
      },
      hints: generateMenuHints({
        hasMultipleOptions: true,
        allowNumberKeys: true,
        allowLetterKeys: true
      })
    }
  });

  if (result.value.includes(i18n.t('workflow.import.back'))) {
    return 'back';
  }

  const selected = workflows[result.index];
  if (!selected) {
    showError(i18n.t('workflow.import.invalidSelection'));
    console.log('');
    return 'back';
  }

  try {
    importCustomWorkflow(selected.filepath, data);
    showSuccess(i18n.t('workflow.import.success', { name: selected.config.name }));
  } catch (e) {
    const error = e as Error;
    showError(i18n.t('workflow.import.error', { message: error.message }));
  }

  console.log('');
  return 'back';
}
