# Flexible Workflow Architecture

## Overview

Product Builder uses a **flexible, phase-based workflow** instead of a rigid step-by-step process. The workflow adapts dynamically based on task complexity, auto-healing requirements, and project needs.

## Design Philosophy

### ❌ Rigid Approach (Old)
```
Step 1 → Step 2 → Step 3 → ... → Step 27
(Fixed sequence, no flexibility)
```

### ✅ Flexible Approach (New)
```
Phase 0: Requirement Analysis & MDX Generation (A steps, variable)
  ├─ Sub-phase 0.1: Initial Requirement Collection (B steps)
  ├─ Sub-phase 0.2: Market Research (C steps)
  ├─ Sub-phase 0.3: Product Design (D steps)
  └─ Sub-phase 0.4: MDX Generation (E steps)

Phase 1: Planning (X steps, variable)
  ├─ Sub-phase 1.1: Preparation (Y steps)
  ├─ Sub-phase 1.2: Input Processing (Z steps, variable)
  └─ Sub-phase 1.3: Generation (W steps)

Phase 2: Execution (dynamic step count)
  └─ Loop: Each task (N steps)

Phase 3: Acceptance (M steps, with auto-healing)

Phase 4: Archival (K steps)
```

## Workflow Structure

### Hierarchy

```
Workflow
  └─ Phases (5 major phases)
      └─ Sub-phases (multiple per phase)
          └─ Steps (variable count per sub-phase)
              └─ Actions (atomic operations)
```

### Key Characteristics

1. **Variable Step Counts**: Sub-phases can have different numbers of steps based on context
2. **Auto-Healing Loops**: Failed steps can trigger retry sub-phases
3. **Conditional Branching**: Workflow can skip or add sub-phases based on conditions
4. **Dynamic Expansion**: Complex tasks can expand into more steps

## Phase Definitions

### Phase 0: Requirement Analysis & MDX Generation (需求分析与MDX生成)

**Purpose**: Transform user requirement (brief or detailed) into comprehensive, approved MDX document

**Input Types**:
- **Type 1**: One-sentence requirement (e.g., "要做一个分析自媒体和带货视频及账号的工具")
- **Type 2**: Detailed requirement description (user already has planning document)

**Output**: Approved MDX document with detailed requirements, analysis, and design

**Automation**: This phase is fully automated with multi-model review and user confirmation at the end

**Sub-phases**:

#### 0.1 Initial Requirement Collection (初始需求收集) - 1-5 steps (variable)

```yaml
# Branch 1: Brief requirement (1 sentence)
steps:
  - id: 0.1.1
    name: Collect user requirement
    description: Gather initial requirement from user
    input: User conversation
    output: Initial requirement statement
    condition: input_type == 'brief'

  - id: 0.1.2
    name: Requirement clarification
    description: Ask clarifying questions to understand user intent
    questions:
      - Target users (who will use this?)
      - Core problem (what problem does it solve?)
      - Key features (what are must-have features?)
      - Constraints (budget, timeline, technical constraints)
    output: Clarified requirement
    condition: input_type == 'brief'

  - id: 0.1.3
    name: Requirement expansion
    description: Expand brief requirement into detailed description
    output: Expanded requirement document
    condition: input_type == 'brief'

# Branch 2: Detailed requirement (user already has planning)
steps:
  - id: 0.1.1
    name: Collect detailed requirement
    description: Gather detailed requirement document from user
    input: User's planning document (text, doc, or conversation)
    output: Raw requirement document
    condition: input_type == 'detailed'

  - id: 0.1.2
    name: Parse and structure requirement
    description: Parse user's detailed requirement and structure it
    output: Structured requirement document
    condition: input_type == 'detailed'
```

**Example**:
```
Input: "要做一个分析自媒体和带货视频及账号的工具"

After clarification:
- Target users: 电商运营人员、MCN机构、品牌方
- Core problem: 难以快速分析竞品账号和爆款视频的成功因素
- Key features:
  * 账号数据分析（粉丝增长、互动率）
  * 视频内容分析（标题、标签、文案）
  * 带货数据分析（销量、转化率）
  * 竞品对比分析
- Constraints: 需要支持抖音、小红书、B站等平台
```

