# Product Builder - Scheduler & Parallel Execution

完整的workflow编排系统，支持步骤并行执行和多worker并发。

## 🎯 核心功能

### ✅ 已实现（Phase 2完成）

- **场景2：Workflow内步骤并行执行**
  - 自动依赖分析
  - 拓扑排序和执行层级
  - ThreadPoolExecutor并发执行
  - 资源锁防止冲突

- **场景3：多Workflow并发执行**
  - Worker进程管理
  - Job lease协调机制
  - 心跳健康检查
  - 跨tmux窗格执行

- **完整的数据库支持**
  - 22个表的SQLite架构
  - Job依赖管理（DAG）
  - 资源锁（exclusive/shared）
  - 完整的执行追踪

## 📚 文档

| 文档 | 描述 |
|------|------|
| [QUICKSTART.md](QUICKSTART.md) | 快速开始指南，包含所有使用场景 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 系统架构设计和数据流图 |
| [DATABASE_SCHEMA_SUMMARY.md](DATABASE_SCHEMA_SUMMARY.md) | 完整的数据库schema文档 |
| [IMPLEMENTATION_STATUS_UPDATED.md](IMPLEMENTATION_STATUS_UPDATED.md) | 实施状态和下一步计划 |
| [PHASE_2_3_PLAN.md](PHASE_2_3_PLAN.md) | Phase 2.3详细计划（已完成） |

## 🚀 快速开始

### 1. 初始化数据库

```bash
cd scripts/python
python3 init_database.py
```

### 2. 运行测试

```bash
# 测试调度器
python3 test_scheduler.py

# 测试并行执行
python3 test_parallel_execution.py

# 测试多worker
python3 test_multi_worker.py
```

### 3. 使用示例

#### 并行执行Workflow

```python
from orchestrator import WorkflowOrchestrator

orchestrator = WorkflowOrchestrator(
    workflow_path="workflow.json",
    job_id="job-001",
    parallel_execution=True,  # 启用并行
    max_workers=4
)

orchestrator.execute()
```

#### 启动Worker

```python
from worker import Worker
from workflow_db_scheduler import SchedulerDatabase

worker = Worker(SchedulerDatabase())
worker.start(max_jobs=10)
```

## 📊 架构概览

```
Product Builder CLI
├── WorkflowOrchestrator (执行层)
│   ├── Sequential mode (默认)
│   └── Parallel mode (场景2)
│       └── ParallelStepExecutor
│           └── StepDependencyAnalyzer
├── LocalScheduler (调度层)
│   ├── Job queue management
│   ├── Dependency resolution
│   └── Resource lock coordination
└── Worker (分布式层 - 场景3)
    ├── Job claiming with leases
    ├── Heartbeat mechanism
    └── Multi-instance coordination
```

## 📁 核心文件

### 执行引擎
- `orchestrator.py` - 主workflow执行器
- `parallel_step_executor.py` - 并行步骤执行器
- `step_dependency_analyzer.py` - 依赖分析器

### 调度系统
- `scheduler.py` - 本地调度器
- `worker.py` - Worker进程
- `workflow_db_scheduler.py` - 调度数据库适配器

### 数据库
- `workflow_db_phase1.py` - Phase 1数据库操作
- `db_schema_phase1.sql` - 核心表schema
- `db_schema_scheduling.sql` - 调度表schema
- `init_database.py` - 数据库初始化

### 测试
- `test_scheduler.py` - 调度器测试
- `test_parallel_execution.py` - 并行执行测试
- `test_multi_worker.py` - 多worker测试
- `test_scheduler_adapter.py` - 数据库适配器测试

## 🎓 使用场景

### 场景1：顺序执行（默认）

```python
orchestrator = WorkflowOrchestrator(
    workflow_path="workflow.json",
    job_id="job-001"
)
orchestrator.execute()
```

### 场景2：并行执行步骤

```python
orchestrator = WorkflowOrchestrator(
    workflow_path="workflow.json",
    job_id="job-002",
    parallel_execution=True,
    max_workers=4
)
orchestrator.execute()
```

**效果**：
- 自动分析步骤依赖
- 无依赖的步骤并行执行
- 有依赖的步骤按顺序执行

### 场景3：多Worker并发

在3个tmux窗格中分别运行：

```bash
# 窗格1
python3 -c "from worker import Worker; from workflow_db_scheduler import SchedulerDatabase; Worker(SchedulerDatabase()).start()"

# 窗格2
python3 -c "from worker import Worker; from workflow_db_scheduler import SchedulerDatabase; Worker(SchedulerDatabase()).start()"

# 窗格3
python3 -c "from worker import Worker; from workflow_db_scheduler import SchedulerDatabase; Worker(SchedulerDatabase()).start()"
```

**效果**：
- 3个worker同时运行
- 自动协调job分配
- Lease机制防止冲突

### 场景4：Job依赖管理

