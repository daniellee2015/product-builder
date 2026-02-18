/**
 * Switch Workflow Mode Page
 * Change between workflow modes (lite/standard/full/custom)
 */

import {
  renderPage,
  showSuccess,
  showInfo,
  generateMenuHints
} from 'cli-menu-kit';
import chalk from 'chalk';
import { WorkflowData } from '../../types/workflow';
import { saveWorkflow } from '../../services/workflow-service';
import i18n from '../../libs/i18n';

/**
 * Switch workflow mode
 */
export async function switchWorkflowMode(data: WorkflowData): Promise<string> {
  const modeKeys = Object.keys(data.available_modes);

  // Build mode options for footer menu
  const options = modeKeys.map(key => {
    const m = data.available_modes[key];
    const current = key === data.mode
      ? chalk.green(` ${i18n.t('workflow.switchMode.current')}`) : '';
    const tools = m.required_tools.length > 0
      ? m.required_tools.join(', ') : 'Any CLI';
    const info = i18n.t('workflow.switchMode.stepsInfo', {
      steps: String(m.steps), tools
    });
    return `${m.label}${current}` + chalk.gray(` — ${info}`);
  });

  options.push(
    `b. ${i18n.t('workflow.switchMode.back')}`
    + chalk.gray(` - ${i18n.t('workflow.switchMode.backDesc')}`)
  );

  const result = await renderPage({
    header: {
      type: 'simple',
      text: i18n.t('workflow.switchMode.title')
    },
    mainArea: {
      type: 'display',
      render: () => {
        const currentMode = data.available_modes[data.mode];
        console.log(chalk.gray(`  Current: ${chalk.white(currentMode.label)}`));
        console.log(chalk.gray(`  ${currentMode.description}`));
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

  // Check if user selected back
  if (result.value.includes(i18n.t('workflow.switchMode.back'))) {
    return 'back';
  }

  const selectedKey = modeKeys[result.index];
  if (selectedKey !== data.mode) {
    data.mode = selectedKey as any;
    saveWorkflow(data);
    showSuccess(i18n.t('workflow.switchMode.success', {
      mode: data.available_modes[selectedKey].label
    }));
  } else {
    showInfo(i18n.t('workflow.switchMode.alreadyIn', {
      mode: data.available_modes[selectedKey].label
    }));
  }

  console.log('');
  return 'back';
}
