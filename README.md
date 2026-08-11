# Archer

Archer 是一个模块化射箭器材匹配与调弓辅助项目。当前网页以动态挠度估算、静态 Spine 推荐和固定箭杆后的配重/箭长反算为主。

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

启动器会打开 `index.html`。网页计算中心出箭及非中心出箭器材的动态响应、静态 Spine 候选和固定箭杆调整方案；落点记录界面暂时隐藏，历史配件矩阵只保留 CLI 入口。

也可以直接用浏览器打开 `index.html`。当前版本不需要后端、不需要安装依赖，数据默认保存在浏览器 `localStorage`。

## MVP 功能

- 按弓型、材料、拉重、拉距、箭杆长、箭重、静态 Spine 和中心线偏差计算当前动态挠度。
- 分弓型给出静态 Spine 与动态响应推荐区间；无台传统弓额外叠加绕把净空约束。
- 固定当前裸箭 Spine，分别反算箭头/成品箭重方案和箭杆长度方案。
- 落点记录逻辑保留，但网页入口暂时隐藏。
- 提供克与磅、英寸与毫米的双向即时换算。
- 导出 JSON/CSV。
- 本地保存最近 session。

## 后续接口方向

- 物理模型层：接收装备参数和实射落点，输出弹道/瞄点/动态挠度估计。
- 调弓规则层：接收裸杆/羽箭偏差、paper tune 方向、walk-back 线性趋势，输出可执行调整建议。
- 管理调度层：统一 session、器材、模型版本、SOP 步骤和验证结果。

## 箭矢挠度脚本

按实测拉重、箭杆长和中心线偏差计算 ATA 静态 Spine 初筛范围：

```powershell
python scripts/spine_estimator.py from-weight --bow-type olympic_recurve --draw-weight 30 --shaft-length 30 --finished-arrow-weight 270 --arrow-pass-offset-mm 0
```

网页的“动态挠度与器材匹配”明确区分拉距（箭尾喉口至弓把 pivot）与箭杆长（箭尾喉口至箭杆端部）。中心出箭器材仍计算释放侧向激励下的动态弯曲；无台传统弓再叠加弓把净空要求。详细公式和限制见 `docs/spine-model.md`。

```powershell
python scripts/spine_estimator.py from-spine --bow-type olympic_recurve --draw-weight 30 --shaft-length 30 --ata-spine 700 --arrow-pass-offset-mm 0
```

`scripts/arrow_spine.py` 仍用于按箭杆 GPI、箭头系统和尾部组件核算成品箭重、GPP、ATA 静态挠度及厂家最低 GPP。两类工具的职责不混合。

## 配件配置矩阵 CLI（网页已移除）

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
