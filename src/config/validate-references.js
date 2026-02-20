#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const workflowPath = path.join(__dirname, 'workflow.json');
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

let issueCount = 0;
const issues = [];

// Check phase_registry groups references
for (const [moduleName, module] of Object.entries(workflow.phase_registry)) {
  if (!module.groups) continue;

  const localStepIds = new Set(module.steps.map(s => s.id));

  for (const group of module.groups) {
    if (!group.step_ids) continue;

    for (const stepId of group.step_ids) {
      if (!localStepIds.has(stepId)) {
        issueCount++;
        issues.push({
          type: 'group_reference',
          module: moduleName,
          group: group.id || group.name,
          stepId,
          message: `Group "${group.name}" references step "${stepId}" which doesn't exist in module "${moduleName}"`
        });
      }
    }
  }
}

// Check enabled_steps references
for (const [modeName, mode] of Object.entries(workflow.available_modes)) {
  if (!mode.enabled_steps) continue;

  // Collect all step IDs from phase_registry
  const allStepIds = new Set();
  for (const module of Object.values(workflow.phase_registry)) {
    for (const step of module.steps) {
      allStepIds.add(step.id);
    }
  }

  for (const stepId of mode.enabled_steps) {
    if (!allStepIds.has(stepId)) {
      issueCount++;
      issues.push({
        type: 'enabled_step_reference',
        mode: modeName,
        stepId,
        message: `Mode "${modeName}" enabled_steps references "${stepId}" which doesn't exist in phase_registry`
      });
    }
  }
}

// Report results
console.log(`\n=== Reference Integrity Check ===\n`);
console.log(`Total issues found: ${issueCount}\n`);

if (issueCount > 0) {
  console.log('Issues by type:\n');

  const byType = {};
  for (const issue of issues) {
    if (!byType[issue.type]) byType[issue.type] = [];
    byType[issue.type].push(issue);
  }

  for (const [type, typeIssues] of Object.entries(byType)) {
    console.log(`${type}: ${typeIssues.length} issues`);
    for (const issue of typeIssues.slice(0, 5)) {
      console.log(`  - ${issue.message}`);
    }
    if (typeIssues.length > 5) {
      console.log(`  ... and ${typeIssues.length - 5} more`);
    }
    console.log('');
  }

  process.exit(1);
} else {
  console.log('✅ All references are valid!\n');
  process.exit(0);
}
