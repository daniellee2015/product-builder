/**
 * Workflow Configuration Menu
 * Menu navigation logic only - display logic is in display.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  menu,
  input,
  renderPage,
  renderSectionHeader,
  renderSimpleHeader,
  generateMenuHints,
  showInfo,
  showError,
  showSuccess
} from 'cli-menu-kit';
import chalk from 'chalk';
import { WorkflowData } from '../../types/workflow';
import { MENUS, buildMenuOptions, findSelectedItem } from '../../config/menu-registry';
import {
  loadWorkflow,
  saveWorkflow,
  exportCustomWorkflow,
  importCustomWorkflow,
  listCustomWorkflows,
  resetToBaseMode,
  isStepActive
} from '../../services/workflow-service';
import { displayWorkflow, displayWorkflowTable, displayEditableWorkflowTable } from './display';
import { viewWorkflow } from './view';
import i18n from '../../libs/i18n';

/**
 * Switch workflow mode
 */
async function switchMode(data: WorkflowData): Promise<boolean> {
  console.log('');
  renderSimpleHeader(i18n.t('workflow.switchMode.title'));

  const modeKeys = Object.keys(data.available_modes);
  const options = modeKeys.map(key => {
    const m = data.available_modes[key];
    const current = key === data.mode ? chalk.green(` ${i18n.t('workflow.switchMode.current')}`) : '';
    const tools = m.required_tools.length > 0 ? m.required_tools.join(', ') : 'Any CLI';
    return `${m.label}${current}` + chalk.gray(` — ${i18n.t('workflow.switchMode.stepsInfo', { steps: String(m.steps), tools })}`);
  });

  // Add back option
  options.push(`b. ${i18n.t('workflow.switchMode.back')}` + chalk.gray(` - ${i18n.t('workflow.switchMode.backDesc')}`));

  const result = await menu.radio({
    options,
    allowNumberKeys: true,
    allowLetterKeys: true,
    preserveOnSelect: true
  });

  // Check if user selected back
  if (result.value.includes(i18n.t('workflow.switchMode.back'))) {
    return false; // Don't show continue prompt
  }

  const selectedKey = modeKeys[result.index];
  if (selectedKey !== data.mode) {
    data.mode = selectedKey as any;
    saveWorkflow(data);
    showSuccess(i18n.t('workflow.switchMode.success', { mode: data.available_modes[selectedKey].label }));
  } else {
    showInfo(i18n.t('workflow.switchMode.alreadyIn', { mode: data.available_modes[selectedKey].label }));
  }
  console.log('');
  return true; // Show continue prompt
}

/**
 * Import custom workflow
 */
async function importWorkflow(data: WorkflowData): Promise<boolean> {
  console.log('');
  renderSimpleHeader(i18n.t('workflow.import.title'));

  const filepaths = listCustomWorkflows();
  if (filepaths.length === 0) {
    showInfo(i18n.t('workflow.import.noWorkflows'));
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
    showError(i18n.t('workflow.import.noValidFiles'));
    console.log('');
    return true;
  }

  const options = workflows.map(w => {
    const baseModeLabel = data.available_modes[w.config.base_mode]?.label || w.config.base_mode;
    return `${w.config.name}` + chalk.gray(` — ${i18n.t('workflow.import.basedOn', { mode: baseModeLabel, steps: String(w.config.enabled_steps.length) })}`);
  });
  options.push(`b. ${i18n.t('workflow.import.back')}` + chalk.gray(` - ${i18n.t('workflow.import.backDesc')}`));

  const result = await menu.radio({
    options,
    allowNumberKeys: true,
    allowLetterKeys: true,
    preserveOnSelect: true
  });

  if (result.value.includes(i18n.t('workflow.import.back'))) {
    return false;
  }

  const selected = workflows[result.index];
  if (!selected) {
    showError(i18n.t('workflow.import.invalidSelection'));
    console.log('');
    return true;
  }

  try {
    importCustomWorkflow(selected.filepath, data);
    showSuccess(i18n.t('workflow.import.success', { name: selected.config.name }));
  } catch (e) {
    const error = e as Error;
    showError(i18n.t('workflow.import.error', { message: error.message }));
  }

  console.log('');
  return true;
}

/**
 * Export custom workflow
 */
async function exportWorkflow(data: WorkflowData): Promise<boolean> {
  console.log('');
  renderSimpleHeader(i18n.t('workflow.export.title'));

  // Check if current mode is custom
  const currentMode = data.available_modes[data.mode];
  if (!currentMode.is_custom) {
    showInfo(i18n.t('workflow.export.notCustom'));
    console.log('');
    return true;
  }

  // Prompt for workflow name
  const name = await input.text({
    prompt: i18n.t('workflow.export.promptName'),
    defaultValue: i18n.t('workflow.export.defaultName', { mode: data.mode }),
    allowEmpty: false
  });

  if (!name || name.trim() === '') {
    showError(i18n.t('workflow.export.emptyName'));
    console.log('');
    return true;
  }

  try {
    const filepath = exportCustomWorkflow(data, name.trim());
    showSuccess(i18n.t('workflow.export.success', { path: filepath }));
  } catch (e) {
    const error = e as Error;
    showError(i18n.t('workflow.export.error', { message: error.message }));
  }

  console.log('');
  return true;
}

