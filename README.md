# Archer

Archer 是一个模块化射箭调弓辅助项目。当前阶段先实现“实射落点记录”小程序，用来记录每组箭的落点、箭型、距离、器材配置和备注，为后续的箭飞行模型、调弓规则引擎和管理层调度提供数据入口。

## 当前模块

- `shot-landing-recorder`: 实射落点记录 MVP。
- `arrow-spine-calculator`: 箭矢静态挠度与动态匹配估算脚本。
- `equipment-config-matrix`: 按弓型、拉重和 AMO 拉距生成模块化配件初筛配置。
- `docs/architecture.md`: 三层模块化架构与接口边界。
- `docs/sop.md`: 从建档、实射、复盘到调弓建议的 SOP。
- `docs/spine-model.md`: spine 计算依据、公式假设与使用限制。
- `docs/equipment-config.md`: 配件配置矩阵的资料依据、字段和限制。

## 运行

Windows 下双击：

```text
start_archer.bat
```

启动器会打开 `index.html`。网页里可以记录落点、生成配件配置矩阵和计算 spine；控制台菜单保留同样的 CLI 入口和测试入口。

也可以直接用浏览器打开 `index.html`。当前版本不需要后端、不需要安装依赖，数据默认保存在浏览器 `localStorage`。

## MVP 功能

- 新建实射 session：弓型、距离、靶纸、环境、目标。
- 点击靶面记录落点。
- 标记箭型：羽箭、裸杆、测试箭。
- 自动计算环值和组散布。
- 在网页内生成不同拉重、AMO 拉距下的配件配置矩阵。
- 在网页内计算单组箭长/箭头重量下的 spine 推荐。
- 导出 JSON/CSV。
- 本地保存最近 session。

## 后续接口方向

- 物理模型层：接收装备参数和实射落点，输出弹道/瞄点/动态挠度估计。
- 调弓规则层：接收裸杆/羽箭偏差、paper tune 方向、walk-back 线性趋势，输出可执行调整建议。
- 管理调度层：统一 session、器材、模型版本、SOP 步骤和验证结果。

## 箭矢挠度脚本

生成推荐表：

```powershell
python scripts/arrow_spine.py --bow-type olympic_recurve --draw-weight 36 --shaft-length 29 --shaft-gpi 8.1 --point-system-weight 120 --rear-components-weight 28 --static-deflection 0.500 --manufacturer-min-gpp 6
```

评估单支箭：

```powershell
The calculator verifies finished arrow weight, GPP and ATA static deflection. It then hands the measured inputs to the selected shaft maker's chart; it does not invent a universal dynamic-spine recommendation.
```

## 模块化配件配置矩阵

按不同拉重和 AMO 拉距生成推荐表：

```powershell
python scripts/equipment_config.py --bow-type olympic_recurve --draw-weights 26:40:2 --draw-lengths 26,28,30
```

导出 JSON：

```powershell
python scripts/equipment_config.py --bow-type compound --draw-weights 40,50,60 --draw-lengths 27:31:1 --format json
```

无台传统弓需要额外输入出箭点距中心线；CLI 用毫米负值：

```powershell
python scripts/equipment_config.py --bow-type shelfless_traditional --draw-weights 40 --draw-lengths 28 --arrow-pass-offset-mm 25
```

支持的传统弓细分：

- `american_hunting`: 美猎，有弓窗/有 shelf。
- `shelfless_traditional`: 无台传统弓，包括土耳其弓、中国弓、蒙古弓等。
