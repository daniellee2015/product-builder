# Workflow架构转变分析

## 问题1：Job ID生成时机的变化

### 旧架构（基于文件）
```
用户输入 → 执行工作 → 完成后生成job_id → 保存文件
```

**特点：**
- Job ID在工作完成后生成
- 基于文件系统存储
- 难以追踪进行中的工作
- 无法实时查看状态

### 新架构（数据库驱动）
```
用户输入 → 立即创建job + 生成job_id → 执行工作 → 实时更新状态
```

**特点：**
- Job ID在开始时就生成
- 基于数据库存储
- 可以追踪进行中的工作
- 支持实时状态查询

### 需要检查的Workflow步骤

#### 当前workflow.json中可能需要调整的步骤：

**Phase 1: Planning**
```json
{
  "id": "P1-CREATE_JOB",
  "name": "Create job",
  "desc": "Create job record and assign job ID"
}
```

**问题：** 这个步骤现在应该在workflow执行之前就完成！

**调整方案：**

#### 方案A：移除P1-CREATE_JOB步骤
```
旧流程：
P0 → P1-CREATE_JOB → P1-其他步骤 → P2 → ...

新流程：
创建Job（在workflow外） → P0 → P1-其他步骤 → P2 → ...
```

#### 方案B：重新定义P1-CREATE_JOB的含义
```json
{
  "id": "P1-CREATE_JOB",
  "name": "Initialize job context",
  "desc": "Initialize job context and workspace (job already created)"
}
```

### 建议的新流程

```python
# 1. 用户启动workflow
pb start "Build authentication feature"

# 2. 系统立即创建job记录（在workflow执行前）
job = {
    "job_id": "job_20260226_001",
    "requirement": "Build authentication feature",
    "workflow_id": "product-builder-standard",
    "status": "pending",
    "created_at": "2026-02-26 10:00:00",
    "current_phase": None,
    "current_step": None
}
db.insert_job(job)

# 3. 开始执行workflow
job.status = "running"
job.current_phase = "P0"
db.update_job(job)

# 4. 执行P0步骤
execute_phase_0(job)

# 5. 执行P1步骤（不再包含CREATE_JOB）
execute_phase_1(job)
# P1-CREATE_JOB改为P1-INITIALIZE_WORKSPACE
# 或者直接移除这个步骤

# 6. 继续执行...
```

### Workflow定义需要调整的地方

#### 当前workflow.json中的问题步骤：

1. **P1-CREATE_JOB** - 需要移除或重新定义
2. **P1-CREATE_GIT_BRANCH** - 可能依赖job_id，需要确认
3. **任何依赖job_id的步骤** - 需要确认job_id已经存在

#### 建议的调整：

```json
{
  "phases": [
    {
      "id": "P0",
      "name": "Requirements",
      "steps": [
        // P0步骤不变
      ]
    },
    {
      "id": "P1",
      "name": "Planning",
      "steps": [
        // 移除或重命名
        // { "id": "P1-CREATE_JOB", ... }

        // 改为
        {
          "id": "P1-INITIALIZE_WORKSPACE",
          "name": "Initialize workspace",
          "desc": "Set up workspace and directories for this job"
        },
        {
          "id": "P1-CREATE_GIT_BRANCH",
          "name": "Create git branch",
          "desc": "Create feature branch (job_id already available)"
        }
        // ... 其他步骤
      ]
    }
  ]
}
```

## 问题2：Agent vs LLM 的分离

### 你的问题："agent和llm分开了，意思是？"

让我解释这两个概念的区别：

### LLM（Large Language Model）
**定义：** 底层的AI模型服务

**配置内容：**
```json
{
  "llms": {
    "claude": {
      "provider": "anthropic",
      "apiKey": "sk-...",
      "model": "claude-sonnet-4.5",
      "apiUrl": "https://api.anthropic.com"
    },
    "openai": {
      "provider": "openai",
      "apiKey": "sk-...",
      "model": "gpt-4",
      "apiUrl": "https://api.openai.com"
    }
  }
}
```

**作用：**
- 提供AI能力的基础设施
- 就像"原材料"
- 配置API访问、模型选择

### Agent（智能代理）
**定义：** 使用LLM的上层应用/角色

**配置内容：**
```json
{
  "agents": {
    "designer": {
      "role": "planner",
      "llm": "claude",  // ← 使用哪个LLM
      "prompt_template": "design_prompt.txt",
      "tools": ["read_file", "write_file"]
    },
    "reviewer": {
      "role": "reviewer",
      "llm": "codex",  // ← 使用哪个LLM
      "prompt_template": "review_prompt.txt",
      "tools": ["read_file", "analyze_code"]
    },
    "executor": {
      "role": "executor",
      "llm": "claude",  // ← 使用哪个LLM
      "prompt_template": "execute_prompt.txt",
      "tools": ["read_file", "write_file", "run_command"]
    }
  }
}
```