```python
from workflow_db_scheduler import SchedulerDatabase

scheduler_db = SchedulerDatabase()

# 创建依赖链：job-1 -> job-2 -> job-3
scheduler_db.add_job_dependency("job-2", "job-1", "finish")
scheduler_db.add_job_dependency("job-3", "job-2", "finish")

# 调度器自动按依赖顺序执行
```

### 场景5：资源锁

```python
# 获取exclusive lock
scheduler_db.acquire_lock(
    lock_key="repo-main",
    mode="exclusive",
    owner_job_id="job-1"
)

# 执行需要独占访问的操作
# ...

# 释放锁
scheduler_db.release_lock("repo-main", "job-1")
```

## 📈 性能特性

### 并发性能
- **Sequential Mode**: 1 step at a time
- **Parallel Mode**: Up to N steps concurrently (N = max_workers)
- **Multi-Worker**: Up to M jobs concurrently (M = number of workers)

### 数据库性能
- **WAL Mode**: 允许并发读写
- **Busy Timeout**: 5000ms
- **Throughput**: ~1000 writes/sec

### 资源使用
- **Memory**: ~50MB per worker
- **CPU**: Depends on workflow
- **Disk**: SQLite database

## 🧪 测试覆盖

| 测试文件 | 覆盖范围 | 状态 |
|---------|---------|------|
| test_scheduler.py | LocalScheduler功能 | ✅ 通过 |
| test_scheduler_adapter.py | 数据库操作 | ✅ 通过 |
| test_parallel_execution.py | 并行执行 | ✅ 通过 |
| test_multi_worker.py | Worker协调 | ✅ 通过 |
| test_scheduling_tables.py | 表结构 | ✅ 通过 |

## 🔧 配置选项

### WorkflowOrchestrator

```python
orchestrator = WorkflowOrchestrator(
    workflow_path="workflow.json",      # Workflow定义
    job_id="job-001",                   # Job ID
    llm_provider="codex",               # LLM provider
    auto_approve=False,                 # 自动批准
    strict_transitions=False,           # 严格模式
    use_database=True,                  # 使用数据库
    parallel_execution=False,           # 并行执行
    max_workers=4                       # 最大worker数
)
```

### LocalScheduler

```python
scheduler = LocalScheduler(
    max_concurrent_jobs=3,    # 最大并发job数
    lease_duration=300,       # Lease时长（秒）
    poll_interval=5           # 轮询间隔（秒）
)
```

### Worker

```python
worker = Worker(
    scheduler_db=scheduler_db,
    worker_id="worker-1",         # Worker ID
    heartbeat_interval=30,        # 心跳间隔（秒）
    lease_duration=300            # Lease时长（秒）
)
```

## 🗄️ 数据库架构

### 22个表

**核心Workflow表 (13)**：
- projects, workflow_definitions, workflow_steps
- workflow_transitions, jobs, step_executions
- transition_history, job_variables, review_results
- review_findings, llm_interactions, config_entries
- error_events

**Git/GitHub表 (4)**：
- git_operations, github_issues
- github_pull_requests, artifacts

**调度表 (4)**：
- job_dependencies, job_leases
- resource_locks, scheduler_events

**系统表 (1)**：
- schema_migrations

## 🛠️ 故障排查

### 数据库表不存在
```bash
python3 init_database.py
```

### Job一直pending
```python
deps = scheduler_db.get_job_dependencies("job-id")
print(f"Dependencies: {deps}")
```

### 资源锁冲突
```python
locks = scheduler_db.conn.execute("""
    SELECT * FROM resource_locks WHERE lock_key = ?
""", ("lock-key",)).fetchall()
```

## 📝 代码统计

- **Python文件**: 32个
- **代码行数**: ~8000行
- **测试文件**: 7个
- **数据库表**: 22个
- **文档**: 5个主要文档

## 🎯 下一步计划

### Phase 3: Git/GitHub集成增强
- 自动记录Git操作
- 自动关联Issue/PR
- Artifacts存储

### Phase 4: 外部调度器接口
- CLI标准化
- JSON输出格式
- 幂等性保证
- Lobster集成

## 📖 更多信息

- 详细使用方法：查看 [QUICKSTART.md](QUICKSTART.md)
- 架构设计：查看 [ARCHITECTURE.md](ARCHITECTURE.md)
- 数据库结构：查看 [DATABASE_SCHEMA_SUMMARY.md](DATABASE_SCHEMA_SUMMARY.md)
- 实施状态：查看 [IMPLEMENTATION_STATUS_UPDATED.md](IMPLEMENTATION_STATUS_UPDATED.md)

## 🙏 致谢

本项目实现了完整的workflow编排系统，支持：
- ✅ 步骤并行执行（场景2）
- ✅ 多workflow并发（场景3）
- ✅ 完整的依赖管理
- ✅ 资源锁协调
- ✅ 数据库持久化

Phase 2 完成度：**100%**
