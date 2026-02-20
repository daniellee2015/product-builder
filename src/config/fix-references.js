#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const workflowPath = path.join(__dirname, 'workflow.json');
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

// Build a mapping of all step IDs for fuzzy matching
const allStepIds = new Set();
const stepIdsByPrefix = {};

for (const module of Object.values(workflow.phase_registry)) {
  for (const step of module.steps) {
    allStepIds.add(step.id);

    // Extract prefix (e.g., "P1-CONVERT" from "P1-CONVERT_REQUIREMENTS_TO_OPENSPEC")
    const parts = step.id.split('_');
    const prefix = parts[0];
    if (!stepIdsByPrefix[prefix]) stepIdsByPrefix[prefix] = [];
    stepIdsByPrefix[prefix].push(step.id);
  }
}

// Function to find best match for a short ID
function findBestMatch(shortId) {
  // Direct match
  if (allStepIds.has(shortId)) return shortId;

  // Try to find a step ID that starts with the short ID
  for (const fullId of allStepIds) {
    if (fullId.startsWith(shortId + '_') || fullId.startsWith(shortId)) {
      return fullId;
    }
  }

  return null;
}

let fixCount = 0;

// Fix group references
for (const [moduleName, module] of Object.entries(workflow.phase_registry)) {
  if (!module.groups) continue;

  const localStepIds = new Set(module.steps.map(s => s.id));

  for (const group of module.groups) {
    if (!group.step_ids) continue;

    for (let i = 0; i < group.step_ids.length; i++) {
      const stepId = group.step_ids[i];

      if (!localStepIds.has(stepId)) {
        // Try to find the correct ID
        const bestMatch = findBestMatch(stepId);

        if (bestMatch && localStepIds.has(bestMatch)) {
          console.log(`Fixing: ${stepId} → ${bestMatch} in ${moduleName}.groups["${group.name}"]`);
          group.step_ids[i] = bestMatch;
          fixCount++;
        } else {
          console.log(`⚠️  Cannot find match for: ${stepId} in ${moduleName}.groups["${group.name}"]`);
        }
      }
    }
  }
}

// Write back
if (fixCount > 0) {
  fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2) + '\n');
  console.log(`\n✅ Fixed ${fixCount} references`);
} else {
  console.log('\n✅ No fixes needed');
}
