# 灵活 Phase 架构设计文档

## 1. 背景与问题

### 1.1 当前问题
- workflow.json 固定为 5 个 Phase（P1-P5）
- 不同模式的实际需求不同：
  - Lite: 适合 6 个 Phase
  - Standard: 适合 7 个 Phase
  - Full: 适合 8 个 Phase
- 固定结构缺乏灵活性，无法很好适应不同模式

### 1.2 设计目标
1. 支持不同模式有不同数量和类型的 Phase
2. 避免重复定义，保持单一真实来源
3. 同时支持 UI 展示和程序执行
4. 良好的扩展性，支持未来添加自定义模式
5. 平滑迁移，保持向后兼容

## 2. 方案选择

### 2.1 候选方案对比

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| 方案 1: Mode-Specific Phase Arrays | 简单直观 | 重复定义多，维护成本高 | ❌ 不推荐 |
| 方案 2: Conditional Phase Activation | 比方案 1 好 | 执行顺序隐式，难以推理 | ⚠️ 仅作为元数据 |
| 方案 3: Registry + Blueprint | 单一真实来源，清晰可维护 | 需要编译步骤 | ✅ 强烈推荐 |

### 2.2 AI 专家意见
- **Gemini**: 推荐方案 3，强调可组合性
- **Codex**: 推荐方案 3，额外提供 overrides 和继承机制

### 2.3 最终选择
**方案 3（Registry + Blueprint）+ Codex 的 overrides 机制**

## 3. 架构设计

### 3.1 核心概念

