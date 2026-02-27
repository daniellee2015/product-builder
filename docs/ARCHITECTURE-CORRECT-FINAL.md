# Product Builder 正确的架构设计

## 两层架构

```
┌─────────────────────────────────────────────────────────────────┐
│ 层次1：调度层（顶层）- 管理性工作                                  │
│                                                                 │
│ 职责：调度所有job，检测运转，资源分配                              │
│ 角色：PM（项目管理）、Traffic（跟踪进度）- 管理性工作              │
│                                                                 │
│ 实现方式（二选一）：                                               │
│ A. 外部Agent工具（如OpenClaw）                                    │
│ B. Product Builder直接对接LLM（CodeAct）                         │
│                                                                 │
│ 调度工作流（不在当前workflow.json中）：                            │
│ ├── 接收需求                                                     │
│ ├── 分析需求，拆分成多个job                                       │
│ ├── 决定job的优先级和依赖                                         │
│ ├── 调度job到开发工作流执行                                       │
│ ├── 监控job执行状态                                               │
│ └── 协调多个job的并行执行                                         │
│                                                                 │
│ Agent配置（调度Agent）：                                          │
│ {                                                               │
│   "scheduler_agent": {                                          │
│     "type": "pm_traffic",                                       │
│     "llm": "claude",                                            │
│     "capabilities": [                                           │
│       "requirement_analysis",                                   │
│       "job_decomposition",                                      │
│       "resource_allocation",                                    │
│       "priority_management"                                     │
│     ]                                                           │
│   }                                                             │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ 调度job
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 层次2：开发工作流层 - 产品研发工作                                 │
│                                                                 │
│ 工作流：当前workflow.json（Phase 0-4，3种模式）                   │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ 子层2.1：CCB+CCA调度层                                    │   │
│ │                                                           │   │
│ │ 职责：配置不同阶段用哪个LLM                                │   │
│ │ 配置方式：安装工具配置模板                                 │   │
│ │                                                           │   │
│ │ 配置示例：                                                 │   │
│ │ {                                                         │   │
│ │   "phase_llm_mapping": {                                  │   │
│ │     "P0": "claude",      // 需求阶段用Claude             │   │
│ │     "P1": "gemini",      // 规划阶段用Gemini             │   │
│ │     "P2": "codex",       // 执行阶段用Codex              │   │
│ │     "P3": "claude",      // 审查阶段用Claude             │   │
│ │     "P4": "claude"       // 归档阶段用Claude             │   │
│ │   }                                                       │   │
│ │ }                                                         │   │
│ │                                                           │   │
│ │ 这是CCB+CCA的能力，只需要配置即可                          │   │
│ └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
│                            │ 使用                                │
│                            ↓                                    │
│ ┌─────────────────────────────────────────────────────────┐   │
│ │ 子层2.2：Claude Code内部                                  │   │
│ │                                                           │   │
│ │ Subagent & Agent Teams                                    │   │
│ │ 职责：完成某类工作的专精小组                               │   │
│ │                                                           │   │
│ │ 支持情况：                                                 │   │
│ │ ✅ Claude Code支持                                        │   │
│ │ ✅ OpenCode支持                                           │   │
│ │ ❌ Codex不支持                                            │   │
│ │ ❌ Gemini不支持                                           │   │
│ │                                                           │   │
│ │ 这是Claude Code内部机制，Product Builder不配置            │   │
│ └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 详细说明

### 层次1：调度层（顶层）

#### 职责
- 接收用户的大需求
- 分析需求，拆分成多个job
- 决定job的优先级和依赖关系
- 调度job到开发工作流执行
- 监控所有job的执行状态
- 协调多个job的并行执行
- 资源分配和管理

#### Agent类型：调度Agent
- **角色：**
  - PM（项目经理）- 负责需求分析、任务拆解、优先级管理
  - Traffic（进度跟踪）- 负责跟踪项目进度、监控执行状态
- **性质：** 管理性工作，非开发工作
- **能力：**
  - 需求分析和理解
  - 任务拆解和分配
  - 优先级管理
  - 资源调度
  - 进度跟踪和监控
  - 状态报告

#### 实现方式

**方式A：使用外部Agent工具（如OpenClaw）**
```json
{
  "scheduler": {
    "type": "external",
    "tool": "openclaw",
    "config": {
      "url": "http://localhost:8080",
      "api_key": "..."
    }
  }
}
```

**方式B：Product Builder直接对接LLM（CodeAct）**
```json
{
  "scheduler": {
    "type": "internal",
    "agents": {
      "pm": {
        "type": "codeact",
        "llm": "claude",
        "role": "project_manager",
        "prompt_template": "pm_agent.txt",
        "capabilities": [
          "requirement_analysis",
          "task_decomposition",
          "priority_management"
        ]
      },
      "traffic": {
        "type": "codeact",
        "llm": "claude",
        "role": "progress_tracker",
        "prompt_template": "traffic_agent.txt",
        "capabilities": [
          "progress_monitoring",
          "status_reporting",
          "bottleneck_detection"
        ]
      }
    }
  }
}
```

#### 调度工作流（不在workflow.json中）

这是一个独立的工作流，用于管理多个开发job：

```python
# 调度工作流示例
def scheduler_workflow(user_requirement: str):
    # 1. 分析需求
    analysis = scheduler_agent.analyze_requirement(user_requirement)

    # 2. 拆分成多个job
    jobs = scheduler_agent.decompose_to_jobs(analysis)
    # 例如：
    # - Job 1: 设计数据库schema
    # - Job 2: 实现API endpoints
    # - Job 3: 实现前端UI

    # 3. 确定依赖关系
    dependencies = scheduler_agent.analyze_dependencies(jobs)
    # 例如：Job 2依赖Job 1，Job 3依赖Job 2

    # 4. 调度执行
    for job in jobs:
        if can_execute(job, dependencies):
            # 调用开发工作流执行这个job
            execute_development_workflow(job)

    # 5. 监控和协调
    monitor_and_coordinate(jobs)
