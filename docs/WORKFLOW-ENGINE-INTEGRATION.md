# Product Builder + Python Workflow Engine 整合说明

## 问题背景

之前构建的Python workflow系统是**独立的**，没有和Product Builder的TypeScript CLI整合。用户不清楚如何使用这个系统。

## 解决方案

将Python workflow系统作为Product Builder的**执行引擎**，通过TypeScript包装器调用Python CLI。

## 架构图

```
┌─────────────────────────────────────────────────────────────┐
│ Product Builder (TypeScript/Node.js)                        │
│                                                              │
│  用户命令:                                                    │
│  ├── pb start "Build feature"  → 启动workflow                │
│  ├── pb resume <job_id>        → 恢复workflow                │
│  ├── pb status                 → 查看状态                     │
│  └── pb logs <job_id>          → 查看日志                     │
│                                                              │
│  核心模块:                                                    │
│  ├── src/libs/workflow-engine.ts     (TypeScript包装器)      │
│  ├── src/orchestrator/index-python.ts (执行编排)             │
│  └── src/config/workflow.json        (workflow定义)          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ 调用Python CLI (JSON通信)
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ Python Workflow Engine                                      │
│                                                              │
│  CLI接口:                                                     │
│  ├── product_builder_cli.py                                 │
│  │   ├── run      - 启动workflow                            │
│  │   ├── resume   - 恢复workflow                            │
│  │   ├── status   - 查看状态                                │
│  │   ├── cancel   - 取消workflow                            │
│  │   └── logs     - 查看日志                                │
│  │                                                           │
│  核心组件:                                                    │
│  ├── workflow_executor.py    (workflow执行器)                │
│  ├── scheduler.py            (LocalScheduler)                │
│  ├── workflow_db_*.py        (数据库适配器)                   │
│  └── adapters/               (Git/GitHub/LLM适配器)          │
│                                                              │
│  数据库 (.product-builder/workflow.db):                      │
│  ├── jobs                    (job元数据)                     │
│  ├── step_executions         (步骤执行历史)                  │
│  ├── git_operations          (Git操作日志)                   │
│  ├── github_issues           (关联的GitHub issues)           │
│  └── ... (共22个表)                                          │
└─────────────────────────────────────────────────────────────┘
```

## 新增文件

### 1. TypeScript包装器
**文件:** `src/libs/workflow-engine.ts`

提供TypeScript接口来调用Python CLI：
```typescript
const engine = createWorkflowEngine();

// 启动workflow
const result = await engine.runWorkflow('workflow.json', {
  stepId: 'P1-CREATE_JOB',
  context: { requirement: 'Build auth' }
});

// 恢复workflow
await engine.resumeWorkflow(jobId);

// 查看状态
await engine.getStatus(jobId);
```

### 2. 更新的Orchestrator
**文件:** `src/orchestrator/index-python.ts`

整合Python engine的workflow执行器：
```typescript
// 执行workflow（自动使用Python engine）
const state = await executeWorkflow(config, input);

// 恢复workflow
await resumeWorkflow(jobId);

// 查看状态
await getWorkflowStatus(jobId);
```

### 3. 整合文档
**文件:** `scripts/python/PRODUCT_BUILDER_INTEGRATION.md`

详细的整合指南，包括：
- 架构说明
- 使用场景
- API参考
- 实现步骤

### 4. 示例代码
**文件:** `examples/workflow-integration-example.js`

完整的使用示例，展示如何：
- 检查Python engine可用性
- 初始化数据库
- 启动workflow
- 查看状态和日志

## 使用方式

### 方式1: 通过Product Builder CLI（推荐）

```bash
# 启动workflow
pb start "Build authentication feature"

# 查看状态
pb status

# 恢复workflow
pb resume <job_id>

# 查看日志
pb logs <job_id>
```

### 方式2: 直接使用Python CLI

```bash
# 启动workflow
python3 scripts/python/product_builder_cli.py run \\
  --workflow-file src/config/workflow.json \\
  --json

# 查看状态
python3 scripts/python/product_builder_cli.py status --json

# 恢复workflow
python3 scripts/python/product_builder_cli.py resume <job_id> --json
```

### 方式3: 在代码中使用

