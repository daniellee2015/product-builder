#!/usr/bin/env ts-node
/**
 * Build workflow.json from modular source files
 *
 * This script:
 * 1. Reads all source files from workflow-source/
 * 2. Assembles them into a complete workflow structure
 * 3. Auto-generates the phases array from phase_registry
 * 4. Validates the structure
 * 5. Writes workflow.json
 *
 * Usage: npm run build:workflow
 */

import * as fs from 'fs';
import * as path from 'path';

interface WorkflowModule {
  steps: any[];
  groups?: any[];
}

interface PhaseDefinition {
  id: string;
  name: string;
  modules: string[];
  execution: { mode: string };
}

const CONFIG_DIR = __dirname;
const SOURCE_DIR = path.join(CONFIG_DIR, 'workflow-source');
const OUTPUT_FILE = path.join(CONFIG_DIR, 'workflow.json');

console.log('🔨 Building workflow.json from source files...\n');

// 1. Read metadata
console.log('📖 Reading metadata...');
const metadata = JSON.parse(
  fs.readFileSync(path.join(SOURCE_DIR, 'metadata.json'), 'utf8')
);

// 2. Read modes
console.log('📖 Reading modes...');
const modesData = JSON.parse(
  fs.readFileSync(path.join(SOURCE_DIR, 'modes.json'), 'utf8')
);

// 3. Read transitions
console.log('📖 Reading transitions...');
const transitionsData = JSON.parse(
  fs.readFileSync(path.join(SOURCE_DIR, 'transitions.json'), 'utf8')
);

// 4. Read all modules
console.log('📖 Reading phase_registry modules...');
const modulesDir = path.join(SOURCE_DIR, 'modules');
const moduleFiles = fs.readdirSync(modulesDir).filter(f => f.endsWith('.json'));
const phase_registry: Record<string, WorkflowModule> = {};

for (const file of moduleFiles) {
  const moduleName = path.basename(file, '.json');
  const moduleData = JSON.parse(
    fs.readFileSync(path.join(modulesDir, file), 'utf8')
  );

  // Remove display_id from source steps (will be generated in phases array)
  if (moduleData.steps) {
    moduleData.steps = moduleData.steps.map((step: any) => {
      const { display_id, ...stepWithoutDisplayId } = step;
      return stepWithoutDisplayId;
    });
  }

  phase_registry[moduleName] = moduleData;
  console.log(`  ✓ ${moduleName}`);
}

// 5. Auto-generate phases array from current mode's pipeline
console.log('\n🔄 Auto-generating phases array from current mode pipeline...');

const currentMode = metadata.mode;
const currentModeConfig = modesData.available_modes[currentMode];

if (!currentModeConfig || !currentModeConfig.pipeline) {
  console.error(`❌ Error: Mode "${currentMode}" not found or has no pipeline`);
  process.exit(1);
}

const pipeline = currentModeConfig.pipeline;
const enabledStepsSet = new Set(currentModeConfig.enabled_steps);
console.log(`Current mode: ${currentMode}`);
console.log(`Pipeline: ${pipeline.join(' → ')}`);
console.log(`Enabled steps: ${currentModeConfig.enabled_steps.length}`);

// Phase name mapping
const phaseNames: Record<string, string> = {
  'intake': 'Requirement Intake',
  'research': 'Requirement Research & Analysis',
  'ideate': 'Ideation',
  'planning_lite': 'Planning (Lite)',
  'planning_standard': 'Planning (Standard)',
  'planning': 'Planning',
  'execution_lite': 'Execution (Lite)',
  'execution_standard': 'Execution (Standard)',
  'execution': 'Execution',
  'testing_lite': 'Testing (Lite)',
  'testing': 'Testing',
  'optimize': 'Optimization',
  'review_lite': 'Review (Lite)',
  'review': 'Review',
  'archiving_lite': 'Archiving (Lite)',
  'archiving': 'Archiving'
};

const phases = pipeline.map((moduleName: string, index: number) => {
  const module = phase_registry[moduleName];
  if (!module) {
    console.error(`❌ Error: Module "${moduleName}" not found in phase_registry`);
    process.exit(1);
  }

  // Filter steps by current mode's enabled_steps
  const filteredSteps = module.steps.filter((step: any) =>
    enabledStepsSet.has(step.id)
  );

  // Auto-generate display_id for each step in this phase
  const stepsWithDisplayId = filteredSteps.map((step: any, stepIndex: number) => {
    const displayId = `P${index}-${String(stepIndex + 1).padStart(2, '0')}`;
    return {
      ...step,
      display_id: displayId
    };
  });

  const phase: any = {
    id: `phase-${index}`,
    name: phaseNames[moduleName] || moduleName,
    steps: stepsWithDisplayId,
    groups: module.groups ? [...module.groups] : [],
    execution: { mode: 'sequential' }
  };

  console.log(`  ✓ ${phase.id}: ${phase.name} (${phase.steps.length} steps, ${phase.groups.length} groups)`);
  return phase;
});

// 6. Assemble complete workflow
console.log('\n🔧 Assembling workflow...');
const workflow = {
  ...metadata,
  ...modesData,
  phase_registry,
  ...transitionsData,
  phases
};

// 7. Validate structure
console.log('\n✅ Validating structure...');
let isValid = true;

// Check that all enabled_steps exist in phase_registry
for (const [modeName, modeConfig] of Object.entries(workflow.available_modes) as any) {
  const enabledSteps = modeConfig.enabled_steps || [];
  const allSteps = new Set<string>();

  for (const module of Object.values(phase_registry)) {
    module.steps.forEach((step: any) => allSteps.add(step.id));
  }

  const missingSteps = enabledSteps.filter((stepId: string) => !allSteps.has(stepId));
  if (missingSteps.length > 0) {
    console.error(`  ❌ Mode "${modeName}" references missing steps: ${missingSteps.join(', ')}`);
    isValid = false;
  } else {
    console.log(`  ✓ Mode "${modeName}": ${enabledSteps.length} steps validated`);
  }
}

if (!isValid) {
  console.error('\n❌ Validation failed! Please fix errors before building.');
  process.exit(1);
}

// 8. Write output
console.log('\n💾 Writing workflow.json...');
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(workflow, null, 2), 'utf8');

const stats = fs.statSync(OUTPUT_FILE);
console.log(`  ✓ Written: ${(stats.size / 1024).toFixed(1)} KB`);

console.log('\n✨ Build complete!\n');
console.log('Source files:');
console.log(`  - workflow-source/metadata.json`);
console.log(`  - workflow-source/modes.json`);
console.log(`  - workflow-source/transitions.json`);
console.log(`  - workflow-source/modules/ (${moduleFiles.length} files)`);
console.log('\nGenerated:');
console.log(`  - workflow.json (${phases.length} phases, ${Object.keys(phase_registry).length} modules)`);

