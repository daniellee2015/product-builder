# Product Builder 架构设计（最终版）

## 日期：2026-02-25

## 核心定位

Product Builder 是一个 **AI 驱动的产品开发工作流编排工具**，定位是：
- **配置管理器**：定义标准、配置文件
- **工具集成器**：集成外部工具（ccb、cca、ralph、OpenClaw）
- **流程编排器**：编排产品开发流程

**关键理念**：
> 即使没有工作流，LLM 也可以工作，但 Product Builder 的价值在于提供**标准化的控制平面**（workflow 定义、策略、可重复性、集成、可恢复性）

## 完整架构（6 层）

```
┌──────────────────────────────────────────────────────────────┐
│ L6: Product Interface                                        │
│ - PB CLI (当前)                                              │
│ - 未来：API + Dashboard                                      │
└───────────────────────┬──────────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────────┐
│ L5: PB Control Plane (PB-owned)                              │
│ - Workflow 源管理                                            │
│ - Mode 切换（lite/standard/full）                            │
│ - 配置生成                                                   │
│ - 编译/解析 workflow 图                                      │
│ - 策略定义                                                   │
└───────────────────────┬──────────────────────────────────────┘
                        │ executable plan
┌───────────────────────▼──────────────────────────────────────┐
│ L4: Workflow Execution Kernel (PB-owned core) ⭐ 核心        │
│ - Step 调度                                                  │
│ - 条件评估（condition）                                      │
│ - Transition 分发                                            │
│ - 审批处理（requires_human_approval）                        │
│ - 重试/循环                                                  │
│ - Checkpoint/Resume                                          │
│ - Run 状态管理                                               │
└───────────────────────┬──────────────────────────────────────┘
                        │ adapter calls
┌───────────────────────▼──────────────────────────────────────┐
│ L3: Tool Adapter Layer (PB-owned wrappers)                   │
│ - ccb/cca/ralph/openclaw 适配器                              │
│ - git/gh/test/MCP 适配器                                     │
└───────────────────────┬──────────────────────────────────────┘
                        │ invokes
┌───────────────────────▼──────────────────────────────────────┐
│ L2: External Execution Engines (复用)                        │
│ - ccb（任务执行自动化）                                      │
│ - cca/CCHub（模型路由/fallback）                             │
│ - ralph（循环/重试编排，full 模式）                          │
│ - MCP servers                                                │
│ - OpenClaw（可选的上层调度器/观察者）                        │
└───────────────────────┬──────────────────────────────────────┘
                        │
┌───────────────────────▼──────────────────────────────────────┐
│ L1: Infra + Runtime                                           │
│ - Node/tmux/docker                                           │
│ - Filesystem/repos                                           │
│ - Session environment                                        │
└──────────────────────────────────────────────────────────────┘
```

## Workflow 执行器的定位

**核心问题**：Workflow 执行器是什么？

**答案**：
- 它是 Product Builder 的**核心运行时内核**（L4 层）
- 但**不是整个产品**
- 位于 workflow 定义和外部工具之间
- 负责执行语义：`condition`、`requires_human_approval`、loop transitions、mode gates

**类比**：
- Workflow 执行器 = PB 的"CPU"
- 配置 DSL + 集成 + 状态标准 = PB 的"操作系统"

**职责边界**：
- ✅ 应该做：编排、调度、条件评估、审批处理、状态管理
- ❌ 不应该做：替代 ccb/cca/ralph/openclaw 的内部逻辑
- ✅ 应该做：通过适配器调用外部工具

## 要开发什么 vs 要复用什么

### 必须自己开发（PB-owned）

1. **Workflow 编译器/验证器/运行时契约**
   - 已有基础：`src/config/workflow-resolver.ts`
   - 需要完善：运行时执行逻辑

2. **执行内核 + 状态机**
   - 当前状态：`src/orchestrator/index.ts` 是 stub
   - 需要实现：真正的执行逻辑

3. **Checkpoint/Resume 机制**
   - 保存执行进度
   - 支持从中断点恢复

4. **条件/审批/Review 策略引擎**
   - 条件评估：`condition` 字段
   - 审批处理：`requires_human_approval`
   - Review 策略：`review_config`

5. **Job/Task 领域模型**
   - Job metadata 管理
   - Task 依赖管理（blockedBy）
   - Artifact 约定（input/output 映射）

6. **适配器接口和兼容性测试**
   - 定义统一的适配器接口
   - 实现各工具的适配器
   - 编写兼容性测试

