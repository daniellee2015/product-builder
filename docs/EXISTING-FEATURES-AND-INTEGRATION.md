# Product Builder 现有功能清单与整合规划

## 当前状态分析

### ✅ 已实现的功能

#### 1. CLI入口和菜单系统
**文件：** `src/cli/index.ts`, `src/cli/menu.ts`

**已有命令：**
```bash
pb              # 启动交互式菜单（默认）
pb menu         # 启动交互式菜单
pb init         # 初始化配置（TODO）
pb check        # 检查依赖（TODO）
pb install      # 安装依赖（TODO）
pb config       # 管理配置（TODO）
pb generate     # 生成配置文件（TODO）
```

#### 2. 交互式菜单结构
**文件：** `src/config/menu-registry.ts`

**主菜单分组：**
1. **Setup**
   - Initialize configuration
   - Check status
   - Reset configuration

2. **Workflow**
   - Workflow config（已实现）
   - Jobs & Tasks（TODO）

3. **Tools Configuration**
   - LLM CLI（已实现）
   - Architecture tools
   - Documentation
   - MCP Servers
   - Skills
   - Agents

4. **System**
   - Settings（已实现）
   - View configuration
   - Dependencies
   - Help
   - Exit

#### 3. Workflow菜单（已实现）
**文件：** `src/cli/workflow/menu.ts`

**功能：**
- ✅ View workflow - 查看workflow定义
- ✅ Switch mode - 切换模式（lite/standard/full）
- ✅ Edit workflow - 启用/禁用步骤
- ✅ Import workflow - 导入自定义workflow
- ✅ Export workflow - 导出workflow配置
- ✅ Reset workflow - 重置到默认

#### 4. Jobs & Tasks菜单（TODO）
**文件：** `src/cli/menus/jobs-tasks-menu.ts`

**规划的功能（未实现）：**
- ❌ View roadmap - 查看项目路线图
- ❌ List jobs - 列出所有jobs
- ❌ View job details - 查看job详情
- ❌ List tasks - 列出所有tasks
- ❌ View task details - 查看task详情

#### 5. LLM CLI菜单（已实现）
**文件：** `src/cli/llm/menu.ts`

**功能：**
- ✅ 配置LLM providers
- ✅ 管理API keys
- ✅ 选择默认模型

#### 6. Settings菜单（已实现）
**文件：** `src/cli/settings/menu.ts`

**功能：**
- ✅ 语言设置
- ✅ Workflow模式设置
- ✅ 自动保存设置

### ❌ 缺失的功能

#### 1. Workflow执行
- 没有启动workflow的命令
- 没有执行引擎
- orchestrator只是模拟执行

#### 2. Jobs & Tasks管理
- Jobs & Tasks菜单是空的（TODO）
- 没有job创建/查看/管理功能
- 没有task执行功能

#### 3. 实时监控
- 没有WebSocket服务器
- 没有实时状态更新
- 没有Web UI

#### 4. 数据持久化
- 没有数据库
- 没有job/task状态存储
- 没有执行历史

## 整合方案：保留现有菜单 + 添加新功能

### 方案A：扩展现有菜单系统（推荐）

保留Product Builder的交互式菜单，将Python workflow engine作为后端：

```
┌─────────────────────────────────────────────────────────┐
│ Product Builder 交互式菜单 (已有)                         │
│  ├── Setup                                              │
│  ├── Workflow (已实现)                                   │
│  ├── Jobs & Tasks (TODO → 实现)                         │
│  ├── Tools Configuration                                │
│  └── System                                             │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│ 新增：Workflow执行功能                                    │
│  ├── pb start <requirement>  - 启动workflow              │
│  ├── pb serve                - 启动服务器                │
│  └── pb dashboard            - 打开Web UI                │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│ Python Workflow Engine (新增)                           │
│  ├── FastAPI Server                                     │
│  ├── WebSocket                                          │
│  ├── Database                                           │
│  └── Workflow Executor                                  │
└─────────────────────────────────────────────────────────┘
```

### 更新后的CLI命令结构

#### 保留的命令（交互式菜单）
```bash
pb              # 启动交互式菜单（默认）
pb menu         # 启动交互式菜单
```

