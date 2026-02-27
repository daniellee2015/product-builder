/**
 * Workflow Configuration Menu
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  menu,
  input,
  renderPage,
  renderSectionHeader,
  renderSimpleHeader,
  renderSummaryTable,
  renderProgressIndicator,
  generateMenuHints,
  showInfo,
  showError,
  showSuccess
} from 'cli-menu-kit';
import chalk from 'chalk';
import { promptContinue } from '../../shared/utils/menu-utils';
import { WorkflowData } from '../../../types/workflow';
import { MENUS, buildMenuOptions, findSelectedItem } from '../../core/menu-registry';
import {
  loadWorkflow,
  saveWorkflow,
  isStepActive,
  countActiveSteps,
  countReviewGates,
  countTotalSteps,
  exportCustomWorkflow,
  importCustomWorkflow,
  listCustomWorkflows,
  resetToBaseMode
} from '../../../services/workflow-service';

async function displayWorkflow(data: WorkflowData): Promise<void> {
  const currentMode = data.available_modes[data.mode];
  const activeSteps = countActiveSteps(data);
  const totalSteps = countTotalSteps(data);
  const phaseCount = data.phases.length;

  // Build phase items - each phase with title (black) and description (gray)
  const phaseItems = data.phases.map((p, i) => ({
    key: `Phase ${i + 1}`,
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
          title: `Workflow Overview - ${currentMode.label} Mode`,
          titleAlign: 'left',
          sections: [
            {
              header: 'Basic Information',
              items: [
                { key: 'Mode', value: currentMode.label },
                { key: 'Description', value: currentMode.description },
                { key: 'Tools', value: currentMode.required_tools.length > 0 ? currentMode.required_tools.join(', ') : 'Any single CLI' },
                { key: 'Active Steps', value: `${phaseCount} phases, ${activeSteps}/${totalSteps} steps active` },
                { key: 'Review Gates', value: String(countReviewGates(data)) },
                { key: 'Version', value: data.version }
              ]
            },
            {
              header: 'Workflow Phases',
              items: phaseItems
            }
          ]
        });

        console.log('');

        for (const phase of data.phases) {
          const modeLabel = phase.execution.mode === 'loop' ? chalk.yellow(' [loop]') : '';
          console.log(chalk.cyan.bold(`  ${phase.id}: ${phase.name}`) + modeLabel);
          console.log(chalk.gray(`  ${phase.description}
`));

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

        showInfo('★ = multi-model review gate with auto-repair');
        console.log('');
      }
    },
    footer: {
      menu: {
        options: ['b. Back'],
        allowLetterKeys: true,
        preserveOnSelect: true
      },
      hints: ['Enter Back']
    }
  });
}

async function switchMode(data: WorkflowData): Promise<boolean> {
  console.log('');
  renderSimpleHeader('Switch Workflow Mode');

  const modeKeys = Object.keys(data.available_modes);
  const options = modeKeys.map(key => {
    const m = data.available_modes[key];
    const current = key === data.mode ? chalk.green(' (current)') : '';
    const tools = m.required_tools.length > 0 ? m.required_tools.join(', ') : 'Any CLI';
    return `${m.label}${current}` + chalk.gray(` — ${m.steps} steps, ${tools}`);
  });

  // Add back option
  options.push('b. Back' + chalk.gray(' - Return to workflow menu'));

  const result = await menu.radio({
    options,
    allowNumberKeys: true,
    allowLetterKeys: true,
    preserveOnSelect: true
  });

  // Check if user selected back
  if (result.value.includes('Back')) {
    return false; // Don't show continue prompt
  }

  const selectedKey = modeKeys[result.index];
  if (selectedKey !== data.mode) {
    data.mode = selectedKey as any;
    saveWorkflow(data);
    showSuccess(`Switched to ${data.available_modes[selectedKey].label} mode`);
  } else {
    showInfo(`Already in ${data.available_modes[selectedKey].label} mode`);
  }
  console.log('');
  return true; // Show continue prompt
}

async function importWorkflow(data: WorkflowData): Promise<boolean> {
  console.log('');
  renderSimpleHeader('Import Custom Workflow');

  const filepaths = listCustomWorkflows();
  if (filepaths.length === 0) {
    showInfo('No custom workflows found in ~/.pb/workflows/');
    console.log('');
    return true;
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
  }).filter((w): w is { filepath: string; filename: string; config: any } => w !== null);

  if (workflows.length === 0) {
    showError('No valid workflow files found');
    console.log('');
    return true;
  }

  const options = workflows.map(w => {
    const baseModeLabel = data.available_modes[w.config.base_mode]?.label || w.config.base_mode;
    return `${w.config.name}` + chalk.gray(` — based on ${baseModeLabel}, ${w.config.enabled_steps.length} steps`);
  });
  options.push('b. Back' + chalk.gray(' - Return to workflow menu'));

  const result = await menu.radio({
    options,
    allowNumberKeys: true,
    allowLetterKeys: true,
    preserveOnSelect: true
  });

  if (result.value.includes('Back')) {
    return false;
  }

  const selected = workflows[result.index];
  if (!selected) {
    showError('Invalid selection');
    console.log('');
    return true;
  }

  try {
    importCustomWorkflow(selected.filepath, data);
    showSuccess(`Imported workflow: ${selected.config.name}`);
  } catch (e) {
    const error = e as Error;
    showError(`Failed to import workflow: ${error.message}`);
  }

  console.log('');
  return true;
}

async function exportWorkflow(data: WorkflowData): Promise<boolean> {
  console.log('');
  renderSimpleHeader('Export Custom Workflow');

  // Check if current mode is custom
  const currentMode = data.available_modes[data.mode];
  if (!currentMode.is_custom) {
    showInfo('Current mode is not a custom workflow. Switch to custom mode first or create one by editing workflow.');
    console.log('');
    return true;
  }

  // Prompt for workflow name
  const name = await input.text({
    prompt: 'Enter workflow name:',
    defaultValue: `custom-${data.mode}`,
    allowEmpty: false
  });

  if (!name || name.trim() === '') {
    showError('Workflow name cannot be empty');
    console.log('');
    return true;
  }

  try {
    const filepath = exportCustomWorkflow(data, name.trim());
    showSuccess(`Exported workflow to ${filepath}`);
  } catch (e) {
    const error = e as Error;
    showError(`Failed to export workflow: ${error.message}`);
  }

  console.log('');
  return true;
}

async function resetWorkflow(data: WorkflowData): Promise<boolean> {
  console.log('');
  renderSimpleHeader('Reset to Base Mode');

  const currentMode = data.available_modes[data.mode];
  if (!currentMode.is_custom) {
    showInfo('Current mode is not a custom workflow. Nothing to reset.');
    console.log('');
    return true;
  }

  const baseMode = currentMode.base_mode || 'standard';
  const baseModeLabel = data.available_modes[baseMode]?.label || baseMode;

  showInfo(`This will reset your custom workflow to the base mode: ${baseModeLabel}`);
  console.log('');

  const confirm = await menu.radio({
    options: [
      'Yes, reset to base mode',
      'No, keep custom workflow'
    ],
    allowNumberKeys: true,
    preserveOnSelect: true
  });

  if (confirm.index === 0) {
    try {
      resetToBaseMode(data, baseMode);
      showSuccess(`Reset to ${baseModeLabel} mode`);
    } catch (e) {
      const error = e as Error;
      showError(`Failed to reset workflow: ${error.message}`);
    }
  } else {
    showInfo('Reset cancelled');
  }

  console.log('');
  return true;
}

export async function showWorkflowMenu(showMainMenu: () => Promise<void>): Promise<void> {
  const data = loadWorkflow();
  const modeLabel = data ? `${data.available_modes[data.mode]?.label || data.mode}` : '?';
  const menuConfig = MENUS.workflow;

  const result = await renderPage({
    header: {
      type: 'section',
      text: menuConfig.title,
      width: menuConfig.headerWidth
    },
    mainArea: {
      type: 'display',
      render: () => {
        console.log(chalk.gray(`
  ${menuConfig.desc}
`));
        console.log(chalk.gray(`  Current mode: ${chalk.white(modeLabel)}
`));
      }
    },
    footer: {
      menu: {
        options: buildMenuOptions(menuConfig),
        allowLetterKeys: true,
        allowNumberKeys: true,
        preserveOnSelect: true
      },
      hints: generateMenuHints({
        hasMultipleOptions: true,
        allowNumberKeys: true,
        allowLetterKeys: true
      })
    }
  });

  const action = result.value;

  if (action.includes('Back')) {
    await showMainMenu();
    return;
  }

  const selected = findSelectedItem(menuConfig, action);

  if (selected?.id === 'view') {
    if (data) {
      await displayWorkflow(data);
      await showWorkflowMenu(showMainMenu);
    } else {
      showError('No workflow.json found.');
      await promptContinue();
      await showWorkflowMenu(showMainMenu);
    }
  } else if (selected?.id === 'switch-mode') {
    if (data) {
      const shouldContinue = await switchMode(data);
      if (shouldContinue) {
        await promptContinue();
      }
      await showWorkflowMenu(showMainMenu);
    } else {
      showError('No workflow.json found.');
      await promptContinue();
      await showWorkflowMenu(showMainMenu);
    }
  } else if (selected?.id === 'import') {
    if (data) {
      const shouldContinue = await importWorkflow(data);
      if (shouldContinue) {
        await promptContinue();
      }
      await showWorkflowMenu(showMainMenu);
    } else {
      showError('No workflow.json found.');
      await promptContinue();
      await showWorkflowMenu(showMainMenu);
    }
  } else if (selected?.id === 'export') {
    if (data) {
      const shouldContinue = await exportWorkflow(data);
      if (shouldContinue) {
        await promptContinue();
      }
      await showWorkflowMenu(showMainMenu);
    } else {
      showError('No workflow.json found.');
      await promptContinue();
      await showWorkflowMenu(showMainMenu);
    }
  } else if (selected?.id === 'reset') {
    if (data) {
      const shouldContinue = await resetWorkflow(data);
      if (shouldContinue) {
        await promptContinue();
      }
      await showWorkflowMenu(showMainMenu);
    } else {
      showError('No workflow.json found.');
      await promptContinue();
      await showWorkflowMenu(showMainMenu);
    }
  } else if (selected?.id === 'edit') {
    showInfo('Edit workflow coming soon...');
    console.log('');
    await promptContinue();
    await showWorkflowMenu(showMainMenu);
  }
}
