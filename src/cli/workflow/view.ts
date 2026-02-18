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

        for (const phase of data.phases) {
          const modeLabel = phase.execution.mode === 'loop' ? chalk.yellow(' [loop]') : '';
          const phaseNumber = phase.id.replace(/^phase-/, '');
          const phaseLabel = i18n.t('workflow.display.phaseNumber', { number: phaseNumber });

          // Add phase as list item (base indent)
          listItems.push({
            text: chalk.cyan.bold(`${phaseLabel}: ${phase.name}`) + modeLabel,
            indent: 1
          });

          // Add phase description (same indent as title)
          listItems.push({
            text: chalk.gray(phase.description),
            indent: 1
          });

          // Add steps (more indent than phase)
          for (const step of phase.steps) {
            const active = isStepActive(step, data.mode);

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

            // Pad step ID to ensure consistent spacing (max 8 chars for IDs like P2-11a)
            const paddedId = step.id.padEnd(8);

            const stepText = active
              ? `${paddedId}  ${step.name}${noteText}`
              : chalk.gray(`${paddedId}  ${step.name} (${i18n.t('workflow.display.skipped', { mode: data.mode })})`);

            listItems.push({
              text: stepText,
              indent: 2
            });
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
