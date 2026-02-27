# Product Builder 架构修正版

## 优先级明确

### P0 - 核心功能（必须先做）
**CLI UI + Jobs & Tasks完整管理**

### P1 - 配置管理
**Workflow配置 + Tools配置 + LLM配置 + Agent配置**

### P2 - 加分项
**Web UI（仅用于管理workflow执行）**

## 菜单结构（修正版）

```
Product Builder CLI
├── 1. Setup（初始化）
│   ├── Initialize configuration
│   ├── Check status
│   └── Reset configuration
│
├── 2. Workflow（工作流配置）
│   ├── View workflow
│   ├── Switch mode (lite/standard/full)
│   ├── Edit workflow
│   ├── Import/Export workflow
│   └── Reset workflow
│
├── 3. Jobs & Tasks（工作流运转）⭐ 核心
│   ├── Start workflow          - 启动新workflow
│   ├── List jobs               - 列出所有jobs
│   ├── View job details        - 查看job详情
│   ├── Pause job               - 暂停job
│   ├── Resume job              - 恢复job
│   ├── Cancel job              - 取消job
│   ├── View logs               - 查看日志
│   └── View execution history  - 查看执行历史
│
├── 4. Agent（Agent配置）
│   ├── Configure agents
│   ├── Agent roles
│   └── Agent interfaces（未来扩展）
│
├── 5. Tools（工具配置）⭐ 重要
│   ├── NPM Packages            - npm包管理
│   ├── Docker Services         - docker服务管理
│   ├── Git Repositories        - 代码库管理
│   ├── Third-party Services    - 第三方服务
│   └── Custom Tools            - 自定义工具
│
├── 6. LLM（LLM配置）⭐ 独立
│   ├── Configure providers     - 配置providers
│   ├── API keys                - 管理API keys
│   ├── Models                  - 选择models
│   ├── Routing                 - 路由配置
│   └── Test connection         - 测试连接
│
└── 7. System（系统）
    ├── Settings
    ├── View configuration
    ├── Dependencies
    └── Help
```

## 配置分类（修正版）

### 1. LLM配置（独立模块）
**用途：** 配置AI模型的访问

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

### 2. Agent配置（独立模块）
**用途：** 配置上层agent

```json
{
  "agents": {
    "designer": {
      "type": "claude",
      "role": "planner",
      "enabled": true
    },
    "reviewer": {
      "type": "codex",
      "role": "reviewer",
      "enabled": true
    },
    "executor": {
      "type": "claude",
      "role": "executor",
      "enabled": true
    }
  },
  "interfaces": {
    "external_agent_api": {
      "enabled": false,
      "url": "http://localhost:8080"
    }
  }
}
```

### 3. Tools配置（独立模块）⭐ 重要
**用途：** 配置支撑工作流的工具

#### 3.1 NPM Packages
```json
{
  "npm_packages": {
    "cli-menu-kit": {
      "version": "^0.1.0",
      "installed": true,
      "required": true
    },
    "@modelcontextprotocol/sdk": {
      "version": "^1.0.0",
      "installed": true,
      "required": false
    }
  }
}
```

#### 3.2 Docker Services
```json
{
  "docker_services": {
    "mongodb": {
      "image": "mongo:latest",
      "ports": ["27017:27017"],
      "volumes": ["./data:/data/db"],
      "required": false,
      "running": false
    },
    "redis": {
      "image": "redis:alpine",
      "ports": ["6379:6379"],
      "required": false,
      "running": false
    }
  }
}
```

#### 3.3 Git Repositories（需要clone的代码库）
```json
{
  "git_repositories": {
    "openclaw": {
      "url": "https://github.com/openclaw/openclaw",
      "branch": "main",
      "path": "~/.product-builder/tools/openclaw",
      "cloned": false,
      "required": true
    },
    "custom-tool": {
      "url": "https://github.com/myorg/custom-tool",
      "branch": "main",
      "path": "~/.product-builder/tools/custom-tool",
      "cloned": false,
      "required": false
    }
  }
}
```

#### 3.4 CLI Tools（命令行工具）
```json
{
  "cli_tools": {
    "ccb": {
      "command": "ccb",
      "version": ">=1.0.0",
      "installed": true,
      "required": true,
      "install_method": "npm install -g @anthropic/claude-code"
    },
    "cca": {
      "command": "cca",
      "version": ">=1.0.0",
      "installed": false,
      "required": true,
      "install_method": "npm install -g @anthropic/claude-agent"
    },
    "ralph": {
      "command": "ralph",
      "installed": false,
      "required": false,
      "install_method": "git clone + npm install"
    }
  }
}
```

