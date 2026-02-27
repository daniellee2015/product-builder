# Product Builder 最终架构定义

## 两层架构的职责划分

### 层次1：调度层（宏观管理）

**职责：**
- 与用户交互
- 宏观掌控整个项目
- 管理不同工作的优先级
- 跟踪项目进展
- 资源分配和协调

**Agent角色：**
- **PM（项目经理）**
  - 需求分析和理解
  - 任务拆解和分配
  - 优先级管理
  - 决策和规划

- **Traffic（进度跟踪）**
  - 跟踪项目进展
  - 监控执行状态
  - 识别瓶颈
  - 状态报告

**关注点：宏观、管理、协调**

### 层次2：开发工作流层（微观执行）

**职责：**
- 执行具体的开发任务
- 技术层面的判断：
  - 不同工作是否有独立性
  - 是否需要隔离worktree
  - 是否需要区分实例
  - 是否有代码冲突
  - 如何并行执行

**Agent配置（CCB+CCA）：**
- 配置不同阶段用哪个LLM
- Phase 0用Claude
- Phase 1用Gemini
- Phase 2用Codex
- 等等

**关注点：微观、技术、执行**

## 关键区别

```
┌─────────────────────────────────────────────────────────┐
│ 调度层Agent（PM/Traffic）                                │
│                                                         │
│ 视角：宏观                                               │
│ 职责：管理和协调                                         │
│ 问题：                                                   │
│ - 这个需求应该拆成几个job？                              │
│ - 哪个job优先级更高？                                    │
│ - 资源如何分配？                                         │
│ - 项目进展如何？                                         │
│ - 是否需要调整计划？                                     │
│                                                         │
│ 不关心：                                                 │
│ - 具体代码怎么写                                         │
│ - 用什么技术实现                                         │
│ - worktree如何隔离                                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 开发工作流Agent（CCB+CCA）                               │
│                                                         │
│ 视角：微观                                               │
│ 职责：技术执行                                           │
│ 问题：                                                   │
│ - 这两个任务是否独立？                                   │
│ - 是否需要隔离worktree？                                 │
│ - 是否会有代码冲突？                                     │
│ - 如何并行执行？                                         │
│ - 用哪个LLM执行这个阶段？                                │
│                                                         │
│ 不关心：                                                 │
│ - 整体项目优先级                                         │
│ - 资源分配策略                                           │
│ - 项目进展报告                                           │
└─────────────────────────────────────────────────────────┘
```

## 实际场景示例

### 场景：用户需求"构建完整的认证系统"

#### 调度层处理（PM/Traffic）

```python
# PM Agent分析
pm_agent.analyze_requirement("构建完整的认证系统")

# PM决策：
# 1. 拆分成3个job
jobs = [
    {
        "job_id": "job_001",
        "name": "数据库设计",
        "priority": "high",
        "estimated_time": "2h"
    },
    {
        "job_id": "job_002",
        "name": "OAuth实现",
        "priority": "high",
        "depends_on": ["job_001"],
        "estimated_time": "4h"
    },
    {
        "job_id": "job_003",
        "name": "JWT服务",
        "priority": "medium",
        "depends_on": ["job_001"],
        "estimated_time": "3h"
    }
]

# PM决策：job_001必须先完成，job_002和job_003可以并行

# Traffic Agent跟踪
traffic_agent.monitor_progress(jobs)
# - job_001: 完成 ✓
# - job_002: 进行中 (50%)
# - job_003: 进行中 (30%)
```

#### 开发工作流层处理（CCB+CCA）

```python
# 执行job_002和job_003时

# CCB+CCA判断：
# 1. 这两个job是否独立？
independence_check = ccb.check_independence(job_002, job_003)
# 结果：独立（一个是OAuth，一个是JWT，不同模块）

# 2. 是否需要隔离worktree？
worktree_decision = ccb.decide_worktree(job_002, job_003)
# 结果：需要隔离（避免代码冲突）

# 3. 创建隔离的worktree
ccb.create_worktree("worktree-job-002", "feature/oauth")
ccb.create_worktree("worktree-job-003", "feature/jwt")

# 4. 并行执行
# job_002在worktree-job-002中执行
# - Phase 0: 用Claude分析需求
# - Phase 1: 用Gemini设计方案
# - Phase 2: 用Codex写代码

# job_003在worktree-job-003中执行
# - Phase 0: 用Claude分析需求
# - Phase 1: 用Gemini设计方案
# - Phase 2: 用Codex写代码

# 5. 检测冲突
conflict_check = ccb.check_conflicts("worktree-job-002", "worktree-job-003")
# 结果：无冲突
```

## Product Builder的配置

### 1. 调度层配置

```json
{
  "scheduler": {
    "type": "internal",
    "agents": {
      "pm": {
        "llm": "claude",
        "role": "project_manager",
        "capabilities": [
          "requirement_analysis",
          "task_decomposition",
          "priority_management",
          "resource_allocation"
        ]
      },
      "traffic": {
        "llm": "claude",
        "role": "progress_tracker",
        "capabilities": [
          "progress_monitoring",
          "status_reporting",
          "bottleneck_detection",
          "timeline_management"
        ]
      }
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

    "technical_decisions": {
      "independence_check": "enabled",
      "worktree_isolation": "auto",
      "conflict_detection": "enabled",
      "parallel_execution": "auto"
    }
  }
}
```