```
┌─────────────────────────────────────────────────────────────┐
│                      workflow.json                          │
├─────────────────────────────────────────────────────────────┤
│  phase_registry (定义库)                                     │
│  ├─ research: { id, name, groups, steps, execution }       │
│  ├─ planning: { ... }                                       │
│  ├─ execution: { ... }                                      │
│  └─ ...                                                     │
│                                                             │
│  modes (模式配置)                                            │
│  ├─ lite:                                                   │
│  │   ├─ pipeline: [phase_ids...]                           │
│  │   └─ overrides: { phase_id: { ... } }                   │
│  ├─ standard: { ... }                                       │
│  └─ full: { ... }                                           │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  resolveWorkflow()    │
              │  (编译器)              │
              └───────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Resolved Workflow (运行时)                      │
├─────────────────────────────────────────────────────────────┤
│  phases: [                                                  │
│    { id, name, groups, steps, execution },  // 已解析       │
│    ...                                                      │
│  ]                                                          │
│  transitions: [ ... ]  // 已验证                            │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 数据结构

```json
{
  "schema_version": "2.0",
  "workflow_id": "product-builder",
  "version": "1.4.0",

  "phase_registry": {
    "research": {
      "id": "research",
      "name": "Research",
      "description": "Research and gather requirements",
      "groups": [...],
      "steps": [...],
      "execution": {
        "mode": "sequential",
        "orchestrator": "ccb"
      }
    },
    "planning": { ... },
    "execution": { ... },
    "testing": { ... },
    "optimize": { ... },
    "review": { ... },
    "archiving": { ... }
  },

  "modes": {
    "lite": {
      "pipeline": ["intake", "planning", "execution", "testing", "review", "archiving"],
      "overrides": {
        "execution": {
          "orchestrator": "user",
          "loop_enabled": false
        }
      }
    },
    "standard": {
      "pipeline": ["research", "ideate", "planning", "execution", "optimize", "review", "archiving"],
      "overrides": {}
    },
    "full": {
      "pipeline": ["research", "ideate", "planning", "execution", "testing", "optimize", "review", "archiving"],
      "overrides": {
        "execution": {
          "orchestrator": "ralph",
          "loop_enabled": true
        }
      }
    }
  },

  "transitions": [
    {
      "from": "execution.E-18",
      "to": "execution.E-12",
      "type": "loop_internal",
      "condition": "has_more_tasks"
    }
  ]
}
```

## 4. 关键实施细节

### 4.1 Phase ID 命名策略

**当前**: P1, P2, P3, P4, P5 (固定编号)
**新结构**: research, planning, execution, testing, optimize, review, archiving (语义化)

**迁移策略**:
- 保留当前 P1-P5 的映射关系作为兼容层
- 新结构使用语义化 ID
- 编译器支持两种 ID 格式的转换

### 4.2 Step ID 命名策略

**当前**: P0-01, P2-14, P3-21 (phase_id-step_number，两位数字)
**新结构**: 保持当前格式，但 step 归属于语义化的 phase

**命名规则**:
- Step ID 格式保持不变: `P{phase_number}-{step_number}`
- 例如: P2-14, P3-21（保持向后兼容）
- 在 phase_registry 中，step 归属于对应的语义化 phase
- 完整引用: `execution.P2-14`, `review.P3-21`

**映射关系**:
- P0 → intake
- P1 → research/ideate
- P2 → execution
- P3 → review
- P4 → archiving
- 新增 phase（testing, optimize）使用新的编号

### 4.3 编译器实现

```typescript
function resolveWorkflow(workflowDef: WorkflowDefinition, mode: string): ResolvedWorkflow {
  const modeConfig = workflowDef.modes[mode];
  if (!modeConfig) {
    throw new Error(`Mode ${mode} not found`);
  }

  // 1. 解析 pipeline
  const phases = modeConfig.pipeline.map(phaseId => {
    const phaseDef = workflowDef.phase_registry[phaseId];
    if (!phaseDef) {
      throw new Error(`Phase ${phaseId} not found in registry`);
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
  validateTransitions(workflowDef.transitions, phases);

  // 4. 构建 step 索引
  const stepIndex = buildStepIndex(phases);

  return {
    phases,
    transitions: workflowDef.transitions,
    stepIndex
  };
}
```

### 4.4 验证规则

编译时验证:
1. ✅ 每个 pipeline 中的 phase_id 都存在于 registry
2. ✅ 没有悬空的 step/group 引用
3. ✅ Transition 的 from/to 都是有效的 step ID
4. ✅ 必需的 phase 存在（如 review, archiving）
5. ✅ 没有循环依赖（除了明确标记为 loop 的 transition）
6. ✅ Override 的字段都是允许的字段

运行时验证:
1. ✅ Step 的前置条件满足
2. ✅ Transition 的条件表达式有效
3. ✅ 资源约束满足

### 4.5 向后兼容策略

**阶段 1: 双格式支持**
- 同时支持旧格式（固定 phases 数组）和新格式（registry + modes）
- 编译器自动检测格式并转换

**阶段 2: 迁移期**
- UI 优先读取新格式，回退到旧格式
- 提供迁移工具将旧格式转换为新格式

**阶段 3: 弃用旧格式**
- 在兼容性窗口后（如 3 个月）弃用旧格式
- 仅支持新格式

## 5. UI 适配

### 5.1 view.ts 修改

```typescript
// 旧代码
const phases = workflow.phases;

// 新代码
const resolvedWorkflow = resolveWorkflow(workflow, currentMode);
const phases = resolvedWorkflow.phases;
```

### 5.2 edit.ts 修改

```typescript
// 旧代码
const allSteps = workflow.phases.flatMap(p => p.steps);

// 新代码
const resolvedWorkflow = resolveWorkflow(workflow, currentMode);
const allSteps = resolvedWorkflow.phases.flatMap(p => p.steps);
```

### 5.3 显示逻辑

- Phase 数量动态显示（6/7/8 个）
- Phase 名称使用语义化名称
- 进度条根据实际 phase 数量调整

## 6. 未来扩展

### 6.1 自定义模式

支持基于继承的自定义模式:

```json
"custom_modes": {
  "team_x_fast": {
    "extends": "standard",
    "pipeline_patch": {
      "remove": ["optimize"],
      "insert_after": {
        "execution": ["testing"]
      }
    },
    "overrides": {
      "execution": {
        "loop_enabled": false
      }
    }
  }
}
```

### 6.2 动态 Phase 组合

未来可以支持更灵活的 phase 组合:
- Phase 条件激活
- Phase 并行执行
- Phase 动态插入

## 7. 实施计划

### Phase 1: 基础架构 (Week 1)
- [ ] 定义新的 JSON Schema
- [ ] 实现 `resolveWorkflow()` 编译器
- [ ] 实现验证规则
- [ ] 编写单元测试

### Phase 2: 数据迁移 (Week 2)
- [ ] 创建 phase_registry（从现有 P1-P5 提取）
- [ ] 定义 3 个模式的 pipeline
- [ ] 编写迁移脚本
- [ ] 验证迁移结果

### Phase 3: UI 适配 (Week 3)
- [ ] 修改 view.ts 使用编译后的 workflow
- [ ] 修改 edit.ts 使用编译后的 workflow
- [ ] 调整显示逻辑（动态 phase 数量）
- [ ] 测试 UI 功能

### Phase 4: 引擎适配 (Week 4)
- [ ] 修改 workflow 执行引擎
- [ ] 支持动态 phase 执行
- [ ] 测试执行逻辑
- [ ] 性能优化

### Phase 5: 测试与文档 (Week 5)
- [ ] 集成测试
- [ ] 性能测试
- [ ] 更新用户文档
- [ ] 发布 Release Notes

## 8. 风险与缓解

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 向后兼容性问题 | 高 | 中 | 双格式支持，渐进式迁移 |
| 编译器性能问题 | 中 | 低 | 缓存编译结果 |
| UI 显示错误 | 中 | 中 | 充分测试，回退机制 |
| 数据迁移失败 | 高 | 低 | 备份，验证，回滚计划 |

## 9. 成功指标

1. ✅ 3 个模式都能正确显示对应数量的 Phase
2. ✅ 所有现有功能正常工作
3. ✅ 编译时间 < 100ms
4. ✅ 无向后兼容性问题
5. ✅ 代码覆盖率 > 80%

## 10. 参考资料

- Gemini 建议: /tmp/ai_consensus.md
- Codex 建议: (见上文)
- 当前 workflow.json: /Users/danlio/Repositories/product-builder/src/config/workflow.json
