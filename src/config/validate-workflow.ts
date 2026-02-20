#!/usr/bin/env ts-node
/**
 * Comprehensive workflow validation script
 * Checks data integrity, references, and consistency
 */

import * as fs from 'fs';
import * as path from 'path';

const WORKFLOW_FILE = path.join(__dirname, 'workflow.json');

interface ValidationError {
  severity: 'error' | 'warning';
  category: string;
  message: string;
  details?: any;
}

const errors: ValidationError[] = [];

function addError(severity: 'error' | 'warning', category: string, message: string, details?: any) {
  errors.push({ severity, category, message, details });
}

console.log('🔍 Validating workflow.json...\n');

// Load workflow
const workflow = JSON.parse(fs.readFileSync(WORKFLOW_FILE, 'utf8'));

// 1. Validate display_id uniqueness and sequence in phases array
console.log('1️⃣  Checking display_id uniqueness and sequence in phases array...');
const displayIdMap = new Map<string, string[]>();

// Check phases array only (not phase_registry)
const phases = workflow.phases || [];
for (const phase of phases) {
  for (const step of phase.steps) {
    const displayId = step.display_id;
    if (!displayId) {
      addError('error', 'display_id', `Step ${step.id} in phase ${phase.id} has no display_id`);
      continue;
    }

    if (!displayIdMap.has(displayId)) {
      displayIdMap.set(displayId, []);
    }
    displayIdMap.get(displayId)!.push(`${phase.id}:${step.id}`);
  }
}

// Check for duplicates
for (const [displayId, locations] of displayIdMap.entries()) {
  if (locations.length > 1) {
    addError('error', 'display_id', `Duplicate display_id ${displayId}`, locations);
  }
}

// Check sequence within each phase
const phaseGroups = new Map<string, string[]>();
for (const [displayId] of displayIdMap.entries()) {
  const match = displayId.match(/^P(\d+)-(\d+)$/);
  if (!match) {
    addError('warning', 'display_id', `Invalid display_id format: ${displayId}`);
    continue;
  }
  const phaseNum = match[1];
  if (!phaseGroups.has(phaseNum)) {
    phaseGroups.set(phaseNum, []);
  }
  phaseGroups.get(phaseNum)!.push(displayId);
}

for (const [phaseNum, displayIds] of phaseGroups.entries()) {
  const sorted = displayIds.sort();
  for (let i = 0; i < sorted.length; i++) {
    const expected = `P${phaseNum}-${String(i + 1).padStart(2, '0')}`;
    if (sorted[i] !== expected) {
      addError('error', 'display_id', `Phase ${phaseNum} has non-sequential display_id: expected ${expected}, got ${sorted[i]}`);
    }
  }
}

console.log(`  ✓ Checked ${displayIdMap.size} display_ids in phases array`);

// 2. Validate step ID existence
console.log('\n2️⃣  Building step ID registry...');
const allStepIds = new Set<string>();
for (const [moduleName, module] of Object.entries(workflow.phase_registry)) {
  for (const step of (module as any).steps) {
    allStepIds.add(step.id);
  }
}
console.log(`  ✓ Found ${allStepIds.size} unique step IDs`);

// 3. Validate enabled_steps references
console.log('\n3️⃣  Checking enabled_steps references...');
for (const [modeName, modeConfig] of Object.entries(workflow.available_modes)) {
  const enabledSteps = (modeConfig as any).enabled_steps || [];
  for (const stepId of enabledSteps) {
    if (!allStepIds.has(stepId)) {
      addError('error', 'enabled_steps', `Mode "${modeName}" references non-existent step: ${stepId}`);
    }
  }
  console.log(`  ✓ Mode "${modeName}": ${enabledSteps.length} steps`);
}

// 4. Validate transitions references
console.log('\n4️⃣  Checking transitions references...');
const transitions = workflow.transitions || [];
for (const transition of transitions) {
  // Allow special "END" and "START" markers
  if (transition.from && transition.from !== 'END' && transition.from !== 'START' && !allStepIds.has(transition.from)) {
    addError('error', 'transitions', `Transition references non-existent from step: ${transition.from}`);
  }
  if (transition.to && transition.to !== 'END' && transition.to !== 'START' && !allStepIds.has(transition.to)) {
    addError('error', 'transitions', `Transition references non-existent to step: ${transition.to}`);
  }
}
console.log(`  ✓ Checked ${transitions.length} transitions`);

