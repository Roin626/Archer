# v23 复杂计算基线

该目录冻结发布版 `v23` 的网页、动态挠度模型、界面脚本、样式、模型说明和测试，
作为后续复杂计算模式的独立开发基础。根目录发布版不会加载这里的任何文件。

直接打开本目录的 `index.html` 可以运行快照；Node 模型测试命令为：

```text
node experiments/complex-v23/test_model.js
```

## 后续模型边界

- 当前预测动态挠度继续使用实测器材参数。
- 常见成品挠度候选只按实测满拉拉重与实测拉距生成。
- Easton、Gold Tip、Trophy Ridge 等厂商选箭表独立展示，不并入通用候选。
- 弓把避让的弓档、箭速和通过周期研究位于相邻的 `clearance-cycle` 实验模块。
- 未完成实测标定前，不把复杂模型重新接入根目录发布网页。

## 快照来源

```text
Git commit: dda82f3
Release tag in page assets: v23
```