## 数据模型

### 调度层数据

```sql
-- 项目级别的job
CREATE TABLE project_jobs (
    job_id TEXT PRIMARY KEY,
    name TEXT,
    requirement TEXT,
    priority TEXT,  -- high, medium, low
    status TEXT,    -- pending, running, completed, failed
    depends_on TEXT,  -- JSON array of job_ids
    estimated_time TEXT,
    actual_time TEXT,
    created_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- 进度跟踪
CREATE TABLE progress_tracking (
    id INTEGER PRIMARY KEY,
    job_id TEXT,
    phase TEXT,
    progress INTEGER,  -- 0-100
    status TEXT,
    bottlenecks TEXT,  -- JSON array
    updated_at TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES project_jobs(job_id)
);
```

### 开发工作流层数据

```sql
-- 技术决策记录
CREATE TABLE technical_decisions (
    id INTEGER PRIMARY KEY,
    job_id TEXT,
    decision_type TEXT,  -- independence, worktree, conflict
    decision TEXT,       -- yes/no/auto
    reason TEXT,
    created_at TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES project_jobs(job_id)
);

-- Worktree管理
CREATE TABLE worktrees (
    id INTEGER PRIMARY KEY,
    job_id TEXT,
    worktree_path TEXT,
    branch_name TEXT,
    status TEXT,  -- active, merged, deleted
    created_at TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES project_jobs(job_id)
);

-- 冲突检测
CREATE TABLE conflict_checks (
    id INTEGER PRIMARY KEY,
    job_id_1 TEXT,
    job_id_2 TEXT,
    has_conflict BOOLEAN,
    conflict_files TEXT,  -- JSON array
    checked_at TIMESTAMP
);
```

## 执行流程

### 完整流程示例

```python
# 1. 用户输入
user_input = "构建完整的认证系统"

# 2. 调度层处理（PM Agent）
pm_agent = get_pm_agent()
analysis = pm_agent.analyze_requirement(user_input)

jobs = pm_agent.decompose_to_jobs(analysis)
# 返回3个job：数据库设计、OAuth实现、JWT服务

pm_agent.set_priorities(jobs)
# job_001: high, job_002: high, job_003: medium

pm_agent.analyze_dependencies(jobs)
# job_002和job_003依赖job_001

# 3. 开始执行
# 先执行job_001
execute_development_workflow(job_001)

# 4. job_001完成后，开发工作流层判断
ccb = get_ccb_adapter()

# 判断job_002和job_003是否独立
independent = ccb.check_independence(job_002, job_003)
# 结果：True

# 决定是否需要隔离worktree
need_isolation = ccb.decide_worktree_isolation(job_002, job_003)
# 结果：True（避免冲突）

# 5. 创建隔离环境并并行执行
if need_isolation:
    ccb.create_worktree(job_002, "worktree-002")
    ccb.create_worktree(job_003, "worktree-003")

    # 并行执行
    execute_development_workflow(job_002, worktree="worktree-002")
    execute_development_workflow(job_003, worktree="worktree-003")

# 6. Traffic Agent跟踪进度
traffic_agent = get_traffic_agent()
while not all_jobs_completed(jobs):
    progress = traffic_agent.get_progress(jobs)
    traffic_agent.report_status(progress)

    # 检测瓶颈
    bottlenecks = traffic_agent.detect_bottlenecks(jobs)
    if bottlenecks:
        traffic_agent.alert_user(bottlenecks)
```

## 菜单结构（最终版）

```
Product Builder CLI
├── 1. Setup
│
├── 2. Scheduler（调度层配置）
│   ├── PM Agent config
│   ├── Traffic Agent config
│   └── OpenClaw integration（可选）
│
├── 3. Development Workflow（开发工作流配置）
│   ├── View workflow (Phase 0-4)
│   ├── Switch mode (lite/standard/full)
│   ├── Phase LLM mapping
│   └── Technical decisions
│       ├── Independence check
│       ├── Worktree isolation
│       ├── Conflict detection
│       └── Parallel execution
│
├── 4. Jobs & Tasks（Job管理）
│   ├── Start job（通过PM Agent）
│   ├── List jobs（显示优先级和依赖）
│   ├── View job details
│   │   ├── Progress（Traffic Agent提供）
│   │   ├── Technical decisions（CCB提供）
│   │   └── Worktree info
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

## 总结

### 调度层（宏观）
- **视角：** 整体项目
- **职责：** 管理、协调、跟踪
- **Agent：** PM + Traffic
- **关注：** 优先级、进展、资源

### 开发工作流层（微观）
- **视角：** 具体任务
- **职责：** 技术判断、执行
- **Agent：** CCB + CCA
- **关注：** 独立性、隔离、冲突、并行

### 两层协作
- 调度层决定"做什么"、"先做什么"
- 开发工作流层决定"怎么做"、"如何并行"
- 各司其职，互不干扰

这就是Product Builder的完整架构！
