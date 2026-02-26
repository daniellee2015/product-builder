# Product Builder - 快速开始指南

## 概述

Product Builder CLI是一个workflow编排工具，支持：
- 步骤并行执行（场景2）
- 多workflow并发（场景3）
- 依赖管理和资源锁
- 完整的数据库追踪

## 安装和初始化

### 1. 初始化数据库

```bash
cd scripts/python
python3 init_database.py
```

这将创建22个数据库表，包括：
- 核心workflow表（jobs, step_executions, etc.）
- 调度表（job_dependencies, job_leases, resource_locks）
- Git/GitHub集成表

### 2. 验证安装

```bash
# 运行测试套件
python3 test_scheduler.py
python3 test_parallel_execution.py
python3 test_multi_worker.py
```

## 使用场景

### 场景1：顺序执行Workflow（默认模式）

```python
from orchestrator import WorkflowOrchestrator

# 创建orchestrator
orchestrator = WorkflowOrchestrator(
    workflow_path="../../src/config/workflow.json",
    job_id="job-001",
    llm_provider="codex"
)

# 执行workflow
orchestrator.execute()
```

### 场景2：并行执行Workflow步骤

```python
from orchestrator import WorkflowOrchestrator

# 启用并行执行
orchestrator = WorkflowOrchestrator(
    workflow_path="../../src/config/workflow.json",
    job_id="job-002",
    llm_provider="codex",
    parallel_execution=True,  # 启用并行
    max_workers=4             # 最多4个并发步骤
)

# 执行workflow（自动并行化独立步骤）
orchestrator.execute()
```

**工作原理**：
1. StepDependencyAnalyzer分析workflow的transitions
2. 构建依赖图并进行拓扑排序
3. 识别可并行的步骤（无依赖关系）
4. ParallelStepExecutor使用ThreadPoolExecutor并发执行
5. 资源锁防止冲突

### 场景3：多Worker并发执行

#### 方式A：使用Worker类

```python
from worker import Worker
from workflow_db_scheduler import SchedulerDatabase

# 创建worker
scheduler_db = SchedulerDatabase()
worker = Worker(
    scheduler_db=scheduler_db,
    worker_id="worker-1",  # 可选，自动生成
    heartbeat_interval=30,
    lease_duration=300
)

# 启动worker（处理最多10个job）
worker.start(max_jobs=10)
```

#### 方式B：在多个tmux窗格中运行

```bash
# 窗格1
cd scripts/python
python3 -c "
from worker import Worker
from workflow_db_scheduler import SchedulerDatabase
worker = Worker(SchedulerDatabase())
worker.start()
"

# 窗格2
cd scripts/python
python3 -c "
from worker import Worker
from workflow_db_scheduler import SchedulerDatabase
worker = Worker(SchedulerDatabase())
worker.start()
"

# 窗格3
cd scripts/python
python3 -c "
from worker import Worker
from workflow_db_scheduler import SchedulerDatabase
worker = Worker(SchedulerDatabase())
worker.start()
"
```

**工作原理**：
1. 每个Worker注册唯一ID
2. Worker查询runnable jobs（依赖已满足）
3. 通过job lease机制claim job
4. 执行job并释放lease
5. 发送心跳表明存活

### 场景4：Job依赖管理

```python
from workflow_db_scheduler import SchedulerDatabase

scheduler_db = SchedulerDatabase()

# 创建job依赖链
# job-2依赖job-1完成
scheduler_db.add_job_dependency(
    job_id="job-2",
    depends_on_job_id="job-1",
    dependency_type="finish"
)

# job-3依赖job-2完成
scheduler_db.add_job_dependency(
    job_id="job-3",
    depends_on_job_id="job-2",
    dependency_type="finish"
)

# 调度器会自动按依赖顺序执行：job-1 -> job-2 -> job-3
```

### 场景5：资源锁管理

```python
from workflow_db_scheduler import SchedulerDatabase

scheduler_db = SchedulerDatabase()

# 获取exclusive lock（独占）
success = scheduler_db.acquire_lock(
    lock_key="repo-main",
    mode="exclusive",
    owner_job_id="job-1"
)

if success:
    # 执行需要独占访问的操作
    # ...

    # 释放锁
    scheduler_db.release_lock("repo-main", "job-1")

# 获取shared lock（共享）
scheduler_db.acquire_lock(
    lock_key="config-file",
    mode="shared",
    owner_job_id="job-2"
)
```

## 高级用法

### 依赖分析

```python
from step_dependency_analyzer import StepDependencyAnalyzer

# 分析workflow
analyzer = StepDependencyAnalyzer(workflow_def)

# 获取执行层级
levels = analyzer.get_execution_levels()
# 输出: [['step-1', 'step-2'], ['step-3'], ['step-4']]

# 检查循环依赖
has_cycle = analyzer.has_circular_dependency()

# 计算关键路径
critical_path = analyzer.get_critical_path()
```