---

#### 0.2 Market Research (市场调研) - 3-6 steps (variable)

```yaml
steps:
  - id: 0.2.1
    name: Competitor research
    description: Research existing similar products
    tools:
      - web_search
      - context7 (for latest product info)
    output: Competitor list with features

  - id: 0.2.2
    name: Competitor analysis
    description: Analyze competitor strengths and weaknesses
    analysis:
      - Feature comparison
      - Pricing comparison
      - User reviews analysis
      - Market positioning
    output: Competitor analysis report

  - id: 0.2.3
    name: Pain point identification
    description: Identify user pain points from research
    sources:
      - User reviews of competitors
      - Social media discussions
      - Industry reports
    output: Pain point list

  - id: 0.2.4
    name: Differentiation strategy
    description: Define how our product will be different
    output: Differentiation points

  - id: 0.2.5
    name: Market opportunity analysis
    description: Analyze market size and opportunity
    output: Market opportunity report
```

**Example Output**:
```markdown
## 竞品分析

### 主要竞品
1. **飞瓜数据** - 专注抖音数据分析
   - 优势：数据全面、更新及时
   - 劣势：价格昂贵、仅支持抖音

2. **新榜** - 多平台内容数据分析
   - 优势：支持多平台
   - 劣势：带货数据不够详细

3. **蝉妈妈** - 直播带货数据分析
   - 优势：直播数据详细
   - 劣势：视频内容分析较弱

## 用户痛点
1. 现有工具价格昂贵（月费数千元）
2. 数据分散在多个平台，需要多个工具
3. 缺少 AI 辅助的内容分析和建议
4. 导出和报告功能不够灵活

## 差异化策略
1. **AI 驱动的内容分析** - 自动分析爆款视频的成功要素
2. **多平台统一分析** - 一个工具支持所有主流平台
3. **性价比** - 提供免费版和低价专业版
4. **智能建议** - 基于数据给出内容创作建议
```

---

#### 0.3 Product Design (产品设计) - 4-8 steps (variable)

```yaml
steps:
  - id: 0.3.1
    name: User persona definition
    description: Define target user personas
    output: User persona documents

  - id: 0.3.2
    name: User journey mapping
    description: Map user journey from problem to solution
    output: User journey map

  - id: 0.3.3
    name: Feature prioritization
    description: Prioritize features using MoSCoW method
    categories:
      - Must have (核心功能)
      - Should have (重要功能)
      - Could have (增值功能)
      - Won't have (暂不实现)
    output: Prioritized feature list

  - id: 0.3.4
    name: Information architecture
    description: Design information architecture and navigation
    output: IA diagram

  - id: 0.3.5
    name: User flow design
    description: Design detailed user flows for key features
    output: User flow diagrams

  - id: 0.3.6
    name: UI/UX wireframes
    description: Create wireframes for key screens
    output: Wireframe designs

  - id: 0.3.7
    name: Interaction design
    description: Define interaction patterns and behaviors
    output: Interaction specifications
```

**Example Output**:
```markdown
## 用户画像

### 画像 1: 电商运营小王
- 年龄：25-30岁
- 职位：电商运营专员
- 目标：找到爆款视频规律，提升自家产品销量
- 痛点：不知道竞品为什么能爆，自己的视频数据不理想
- 使用场景：每天分析3-5个竞品账号和爆款视频

## 核心用户流程

### 流程 1: 分析竞品账号
1. 输入竞品账号链接或搜索账号名
2. 查看账号概览（粉丝数、互动率、增长趋势）
3. 查看热门视频列表
4. 选择视频查看详细分析
5. 查看 AI 生成的成功要素分析
6. 导出分析报告

### 流程 2: 对比多个账号
1. 添加多个账号到对比列表
2. 查看对比数据表格
3. 查看对比图表
4. 查看差异化分析
5. 导出对比报告

## 功能优先级 (MoSCoW)

### Must Have (MVP 必须有)
- 账号基础数据展示
- 视频列表和基础数据
- 简单的数据对比
- 基础导出功能

### Should Have (V1.0 应该有)
- AI 内容分析
- 多账号对比
- 数据趋势图表
- 高级导出（PDF、Excel）

### Could Have (V2.0 可以有)
- 实时监控和预警
- 自定义报告模板
- 团队协作功能
- API 接口

### Won't Have (暂不实现)
- 自动发布内容
- 直播功能
- 电商交易功能
```

