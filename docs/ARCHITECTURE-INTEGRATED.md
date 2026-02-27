# Product Builder 架构文档（整合版）

> 版本：v2.0 | 日期：2026-02-26 | 状态：已确认

## 目录

1. [核心概念](#核心概念)
2. [两层架构](#两层架构)
3. [Agent层次](#agent层次)
4. [Workflow层次](#workflow层次)
5. [CLI菜单结构](#cli菜单结构)
6. [配置说明](#配置说明)
7. [执行流程](#执行流程)
8. [数据模型](#数据模型)

---

## 核心概念

### Product Builder是什么？

Product Builder是一个**AI驱动的产品开发平台**，包含：

1. **配置管理**：LLM、MCP、Skills、Tools、Prompts
2. **工作流编排**：两层架构（调度层 + 开发工作流层）
3. **工具集成**：CCB/CCA、npm工具、docker服务、git repos、CLI工具等
4. **用户界面**：CLI UI（优先）+ Web UI（加分项，仅用于workflow执行监控）

### 核心设计原则

```
两个独立的工作流 + 三个Agent层次 + 清晰的职责划分
```

---

## 两层架构

### 层次1：调度层（Scheduling Layer）

**职责：宏观管理**

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

**PM/Traffic的实现方式（二选一）：**

- **选项A：OpenClaw**（外部Agent工具）
- **选项B：CodeAct模式**（Product Builder内置）

**重点：只能选一个！不会同时存在！**

**关注点：宏观、管理、协调**

### 层次2：开发工作流层（Development Workflow Layer）

**职责：微观执行**

- 执行具体的开发任务
- 技术层面的判断：
  - 不同工作是否有独立性
  - 是否需要隔离worktree
  - 是否需要区分实例
  - 是否有代码冲突
  - 如何并行执行

**工作流定义：**

- 定义在 `src/config/workflow.json`
- 包含Phase 0-7（8个阶段）
- 三种模式：Lite（16步）、Standard（48步）、Full（60步）

**Phase说明：**

- **Phase 0 - Requirement Research & Analysis**：需求研究和分析
- **Phase 1 - Ideation**：创意构思
- **Phase 2 - Planning**：技术方案设计
- **Phase 3 - Execution**：代码实现
- **Phase 4 - Testing**：测试
- **Phase 5 - Optimization**：优化
- **Phase 6 - Review**：审查
- **Phase 7 - Archiving**：归档

**配置（CCB+CCA）：**

- 配置不同Phase用哪个LLM
- 例如：P0用Claude、P1用Gemini、P2用Codex等

**关注点：微观、技术、执行**

### 两层的关系

```
┌─────────────────────────────────────────────────────────┐
│ 调度层（PM/Traffic）                                     │
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
                        │
                        │ 调度
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 开发工作流层（CCB+CCA+其他工具）                         │
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

---

## Agent层次

### 三个层次的Agent

```
┌─────────────────────────────────────────────────────────────┐
│ 层次1：调度Agent（Product Builder层）                        │
│                                                             │
│  职责：项目级别的规划和调度                                   │
│  ├── PM Agent - 项目管理                                     │
│  └── Traffic Agent - 进度跟踪                                │
│                                                             │
│  实现方式：OpenClaw 或 CodeAct（二选一）                      │
│                                                             │
│  Product Builder配置：✅ 需要配置                            │
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
│  配置位置：CCB的配置文件（~/.claude/config.json或CLAUDE.md）  │
│                                                             │
│  Product Builder配置：❌ 不需要配置（CCB自己管理）            │
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
│  这是CCB内部机制                                             │
│                                                             │
│  Product Builder配置：❌ 不需要配置（CCB内部机制）            │
└─────────────────────────────────────────────────────────────┘
```

### Product Builder应该配置哪个层次？

**答案：主要配置层次1（调度Agent），不配置层次2和3**

**原因：**
- 层次2（CCB agent team）由CCB自己管理
- 层次3（Subagent）是CCB内部机制
- Product Builder只需要配置项目级别的调度逻辑

---

## Workflow层次

### 两个独立的工作流

```
┌─────────────────────────────────────────────────────────────┐
│ 工作流1：调度工作流（独立的）                                  │
│                                                             │
│ 执行者：PM/Traffic Agent（OpenClaw 或 CodeAct模式）          │
│                                                             │
│ 流程：                                                       │
│ 1. 接收用户需求                                              │
│ 2. 分析需求                                                  │
│ 3. 拆分成多个job                                             │
│ 4. 确定优先级和依赖                                           │
│ 5. 调度job执行                                               │
│ 6. 跟踪进展                                                  │
│ 7. 识别瓶颈                                                  │
│                                                             │
│ 这个工作流不在workflow.json中                                 │
│ 这是PM/Traffic的管理流程                                      │
└─────────────────────────────────────────────────────────────┘
                        │
                        │ 调度
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ 工作流2：开发工作流（独立的）                                  │
│                                                             │
│ 定义：workflow.json（Phase 0-7）                             │
│                                                             │
│ 执行者：CCB+CCA+其他工具                                      │
│                                                             │
│ 流程：                                                       │
│ Phase 0: Requirement Research & Analysis                    │
│ Phase 1: Ideation                                           │
│ Phase 2: Planning                                           │
│ Phase 3: Execution                                          │
│ Phase 4: Testing                                            │
│ Phase 5: Optimization                                       │
│ Phase 6: Review                                             │
│ Phase 7: Archiving                                          │
│                                                             │
│ 技术判断：                                                   │
│ - 任务独立性                                                 │
│ - worktree隔离                                               │
│ - 冲突检测                                                   │
│                                                             │
│ 这个工作流在workflow.json中                                   │
│ 这是具体的开发执行流程                                        │
└─────────────────────────────────────────────────────────────┘
```

### Job vs Task

**Project Job（项目任务）：**
- 一个完整的项目开发流程
- 包含多个Phase（Phase 0-7，共8个阶段）
- 由Product Builder管理
- 存储在Product Builder数据库
- job_id格式：`job_20260226_001`

**Development Task（开发任务）：**
- 一个具体的开发任务
- 在Phase 2中执行
- 由CCB执行
- 可能有自己的状态和日志
- task_id格式：`task_001`, `task_002`

---

## CLI菜单结构

### 主菜单（8个分组）

```
Product Builder CLI - Main Menu
┌─────────────────────────────────────────────────────────────┐
│ 1. Setup - Initialize and configure system                 │
│                                                             │
│ 2. Project Management - Configure PM/Traffic agents ⭐     │
│                                                             │
│ 3. Workflow - Configure development workflow ⭐            │
│                                                             │
│ 4. Job Management - Manage jobs and tasks ⭐               │
│                                                             │
│ 5. Agents - Configure agents ⭐                             │
│                                                             │
│ 6. AI Gateway - Configure LLM API and routing ⭐           │
│                                                             │
│ 7. Tools - Configure tools and services ⭐                  │
│                                                             │
│ 8. Settings - System settings and help                     │
│                                                             │
│ Q. Exit                                                     │
└─────────────────────────────────────────────────────────────┘
```

**8个分组说明：**

1. **Setup** - 系统初始化和配置
2. **Project Management** - 调度层配置（PM/Traffic Agent）
3. **Workflow** - 开发工作流配置（Phase 0-7）
4. **Job Management** - Jobs & Tasks管理
5. **Agents** - Agent配置
6. **AI Gateway** - LLM API和路由配置
7. **Tools** - 工具和服务配置
8. **Settings** - 系统设置和帮助

**⭐ 标记说明：** 与两层架构直接相关的核心分组

### 子菜单详细结构

#### 1. Setup

```
Setup
┌─────────────────────────────────────────────────────────────┐
│ 1. Initialize configuration - Set up Product Builder       │
│ 2. Check status - View system dependencies                 │
│ 3. Reset configuration - Clear and reconfigure             │
│ b. Back to main menu                                        │
└─────────────────────────────────────────────────────────────┘
```

#### 2. Project Management（项目管理）⭐

```
Project Management
┌─────────────────────────────────────────────────────────────┐
│ 1. Scheduler implementation - Choose scheduler type        │
│    ├── OpenClaw (外部Agent工具)                            │
│    └── CodeAct (Product Builder内置)                       │
│                                                             │
│ 2. Scheduling policies - Configure scheduling rules        │
│    ├── Priority rules                                       │
│    ├── Resource allocation strategy                        │
│    ├── Dependency management rules                         │
│    └── Parallelism control                                 │
│                                                             │
│ 3. Project configuration - Project-level settings          │
│    ├── Default configurations                              │
│    └── Project preferences                                 │
│                                                             │
│ b. Back to main menu                                        │
└─────────────────────────────────────────────────────────────┘

说明：
- PM/Traffic Agent的具体配置（角色、LLM、能力）在分组5 Agents中管理
- 这里只配置调度层的实现方式和策略
```

#### 3. Workflow（工作流配置）⭐

```
Workflow Configuration
┌─────────────────────────────────────────────────────────────┐
│ 1. Scheduling workflow - 调度工作流管理                    │
│                                                             │
│ 2. Development workflow - 开发工作流管理                   │
│                                                             │
│ 3. Coordination - 协调管理                                  │
│                                                             │
│ b. Back to main menu                                        │
└─────────────────────────────────────────────────────────────┘
```

##### 3.1 Scheduling Workflow（调度工作流管理）

```
Scheduling Workflow Management
┌─────────────────────────────────────────────────────────────┐
│ 1. View scheduling workflow - 查看调度流程                 │
│                                                             │
│ 2. Configure scheduling workflow - 配置调度流程            │
│                                                             │
│ 3. Scheduling policies - 调度策略                          │
│                                                             │
│ b. Back to workflow menu                                    │
└─────────────────────────────────────────────────────────────┘
```

##### 3.2 Development Workflow（开发工作流管理）

```
Development Workflow Management
┌─────────────────────────────────────────────────────────────┐
│ 1. View workflow - Show Phase 0-7                          │
│                                                             │
│ 2. Switch mode - Change mode (lite/standard/full)          │
│                                                             │
│ 3. Edit workflow - Enable/disable steps                    │
│                                                             │
│ 4. Import workflow - Load custom workflow                  │
│                                                             │
│ 5. Export workflow - Save current workflow                 │
│                                                             │
│ 6. Reset workflow - Reset to defaults                      │
│                                                             │
│ 7. Technical decisions - Configure technical rules         │
│    ├── Independence check                                  │
│    ├── Worktree isolation                                  │
│    ├── Conflict detection                                  │
│    └── Parallel execution                                  │
│                                                             │
│ b. Back to workflow menu                                    │
└─────────────────────────────────────────────────────────────┘
```

##### 3.3 Coordination（协调管理）

```
Coordination Management
┌─────────────────────────────────────────────────────────────┐
│ 1. Job contract - Define job interface                     │
│    ├── job_id, objective, priority                         │
│    ├── dependencies, constraints                           │
│    └── success_criteria                                    │
│                                                             │
│ 2. State synchronization - Configure state mapping         │
│    ├── Scheduler states                                    │
│    └── Executor states                                     │
│                                                             │
│ 3. Boundary API - Configure workflow interface             │
│    ├── submit_job                                          │
│    ├── start_job                                           │
│    ├── update_job_progress                                 │
│    ├── complete_job                                        │
│    └── fail_job                                            │
│                                                             │
│ 4. Advanced coordination                                    │
│    ├── Idempotency and resume                              │
│    ├── Dependency correctness                              │
│    ├── Resource/Isolation coordination                     │
│    ├── Feedback loop quality                               │
│    └── Observability                                       │
│                                                             │
│ b. Back to workflow menu                                    │
└─────────────────────────────────────────────────────────────┘

说明：
- 分组3主菜单只有3个选项
- 每个选项点击后进入对应的子菜单
- 调度工作流、开发工作流、协调管理各自独立
```

#### 4. Job Management（任务管理）⭐

```
Job Management
┌─────────────────────────────────────────────────────────────┐
│ 1. Job operations - 任务操作                                │
│                                                             │
│ 2. Job viewing - 任务查看                                   │
│                                                             │
│ 3. Task management - 子任务管理                            │
│                                                             │
│ 4. View roadmap - 查看路线图                                │
│                                                             │
│ b. Back to main menu                                        │
└─────────────────────────────────────────────────────────────┘
```

##### 4.1 Job Operations（任务操作）

```
Job Operations
┌─────────────────────────────────────────────────────────────┐
│ 1. Start job - Start new job                               │
│                                                             │
│ 2. Pause job - Pause running job                           │
│                                                             │
│ 3. Resume job - Resume paused job                          │
│                                                             │
│ 4. Cancel job - Cancel job                                 │
│                                                             │
│ b. Back to job management                                   │
└─────────────────────────────────────────────────────────────┘
```

##### 4.2 Job Viewing（任务查看）

```
Job Viewing
┌─────────────────────────────────────────────────────────────┐
│ 1. List jobs - Show all jobs                               │
│    (with priority and dependencies)                         │
│                                                             │
│ 2. View job details - View specific job                    │
│    显示内容：                                               │
│    ├── Job info                                             │
│    ├── Current phase                                        │
│    ├── Progress (Traffic Agent提供)                        │
│    ├── Technical decisions (CCB提供)                       │
│    ├── Development tasks (Phase 3的任务列表)               │
│    └── Worktree info                                        │
│                                                             │
│ 3. View logs - View job execution logs                     │
│                                                             │
│ b. Back to job management                                   │
└─────────────────────────────────────────────────────────────┘
```

##### 4.3 Task Management（子任务管理）

```
Task Management
┌─────────────────────────────────────────────────────────────┐
│ 1. List tasks - Show all tasks across jobs                 │
│                                                             │
│ 2. View task details - View specific task details          │
│                                                             │
│ b. Back to job management                                   │
└─────────────────────────────────────────────────────────────┘
```

#### 5. Agents（Agent配置）⭐

```
Agents Configuration
┌─────────────────────────────────────────────────────────────┐
│ 1. Scheduling agents - Configure PM/Traffic agents         │
│    ├── PM Agent (role, LLM, capabilities)                  │
│    └── Traffic Agent (role, LLM, capabilities)             │
│                                                             │
│ 2. Workflow agents - Configure workflow agents             │
│    ├── Designer Agent                                      │
│    ├── Reviewer Agent                                      │
│    ├── Executor Agent                                      │
│    └── Tester Agent                                        │
│                                                             │
│ 3. MCP Servers - Model Context Protocol                    │
│    ├── Configure MCP servers                               │
│    └── Manage MCP connections                              │
│                                                             │
│ 4. Skills - Reusable workflows                             │
│    ├── Manage skills                                       │
│    └── Configure skill settings                            │
│                                                             │
│ 5. Hooks - Lifecycle hooks                                 │
│    ├── Configure hooks                                     │
│    └── Manage hook scripts                                 │
│                                                             │
│ 6. Prompts - Prompt templates                              │
│    ├── Manage prompt templates                             │
│    └── Configure prompt settings                           │
│                                                             │
│ 7. Agent interfaces - Agent communication (未来扩展)       │
│                                                             │
│ b. Back to main menu                                        │
└─────────────────────────────────────────────────────────────┘

说明：
- 管理所有agent相关的配置
- 包括上层agent（PM/Traffic）和工作流agent
- 包括agent相关的插件：MCP、Skills、Hooks、Prompt
```

#### 6. AI Gateway（AI网关配置）⭐

```
AI Gateway Configuration
┌─────────────────────────────────────────────────────────────┐
│ 1. Official API - Configure official API endpoints         │
│    支持的providers：                                        │
│    ├── Anthropic (Claude)                                   │
│    ├── Google (Gemini)                                      │
│    ├── OpenAI (GPT)                                         │
│    └── Others                                               │
│                                                             │
│ 2. Custom API - Configure custom endpoints                 │
│    ├── PackyAPI                                             │
│    ├── Self-hosted                                          │
│    └── Custom endpoints                                     │
│                                                             │
│ 3. View Status - Show current configuration                │
│                                                             │
│ 4. Switch Configuration - Manage multiple configs          │
│                                                             │
│ 5. Enable Code Hub - Use cchub for routing                 │
│                                                             │
│ b. Back to main menu                                        │
└─────────────────────────────────────────────────────────────┘
```

#### 7. Tools（工具配置）⭐

```
Tools Configuration
┌─────────────────────────────────────────────────────────────┐
│ 1. Architecture tools - Development tools                  │
│    ├── CCB (Claude Code Bridge)                            │
│    ├── CCA (Cross-Claude Agent)                            │
│    ├── CCH (claude-code-hub)                               │
│    ├── Ralph (Retry Loop)                                  │
│    └── OpenClaw (可选)                                      │
│                                                             │
│ 2. Documentation - Documentation tools                     │
│    ├── OpenSpec                                            │
│    ├── Mint                                                │
│    └── Markdown                                            │
│                                                             │
│ 3. Dependencies - Install requirements                     │
│    ├── Check dependencies                                  │
│    └── Install missing tools                               │
│                                                             │
│ b. Back to main menu                                        │
└─────────────────────────────────────────────────────────────┘

说明：
- 配置开发工具和服务
- 不包括MCP（MCP在分组5 Agents中管理）
```

#### 8. System

```
System
┌─────────────────────────────────────────────────────────────┐
│ 1. Settings - User preferences                             │
│                                                             │
│ 2. View configuration - Show current settings              │
│                                                             │
│ 3. Help - Show documentation                               │
│                                                             │
│ b. Back to main menu                                        │
└─────────────────────────────────────────────────────────────┘
```

### 菜单说明

**8个主菜单项对应两层架构：**

1. **Setup**：系统初始化
2. **Scheduler**：调度层配置（PM/Traffic Agent）- 层次1
3. **DEV Workflow**：开发工作流配置（Phase 0-7）- 层次2
4. **Jobs**：Jobs & Tasks管理
5. **Agents**：Agent配置
6. **LLM**：LLM API和路由配置
7. **Tools**：工具和服务配置
8. **System**：系统设置

**⭐ 标记说明：**
- 与两层架构直接相关的核心菜单

---

## 配置说明

### 1. 调度层配置

```json
{
  "scheduler": {
    "type": "external",  // 或 "internal"

    // 选项A：使用OpenClaw
    "external_agent": {
      "tool": "openclaw",
      "url": "http://localhost:8080"
    },

    // 选项B：使用CodeAct模式
    "internal_agent": {
      "mode": "codeact",
      "llm": "claude",
      "roles": ["pm", "traffic"]
    },

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

    "mode": "standard",  // lite, standard, full

    "phase_llm_mapping": {
      "P0": "claude",
      "P1": "gemini",
      "P2": "codex",
      "P3": "claude",
      "P4": "claude",
      "P5": "claude",
      "P6": "codex",
      "P7": "claude"
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

### 3. 工具配置

```json
{
  "tools": {
    "ccb": {
      "path": "/usr/local/bin/ccb",
      "config_path": "~/.claude/config.json",  // CCB自己的配置
      "enabled": true
    },
    "cca": {
      "path": "/usr/local/bin/cca",
      "enabled": true
    },
    "npm_packages": [
      "@waoooo/skill-installer",
      "@waoooo/session-sync"
    ],
    "docker_services": [],
    "git_repos": [],
    "cli_tools": [],
    "third_party_services": []
  }
}
```

### 4. CCB配置（~/.claude/config.json）

**注意：这是CCB自己的配置，不是Product Builder的配置**

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

---

## 执行流程

### 完整流程示例

```python
# 1. 用户输入需求
user_input = "构建完整的认证系统"

# 2. 调度工作流执行（独立的workflow）
# 使用OpenClaw或CodeAct模式
if config.scheduler.type == "external":
    # 使用OpenClaw
    scheduler = OpenClawAgent(config.scheduler.external_agent)
else:
    # 使用CodeAct模式
    scheduler = CodeActAgent(config.scheduler.internal_agent)

# PM Agent分析和拆分
jobs = scheduler.analyze_and_decompose(user_input)
# 返回：[job_001, job_002, job_003]

scheduler.set_priorities(jobs)
# job_001: high, job_002: high, job_003: medium

scheduler.analyze_dependencies(jobs)
# job_002和job_003依赖job_001

# 3. 对每个job，执行开发工作流（独立的workflow）
for job in jobs:
    if scheduler.can_execute(job):
        # 执行开发工作流（workflow.json中的Phase 0-4）
        execute_development_workflow(job)

# 4. Traffic Agent跟踪进度
while not all_jobs_completed(jobs):
    progress = scheduler.get_progress(jobs)
    scheduler.report_status(progress)

    # 检测瓶颈
    bottlenecks = scheduler.detect_bottlenecks(jobs)
    if bottlenecks:
        scheduler.alert_user(bottlenecks)
```

### 开发工作流执行

```python
def execute_development_workflow(job):
    """执行开发工作流（Phase 0-7）"""

    # Phase 0: Requirement Research & Analysis
    execute_phase_0(job)

    # Phase 1: Ideation
    execute_phase_1(job)

    # Phase 2: Planning
    execute_phase_2(job)

    # Phase 3: Execution
    # 这里会创建多个Development Tasks
    tasks = extract_tasks_from_planning(job)

    for task_spec in tasks:
        dev_task = {
            "task_id": f"task_{uuid.uuid4()}",
            "job_id": job["job_id"],
            "task_name": task_spec["name"],
            "status": "pending"
        }

        # 技术判断
        if can_parallel(dev_task, other_tasks):
            # 创建隔离的worktree
            create_worktree(dev_task)

        # 调用CCB执行这个任务
        ccb_result = execute_ccb_task(dev_task)

        # 更新任务状态
        dev_task["status"] = "completed"
        db.update_development_task(dev_task)

    # Phase 4: Testing
    execute_phase_4(job)

    # Phase 5: Optimization
    execute_phase_5(job)

    # Phase 6: Review
    execute_phase_6(job)

    # Phase 7: Archiving
    execute_phase_7(job)
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

---

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

---

## 用户界面

### CLI UI（优先级：P0）

**主要功能：**
- 完整的配置管理（LLM、Agent、Tools、Workflow）
- Jobs & Tasks管理
- 系统设置和依赖管理

**技术栈：**
- TypeScript + cli-menu-kit
- 交互式菜单界面

**详见：** [CLI菜单结构](#cli菜单结构)

### Web UI（优先级：P2，加分项）

**范围：** 仅用于管理workflow执行，不包括配置管理

```
┌─────────────────────────────────────────────────────────┐
│              Web UI（浏览器界面）                         │
│                  仅用于workflow执行管理                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Dashboard                                           │
│     - 运行中的jobs                                       │
│     - 最近完成的jobs                                     │
│     - 快速操作                                           │
│     - 系统状态概览                                       │
│                                                         │
│  2. Job Detail                                          │
│     - Job信息（job_id、requirement、mode）               │
│     - Workflow进度（Phase 0-7进度条）                    │
│     - 当前步骤和状态                                     │
│     - 实时日志                                           │
│     - 操作按钮（Pause/Resume/Cancel）                    │
│     - Development tasks列表                             │
│     - Worktree信息                                      │
│                                                         │
│  3. Logs Viewer                                         │
│     - 实时日志流（WebSocket）                            │
│     - 日志过滤（按level、phase、step）                   │
│     - 搜索功能                                           │
│     - 导出日志                                           │
│                                                         │
│  4. Jobs List                                           │
│     - 所有jobs列表                                       │
│     - 按状态过滤（running/paused/completed/failed）      │
│     - 按时间排序                                         │
│     - 快速操作（pause/resume/cancel）                    │
│                                                         │
│  不包括：                                                │
│  ❌ 配置管理（LLM/Agent/Tools）                          │
│  ❌ Workflow配置（mode切换、edit workflow）              │
│  ❌ 系统设置                                             │
│  ❌ 依赖管理                                             │
│                                                         │
│  这些功能只在CLI UI中提供                                │
└─────────────────────────────────────────────────────────┘
```

**技术栈：**
- Frontend: React + TypeScript + Tailwind CSS
- Backend API: Python FastAPI
- Real-time: WebSocket for live updates
- State Management: React Query

**API接口：**
```typescript
// Jobs API
GET    /api/jobs              - List all jobs
GET    /api/jobs/:id          - Get job details
POST   /api/jobs              - Start new job
PUT    /api/jobs/:id/pause    - Pause job
PUT    /api/jobs/:id/resume   - Resume job
PUT    /api/jobs/:id/cancel   - Cancel job

// Logs API
GET    /api/jobs/:id/logs     - Get job logs
WS     /api/jobs/:id/logs/ws  - Real-time log stream

// Status API
GET    /api/status            - System status
```

**实现优先级：**
- P0: CLI UI（必须先做）
- P1: 配置管理和Adapters
- P2: Web UI（加分项）

---

## 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                    用户界面层                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────┐      ┌──────────────────────┐       │
│  │   CLI UI (P0)        │      │   Web UI (P2)        │       │
│  │   - 完整配置管理      │      │   - Jobs监控         │       │
│  │   - Jobs & Tasks     │      │   - 实时日志         │       │
│  │   - 系统设置         │      │   - Dashboard        │       │
│  └──────────┬───────────┘      └──────────┬───────────┘       │
│             │                              │                   │
└─────────────┼──────────────────────────────┼───────────────────┘
              │                              │
              │ TypeScript API               │ HTTP/WebSocket
              │                              │
┌─────────────▼──────────────────────────────▼───────────────────┐
│                    Backend Services (Python)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  调度层（Scheduling Layer）                           │     │
│  │  ├── PM Agent（项目管理）                             │     │
│  │  │   - 需求分析                                       │     │
│  │  │   - 任务拆解                                       │     │
│  │  │   - 优先级管理                                     │     │
│  │  └── Traffic Agent（进度跟踪）                        │     │
│  │      - 进度监控                                       │     │
│  │      - 瓶颈识别                                       │     │
│  │      - 状态报告                                       │     │
│  │                                                       │     │
│  │  实现方式：OpenClaw 或 CodeAct（二选一）              │     │
│  └──────────────────────────────────────────────────────┘     │
│                           │                                    │
│                           │ 调度                               │
│                           ↓                                    │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  开发工作流层（Development Workflow Layer）           │     │
│  │                                                       │     │
│  │  Workflow Executor                                    │     │
│  │  ├── Job Manager                                      │     │
│  │  ├── LocalScheduler                                   │     │
│  │  ├── StepExecutor                                     │     │
│  │  └── StateManager                                     │     │
│  │                                                       │     │
│  │  执行Phase 0-7：                                      │     │
│  │  - Phase 0: Requirement Research & Analysis          │     │
│  │  - Phase 1: Ideation                                 │     │
│  │  - Phase 2: Planning                                 │     │
│  │  - Phase 3: Execution                                │     │
│  │  - Phase 4: Testing                                  │     │
│  │  - Phase 5: Optimization                             │     │
│  │  - Phase 6: Review                                   │     │
│  │  - Phase 7: Archiving                                │     │
│  │                                                       │     │
│  │  技术判断：                                           │     │
│  │  - 任务独立性检查                                     │     │
│  │  - Worktree隔离                                       │     │
│  │  - 冲突检测                                           │     │
│  │  - 并行执行                                           │     │
│  └──────────────────────────────────────────────────────┘     │
│                           │                                    │
│                           │ 调用工具                           │
│                           ↓                                    │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  Adapters                                             │     │
│  │  ├── LLMAdapter（使用LLM配置）                         │     │
│  │  ├── AgentAdapter（使用Agent配置）                     │     │
│  │  ├── ToolsAdapter（使用Tools配置）                     │     │
│  │  │   ├── CCBAdapter                                   │     │
│  │  │   ├── CCAAdapter                                   │     │
│  │  │   ├── NPMAdapter                                   │     │
│  │  │   ├── DockerAdapter                                │     │
│  │  │   └── GitAdapter                                   │     │
│  │  ├── MCPAdapter                                       │     │
│  │  └── SkillsAdapter                                    │     │
│  └──────────────────────────────────────────────────────┘     │
│                           │                                    │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  Database (SQLite)                                    │     │
│  │  ├── Configuration Tables                             │     │
│  │  │   ├── llm_configs                                  │     │
│  │  │   ├── agent_configs                                │     │
│  │  │   ├── tools_configs                                │     │
│  │  │   └── workflow_configs                             │     │
│  │  └── Execution Tables                                 │     │
│  │      ├── project_jobs                                 │     │
│  │      ├── development_tasks                            │     │
│  │      ├── step_executions                              │     │
│  │      ├── progress_tracking                            │     │
│  │      └── execution_logs                               │     │
│  └──────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────┐
│              External Tools & Services                          │
├─────────────────────────────────────────────────────────────────┤
│  ├── LLM Providers（Claude、Gemini、Codex等）                   │
│  ├── CCB/CCA/CCH/Ralph（开发工具）                              │
│  ├── OpenClaw（可选的调度工具）                                 │
│  ├── MCP Servers                                                │
│  ├── Skills                                                     │
│  ├── NPM Packages                                               │
│  ├── Docker Services                                            │
│  ├── Git Repositories                                           │
│  └── Third-party Services                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

### 关键区分

1. **两层架构**
   - 调度层：PM/Traffic Agent（宏观管理）
   - 开发工作流层：CCB+CCA+其他工具（微观执行）

2. **三个Agent层次**
   - 层次1：调度Agent（Product Builder配置）
   - 层次2：开发Agent Team（CCB配置）
   - 层次3：Subagent（CCB内部）

3. **两个独立的工作流**
   - 调度工作流：PM/Traffic的管理流程（不在workflow.json中）
   - 开发工作流：Phase 0-4的执行流程（在workflow.json中）

4. **Job vs Task**
   - Project Job：整个项目的一次执行
   - Development Task：Phase 2中的具体开发任务

### Product Builder的职责

- ✅ 管理调度层（PM/Traffic Agent）
- ✅ 管理开发工作流（Phase 0-4）
- ✅ 管理Project Jobs
- ✅ 配置工具（CCB/CCA/npm/docker等）
- ✅ 配置LLM
- ✅ 调用CCB执行Development Tasks
- ❌ 不管理CCB内部的agent team
- ❌ 不管理CCB内部的workflow
- ❌ 不管理CCB内部的subagent

### 配置归属

**Product Builder配置：**
- 调度层Agent（PM/Traffic）
- 开发工作流（Phase 0-4）
- Phase LLM mapping
- 技术决策规则
- 工具路径和配置

**CCB配置：**
- Agent Team（Designer/Reviewer/Executor）
- Subagent机制
- 内部workflow

---

## 参考文档

- ARCHITECTURE-CORRECT-FINAL.md
- ARCHITECTURE-CLARIFICATION-CORRECT.md
- ARCHITECTURE-LAYERS-CLARIFICATION.md
