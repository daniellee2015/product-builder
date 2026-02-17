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
    // Extract phase number from ID (e.g., "phase-0" -> "0")
    const phaseNumber = phase.id.replace(/^phase-/, '');
    const phaseLabel = i18n.t('workflow.display.phaseNumber', { number: phaseNumber });
    console.log(chalk.cyan.bold(`  ${phaseLabel}: ${phase.name}`) + modeLabel);
    console.log(chalk.gray(`  ${phase.description}\n`));

    for (const step of phase.steps) {
      const active = isStepActive(step, data.mode);

      if (active) {
        // Main step line
        console.log(`  ${chalk.white(step.id)}  ${step.name}`);

        // Metadata line (only if there's metadata to show)
        const metadata: string[] = [];

        if (step.condition) {
          const conditionText = i18n.t(`workflow.conditions.${step.condition}`);
          metadata.push(chalk.gray(`${i18n.t('workflow.display.condition')}: ${conditionText}`));
        }

        if (step.min_mode && step.min_mode !== 'lite') {
          metadata.push(chalk.gray(`${i18n.t('workflow.display.minMode')}: ${step.min_mode}+`));
        }

        if (step.review_config) {
          metadata.push(chalk.magenta(`${i18n.t('workflow.display.review')}: ${i18n.t('workflow.display.yes')}`));
        }

        if (metadata.length > 0) {
          console.log(`          ${metadata.join(chalk.gray(' | '))}`);
        }
      } else {
        console.log(chalk.gray(`  ${step.id}  ${step.name} (${i18n.t('workflow.display.skipped', { mode: data.mode })})`));
      }
    }
    console.log('');
  }

  showInfo(i18n.t('workflow.display.reviewGateInfo'));
  console.log('');
}
