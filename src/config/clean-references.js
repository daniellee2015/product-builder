#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const workflowPath = path.join(__dirname, 'workflow.json');
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

let removeCount = 0;

// Clean up invalid group references
for (const [moduleName, module] of Object.entries(workflow.phase_registry)) {
  if (!module.groups) continue;

  const localStepIds = new Set(module.steps.map(s => s.id));

  for (const group of module.groups) {
    if (!group.step_ids) continue;

    const validStepIds = [];
    const removedStepIds = [];

    for (const stepId of group.step_ids) {
      if (localStepIds.has(stepId)) {
        validStepIds.push(stepId);
      } else {
        removedStepIds.push(stepId);
        removeCount++;
      }
    }

    if (removedStepIds.length > 0) {
      console.log(`Removing from ${moduleName}.groups["${group.name}"]:`);
      removedStepIds.forEach(id => console.log(`  - ${id}`));
      group.step_ids = validStepIds;
    }
  }
}

// Write back
if (removeCount > 0) {
  fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2) + '\n');
  console.log(`\n✅ Removed ${removeCount} invalid references`);
} else {
  console.log('\n✅ No invalid references found');
}
