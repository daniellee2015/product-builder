/**
 * Add step groups to Phase 0
 */

const fs = require('fs');
const path = require('path');

const workflowPath = path.join(__dirname, '../src/config/workflow.json');
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));

// Find Phase 0
const phase0 = workflow.phases.find(p => p.id === 'phase-0');

if (!phase0) {
  console.error('Phase 0 not found!');
  process.exit(1);
}

// Add groups to Phase 0
phase0.groups = [
  {
    id: '0.1',
    name: 'Initial Requirement Collection',
    description: '初始需求收集',
    steps: phase0.steps.slice(0, 4) // P0-01 to P0-04
  },
  {
    id: '0.2',
    name: 'Market Research',
    description: '市场调研',
    steps: phase0.steps.slice(4, 7) // P0-05 to P0-07
  },
  {
    id: '0.3',
    name: 'Requirement Analysis',
    description: '需求分析',
    steps: phase0.steps.slice(7, 10) // P0-08 to P0-10
  },
  {
    id: '0.4',
    name: 'MDX Generation',
    description: 'MDX 生成',
    steps: phase0.steps.slice(10, 12) // P0-11 to P0-12
  }
];

// Add groups to Phase 1
const phase1 = workflow.phases.find(p => p.id === 'phase-1');
if (phase1) {
  phase1.groups = [
    {
      id: '1.1',
      name: 'Capability Analysis',
      description: '能力分析',
      steps: phase1.steps.slice(0, 3) // P1-01 to P1-03
    },
    {
      id: '1.2',
      name: 'OpenSpec Generation',
      description: 'OpenSpec 生成',
      steps: phase1.steps.slice(3, 6) // P1-04 to P1-06
    },
    {
      id: '1.3',
      name: 'Development Specs',
      description: '开发规范生成',
      steps: phase1.steps.slice(6, 14) // P1-07 to P1-14
    }
  ];
}

// Add groups to Phase 2
const phase2 = workflow.phases.find(p => p.id === 'phase-2');
if (phase2) {
  phase2.groups = [
    {
      id: '2.1',
      name: 'Task Loop',
      description: '任务循环',
      steps: phase2.steps // All P2 steps
    }
  ];
}

// Add groups to Phase 3
const phase3 = workflow.phases.find(p => p.id === 'phase-3');
if (phase3) {
  phase3.groups = [
    {
      id: '3.1',
      name: 'Review & Confirmation',
      description: '审查与确认',
      steps: phase3.steps // All P3 steps
    }
  ];
}

// Add groups to Phase 4
const phase4 = workflow.phases.find(p => p.id === 'phase-4');
if (phase4) {
  phase4.groups = [
    {
      id: '4.1',
      name: 'Merge & Update',
      description: '合并与更新',
      steps: phase4.steps // All P4 steps
    }
  ];
}

// Save
fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2), 'utf-8');

console.log('✓ Added step groups to all phases');
console.log(`  Phase 0: ${phase0.groups.length} groups`);
console.log(`  Phase 1: ${phase1.groups.length} groups`);
console.log(`  Phase 2: ${phase2.groups.length} groups`);
console.log(`  Phase 3: ${phase3.groups.length} groups`);
console.log(`  Phase 4: ${phase4.groups.length} groups`);