```typescript
import { createWorkflowEngine } from './src/libs/workflow-engine';

const engine = createWorkflowEngine();
const result = await engine.runWorkflow('workflow.json');
console.log(result.data.job_id);
```

## 数据查看

### 1. 通过CLI查看
```bash
# 查看job状态
pb status --job-id <job_id>

# 查看日志
pb logs <job_id>
```

### 2. 直接查询数据库
```bash
# 使用SQLite CLI
sqlite3 .product-builder/workflow.db

# 查询jobs
SELECT * FROM jobs;

# 查询step执行历史
SELECT * FROM step_executions WHERE job_id = 'job_xxx';

# 查询Git操作
SELECT * FROM git_operations WHERE job_id = 'job_xxx';
```

### 3. 使用Python脚本查询
```python
from workflow_db_phase1 import WorkflowDatabase

db = WorkflowDatabase('.product-builder/workflow.db')
job = db.get_job('job_xxx')
print(f"Status: {job['status']}")
print(f"Progress: {job['progress']}%")
```

## 不需要Webhook和Web UI

**重要:** 你**不需要**webhook或web UI来查看数据！

- **CLI命令** 提供了所有必要的查询功能
- **数据库** 可以直接用SQLite工具查询
- **JSON输出** 支持脚本化处理

Webhook和Web UI是**可选的**，只在以下场景需要：
1. 需要实时通知（如Slack/Email通知）
2. 需要图形化界面（如dashboard）
3. 需要远程访问（如团队协作）

## 下一步工作

### Phase 1: 基础整合（已完成）
- [x] Python CLI (product_builder_cli.py)
- [x] 数据库架构（22个表）
- [x] LocalScheduler
- [x] Git/GitHub集成
- [x] TypeScript包装器 (workflow-engine.ts)
- [x] 更新的Orchestrator (index-python.ts)
- [x] 整合文档

### Phase 2: Product Builder CLI整合（待完成）
- [ ] 更新 `src/cli/` 命令以使用Python engine
- [ ] 添加 `pb start` 命令
- [ ] 添加 `pb resume` 命令
- [ ] 添加 `pb status` 命令
- [ ] 添加 `pb logs` 命令
- [ ] 添加依赖检查（检查Python和依赖）

### Phase 3: Workflow执行（待完成）
- [ ] 加载Product Builder的workflow.json
- [ ] 映射workflow步骤到Python执行器
- [ ] 实现步骤执行逻辑
- [ ] 处理步骤间的数据传递
- [ ] 实现错误处理和重试

### Phase 4: 高级功能（待完成）
- [ ] 并行步骤执行（场景2）
- [ ] 多workflow并发（场景3）
- [ ] 资源管理
- [ ] 失败恢复

## 测试

### 运行示例
```bash
# 构建TypeScript代码
npm run build

# 运行示例
node examples/workflow-integration-example.js
```

### 测试Python CLI
```bash
cd scripts/python

# 初始化数据库
python3 init_database.py

# 运行测试
python3 test_cli.py
```

## 常见问题

### Q: 为什么要用Python而不是纯TypeScript？
A: Python有更好的数据库ORM、调度库和AI集成。TypeScript负责CLI和配置，Python负责执行。

### Q: 数据库在哪里？
A: 默认在 `.product-builder/workflow.db`，可以在配置中修改。

### Q: 如何查看workflow执行历史？
A: 使用 `pb logs <job_id>` 或直接查询数据库的 `step_executions` 表。

### Q: 支持并行执行吗？
A: 支持！LocalScheduler支持依赖管理和并行执行（Phase 4待实现）。

### Q: 如何调试？
A:
1. 使用 `--json` 查看详细输出
2. 查看数据库中的 `error_events` 表
3. 使用 `pb logs <job_id>` 查看执行日志

## 总结

现在你有了一个**完整的整合方案**：

1. **Product Builder (TypeScript)** - 用户界面和配置管理
2. **Python Workflow Engine** - 强大的执行引擎
3. **SQLite数据库** - 持久化存储
4. **清晰的接口** - TypeScript ↔ Python通过JSON通信

你可以：
- ✅ 通过 `pb` 命令启动和管理workflow
- ✅ 通过CLI或数据库查看所有数据
- ✅ 不需要webhook或web UI
- ✅ 支持并行执行和多workflow并发
- ✅ 完整的Git/GitHub集成