// 5. Validate groups references (FIXED: use step_ids instead of steps)
console.log('\n5️⃣  Checking groups references...');
let totalGroups = 0;
for (const [moduleName, module] of Object.entries(workflow.phase_registry)) {
  const groups = (module as any).groups || [];
  totalGroups += groups.length;
  for (const group of groups) {
    const stepIds = group.step_ids || []; // Fixed: use step_ids instead of steps
    for (const stepId of stepIds) {
      if (!allStepIds.has(stepId)) {
        addError('error', 'groups', `Group "${group.id}" in module "${moduleName}" references non-existent step: ${stepId}`);
      }
    }
  }
}
console.log(`  ✓ Checked ${totalGroups} groups`);

// 6. Validate phases consistency with phase_registry
console.log('\n6️⃣  Checking phases consistency...');
for (const phase of phases) {
  for (const step of phase.steps) {
    if (!allStepIds.has(step.id)) {
      addError('error', 'phases', `Phase "${phase.id}" contains non-existent step: ${step.id}`);
    }

    // Verify step exists in phase_registry
    let foundInRegistry = false;
    for (const [moduleName, module] of Object.entries(workflow.phase_registry)) {
      const registryStep = (module as any).steps.find((s: any) => s.id === step.id);
      if (registryStep) {
        foundInRegistry = true;
        break;
      }
    }

    if (!foundInRegistry) {
      addError('warning', 'phases', `Step ${step.id} in phases not found in phase_registry`);
    }
  }
}
console.log(`  ✓ Checked ${phases.length} phases`);

// 7. Validate pipeline references
console.log('\n7️⃣  Checking pipeline references...');
for (const [modeName, modeConfig] of Object.entries(workflow.available_modes)) {
  const pipeline = (modeConfig as any).pipeline || [];
  for (const moduleName of pipeline) {
    if (!workflow.phase_registry[moduleName]) {
      addError('error', 'pipeline', `Mode "${modeName}" pipeline references non-existent module: ${moduleName}`);
    }
  }
}
console.log('  ✓ Checked pipeline references');

// 8. Validate enabled_steps belong to pipeline modules (HIGH PRIORITY)
console.log('\n8️⃣  Checking enabled_steps belong to pipeline modules...');
for (const [modeName, modeConfig] of Object.entries(workflow.available_modes)) {
  const pipeline = (modeConfig as any).pipeline || [];
  const enabledSteps = (modeConfig as any).enabled_steps || [];

  // Collect all step IDs from pipeline modules
  const pipelineStepIds = new Set<string>();
  for (const moduleName of pipeline) {
    const module = workflow.phase_registry[moduleName];
    if (module) {
      for (const step of (module as any).steps) {
        pipelineStepIds.add(step.id);
      }
    }
  }

  // Check each enabled step belongs to pipeline
  for (const stepId of enabledSteps) {
    if (!pipelineStepIds.has(stepId)) {
      addError('error', 'enabled_steps', `Mode "${modeName}" enabled_steps contains "${stepId}" which is not in any pipeline module (pipeline: ${pipeline.join(', ')})`);
    }
  }
}
console.log('  ✓ Checked enabled_steps pipeline membership');
// Print results
console.log('\n' + '='.repeat(60));
console.log('📊 Validation Results\n');

const errorCount = errors.filter(e => e.severity === 'error').length;
const warningCount = errors.filter(e => e.severity === 'warning').length;

if (errors.length === 0) {
  console.log('✅ All checks passed! No issues found.\n');
  process.exit(0);
} else {
  console.log(`❌ Found ${errorCount} errors and ${warningCount} warnings:\n`);

  // Group by category
  const byCategory = new Map<string, ValidationError[]>();
  for (const error of errors) {
    if (!byCategory.has(error.category)) {
      byCategory.set(error.category, []);
    }
    byCategory.get(error.category)!.push(error);
  }

  for (const [category, categoryErrors] of byCategory.entries()) {
    console.log(`\n📁 ${category.toUpperCase()}`);
    for (const error of categoryErrors) {
      const icon = error.severity === 'error' ? '❌' : '⚠️ ';
      console.log(`  ${icon} ${error.message}`);
      if (error.details) {
        console.log(`     Details: ${JSON.stringify(error.details, null, 2)}`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  process.exit(errorCount > 0 ? 1 : 0);
}
