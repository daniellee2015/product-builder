# Product Builder - 系统架构

## 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Product Builder CLI                       │
└─────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
            ┌───────▼────────┐       ┌───────▼────────┐
            │  Orchestrator  │       │     Worker     │
            │   (执行层)      │       │   (分布式层)    │
            └───────┬────────┘       └───────┬────────┘
                    │                        │
        ┌───────────┼────────────┬───────────┘
        │           │            │
┌───────▼──────┐ ┌──▼──────┐ ┌──▼──────────┐
│  Sequential  │ │Parallel │ │LocalScheduler│
│    Mode      │ │  Mode   │ │  (调度层)    │
└──────────────┘ └────┬────┘ └──────┬───────┘
                      │             │
              ┌───────▼──────┐ ┌────▼─────────┐
              │ParallelStep  │ │  Scheduler   │
              │  Executor    │ │   Database   │
              └───────┬──────┘ └──────┬───────┘
                      │               │
              ┌───────▼──────┐        │
              │StepDependency│        │
              │  Analyzer    │        │
              └──────────────┘        │
                                      │
                    ┌─────────────────▼─────────────────┐
                    │         SQLite Database            │
                    │  (22 tables, WAL mode)            │
                    └───────────────────────────────────┘
```

## 层次结构

### 1. 执行层 (Execution Layer)

**WorkflowOrchestrator**
- 职责：Workflow执行的主入口
- 模式：
  - Sequential Mode（默认）：顺序执行步骤
  - Parallel Mode：并行执行独立步骤
- 功能：
  - Workflow加载和解析
  - 转换驱动的控制流
  - 状态持久化
  - 代码审查循环
  - 人工审批支持

### 2. 并行执行层 (Parallel Execution Layer)

**ParallelStepExecutor**
- 职责：并发执行workflow步骤
- 技术：ThreadPoolExecutor
- 功能：
  - 执行层级调度
  - 资源锁管理
  - 错误处理
  - 执行统计

**StepDependencyAnalyzer**
- 职责：分析步骤依赖关系
- 算法：拓扑排序
- 功能：
  - 依赖图构建
  - 循环依赖检测
  - 关键路径计算
  - 并行机会识别

### 3. 调度层 (Scheduling Layer)

**LocalScheduler**
- 职责：Job队列管理和调度
- 功能：
  - 依赖解析
  - Job lease管理
  - 资源锁协调
  - Runnable jobs查询

**SchedulerDatabase**
- 职责：调度数据持久化
- 表：
  - job_dependencies：Job依赖关系
  - job_leases：Job租约
  - resource_locks：资源锁
  - scheduler_events：调度事件

### 4. 分布式层 (Distributed Layer)

**Worker**
- 职责：分布式job执行
- 功能：
  - Worker注册
  - 心跳机制
  - Job claiming
  - 状态监控

### 5. 数据层 (Data Layer)

**SQLite Database (22 tables)**

**核心Workflow表 (13)**：
- projects：项目
- workflow_definitions：Workflow定义
- workflow_steps：步骤定义
- workflow_transitions：转换定义
- jobs：Job实例
- step_executions：步骤执行记录
- transition_history：转换历史
- job_variables：Job变量
- review_results：审查结果
- review_findings：审查发现
- llm_interactions：LLM交互
- config_entries：配置
- error_events：错误事件

**Git/GitHub表 (4)**：
- git_operations：Git操作
- github_issues：GitHub Issue
- github_pull_requests：GitHub PR
- artifacts：制品

**调度表 (4)**：
- job_dependencies：Job依赖
- job_leases：Job租约
- resource_locks：资源锁
- scheduler_events：调度事件

**系统表 (1)**：
- schema_migrations：Schema版本

## 数据流

### 场景1：顺序执行

```
User
  │
  ├─> WorkflowOrchestrator.execute()
  │     │
  │     ├─> _load_workflow()
  │     ├─> _execute_with_transitions()
  │     │     │
  │     │     ├─> _execute_step(step-1)
  │     │     ├─> _execute_step(step-2)
  │     │     └─> _execute_step(step-3)
  │     │
  │     └─> _save_state()
  │
  └─> WorkflowDatabase
        └─> SQLite
