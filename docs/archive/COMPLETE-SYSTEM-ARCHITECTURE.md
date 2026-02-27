# Product Builder 完整系统架构

## 核心定位

Product Builder 是一个**配置管理和工作流编排工具**，用于AI驱动的产品开发。

**类比：** 就像 `create-react-app` 或 `vue-cli`，但用于AI开发架构。

## 系统全景图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Product Builder                                 │
│                   配置管理 + 工作流编排                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ↓                               ↓
┌───────────────────────────────────┐  ┌───────────────────────────────────┐
│        CLI UI (交互式菜单)          │  │        Web UI (浏览器界面)         │
│     使用 cli-menu-kit              │  │        使用 React                 │
├───────────────────────────────────┤  ├───────────────────────────────────┤
│ 1. Setup                          │  │ 1. Dashboard                      │
│    - Initialize                   │  │    - 系统概览                      │
│    - Check Status                 │  │    - 快速操作                      │
│    - Reset                        │  │                                   │
│                                   │  │ 2. Configuration                  │
│ 2. Workflow                       │  │    - Workflow配置                 │
│    - View/Edit Workflow           │  │    - LLM配置                      │
│    - Switch Mode                  │  │    - Tools配置                    │
│    - Import/Export                │  │                                   │
│                                   │  │ 3. Execution                      │
│ 3. Jobs & Tasks                   │  │    - Jobs列表                     │
│    - Start Workflow               │  │    - Job详情                      │
│    - List Jobs                    │  │    - 实时日志                      │
│    - View Details                 │  │    - Git操作历史                   │
│    - View Logs                    │  │                                   │
│                                   │  │ 4. Monitoring                     │
│ 4. Tools Configuration            │  │    - 实时进度                      │
│    - LLM CLI                      │  │    - 资源使用                      │
│    - Architecture Tools           │  │    - 错误追踪                      │
│    - Documentation                │  │                                   │
│    - MCP Servers                  │  │ 5. Settings                       │
│    - Skills                       │  │    - 用户偏好                      │
│    - Agents                       │  │    - 系统配置                      │
│                                   │  │                                   │
│ 5. System                         │  │                                   │
│    - Settings                     │  │                                   │
│    - View Config                  │  │                                   │
│    - Dependencies                 │  │                                   │
│    - Help                         │  │                                   │
└───────────────┬───────────────────┘  └───────────────┬───────────────────┘
                │                                      │
                │                                      │ WebSocket
                │ TypeScript API                       │ (实时通信)
                │                                      │
                └──────────────┬───────────────────────┘
                               │
                               ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      Backend Services (Python)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │  FastAPI Server (HTTP + WebSocket)                           │     │
