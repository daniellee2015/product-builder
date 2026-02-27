# Agent和Workflow的层次架构

## 问题分析

用户指出了两个关键的架构混淆：
1. **Agent的层次** - 外层调度agent vs CCB内部agent team
2. **Workflow的层次** - 项目workflow vs 开发workflow

## Agent的三个层次

```
┌─────────────────────────────────────────────────────────────┐
│ 层次1：外层调度Agent（Product Builder层）                    │
│                                                             │
│  职责：项目级别的规划和调度                                   │
│  ├── 决定哪些任务可以并行                                    │
│  ├── 资源分配和调度                                          │
│  ├── 任务依赖管理                                            │
│  └── 多workflow协调                                          │
│                                                             │
│  配置示例：                                                  │
│  {                                                          │
│    "project_orchestrator": {                                │
│      "type": "scheduler",                                   │
│      "capabilities": ["task_scheduling", "resource_mgmt"]   │
│    }                                                        │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ 调度
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 层次2：开发Agent Team（CCB/Claude Code层）                   │
│                                                             │
│  职责：具体开发任务的执行                                     │
│  ├── Designer Agent - 设计和规划                             │
│  ├── Reviewer Agent - 代码审查                               │
│  ├── Executor Agent - 代码实现                               │
│  └── Tester Agent - 测试                                     │
│                                                             │
│  配置位置：CCB的配置文件（不是Product Builder配置）           │
│  ~/.claude/config.json 或 CLAUDE.md                         │
│                                                             │
│  配置示例：                                                  │
│  {                                                          │
│    "agents": {                                              │
│      "designer": { "role": "planner", "llm": "claude" },    │
│      "reviewer": { "role": "reviewer", "llm": "codex" }     │
│    }                                                        │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ 使用
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 层次3：Subagent（CCB内部）                                   │
│                                                             │
│  职责：特定子任务的执行                                       │
│  ├── Explore subagent - 代码探索                             │
│  ├── Plan subagent - 计划制定                                │
│  └── Test subagent - 测试执行                                │
│                                                             │
│  这是CCB内部机制，Product Builder不需要配置                  │
└─────────────────────────────────────────────────────────────┘
```

### Product Builder应该配置哪个层次？

**答案：主要配置层次1（外层调度Agent），不配置层次2和3**

**原因：**
- 层次2（CCB agent team）由CCB自己管理
- 层次3（Subagent）是CCB内部机制
- Product Builder只需要配置项目级别的调度逻辑

### 修正后的配置结构

```json
// Product Builder配置
{
  "orchestrator": {
    "type": "local_scheduler",
    "max_parallel_tasks": 3,
    "resource_limits": {
      "cpu": "80%",
      "memory": "4GB"
    }
  },

  // 不配置CCB内部的agent team
  // 那是CCB的事情

  "tools": {
    "ccb": {
      "path": "/usr/local/bin/ccb",
      "config_path": "~/.claude/config.json"  // CCB自己的配置
    }
  }
}
```

## Workflow的两个层次

```
┌─────────────────────────────────────────────────────────────┐
│ 层次1：项目Workflow（Product Builder管理）                   │
│         Project-level Workflow                              │
│                                                             │
│  Phase 0: Requirements Collection                           │
│  Phase 1: Planning                                          │
│  Phase 2: Execution ──────┐                                 │
│  Phase 3: Review          │                                 │
│  Phase 4: Archive         │                                 │
│                           │                                 │
│  Job = Project Job        │                                 │
│  job_id = job_20260226_001│                                 │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            │ P2-EXECUTE_TASK触发
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 层次2：开发Workflow（CCB执行）                                │
│         Task-level Workflow                                 │
│                                                             │
│  1. Analyze requirements                                    │
│  2. Plan implementation                                     │
│  3. Write code                                              │
│  4. Run tests                                               │
│  5. Fix issues                                              │
│  6. Commit changes                                          │
│                                                             │
│  Task = Development Task                                    │
│  task_id = task_001, task_002, ...                          │
└─────────────────────────────────────────────────────────────┘
```

### 关系说明

**Project Job（项目任务）**
- 一个完整的项目开发流程
- 包含多个Phase
- 由Product Builder管理
- 存储在Product Builder数据库

**Development Task（开发任务）**
- 一个具体的开发任务
- 在Phase 2中执行
- 由CCB执行
- 可能有自己的状态和日志

### 数据模型

```sql
-- Product Builder数据库

-- 项目Job表
CREATE TABLE project_jobs (
    job_id TEXT PRIMARY KEY,
    workflow_id TEXT,
    requirement TEXT,
    status TEXT,  -- pending, running, completed
    current_phase TEXT,
    created_at TIMESTAMP
);

-- 开发Task表（属于某个project job）
CREATE TABLE development_tasks (
    task_id TEXT PRIMARY KEY,
    job_id TEXT,  -- 关联到project_jobs
    task_name TEXT,
    task_type TEXT,  -- feature, bugfix, refactor
    status TEXT,  -- pending, running, completed
    ccb_session_id TEXT,  -- CCB的session ID
    created_at TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES project_jobs(job_id)
);
```

### 执行流程示例

