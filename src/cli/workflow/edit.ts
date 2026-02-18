/**
 * Edit Workflow Page
 * Enable/disable workflow steps
 */

import {
  menu,
  showSuccess,
  showInfo,
  generateMenuHints,
  renderSimpleHeader
} from 'cli-menu-kit';
import chalk from 'chalk';
import { WorkflowData, WorkflowStep } from '../../types/workflow';
import { saveWorkflow, isStepActive } from '../../services/workflow-service';
import i18n from '../../libs/i18n';

/**
 * Edit workflow steps
 */
export async function editWorkflow(data: WorkflowData): Promise<string> {
  const originalEnabledSteps = data.available_modes[data.mode].enabled_steps || [];

  // Header
  console.log('');
  renderSimpleHeader(i18n.t('workflow.edit.title'));
  console.log(chalk.gray(`  ${i18n.t('workflow.edit.description')}\n`));

  // Prepare table data
  const tableData: Array<Record<string, any> & { _phaseId: string; _isPhaseHeader?: boolean }> = [];
  const separators: Array<{ beforeIndex: number; label: string; description?: string }> = [];

  for (const phase of data.phases) {
    const pNum = phase.id.replace(/^phase-/, '');
    const pLabel = i18n.t('workflow.display.phaseNumber', { number: pNum });

    // Add separator for phase
    separators.push({
      beforeIndex: tableData.length,
      label: `${pLabel}: ${phase.name}`,
      description: phase.description
    });

    // Add steps
    for (const step of phase.steps) {
      const cond = step.condition
        ? i18n.t(`workflow.conditions.${step.condition}`) : '-';
      const mode = step.min_mode !== 'lite' ? `${step.min_mode}+` : '-';
      const tools = step.required_tools?.length
        ? step.required_tools.join(', ') : '-';

      tableData.push({
        id: step.id,
        name: step.name,
        condition: cond,
        mode,
        tools,
        _phaseId: phase.id
      });
    }
  }

  // Default selection based on originalEnabledSteps
  const defaultSelected = tableData
    .map((row, index) => originalEnabledSteps.includes(row.id as string) ? index : -1)
    .filter(i => i >= 0);

  // Show checkbox table
  const hints = generateMenuHints({
    hasMultipleOptions: true, allowSelectAll: true, allowInvert: true
  });

  const result = await menu.checkboxTable({
    columns: [
      { header: i18n.t('workflow.edit.colId'), key: 'id', width: 10 },
      { header: i18n.t('workflow.edit.colName'), key: 'name', width: 35 },
      { header: i18n.t('workflow.edit.colCondition'), key: 'condition', width: 22 },
      { header: i18n.t('workflow.edit.colMode'), key: 'mode', width: 12 },
      { header: i18n.t('workflow.edit.colTools'), key: 'tools', width: 18 }
    ],
    data: tableData,
    separators,
    separatorAlign: 'center',
    defaultSelected,
    allowSelectAll: true,
    allowInvert: true,
    preserveOnSelect: true
  }, hints);

  const selectedSteps = result.rows.map(row => row.id as string);

  // Check changes
  const hasChanges = JSON.stringify(selectedSteps.sort()) !== JSON.stringify(originalEnabledSteps.sort());

  if (!hasChanges) {
    console.log('');
    showInfo(i18n.t('workflow.edit.noChanges'));
    console.log('');
    return 'back';
  }

  // Show change summary and ask to save
  console.log('');
  showInfo(i18n.t('workflow.edit.changesDetected', {
    count: String(selectedSteps.length),
    original: String(originalEnabledSteps.length)
  }));
  console.log('');

  const confirmSave = await menu.booleanH(
    i18n.t('workflow.edit.confirmSave'), true
  );

  if (confirmSave) {
    // Validate selected steps
    if (selectedSteps.length === 0) {
      console.log('');
      showInfo(i18n.t('workflow.edit.noStepsSelected') || 'No steps selected. Changes not saved.');
      console.log('');
      return 'back';
    }

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

    try {
      saveWorkflow(data);
      showSuccess(i18n.t('workflow.edit.success', { count: String(selectedSteps.length) }));
    } catch (error) {
      console.log('');
      showInfo(`Failed to save workflow: ${error instanceof Error ? error.message : String(error)}`);
      console.log('');
      return 'back';
    }
  } else {
    showInfo(i18n.t('workflow.edit.cancelled'));
  }

  console.log('');
  return 'back';
}
