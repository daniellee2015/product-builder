# Phase 2.3: 集成调度器和步骤并行执行

## 目标

将LocalScheduler集成到WorkflowOrchestrator中，实现：
1. 步骤并行执行（workflow内）
2. 多workflow并发支持
3. 资源锁管理

## 当前状态

**已完成：**
- ✅ 数据库架构（22个表）
- ✅ SchedulerDatabase适配器
- ✅ LocalScheduler核心功能

**当前orchestrator.py：**
- 顺序执行步骤
- 转换驱动的控制流
- 状态持久化
- 代码审查循环

## 实施计划

### 1. 分析步骤依赖关系

**目标：**从workflow的transitions构建步骤依赖图

**实现：**
```python
class StepDependencyAnalyzer:
    def __init__(self, workflow_def):
        self.workflow_def = workflow_def

    def build_dependency_graph(self):
        """构建步骤依赖图"""
        # 分析transitions，识别哪些步骤可以并行
        # 返回：{step_id: [depends_on_step_ids]}

    def get_parallel_groups(self):
        """获取可以并行执行的步骤组"""
        # 返回：[[step1, step2], [step3], [step4, step5]]
```

### 2. 步骤并行执行器

**目标：**在workflow内并行执行独立的步骤

**实现：**
```python
class ParallelStepExecutor:
    def __init__(self, orchestrator, max_parallel=3):
        self.orchestrator = orchestrator
        self.max_parallel = max_parallel

    def execute_parallel_group(self, steps):
        """并行执行一组步骤"""
        # 使用ThreadPoolExecutor或ProcessPoolExecutor
        # 每个步骤获取必要的资源锁
        # 等待所有步骤完成
```

### 3. 修改WorkflowOrchestrator

**需要修改的方法：**

#### 3.1 __init__
```python
def __init__(self, ...):
    # 添加
    self.scheduler = LocalScheduler() if use_scheduler else None
    self.dependency_analyzer = StepDependencyAnalyzer(workflow_def)
    self.parallel_executor = ParallelStepExecutor(self, max_parallel=3)
```

#### 3.2 execute()
```python
def execute(self):
    # 选项A：保持现有的顺序执行逻辑
    # 选项B：使用并行执行逻辑

    if self.enable_parallel:
        self._execute_parallel()
    else:
        self._execute_sequential()  # 现有逻辑
```

#### 3.3 新增_execute_parallel()
```python
def _execute_parallel(self):
    """并行执行workflow"""
    parallel_groups = self.dependency_analyzer.get_parallel_groups()

    for group in parallel_groups:
        if len(group) == 1:
            # 单个步骤，直接执行
            self._execute_step(group[0])
        else:
            # 多个步骤，并行执行
            self.parallel_executor.execute_parallel_group(group)
```

### 4. 资源锁集成

**需要锁定的资源：**
- Git repository（exclusive）
- Worktree（exclusive）
- LLM provider（shared，但有rate limit）

**实现：**
```python
def _execute_step_with_locks(self, step):
    """执行步骤并管理资源锁"""
    # 1. 识别需要的资源
    resources = self._identify_required_resources(step)

    # 2. 获取锁
    locks_acquired = []
    for resource, mode in resources:
        if self.scheduler.acquire_resource_lock(self.job_id, resource, mode):
            locks_acquired.append(resource)
        else:
            # 释放已获取的锁
            for lock in locks_acquired:
                self.scheduler.scheduler_db.release_lock(lock, self.job_id)
            raise ResourceLockError(f"Cannot acquire lock: {resource}")

    try:
        # 3. 执行步骤
        result = self._execute_step(step)
        return result
    finally:
        # 4. 释放锁
        for resource in locks_acquired:
            self.scheduler.scheduler_db.release_lock(resource, self.job_id)
```

## 实施步骤

### Step 1: 创建StepDependencyAnalyzer
**文件：** `scripts/python/step_dependency_analyzer.py`
**预计时间：** 1小时

### Step 2: 创建ParallelStepExecutor
**文件：** `scripts/python/parallel_step_executor.py`
**预计时间：** 1-2小时

### Step 3: 修改WorkflowOrchestrator
**文件：** `scripts/python/orchestrator.py`
**预计时间：** 2-3小时

### Step 4: 测试并行执行
**文件：** `scripts/python/test_parallel_execution.py`
**预计时间：** 1小时

## 测试场景

### 场景1：简单并行
```json
{
  "steps": [
    {"id": "step-1", "tool": "test"},
    {"id": "step-2", "tool": "test"},
    {"id": "step-3", "tool": "test"}
  ],
  "transitions": [
    {"from": "START", "to": "step-1"},
    {"from": "START", "to": "step-2"},
    {"from": "step-1", "to": "step-3"},
    {"from": "step-2", "to": "step-3"}
  ]
}
```
**预期：** step-1和step-2并行执行，然后step-3执行

### 场景2：资源冲突
```json
{
  "steps": [
    {"id": "git-1", "tool": "git", "repo": "test/repo"},
    {"id": "git-2", "tool": "git", "repo": "test/repo"}
  ]
}
```
**预期：** git-1和git-2串行执行（同一repo的exclusive lock）

### 场景3：混合并行
```json
{
  "steps": [
    {"id": "test-1", "tool": "test"},
    {"id": "test-2", "tool": "test"},
    {"id": "git-1", "tool": "git"},
    {"id": "review-1", "tool": "review"}
  ]
}
```
**预期：** test-1, test-2, git-1可以并行，review-1等待前面完成

## 注意事项

1. **向后兼容**：保持现有的顺序执行模式作为默认
2. **错误处理**：并行执行时，一个步骤失败不应影响其他步骤
3. **状态同步**：确保并行步骤的状态正确记录到数据库
4. **资源清理**：确保异常时正确释放所有锁

## 成功标准

- [ ] 可以识别workflow中可并行的步骤
- [ ] 可以并行执行独立的步骤
- [ ] 资源锁正确防止冲突
- [ ] 所有测试场景通过
- [ ] 向后兼容现有workflow

---

**当前位置：** 准备开始Step 1
**下一步：** 创建StepDependencyAnalyzer
