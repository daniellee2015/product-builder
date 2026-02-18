/**
 * Workflow data service
 * Handles loading, saving, and querying workflow configuration
 */

import fs from 'fs';
import path from 'path';
import { WorkflowData, WorkflowStep, WorkflowMode, CustomWorkflowConfig } from '../types/workflow';
import { getConfigDir } from '../cli/checkers';

const MODE_ORDER: WorkflowMode[] = ['lite', 'standard', 'full'];

function getWorkflowPath(): string {
  return path.join(__dirname, '../config/workflow.json');
}

export function loadWorkflow(): WorkflowData | null {
  try {
    const data = JSON.parse(fs.readFileSync(getWorkflowPath(), 'utf-8'));

    // Load current custom workflow if exists
    const currentCustom = loadCurrentCustomWorkflow();
    if (currentCustom) {
      // Add custom mode to available_modes
      data.available_modes['custom'] = {
        label: 'Custom',
        required_tools: data.available_modes[currentCustom.base_mode]?.required_tools || [],
        enabled_steps: currentCustom.enabled_steps,
        description: currentCustom.description,
        steps: currentCustom.enabled_steps.length,
        review_gates: 0,
        is_custom: true,
        base_mode: currentCustom.base_mode
      };

      // If current mode is custom, keep it; otherwise use the mode from workflow.json
      if (data.mode === 'custom' || data.available_modes[data.mode]?.is_custom) {
        data.mode = 'custom';
      }
    }

    return data;
  } catch {
    return null;
  }
}

export function saveWorkflow(data: WorkflowData): void {
  const workflowPath = getWorkflowPath();

  // Create backup before saving
  if (fs.existsSync(workflowPath)) {
    const backupPath = `${workflowPath}.backup`;
    fs.copyFileSync(workflowPath, backupPath);
  }

  // Validate data before saving
  if (!data.phases || data.phases.length === 0) {
    throw new Error('Invalid workflow data: no phases defined');
  }

  if (!data.available_modes || Object.keys(data.available_modes).length === 0) {
    throw new Error('Invalid workflow data: no modes defined');
  }

  // Save with pretty formatting
  fs.writeFileSync(workflowPath, JSON.stringify(data, null, 2), 'utf-8');
}

export function isStepActive(step: WorkflowStep, currentMode: WorkflowMode, data?: WorkflowData): boolean {
  // For custom modes, check enabled_steps array
  if (data && data.available_modes[currentMode]?.is_custom) {
    const customMode = data.available_modes[currentMode];
    return customMode.enabled_steps?.includes(step.id) || false;
  }

  // For standard modes, use min_mode logic
  const modeLevel = MODE_ORDER.indexOf(currentMode);
  const stepLevel = MODE_ORDER.indexOf(step.min_mode);
  return stepLevel <= modeLevel;
}

export function countActiveSteps(data: WorkflowData): number {
  return data.phases.reduce((sum, p) =>
    sum + p.steps.filter(s => isStepActive(s, data.mode, data)).length, 0);
}

export function countReviewGates(data: WorkflowData): number {
  return data.phases.reduce((sum, p) =>
    sum + p.steps.filter(s => s.review_config && isStepActive(s, data.mode, data)).length, 0);
}

export function countTotalSteps(data: WorkflowData): number {
  return data.phases.reduce((sum, p) => sum + p.steps.length, 0);
}


function getCustomWorkflowDir(): string {
  const dir = path.join(getConfigDir(), 'workflows');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Save current custom workflow (replaces previous)
 */
export function saveCurrentCustomWorkflow(data: WorkflowData, selectedSteps: string[], baseMode: WorkflowMode): void {
  const customConfig: CustomWorkflowConfig = {
    name: 'current',
    description: `Custom workflow based on ${data.available_modes[baseMode].label} mode`,
    base_mode: baseMode,
    enabled_steps: selectedSteps,
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString()
  };

  const filepath = path.join(getCustomWorkflowDir(), 'current.json');
  fs.writeFileSync(filepath, JSON.stringify(customConfig, null, 2), 'utf-8');
}

/**
 * Load current custom workflow if exists
 */
export function loadCurrentCustomWorkflow(): CustomWorkflowConfig | null {
  const filepath = path.join(getCustomWorkflowDir(), 'current.json');
  if (!fs.existsSync(filepath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch {
    return null;
  }
}

export function exportCustomWorkflow(data: WorkflowData, filename: string): string {
  const modeConfig = data.available_modes[data.mode];

  const customConfig: CustomWorkflowConfig = {
    name: filename.replace(/\.json$/, ''),
    description: `Custom workflow based on ${modeConfig.label} mode`,
    base_mode: (modeConfig.base_mode || data.mode) as WorkflowMode,
    enabled_steps: modeConfig.enabled_steps || [],
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString()
  };

  const safeName = filename.endsWith('.json') ? filename : `${filename}.json`;
  const filepath = path.join(getCustomWorkflowDir(), safeName);
  fs.writeFileSync(filepath, JSON.stringify(customConfig, null, 2), 'utf-8');

  return filepath;
}

export function importCustomWorkflow(filepath: string, data: WorkflowData): void {
  const customConfig: CustomWorkflowConfig = JSON.parse(
    fs.readFileSync(filepath, 'utf-8')
  );

  // Validate that all enabled steps exist
  const allStepIds = data.phases.flatMap(p => p.steps.map(s => s.id));
  const invalidSteps = customConfig.enabled_steps.filter(id => !allStepIds.includes(id));

  if (invalidSteps.length > 0) {
    throw new Error(`Invalid step IDs in custom workflow: ${invalidSteps.join(', ')}`);
  }

  // Create or update custom mode
  data.available_modes['custom'] = {
    label: 'Custom',
    enabled_steps: customConfig.enabled_steps,
    required_tools: [],
    description: customConfig.description || 'User-customized workflow',
    steps: customConfig.enabled_steps.length,
    review_gates: 0,
    is_custom: true,
    base_mode: customConfig.base_mode
  };

  // Switch to custom mode
  data.mode = 'custom';

  // Save the updated workflow
  saveWorkflow(data);
}

export function listCustomWorkflows(): string[] {
  const dir = getCustomWorkflowDir();
  try {
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => path.join(dir, f));
  } catch {
    return [];
  }
}

export function resetToBaseMode(data: WorkflowData, baseMode: WorkflowMode): void {
  if (baseMode === 'custom') {
    throw new Error('Cannot reset to custom mode');
  }

  // Remove custom mode if it exists
  if (data.available_modes['custom']) {
    delete data.available_modes['custom'];
  }

  // Switch to base mode
  data.mode = baseMode;

  saveWorkflow(data);
}

export { MODE_ORDER };