```

### 场景2：并行执行

```
User
  │
  ├─> WorkflowOrchestrator.execute(parallel=True)
  │     │
  │     ├─> _execute_parallel()
  │     │     │
  │     │     ├─> StepDependencyAnalyzer
  │     │     │     ├─> build_dependency_graph()
  │     │     │     └─> get_execution_levels()
  │     │     │           └─> [['step-1', 'step-2'], ['step-3']]
  │     │     │
  │     │     └─> ParallelStepExecutor
  │     │           ├─> execute_workflow_parallel()
  │     │           │     │
  │     │           │     ├─> Level 0: ThreadPool
  │     │           │     │     ├─> Thread 1: step-1
  │     │           │     │     └─> Thread 2: step-2
  │     │           │     │
  │     │           │     └─> Level 1: ThreadPool
  │     │           │           └─> Thread 1: step-3
  │     │           │
  │     │           └─> SchedulerDatabase
  │     │                 └─> acquire_lock() / release_lock()
  │     │
  │     └─> _save_state()
  │
  └─> WorkflowDatabase
        └─> SQLite
```

### 场景3：多Worker并发

```
Worker-1                    Worker-2                    Worker-3
   │                           │                           │
   ├─> start()                 ├─> start()                 ├─> start()
   │                           │                           │
   ├─> _send_heartbeat()       ├─> _send_heartbeat()       ├─> _send_heartbeat()
   │                           │                           │
   ├─> LocalScheduler          ├─> LocalScheduler          ├─> LocalScheduler
   │     │                     │     │                     │     │
   │     ├─> get_runnable_jobs()    ├─> get_runnable_jobs()    ├─> get_runnable_jobs()
   │     │     │                     │     │                     │     │
   │     │     └─> [job-1, job-2]   │     └─> [job-1, job-2]   │     └─> [job-1, job-2]
   │     │                           │                           │
   │     ├─> claim_job(job-1) ✓     ├─> claim_job(job-1) ✗     ├─> claim_job(job-2) ✓
   │     │     │                     │     │                     │     │
   │     │     └─> acquire_lease()  │     └─> (already leased)  │     └─> acquire_lease()
   │     │                           │                           │
   │     ├─> execute_job(job-1)     │     ├─> claim_job(job-2) ✗     ├─> execute_job(job-2)
   │     │                           │     │                           │
   │     └─> release_job(job-1)     │     └─> wait...                 └─> release_job(job-2)
   │                                 │                                 │
   └─> SchedulerDatabase             └─> SchedulerDatabase             └─> SchedulerDatabase
         └─> SQLite (shared)               └─> SQLite (shared)               └─> SQLite (shared)
```

## 资源锁机制

### Exclusive Lock（独占锁）

```
Job-1 requests exclusive lock on "repo-main"
  │
  ├─> SchedulerDatabase.acquire_lock()
  │     │
  │     ├─> check_lock_available()
  │     │     └─> No existing locks? ✓
  │     │
  │     └─> INSERT INTO resource_locks
  │           (lock_key='repo-main', mode='exclusive', owner='job-1')
  │
  └─> Lock acquired ✓

Job-2 requests exclusive lock on "repo-main"
  │
  ├─> SchedulerDatabase.acquire_lock()
  │     │
  │     ├─> check_lock_available()
  │     │     └─> Existing exclusive lock? ✗
  │     │
  │     └─> Lock denied ✗
  │
  └─> Wait or fail
```

### Shared Lock（共享锁）

```
Job-1 requests shared lock on "config-file"
  │
  ├─> SchedulerDatabase.acquire_lock()
  │     │
  │     ├─> check_lock_available()
  │     │     └─> No exclusive locks? ✓
  │     │
  │     └─> INSERT INTO resource_locks
  │           (lock_key='config-file', mode='shared', owner='job-1')
  │
  └─> Lock acquired ✓

Job-2 requests shared lock on "config-file"
  │
  ├─> SchedulerDatabase.acquire_lock()
  │     │
  │     ├─> check_lock_available()
  │     │     └─> Only shared locks exist? ✓
  │     │
  │     └─> INSERT INTO resource_locks
  │           (lock_key='config-file', mode='shared', owner='job-2')
  │
  └─> Lock acquired ✓

Job-3 requests exclusive lock on "config-file"
  │
  ├─> SchedulerDatabase.acquire_lock()
  │     │
  │     ├─> check_lock_available()
  │     │     └─> Existing shared locks? ✗
  │     │
  │     └─> Lock denied ✗
  │
  └─> Wait or fail
