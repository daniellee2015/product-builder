/**
 * Update all Chinese descriptions to English
 */

const fs = require('fs');
const path = require('path');

const workflowPath = path.join(__dirname, '../src/config/workflow.json');
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));

// Translation map for Phase 0 steps
const phase0Descriptions = {
  'P0-01': 'Extract scope, constraints, and acceptance hints from user input',
  'P0-02': 'Determine whether requirement is brief (one sentence) or detailed (with planning)',
  'P0-03': 'Ask about target users, core problems, key features, and constraints',
  'P0-04': 'Expand brief requirement into detailed description',
  'P0-05': 'Use web_search and context7 to find competitors',
  'P0-06': 'Analyze feature comparison, pricing, user reviews, and market positioning',
  'P0-07': 'Determine differentiation advantages and target market',
  'P0-08': 'Break down core features and sub-features',
  'P0-09': 'Generate user stories and usage scenarios',
  'P0-10': 'Evaluate tech stack, dependencies, and risks',
  'P0-11': 'Integrate all analysis results into requirement MDX',
  'P0-12': 'Multi-model review with auto-repair (up to 3 attempts)'
};

// Translation map for Phase 0 description
const phase0 = workflow.phases.find(p => p.id === 'phase-0');
if (phase0) {
  phase0.description = 'From user requirements to standardized MDX requirement documents';

  // Update step descriptions
  for (const step of phase0.steps) {
    if (phase0Descriptions[step.id]) {
      step.description = phase0Descriptions[step.id];
    }
  }
}

// Translation map for group descriptions
const groupDescriptions = {
  '0.1': 'Initial requirement collection',
  '0.2': 'Market research',
  '0.3': 'Requirement analysis',
  '0.4': 'MDX generation',
  '1.1': 'Capability analysis',
  '1.2': 'OpenSpec generation',
  '1.3': 'Development specs generation',
  '2.1': 'Task loop',
  '3.1': 'Review and confirmation',
  '4.1': 'Merge and update'
};

// Update all group descriptions
for (const phase of workflow.phases) {
  if (phase.groups) {
    for (const group of phase.groups) {
      if (groupDescriptions[group.id]) {
        group.description = groupDescriptions[group.id];
      }
    }
  }
}

// Save
fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2), 'utf-8');

console.log('✓ Updated all descriptions to English');
console.log(`  Phase 0 description updated`);
console.log(`  ${Object.keys(phase0Descriptions).length} step descriptions updated`);
console.log(`  ${Object.keys(groupDescriptions).length} group descriptions updated`);
