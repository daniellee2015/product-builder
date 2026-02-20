# Workflow 系统修复总结

## 问题发现

用户发现了多个严重问题：
1. **重复步骤**：P1-GENERATE_DEVELOPMENT_SPECS 等步骤出现 3 次
2. **语义化 ID 和描述重复**：P1-GENERATE_DEVELOPMENT_SPECS 和 "Generate Development Specs" 是重复信息
3. **Phase 标题重复**："Phase 2: Phase 2"
4. **验证系统不严谨**：Codex 发现 groups 验证使用了错误的字段名

## 已完成的修复

### 1. 验证系统修复 (validate-workflow.ts)

**修复前的严重 bug：**
```typescript
const steps = group.steps || []; // 错误：字段名不存在
```

**修复后：**
```typescript
const stepIds = group.step_ids || []; // 正确：使用 step_ids
```

**其他改进：**
- 添加了 START 标记支持（transitions 允许 START 和 END）
- 只检查 phases 数组的 display_id（不检查 phase_registry）
- 7 项完整性检查全部生效

### 2. Edit Workflow 修复 (edit.ts)

**问题：重复步骤**
- 原因：不同模块（planning, planning_lite, planning_standard）包含相同的步骤 ID
- 修复：使用 Set 跟踪已添加的步骤 ID，跳过重复

**问题：语义化 ID 和描述重复**
- 原因：显示 P1-GENERATE_DEVELOPMENT_SPECS 和 "Generate Development Specs"
- 修复：使用序号（1, 2, 3...）作为 display_id

**问题：Phase 标题重复**
- 原因：`label: ${pLabel}: Phase ${phasePrefix}` 导致 "Phase 2: Phase 2"
- 修复：改为简单的 `label: Phase ${phasePrefix}`

**代码改进：**
```typescript
// 去重逻辑
const seenStepIds = new Set<string>();
for (const step of (module as any).steps) {
  if (seenStepIds.has(step.id)) {
    continue; // 跳过重复
  }
  seenStepIds.add(step.id);
  // ...
}

// 序号显示
let globalIndex = 1;
tableData.push({
  id: step.id,
  display_id: String(globalIndex++), // 1, 2, 3...
  name: step.name,
  // ...
});
```

**列宽调整：**
- ID 列：35 → 5（序号只需要 5 个字符）
- Name 列：30 → 35（给步骤名称更多空间）

### 3. 数据完整性设计 (build-workflow.ts)

**设计原则：**
- phase_registry 中的步骤**不应该有 display_id**（构建时移除）
- 只有 phases 数组中的步骤有 display_id（模式特定的）
- display_id 是动态生成的，基于当前模式的步骤顺序

**实现：**
```typescript
// 读取模块时移除 display_id
const moduleData = JSON.parse(fs.readFileSync(...));
if (moduleData.steps) {
  moduleData.steps = moduleData.steps.map((step: any) => {
    const { display_id, ...stepWithoutDisplayId } = step;
    return stepWithoutDisplayId;
  });
}
```

## 验证结果

运行 `npm run validate:workflow`：
```
✅ All checks passed! No issues found.

检查项：
1️⃣  display_id 唯一性和连续性：56 个
2️⃣  步骤 ID 存在性：59 个唯一步骤
3️⃣  enabled_steps 引用完整性：3 个模式
4️⃣  transitions 引用完整性：54 个转换
5️⃣  groups 引用完整性：19 个组（已修复）
6️⃣  phases 一致性：8 个 phases
7️⃣  pipeline 引用完整性：通过
```

## Codex 建议的高级检查（待实现）

1. **enabled_steps 必须属于 pipeline 模块**
2. **模式步骤计数一致性**
3. **phase_registry 不应有 display_id**（已部分实现）
4. **transitions 模式兼容性检查**

## 架构改进

### 构建流程
```
npm run build:workflow  → 构建 workflow.json
npm run validate:workflow → 验证数据完整性
npm run build → 完整构建（包含验证）
```

### 数据流
```
workflow-source/
  ├── metadata.json
  ├── modes.json
  ├── transitions.json
  └── modules/
      ├── intake.json
      ├── research.json
      └── ...

↓ build-workflow.ts

workflow.json
  ├── phase_registry (无 display_id)
  └── phases (有 display_id，模式特定)

↓ validate-workflow.ts

✅ 验证通过
```

## 用户体验改进

### Edit Workflow 界面

**修复前：**
```
❯ ○ P1-GENERATE_DEVELOPMENT_SPECS  Generate Development Specs  ...
  ○ P1-GENERATE_DEVELOPMENT_SPECS  Generate Development Specs  ...
  ○ P1-GENERATE_DEVELOPMENT_SPECS  Generate Development Specs  ...
  ── Phase 2: Phase 2 ──
```

**修复后：**
```
❯ ○ 1   Collect User Requirement        ...
  ○ 2   Detect Requirement Type         ...
  ○ 3   Generate Requirement Document   ...
  ── Phase 1 ──
  ○ 4   Find Existing Work              ...
  ○ 5   Create Job                      ...
```

**改进点：**
- ✅ 无重复步骤
- ✅ 序号清晰（1, 2, 3...）
- ✅ Phase 标题简洁
- ✅ 信息不重复

## 总结

通过这次修复，我们：
1. 修复了验证系统的严重 bug（groups 字段名错误）
2. 解决了 edit workflow 的重复步骤问题
3. 改进了用户界面的信息展示
4. 建立了系统化的验证框架
5. 集成了自动验证到构建流程

系统现在更加严谨和可靠。