#### 新增的命令（workflow执行）
```bash
# Workflow执行
pb start <requirement>      # 启动新workflow
pb list                     # 列出所有jobs
pb status [job-id]          # 查看job状态
pb logs <job-id>            # 查看日志
pb cancel <job-id>          # 取消job
pb resume <job-id>          # 恢复job

# 服务器和UI
pb serve                    # 启动服务器（HTTP + WebSocket）
pb dashboard                # 打开Web UI

# 保留的命令（配置管理）
pb init                     # 初始化配置
pb check                    # 检查依赖
pb config                   # 管理配置
```

### 更新Jobs & Tasks菜单

**文件：** `src/cli/menus/jobs-tasks-menu.ts`

**新增功能：**
```typescript
export async function showJobsTasksMenu(showMainMenu: () => Promise<void>): Promise<void> {
  const config = MENUS['jobs-tasks'];

  const result = await menu.radio({
    options: buildMenuOptions(config)
  });

  const selected = findSelectedItem(config, result.value);
  if (!selected) return;

  switch (selected.id) {
    case 'start-workflow':
      await startWorkflowInteractive();
      break;
    case 'list-jobs':
      await listJobs();
      break;
    case 'job-details':
      await viewJobDetails();
      break;
    case 'open-dashboard':
      await openDashboard();
      break;
    case 'start-server':
      await startServer();
      break;
  }

  await showJobsTasksMenu(showMainMenu);
}
```

### 更新菜单配置

**文件：** `src/config/menu-registry.ts`

```typescript
'jobs-tasks': {
  title: 'Jobs & Tasks Management',
  desc: 'Manage workflow execution and monitoring',
  headerLevel: 'section',
  headerWidth: 50,
  backLabel: 'Back to main menu',
  items: [
    { key: '1', id: 'start-workflow', label: 'Start workflow', desc: 'Start a new workflow execution' },
    { key: '2', id: 'list-jobs', label: 'List jobs', desc: 'Show all jobs' },
    { key: '3', id: 'job-details', label: 'View job details', desc: 'View specific job status' },
    { key: '4', id: 'view-logs', label: 'View logs', desc: 'View job execution logs' },
    { key: '5', id: 'cancel-job', label: 'Cancel job', desc: 'Cancel running job' },
    { key: '6', id: 'open-dashboard', label: 'Open dashboard', desc: 'Open Web UI in browser' },
    { key: '7', id: 'start-server', label: 'Start server', desc: 'Start WebSocket server' },
    { key: '8', id: 'server-status', label: 'Server status', desc: 'Check server status' }
  ]
}
```

## 实现优先级（修正版）

### Phase 1: 后端基础（2-3天）
1. ✅ Python workflow engine（已完成）
2. ✅ Database（已完成）
3. ✅ LocalScheduler（已完成）
4. ⏳ FastAPI服务器
5. ⏳ WebSocket服务器
6. ⏳ 事件系统

### Phase 2: CLI命令实现（2-3天）
1. ⏳ 实现 `pb start` 命令
2. ⏳ 实现 `pb list` 命令
3. ⏳ 实现 `pb status` 命令
4. ⏳ 实现 `pb logs` 命令
5. ⏳ 实现 `pb serve` 命令
6. ⏳ 实现 `pb dashboard` 命令

### Phase 3: 菜单集成（1-2天）
1. ⏳ 更新Jobs & Tasks菜单
2. ⏳ 实现交互式workflow启动
3. ⏳ 实现交互式job查看
4. ⏳ 集成服务器控制

### Phase 4: Web UI（3-4天）
1. ⏳ 创建React项目
2. ⏳ 实现Dashboard
3. ⏳ 实现Job Detail
4. ⏳ 实现Logs Viewer

## 用户体验流程

### 流程1：通过交互式菜单
```bash
$ pb
# 显示主菜单
# 选择 "5. Jobs & Tasks"
# 选择 "1. Start workflow"
# 输入requirement
# 显示job_id和进度
# 选择 "6. Open dashboard" 查看详情
```

### 流程2：通过命令行
```bash
$ pb start "Build authentication feature"
# 输出：Job started: job_123
# 输出：Dashboard: http://localhost:3000/jobs/job_123

$ pb status job_123
# 显示实时状态

$ pb dashboard
# 打开浏览器
```

### 流程3：通过Web UI
```bash
$ pb serve --open
# 启动服务器并打开浏览器
# 在Web UI中操作
```

## 技术实现细节

### 1. Jobs & Tasks菜单实现

