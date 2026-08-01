# 模块化架构

## 目标

先把系统拆成三个可独立演进的层：

1. 实射数据层：记录落点、器材、距离、环境、调弓步骤和备注。
2. 模型推理层：基于物理模型、经验模型和实射数据生成分析结果。
3. 管理调度层：统一调用各模块，管理 SOP、实验版本和结果复盘。

当前实现只落地实射数据层的 MVP，但数据结构会预留接口，避免后续重写。

当前模型推理层已开始落地两个独立 CLI：

- `scripts/arrow_spine.py`: 箭矢静态挠度、动态 spine 初筛和单箭评估。
- `scripts/equipment_config.py`: 以弓型、拉重、AMO 拉距为输入，生成箭长、spine、箭头重量、成品箭重量和基础调弓设置矩阵。

## 数据层边界

### ShotSession

保存一次实射实验：

- `id`: session ID
- `createdAt`: 创建时间
- `bowType`: recurve、compound、barebow、traditional
- `distanceValue`: 距离数值
- `distanceUnit`: m、yd
- `targetSizeCm`: 靶面直径
- `ringCount`: 环数
- `setupNotes`: 器材与调弓状态
- `conditionNotes`: 风、光线、温湿度等环境信息
- `goal`: 本次实射目标
- `shots`: 落点列表

### Shot

保存单支箭：

- `id`: shot ID
- `index`: 序号
- `kind`: fletched、bareshaft、test
- `x`: 归一化横向坐标，中心为 0，左负右正，范围约 -1 到 1
- `y`: 归一化纵向坐标，中心为 0，上正下负，范围约 -1 到 1
- `score`: 根据当前靶面计算出的环值
- `note`: 单箭备注
- `createdAt`: 记录时间

## 模型推理层预留接口

后续模块可以通过以下接口读取数据：

```js
ArcherStorage.loadSession()
ArcherModel.summarizeSession(session)
```

建议新增推理模块时保持纯函数风格：

```js
analyzeBareShaftOffset(session) -> AnalysisResult
analyzeGroupTrend(session) -> AnalysisResult
suggestTuneAdjustments(analysis, bowProfile) -> TuneSuggestion[]
```

配置推荐模块的接口边界：

```python
estimate_static_spine(bow_type, draw_weight_lb, shaft_length_in, finished_arrow_weight_gr, arrow_pass_offset_mm) -> SpineRange
estimate_finished_arrow_weight(bow_type, draw_weight_lb, shaft_length_in, ata_spine, arrow_pass_offset_mm) -> ArrowMass
recommend_equipment(bow_type, draw_weight_lb, draw_length_amo_in, arrow_pass_offset_mm) -> EquipmentRecommendation
build_matrix(bow_type, draw_weights, draw_lengths, arrow_pass_offset_mm) -> EquipmentRecommendation[]
```

配置推荐只输出初筛候选，不直接写入 session。后续管理层可以把某一条推荐固化为 `EquipmentProfile`，再和实射 session 绑定。

## 管理调度层预留接口

管理层不直接操作 UI DOM，只调度数据、模型和 SOP 状态：

```js
startWorkflow(workflowId, sessionId)
runAnalysis(sessionId, modelId)
recordAdjustment(sessionId, adjustment)
compareSessions(baseSessionId, candidateSessionId)
```

## 当前技术选择

MVP 使用静态 HTML/CSS/JavaScript：

- 不依赖构建工具，降低启动成本。
- 可以直接打开 `index.html` 验证。
- 使用全局命名空间模拟模块边界，后续可迁移到 ES modules 或前端框架。
