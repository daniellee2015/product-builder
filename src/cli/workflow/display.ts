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
        console.log(`  ${chalk.white(step.id)}  ${step.name}`);
      } else {
        console.log(chalk.gray(`  ${step.id}  ${step.name} (${i18n.t('workflow.display.skipped', { mode: data.mode })})`));
      }
    }
    console.log('');
  }
}

/**
 * Display workflow steps in detailed table format for editing
 */
export function displayWorkflowTable(data: WorkflowData): void {
  console.log('');
  renderSimpleHeader(i18n.t('workflow.edit.tableTitle'));
  console.log(chalk.gray(`  ${i18n.t('workflow.edit.tableDesc')}\n`));

  for (const phase of data.phases) {
    const phaseNumber = phase.id.replace(/^phase-/, '');
    const phaseLabel = i18n.t('workflow.display.phaseNumber', { number: phaseNumber });
    console.log(chalk.cyan.bold(`\n  ${phaseLabel}: ${phase.name}`));
    console.log(chalk.gray(`  ${phase.description}\n`));

    // Table header
    const colWidths = {
      id: 8,
      name: 30,
      condition: 20,
      mode: 10,
      tools: 15,
      review: 8
    };

    const header =
      chalk.cyan(i18n.t('workflow.edit.colId').padEnd(colWidths.id)) +
      chalk.cyan(i18n.t('workflow.edit.colName').padEnd(colWidths.name)) +
      chalk.cyan(i18n.t('workflow.edit.colCondition').padEnd(colWidths.condition)) +
      chalk.cyan(i18n.t('workflow.edit.colMode').padEnd(colWidths.mode)) +
      chalk.cyan(i18n.t('workflow.edit.colTools').padEnd(colWidths.tools)) +
      chalk.cyan(i18n.t('workflow.edit.colReview').padEnd(colWidths.review));

    console.log(`  ${header}`);
    console.log(`  ${chalk.gray('─'.repeat(colWidths.id + colWidths.name + colWidths.condition + colWidths.mode + colWidths.tools + colWidths.review))}`);

    // Table rows
    for (const step of phase.steps) {
      const active = isStepActive(step, data.mode);

      // Truncate long names
      const name = step.name.length > colWidths.name - 2
        ? step.name.substring(0, colWidths.name - 5) + '...'
        : step.name;

      // Format condition
      const condition = step.condition
        ? i18n.t(`workflow.conditions.${step.condition}`).substring(0, colWidths.condition - 2)
        : '-';

      // Format mode
      const mode = step.min_mode !== 'lite' ? `${step.min_mode}+` : '-';

      // Format tools
      const tools = step.required_tools && step.required_tools.length > 0
        ? step.required_tools.join(',').substring(0, colWidths.tools - 2)
        : '-';

      // Format review
      const review = step.review_config ? chalk.magenta('Yes') : '-';

      const row =
        step.id.padEnd(colWidths.id) +
        name.padEnd(colWidths.name) +
        condition.padEnd(colWidths.condition) +
        mode.padEnd(colWidths.mode) +
        tools.padEnd(colWidths.tools) +
        review.padEnd(colWidths.review);

      if (active) {
        console.log(`  ${row}`);
      } else {
        console.log(chalk.gray(`  ${row}`));
      }
    }
  }

  console.log('');
}

