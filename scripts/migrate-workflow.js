/**
 * Migration script to update workflow.json to new architecture
 * Adds enabled_steps arrays and tool dependencies
 */

const fs = require('fs');
const path = require('path');

const workflowPath = path.join(__dirname, '../src/config/workflow.json');
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));

// Step 1: Collect all step IDs by mode
const liteSteps = [];
const standardSteps = [];
const fullSteps = [];

for (const phase of workflow.phases) {
  for (const step of phase.steps) {
    fullSteps.push(step.id);

    if (step.min_mode === 'lite') {
      liteSteps.push(step.id);
      standardSteps.push(step.id);
    } else if (step.min_mode === 'standard') {
      standardSteps.push(step.id);
    }
  }
}

// Step 2: Update mode configurations with enabled_steps
workflow.available_modes.lite.enabled_steps = liteSteps;
workflow.available_modes.standard.enabled_steps = standardSteps;
workflow.available_modes.full.enabled_steps = fullSteps;

// Step 3: Add tool registry
workflow.tool_registry = {
  ccb: {
    name: 'Claude Code Bridge',
    package: '@product-builder/ccb',
    required: true,
    description: 'Multi-model collaboration bridge'
  },
  cca: {
    name: 'Cross-Claude Agent',
    package: '@product-builder/cca',
    required: true,
    description: 'Cross-model agent routing'
  },
  ralph: {
    name: 'Ralph Retry Loop',
    package: '@product-builder/ralph',
    required: false,
    description: 'Automated retry and repair loop'
  },
  openclaw: {
    name: 'OpenClaw',
    package: '@product-builder/openclaw',
    required: false,
    description: 'Advanced code analysis tool'
  }
};

// Step 4: Add tool dependencies to steps (based on review_config and step type)
for (const phase of workflow.phases) {
  for (const step of phase.steps) {
    // Steps with review_config need ccb and cca
    if (step.review_config) {
      step.required_tools = ['ccb', 'cca'];
    }

    // Add other tool dependencies based on step characteristics
    // This is a simplified mapping - can be refined later
    if (step.id.includes('Review') || step.review_config) {
      step.required_tools = step.required_tools || [];
      if (!step.required_tools.includes('ccb')) step.required_tools.push('ccb');
      if (!step.required_tools.includes('cca')) step.required_tools.push('cca');
    }
  }
}

// Step 5: Save updated workflow
fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2), 'utf-8');

console.log('✓ Workflow migration completed');
console.log(`  Lite mode: ${liteSteps.length} steps`);
console.log(`  Standard mode: ${standardSteps.length} steps`);
console.log(`  Full mode: ${fullSteps.length} steps`);