```

## Job依赖解析

```
Job Graph:
  job-1 (no deps)
  job-2 (depends on job-1)
  job-3 (depends on job-1)
  job-4 (depends on job-2, job-3)

Execution Order:
  Level 0: [job-1]
  Level 1: [job-2, job-3]  ← Can run in parallel
  Level 2: [job-4]

LocalScheduler.get_runnable_jobs():
  │
  ├─> Query jobs WHERE status='pending'
  │
  ├─> For each job:
  │     ├─> get_job_dependencies(job_id)
  │     ├─> Check if all dependencies satisfied
  │     └─> If yes, add to runnable list
  │
  └─> Return runnable jobs

Time T0: runnable = [job-1]
Time T1: runnable = [job-2, job-3]  (after job-1 completes)
Time T2: runnable = [job-4]         (after job-2 and job-3 complete)
```

## 心跳和Lease机制

```
Worker Lifecycle:
  │
  ├─> start()
  │     │
  │     ├─> Loop:
  │     │     │
  │     │     ├─> _send_heartbeat()
  │     │     │     └─> record_event(type='worker_heartbeat')
  │     │     │
  │     │     ├─> _claim_and_execute_job()
  │     │     │     │
  │     │     │     ├─> get_runnable_jobs()
  │     │     │     │
  │     │     │     ├─> claim_job(job_id)
  │     │     │     │     │
  │     │     │     │     ├─> acquire_lease(job_id, worker_id, duration=300s)
  │     │     │     │     │     │
  │     │     │     │     │     └─> INSERT INTO job_leases
  │     │     │     │     │           (job_id, owner=worker_id, expires_at=now+300s)
  │     │     │     │     │
  │     │     │     │     └─> If successful, return True
  │     │     │     │
  │     │     │     ├─> execute_job(job_id)
  │     │     │     │
  │     │     │     └─> release_job(job_id)
  │     │     │           └─> DELETE FROM job_leases WHERE job_id=?
  │     │     │
  │     │     └─> sleep(5s)
  │     │
  │     └─> Until stopped or max_jobs reached
  │
  └─> stop()
        └─> Release current job if any

Lease Expiration:
  - If worker crashes, lease expires after 300s
  - Other workers can then claim the job
  - Prevents jobs from being stuck forever
```

## 性能特性

### 并发性能

- **Sequential Mode**: 1 step at a time
- **Parallel Mode**: Up to N steps concurrently (N = max_workers)
- **Multi-Worker**: Up to M jobs concurrently (M = number of workers)

### 数据库性能

- **WAL Mode**: 允许并发读写
- **Busy Timeout**: 5000ms，处理锁竞争
- **Connection Pooling**: 每个进程一个连接
- **Transaction Batching**: 批量操作使用事务

### 资源使用

- **Memory**: ~50MB per worker process
- **CPU**: Depends on workflow complexity
- **Disk I/O**: SQLite database operations
- **Network**: LLM API calls

## 扩展性

### 水平扩展

- 增加Worker数量 → 提高job吞吐量
- 每个Worker独立运行
- 通过数据库协调

### 垂直扩展

- 增加max_workers → 提高单个workflow的并行度
- 增加max_concurrent_jobs → 提高调度器吞吐量

### 限制

- SQLite并发写入限制（~1000 writes/sec）
- 单机部署（不支持跨机器）
- 文件系统锁（同一文件系统）

## 未来架构演进

### Phase 3: Git/GitHub集成
```
WorkflowOrchestrator
  │
  ├─> GitAdapter
  │     └─> workflow_db_git.record_git_operation()
  │
  └─> GitHubAdapter
        └─> workflow_db_git.link_github_issue()
```

### Phase 4: 外部调度器接口
```
External Scheduler (e.g., Lobster)
  │
  ├─> product-builder run <workflow> --job-id <id>
  ├─> product-builder status <job-id>
  └─> product-builder cancel <job-id>
        │
        └─> WorkflowOrchestrator
              └─> LocalScheduler
                    └─> Worker Pool
```

## 总结

Product Builder CLI采用分层架构，支持：
- ✅ 灵活的执行模式（顺序/并行）
- ✅ 分布式job执行（多worker）
- ✅ 完整的依赖管理
- ✅ 资源锁协调
- ✅ 数据库持久化和追踪

架构设计原则：
- **模块化**：每层职责清晰
- **可扩展**：支持水平和垂直扩展
- **可靠性**：Lease机制防止job丢失
- **可追溯**：完整的数据库记录
