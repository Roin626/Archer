# 弓把避让通过周期实验模型

## 隔离边界

该模型位于 `experiments/clearance-cycle/model.js`，不被 `index.html` 引用，
不修改或扩展线上使用的 `ArcherModel`。现行发布版仍只加载
`src/model.dynamic.js` 和 `src/app.dynamic.js`。

实验模型使用独立命名空间 `ArcherClearanceCycleModel`，当前只提供：

```js
simulateClearanceCycle(input) -> ExperimentalClearanceCycleResult
```

输出固定包含：

```text
status = experimental-unvalidated
classification = null
```

即在完成实测标定前，不生成“满足避让”“临界”或“碰撞”结论。

## 新变量

- 弓档 `braceHeightMm`：按本项目约定，出箭点到静止弦的纵向距离，毫米。
- 箭速 `arrowSpeedMps`：箭离弦附近的出口速度，米每秒。
- 实测满拉拉重 `drawWeightLb`：用于释放侧向激励和箭速一致性审计，不用于替代实测箭速。

拉距使用箭尾喉口到弓把基准点的实测距离。两种距离必须采用一致的纵向基准，
否则有效动力行程没有物理意义。

## 纵向通过时间轴

第一版采用匀加速近似。令满拉距离为 `D`，弓档为 `B`，出口箭速为 `v`：

```text
有效动力行程 S = D - B
平均等效加速度 a = v^2 / (2S)
在弦时间 t_power = 2S / v
离弦后箭尾到达弓把时间 t_coast = B / v
箭尾完全越过弓把时间 t_clear = t_power + t_coast
```

在 `0 <= t <= t_power` 内：

```text
travel(t) = 0.5 * a * t^2
```

离弦后按出口速度匀速前进。弓把位置对应的箭杆截面从满拉时靠近箭头的一侧，
连续移动到箭尾喉口，因此模型会逐时刻计算弓把对应的箭杆轴向位置。

## 第一弯曲模态代理

ATA 静态挠度先换算为弯曲刚度：

```text
EI = P * L_test^3 / (48 * delta)
P = 1.94 lb
L_test = 28 in
```

第一版把箭杆近似为箭尾受约束、箭头端自由的梁，并用 Rayleigh 方法建立单模态
代理：

```text
k_modal = 3EI / L_shaft^3
m_modal = m_point + (33/140) * m_shaft
f_1 = sqrt(k_modal / m_modal) / (2*pi)
```

分布质量参与侧向激励的系数取 `0.375`。释放扰动按满拉拉重计算，实测出箭点
几何项按箭支纵向加速度产生的惯性力计算：

```text
Q_release = draw_weight * c_release
Q_geometry = (m_point + 0.375 * m_shaft) * a * offset / draw_length
Q = Q_release + Q_geometry
```

模型还输出由总箭重与箭速反推的平均轴向力，并与实测满拉拉重比较。该比值只用于
发现单位或测量明显不一致，不能被解释为完整的弓力曲线。

模型对在弦阶段使用常值阶跃激励，离弦后使用欠阻尼自由响应。再利用一阶模态形状
计算弓把所处箭杆截面的局部位移代理。

## 不能直接解释为净空的原因

目前的局部位移仍是单模态代理量。它尚未准确描述：

- 满拉时箭杆与弓把接触形成的初始边界条件；
- 弓弦横向移动和手指撒放激励的时间变化；
- 箭头、箭尾、羽毛和配件的真实质量分布；
- 箭杆多阶弯曲、材料阻尼及旋转；
- 弓把三维轮廓和接触位置。

因此 `geometricThresholdMm = offset + shaftDiameter / 2` 只作为待标定的几何参照，
不能直接与峰值代理量比较后判定是否碰撞。

## 首批标定案例

`experiments/clearance-cycle/calibration-cases.json` 保存了以下实测顺序：

| ATA 挠度 | 箭头系统重量 | 实测结果 |
| ---: | ---: | --- |
| 600 | 200 gr | 接触弓臂 |
| 600 | 300 gr | 接近最低避让水平 |
| 800 | 200 gr | 偶发接触 |
| 800 | 300 gr | 避让更好 |

还需为同一支弓和每支测试箭补齐弓档、实测箭速、裸箭重量和箭杆外径。数据补齐后，
应先检查模型能否复现实测排序，再拟合释放系数、阻尼和判定区间。不能为了命中四个
案例直接写死 ATA 或箭头重量阈值。
