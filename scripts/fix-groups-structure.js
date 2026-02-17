#!/usr/bin/env node

/**
 * Fix groups structure to only store step_ids instead of full step definitions
 * This eliminates data redundancy
 */

const fs = require('fs');
const path = require('path');

const workflowPath = path.join(__dirname, '../src/config/workflow.json');
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));

console.log('Fixing groups structure...\n');

// Process each phase
for (const phase of workflow.phases) {
  if (!phase.groups || phase.groups.length === 0) {
    console.log(`Phase ${phase.id}: No groups to process`);
    continue;
  }

  console.log(`Phase ${phase.id}: Processing ${phase.groups.length} groups`);

  // Transform each group
  for (const group of phase.groups) {
    if (group.steps && Array.isArray(group.steps)) {
      // Extract step IDs from full step definitions
      const stepIds = group.steps.map(step => step.id);

      // Replace steps array with step_ids array
      group.step_ids = stepIds;
      delete group.steps;

      console.log(`  Group ${group.id}: Converted ${stepIds.length} steps to step_ids`);
    } else if (group.step_ids) {
      console.log(`  Group ${group.id}: Already using step_ids`);
    }
  }
}

// Write back to file
fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2) + '\n', 'utf-8');

console.log('\n✓ Groups structure fixed successfully!');
console.log('Groups now only store step_ids, eliminating data redundancy.');
