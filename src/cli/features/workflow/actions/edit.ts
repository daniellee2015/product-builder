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
import { WorkflowData, WorkflowStep } from '../../../../types/workflow';
import { saveCurrentCustomWorkflow } from '../../../../services/workflow-service';
import i18n from '../../../../libs/i18n';

/**
 * Edit workflow steps
 */
export async function editWorkflow(data: WorkflowData): Promise<string> {
  // Get base mode (if current mode is custom, use its base_mode)
  const currentModeConfig = data.available_modes[data.mode];
  const baseMode = currentModeConfig?.base_mode || data.mode;
  const originalEnabledSteps = currentModeConfig?.enabled_steps || data.available_modes[baseMode].enabled_steps || [];

  // Header
  console.log('');
  renderSimpleHeader(i18n.t('workflow.edit.title'));
  console.log(chalk.gray(`  ${i18n.t('workflow.edit.description')}\n`));

  // Build step list from full mode's phases (to show all 8 phases)
  // This allows users to see the complete workflow structure
  const fullModeConfig = data.available_modes['full'];
  const fullPipeline = fullModeConfig.pipeline || [];
  
  // Build phases from full mode's pipeline
  const tableData: Array<Record<string, any> & { _phaseId: string; _isPhaseHeader?: boolean }> = [];
  const separators: Array<{ beforeIndex: number; label: string; description?: string }> = [];
  
  // Phase name mapping
  const phaseNames: Record<string, string> = {
    'intake': 'Requirement Intake',
    'research': 'Requirement Research & Analysis',
    'ideate': 'Ideation',
    'planning_lite': 'Planning (Lite)',
    'planning_standard': 'Planning (Standard)',
    'planning': 'Planning',
    'execution_lite': 'Execution (Lite)',
    'execution_standard': 'Execution (Standard)',
    'execution': 'Execution',
    'testing_lite': 'Testing (Lite)',
    'testing': 'Testing',
    'optimize': 'Optimization',
    'review_lite': 'Review (Lite)',
    'review': 'Review',
    'archiving_lite': 'Archiving (Lite)',
    'archiving': 'Archiving'
  };

  const seenStepIds = new Set<string>();

  fullPipeline.forEach((moduleName: string, phaseIndex: number) => {
    const module = data.phase_registry[moduleName];
    if (!module) return;

    // Add separator for phase
    separators.push({
      beforeIndex: tableData.length,
      label: `Phase ${phaseIndex}: ${phaseNames[moduleName] || moduleName}`
    });

    // Add steps from this module
    let stepIndexInPhase = 1;
    for (const step of (module as any).steps) {
      // Skip duplicate step IDs
      if (seenStepIds.has(step.id)) {
        continue;
      }
      seenStepIds.add(step.id);

      const cond = step.condition
        ? i18n.t(`workflow.conditions.${step.condition}`) : '-';
      const mode = step.min_mode !== 'lite' ? `${step.min_mode}+` : '-';
      const tools = step.required_tools?.length
        ? step.required_tools.join(', ') : '-';

      tableData.push({
        id: step.id,
        display_id: `P${phaseIndex}-${String(stepIndexInPhase++).padStart(2, '0')}`,
        name: step.name,
        condition: cond,
        mode,
        tools,
        _phaseId: `phase-${phaseIndex}`
      });
    }
  });

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
      { header: i18n.t('workflow.edit.colId'), key: 'display_id', width: 7 },
      { header: i18n.t('workflow.edit.colName'), key: 'name', width: 35 },
      { header: i18n.t('workflow.edit.colCondition'), key: 'condition', width: 22 },
      { header: i18n.t('workflow.edit.colMode'), key: 'mode', width: 10 },
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

    try {
      // Save to user config directory (not to workflow.json)
      saveCurrentCustomWorkflow(data, selectedSteps, baseMode);
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
