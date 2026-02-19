# 灵活 Phase 设计的理论支持

## 1. 核心设计模式理论基础

### 1.1 Registry Pattern（注册表模式）

**定义**：一种结构化方法，用于集中管理和访问应用程序中的共享对象或实例。

**核心原则**（来源：[GeeksforGeeks - Registry Pattern](https://www.geeksforgeeks.org/registry-pattern/)）：
- **集中管理**：通过单一访问点简化共享资源的控制和更新
- **解耦**：组件不需要知道具体的类或实例化细节，只需查询注册表
- **资源共享**：促进对象重用而不是创建多个实例
- **动态配置**：允许运行时配置以实现灵活的应用行为
- **改进测试**：更容易在测试期间注入模拟对象

**在我们方案中的应用**：
```json
{
  "phase_registry": {
    "research": { "id": "research", "steps": [...] },
    "planning": { "id": "planning", "steps": [...] },
    "execution": { "id": "execution", "steps": [...] }
  }
}
```

- `phase_registry` 作为中央注册表
- 每个 phase 通过唯一 ID 注册
- 不同模式通过 ID 引用 phase，而不是重复定义

### 1.2 Strategy Pattern（策略模式）

**定义**：定义一系列算法，将每个算法封装起来，并使它们可以互换。策略模式让算法独立于使用它的客户端而变化。

**核心原则**（来源：Gang of Four 设计模式）：
- **封装变化**：将变化的部分封装成独立的策略
- **运行时选择**：在运行时选择具体的策略
- **开闭原则**：对扩展开放，对修改关闭

**在我们方案中的应用**：
```json
{
  "modes": {
    "lite": { "pipeline": ["intake", "planning", "execution", ...] },
    "standard": { "pipeline": ["research", "ideate", "planning", ...] },
    "full": { "pipeline": ["research", "ideate", "planning", "execution", "testing", ...] }
  }
}
```

- 每个模式是一个不同的"策略"
- Pipeline 定义了该策略的执行序列
- 运行时根据用户选择的模式应用相应的策略

### 1.3 Template Method Pattern（模板方法模式）

**定义**：在一个方法中定义算法的骨架，将一些步骤延迟到子类中。模板方法使得子类可以在不改变算法结构的情况下，重新定义算法的某些步骤。

**核心原则**：
- **算法骨架**：定义算法的基本结构
- **可变步骤**：允许子类覆盖特定步骤
- **控制反转**：父类调用子类的操作

**在我们方案中的应用**：
- `phase_registry` 定义了所有可能的"步骤"（phases）
- 每个模式的 `pipeline` 定义了该模式的"算法骨架"
- 不同模式可以选择不同的 phases 组合，但每个 phase 的内部实现保持一致

### 1.4 Composition over Inheritance（组合优于继承）

**定义**：一种面向对象设计原则，建议使用对象组合而不是类继承来实现代码重用。

**核心原则**（来源：[Composition over Inheritance](https://en.wikipedia.org/wiki/Composition_over_inheritance)）：
- **灵活性**：组合比继承更灵活，可以在运行时改变行为
- **避免脆弱基类问题**：继承会导致子类依赖父类的实现细节
- **更好的封装**：组合保持了更好的封装性

**在我们方案中的应用**：
- **不使用继承**：不是让 `lite` 继承 `standard`，再让 `full` 继承 `standard`
- **使用组合**：每个模式通过组合不同的 phases 来构建自己的 pipeline
- **运行时灵活性**：可以在运行时根据模式选择不同的 phase 组合

对比：
```json
// ❌ 继承方式（不推荐）
{
  "modes": {
    "standard": { "phases": [...] },
    "full": { "extends": "standard", "additional_phases": [...] }
  }
}

// ✅ 组合方式（推荐）
{
  "phase_registry": { ... },
  "modes": {
    "standard": { "pipeline": ["research", "planning", "execution"] },
    "full": { "pipeline": ["research", "ideate", "planning", "execution", "testing"] }
  }
}
```

## 2. 工作流编排理论

### 2.1 Workflow Composition（工作流组合）

**定义**：将多个工作流组件组合成更复杂的工作流的能力。

**核心原则**（来源：[Pipeline Composition](https://hexdocs.pm/pipeline_ex/05_pipeline_composition.html)）：
- **模块化**：每个组件是独立的、可重用的单元
- **可组合性**：组件可以以不同方式组合
- **声明式**：通过声明而不是命令来定义工作流

**在我们方案中的应用**：
- 每个 phase 是一个独立的模块
- 不同模式通过组合不同的 phases 来构建工作流
- Pipeline 数组是声明式的组合定义

### 2.2 Separation of Concerns（关注点分离）

**定义**：将程序分解为不同的部分，每个部分关注一个特定的关注点。

**核心原则**：
- **单一职责**：每个模块只负责一个功能
- **低耦合**：模块之间的依赖最小化
- **高内聚**：模块内部的元素紧密相关

**在我们方案中的应用**：
- **Phase Registry**：关注 phase 的定义（What）
- **Mode Configuration**：关注 phase 的组合（How）
- **Overrides**：关注模式特定的配置（Customization）

```json
{
  "phase_registry": {  // What: 定义所有可能的 phases
    "research": { ... }
  },
  "modes": {
    "lite": {
      "pipeline": [...],  // How: 定义 phase 的组合顺序
      "overrides": { ... }  // Customization: 模式特定的配置
    }
  }
}
```

## 3. 软件架构原则

### 3.1 DRY (Don't Repeat Yourself)

**定义**：避免重复代码，每个知识片段在系统中应该有单一、明确、权威的表示。

**在我们方案中的应用**：
- ✅ **方案 3（Registry + Blueprint）**：每个 phase 只定义一次
- ❌ **方案 1（Mode-Specific Arrays）**：同一个 phase 在多个模式中重复定义

### 3.2 SOLID 原则

#### Open/Closed Principle（开闭原则）
**定义**：软件实体应该对扩展开放，对修改关闭。

**在我们方案中的应用**：
- 添加新模式：只需在 `modes` 中添加新配置，不需要修改 `phase_registry`
- 添加新 phase：在 `phase_registry` 中添加，现有模式不受影响
- 修改现有 phase：在 `phase_registry` 中修改一次，所有使用该 phase 的模式自动更新

#### Single Responsibility Principle（单一职责原则）
**定义**：一个类应该只有一个引起它变化的原因。

**在我们方案中的应用**：
- `phase_registry`：负责 phase 的定义
- `modes.pipeline`：负责 phase 的组合顺序
- `modes.overrides`：负责模式特定的配置覆盖

## 4. 实际系统的类似设计

### 4.1 AWS Step Functions
- 使用状态机定义工作流
- 支持可重用的状态定义
- 支持不同的执行模式

### 4.2 GitHub Actions
- 使用 workflow 文件定义 CI/CD 流程
- 支持可重用的 actions（类似我们的 phase_registry）
- 支持不同的触发条件和执行策略（类似我们的 modes）

### 4.3 Apache Airflow
- 使用 DAG（有向无环图）定义工作流
- 支持任务的动态组合
- 支持不同的执行策略

## 5. 学术理论支持

### 5.1 Workflow Patterns（工作流模式）
来源：Workflow Patterns Initiative (van der Aalst et al.)

**相关模式**：
- **Sequence Pattern**：顺序执行（对应我们的 pipeline）
- **Parallel Split Pattern**：并行分支（对应我们的 parallelizable）
- **Exclusive Choice Pattern**：排他选择（对应我们的 condition）
- **Multi-Choice Pattern**：多选择（对应我们的 modes）

### 5.2 Service-Oriented Architecture (SOA)
**核心原则**：
- **服务注册表**：集中管理服务定义（类似我们的 phase_registry）
- **服务编排**：动态组合服务（类似我们的 pipeline）
- **服务发现**：运行时查找服务（类似我们的编译器）

## 6. 方案对比的理论评估

| 评估维度 | 方案 1 (Mode-Specific) | 方案 2 (Conditional) | 方案 3 (Registry + Blueprint) |
|---------|----------------------|---------------------|------------------------------|
| DRY 原则 | ❌ 重复定义 | ⚠️ 部分重复 | ✅ 无重复 |
| 开闭原则 | ❌ 修改成本高 | ⚠️ 中等 | ✅ 易于扩展 |
| 单一职责 | ❌ 职责混合 | ⚠️ 部分分离 | ✅ 职责清晰 |
| 组合优于继承 | ❌ 隐式继承 | ⚠️ 条件组合 | ✅ 显式组合 |
| Registry Pattern | ❌ 无 | ❌ 无 | ✅ 完整实现 |
| Strategy Pattern | ⚠️ 部分 | ⚠️ 部分 | ✅ 完整实现 |
| 可维护性 | ❌ 低 | ⚠️ 中 | ✅ 高 |
| 可测试性 | ❌ 低 | ⚠️ 中 | ✅ 高 |

## 7. 总结

**方案 3（Registry + Blueprint）的理论支持**：

1. **设计模式支持**：
   - ✅ Registry Pattern（注册表模式）
   - ✅ Strategy Pattern（策略模式）
   - ✅ Template Method Pattern（模板方法模式）
   - ✅ Composition over Inheritance（组合优于继承）

2. **架构原则支持**：
   - ✅ DRY（不重复）
   - ✅ SOLID 原则（特别是开闭原则和单一职责原则）
   - ✅ Separation of Concerns（关注点分离）

3. **工作流理论支持**：
   - ✅ Workflow Composition（工作流组合）
   - ✅ Workflow Patterns（工作流模式）
   - ✅ Service-Oriented Architecture（面向服务架构）

4. **实际系统验证**：
   - ✅ AWS Step Functions
   - ✅ GitHub Actions
   - ✅ Apache Airflow

**结论**：方案 3 不仅有充分的理论支持，而且在实际的大型系统中已经得到验证。这是一个经过时间考验的、成熟的架构模式。

## 参考资料

- [Registry Pattern - GeeksforGeeks](https://www.geeksforgeeks.org/registry-pattern/)
- [Composition over Inheritance - Wikipedia](https://en.wikipedia.org/wiki/Composition_over_inheritance)
- [Software Design Pattern - Wikipedia](https://en.wikipedia.org/wiki/Software_design_pattern)
- [Strategy Design Pattern](https://www.techedubyte.com/strategy-design-pattern-conditional-logic-code/)
- [Pipeline Composition - PipelineEx](https://hexdocs.pm/pipeline_ex/05_pipeline_composition.html)
- Gang of Four - Design Patterns: Elements of Reusable Object-Oriented Software
- Workflow Patterns Initiative - van der Aalst et al.