**文件：** `src/cli/jobs-tasks/index.ts`

```typescript
import { createWorkflowEngine } from '../libs/workflow-engine';
import inquirer from 'inquirer';
import chalk from 'chalk';
import open from 'open';

export async function startWorkflowInteractive(): Promise<void> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'requirement',
      message: 'Enter requirement:',
      validate: (input) => input.length > 0
    },
    {
      type: 'list',
      name: 'mode',
      message: 'Select workflow mode:',
      choices: ['lite', 'standard', 'full']
    }
  ]);

  console.log(chalk.blue('\\nStarting workflow...'));

  const engine = createWorkflowEngine();
  const result = await engine.runWorkflow('src/config/workflow.json', {
    context: {
      requirement: answers.requirement,
      mode: answers.mode
    }
  });

  if (result.success && result.data) {
    console.log(chalk.green(`✅ Workflow started!`));
    console.log(chalk.cyan(`Job ID: ${result.data.job_id}`));
    console.log(chalk.gray(`Dashboard: http://localhost:3000/jobs/${result.data.job_id}`));

    const { openDashboard } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'openDashboard',
        message: 'Open dashboard in browser?',
        default: true
      }
    ]);

    if (openDashboard) {
      await open(`http://localhost:3000/jobs/${result.data.job_id}`);
    }
  } else {
    console.log(chalk.red(`❌ Failed: ${result.error}`));
  }
}

export async function listJobs(): Promise<void> {
  const engine = createWorkflowEngine();
  const result = await engine.getStatus();

  if (result.success && result.data) {
    console.log(chalk.cyan('\\n📋 Jobs List\\n'));

    // 显示jobs列表
    // TODO: 格式化输出
  }
}
```

### 2. CLI命令实现

**文件：** `src/cli/commands/workflow.ts`

```typescript
import { Command } from 'commander';
import { createWorkflowEngine } from '../libs/workflow-engine';
import chalk from 'chalk';

export function registerWorkflowCommands(program: Command): void {
  // pb start
  program
    .command('start <requirement>')
    .description('Start a new workflow')
    .option('-m, --mode <mode>', 'Workflow mode (lite|standard|full)', 'standard')
    .option('-w, --watch', 'Watch progress in real-time')
    .action(async (requirement, options) => {
      const engine = createWorkflowEngine();
      const result = await engine.runWorkflow('src/config/workflow.json', {
        context: { requirement, mode: options.mode }
      });

      if (result.success && result.data) {
        console.log(chalk.green(`✅ Workflow started: ${result.data.job_id}`));
        if (options.watch) {
          // TODO: 实现实时监控
        }
      }
    });

  // pb list
  program
    .command('list')
    .description('List all jobs')
    .option('--status <status>', 'Filter by status')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      // TODO: 实现
    });

  // pb status
  program
    .command('status [job-id]')
    .description('Get job status')
    .option('-w, --watch', 'Watch in real-time')
    .option('--json', 'Output as JSON')
    .action(async (jobId, options) => {
      // TODO: 实现
    });

  // pb serve
  program
    .command('serve')
    .description('Start server (HTTP + WebSocket)')
    .option('-p, --port <port>', 'HTTP port', '3000')
    .option('--ws-port <port>', 'WebSocket port', '3001')
    .option('--open', 'Open browser')
    .action(async (options) => {
      // TODO: 实现
    });

  // pb dashboard
  program
    .command('dashboard')
    .description('Open Web UI')
    .action(async () => {
      // TODO: 实现
    });
}
```

## 总结

### 现有功能
- ✅ 交互式菜单系统（完整）
- ✅ Workflow配置管理（完整）
- ✅ LLM配置（完整）
- ✅ Settings管理（完整）
- ❌ Jobs & Tasks管理（TODO）
- ❌ Workflow执行（缺失）

### 需要添加的功能
1. **Python Workflow Engine后端**（FastAPI + WebSocket）
2. **CLI命令**（pb start/list/status/logs/serve/dashboard）
3. **Jobs & Tasks菜单实现**（交互式workflow管理）
4. **Web UI**（Dashboard + Job Detail + Logs）

### 整合策略
- **保留**现有的交互式菜单系统
- **扩展**Jobs & Tasks菜单功能
- **新增**workflow执行命令
- **添加**Web UI作为可选界面

这样既保留了Product Builder的现有功能，又添加了workflow执行能力！
