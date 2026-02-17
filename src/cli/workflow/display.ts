/**
 * Workflow Display Logic
 */

import {
  renderSimpleHeader,
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
export function displayWorkflow(data: WorkflowData): void {
  console.log('');
  renderSimpleHeader(data.name);

  const currentMode = data.available_modes[data.mode];
  const activeSteps = countActiveSteps(data);
  const totalSteps = countTotalSteps(data);
  const phaseCount = data.phases.length;

  // Build phase items - each phase with title (black) and description (gray)
  const phaseItems = data.phases.map((p, i) => ({
    key: `${i18n.t('workflow.display.phase')} ${i + 1}`,
    value: `${p.name} ${chalk.gray('— ' + p.description)}`
  }));

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
    // Format phase ID: "phase-0" -> "Phase 0"
    const phaseLabel = phase.id.replace(/^phase-(\d+)$/, 'Phase $1');
    console.log(chalk.cyan.bold(`  ${phaseLabel}: ${phase.name}`) + modeLabel);
    console.log(chalk.gray(`  ${phase.description}\n`));

    for (const step of phase.steps) {
      const active = isStepActive(step, data.mode);
      const review = step.review_config ? chalk.magenta(' ★') : '';
      const cond = step.condition ? chalk.gray(` if ${step.condition}`) : '';
      const modeTag = step.min_mode !== 'lite' ? chalk.gray(` [${step.min_mode}+]`) : '';

      if (active) {
        console.log(`  ${chalk.white(step.id)}  ${step.name}${review}${cond}${modeTag}`);
      } else {
        console.log(chalk.gray(`  ${step.id}  ${step.name} (skipped in ${data.mode} mode)`));
      }
    }
    console.log('');
  }

  showInfo(i18n.t('workflow.display.reviewGateInfo'));
  console.log('');
}