/**
 * Reset custom workflow to base mode
 */
async function resetWorkflow(data: WorkflowData): Promise<boolean> {
  console.log('');
  renderSimpleHeader(i18n.t('workflow.reset.title'));

  const currentMode = data.available_modes[data.mode];
  if (!currentMode.is_custom) {
    showInfo(i18n.t('workflow.reset.notCustom'));
    console.log('');
    return true;
  }

  const baseMode = currentMode.base_mode || 'standard';
  const baseModeLabel = data.available_modes[baseMode]?.label || baseMode;

  showInfo(i18n.t('workflow.reset.confirmMessage', { mode: baseModeLabel }));
  console.log('');

  const confirm = await menu.radio({
    options: [
      i18n.t('workflow.reset.confirmYes'),
      i18n.t('workflow.reset.confirmNo')
    ],
    allowNumberKeys: true,
    preserveOnSelect: true
  });

  if (confirm.index === 0) {
    try {
      resetToBaseMode(data, baseMode);
      showSuccess(i18n.t('workflow.reset.success', { mode: baseModeLabel }));
    } catch (e) {
      const error = e as Error;
      showError(i18n.t('workflow.reset.error', { message: error.message }));
    }
  } else {
    showInfo(i18n.t('workflow.reset.cancelled'));
  }

  console.log('');
  return true;
}

/**
 * Prompt to continue
 */
async function promptContinue(): Promise<void> {
  await input.text({
    prompt: i18n.t('common.continue'),
    allowEmpty: true
  });
}

/**
 * Show workflow configuration menu
 */
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
        if (menuConfig.desc) {
          console.log(chalk.gray(`  ${menuConfig.desc}`));
          console.log('');
        }
        console.log(chalk.gray(`  Current mode: ${chalk.white(modeLabel)}`));
        console.log('');
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
      const action = await viewWorkflow(data);

      // Check if user selected edit
      if (action.includes(i18n.t('workflow.view.edit'))) {
        // TODO: Navigate to edit workflow
        showInfo('Edit workflow - Coming soon');
        await promptContinue();
      }

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
    if (data) {
      const originalEnabledSteps = data.available_modes[data.mode].enabled_steps || [];
      const selectedSteps = await displayEditableWorkflowTable(data);

      // Check if there are changes
      const hasChanges = JSON.stringify(selectedSteps.sort()) !== JSON.stringify(originalEnabledSteps.sort());

      // Show footer menu with Save/Cancel/Back
      const footerOptions = hasChanges
        ? [
            `1. ${i18n.t('workflow.edit.save')}`,
            `2. ${i18n.t('workflow.edit.cancel')}`,
            `b. ${i18n.t('common.back')}`
          ]
        : [`b. ${i18n.t('common.back')}`];

      const footerResult = await menu.radio({
        options: footerOptions,
        allowLetterKeys: true,
        allowNumberKeys: true,
        preserveOnSelect: true
      });

      if (hasChanges && footerResult.index === 0) {
        // Save
        const currentMode = data.available_modes[data.mode];
        if (currentMode.is_custom) {
          currentMode.enabled_steps = selectedSteps;
          currentMode.steps = selectedSteps.length;
        } else {
          const customModeName = `custom-${data.mode}`;
          data.available_modes[customModeName] = {
            label: `Custom (${currentMode.label})`,
            required_tools: currentMode.required_tools,
            enabled_steps: selectedSteps,
            description: `Custom workflow based on ${currentMode.label} mode`,
            steps: selectedSteps.length,
            review_gates: 0,
            is_custom: true,
            base_mode: data.mode
          };
          data.mode = customModeName as any;
        }

        saveWorkflow(data);
        showSuccess(i18n.t('workflow.edit.success', { count: String(selectedSteps.length) }));
        console.log('');
      } else if (hasChanges && (footerResult.index === 1 || footerResult.index === 2)) {
        // Cancel or Back with unsaved changes - ask for confirmation
        const confirm = await menu.booleanH(
          i18n.t('workflow.edit.confirmDiscard'),
          false  // defaultValue: No
        );

        if (!confirm) {
          // User chose not to discard, go back to edit
          await showWorkflowMenu(showMainMenu);
          return;
        }

        showInfo(i18n.t('workflow.edit.cancelled'));
        console.log('');
      }

      await showWorkflowMenu(showMainMenu);
    } else {
      showError('No workflow.json found.');
      await promptContinue();
      await showWorkflowMenu(showMainMenu);
    }
  }
}