---

#### 0.4 MDX Generation (MDX文档生成) - 2-4 steps (variable)

```yaml
steps:
  - id: 0.4.1
    name: Structure MDX document
    description: Create MDX document structure
    sections:
      - Frontmatter (metadata)
      - Overview (概述)
      - Problem Statement (问题陈述)
      - User Research (用户研究)
      - Competitor Analysis (竞品分析)
      - Solution Design (解决方案设计)
      - User Flows (用户流程)
      - Feature Breakdown (功能拆解)
      - Technical Considerations (技术考虑)
      - Success Metrics (成功指标)
    output: MDX structure

  - id: 0.4.2
    name: Populate MDX content
    description: Fill in MDX document with research and design content
    sources:
      - Phase 0.1 outputs (requirement)
      - Phase 0.2 outputs (research)
      - Phase 0.3 outputs (design)
    output: Complete MDX draft

  - id: 0.4.3
    name: MDX review and refinement
    description: Review and refine MDX document
    checks:
      - Completeness (all sections filled)
      - Clarity (easy to understand)
      - Consistency (no contradictions)
      - Actionability (clear enough for implementation)
    output: Refined MDX document

  - id: 0.4.4
    name: MDX approval
    description: Get user approval for MDX document
    output: Approved MDX document
```

**Example MDX Structure**:
```mdx
---
title: "自媒体与带货视频分析工具"
type: "product-spec"
version: "1.0"
date: "2026-02-15"
author: "Product Team"
status: "approved"
---

# 自媒体与带货视频分析工具

## 概述
一个 AI 驱动的多平台自媒体和带货视频分析工具，帮助电商运营人员、MCN 机构和品牌方快速分析竞品账号和爆款视频的成功因素。

## 问题陈述
### 核心问题
电商运营人员难以快速分析竞品账号和爆款视频的成功因素，导致：
- 内容创作缺乏方向
- 投放预算浪费
- 错过爆款机会

### 目标用户
1. 电商运营人员（主要）
2. MCN 机构
3. 品牌方市场部门

## 用户研究
[从 Phase 0.2 和 0.3 的输出填充]

## 竞品分析
[从 Phase 0.2 的输出填充]

## 解决方案设计
[从 Phase 0.3 的输出填充]

## 用户流程
[从 Phase 0.3 的输出填充]

## 功能拆解
### 核心功能模块
1. **账号分析模块**
   - 账号概览
   - 粉丝分析
   - 内容分析
   - 互动分析

2. **视频分析模块**
   - 视频数据展示
   - AI 内容分析
   - 成功要素提取
   - 相似视频推荐

3. **对比分析模块**
   - 多账号对比
   - 多视频对比
   - 趋势对比

4. **报告导出模块**
   - PDF 报告
   - Excel 数据
   - 图表导出

## 技术考虑
### 技术栈
- Frontend: React + TypeScript + Tailwind CSS
- Backend: Node.js + Express
- Database: PostgreSQL + Redis
- AI: OpenAI API / Claude API

### 数据来源
- 抖音开放平台 API
- 小红书非官方 API
- B站 API
- 爬虫补充数据

## 成功指标
- 用户注册数
- 日活跃用户数
- 分析报告生成数
- 用户留存率
- 付费转化率
```

---

#### 0.5 MDX Multi-Model Review (MDX多方会审) - 1-4 steps (variable with auto-healing)

