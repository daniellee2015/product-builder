# Workflow修正方案：Job ID生成时机

## 问题分析

### 当前workflow中的P1-CREATE_JOB步骤

```json
{
  "id": "P1-CREATE_JOB",
  "name": "Create Job",
  "description": "Create job directory and metadata file.",
  "input": [
    "CCB_REQ_ID",
    "exports/jobs/{job_id}/analysis/existing-work.json",
    "exports/jobs/{job_id}/analysis/capability-tree.json"
  ],
  "output": [
    "exports/jobs/{job_id}/metadata.json"
  ]
}
```

**问题：**
1. 这个步骤在Phase 1执行
2. 但input中已经使用了 `{job_id}` 占位符
3. 这意味着job_id应该在这个步骤之前就存在
4. 与步骤名称"Create Job"矛盾

### 旧架构（基于文件）的逻辑

```
P0: 收集需求
    ↓
P1-CREATE_JOB: 创建job目录和metadata.json
    ↓ 生成job_id
P1-CREATE_GIT_BRANCH: 使用job_id创建分支
    ↓
P2: 执行任务
```

**特点：**
- Job ID在P1阶段生成
- 基于文件系统（exports/jobs/{job_id}/）
- metadata.json存储job信息

### 新架构（数据库驱动）的逻辑

```
用户启动workflow
    ↓ 立即创建job记录
Job ID生成（在数据库中）
    ↓
P0: 收集需求（job_id已存在）
    ↓
P1: 规划（job_id已存在）
    ↓
P2: 执行任务
```

**特点：**
- Job ID在workflow开始前生成
- 基于数据库存储
- 实时状态更新

## 修正方案

### 方案A：重命名P1-CREATE_JOB（推荐）

**将"Create Job"改为"Initialize Job Workspace"**

```json
{
  "id": "P1-INITIALIZE_JOB_WORKSPACE",  // 改名
  "name": "Initialize Job Workspace",    // 改名
  "description": "Initialize job workspace directory and metadata file (job already created in database).",  // 更新描述
  "input": [
    "job_id",  // job_id作为输入（已存在）
    "CCB_REQ_ID",
    "exports/jobs/{job_id}/analysis/existing-work.json",
    "exports/jobs/{job_id}/analysis/capability-tree.json"
  ],
  "output": [
    "exports/jobs/{job_id}/metadata.json",
    "exports/jobs/{job_id}/workspace/"
  ],
  "actions": [
    "Create job directory structure",
    "Generate metadata.json from database job record",
    "Initialize workspace directories"
  ]
}
```

**变化：**
- ✅ 步骤名称更准确
- ✅ 明确job_id是输入（已存在）
- ✅ 描述说明job已在数据库中创建
- ✅ 功能变为初始化工作空间，而非创建job

### 方案B：移除P1-CREATE_JOB步骤

**如果不需要文件系统工作空间，可以完全移除**

```json
// 移除这个步骤
// {
//   "id": "P1-CREATE_JOB",
//   ...
// }

// P1-CREATE_GIT_BRANCH直接使用数据库中的job_id
{
  "id": "P1-CREATE_GIT_BRANCH",
  "name": "Create Git Branch",
  "description": "Create working branch for this job.",
  "input": [
    "job_id"  // 直接从数据库获取
  ],
  "output": [
    "git.branch.name"
  ]
}
```

## 新的执行流程

### 1. 用户启动workflow

```bash
$ pb start "Build authentication feature"
```

### 2. 系统立即创建job（在workflow执行前）

```python
# 在WorkflowExecutor.start()中
def start_workflow(requirement: str, mode: str = "standard"):
    # 1. 立即创建job记录
    job = {
        "job_id": generate_job_id(),  # job_20260226_001
        "workflow_id": "product-builder-cli-standard",
        "requirement": requirement,
        "mode": mode,
        "status": "pending",
        "created_at": datetime.now(),
        "current_phase": None,
        "current_step": None
    }

    # 2. 保存到数据库
    db.insert_job(job)

    # 3. 开始执行workflow
    job["status"] = "running"
    db.update_job(job)

    # 4. 执行Phase 0（job_id已存在）
    execute_phase(job, "P0")

    # 5. 执行Phase 1（job_id已存在）
    execute_phase(job, "P1")
    # P1-INITIALIZE_JOB_WORKSPACE使用job_id创建工作空间

    return job["job_id"]
```

### 3. Phase 1执行

```python
def execute_phase_1(job):
    # P1-01: Find existing work
    execute_step(job, "P1-FIND_EXISTING_WORK")

    # P1-02: Update capability tree
    execute_step(job, "P1-UPDATE_CAPABILITY_TREE")

    # P1-03: Initialize job workspace（新名称）
    # job_id已经存在，只是创建文件系统结构
    execute_step(job, "P1-INITIALIZE_JOB_WORKSPACE")

    # P1-04: Create git branch
    # 使用job_id创建分支
    execute_step(job, "P1-CREATE_GIT_BRANCH")

    # ... 其他步骤
```

## 需要修改的文件

### 1. workflow.json

**修改所有模式中的步骤ID：**

```json
// Lite模式
"enabled_steps": [
  "P0-COLLECT_USER_REQUIREMENT",
  "P0-DETECT_REQUIREMENT_TYPE",
  "P0-FEATURE_BREAKDOWN",
  "P0-GENERATE_REQUIREMENT_DOCUMENT",
  "P1-INITIALIZE_JOB_WORKSPACE",  // 改名
  "P1-CREATE_GIT_BRANCH",
  // ...
]

// Standard模式
"enabled_steps": [
  // ...
  "P1-FIND_EXISTING_WORK",
  "P1-UPDATE_CAPABILITY_TREE",
  "P1-INITIALIZE_JOB_WORKSPACE",  // 改名
  "P1-CREATE_GIT_BRANCH",
  // ...
]

// Full模式
"enabled_steps": [
  // ...
  "P1-INITIALIZE_JOB_WORKSPACE",  // 改名
  // ...
]
```