│  │  ├── /api/config/*        - 配置管理API                       │     │
│  │  ├── /api/workflow/*      - Workflow管理API                   │     │
│  │  ├── /api/jobs/*          - Jobs管理API                       │     │
│  │  ├── /api/llm/*           - LLM配置API                        │     │
│  │  ├── /api/tools/*         - Tools配置API                      │     │
│  │  └── /ws/*                - WebSocket实时通信                  │     │
│  └──────────────────────────────────────────────────────────────┘     │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │  Configuration Manager (配置管理器)                            │     │
│  │  ├── LLM Config           - API keys, models, providers       │     │
│  │  ├── MCP Config           - MCP servers配置                   │     │
│  │  ├── Skills Config        - Skills定义和模板                   │     │
│  │  ├── Tools Config         - CCB, CCA, Ralph, OpenClaw配置     │     │
│  │  ├── Workflow Config      - Workflow定义                      │     │
│  │  └── Prompt Templates     - Prompt模板库                      │     │
│  └──────────────────────────────────────────────────────────────┘     │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │  Workflow Executor (工作流执行器)                              │     │
│  │  ├── LocalScheduler       - 任务调度                          │     │
│  │  ├── StepExecutor         - 步骤执行                          │     │
│  │  ├── StateManager         - 状态管理                          │     │
│  │  └── EventBus             - 事件总线                          │     │
│  └──────────────────────────────────────────────────────────────┘     │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │  Adapters (适配器层)                                           │     │
│  │  ├── LLMAdapter           - 调用LLM APIs                      │     │
│  │  ├── GitAdapter           - Git操作                           │     │
│  │  ├── GitHubAdapter        - GitHub集成                        │     │
│  │  ├── MCPAdapter           - MCP服务器通信                      │     │
│  │  ├── ToolsAdapter         - 调用外部工具(CCB/CCA/Ralph)        │     │
│  │  └── SkillsAdapter        - Skills执行                        │     │
│  └──────────────────────────────────────────────────────────────┘     │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │  Database (SQLite)                                            │     │
│  │  ├── Configuration Tables - 配置存储                          │     │
│  │  │   ├── llm_configs                                          │     │
│  │  │   ├── mcp_configs                                          │     │
│  │  │   ├── skills_configs                                       │     │
│  │  │   ├── tools_configs                                        │     │
│  │  │   └── prompt_templates                                     │     │
│  │  │                                                             │     │
│  │  ├── Workflow Tables      - Workflow数据                      │     │
│  │  │   ├── workflow_definitions                                 │     │
│  │  │   ├── workflow_steps                                       │     │
│  │  │   └── workflow_transitions                                 │     │
│  │  │                                                             │     │
│  │  └── Execution Tables     - 执行数据                          │     │
│  │      ├── jobs                                                  │     │
│  │      ├── step_executions                                      │     │
│  │      ├── git_operations                                       │     │
│  │      ├── github_issues                                        │     │
│  │      ├── llm_interactions                                     │     │
│  │      └── error_events                                         │     │
│  └──────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      External Tools & Services                          │
├─────────────────────────────────────────────────────────────────────────┤
│  ├── LLM Providers        - Claude, GPT, Gemini, etc.                  │
│  ├── CCB (Claude Code)    - Claude CLI工具                             │
│  ├── CCA (Claude Agent)   - Claude Agent系统                           │
│  ├── Ralph                - Prompt管理工具                              │
│  ├── OpenClaw             - 开发工具集                                  │
│  ├── MCP Servers          - Context7, GitHub, Playwright等             │
│  ├── Git/GitHub           - 版本控制                                    │
│  └── Skills               - 可重用的workflow模块                        │
└─────────────────────────────────────────────────────────────────────────┘
```

## 核心模块详解

### 1. Configuration Manager (配置管理器)

**职责：** 管理所有工具和服务的配置

#### 1.1 LLM Configuration
```json
{
  "llms": {
    "claude": {
      "enabled": true,
      "apiKey": "sk-...",
      "model": "claude-sonnet-4.5",
      "apiUrl": "https://api.anthropic.com",
      "priority": 1
    },
    "openai": {
      "enabled": true,
      "apiKey": "sk-...",
      "model": "gpt-4",
      "priority": 2
    }
  },
  "routing": {
    "default": "claude",
    "fallback": ["openai", "gemini"]
  }
}
```

#### 1.2 MCP Configuration
```json
{
  "servers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"],
      "enabled": true
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "ghp_..."
      },
      "enabled": true
    }
  }
}
```

#### 1.3 Skills Configuration
```json
{
  "skills": {
    "git-commit": {
      "path": "~/.claude/skills/git-commit",
      "enabled": true,
      "triggers": ["commit", "save changes"]
    },
    "review-pr": {
      "path": "~/.claude/skills/review-pr",
      "enabled": true,
      "triggers": ["review", "check pr"]
    }
  }
}
```

#### 1.4 Tools Configuration
```json
{
  "tools": {
    "ccb": {
      "path": "/usr/local/bin/ccb",
      "version": "1.0.0",
      "enabled": true
    },
    "cca": {
      "path": "/usr/local/bin/cca",
      "roles": ["designer", "reviewer", "executor"],
      "enabled": true
    },
    "ralph": {
      "path": "/usr/local/bin/ralph",
      "promptsDir": "~/.ralph/prompts",
      "enabled": true
    }
  }
}
```

#### 1.5 Prompt Templates
```json
{
  "templates": {
    "requirement-analysis": {
      "name": "Requirement Analysis",
      "content": "Analyze the following requirement...",
      "variables": ["requirement", "context"]
    },
    "code-review": {
      "name": "Code Review",
      "content": "Review the following code...",
      "variables": ["code", "language"]
    }
  }
}
```

### 2. Workflow Executor (工作流执行器)

**职责：** 执行workflow，调用配置的工具和服务

#### 执行流程
```
1. 加载Workflow定义
2. 加载配置（LLM, MCP, Skills, Tools）
3. 初始化Adapters
4. 执行Steps
   ├── 调用LLMAdapter（使用配置的API key和model）
   ├── 调用GitAdapter（执行Git操作）
   ├── 调用MCPAdapter（使用配置的MCP servers）
   ├── 调用ToolsAdapter（调用CCB/CCA/Ralph）
   └── 调用SkillsAdapter（执行Skills）
5. 记录执行历史
6. 发送实时更新（WebSocket）
```

### 3. Two UIs (两个用户界面)

#### 3.1 CLI UI (交互式菜单)
**技术栈：** TypeScript + cli-menu-kit + Inquirer

**特点：**
- 终端内运行
- 交互式菜单导航
- 适合开发者日常使用
- 快速配置和操作

**功能：**
- 配置管理（LLM, MCP, Skills, Tools）
- Workflow配置
- Jobs管理
- 实时状态查看（通过轮询或WebSocket）

#### 3.2 Web UI (浏览器界面)
**技术栈：** React + TypeScript + TailwindCSS + shadcn/ui

**特点：**
- 浏览器内运行
- 可视化界面
- 适合监控和管理
- 支持多用户访问

**功能：**
- Dashboard（系统概览）
- 配置管理（可视化编辑）
- Jobs监控（实时进度、日志）
- Git/GitHub集成可视化
- 图表和统计

**两个UI的关系：**
```
CLI UI ←→ Backend API ←→ Web UI
   ↓                        ↓
相同的功能，不同的界面
```

## 数据流

### 配置流
```
用户 → CLI UI/Web UI → Configuration Manager → Database
                                ↓
                        生成配置文件
                                ↓
                    ~/.product-builder/
                        ├── llm-config.json
                        ├── mcp-config.json
                        ├── skills-config.json
                        ├── tools-config.json
                        └── prompts/
```

### 执行流
```
用户启动Workflow
    ↓
CLI UI/Web UI
    ↓
Backend API
    ↓
Workflow Executor
    ├→ 读取配置（LLM, MCP, Skills, Tools）
    ├→ 初始化Adapters
    ├→ 执行Steps
    │   ├→ LLMAdapter（调用配置的LLM）
    │   ├→ MCPAdapter（使用配置的MCP servers）
    │   ├→ ToolsAdapter（调用CCB/CCA/Ralph）
    │   └→ SkillsAdapter（执行Skills）
    ├→ 记录到Database
    └→ 通过WebSocket推送更新
            ↓
    CLI UI/Web UI显示实时进度
```

## API设计

### Configuration APIs
```
GET    /api/config/llm              - 获取LLM配置
PUT    /api/config/llm              - 更新LLM配置
POST   /api/config/llm/test         - 测试LLM连接

GET    /api/config/mcp              - 获取MCP配置
PUT    /api/config/mcp              - 更新MCP配置
POST   /api/config/mcp/test         - 测试MCP服务器

GET    /api/config/skills           - 获取Skills配置
PUT    /api/config/skills           - 更新Skills配置

GET    /api/config/tools            - 获取Tools配置
PUT    /api/config/tools            - 更新Tools配置

GET    /api/config/prompts          - 获取Prompt模板
POST   /api/config/prompts          - 创建Prompt模板
PUT    /api/config/prompts/:id      - 更新Prompt模板
DELETE /api/config/prompts/:id      - 删除Prompt模板
```

### Workflow APIs
```
GET    /api/workflow                - 获取Workflow定义
PUT    /api/workflow                - 更新Workflow定义
POST   /api/workflow/validate       - 验证Workflow
GET    /api/workflow/modes          - 获取可用模式
POST   /api/workflow/switch-mode    - 切换模式
```

### Jobs APIs
```
POST   /api/jobs/start              - 启动Workflow
GET    /api/jobs                    - 列出Jobs
GET    /api/jobs/:id                - 获取Job详情
POST   /api/jobs/:id/cancel         - 取消Job
POST   /api/jobs/:id/resume         - 恢复Job
GET    /api/jobs/:id/logs           - 获取日志
GET    /api/jobs/:id/steps          - 获取步骤执行历史
GET    /api/jobs/:id/git            - 获取Git操作
GET    /api/jobs/:id/github         - 获取GitHub集成
GET    /api/jobs/:id/llm            - 获取LLM交互历史
```

### WebSocket Events
```
/ws/jobs              - 订阅所有Jobs更新
/ws/jobs/:id          - 订阅特定Job更新
/ws/logs/:id          - 订阅实时日志
/ws/config            - 订阅配置变更
```

## 实现优先级

### Phase 1: 配置管理后端 (3-4天)
1. ✅ Database schema（配置表 + 执行表）
2. ⏳ Configuration Manager
   - LLM配置管理
   - MCP配置管理
   - Skills配置管理
   - Tools配置管理
   - Prompt模板管理
3. ⏳ FastAPI Server
   - Configuration APIs
   - Workflow APIs
   - Jobs APIs

### Phase 2: CLI UI集成 (2-3天)
1. ⏳ 更新LLM菜单（连接后端API）
2. ⏳ 实现Jobs & Tasks菜单
3. ⏳ 添加配置同步功能
4. ⏳ 添加实时状态显示

### Phase 3: Workflow执行 (3-4天)
1. ⏳ Workflow Executor
2. ⏳ Adapters（LLM, Git, GitHub, MCP, Tools, Skills）
3. ⏳ Event Bus
4. ⏳ WebSocket Server

### Phase 4: Web UI (4-5天)
1. ⏳ 创建React项目
2. ⏳ Dashboard页面
3. ⏳ Configuration页面
4. ⏳ Jobs监控页面
5. ⏳ WebSocket集成

### Phase 5: 高级功能 (3-4天)
1. ⏳ 并行执行
2. ⏳ 多workflow并发
3. ⏳ 资源管理
4. ⏳ 失败恢复

## 关键设计原则

### 1. 配置驱动
所有工具和服务都通过配置管理，不硬编码。

### 2. 两个UI，一个后端
CLI UI和Web UI共享同一个后端API，保持功能一致。

### 3. 模块化
Configuration Manager、Workflow Executor、Adapters独立模块。

### 4. 实时通信
WebSocket提供实时更新，CLI UI和Web UI都支持。

### 5. 可扩展
易于添加新的LLM provider、MCP server、Tool、Skill。

## 总结

Product Builder不只是workflow执行器，而是一个完整的**AI开发工具链配置和编排平台**：

1. **配置管理** - LLM, MCP, Skills, Tools, Prompts
2. **Workflow编排** - 定义和执行复杂的开发流程
3. **双UI支持** - CLI UI（终端）+ Web UI（浏览器）
4. **实时监控** - WebSocket实时推送状态和日志
5. **工具集成** - CCB, CCA, Ralph, OpenClaw, MCP servers
6. **可扩展** - 易于添加新工具和服务

这才是Product Builder的完整愿景！