### 调度器统计

```python
from scheduler import LocalScheduler

scheduler = LocalScheduler()

# 获取统计信息
stats = scheduler.get_scheduler_stats()
print(f"Active jobs: {stats['active_jobs']}")
print(f"Pending jobs: {stats['pending_jobs']}")
print(f"Completed jobs: {stats['completed_jobs']}")
```

### Worker状态监控

```python
from worker import Worker

worker = Worker(scheduler_db)

# 获取worker状态
status = worker.get_status()
print(f"Worker ID: {status['worker_id']}")
print(f"Running: {status['running']}")
print(f"Current job: {status['current_job']}")
print(f"Last heartbeat: {status['last_heartbeat']}")
```

## 数据库查询

### 查询Job状态

```python
from workflow_db_phase1 import WorkflowDatabase

db = WorkflowDatabase()

# 获取job信息
job = db.conn.execute("""
    SELECT job_id, workflow_id, status, created_at
    FROM jobs
    WHERE job_id = ?
""", ("job-001",)).fetchone()
```

### 查询Step执行历史

```python
# 获取job的所有step执行记录
executions = db.conn.execute("""
    SELECT step_id, status, started_at, completed_at
    FROM step_executions
    WHERE job_id = ?
    ORDER BY started_at
""", ("job-001",)).fetchall()
```

### 查询资源锁状态

```python
from workflow_db_scheduler import SchedulerDatabase

scheduler_db = SchedulerDatabase()

# 查询当前所有锁
locks = scheduler_db.conn.execute("""
    SELECT lock_key, lock_mode, owner_job_id, acquired_at
    FROM resource_locks
    WHERE expires_at IS NULL OR expires_at > datetime('now')
""").fetchall()
```

## 配置选项

### WorkflowOrchestrator参数

```python
orchestrator = WorkflowOrchestrator(
    workflow_path="workflow.json",      # Workflow定义文件
    job_id="job-001",                   # 唯一job ID
    llm_provider="codex",               # LLM provider
    auto_approve=False,                 # 自动批准（跳过人工审批）
    strict_transitions=False,           # 严格转换模式
    use_database=True,                  # 使用数据库记录
    parallel_execution=False,           # 并行执行模式
    max_workers=4                       # 最大并发worker数
)
```

### LocalScheduler参数

```python
scheduler = LocalScheduler(
    max_concurrent_jobs=3,    # 最大并发job数
    lease_duration=300,       # Lease持续时间（秒）
    poll_interval=5           # 轮询间隔（秒）
)
```

### Worker参数

```python
worker = Worker(
    scheduler_db=scheduler_db,
    worker_id="custom-worker-1",  # 自定义worker ID
    heartbeat_interval=30,        # 心跳间隔（秒）
    lease_duration=300            # Job lease持续时间（秒）
)
```

## 故障排查

### 问题1：数据库表不存在

```bash
# 重新初始化数据库
python3 init_database.py
```

### 问题2：Job一直pending

检查依赖是否满足：
```python
scheduler_db = SchedulerDatabase()
deps = scheduler_db.get_job_dependencies("job-id")
print(f"Dependencies: {deps}")
```

### 问题3：资源锁冲突

查看当前锁状态：
```python
locks = scheduler_db.conn.execute("""
    SELECT * FROM resource_locks
    WHERE lock_key = ?
""", ("lock-key",)).fetchall()
```

### 问题4：Worker无法claim job

检查lease状态：
```python
leases = scheduler_db.conn.execute("""
    SELECT * FROM job_leases
    WHERE job_id = ?
""", ("job-id",)).fetchall()
```

## 性能优化

### 1. 调整并发数

```python
# 增加并发worker数以提高吞吐量
orchestrator = WorkflowOrchestrator(
    ...,
    parallel_execution=True,
    max_workers=8  # 根据CPU核心数调整
)
```

### 2. 优化lease duration

```python
# 短任务使用较短的lease
worker = Worker(
    scheduler_db=scheduler_db,
    lease_duration=60  # 1分钟
)
```

### 3. 批量操作

```python
# 使用事务批量插入
with scheduler_db.conn:
    for i in range(100):
        scheduler_db.add_job_dependency(...)
```

## 下一步

- 查看 `DATABASE_SCHEMA_SUMMARY.md` 了解数据库结构
- 查看 `IMPLEMENTATION_STATUS_UPDATED.md` 了解实现状态
- 运行测试文件了解更多用法示例
- 阅读源代码中的docstring

## 支持

如有问题，请查看：
- 测试文件中的示例代码
- 数据库schema文档
- 实现状态文档
