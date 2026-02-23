# Workflow 生成流程文档

## 核心原则

**workflow.json 是自动生成的，永远不要直接编辑！**

## 双层结构设计

workflow.json 使用**双层结构**：

### 1. `phase_registry`（执行层）- 源数据

- **作用**：执行引擎的权威数据源
- **结构**：16 个模块文件（modules/*.json）
- **内容**：完整的步骤定义、groups、execution 配置
- **编辑**：✅ 这是你应该编辑的地方

```json
{
  "phase_registry": {
    "execution": {
      "id": "execution",
      "steps": [...],
      "groups": [...]
    },
    "execution_standard": {...},
    ...
  }
}
```

### 2. `phases`（显示层）- 自动生成

- **作用**：UI 显示和进度跟踪
- **结构**：线性数组（phase-0, phase-1, ...）
- **内容**：从 phase_registry 提取的步骤，带 display_id
- **生成**：❌ 由构建脚本自动生成，不要手动编辑

```json
{
  "phases": [
    {
      "id": "phase-0",
      "name": "Requirement Research & Analysis",
      "steps": [
        {
          "id": "P0-COLLECT_USER_REQUIREMENT",
          "display_id": "P0-01",
          ...
        }
      ]
    }
  ]
}
```

**关键点：**
- 只编辑 `phase_registry`（通过 workflow-source/modules/）
- `phases` 数组由构建脚本从 `phase_registry` 自动生成
- `display_id` 在生成 `phases` 时自动添加

## 文件结构

```
src/config/
├── workflow-source/              # ✅ 源文件（手动编辑）
│   ├── metadata.json            # 工作流元数据
│   ├── modes.json               # 模式配置（lite/standard/full）
│   ├── transitions.json         # 状态转换定义
│   └── modules/                 # 16 个模块文件
│       ├── intake.json
│       ├── research.json
│       ├── ideate.json
│       ├── planning_lite.json
│       ├── planning_standard.json
│       ├── planning.json
│       ├── execution_lite.json
│       ├── execution_standard.json
│       ├── execution.json
│       ├── testing.json
│       ├── testing_lite.json
│       ├── optimize.json
│       ├── review.json
│       ├── review_lite.json
│       ├── archiving.json
│       └── archiving_lite.json
├── workflow.json                 # ❌ 自动生成（不要编辑）
├── build-workflow.ts             # 构建脚本
└── validate-workflow.ts          # 验证脚本
```

## 源文件格式

### 模块文件（modules/*.json）

每个模块文件只包含**核心字段**：

```json
{
  "id": "execution",
  "name": "Execution",
  "description": "Full task execution loop",
  "execution": {
    "mode": "loop",
    "orchestrator": "ralph"
  },
  "groups": [
    {
      "id": "2.1",
      "name": "Execution Initialization",
      "step_ids": [
        "P2-START_EXECUTION_DECISION",
        "P2-CREATE_GITHUB_ISSUE"
      ]
    }
  ],
  "steps": [
    {
      "id": "P2-START_EXECUTION_DECISION",
      "name": "Start Execution Decision",
      "description": "User decides whether to start execution or wait.",
      "input": ["exports/jobs/{job_id}/docs/roadmap.mdx"],
      "output": ["execution.started"],
      "requires_human_approval": true,
      "min_mode": "lite"
    }
  ]
}
```

**步骤定义中的字段：**

必需字段：
- `id`: 步骤 ID（格式：P{phase}-{ACTION}_{OBJECT}）
- `name`: 步骤名称
- `description`: 步骤描述
- `input`: 输入数据
- `output`: 输出数据
- `min_mode`: 最小模式（lite/standard/full）

可选字段：
- `required_tools`: 需要的工具列表
- `condition`: 执行条件
- `requires_human_approval`: 是否需要人工批准

**不要包含的字段：**
- ❌ `display_id` - 由构建脚本自动生成
- ❌ `enabled_in_modes` - 由 modes.json 控制

### modes.json

定义三种模式及其启用的步骤：

```json
{
  "available_modes": {
    "lite": {
      "label": "Lite",
      "steps": 16,
      "enabled_steps": [
        "P0-COLLECT_USER_REQUIREMENT",
        "P0-DETECT_REQUIREMENT_TYPE",
        ...
      ],
      "pipeline": [
        "intake",
        "planning_lite",
        "execution_lite",
        ...
      ]
    },
    "standard": {
      "label": "Standard",
      "steps": 48,
      "enabled_steps": [...],
      "pipeline": [...]
    },
    "full": {
      "label": "Full",
      "steps": 60,
      "enabled_steps": [...],
      "pipeline": [...]
    }
  }
}
```

## 构建流程

### 工作原理

```
workflow-source/modules/*.json (phase_registry 源文件)
              ↓
    build-workflow.ts 构建脚本
              ↓
         workflow.json
         ├── phase_registry (直接复制)
         └── phases (自动生成 + display_id)
```

### 1. 编辑源文件（phase_registry）

```bash
# 编辑模块文件
vim src/config/workflow-source/modules/execution.json

# 或使用脚本批量修改
python3 src/config/add-worktree-steps.py
```

**只编辑这些字段：**
- 步骤定义（id, name, description, input, output, min_mode, required_tools）
- groups 定义
- execution 配置

**不要添加：**
- ❌ display_id（自动生成）
- ❌ enabled_in_modes（由 modes.json 控制）

### 2. 构建 workflow.json（双层生成）

```bash
npm run build:workflow
```

构建脚本执行：

**步骤 1：组装 phase_registry**
- 读取 workflow-source/modules/*.json
- 直接复制到 workflow.json 的 phase_registry

**步骤 2：生成 phases 数组**
- 根据当前 mode 的 pipeline 配置
- 从 phase_registry 提取对应模块的步骤
- 自动生成 display_id（P0-01, P0-02, ...）
- 组装成线性的 phases 数组

**步骤 3：验证**
- 检查 enabled_steps 引用
- 检查 transitions 引用
- 检查 groups 引用
- 检查 display_id 唯一性

**输出示例：**
```
🔄 Auto-generating phases array from current mode pipeline...
Current mode: full
Pipeline: research → ideate → planning → execution → testing → optimize → review → archiving
  ✓ phase-0: Requirement Research & Analysis (12 steps, 4 groups)
  ✓ phase-1: Ideation (7 steps, 2 groups)
  ...
  ✓ phase-7: Archiving (14 steps, 7 groups)
```

### 3. 验证

```bash
npx tsx src/config/validate-workflow.ts
```

验证检查：
- display_id 唯一性和序列
- enabled_steps 引用完整性
- transitions 引用完整性
- groups 引用完整性
- pipeline 模块存在性

## 添加新步骤的标准流程

### 方法 1：手动编辑

```bash
# 1. 编辑模块文件，添加步骤定义
vim src/config/workflow-source/modules/execution.json

# 2. 更新 modes.json，添加到 enabled_steps
vim src/config/workflow-source/modes.json

# 3. 构建
npm run build:workflow

# 4. 验证
npx tsx src/config/validate-workflow.ts
```

### 方法 2：使用脚本（推荐）

```python
#!/usr/bin/env python3
import json
from pathlib import Path

# 定义新步骤（只包含核心字段）
new_step = {
    "id": "P2-NEW_STEP",
    "name": "New Step",
    "description": "Description of the new step",
    "input": ["input.data"],
    "output": ["output.data"],
    "min_mode": "standard",
    "required_tools": ["ccb"]
}

# 1. 添加到模块文件
module_file = Path("workflow-source/modules/execution.json")
with open(module_file, 'r') as f:
    data = json.load(f)

data['steps'].append(new_step)

with open(module_file, 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

# 2. 添加到 modes.json
modes_file = Path("workflow-source/modes.json")
with open(modes_file, 'r') as f:
    modes = json.load(f)

for mode in ['standard', 'full']:
    modes['available_modes'][mode]['enabled_steps'].append('P2-NEW_STEP')
    modes['available_modes'][mode]['steps'] += 1

with open(modes_file, 'w') as f:
    json.dump(modes, f, indent=2, ensure_ascii=False)

print("✨ Done! Run 'npm run build:workflow'")
```

## 常见错误

### ❌ 错误：在源文件中添加 display_id

```json
{
  "id": "P2-NEW_STEP",
  "name": "New Step",
  "display_id": "P2-35"  // ❌ 不要这样做！
}
```

**正确做法：** 不要添加 display_id，让构建脚本自动生成。

### ❌ 错误：直接编辑 workflow.json

```bash
vim src/config/workflow.json  # ❌ 不要这样做！
```

**正确做法：** 编辑 workflow-source/ 中的源文件，然后运行构建脚本。

### ❌ 错误：忘记更新 modes.json

添加新步骤后忘记在 modes.json 的 enabled_steps 中添加步骤 ID。

**正确做法：** 同时更新模块文件和 modes.json。

## 模式关系

```
Lite (16 steps)
  ↓ 添加 OpenSpec、多模型审查
Standard (48 steps)
  ↓ 添加自动循环、独立测试
Full (60 steps)
```

每个模式使用不同的模块组合：
- **Lite**: intake → planning_lite → execution_lite → testing_lite → review_lite → archiving_lite
- **Standard**: research → ideate → planning → execution_standard → optimize → review → archiving
- **Full**: research → ideate → planning → execution → testing → optimize → review → archiving

## 工具和脚本

### 现有脚本

- `build-workflow.ts` - 构建 workflow.json
- `validate-workflow.ts` - 验证 workflow.json
- `split-workflow.js` - 一次性迁移脚本（已完成）
- `generate-phases-from-registry.js` - 生成 phases 数组（已集成到 build-workflow.ts）

### 自定义脚本示例

参考 `add-worktree-steps.py`：
- 清理自动生成的字段
- 在正确位置插入新步骤
- 更新 groups 和 enabled_steps
- 保持 JSON 格式一致

## 总结

**记住三个原则：**

1. **只编辑源文件**（workflow-source/）
2. **不要添加自动生成的字段**（display_id）
3. **总是运行构建和验证**（build:workflow + validate）

**标准工作流：**

```bash
# 1. 编辑源文件或运行脚本
python3 add-worktree-steps.py

# 2. 构建
npm run build:workflow

# 3. 验证
npx tsx src/config/validate-workflow.ts

# 4. 提交
git add src/config/workflow-source/ src/config/workflow.json
git commit -m "feat(workflow): add worktree steps"
```
