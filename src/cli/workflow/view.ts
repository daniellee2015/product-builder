/**
 * View Workflow Detail Page
 * Display workflow overview and details
 */

import {
  renderSummaryTable,
  showInfo
} from 'cli-menu-kit';
import chalk from 'chalk';
import { WorkflowData } from '../../types/workflow';
import {
  isStepActive,
  countActiveSteps,
  countReviewGates,
  countTotalSteps
} from '../../services/workflow-service';
import i18n from '../../libs/i18n';

/**
 * Display workflow overview and details
 */
export async function viewWorkflow(data: WorkflowData): Promise<void> {
  const currentMode = data.available_modes[data.mode];
  const activeSteps = countActiveSteps(data);
  const totalSteps = countTotalSteps(data);
  const phaseCount = data.phases.length;

  // Build phase items
  const phaseItems = data.phases.map((p, i) => ({
    key: `${i18n.t('workflow.display.phase')} ${i + 1}`,
    value: `${p.name} ${chalk.gray('— ' + p.description)}`
  }));

  // Render header
  console.log('');
  console.log(chalk.cyan.bold(`  ${data.name}`));
  console.log('');

  // Render summary table
  renderSummaryTable({
    title: `${i18n.t('workflow.display.overview')} - ${currentMode.label} Mode`,
    titleAlign: 'left',
    sections: [
      {
        header: i18n.t('workflow.display.basicInfo'),
        items: [
          { key: i18n.t('workflow.display.mode'), value: currentMode.label },
          { key: i18n.t('workflow.display.description'), value: currentMode.description },
          {
            key: i18n.t('workflow.display.tools'),
            value: currentMode.required_tools.length > 0
              ? currentMode.required_tools.join(', ')
              : i18n.t('workflow.display.anyCLI')
          },
          {
            key: i18n.t('workflow.display.activeSteps'),
            value: i18n.t('workflow.display.phasesCount', {
              count: String(phaseCount),
              active: String(activeSteps),
              total: String(totalSteps)
            })
          },
          { key: i18n.t('workflow.display.reviewGates'), value: String(countReviewGates(data)) },
          { key: i18n.t('workflow.display.version'), value: data.version }
        ]
      },
      {
        header: i18n.t('workflow.display.workflowPhases'),
        items: phaseItems
      }
    ]
  });

  console.log('');

  // Display detailed phase and step information
  for (const phase of data.phases) {
    const modeLabel = phase.execution.mode === 'loop' ? chalk.yellow(' [loop]') : '';
    const phaseNumber = phase.id.replace(/^phase-/, '');
    const phaseLabel = i18n.t('workflow.display.phaseNumber', { number: phaseNumber });
    console.log(chalk.cyan.bold(`  ${phaseLabel}: ${phase.name}`) + modeLabel);
    console.log(chalk.gray(`  ${phase.description}\n`));

    for (const step of phase.steps) {
      const active = isStepActive(step, data.mode);

      if (active) {
        console.log(`  ${chalk.white(step.id)}  ${step.name}`);
      } else {
        console.log(chalk.gray(`  ${step.id}  ${step.name} (${i18n.t('workflow.display.skipped', { mode: data.mode })})`));
      }
    }
    console.log('');
  }

  showInfo('★ = multi-model review gate with auto-repair');
  console.log('');

  // Simple wait without raw mode - allows scrolling
  console.log(chalk.gray(`  Press Enter to return...`));

  return new Promise((resolve) => {
    // Explicitly ensure NOT in raw mode
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    // Wait for any input
    const handler = () => {
      process.stdin.removeListener('data', handler);
      process.stdin.pause();
      resolve();
    };

    process.stdin.once('data', handler);
  });
}
