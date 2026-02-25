# 工作流执行器测试指南

## 快速开始

### 1. 运行自动化测试

```bash
# 运行测试套件
python3 scripts/python/test_orchestrator.py
```

### 2. 手动测试单个工作流

```bash
# 基本执行
python3 scripts/python/orchestrator.py scripts/python/test_workflow.json test-job-001

# Strict模式
python3 scripts/python/orchestrator.py scripts/python/test_workflow.json test-job-002 --strict-transitions

# 自动审批模式
python3 scripts/python/orchestrator.py scripts/python/test_workflow.json test-job-003 --auto-approve
```

## 关键测试场景

### 场景1: 成功执行路径

**测试目标**: 验证所有步骤成功完成

```bash
python3 scripts/python/orchestrator.py scripts/python/test_workflow.json success-test-001
```

**预期结果**:
- 状态: `completed`
- 所有步骤在 `completed_steps` 中
- 无 `failed_steps` 或 `skipped_steps`

### 场景2: 跳过步骤处理

**测试目标**: 验证条件步骤被正确跳过

**修改测试工作流**: 设置 `test_mode: "basic"` (默认)

```bash
python3 scripts/python/orchestrator.py scripts/python/test_workflow.json skip-test-001
```

**预期结果**:
- 状态: `completed`
- `P0-STEP2` 在 `skipped_steps` 中
- 转换正确跳过到 `P0-STEP3`

### 场景3: Strict模式无转换

**测试目标**: 验证strict模式在无转换时halt

**创建测试工作流**: 移除某个转换

```bash
python3 scripts/python/orchestrator.py modified_workflow.json strict-test-001 --strict-transitions
```

**预期结果**:
- 状态: `halted`
- 执行在无转换处停止
- 抛出 `WorkflowHalted` 异常

### 场景4: 失败转换

**测试目标**: 验证失败步骤跟随失败转换

**修改测试工作流**: 添加会失败的步骤和 `on: failed` 转换

```bash
python3 scripts/python/orchestrator.py failure_workflow.json failure-test-001
```

**预期结果**:
- 失败步骤在 `failed_steps` 中
- 跟随 `on: failed` 转换到恢复步骤
- 或者如果无失败转换，状态为 `failed`

### 场景5: 断点恢复

**测试目标**: 验证从中断点恢复执行

```bash
# 第一次执行（会在某处停止）
python3 scripts/python/orchestrator.py scripts/python/test_workflow.json resume-test-001

# 第二次执行（应该跳过已完成步骤）
python3 scripts/python/orchestrator.py scripts/python/test_workflow.json resume-test-001
```

**预期结果**:
- 第二次执行跳过已完成步骤
- 从中断点继续执行
- 最终状态正确

## 检查执行结果

### 查看状态文件

```bash
# 查看执行状态
cat .product-builder/jobs/test-job-001/state.json | jq

# 查看执行日志
cat .product-builder/jobs/test-job-001/execution.log | jq
```

### 状态文件结构

```json
{
  "current_phase": "P0-TEST",
  "current_step": "P0-STEP3",
  "completed_steps": ["P0-STEP1", "P0-STEP3"],
  "skipped_steps": ["P0-STEP2"],
  "failed_steps": [],
  "status": "completed",
  "variables": {
    "test_mode": "basic",
    "P0-STEP1_completed": true,
    "P0-STEP1_success": true
  }
}
```

## 验证清单

### ✅ 基本功能
- [ ] 线性执行（无transitions）
- [ ] 转换驱动执行
- [ ] 条件步骤跳过
- [ ] 步骤重试机制

### ✅ 转换语义
- [ ] 成功转换 (`on: success`)
- [ ] 失败转换 (`on: failed`)
- [ ] 跳过转换 (`on: skipped`)
- [ ] 无条件转换 (`on: always`)

### ✅ 执行模式
- [ ] Permissive模式（默认）
- [ ] Strict模式（`--strict-transitions`）
- [ ] 自动审批（`--auto-approve`）

### ✅ 状态管理
- [ ] completed_steps 正确记录
- [ ] failed_steps 正确记录
- [ ] skipped_steps 正确记录
- [ ] 变量更新正确

### ✅ 错误处理
- [ ] 步骤失败时正确处理
- [ ] 无转换时正确halt（strict模式）
- [ ] 异常正确传播
- [ ] 状态正确保存

### ✅ 断点恢复
- [ ] 跳过已完成步骤
- [ ] 从中断点继续
- [ ] 状态正确恢复

## 调试技巧

### 1. 启用详细日志

修改orchestrator.py，增加调试输出：

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### 2. 检查转换匹配

在 `_find_next_step` 中添加打印：

```python
print(f"DEBUG: Looking for transition from {current_step_id} with status {step_status}")
print(f"DEBUG: Matching transitions: {matching_transitions}")
```

### 3. 验证条件评估

在 `_evaluate_condition` 中添加打印：

```python
print(f"DEBUG: Evaluating condition: {condition}")
print(f"DEBUG: Result: {result}")
```

## 常见问题

### Q: 工作流标记为completed但步骤未全部执行

**可能原因**:
- Permissive模式下，某些步骤被跳过
- 转换图不完整，某些步骤未被到达

**解决方法**:
- 使用 `--strict-transitions` 检测转换缺失
- 检查 `skipped_steps` 确认哪些步骤被跳过

### Q: Strict模式意外halt

**可能原因**:
- 缺少某个状态的转换（success/failed/skipped）
- 条件评估为false，无匹配转换

**解决方法**:
- 检查transitions.json，确保所有路径都有转换
- 添加 `on: always` 作为fallback

### Q: 步骤重复执行

**可能原因**:
- 循环转换配置错误
- 状态未正确持久化

**解决方法**:
- 检查 `type: "loop_internal"` 转换的条件
- 验证状态文件正确保存

## 性能测试

### 测试大型工作流

```bash
# 创建包含100个步骤的工作流
python3 scripts/python/generate_large_workflow.py > large_workflow.json

# 测试执行时间
time python3 scripts/python/orchestrator.py large_workflow.json perf-test-001
```

### 测试并发执行

```bash
# 同时运行多个工作流实例
for i in {1..10}; do
  python3 scripts/python/orchestrator.py scripts/python/test_workflow.json concurrent-test-$i &
done
wait
```

## 下一步

1. **添加单元测试**: 为关键方法编写pytest测试
2. **集成测试**: 测试完整的工作流场景
3. **性能基准**: 建立性能基线
4. **CI集成**: 将测试集成到CI/CD流程

## 参考

- 执行器代码: `scripts/python/orchestrator.py`
- 测试工作流: `scripts/python/test_workflow.json`
- 测试脚本: `scripts/python/test_orchestrator.py`
