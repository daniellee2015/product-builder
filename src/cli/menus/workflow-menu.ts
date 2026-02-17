/**
 * Workflow Configuration Menu
 */

import {
  menu,
  input,
  renderSectionHeader,
  renderSimpleHeader,
  renderSummaryTable,
  renderProgressIndicator,
  showInfo,
  showError,
  showSuccess
} from 'cli-menu-kit';
import chalk from 'chalk';
import { promptContinue } from './utils';
import { WorkflowData } from '../../types/workflow';
import { MENUS, buildMenuOptions, findSelectedItem } from '../../config/menu-registry';
import {
  loadWorkflow,
  saveWorkflow,
  isStepActive,
  countActiveSteps,
  countReviewGates,
  countTotalSteps
} from '../../services/workflow-service';

function displayWorkflow(data: WorkflowData): void {
  console.log('');
  renderSimpleHeader(data.name);

  const currentMode = data.available_modes[data.mode];
  const activeSteps = countActiveSteps(data);
  const totalSteps = countTotalSteps(data);

  renderSummaryTable({
    title: `Workflow Overview - ${currentMode.label} Mode (${activeSteps}/${totalSteps} steps active)`,
    titleAlign: 'left',
    sections: [{
      items: [
        { key: 'Mode', value: currentMode.label },
        { key: 'Description', value: currentMode.description },
        { key: 'Tools', value: currentMode.required_tools.length > 0 ? currentMode.required_tools.join(', ') : 'Any single CLI' },
        { key: 'Active Steps', value: `${activeSteps} / ${totalSteps}` },
        { key: 'Review Gates', value: String(countReviewGates(data)) },
        { key: 'Version', value: data.version }
      ]
    }]
    // No width specified - will use full terminal width
  });

  // Show phase progression
  console.log(chalk.cyan.bold('\n  Phases:'));
  renderProgressIndicator({
    steps: data.phases.map(p => p.name),
    currentStep: 0,
    separator: ' → '
  });

  console.log('');

  for (const phase of data.phases) {
    const modeLabel = phase.execution.mode === 'loop' ? chalk.yellow(' [loop]') : '';
    console.log(chalk.cyan.bold(`  ${phase.id}: ${phase.name}`) + modeLabel);
    console.log(chalk.gray(`  ${phase.description}\n`));

    for (const step of phase.steps) {
      const active = isStepActive(step, data.mode);
      const review = step.review_config ? chalk.magenta(' ★') : '';
      const cond = step.condition ? chalk.gray(` if ${step.condition}`) : '';
      const modeTag = step.min_mode !== 'lite' ? chalk.gray(` [${step.min_mode}+]`) : '';

      if (active) {
        console.log(`  ${chalk.white(step.id)}  ${step.name}${review}${cond}${modeTag}`);
        console.log(chalk.gray(`          skill: ${step.skill}`));
      } else {
        console.log(chalk.gray(`  ${step.id}  ${step.name} (skipped in ${data.mode} mode)`));
      }
    }
    console.log('');
  }

  showInfo('★ = multi-model review gate with auto-repair');
  console.log('');
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

export async function showWorkflowMenu(showMainMenu: () => Promise<void>): Promise<void> {
  const data = loadWorkflow();
  const modeLabel = data ? `${data.available_modes[data.mode]?.label || data.mode}` : '?';
  const menuConfig = MENUS.workflow;

  console.log('');
  renderSectionHeader(menuConfig.title, menuConfig.headerWidth);
  console.log(chalk.gray(`  Current mode: ${chalk.white(modeLabel)}\n`));

  const result = await menu.radio({
    options: buildMenuOptions(menuConfig),
    allowLetterKeys: true,
    allowNumberKeys: true,
    preserveOnSelect: true
  });

  const action = result.value;

  if (action.includes('Back')) {
    await showMainMenu();
    return;
  }

  const selected = findSelectedItem(menuConfig, action);

  if (selected?.id === 'view') {
    if (data) {
      displayWorkflow(data);
      // Simple back option
      await menu.radio({
        options: ['b. Back'],
        allowLetterKeys: true,
        preserveOnSelect: true
      });
      await showMainMenu();
    } else {
      showError('No workflow.json found.');
      await promptContinue();
      await showMainMenu();
    }
  } else if (selected?.id === 'switch-mode') {
    if (data) {
      const shouldContinue = await switchMode(data);
      if (shouldContinue) {
        await promptContinue();
      }
      await showMainMenu();
    } else {
      showError('No workflow.json found.');
      await promptContinue();
      await showMainMenu();
    }
  } else if (selected?.id === 'edit') {
    showInfo('Edit workflow coming soon...');
    console.log('');
    await promptContinue();
    await showMainMenu();
  }
}
