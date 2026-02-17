/**
 * Rebuild Phase 0 with complete 12-step workflow
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

// Rebuild Phase 0 with complete 12 steps
phase0.steps = [
  // 0.1 Initial Requirement Collection
  {
    id: 'P0-01',
    name: 'Collect User Requirement',
    description: '收集用户需求：从用户对话/文本/文档中提取原始需求',
    input: ['user_input.raw'],
    output: ['exports/jobs/{job_id}/source/raw-requirement.txt'],
    min_mode: 'lite'
  },
  {
    id: 'P0-02',
    name: 'Detect Requirement Type',
    description: '检测需求类型：判断是简短需求（一句话）还是详细需求（已有规划）',
    input: ['exports/jobs/{job_id}/source/raw-requirement.txt'],
    output: ['exports/jobs/{job_id}/parsed/requirement-type.json'],
    min_mode: 'lite'
  },
  {
    id: 'P0-03',
    name: 'Requirement Clarification',
    description: '需求澄清：询问目标用户、核心问题、关键功能、约束条件',
    input: ['exports/jobs/{job_id}/source/raw-requirement.txt'],
    output: ['exports/jobs/{job_id}/parsed/clarified-requirement.md'],
    condition: '当需求简短时',
    min_mode: 'standard',
    required_tools: ['ccb']
  },
  {
    id: 'P0-04',
    name: 'Requirement Expansion',
    description: '需求扩展：将简短需求扩展为详细描述',
    input: ['exports/jobs/{job_id}/parsed/clarified-requirement.md'],
    output: ['exports/jobs/{job_id}/parsed/expanded-requirement.md'],
    condition: '当需求简短时',
    min_mode: 'standard',
    required_tools: ['ccb']
  },

  // 0.2 Market Research
  {
    id: 'P0-05',
    name: 'Competitor Research',
    description: '竞品研究：使用 web_search 和 context7 查找竞品',
    input: ['exports/jobs/{job_id}/parsed/expanded-requirement.md'],
    output: ['exports/jobs/{job_id}/analysis/competitor-list.json'],
    min_mode: 'standard',
    required_tools: ['ccb'],
    optional_tools: ['web_search', 'context7']
  },
  {
    id: 'P0-06',
    name: 'Competitor Analysis',
    description: '竞品分析：分析功能对比、定价、用户评价、市场定位',
    input: ['exports/jobs/{job_id}/analysis/competitor-list.json'],
    output: ['exports/jobs/{job_id}/analysis/competitor-analysis.md'],
    min_mode: 'standard',
    required_tools: ['ccb']
  },
  {
    id: 'P0-07',
    name: 'Market Positioning',
    description: '市场定位：确定差异化优势和目标市场',
    input: ['exports/jobs/{job_id}/analysis/competitor-analysis.md'],
    output: ['exports/jobs/{job_id}/analysis/market-positioning.md'],
    min_mode: 'full',
    required_tools: ['ccb']
  },

  // 0.3 Requirement Analysis
  {
    id: 'P0-08',
    name: 'Feature Breakdown',
    description: '功能拆解：拆解核心功能和子功能',
    input: ['exports/jobs/{job_id}/parsed/expanded-requirement.md'],
    output: ['exports/jobs/{job_id}/analysis/feature-breakdown.json'],
    min_mode: 'lite',
    required_tools: ['ccb']
  },
  {
    id: 'P0-09',
    name: 'User Story Generation',
    description: '用户故事生成：生成用户故事和使用场景',
    input: ['exports/jobs/{job_id}/analysis/feature-breakdown.json'],
    output: ['exports/jobs/{job_id}/analysis/user-stories.md'],
    min_mode: 'standard',
    required_tools: ['ccb']
  },
  {
    id: 'P0-10',
    name: 'Technical Feasibility Analysis',
    description: '技术可行性分析：评估技术栈、依赖、风险',
    input: ['exports/jobs/{job_id}/analysis/feature-breakdown.json'],
    output: ['exports/jobs/{job_id}/analysis/feasibility-analysis.md'],
    min_mode: 'standard',
    required_tools: ['ccb']
  },

  // 0.4 MDX Generation
  {
    id: 'P0-11',
    name: 'Generate Requirement MDX',
    description: '生成需求 MDX：整合所有分析结果',
    input: [
      'exports/jobs/{job_id}/analysis/feature-breakdown.json',
      'exports/jobs/{job_id}/analysis/user-stories.md',
      'exports/jobs/{job_id}/analysis/feasibility-analysis.md'
    ],
    output: ['exports/jobs/{job_id}/source/requirement.mdx'],
    min_mode: 'lite',
    required_tools: ['ccb']
  },
  {
    id: 'P0-12',
    name: 'Review Requirement MDX',
    description: '审查需求 MDX：多模型审查 + 自动修复（最多 3 次）',
    input: ['exports/jobs/{job_id}/source/requirement.mdx'],
    output: [
      'exports/jobs/{job_id}/source/requirement.mdx',
      'exports/jobs/{job_id}/reviews/requirement-review.json'
    ],
    min_mode: 'standard',
    required_tools: ['ccb', 'cca'],
    review_config: {
      models: ['gemini', 'claude', 'codex'],
      pass_threshold: 0.75,
      max_critical: 0,
      max_medium: 2,
      auto_repair: {
        enabled: true,
        max_attempts: 3,
        ask_user_on_exhausted: true
      }
    }
  }
];

// Update Phase 0 description
phase0.name = 'Requirement Research & Analysis';
phase0.description = 'From user requirements to standardized MDX requirement documents';

// Recalculate enabled_steps for each mode
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

workflow.available_modes.lite.enabled_steps = liteSteps;
workflow.available_modes.standard.enabled_steps = standardSteps;
workflow.available_modes.full.enabled_steps = fullSteps;

// Update step counts
workflow.available_modes.lite.steps = liteSteps.length;
workflow.available_modes.standard.steps = standardSteps.length;
workflow.available_modes.full.steps = fullSteps.length;

// Save
fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2), 'utf-8');

console.log('✓ Phase 0 rebuilt with 12 steps');
console.log(`  Lite mode: ${liteSteps.length} steps`);
console.log(`  Standard mode: ${standardSteps.length} steps`);
console.log(`  Full mode: ${fullSteps.length} steps`);
