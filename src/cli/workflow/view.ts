/**
 * View Workflow Detail Page
 * Display workflow overview and details
 */

import {
  renderPage,
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

  // Build phase items - each phase with title (black) and description (gray)
  const phaseItems = data.phases.map((p, i) => ({
    key: `${i18n.t('workflow.display.phase')} ${i + 1}`,
    value: `${p.name} ${chalk.gray('— ' + p.description)}`
  }));

  await renderPage({
    header: {
      type: 'simple',
      text: data.name
    },
    mainArea: {
      type: 'display',
      render: () => {
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

        showInfo('★ = multi-model review gate with auto-repair');
        console.log('');
      }
    },
    footer: {
      menu: {
        options: [`b. ${i18n.t('common.back')}`],
        allowLetterKeys: true,
        preserveOnSelect: true
      },
      hints: ['Enter Confirm']
    }
  });
}