```yaml
steps:
  - id: 0.5.1
    name: Multi-model MDX review
    description: Review MDX document with Claude + Gemini + Codex
    models:
      - claude: "Review for clarity and completeness"
      - gemini: "Review from different angle, find potential issues"
      - codex: "Review for technical feasibility"
    success_criteria:
      pass_rate: ">= 75%"
      critical_issues: "== 0"
      medium_issues: "<= 2"
    output: Aggregated review results

  # Auto-healing loop (0-3 iterations)
  - id: 0.5.2
    name: Auto-fix MDX
    description: Automatically fix issues found in review
    condition: review_failed && retry_count < 3
    loop: true
    actions:
      - Fix clarity issues
      - Add missing sections
      - Resolve contradictions
      - Improve actionability
    output: Fixed MDX document

  # Fallback to user
  - id: 0.5.3
    name: Request user intervention
    description: Ask user to manually fix MDX issues
    condition: review_failed && retry_count >= 3
    output: User feedback and manual fixes
```

**Review Criteria**:
- **Clarity**: Is the MDX easy to understand?
- **Completeness**: Are all required sections filled?
- **Consistency**: Are there any contradictions?
- **Feasibility**: Is the solution technically feasible?
- **Actionability**: Is it clear enough for implementation?

**Example Review Feedback**:
```
Claude Review: PASS (0 critical, 1 medium, 2 low)
- Medium: User flow for "多账号对比" lacks error handling details
- Low: Technical stack section could be more specific about versions

Gemini Review: PASS (0 critical, 0 medium, 1 low)
- Low: Success metrics could include more specific targets

Codex Review: PASS (0 critical, 1 medium, 0 low)
- Medium: Data source section needs API rate limit considerations

Aggregated Result: PASS
- Pass rate: 100% (3/3)
- Critical: 0
- Medium: 2 (within limit)
```

---

#### 0.6 User Confirmation (人工确认) - 1 step

```yaml
steps:
  - id: 0.6.1
    name: User final confirmation
    description: Present MDX to user for final approval
    presentation:
      - Show MDX summary
      - Highlight key features
      - Show review results
      - Request confirmation
    options:
      - Approve: Proceed to Phase 1
      - Revise: Return to specific sub-phase for revision
      - Cancel: Abort workflow
    output: User decision
```

**Confirmation Checklist**:
- ✅ Requirements accurately captured
- ✅ User flows make sense
- ✅ Feature breakdown is complete
- ✅ Technical approach is acceptable
- ✅ Success metrics are clear

**User Confirmation Flow**:
```
System: "MDX 文档已生成并通过多方会审。请确认以下内容：

📋 需求概述
- 产品：自媒体与带货视频分析工具
- 目标用户：电商运营人员、MCN机构、品牌方
- 核心功能：账号分析、视频分析、对比分析、报告导出

✅ 会审结果
- Claude: PASS
- Gemini: PASS
- Codex: PASS
- 总体评分：优秀

📊 功能拆解
- 4个核心模块
- 15个子功能
- 预计开发周期：6-8周

确认无误后将进入 Phase 1（规划阶段）开始技术实现规划。

选项：
1. ✅ 确认，开始 Phase 1
2. 📝 修改需求（返回 Phase 0）
3. ❌ 取消"

User: "确认"

System: "收到！Phase 0 完成，开始 Phase 1..."
```

---

**Total Steps in Phase 0**: 13-27 steps (variable based on input type, research depth, and auto-healing)

---

### Phase 1: Planning Phase (规划阶段)

**Purpose**: Transform user requirements into executable specifications

**Sub-phases**:

#### 1.1 Preparation (准备工作) - 3 steps
```yaml
steps:
  - id: 1.1.1
    name: Search existing work
    description: Check for similar jobs or capabilities

  - id: 1.1.2
    name: Update capability tree
    description: Refresh capability tree with latest info

  - id: 1.1.3
    name: Create job and branch
    description: Initialize job directory and git branch
```

#### 1.2 Input Processing (输入处理) - 1-4 steps (variable)
```yaml
# Option 1: Direct MDX input (1 step)
steps:
  - id: 1.2.1
    name: MDX to OpenSpec
    description: Convert MDX directly to OpenSpec
    condition: input_type == 'mdx'

# Option 2: UI Form input (3 steps)
steps:
  - id: 1.2.1
    name: Collect form data
    description: Gather requirements from UI form
    condition: input_type == 'form'

  - id: 1.2.2
    name: Form to MDX
    description: Convert form data to MDX

  - id: 1.2.3
    name: MDX to OpenSpec
    description: Convert MDX to OpenSpec
```

