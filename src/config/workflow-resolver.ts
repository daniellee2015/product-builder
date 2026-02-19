/**
 * Workflow Resolver - 将 workflow.json 编译为可执行的 workflow
 *
 * 支持两种格式：
 * 1. v1 格式：固定的 phases 数组
 * 2. v2 格式：phase_registry + modes.pipeline
 */

interface WorkflowDefinition {
  schema_version?: string;
  phases?: any[];
  phase_registry?: Record<string, any>;
  available_modes?: Record<string, any>;
  transitions?: any[];
  [key: string]: any;
}

interface ResolvedWorkflow {
  phases: any[];
  transitions: any[];
  stepIndex: Map<string, any>;
  mode: string;
}

/**
 * 解析 workflow 定义，返回可执行的 workflow
 */
export function resolveWorkflow(
  workflowDef: WorkflowDefinition,
  mode: string
): ResolvedWorkflow {
  // 检测格式版本
  const isV2 = workflowDef.schema_version === '2.0' && workflowDef.phase_registry;

  if (isV2) {
    return resolveWorkflowV2(workflowDef, mode);
  } else {
    return resolveWorkflowV1(workflowDef, mode);
  }
}

/**
 * 解析 v1 格式（向后兼容）
 */
function resolveWorkflowV1(
  workflowDef: WorkflowDefinition,
  mode: string
): ResolvedWorkflow {
  const phases = workflowDef.phases || [];
  const transitions = workflowDef.transitions || [];
  const stepIndex = buildStepIndex(phases);

  return {
    phases,
    transitions,
    stepIndex,
    mode
  };
}

/**
 * 解析 v2 格式（Registry + Blueprint）
 */
function resolveWorkflowV2(
  workflowDef: WorkflowDefinition,
  mode: string
): ResolvedWorkflow {
  const modeConfig = workflowDef.available_modes?.[mode];

  if (!modeConfig) {
    throw new Error(`Mode "${mode}" not found in workflow definition`);
  }

  if (!modeConfig.pipeline) {
    throw new Error(`Mode "${mode}" does not have a pipeline defined`);
  }

  // 1. 解析 pipeline
  const phases = modeConfig.pipeline.map((phaseId: string) => {
    const phaseDef = workflowDef.phase_registry?.[phaseId];

    if (!phaseDef) {
      throw new Error(`Phase "${phaseId}" not found in phase_registry`);
    }

    // 2. 应用 overrides
    const overrides = modeConfig.overrides?.[phaseId] || {};

    return {
      ...phaseDef,
      execution: {
        ...phaseDef.execution,
        ...overrides
      }
    };
  });

  // 3. 验证 transitions
  const transitions = workflowDef.transitions || [];
  validateTransitions(transitions, phases);

  // 4. 构建 step 索引
  const stepIndex = buildStepIndex(phases);

  return {
    phases,
    transitions,
    stepIndex,
    mode
  };
}

/**
 * 构建 step 索引，用于快速查找
 */
function buildStepIndex(phases: any[]): Map<string, any> {
  const index = new Map();

  phases.forEach((phase, phaseIndex) => {
    phase.steps?.forEach((step: any, stepIndex: number) => {
      index.set(step.id, {
        step,
        phase,
        phaseIndex,
        stepIndex
      });
    });
  });

  return index;
}

/**
 * 验证 transitions 的有效性
 * 只验证当前 mode 中存在的 steps 的 transitions
 */
function validateTransitions(transitions: any[], phases: any[]): void {
  const stepIndex = buildStepIndex(phases);

  transitions.forEach((transition, index) => {
    // 只验证当前 mode 中存在的 transitions
    // 如果 from step 不在当前 mode 中，跳过这个 transition
    if (!stepIndex.has(transition.from)) {
      return;  // Skip this transition
    }

    // 验证 to step 存在（允许特殊标记 "END"）
    if (transition.to !== 'END' && !stepIndex.has(transition.to)) {
      // 如果 to step 也不在当前 mode 中，这是正常的，跳过
      // 只有当 from 在但 to 不在且不是 END 时才报错
      console.warn(`Warning: Transition ${index}: "to" step "${transition.to}" not found in current mode`);
    }
  });
}

/**
 * 获取模式的 phase 数量
 */
export function getPhaseCount(
  workflowDef: WorkflowDefinition,
  mode: string
): number {
  const resolved = resolveWorkflow(workflowDef, mode);
  return resolved.phases.length;
}

/**
 * 获取模式的所有 phase IDs
 */
export function getPhaseIds(
  workflowDef: WorkflowDefinition,
  mode: string
): string[] {
  const resolved = resolveWorkflow(workflowDef, mode);
  return resolved.phases.map(p => p.id);
}
