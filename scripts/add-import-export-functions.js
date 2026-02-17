/**
 * Add import/export/reset functionality to workflow service and menu
 */

const fs = require('fs');
const path = require('path');

// 1. Update workflow-service.ts to add new functions
const servicePath = path.join(__dirname, '../src/services/workflow-service.ts');
let serviceContent = fs.readFileSync(servicePath, 'utf-8');

// Add imports
if (!serviceContent.includes('import os from')) {
  serviceContent = serviceContent.replace(
    "import path from 'path';",
    "import path from 'path';\nimport os from 'os';"
  );
}

if (!serviceContent.includes('CustomWorkflowConfig')) {
  serviceContent = serviceContent.replace(
    "import { WorkflowData, WorkflowStep, WorkflowMode } from '../types/workflow';",
    "import { WorkflowData, WorkflowStep, WorkflowMode, CustomWorkflowConfig } from '../types/workflow';"
  );
}

// Add helper function for custom workflow directory
const customWorkflowDirFunction = `
function getCustomWorkflowDir(): string {
  const dir = path.join(os.homedir(), '.pb', 'workflows');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}
`;

// Add export function
const exportFunction = `
export function exportCustomWorkflow(data: WorkflowData, filename: string): string {
  const modeConfig = data.available_modes[data.mode];

  const customConfig: CustomWorkflowConfig = {
    name: filename.replace(/\\.json$/, ''),
    description: \`Custom workflow based on \${modeConfig.label} mode\`,
    base_mode: (modeConfig.base_mode || data.mode) as WorkflowMode,
    enabled_steps: modeConfig.enabled_steps || [],
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString()
  };

  const filepath = path.join(getCustomWorkflowDir(), filename);
  fs.writeFileSync(filepath, JSON.stringify(customConfig, null, 2), 'utf-8');

  return filepath;
}
`;

// Add import function
const importFunction = `
export function importCustomWorkflow(filepath: string, data: WorkflowData): void {
  const customConfig: CustomWorkflowConfig = JSON.parse(
    fs.readFileSync(filepath, 'utf-8')
  );

  // Validate that all enabled steps exist
  const allStepIds = data.phases.flatMap(p => p.steps.map(s => s.id));
  const invalidSteps = customConfig.enabled_steps.filter(id => !allStepIds.includes(id));

  if (invalidSteps.length > 0) {
    throw new Error(\`Invalid step IDs in custom workflow: \${invalidSteps.join(', ')}\`);
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
`;

// Add list function
const listFunction = `
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
`;

// Add reset function
const resetFunction = `
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
`;

// Insert functions before the export statement at the end
const exportStatement = 'export { MODE_ORDER };';
const insertPoint = serviceContent.lastIndexOf(exportStatement);

if (insertPoint > 0 && !serviceContent.includes('exportCustomWorkflow')) {
  const newFunctions = customWorkflowDirFunction + exportFunction + importFunction + listFunction + resetFunction + '\n';
  serviceContent = serviceContent.slice(0, insertPoint) + newFunctions + serviceContent.slice(insertPoint);
}

fs.writeFileSync(servicePath, serviceContent, 'utf-8');

console.log('✓ Added import/export/reset functions to workflow-service.ts');