#### 1.3 Requirement Review (需求会审) - 1-4 steps (variable with auto-healing)
```yaml
steps:
  - id: 1.3.1
    name: Multi-model review
    description: Review OpenSpec with Claude + Gemini + Codex
    success_criteria:
      pass_rate: ">= 75%"
      critical_issues: "== 0"
      medium_issues: "<= 2"

  # Auto-healing loop (0-3 iterations)
  - id: 1.3.2
    name: Auto-fix OpenSpec
    description: Automatically fix issues found in review
    condition: review_failed && retry_count < 3
    loop: true

  # Fallback to user
  - id: 1.3.3
    name: Request user intervention
    description: Ask user to manually fix issues
    condition: review_failed && retry_count >= 3
```

#### 1.4 Requirement Parsing (需求解析) - 3 steps
```yaml
steps:
  - id: 1.4.1
    name: OpenSpec to docs.json
    description: Extract documentation requirements

  - id: 1.4.2
    name: Infer form.json
    description: Infer form structure from requirements

  - id: 1.4.3
    name: Merge to unified.json
    description: Create unified requirement document
```

#### 1.5 Capability Analysis (能力分析) - 1 step
```yaml
steps:
  - id: 1.5.1
    name: Three-way comparison
    description: Compare requirements with existing capabilities
    output: capability-analysis.json
```

#### 1.6 Specification Generation (规范生成) - 1 step
```yaml
steps:
  - id: 1.6.1
    name: Generate specs/
    description: Create development specifications
    output: specs/ directory
```

#### 1.7 Specification Review (规范会审) - 1-4 steps (variable with auto-healing)
```yaml
steps:
  - id: 1.7.1
    name: Multi-model review
    description: Review specs/ with Claude + Gemini + Codex
    success_criteria:
      pass_rate: ">= 75%"
      critical_issues: "== 0"
      medium_issues: "<= 2"

  # Auto-healing loop (0-3 iterations)
  - id: 1.7.2
    name: Regenerate specs
    description: Regenerate specifications based on feedback
    condition: review_failed && retry_count < 3
    loop: true

  # Fallback to user
  - id: 1.7.3
    name: Request user intervention
    description: Ask user to manually fix specifications
    condition: review_failed && retry_count >= 3
```

#### 1.8 Documentation Generation (文档生成) - 3 steps
```yaml
steps:
  - id: 1.8.1
    name: Generate global view
    description: Create project-wide overview

  - id: 1.8.2
    name: Generate planning docs
    description: Create detailed planning documentation

  - id: 1.8.3
    name: Commit to git
    description: Commit planning phase results
```

**Total Steps in Phase 1**: 14-23 steps (variable based on input type and auto-healing)

---

### Phase 2: Execution Phase (执行阶段)

**Purpose**: Implement the specifications

**Structure**: Dynamic loop, one iteration per task

```yaml
loop:
  condition: has_executable_tasks()

  steps:
    - id: 2.1
      name: Execute task
      description: Implement the current task
      decision:
        - if: task_complexity == 'simple'
          then: use_subagent
        - if: task_complexity == 'medium'
          then: main_agent_execute
        - if: task_complexity == 'complex'
          then: use_agent_team

    - id: 2.2
      name: Auto-verify
      description: Run automated verification
      verification:
        - build_check
        - type_check
        - test_run

    - id: 2.3
      name: Update OpenSpec
      description: Update OpenSpec with implementation details

    - id: 2.4
      name: Update progress
      description: Mark task as completed

    - id: 2.5
      name: Commit to git
      description: Commit task implementation
```

**Total Steps in Phase 2**: 5 × N (where N = number of tasks)

---

### Phase 3: Acceptance Phase (验收阶段)

**Purpose**: Validate the complete implementation

**Sub-phases**:

#### 3.1 Multi-Model Acceptance (多模型验收) - 1-4 steps (variable with auto-healing)
```yaml
steps:
  - id: 3.1.1
    name: Multi-model acceptance review
    description: Review implementation with Claude + Gemini + Codex
    success_criteria:
      pass_rate: ">= 75%"
      critical_issues: "== 0"
      medium_issues: "<= 2"

  # Auto-healing loop (0-3 iterations)
  - id: 3.1.2
    name: Auto-fix implementation
    description: Fix issues found in acceptance review
    condition: review_failed && retry_count < 3
    loop: true

  # Fallback to user
  - id: 3.1.3
    name: Request user intervention
    description: Ask user to manually fix issues
    condition: review_failed && retry_count >= 3
```

#### 3.2 User Confirmation (人工确认) - 1 step
```yaml
steps:
  - id: 3.2.1
    name: Final user confirmation
    description: User reviews and approves the implementation
    requires: user_input
```

**Total Steps in Phase 3**: 2-5 steps (variable based on auto-healing)

---

### Phase 4: Archival Phase (归档阶段)

**Purpose**: Archive results and update documentation

```yaml
steps:
  - id: 4.1
    name: Merge git branch
    description: Merge feature branch to main

  - id: 4.2
    name: Archive OpenSpec
    description: Move OpenSpec to archive

  - id: 4.3
    name: Update specs/
    description: Update development specifications

  - id: 4.4
    name: Update developer docs
    description: Update architecture and API docs

  - id: 4.5
    name: Update planning docs
    description: Update roadmap and planning docs

  - id: 4.6
    name: Rebuild capability tree
    description: Regenerate capability tree with new capabilities
```

**Total Steps in Phase 4**: 6 steps (fixed)

---

## Total Workflow Steps

```
Phase 0: 13-27 steps (MDX generation with review, variable)
Phase 1: 14-23 steps (Planning, variable)
Phase 2: 5 × N steps (Execution, N = number of tasks)
Phase 3: 2-5 steps (Acceptance, variable)
Phase 4: 6 steps (Archival, fixed)

Minimum (from scratch): 13 + 14 + (5 × 1) + 2 + 6 = 40 steps
Maximum (from scratch): 27 + 23 + (5 × N) + 5 + 6 = 61 + (5 × N) steps

Where N = number of tasks (typically 3-10)
```

**Example Scenarios**:

**Scenario 1: Brief requirement, 5 tasks**
- Phase 0: 20 steps (brief input + research + review)
- Phase 1: 18 steps (planning)
- Phase 2: 25 steps (5 tasks)
- Phase 3: 3 steps (acceptance)
- Phase 4: 6 steps (archival)
- **Total: 72 steps**

**Scenario 2: Detailed requirement, 5 tasks**
- Phase 0: 15 steps (detailed input + optimization + review)
- Phase 1: 18 steps (planning)
- Phase 2: 25 steps (5 tasks)
- Phase 3: 3 steps (acceptance)
- Phase 4: 6 steps (archival)
- **Total: 67 steps**

**Scenario 3: User has MDX, 5 tasks (skip Phase 0)**
- Phase 0: 0 steps (skipped)
- Phase 1: 18 steps (planning)
- Phase 2: 25 steps (5 tasks)
- Phase 3: 3 steps (acceptance)
- Phase 4: 6 steps (archival)
- **Total: 52 steps**

## Auto-Healing Mechanism

### Concept

When a review step fails, the system automatically attempts to fix the issues instead of immediately failing.

### Implementation

```yaml
auto_healing:
  max_retries: 3
  retry_strategy:
    - attempt: 1
      action: auto_fix
      description: Automatically fix based on review feedback

    - attempt: 2
      action: auto_fix_with_context
      description: Fix with additional context from capability tree

    - attempt: 3
      action: auto_fix_with_examples
      description: Fix using similar examples from codebase

    - attempt: 4
      action: request_user_intervention
      description: Ask user to manually resolve issues
```

### Example: Requirement Review with Auto-Healing

```
Step 1.3.1: Multi-model review
  ↓ (Failed: pass_rate = 66%, critical = 1)

Step 1.3.2: Auto-fix (Attempt 1)
  ↓ (Fixed critical issue, regenerated OpenSpec)

Step 1.3.1: Multi-model review (Retry)
  ↓ (Failed: pass_rate = 75%, medium = 3)

Step 1.3.2: Auto-fix (Attempt 2)
  ↓ (Fixed 1 medium issue)

Step 1.3.1: Multi-model review (Retry)
  ↓ (Success: pass_rate = 100%, critical = 0, medium = 0)

Continue to Step 1.4.1
```