#### 3.5 Third-party Services
```json
{
  "third_party_services": {
    "github": {
      "enabled": true,
      "token": "ghp_...",
      "required": true
    },
    "vercel": {
      "enabled": false,
      "token": "",
      "required": false
    }
  }
}
```

### 4. MCP配置（属于Tools的一部分）
```json
{
  "mcp_servers": {
    "context7": {
      "type": "npm",
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"],
      "enabled": true
    },
    "github": {
      "type": "npm",
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

### 5. Skills配置（属于Tools的一部分）
```json
{
  "skills": {
    "git-commit": {
      "path": "~/.claude/skills/git-commit",
      "enabled": true,
      "type": "local"
    },
    "review-pr": {
      "path": "~/.claude/skills/review-pr",
      "enabled": true,
      "type": "local"
    }
  }
}
```

## 系统架构（修正版）

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLI UI（交互式菜单）⭐ 优先                     │
│                     使用 cli-menu-kit                            │
├─────────────────────────────────────────────────────────────────┤
│ 1. Setup                                                        │
│ 2. Workflow（工作流配置）                                         │
│ 3. Jobs & Tasks（工作流运转）⭐ 核心                              │
│    - Start/Pause/Resume/Cancel                                  │
│    - List/View/Logs                                             │
│ 4. Agent（Agent配置）                                            │
│ 5. Tools（工具配置）                                              │
│    - NPM/Docker/Git/CLI/Third-party                             │
│ 6. LLM（LLM配置）                                                │
│ 7. System                                                       │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ TypeScript API
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│              Backend Services (Python)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  Configuration Manager                               │     │
│  │  ├── LLM Config Manager                              │     │
│  │  ├── Agent Config Manager                            │     │
│  │  ├── Tools Config Manager                            │     │
│  │  │   ├── NPM Package Manager                         │     │
│  │  │   ├── Docker Service Manager                      │     │
│  │  │   ├── Git Repository Manager                      │     │
│  │  │   ├── CLI Tools Manager                           │     │
│  │  │   └── Third-party Service Manager                 │     │
│  │  └── Workflow Config Manager                         │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  Workflow Executor ⭐ 核心                             │     │
│  │  ├── Job Manager                                      │     │
│  │  │   ├── Start Job                                    │     │
│  │  │   ├── Pause Job                                    │     │
│  │  │   ├── Resume Job                                   │     │
│  │  │   ├── Cancel Job                                   │     │
│  │  │   └── Get Job Status                               │     │
│  │  ├── LocalScheduler                                   │     │
│  │  ├── StepExecutor                                     │     │
│  │  └── StateManager                                     │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  Adapters                                             │     │
│  │  ├── LLMAdapter（使用LLM配置）                         │     │
│  │  ├── AgentAdapter（使用Agent配置）                     │     │
│  │  ├── ToolsAdapter（使用Tools配置）                     │     │
│  │  │   ├── NPMAdapter                                   │     │
│  │  │   ├── DockerAdapter                                │     │
│  │  │   ├── GitAdapter                                   │     │
│  │  │   ├── CLIAdapter                                   │     │
│  │  │   └── ThirdPartyAdapter                            │     │
│  │  ├── MCPAdapter                                       │     │
│  │  └── SkillsAdapter                                    │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐     │
│  │  Database (SQLite)                                    │     │
│  │  ├── Configuration Tables                             │     │
│  │  │   ├── llm_configs                                  │     │
│  │  │   ├── agent_configs                                │     │
│  │  │   ├── tools_configs                                │     │
│  │  │   └── workflow_configs                             │     │
│  │  └── Execution Tables                                 │     │
│  │      ├── jobs                                          │     │
│  │      ├── step_executions                              │     │
│  │      └── execution_logs                               │     │
│  └──────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────┐
│              External Tools & Services                          │
├─────────────────────────────────────────────────────────────────┤
│  ├── LLM Providers（通过LLM配置）                                │
│  ├── Agents（通过Agent配置）                                     │
│  └── Tools（通过Tools配置）                                      │
│      ├── NPM Packages                                           │
│      ├── Docker Services                                        │
│      ├── Git Repositories                                       │
│      ├── CLI Tools (CCB, CCA, Ralph, OpenClaw)                 │
│      ├── MCP Servers                                            │
│      ├── Skills                                                 │
│      └── Third-party Services                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Web UI（加分项，P2优先级）

**范围：** 仅用于管理workflow执行

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
│                                                         │
│  2. Job Detail                                          │
│     - Job信息                                            │
│     - Workflow进度                                       │
│     - 实时日志                                           │
│     - 操作按钮（Pause/Resume/Cancel）                    │
│                                                         │
│  3. Logs Viewer                                         │
│     - 实时日志流                                         │
│     - 日志过滤                                           │
│     - 搜索功能                                           │
│                                                         │
│  不包括：                                                │
│  ❌ 配置管理（LLM/Agent/Tools）                          │
│  ❌ Workflow配置                                         │
│  ❌ 系统设置                                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 实现优先级（修正版）

### Phase 1: CLI UI + Jobs & Tasks核心（P0，必须先做）
**时间：** 3-4天

1. ✅ Database schema（已完成）
2. ⏳ Job Manager
   - Start job
   - Pause job
   - Resume job
   - Cancel job
   - Get job status
   - List jobs
   - Get job details
3. ⏳ CLI UI - Jobs & Tasks菜单
   - 交互式启动workflow
   - 列出jobs
   - 查看job详情
   - 暂停/恢复/取消操作
   - 查看日志
4. ⏳ 基础Workflow Executor
   - 执行workflow
   - 调用steps
   - 状态管理

### Phase 2: 配置管理（P1）
**时间：** 4-5天

1. ⏳ LLM配置管理
   - CLI菜单（已有框架）
   - 后端API
   - 配置存储
2. ⏳ Agent配置管理
   - CLI菜单
   - 后端API
   - 配置存储
3. ⏳ Tools配置管理⭐ 重要
   - NPM包管理
   - Docker服务管理
   - Git仓库管理
   - CLI工具管理
   - 第三方服务管理
   - MCP服务器管理
   - Skills管理

### Phase 3: Adapters集成（P1）
**时间：** 3-4天

1. ⏳ LLMAdapter
2. ⏳ AgentAdapter
3. ⏳ ToolsAdapter
   - NPMAdapter
   - DockerAdapter
   - GitAdapter
   - CLIAdapter
   - ThirdPartyAdapter
4. ⏳ MCPAdapter
5. ⏳ SkillsAdapter

### Phase 4: Web UI（P2，加分项）
**时间：** 3-4天

**仅实现workflow执行管理：**
1. ⏳ Dashboard（jobs概览）
2. ⏳ Job Detail（job详情和进度）
3. ⏳ Logs Viewer（实时日志）
4. ⏳ WebSocket集成（实时更新）

**不实现：**
- ❌ 配置管理界面
- ❌ Workflow配置界面
- ❌ 系统设置界面

## Jobs & Tasks完整功能清单

### 核心操作
1. **Start** - 启动新workflow
   - 输入requirement
   - 选择mode
   - 返回job_id
2. **Pause** - 暂停运行中的job
   - 保存当前状态
   - 停止执行
3. **Resume** - 恢复暂停的job
   - 从保存的状态继续
   - 继续执行
4. **Cancel** - 取消job
   - 停止执行
   - 标记为cancelled
5. **List** - 列出所有jobs
   - 按状态过滤
   - 按时间排序
6. **View Details** - 查看job详情
   - Job信息
   - Workflow进度
   - 当前步骤
   - 执行历史
7. **View Logs** - 查看日志
   - 实时日志流
   - 历史日志
   - 日志过滤

### 状态管理
```python
class JobStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
```

## 总结

### 关键修正
1. ✅ **CLI UI优先，Web UI是加分项**
2. ✅ **LLM、Agent、Tools分开配置**
3. ✅ **Tools包含npm/docker/git/cli/third-party**
4. ✅ **Jobs & Tasks是核心，需要完整管理**
5. ✅ **菜单结构重新组织**

### 优先级
- **P0:** CLI UI + Jobs & Tasks完整管理
- **P1:** 配置管理（LLM/Agent/Tools）+ Adapters
- **P2:** Web UI（仅workflow执行管理）

### 下一步
从Phase 1开始：实现Jobs & Tasks的完整管理功能！
