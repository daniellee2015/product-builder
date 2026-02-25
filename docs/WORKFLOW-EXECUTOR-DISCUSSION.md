# Workflow Executor 讨论记录

## 日期：2026-02-25

## 核心结论

### 1. Lobster 评估结果
- **Gemini**：建议使用 Lobster（需要适配层）
- **Codex**：不建议使用 Lobster（建议自己写 PB-native 执行器）
- **最终结论**：Lobster 不适合作为 Product Builder 的核心执行器
  - Lobster 是工具命令编排（command-based）
  - Product Builder 是产品开发流程编排（declarative）
  - 两者定位不同

### 2. 现有工具调研
- 搜索了 awesome-workflow-engines 列表
- 评估了 Temporal、Conductor、Airflow、Camunda 等工具
- **结论**：没有现成的工具完全符合 Product Builder 的需求
  - 现有工具都是数据管道、微服务编排、BPM
  - Product Builder 的领域是独特的（AI 驱动的产品开发）

### 3. 需要实现的系统

#### 第一层：Workflow 执行器（底层）
- Workflow 解析器（读取 workflow.json）
- Step 执行器（调用 ccb、cca、ralph）
- 控制流处理（condition、approval、min_mode）
- 状态管理（保存进度、恢复执行）

#### 第二层：Job/Task 管理工具（上层）
- Job 管理（创建、生命周期）
- Task 管理（依赖、状态跟踪）
- 并行执行管理（worktrees）

#### 支持层：工具集成和基础设施
- 工具集成层（CCB、CCA、Ralph）
- 数据存储（JSON 文件）
- 审批机制（CLI 交互）
- 日志和监控

## 用户的新困惑（2026-02-25 13:48）

### 核心问题
- 不知道要开发多少东西
- 哪些用别人的，哪些自己开发
- workflow 执行器是核心底层还是什么？

### 用户的理解
1. **即使没有工作流，LLM 也可以工作**，只是没有标准化
2. **工具集成的三种类型**：
   - 符合 workflow 的工具
   - 过程需要的 MCP
   - 上层的工具
3. **代理方案**：CCB + CCHub（多 LLM + fallback API）
4. **提示词、上下文、记忆**：
   - 工作流内部：CCB 的 session 管理 + CLI 的 session 管理
   - 上层：OpenClaw（LLM 长期记忆和调度）

### 待解决的问题
- Product Builder 的架构分层
- 哪些组件需要自己开发
- 哪些组件可以用现成工具
- 各层之间的关系和职责
