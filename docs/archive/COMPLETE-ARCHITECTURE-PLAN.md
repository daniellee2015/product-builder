# Product Builder 完整架构规划

## 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│ Product Builder CLI (pb命令)                                     │
│  ├── pb init          - 初始化项目                               │
│  ├── pb start         - 启动workflow                             │
│  ├── pb list          - 列出所有jobs                             │
│  ├── pb status        - 查看job状态                              │
│  ├── pb logs          - 查看日志                                 │
│  ├── pb cancel        - 取消job                                  │
│  ├── pb serve         - 启动服务器（WebSocket + Web UI）         │
│  └── pb dashboard     - 打开Web UI                               │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ Python Workflow Engine (后台服务)                                │
│  ├── HTTP API Server (FastAPI)                                  │
│  │   ├── POST /jobs/start      - 启动workflow                   │
│  │   ├── GET  /jobs            - 列出jobs                       │
│  │   ├── GET  /jobs/:id        - 获取job详情                    │
│  │   ├── POST /jobs/:id/cancel - 取消job                        │
│  │   └── GET  /jobs/:id/logs   - 获取日志                       │
│  │                                                               │
│  ├── WebSocket Server                                           │
│  │   ├── /ws/jobs              - 订阅所有jobs更新               │
│  │   ├── /ws/jobs/:id          - 订阅特定job更新                │
│  │   └── /ws/logs/:id          - 订阅实时日志                   │
│  │                                                               │
│  ├── Workflow Executor                                          │
│  ├── LocalScheduler                                             │
│  ├── Database (SQLite)                                          │
│  └── Adapters (Git/GitHub/LLM)                                  │
└─────────────────────────────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ Web UI (React + TypeScript)                                     │
│  ├── Dashboard Page          - 所有jobs概览                      │
│  ├── Job Detail Page         - 单个job详情                       │
│  ├── Logs Viewer             - 实时日志查看器                    │
│  ├── Git Operations          - Git操作历史                       │
│  └── GitHub Integration      - Issues/PRs链接                   │
└─────────────────────────────────────────────────────────────────┘
```

## Phase 2: CLI命令规划

### 核心命令

#### 1. `pb init`
初始化Product Builder项目

```bash
pb init [project-name]

# 功能：
# - 创建 .product-builder/ 目录
# - 初始化数据库
# - 生成默认配置文件
# - 检查依赖（Python、Git等）
```

#### 2. `pb start`
启动新的workflow

```bash
pb start [requirement] [options]

# 选项：
# --mode <lite|standard|full>  - Workflow模式
# --workflow <file>             - 自定义workflow文件
# --async                       - 后台运行
# --watch                       - 启动后打开实时监控

# 示例：
pb start "Build authentication feature" --mode standard --watch
```

#### 3. `pb list`
列出所有jobs

```bash
pb list [options]

# 选项：
# --status <running|completed|failed>  - 按状态过滤
# --limit <n>                          - 限制数量
# --json                               - JSON输出

# 示例：
pb list --status running
pb list --limit 10 --json
```

#### 4. `pb status`
查看job状态

```bash
pb status [job-id] [options]

# 选项：
# --watch     - 实时监控（使用WebSocket）
# --json      - JSON输出

# 示例：
pb status job_123
pb status job_123 --watch
```

#### 5. `pb logs`
查看job日志

```bash
pb logs <job-id> [options]

# 选项：
# --follow    - 实时跟踪日志
# --tail <n>  - 显示最后n行
# --json      - JSON输出

# 示例：
pb logs job_123 --follow
pb logs job_123 --tail 50
```

#### 6. `pb cancel`
取消运行中的job

```bash
pb cancel <job-id>

# 示例：
pb cancel job_123
```

#### 7. `pb serve`
启动服务器（WebSocket + Web UI）

```bash
pb serve [options]

# 选项：
# --port <port>       - HTTP端口（默认3000）
# --ws-port <port>    - WebSocket端口（默认3001）
# --host <host>       - 主机地址（默认localhost）
# --open              - 自动打开浏览器

# 示例：
pb serve --port 3000 --open
```

#### 8. `pb dashboard`
打开Web UI

```bash
pb dashboard

# 功能：
# - 检查服务器是否运行
# - 如果未运行，启动服务器
# - 打开浏览器到dashboard
```

### 辅助命令

#### 9. `pb resume`
恢复暂停的workflow

```bash
pb resume <job-id>
```

#### 10. `pb inspect`
检查workflow定义

```bash
pb inspect [workflow-file]

# 功能：
# - 显示workflow结构
# - 验证workflow配置
# - 显示步骤依赖关系
```

#### 11. `pb config`
管理配置

```bash
pb config <get|set|list> [key] [value]