```

### 层次2：开发工作流层

#### 当前workflow.json的定位
- **这是开发工作流**，不是调度工作流
- Phase 0-4：Requirements → Planning → Execution → Review → Archive
- 3种模式：Lite, Standard, Full
- 执行单个开发job

#### 子层2.1：CCB+CCA调度层

**职责：** 配置不同阶段用哪个LLM

**配置示例：**
```json
{
  "development_workflow": {
    "phase_llm_mapping": {
      "P0": {
        "llm": "claude",
        "reason": "Claude擅长需求分析和理解"
      },
      "P1": {
        "llm": "gemini",
        "reason": "Gemini擅长创意和设计"
      },
      "P2": {
        "llm": "codex",
        "reason": "Codex擅长代码生成"
      },
      "P3": {
        "llm": "claude",
        "reason": "Claude擅长代码审查"
      },
      "P4": {
        "llm": "claude",
        "reason": "Claude擅长文档整理"
      }
    },
    "step_llm_mapping": {
      "P2-EXECUTE_TASK": "codex",
      "P2-MULTIMODEL_CODE_REVIEW": "claude",
      "P3-FINAL_REVIEW": "claude"
    }
  }
}
```

**这是CCB+CCA的能力：**
- CCB（Claude Code）和CCA（Claude Agent）支持配置
- 只需要配置模板即可
- 自动在不同阶段调用不同的LLM

#### 子层2.2：Claude Code内部

**Subagent & Agent Teams：**
- 这是Claude Code内部的机制
- 用于完成某类工作的专精小组
- Product Builder不需要配置
- 只有Claude Code和OpenCode支持

**支持情况：**
- ✅ Claude Code（CCB）支持
- ✅ OpenCode支持
- ❌ Codex不支持
- ❌ Gemini不支持

## Product Builder的配置结构

### 1. 调度层配置

```json
{
  "scheduler": {
    "type": "internal",  // 或 "external"
    "agent": {
      "type": "codeact",
      "llm": "claude",
      "role": "pm_traffic",
      "capabilities": [
        "requirement_analysis",
        "job_decomposition",
        "resource_allocation",
        "priority_management"
      ]
    }
  }
}
```

### 2. 开发工作流配置

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
    },
    "step_llm_mapping": {
      "P2-EXECUTE_TASK": "codex",
      "P2-MULTIMODEL_CODE_REVIEW": "claude"
    }
  }
}
```

### 3. LLM配置

```json
{
  "llms": {
    "claude": {
      "apiKey": "sk-...",
      "model": "claude-sonnet-4.5"
    },
    "gemini": {
      "apiKey": "...",
      "model": "gemini-pro"
    },
    "codex": {
      "apiKey": "sk-...",
      "model": "codex-latest"
    }
  }
}
```

