# 架构澄清：两个独立的工作流

## Codex的误解

Codex认为OpenClaw和Product Builder PM/Traffic会**同时**做决策导致冲突。

**这是错误的理解！**

## 正确的理解

### PM/Traffic Agent的实现方式（二选一）

**选项A：使用外部Agent工具**
```
OpenClaw（或其他agent工具）
    ↓
作为PM/Traffic Agent
    ↓
执行调度工作流
```

**选项B：使用CodeAct模式**
```
Product Builder内置
    ↓
CodeAct模式直接调用LLM
    ↓
作为PM/Traffic Agent
    ↓
执行调度工作流
```

**关键点：二选一，不是同时存在！**

### 两个完全独立的工作流

```
┌─────────────────────────────────────────────────────────┐
│ 工作流1：调度工作流（独立的）                              │
│                                                         │
│ 执行者：PM/Traffic Agent                                 │
│         (OpenClaw 或 CodeAct模式)                        │
│                                                         │
│ 流程：                                                   │
│ 1. 接收用户需求                                          │
│ 2. 分析需求                                              │
│ 3. 拆分成多个job                                         │
│ 4. 确定优先级和依赖                                       │
│ 5. 调度job执行                                           │
│ 6. 跟踪进展                                              │
│ 7. 识别瓶颈                                              │
│                                                         │
│ 这个工作流不在workflow.json中                             │
│ 这是PM/Traffic的管理流程                                  │
└─────────────────────────────────────────────────────────┘
                        │
                        │ 调度
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 工作流2：开发工作流（独立的）                              │
│                                                         │
│ 定义：workflow.json（Phase 0-4）                         │
│                                                         │
│ 执行者：CCB+CCA                                          │
│                                                         │
│ 流程：                                                   │
│ Phase 0: Requirements                                   │
│ Phase 1: Planning                                       │
│ Phase 2: Execution                                      │
│ Phase 3: Review                                         │
│ Phase 4: Archive                                        │
│                                                         │
│ 技术判断：                                               │
│ - 任务独立性                                             │
│ - worktree隔离                                           │
│ - 冲突检测                                               │
│                                                         │
│ 这个工作流在workflow.json中                               │
│ 这是具体的开发执行流程                                    │
└─────────────────────────────────────────────────────────┘
```

## 关键区别

### 1. 两个独立的工作流

**调度工作流：**
- 不在workflow.json中
- PM/Traffic的管理流程
- 宏观层面

**开发工作流：**
- 在workflow.json中
- 开发执行流程
- 微观层面

### 2. 不能混在一起

**错误的理解（Codex的理解）：**
```
调度层 + 开发工作流层 = 混在一起的架构
```

**正确的理解：**
```
调度工作流（独立）
    ↓ 调度
开发工作流（独立）
```

### 3. Agent调度方式不同

**调度工作流的Agent：**
- PM/Traffic Agent
- 实现：OpenClaw 或 CodeAct
- 职责：管理和协调

**开发工作流的Agent：**
- CCB+CCA
- 配置：Phase LLM mapping
- 职责：技术执行

## Product Builder的配置

### 配置1：选择PM/Traffic Agent的实现方式

```json
{
  "scheduler": {
    "type": "external",  // 或 "internal"

    // 选项A：使用OpenClaw
    "external_agent": {
      "tool": "openclaw",
      "url": "http://localhost:8080"
    },

    // 选项B：使用CodeAct模式
    "internal_agent": {
      "mode": "codeact",
      "llm": "claude",
      "roles": ["pm", "traffic"]
    }
  }
}
```

### 配置2：开发工作流配置

```json
{
  "development_workflow": {
    "workflow_file": "src/config/workflow.json",
    "phase_llm_mapping": {
      "P0": "claude",
      "P1": "gemini",
      "P2": "codex",
      "P3": "claude",
      "P4": "claude"
    }
  }
}
```

## 执行流程

### 正确的流程

```python
# 1. 用户输入需求
user_input = "构建完整的认证系统"

# 2. 调度工作流执行（独立的workflow）
# 使用OpenClaw或CodeAct模式
if config.scheduler.type == "external":
    # 使用OpenClaw
    scheduler = OpenClawAgent(config.scheduler.external_agent)
else:
    # 使用CodeAct模式
    scheduler = CodeActAgent(config.scheduler.internal_agent)

# 调度工作流的步骤
jobs = scheduler.analyze_and_decompose(user_input)
# 返回：[job_001, job_002, job_003]

scheduler.set_priorities(jobs)
scheduler.track_progress(jobs)

# 3. 对每个job，调用开发工作流（独立的workflow）
for job in jobs:
    if scheduler.can_execute(job):
        # 执行开发工作流（workflow.json中的Phase 0-4）
        execute_development_workflow(job)
```

### 错误的流程（Codex理解的）

```python
# 错误：把调度和开发混在一起
workflow = load_workflow("workflow.json")
# workflow中既有调度步骤，又有开发步骤
# 这是错误的！
```

## 总结

### Codex的误解
- 认为OpenClaw和Product Builder PM/Traffic会同时做决策
- 把调度工作流和开发工作流混在一起理解

### 正确的理解
- OpenClaw **或** CodeAct模式，二选一
- 调度工作流和开发工作流是**两个完全独立的流程**
- 不能混在一起

### 关键点
1. **PM/Traffic Agent的实现**：OpenClaw 或 CodeAct（二选一）
2. **两个独立的工作流**：调度工作流 + 开发工作流
3. **不同的Agent调度方式**：管理型 vs 技术型
4. **不能混在一起**：各自独立运行

这样理解对了吗？