# 示例：
pb config list
pb config get workflow.mode
pb config set workflow.mode standard
```

## Phase 3: WebSocket服务器

### 技术栈
- **FastAPI** - HTTP API和WebSocket服务器
- **uvicorn** - ASGI服务器
- **websockets** - WebSocket支持

### WebSocket事件

#### 1. Job状态更新
```json
{
  "type": "job_status",
  "job_id": "job_123",
  "status": "running",
  "progress": 45,
  "current_step": "P2-EXECUTE_TASK",
  "timestamp": "2026-02-26T13:47:17Z"
}
```

#### 2. Step执行更新
```json
{
  "type": "step_execution",
  "job_id": "job_123",
  "step_id": "P2-EXECUTE_TASK",
  "status": "running",
  "progress": 75,
  "message": "Executing task...",
  "timestamp": "2026-02-26T13:47:17Z"
}
```

#### 3. 日志消息
```json
{
  "type": "log",
  "job_id": "job_123",
  "level": "info",
  "message": "Task completed successfully",
  "timestamp": "2026-02-26T13:47:17Z"
}
```

#### 4. Git操作
```json
{
  "type": "git_operation",
  "job_id": "job_123",
  "operation": "commit",
  "details": {
    "commit_sha": "abc123",
    "message": "feat: add authentication"
  },
  "timestamp": "2026-02-26T13:47:17Z"
}
```

### API端点

#### HTTP API
```
POST   /api/jobs/start          - 启动workflow
GET    /api/jobs                - 列出jobs
GET    /api/jobs/:id            - 获取job详情
POST   /api/jobs/:id/cancel     - 取消job
POST   /api/jobs/:id/resume     - 恢复job
GET    /api/jobs/:id/logs       - 获取日志
GET    /api/jobs/:id/steps      - 获取步骤执行历史
GET    /api/jobs/:id/git        - 获取Git操作历史
GET    /api/jobs/:id/github     - 获取GitHub集成信息
```

#### WebSocket
```
/ws/jobs              - 订阅所有jobs更新
/ws/jobs/:id          - 订阅特定job更新
/ws/logs/:id          - 订阅实时日志
```

## Phase 4: Web UI

### 技术栈
- **React** - UI框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **TailwindCSS** - 样式
- **shadcn/ui** - UI组件库
- **React Query** - 数据获取
- **WebSocket** - 实时通信

### 页面结构

#### 1. Dashboard (/)
```
┌─────────────────────────────────────────────────────────┐
│ Product Builder Dashboard                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Active Jobs (3)                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ job_123  Build auth feature      [████░░] 75%   │   │
│ │ job_124  Fix bug in API          [██░░░░] 40%   │   │
│ │ job_125  Refactor database       [█░░░░░] 20%   │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ Recent Jobs                                             │
│ ┌─────────────────────────────────────────────────┐   │
│ │ job_122  ✓ Completed  2h ago                    │   │
│ │ job_121  ✗ Failed     3h ago                    │   │
│ │ job_120  ✓ Completed  5h ago                    │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ [+ Start New Workflow]                                  │
└─────────────────────────────────────────────────────────┘
```

#### 2. Job Detail (/jobs/:id)
```
┌─────────────────────────────────────────────────────────┐
│ Job: Build authentication feature                       │
│ Status: Running  Progress: 75%  [████████░░]            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Workflow Progress                                       │
│ ┌─────────────────────────────────────────────────┐   │
│ │ ✓ Phase 0: Requirements        100%             │   │
│ │ ✓ Phase 1: Planning            100%             │   │
│ │ ▶ Phase 2: Execution            75%             │   │
│ │   ✓ P2-EXECUTE_TASK                             │   │
│ │   ▶ P2-COMMIT_TASK                              │   │
│ │   ○ P2-RUN_TESTS                                │   │
│ │ ○ Phase 3: Review                0%             │   │
│ │ ○ Phase 4: Archive               0%             │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ Tabs: [Overview] [Logs] [Git] [GitHub]                 │
│                                                         │
│ [Cancel Job] [View Logs]                                │
└─────────────────────────────────────────────────────────┘
```

#### 3. Logs Viewer (/jobs/:id/logs)
```
┌─────────────────────────────────────────────────────────┐
│ Logs: job_123                                           │
│ [Auto-scroll ✓] [Filter: All ▼] [Search...]            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 13:45:12 [INFO]  Starting Phase 2: Execution           │
│ 13:45:15 [INFO]  Executing step P2-EXECUTE_TASK        │
│ 13:45:20 [DEBUG] Loading task configuration            │
│ 13:45:25 [INFO]  Task execution started                │
│ 13:46:30 [INFO]  Task completed successfully           │
│ 13:46:32 [INFO]  Starting step P2-COMMIT_TASK          │
│ 13:46:35 [DEBUG] Staging files...                      │
│ 13:46:40 [INFO]  Creating commit...                    │
│ ▼                                                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### UI组件

#### 1. JobCard
显示job概览卡片
- Job ID和名称
- 状态徽章
- 进度条
- 时间信息
- 快速操作按钮

