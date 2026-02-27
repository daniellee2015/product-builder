# Product Builder - 当前状态和实施计划

## 📊 当前进展状态

### ✅ 已完成（Phase 0-1）

#### 1. 数据库架构 (100%)
- **22个表已创建并测试通过**
  - 13个核心workflow表
  - 4个Git/GitHub集成表
  - 4个调度支持表
  - 1个系统表
- **Migration系统**：3个migration已应用
- **测试脚本**：所有表功能验证通过

#### 2. 基础执行引擎 (80%)
- **orchestrator.py** - 基础workflow执行器
  - ✅ Workflow加载和解析
  - ✅ 步骤执行（顺序）
  - ✅ 转换驱动的控制流
  - ✅ 状态持久化（JSON + 数据库）
  - ✅ 代码审查循环（score-based retry）
  - ✅ 人工审批支持
  - ✅ Resume from checkpoint
  - ❌ 步骤并行执行（未实现）
  - ❌ 调度器集成（未实现）

#### 3. 数据库适配器 (60%)
- **workflow_db_phase1.py** - Phase 1表操作
  - ✅ 基础CRUD操作
  - ✅ Project/Workflow/Job管理
  - ✅ Step execution记录
  - ✅ Review结果存储
  - ✅ LLM交互记录
  - ❌ 调度表操作（未实现）
  - ❌ Git/GitHub表操作（未实现）

#### 4. 适配器层 (50%)
- **adapters/** - 工具适配器
  - ✅ GitAdapter - Git操作
  - ✅ GitHubAdapter - GitHub操作
  - ✅ TestAdapter - 测试工具
  - ❌ 其他LLM provider适配器（未实现）

---

## 🎯 下一步实施计划

### Phase 2: 本地调度器实现（当前阶段）

#### 2.1 扩展数据库适配器 (P0)
**目标**：支持调度表操作

**需要实现的方法：**
```python
# job_dependencies
- add_job_dependency(job_id, depends_on_job_id, dependency_type)
- get_job_dependencies(job_id)
- get_dependent_jobs(job_id)
- check_dependencies_satisfied(job_id)

# job_leases
- acquire_lease(job_id, owner, duration_seconds)
- renew_lease(job_id, owner)
- release_lease(job_id, owner)
- get_expired_leases()

# resource_locks
- acquire_lock(lock_key, mode, owner_job_id, owner_step_id)
- release_lock(lock_key, owner_job_id)
- check_lock_available(lock_key, mode)
- get_job_locks(job_id)

# scheduler_events
- record_event(job_id, event_type, payload)
- get_job_events(job_id)
```

**文件**：`scripts/python/workflow_db_scheduler.py`

#### 2.2 实现本地调度器 (P0)
**目标**：支持场景2-3（步骤并行、多workflow并发）

**核心组件：**
```python
class LocalScheduler:
    """本地调度器 - 管理job队列和并发执行"""

    def __init__(self, db, max_concurrent_jobs=3):
        self.db = db
        self.max_concurrent_jobs = max_concurrent_jobs
        self.worker_id = generate_worker_id()

    # 核心方法
    def find_runnable_jobs()  # 查找可运行的job
    def claim_job(job_id)     # 认领job
    def dispatch_job(job_id)  # 分发job执行
    def check_dependencies()  # 检查依赖
    def manage_resources()    # 资源管理
```

**文件**：`scripts/python/scheduler.py`

#### 2.3 步骤并行执行 (P0)
**目标**：workflow内的步骤可以并行执行

**实现方式：**
- 分析workflow的transition graph
- 识别可并行的步骤（无依赖关系）
- 使用线程池或进程池并行执行
- 资源锁防止冲突

**修改文件**：`scripts/python/orchestrator.py`

#### 2.4 多Worker支持 (P0)
**目标**：支持多个tmux窗格同时运行

**实现方式：**
- Worker注册和心跳
- Job lease机制
- 资源锁协调
- 状态同步

**新增文件**：`scripts/python/worker.py`

---

### Phase 3: Git/GitHub集成增强 (P1)

#### 3.1 扩展数据库适配器
**文件**：`scripts/python/workflow_db_git.py`

**方法：**
- record_git_operation()
- link_github_issue()
- link_github_pr()
- store_artifact()

#### 3.2 增强Git/GitHub适配器
- 自动记录所有git操作到数据库
- 自动关联issue和PR
- 自动存储artifacts

---

### Phase 4: 外部调度器接口 (P2)

#### 4.1 CLI接口标准化
**命令：**
```bash
product-builder run <workflow> --job-id <id>
product-builder resume <job-id>
product-builder cancel <job-id>
product-builder status <job-id>
product-builder logs <job-id>
```

#### 4.2 API接口
- JSON输出标准化
- 状态码标准化
- 幂等性保证

---

## 📋 立即要做的事情（Phase 2.1-2.2）

### 1. 创建调度器数据库适配器
**文件**：`workflow_db_scheduler.py`
**预计时间**：1-2小时

### 2. 实现基础调度器
**文件**：`scheduler.py`
**预计时间**：2-3小时

### 3. 集成到orchestrator
**修改**：`orchestrator.py`
**预计时间**：1-2小时

### 4. 测试调度功能
**文件**：`test_scheduler.py`
**预计时间**：1小时

---

## 🎯 成功标准

### Phase 2完成标准：
- [ ] 可以创建有依赖关系的多个job
- [ ] 调度器自动按依赖顺序执行
- [ ] 支持2-3个worker并发执行
- [ ] 资源锁防止冲突
- [ ] 所有操作记录到数据库

### 测试场景：
```bash
# 场景1：依赖链
job-1 (独立) -> job-2 (依赖job-1) -> job-3 (依赖job-2)

# 场景2：并行执行
job-4 (独立) 和 job-5 (独立) 同时运行

# 场景3：资源冲突
job-6 和 job-7 都需要同一个repo，必须串行
```

---

## 📁 文件结构

```
scripts/python/
├── orchestrator.py              # 主执行器（已有，需修改）
├── scheduler.py                 # 本地调度器（新建）
├── worker.py                    # Worker进程（新建）
├── workflow_db_phase1.py        # Phase 1数据库操作（已有）
├── workflow_db_scheduler.py     # 调度器数据库操作（新建）
├── workflow_db_git.py           # Git/GitHub数据库操作（新建）
├── test_scheduler.py            # 调度器测试（新建）
└── adapters/
    ├── git_adapter.py           # Git适配器（已有）
    ├── github_adapter.py        # GitHub适配器（已有）
    └── test_adapter.py          # 测试适配器（已有）
```

---

**当前位置**：Phase 2.1 开始
**下一步**：创建 `workflow_db_scheduler.py`
