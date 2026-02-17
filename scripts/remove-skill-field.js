/**
 * Remove skill field from all steps
 */

const fs = require('fs');
const path = require('path');

const workflowPath = path.join(__dirname, '../src/config/workflow.json');
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));

let removedCount = 0;

for (const phase of workflow.phases) {
  for (const step of phase.steps) {
    if (step.skill) {
      delete step.skill;
      removedCount++;
    }
  }
}

fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2), 'utf-8');

console.log(`✓ Removed skill field from ${removedCount} steps`);
