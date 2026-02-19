/**
 * View Workflow Detail Page
 * Display workflow overview and details
 */

import {
  renderPage,
  renderSummaryTable,
  renderList,
  showInfo,
  generateMenuHints,
  type ListItem
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
export async function viewWorkflow(data: WorkflowData): Promise<string> {
  const currentMode = data.available_modes[data.mode];
  const activeSteps = countActiveSteps(data);
  const totalSteps = countTotalSteps(data);
  const phaseCount = data.phases.length;

  // Build phase items
  const phaseItems = data.phases.map((p, i) => ({
    key: `${i18n.t('workflow.display.phase')} ${i + 1}`,
    value: `${p.name} ${chalk.gray('— ' + p.description)}`
  }));

  const result = await renderPage({
    header: {
      type: 'simple',
      text: data.name
    },
    mainArea: {
      type: 'display',
      render: () => {
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

        // Display detailed phase and step information using list component
        const listItems: ListItem[] = [];

        // Use label width to match summary table alignment
        // Summary table uses ~14-16 chars for left column (e.g., "Active Steps:")
        const labelWidth = 16;

        for (const [index, phase] of data.phases.entries()) {
          const modeLabel = phase.execution.mode === 'loop' ? chalk.yellow(' [loop]') : ''
          const phaseNumber = String(index).padStart(2, '0');
          const phaseLabel = i18n.t('workflow.display.phaseNumber', { number: phaseNumber });

          // Pad phase label to fixed width
          const phaseLabelWithColon = `${phaseLabel}:`;
          const paddedPhaseLabel = phaseLabelWithColon.padEnd(labelWidth);

          // Add phase header with fixed width padding
          listItems.push({
            text: ` ${chalk.cyan.bold(`${paddedPhaseLabel}${phase.name}`)}${modeLabel}`,
            indent: 1
          });

          // Add phase description with same padding
          const descriptionPadding = ' '.repeat(labelWidth);
          listItems.push({
            text: ` ${chalk.gray(`${descriptionPadding}${phase.description}`)}`,
            indent: 1
          });

          // Add blank line after phase description
          listItems.push({
            text: '',
            indent: 0
          });

          // Display groups with their steps
          if (phase.groups && phase.groups.length > 0) {
            for (const group of phase.groups) {
              // Count active steps in this group
              const groupSteps = phase.steps.filter(s => group.step_ids.includes(s.id));
              const activeGroupSteps = groupSteps.filter(s => isStepActive(s, data.mode, data));

              // Skip this group if no steps are active in current mode
              if (activeGroupSteps.length === 0) {
                continue;
              }

              // Get UI config for group label
              const shortName = (group as any).ui?.short_name || group.id;
              const groupLabel = ` [${shortName}]`; // Add 1 space before label
              const paddedGroupLabel = groupLabel.padEnd(labelWidth);

              // Add group header with label aligned to steps
              listItems.push({
                text: ` ${chalk.cyan(paddedGroupLabel)}${chalk.bold(group.name)}`,
                indent: 1
              });

              // Add group description with same padding
              const descriptionPadding = ' '.repeat(labelWidth);
              listItems.push({
                text: ` ${chalk.gray(`${descriptionPadding}${group.description}`)}`,
                indent: 1
              });

              // Add steps in this group
              for (const step of groupSteps) {
                const active = isStepActive(step, data.mode, data);

                // Skip inactive steps
                if (!active) {
                  continue;
                }

                // Build step notes with different colors
                const notes: string[] = [];

                // Check if step requires human approval (use yellow for visibility)
                if (step.requires_human_approval) {
                  notes.push(chalk.yellow('requires human approval'));
                }

                // Check if step has review_config (use gray)
                if (step.review_config && step.review_config.models && step.review_config.models.length > 0) {
                  notes.push(chalk.gray('multi-model review'));
                }

                const noteText = notes.length > 0 ? ` (${notes.join(', ')})` : '';

                // Pad step ID to match label width for alignment (1 space before ID)
                const stepLabel = ` ${step.id}`;
                const paddedStepLabel = stepLabel.padEnd(labelWidth);

                // Add step with aligned format
                const stepText = ` ${paddedStepLabel}${step.name}${noteText}`;

                listItems.push({
                  text: stepText,
                  indent: 1
                });
              }

              // Add blank line after each group
              listItems.push({
                text: '',
                indent: 0
              });
            }
          } else {
            // Fallback: if no groups defined, show steps directly
            for (const step of phase.steps) {
              const active = isStepActive(step, data.mode, data);

              // Skip inactive steps
              if (!active) {
                continue;
              }

              // Build step notes with different colors
              const notes: string[] = [];

              // Check if step requires human approval (use yellow for visibility)
              if (step.requires_human_approval) {
                notes.push(chalk.yellow('requires human approval'));
              }

              // Check if step has review_config (use gray)
              if (step.review_config && step.review_config.models && step.review_config.models.length > 0) {
                notes.push(chalk.gray('multi-model review'));
              }

              const noteText = notes.length > 0 ? ` (${notes.join(', ')})` : '';

              // Pad step ID to match label width for alignment (1 space before ID)
              const stepLabel = ` ${step.id}`;
              const paddedStepLabel = stepLabel.padEnd(labelWidth);

              // Add step with aligned format
              const stepText = ` ${paddedStepLabel}${step.name}${noteText}`;

              listItems.push({
                text: stepText,
                indent: 1
              });
            }
          }

          // Add blank line after each phase
          listItems.push({
            text: '',
            indent: 0
          });
        }

        renderList({
          items: listItems,
          style: 'none'
        });

        console.log('');
      }
    },
    footer: {
      menu: {
        options: [
          `e. ${i18n.t('workflow.view.edit')}`,
          `b. ${i18n.t('common.back')}`
        ],
        allowLetterKeys: true,
        preserveOnSelect: true
      },
      hints: generateMenuHints({
        hasMultipleOptions: true,
        allowLetterKeys: true
      })
    }
  });

  return result.value;
}