## Conditional Branching

### Input Type Branching

```yaml
phase: 1.2
condition: input_type
branches:
  mdx:
    steps: [1.2.1]  # 1 step
  form:
    steps: [1.2.1, 1.2.2, 1.2.3]  # 3 steps
  api:
    steps: [1.2.1, 1.2.2, 1.2.3, 1.2.4]  # 4 steps
```

### Task Complexity Branching

```yaml
phase: 2.1
condition: task_complexity
branches:
  simple:
    executor: subagent
    estimated_time: "< 5 min"
  medium:
    executor: main_agent
    estimated_time: "5-30 min"
  complex:
    executor: agent_team
    estimated_time: "> 30 min"
```

## Workflow Configuration

### YAML Definition

```yaml
# workflow.yml
version: "1.0.0"
name: "Product Builder Workflow"

phases:
  - id: planning
    name: "Planning Phase"
    sub_phases:
      - id: preparation
        steps: [1.1.1, 1.1.2, 1.1.3]

      - id: input_processing
        steps:
          - id: 1.2.1
            condition: "input_type == 'mdx'"
          - id: 1.2.1-1.2.3
            condition: "input_type == 'form'"

      - id: requirement_review
        steps:
          - id: 1.3.1
            auto_healing:
              enabled: true
              max_retries: 3

  - id: execution
    name: "Execution Phase"
    loop:
      condition: "has_executable_tasks()"
      steps: [2.1, 2.2, 2.3, 2.4, 2.5]

  - id: acceptance
    name: "Acceptance Phase"
    sub_phases:
      - id: multi_model_acceptance
        steps:
          - id: 3.1.1
            auto_healing:
              enabled: true
              max_retries: 3

  - id: archival
    name: "Archival Phase"
    steps: [4.1, 4.2, 4.3, 4.4, 4.5, 4.6]
```

### Loading Configuration

```typescript
import { readFileSync } from 'fs';
import { parse } from 'yaml';

interface WorkflowConfig {
  version: string;
  name: string;
  phases: Phase[];
}

export function loadWorkflowConfig(): WorkflowConfig {
  const configPath = '.product-builder/workflow.yml';
  const content = readFileSync(configPath, 'utf-8');
  return parse(content);
}
```

## Benefits of Flexible Workflow

1. **Adaptability**: Workflow adapts to different project types and complexities
2. **Efficiency**: Skip unnecessary steps, add steps only when needed
3. **Resilience**: Auto-healing reduces manual intervention
4. **Scalability**: Easy to add new phases or sub-phases
5. **Maintainability**: Configuration-driven, not hardcoded

## Migration from 27-Step Workflow

### Old Approach (Hardcoded)
```typescript
// Hardcoded 27 steps
const steps = [
  'step1', 'step2', ..., 'step27'
];

for (const step of steps) {
  await executeStep(step);
}
```

### New Approach (Flexible)
```typescript
// Load workflow configuration
const workflow = loadWorkflowConfig();

for (const phase of workflow.phases) {
  await executePhase(phase);
}

async function executePhase(phase: Phase) {
  for (const subPhase of phase.sub_phases) {
    await executeSubPhase(subPhase);
  }
}

async function executeSubPhase(subPhase: SubPhase) {
  for (const step of subPhase.steps) {
    if (evaluateCondition(step.condition)) {
      await executeStep(step);

      if (step.auto_healing?.enabled && !step.success) {
        await autoHeal(step);
      }
    }
  }
}
```

## Related Documentation

- [REQUIREMENT-LOCKING.md](./REQUIREMENT-LOCKING.md) - Requirement locking during auto-healing
- [CCA-ROUTING.md](./CCA-ROUTING.md) - Model routing for each phase
- [WORKFLOW-DESIGN.md](./WORKFLOW-DESIGN.md) - Original workflow design