**修改步骤定义：**

```json
{
  "id": "P1-INITIALIZE_JOB_WORKSPACE",
  "name": "Initialize Job Workspace",
  "description": "Initialize job workspace directory and metadata file (job already created in database).",
  "input": [
    "job_id",
    "CCB_REQ_ID",
    "exports/jobs/{job_id}/analysis/existing-work.json",
    "exports/jobs/{job_id}/analysis/capability-tree.json"
  ],
  "output": [
    "exports/jobs/{job_id}/metadata.json",
    "exports/jobs/{job_id}/workspace/"
  ],
  "min_mode": "lite",
  "required_tools": ["ccb"]
}
```

**修改transitions：**

```json
// 查找所有引用P1-CREATE_JOB的transition
// 替换为P1-INITIALIZE_JOB_WORKSPACE
{
  "from": "P1-UPDATE_CAPABILITY_TREE",
  "to": "P1-INITIALIZE_JOB_WORKSPACE"  // 改名
}
```

### 2. WorkflowExecutor

```python
# scripts/python/workflow_executor.py

class WorkflowExecutor:
    def start_workflow(self, requirement: str, mode: str = "standard"):
        """Start a new workflow execution"""

        # 1. 立即创建job（在workflow执行前）
        job_id = self._create_job(requirement, mode)

        # 2. 加载workflow定义
        workflow = self._load_workflow(mode)

        # 3. 开始执行
        self._execute_workflow(job_id, workflow)

        return job_id

    def _create_job(self, requirement: str, mode: str) -> str:
        """Create job record in database"""
        job_id = f"job_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        job = {
            "job_id": job_id,
            "workflow_id": "product-builder-cli-standard",
            "requirement": requirement,
            "mode": mode,
            "status": "pending",
            "created_at": datetime.now().isoformat(),
            "current_phase": None,
            "current_step": None
        }

        # 保存到数据库
        self.db.create_job(job)

        return job_id

    def _execute_workflow(self, job_id: str, workflow: dict):
        """Execute workflow phases"""

        # 更新状态为running
        self.db.update_job_status(job_id, "running")

        # 执行各个phase
        for phase in workflow["phases"]:
            self._execute_phase(job_id, phase)
```

### 3. CLI命令

```typescript
// src/cli/jobs-tasks/start.ts

export async function startWorkflowInteractive(): Promise<void> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'requirement',
      message: 'Enter requirement:',
    },
    {
      type: 'list',
      name: 'mode',
      message: 'Select workflow mode:',
      choices: ['lite', 'standard', 'full']
    }
  ]);

  console.log(chalk.blue('\nStarting workflow...'));

  const engine = createWorkflowEngine();

  // start_workflow会立即创建job并返回job_id
  const result = await engine.runWorkflow('src/config/workflow.json', {
    context: {
      requirement: answers.requirement,
      mode: answers.mode
    }
  });

  if (result.success && result.data) {
    console.log(chalk.green(`✅ Workflow started!`));
    console.log(chalk.cyan(`Job ID: ${result.data.job_id}`));
    console.log(chalk.gray(`Status: ${result.data.status}`));
  }
}
```

## 兼容性考虑

### 如果需要保持文件系统兼容

如果现有工具依赖 `exports/jobs/{job_id}/` 目录结构：

```python
def execute_step_initialize_workspace(job_id: str, context: dict):
    """Initialize job workspace (P1-INITIALIZE_JOB_WORKSPACE)"""

    # 1. 创建目录结构
    job_dir = f"exports/jobs/{job_id}"
    os.makedirs(f"{job_dir}/analysis", exist_ok=True)
    os.makedirs(f"{job_dir}/workspace", exist_ok=True)
    os.makedirs(f"{job_dir}/logs", exist_ok=True)

    # 2. 从数据库读取job信息
    job = db.get_job(job_id)

    # 3. 生成metadata.json（从数据库同步）
    metadata = {
        "job_id": job["job_id"],
        "requirement": job["requirement"],
        "mode": job["mode"],
        "created_at": job["created_at"],
        "status": job["status"]
    }

    with open(f"{job_dir}/metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    # 4. 复制分析结果到工作空间
    # ...
```

## 总结

### 关键变化

1. **Job ID生成时机**
   - 旧：在P1-CREATE_JOB步骤中生成
   - 新：在workflow开始前生成

2. **P1-CREATE_JOB步骤**
   - 旧：创建job和生成job_id
   - 新：重命名为P1-INITIALIZE_JOB_WORKSPACE，只初始化工作空间

3. **数据存储**
   - 旧：主要依赖文件系统
   - 新：主要依赖数据库，文件系统作为辅助

### 修改清单

- [ ] 修改workflow.json中的步骤ID（P1-CREATE_JOB → P1-INITIALIZE_JOB_WORKSPACE）
- [ ] 更新所有模式的enabled_steps
- [ ] 更新transitions
- [ ] 修改WorkflowExecutor，在start_workflow时立即创建job
- [ ] 实现P1-INITIALIZE_JOB_WORKSPACE步骤（初始化工作空间）
- [ ] 更新CLI命令
- [ ] 测试完整流程

这样就能让workflow与新的数据库驱动架构匹配了！