#### 2. WorkflowProgress
显示workflow执行进度
- Phase列表
- Step列表
- 进度指示器
- 状态图标

#### 3. LogViewer
实时日志查看器
- 自动滚动
- 日志级别过滤
- 搜索功能
- 时间戳显示

#### 4. GitTimeline
Git操作时间线
- Commit历史
- Branch操作
- Push/Pull记录

#### 5. GitHubIntegration
GitHub集成面板
- 关联的Issues
- 关联的PRs
- 状态同步

## 实现计划

### Phase 2.1: CLI命令实现（1-2天）
- [ ] 实现 `pb init`
- [ ] 实现 `pb start`
- [ ] 实现 `pb list`
- [ ] 实现 `pb status`
- [ ] 实现 `pb logs`
- [ ] 实现 `pb cancel`
- [ ] 更新TypeScript包装器

### Phase 2.2: FastAPI服务器（2-3天）
- [ ] 创建FastAPI应用
- [ ] 实现HTTP API端点
- [ ] 实现WebSocket服务器
- [ ] 集成WorkflowExecutor
- [ ] 实现事件广播系统

### Phase 2.3: Web UI基础（3-4天）
- [ ] 创建React项目（Vite + TypeScript）
- [ ] 实现Dashboard页面
- [ ] 实现Job Detail页面
- [ ] 实现WebSocket客户端
- [ ] 实现实时更新

### Phase 2.4: Web UI高级功能（2-3天）
- [ ] 实现Logs Viewer
- [ ] 实现Git Timeline
- [ ] 实现GitHub Integration
- [ ] 添加搜索和过滤
- [ ] 优化性能

### Phase 2.5: 集成和测试（1-2天）
- [ ] 端到端测试
- [ ] 性能测试
- [ ] 文档更新
- [ ] 部署指南

## 技术细节

### WebSocket连接管理

```python
# server.py
from fastapi import FastAPI, WebSocket
from typing import Dict, Set

app = FastAPI()

# 连接管理器
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, job_id: str, websocket: WebSocket):
        await websocket.accept()
        if job_id not in self.active_connections:
            self.active_connections[job_id] = set()
        self.active_connections[job_id].add(websocket)

    def disconnect(self, job_id: str, websocket: WebSocket):
        self.active_connections[job_id].remove(websocket)

    async def broadcast(self, job_id: str, message: dict):
        if job_id in self.active_connections:
            for connection in self.active_connections[job_id]:
                await connection.send_json(message)

manager = ConnectionManager()

@app.websocket("/ws/jobs/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str):
    await manager.connect(job_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except:
        manager.disconnect(job_id, websocket)
```

### 事件广播系统

```python
# events.py
from typing import Callable, Dict, List
import asyncio

class EventBus:
    def __init__(self):
        self.listeners: Dict[str, List[Callable]] = {}

    def subscribe(self, event_type: str, callback: Callable):
        if event_type not in self.listeners:
            self.listeners[event_type] = []
        self.listeners[event_type].append(callback)

    async def publish(self, event_type: str, data: dict):
        if event_type in self.listeners:
            for callback in self.listeners[event_type]:
                await callback(data)

# 全局事件总线
event_bus = EventBus()

# 在WorkflowExecutor中发布事件
async def execute_step(step_id: str):
    await event_bus.publish("step_started", {
        "job_id": job_id,
        "step_id": step_id
    })

    # 执行步骤...

    await event_bus.publish("step_completed", {
        "job_id": job_id,
        "step_id": step_id
    })
```

### React WebSocket Hook

```typescript
// useWebSocket.ts
import { useEffect, useState } from 'react';

export function useWebSocket<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setData(message);
    };

    return () => ws.close();
  }, [url]);

  return { data, isConnected };
}

// 使用
function JobDetail({ jobId }: { jobId: string }) {
  const { data: jobStatus } = useWebSocket<JobStatus>(
    `ws://localhost:3001/ws/jobs/${jobId}`
  );

  return (
    <div>
      <h1>Job: {jobId}</h1>
      <p>Status: {jobStatus?.status}</p>
      <p>Progress: {jobStatus?.progress}%</p>
    </div>
  );
}
```

## 配置文件

### .product-builder/config.json
```json
{
  "server": {
    "host": "localhost",
    "port": 3000,
    "ws_port": 3001
  },
  "database": {
    "path": ".product-builder/workflow.db"
  },
  "workflow": {
    "default_mode": "standard",
    "auto_start_server": true
  },
  "ui": {
    "theme": "dark",
    "auto_scroll_logs": true
  }
}
```

## 总结

这个完整的架构提供了：

1. **强大的CLI** - 所有操作都可以通过命令行完成
2. **实时通信** - WebSocket提供实时状态更新
3. **可视化界面** - Web UI提供直观的监控和管理
4. **灵活性** - 可以选择使用CLI或UI
5. **扩展性** - 易于添加新功能和集成

下一步：开始实现Phase 2.1（CLI命令）！
