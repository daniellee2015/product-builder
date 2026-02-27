# Product Builder 实现路线图

## 架构可视化

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         用户交互层                                        │
│  ┌──────────────────────┐              ┌──────────────────────┐         │
│  │   CLI (pb命令)        │              │   Web UI (React)     │         │
│  │  - pb start          │              │  - Dashboard         │         │
│  │  - pb list           │◄────────────►│  - Job Detail        │         │
│  │  - pb status         │   HTTP/WS    │  - Logs Viewer       │         │
│  │  - pb logs           │              │  - Git Timeline      │         │
│  │  - pb serve          │              │  - GitHub Panel      │         │
│  └──────────┬───────────┘              └──────────┬───────────┘         │
└─────────────┼──────────────────────────────────────┼───────────────────┘
              │                                      │
              │ TypeScript Wrapper                   │ WebSocket
              │ (workflow-engine.ts)                 │
              │                                      │
┌─────────────┼──────────────────────────────────────┼───────────────────┐
│             ↓                                      ↓                    │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │              FastAPI Server (Python)                        │       │
│  │  ┌──────────────────┐         ┌──────────────────┐         │       │
│  │  │  HTTP API        │         │  WebSocket       │         │       │
│  │  │  /api/jobs/*     │         │  /ws/jobs/*      │         │       │
│  │  └────────┬─────────┘         └────────┬─────────┘         │       │
│  │           │                            │                    │       │
│  │           └────────────┬───────────────┘                    │       │
│  │                        ↓                                    │       │
│  │           ┌────────────────────────┐                        │       │
│  │           │   Event Bus            │                        │       │
│  │           │  - job_started         │                        │       │
│  │           │  - step_completed      │                        │       │
│  │           │  - log_message         │                        │       │
│  │           └────────────┬───────────┘                        │       │
│  └────────────────────────┼────────────────────────────────────┘       │
│                           ↓                                            │
│  ┌─────────────────────────────────────────────────────────────┐      │
│  │              Workflow Executor                              │      │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │      │
│  │  │ LocalScheduler│  │ StepExecutor │  │ StateManager │     │      │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │      │
│  │         │                 │                 │              │      │
│  │         └─────────────────┼─────────────────┘              │      │
│  │                           ↓                                │      │
│  │           ┌───────────────────────────┐                    │      │
│  │           │   Database (SQLite)       │                    │      │
│  │           │  - jobs                   │                    │      │
│  │           │  - step_executions        │                    │      │
│  │           │  - git_operations         │                    │      │
│  │           │  - github_issues          │                    │      │
│  │           │  - ... (22 tables)        │                    │      │
│  │           └───────────────────────────┘                    │      │
│  └─────────────────────────────────────────────────────────────┘      │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────┐      │
│  │              Adapters                                       │      │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │      │
│  │  │ GitAdapter   │  │GitHubAdapter │  │  LLMAdapter  │     │      │
│  │  └──────────────┘  └──────────────┘  └──────────────┘     │      │
│  └─────────────────────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────────────────────┘
```

## 实现优先级

### 🔴 P0 - 核心功能（必须先实现）

#### 1. FastAPI服务器基础 (2天)
**文件：** `scripts/python/server.py`

```python
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# HTTP API
@app.post("/api/jobs/start")
async def start_job(workflow_file: str, context: dict):
    # 调用WorkflowExecutor
    pass

@app.get("/api/jobs")
async def list_jobs():
    # 从数据库查询
    pass

@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str):
    # 从数据库查询
    pass

# WebSocket
@app.websocket("/ws/jobs/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str):
    # 实时推送更新
    pass

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3000)
```

**依赖：**
```bash
pip install fastapi uvicorn websockets
```

#### 2. 事件系统 (1天)
**文件：** `scripts/python/event_bus.py`

在WorkflowExecutor中集成事件发布：
- 步骤开始/完成
- Job状态变化
- 日志消息
- Git操作

#### 3. CLI命令 - pb serve (1天)
**文件：** `src/cli/serve.ts`

```typescript
import { spawn } from 'child_process';
import open from 'open';

export async function serveCommand(options: {
  port?: number;
  wsPort?: number;
  open?: boolean;
}) {
  const port = options.port || 3000;
  const wsPort = options.wsPort || 3001;

  // 启动Python服务器
  const server = spawn('python3', [
    'scripts/python/server.py',
    '--port', port.toString(),
    '--ws-port', wsPort.toString()
  ]);

  console.log(`🚀 Server started at http://localhost:${port}`);
  console.log(`📡 WebSocket at ws://localhost:${wsPort}`);

  if (options.open) {
    await open(`http://localhost:${port}`);
  }
}
```

### 🟡 P1 - 基础UI（快速可用）

#### 4. Web UI基础框架 (1天)
**目录：** `web-ui/`

```bash
# 创建React项目
npm create vite@latest web-ui -- --template react-ts
cd web-ui
npm install

# 安装依赖
npm install @tanstack/react-query axios
npm install -D tailwindcss postcss autoprefixer
```

#### 5. Dashboard页面 (1天)
**文件：** `web-ui/src/pages/Dashboard.tsx`

显示：
- 运行中的jobs列表
- 最近完成的jobs
- 快速操作按钮

#### 6. Job Detail页面 (1天)
**文件：** `web-ui/src/pages/JobDetail.tsx`

显示：
- Job基本信息
- Workflow进度
- 当前步骤
- 操作按钮

#### 7. WebSocket集成 (1天)
**文件：** `web-ui/src/hooks/useWebSocket.ts`

实现实时更新：
- Job状态变化
- 进度更新
- 日志推送

### 🟢 P2 - 增强功能（逐步完善）

#### 8. Logs Viewer (1天)
实时日志查看器：
- 自动滚动
- 日志级别过滤
- 搜索功能

#### 9. Git Timeline (1天)
Git操作历史：
- Commit列表
- Branch操作
- 可视化时间线

#### 10. GitHub Integration (1天)
GitHub集成面板：
- 关联的Issues
- 关联的PRs
- 状态同步

#### 11. CLI命令完善 (1天)
实现所有CLI命令：
- pb init
- pb start
- pb list
- pb status
- pb logs
- pb cancel
- pb dashboard

### 🔵 P3 - 高级功能（可选）

#### 12. 并行执行 (2天)
实现场景2：workflow内步骤并行

#### 13. 多workflow并发 (2天)
实现场景3：多个workflow同时运行

#### 14. 资源管理 (1天)
资源锁和调度优化

#### 15. 失败恢复 (1天)
自动重试和错误处理

## 最小可用版本 (MVP)

**目标：** 1周内完成基础可用版本

**包含：**
1. ✅ FastAPI服务器（HTTP + WebSocket）
2. ✅ 事件系统
3. ✅ pb serve命令
4. ✅ 基础Web UI（Dashboard + Job Detail）
5. ✅ WebSocket实时更新

**可以做到：**
- 启动workflow
- 实时查看进度
- 查看job列表
- 查看基本日志

## 技术栈总结

### 后端
- **FastAPI** - Web框架
- **uvicorn** - ASGI服务器
- **websockets** - WebSocket支持
- **SQLite** - 数据库
- **Python 3.9+** - 运行环境

### 前端
- **React 18** - UI框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **TailwindCSS** - 样式
- **React Query** - 数据获取
- **WebSocket API** - 实时通信

### CLI
- **TypeScript** - 类型安全
- **Commander.js** - CLI框架
- **Chalk** - 终端样式
- **Inquirer** - 交互式提示

## 开发流程

### Day 1-2: 后端基础
1. 创建FastAPI服务器
2. 实现HTTP API端点
3. 实现WebSocket服务器
4. 集成事件系统

### Day 3-4: 前端基础
1. 创建React项目
2. 实现Dashboard页面
3. 实现Job Detail页面
4. 集成WebSocket

### Day 5: CLI集成
1. 实现pb serve命令
2. 实现pb start命令
3. 测试端到端流程

### Day 6-7: 完善和测试
1. 添加错误处理
2. 优化性能
3. 编写文档
4. 端到端测试

## 下一步行动

**立即开始：**
1. 创建 `scripts/python/server.py`
2. 实现基础的HTTP API
3. 实现WebSocket服务器
4. 测试与现有WorkflowExecutor的集成

**命令：**
```bash
# 安装依赖
pip install fastapi uvicorn websockets

# 创建服务器文件
touch scripts/python/server.py
touch scripts/python/event_bus.py

# 开始实现！
```

准备好开始了吗？我们从FastAPI服务器开始！