### 复用/集成（External）

1. **CCB**（任务执行自动化）
   - 用途：执行单个 step 的 LLM 任务
   - 集成方式：通过适配器调用

2. **CCA/CCHub**（模型路由/fallback）
   - 用途：多模型协作、API fallback
   - 已有：`src/cli/api-manager.ts`

3. **Ralph**（循环/重试编排）
   - 用途：full 模式的自动化循环
   - 集成方式：作为 orchestrator 选项

4. **OpenClaw**（可选）
   - 用途：上层调度器/观察者
   - 定位：可选的增强功能，不是核心依赖

5. **MCP Servers**
   - 用途：过程中需要的工具集成
   - 集成方式：通过 MCP 协议

6. **Git/GitHub CLI/测试框架**
   - 用途：版本控制、PR 管理、测试执行
   - 集成方式：通过适配器调用

### 可选的未来扩展

- 分布式队列 workers
- Web console
- 高级分析
- 跨项目调度

## 开发优先级

### P0：MVP 运行时（必须完成）

**目标**：让 Product Builder 能够执行基本的 workflow

**任务**：
1. **实现真正的执行器**
   - 替换 `src/orchestrator/index.ts` 的 stub
   - 实现基本的步骤执行逻辑

2. **支持最小语义**
   - 顺序执行 steps
   - `condition` 条件执行
   - `requires_human_approval` 审批
   - 持久化 run 状态

3. **实现核心适配器**（3-5 个）
   - `ccb` 适配器（LLM 任务执行）
   - `git` 适配器（版本控制）
   - `gh` 适配器（GitHub 操作）
   - `test` 适配器（测试执行）
   - `routing` 适配器（模型路由）

4. **添加日志和恢复**
   - 确定性运行日志
   - Checkpoint/Resume 机制

### P1：生产化（增强功能）

**目标**：支持完整的 workflow 语义

**任务**：
1. **完整的转换引擎**
   - 分支（branching）
   - 循环（loops）
   - Mode-aware transitions

2. **Review gate 处理**
   - `review_config` 支持
   - Auto-repair 循环

3. **完成 UI 流程**
   - Jobs/Tasks 管理（当前是 placeholder）
   - Arch Tools 管理（当前是 placeholder）

4. **集成测试套件**
   - Lite mode 测试
   - Standard mode 测试
   - Full mode 测试

### P2：生态扩展（可选）

**目标**：增强可观测性和扩展性

**任务**：
1. **OpenClaw 监督集成**（可选）
   - 上层调度
   - 长期记忆

2. **多运行并发控制**
   - 资源配额
   - 并发限制

3. **可观测性增强**
   - 详细的执行追踪
   - 性能分析

4. **插件 API**
   - 自定义适配器
   - 自定义步骤

## 范围守护原则

**重要**：避免范围蔓延

1. **不要重建 agent 内部逻辑**
   - PB 应该保持"编排器 + 标准化器"的定位
   - 不要替代 ccb/cca/ralph 的核心功能

2. **不要从分布式系统开始**
   - 先实现单进程确定性执行器
   - 分布式是未来的优化

3. **不要过度投资 UI**
   - 先确保运行时正确性和可恢复性
   - UI 是锦上添花

## 技术选型

### 语言
- **TypeScript**（主要）：已有的 CLI 和配置管理
- **Python**（可选）：执行器可以用 Python 实现（已有 `scripts/python/orchestrator.py`）

### 存储
- **JSON 文件**：Job/Task metadata、Run state
- **不需要数据库**：保持简单

### 工具调用
- **subprocess**：调用外部工具（ccb、git、gh）
- **HTTP**：调用 API（OpenClaw、MCP servers）

## 下一步行动

### 立即行动
1. **设计接口**：定义 `ExecutionKernel`、`StepAdapter`、`RunStateStore`、`ConditionEvaluator` 接口
2. **实现 MVP**：替换 `src/orchestrator/index.ts` 的 stub
3. **编写测试**：确保基本功能正确

### 需要讨论
- 接口设计的具体细节
- 适配器的实现方式
- 状态持久化的格式

## 参考资料

- 当前代码：`src/orchestrator/index.ts`、`src/config/workflow-resolver.ts`
- Workflow 定义：`src/config/workflow.json`
- 类型定义：`src/types/workflow.ts`
- Codex 评估：`/Users/danlio/Repositories/product-builder/docs/WORKFLOW-EXECUTOR-DISCUSSION.md`