### 4. Tools配置

```json
{
  "tools": {
    "ccb": {
      "path": "/usr/local/bin/ccb",
      "config_path": "~/.claude/config.json"
    },
    "cca": {
      "path": "/usr/local/bin/cca"
    },
    "openclaw": {
      "enabled": false,
      "url": "http://localhost:8080"
    }
  }
}
```

## 菜单结构（修正版）

```
Product Builder CLI
├── 1. Setup
│
├── 2. Scheduler（调度层配置）⭐ 新增
│   ├── Scheduler type (internal/external)
│   ├── Scheduler agent config
│   └── OpenClaw integration
│
├── 3. Development Workflow（开发工作流配置）
│   ├── View workflow (Phase 0-4)
│   ├── Switch mode (lite/standard/full)
│   ├── Phase LLM mapping（配置各阶段用哪个LLM）⭐
│   └── Step LLM mapping（配置各步骤用哪个LLM）⭐
│
├── 4. Jobs & Tasks（Job管理）
│   ├── Start job（通过调度层启动）
│   ├── List jobs
│   ├── View job details
│   └── Pause/Resume/Cancel
│
├── 5. LLM（LLM配置）
│   ├── Claude
│   ├── Gemini
│   ├── Codex
│   └── Others
│
├── 6. Tools（工具配置）
│   ├── CCB (Claude Code)
│   ├── CCA (Claude Agent)
│   ├── OpenClaw
│   └── Others
│
└── 7. System
```

## 执行流程示例

### 完整流程

```python
# 1. 用户输入大需求
user_input = "Build a complete authentication system with OAuth, JWT, and user management"

# 2. 调度层处理（层次1）
scheduler_agent = get_scheduler_agent()
analysis = scheduler_agent.analyze_requirement(user_input)

# 分析结果：需要拆分成3个job
jobs = [
    {
        "job_id": "job_001",
        "name": "Design database schema",
        "requirement": "Design user, session, and token tables"
    },
    {
        "job_id": "job_002",
        "name": "Implement OAuth flow",
        "requirement": "Implement OAuth 2.0 authorization flow",
        "depends_on": ["job_001"]
    },
    {
        "job_id": "job_003",
        "name": "Implement JWT service",
        "requirement": "Implement JWT token generation and validation",
        "depends_on": ["job_001"]
    }
]

# 3. 调度执行
for job in jobs:
    if can_execute(job):
        # 调用开发工作流（层次2）
        execute_development_workflow(job)

# 4. 开发工作流执行（层次2）
def execute_development_workflow(job):
    # 加载workflow.json
    workflow = load_workflow("src/config/workflow.json")

    # 加载Phase LLM mapping
    phase_llm_mapping = load_phase_llm_mapping()

    # 执行各个Phase
    for phase in workflow["phases"]:
        # 根据配置选择LLM
        llm = phase_llm_mapping[phase["id"]]

        # 执行Phase（使用CCB+CCA）
        execute_phase_with_llm(phase, llm, job)

# 5. CCB+CCA执行（子层2.1）
def execute_phase_with_llm(phase, llm, job):
    # CCB会根据配置使用指定的LLM
    # 如果是Claude Code，还会使用内部的subagent和agent teams（子层2.2）
    ccb_execute(phase, llm, job)
```

## 关键区别总结

### 两个工作流

1. **调度工作流（层次1）**
   - 不在workflow.json中
   - 管理多个job
   - PM/Traffic角色
   - 管理性工作

2. **开发工作流（层次2）**
   - 在workflow.json中
   - Phase 0-4
   - 执行单个job
   - 开发工作

### 两种Agent

1. **调度Agent（层次1）**
   - PM/Traffic角色
   - 需求分析、任务拆解、资源调度
   - Product Builder配置

2. **开发Agent（层次2）**
   - 分两个子层：
     - 子层2.1：CCB+CCA调度（配置各阶段用哪个LLM）
     - 子层2.2：Claude Code内部（subagent/agent teams）

### Product Builder配置什么

- ✅ 调度层配置（调度Agent）
- ✅ Phase LLM mapping（CCB+CCA调度）
- ✅ Step LLM mapping（CCB+CCA调度）
- ✅ LLM配置（API keys等）
- ✅ Tools配置（CCB/CCA/OpenClaw路径）
- ❌ 不配置Claude Code内部的subagent/agent teams

这样理解对了吗？