**作用：**
- 定义Agent的角色和行为
- 配置使用哪个LLM
- 配置prompt模板
- 配置可用的工具

### 关系图

```
┌─────────────────────────────────────────────────┐
│              Agent Layer（上层）                 │
│                                                 │
│  Designer Agent                                 │
│  ├── Role: planner                              │
│  ├── LLM: claude ──────┐                        │
│  ├── Prompt: design.txt│                        │
│  └── Tools: [...]      │                        │
│                        │                        │
│  Reviewer Agent        │                        │
│  ├── Role: reviewer    │                        │
│  ├── LLM: codex ───────┼────┐                   │
│  ├── Prompt: review.txt│    │                   │
│  └── Tools: [...]      │    │                   │
│                        │    │                   │
│  Executor Agent        │    │                   │
│  ├── Role: executor    │    │                   │
│  ├── LLM: claude ──────┘    │                   │
│  ├── Prompt: execute.txt    │                   │
│  └── Tools: [...]           │                   │
└─────────────────────────────┼───────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────┐
│              LLM Layer（底层）                   │
│                                                 │
│  Claude                                         │
│  ├── API Key: sk-...                            │
│  ├── Model: claude-sonnet-4.5                   │
│  └── URL: https://api.anthropic.com             │
│                                                 │
│  Codex                                          │
│  ├── API Key: sk-...                            │
│  ├── Model: codex-latest                        │
│  └── URL: https://api.openai.com                │
│                                                 │
│  Gemini                                         │
│  ├── API Key: ...                               │
│  ├── Model: gemini-pro                          │
│  └── URL: https://api.google.com                │
└─────────────────────────────────────────────────┘
```

### 类比说明

**LLM = 演员**
- Claude是一个演员
- GPT是另一个演员
- Gemini是第三个演员

**Agent = 角色**
- Designer是一个角色（可以由Claude扮演）
- Reviewer是另一个角色（可以由Codex扮演）
- Executor是第三个角色（可以由Claude扮演）

**同一个演员可以扮演多个角色：**
- Claude可以同时扮演Designer和Executor
- 不同的角色可以由不同的演员扮演

### 为什么要分开？

#### 1. 灵活性
```json
// 可以轻松切换Agent使用的LLM
{
  "agents": {
    "designer": {
      "llm": "claude"  // 今天用Claude
    }
  }
}

// 改为
{
  "agents": {
    "designer": {
      "llm": "gpt-4"  // 明天换成GPT-4
    }
  }
}
```

#### 2. 复用性
```json
// 多个Agent可以共享同一个LLM配置
{
  "llms": {
    "claude": {
      "apiKey": "sk-...",  // 只配置一次
      "model": "claude-sonnet-4.5"
    }
  },
  "agents": {
    "designer": { "llm": "claude" },  // 复用
    "executor": { "llm": "claude" },  // 复用
    "reviewer": { "llm": "claude" }   // 复用
  }
}
```

#### 3. 关注点分离
- **LLM配置** - 关注API访问、认证、模型选择
- **Agent配置** - 关注角色定义、行为、工具

### 在Workflow中的使用

```python
# Workflow执行时
def execute_step(step, job):
    if step.requires_agent:
        # 1. 获取Agent配置
        agent_config = get_agent_config(step.agent_name)

        # 2. 获取Agent使用的LLM配置
        llm_config = get_llm_config(agent_config.llm)

        # 3. 创建Agent实例
        agent = create_agent(
            role=agent_config.role,
            llm=llm_config,
            prompt_template=agent_config.prompt_template,
            tools=agent_config.tools
        )

        # 4. 执行
        result = agent.execute(step.task)
```

### 菜单中的体现

```
4. Agent（Agent配置）
   ├── Configure agents
   │   ├── Designer agent
   │   │   ├── Role: planner
   │   │   ├── LLM: claude ← 选择使用哪个LLM
   │   │   ├── Prompt template
   │   │   └── Tools
   │   ├── Reviewer agent
   │   └── Executor agent
   └── Agent interfaces

6. LLM（LLM配置）
   ├── Configure providers
   │   ├── Claude
   │   │   ├── API Key
   │   │   ├── Model
   │   │   └── API URL
   │   ├── OpenAI
   │   └── Gemini
   ├── Test connection
   └── Routing
```

## 总结

### 问题1：Job ID生成时机
**结论：** 需要调整workflow定义
- 移除或重命名P1-CREATE_JOB步骤
- Job ID在workflow执行前就生成
- 确保所有依赖job_id的步骤都在job创建之后

### 问题2：Agent vs LLM
**结论：** 两层架构
- **LLM层（底层）** - API配置、模型选择
- **Agent层（上层）** - 角色定义、使用LLM、工具配置
- Agent使用LLM，但配置分离
- 提供灵活性和复用性

这样解释清楚了吗？
