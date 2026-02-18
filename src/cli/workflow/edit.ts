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

  // Build checkbox options
  const allSteps: Array<{
    id: string; phaseId: string;
    enabled: boolean; isPhaseHeader: boolean;
  }> = [];
  const options: string[] = [];
  const cw = { cb: 4, id: 10, name: 35, cond: 22, mode: 12, tools: 18 };

  // Table header
  const th =
    ''.padEnd(cw.cb) +
    chalk.cyan.bold(i18n.t('workflow.edit.colId').padEnd(cw.id)) +
    chalk.cyan.bold(i18n.t('workflow.edit.colName').padEnd(cw.name)) +
    chalk.cyan.bold(i18n.t('workflow.edit.colCondition').padEnd(cw.cond)) +
    chalk.cyan.bold(i18n.t('workflow.edit.colMode').padEnd(cw.mode)) +
    chalk.cyan.bold(i18n.t('workflow.edit.colTools').padEnd(cw.tools));
  console.log(`  ${th}`);
  const tw = cw.cb + cw.id + cw.name + cw.cond + cw.mode + cw.tools;
  console.log(`  ${chalk.gray('─'.repeat(tw))}\n`);

  // Build options per phase
  for (const phase of data.phases) {
    const pNum = phase.id.replace(/^phase-/, '');
    const pLabel = i18n.t('workflow.display.phaseNumber', { number: pNum });
    options.push(chalk.cyan.bold(`${pLabel}: ${phase.name}`));
    allSteps.push({ id: '', phaseId: phase.id, enabled: false, isPhaseHeader: true });

    for (const step of phase.steps) {
      const enabled = isStepActive(step, data.mode);
      const name = step.name.length > cw.name - 3
        ? step.name.substring(0, cw.name - 6) + '...' : step.name;
      const cond = step.condition
        ? i18n.t(`workflow.conditions.${step.condition}`).substring(0, cw.cond - 3) : '-';
      const mode = step.min_mode !== 'lite' ? `${step.min_mode}+` : '-';
      const tools = step.required_tools?.length
        ? step.required_tools.join(', ').substring(0, cw.tools - 3) : '-';

      options.push(
        step.id.padEnd(cw.id) + name.padEnd(cw.name) +
        chalk.gray(cond.padEnd(cw.cond)) +
        chalk.gray(mode.padEnd(cw.mode)) +
        chalk.gray(tools.padEnd(cw.tools))
      );
      allSteps.push({ id: step.id, phaseId: phase.id, enabled, isPhaseHeader: false });
    }
  }

  // Default selection
  const defaultSelected: number[] = [];
  allSteps.forEach((s, i) => {
    if (!s.isPhaseHeader && s.enabled && s.id) defaultSelected.push(i);
  });

  // Show checkbox with hints
  const hints = generateMenuHints({
    hasMultipleOptions: true, allowSelectAll: true, allowInvert: true
  });
  const checkboxResult = await menu.checkbox({
    options, preserveOnSelect: true, defaultSelected
  }, hints);

  // Expand phase selections
  const indices = new Set(checkboxResult.indices);
  const expanded = new Set<number>();
  for (let i = 0; i < allSteps.length; i++) {
    const s = allSteps[i];
    if (s.isPhaseHeader && indices.has(i)) {
      for (let j = i + 1; j < allSteps.length; j++) {
        if (allSteps[j].isPhaseHeader) break;
        if (allSteps[j].phaseId === s.phaseId && allSteps[j].id) expanded.add(j);
      }
    } else if (!s.isPhaseHeader && indices.has(i) && s.id) {
      expanded.add(i);
    }
  }

  const selectedSteps = Array.from(expanded)
    .map(i => allSteps[i]).filter(s => !s.isPhaseHeader && s.id)
    .map(s => s.id);

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
  } else {
    showInfo(i18n.t('workflow.edit.cancelled'));
  }

  console.log('');
  return 'back';
}