```python
# 1. 用户启动项目workflow
pb start "Build authentication feature"

# 2. 创建Project Job
project_job = {
    "job_id": "job_20260226_001",
    "requirement": "Build authentication feature",
    "status": "running"
}

# 3. 执行Phase 0-1（需求和规划）
execute_phase_0(project_job)
execute_phase_1(project_job)

# 4. 执行Phase 2 - 这里会创建多个Development Tasks
def execute_phase_2(project_job):
    # 从规划中提取任务列表
    tasks = extract_tasks_from_planning(project_job)

    # 为每个任务创建Development Task
    for task_spec in tasks:
        dev_task = {
            "task_id": f"task_{uuid.uuid4()}",
            "job_id": project_job["job_id"],
            "task_name": task_spec["name"],
            "status": "pending"
        }
        db.create_development_task(dev_task)

        # 调用CCB执行这个任务
        ccb_result = execute_ccb_task(dev_task)

        # 更新任务状态
        dev_task["status"] = "completed"
        dev_task["ccb_session_id"] = ccb_result["session_id"]
        db.update_development_task(dev_task)

# 5. 执行Phase 3-4（审查和归档）
execute_phase_3(project_job)
execute_phase_4(project_job)
```

### 调用CCB的方式

```python
def execute_ccb_task(dev_task: dict) -> dict:
    """Execute a development task using CCB"""

    # 1. 准备CCB命令
    # CCB有自己的workflow和agent team配置
    command = [
        "ccb",
        "execute",
        "--task", dev_task["task_name"],
        "--context", json.dumps(dev_task),
        "--mode", "autonomous"  # CCB内部会使用agent team
    ]

    # 2. 执行CCB
    result = subprocess.run(command, capture_output=True)

    # 3. 返回结果
    return {
        "session_id": result.stdout.decode(),
        "status": "completed" if result.returncode == 0 else "failed"
    }
```

## 修正后的菜单结构

```
Product Builder CLI
├── 1. Setup
├── 2. Workflow（项目Workflow配置）
│   ├── View workflow
│   ├── Switch mode
│   └── Edit workflow
│
├── 3. Jobs & Tasks（项目Job管理）⭐
│   ├── Start project workflow    - 启动项目workflow
│   ├── List project jobs         - 列出项目jobs
│   ├── View job details          - 查看job详情
│   │   ├── Project info
│   │   ├── Current phase
│   │   └── Development tasks     - 查看关联的开发任务
│   ├── Pause/Resume/Cancel job
│   └── View logs
│
├── 4. Orchestrator（外层调度配置）⭐ 改名
│   ├── Scheduler settings
│   ├── Resource limits
│   └── Parallel execution rules
│
├── 5. Tools（工具配置）
│   ├── CCB Configuration
│   │   ├── CCB path
│   │   └── CCB config path（CCB自己的agent配置）
│   ├── NPM Packages
│   ├── Docker Services
│   └── ...
│
├── 6. LLM（LLM配置）
│   └── API keys, models, providers
│
└── 7. System
```

## 关键修正

### 1. Agent配置的归属

**Product Builder配置：**
- ❌ 不配置CCB的agent team（Designer/Reviewer/Executor）
- ✅ 配置外层调度器（Orchestrator/Scheduler）

**CCB配置：**
- ✅ CCB自己的配置文件管理agent team
- Product Builder只需要知道CCB的路径

### 2. Workflow的分层

**Project Workflow（Product Builder）：**
- Phase 0-4
- 管理整个项目流程
- Job = Project Job

**Task Workflow（CCB）：**
- CCB内部的执行流程
- 由CCB的agent team执行
- Task = Development Task

### 3. Job vs Task

**Project Job：**
- 一个完整的项目开发周期
- 包含多个Phase
- 可能包含多个Development Task

**Development Task：**
- Phase 2中的一个具体开发任务
- 由CCB执行
- 属于某个Project Job

## 配置文件示例

### Product Builder配置

```json
{
  "orchestrator": {
    "type": "local_scheduler",
    "max_parallel_tasks": 3,
    "resource_limits": {
      "cpu": "80%",
      "memory": "4GB"
    }
  },

  "tools": {
    "ccb": {
      "path": "/usr/local/bin/ccb",
      "config_path": "~/.claude/config.json",
      "enabled": true
    }
  },

  "llm": {
    "claude": {
      "apiKey": "sk-...",
      "model": "claude-sonnet-4.5"
    }
  }
}
```

### CCB配置（~/.claude/config.json）

```json
{
  "agents": {
    "designer": {
      "role": "planner",
      "llm": "claude",
      "prompt_template": "design.txt"
    },
    "reviewer": {
      "role": "reviewer",
      "llm": "codex",
      "prompt_template": "review.txt"
    },
    "executor": {
      "role": "executor",
      "llm": "claude",
      "prompt_template": "execute.txt"
    }
  }
}
```

## 总结

### 关键区分

1. **Agent层次**
   - 层次1：Product Builder的Orchestrator（调度器）
   - 层次2：CCB的Agent Team（Designer/Reviewer/Executor）
   - 层次3：CCB的Subagent（内部机制）

2. **Workflow层次**
   - 层次1：Project Workflow（Phase 0-4）
   - 层次2：Task Workflow（CCB内部）

3. **Job vs Task**
   - Project Job：整个项目的一次执行
   - Development Task：Phase 2中的具体开发任务

### Product Builder的职责

- ✅ 管理Project Workflow
- ✅ 管理Project Jobs
- ✅ 配置Orchestrator（调度器）
- ✅ 调用CCB执行Development Tasks
- ❌ 不管理CCB内部的agent team
- ❌ 不管理CCB内部的workflow

这样分层清楚了吗？
