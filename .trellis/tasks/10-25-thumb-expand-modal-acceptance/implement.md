# 执行计划：验收 001-thumb-expand-modal

## 范围

只验收，不改 `core/`、`src/` 代码。所有产物落 `.tmp/`。

## 依赖

- `npm run dev` 本地服务（按 [browser-acceptance.md](../../../spec/frontend/browser-acceptance.md#本地开发服务器) 归属核实、后台启动、收尾停止）
- `ego-browser` 会话与 `scripts/browser-preflight.mjs`
- 两类图集样本：页数 > 100（验证分段与默认定位）与页数 ≤ 100（验证单分段）；若用本地 TEST 服务，需在轮次记录里写明来源与页码数

## 步骤

1. **准备**：notify-complete 短通知；读 `ego-browser` 技能；启动 Vite 并保存服务证据。
2. **任务空间**：复用或创建 `taskSpace`，记录 `spaceId`。
3. **desktop 轮**：
   1. `withBrowserPreflight` + `profile: 'desktop'`，`prepareReader` 打开阅读器，必要时先关闭版本更新弹窗。
   2. P1 侧边吸附：把缩略图面板吸到侧边，记录入口矩形 → 滚动 `.thumb-panel` 列表 → 再测入口矩形，断言 X 坐标与视口右缘关系不变 → 点击打开弹层。
   3. P1 底部吸附：吸到底部，同样测下缘锚定，点开弹层。
   4. P2 密度：断言弹层无标题元素；逐项断言图片与页码；计算列数 = 5、首屏可见行数 ≥ 4；截图。
   5. P3 分段：在 > 100 页样本中把当前页翻到非首段，打开弹层，断言默认聚焦该分段（分段高亮与首项页码），点第 2 段任一项，断言弹层关闭且阅读页等于目标页。
   6. 边界：≤ 100 页样本打开弹层，断言分页器存在且单分段可用。
   7. 末行：页数不能被列数整除时，断言末行项数、对齐与页码序列无重复。
   8. 失败图：用 CDP 请求拦截让部分缩略图请求失败，断言页码仍显示且点击可跳转。
   9. 回归：跳转后切卷轴模式再切回书页模式，断言阅读正常。
4. **mobile 轮（390×844）**：P1 入口锚定（侧边/底部）、P2 3 列与分项页码、P3 分段跳转；截图。
5. **视觉复核**：弹层截图与现有设置弹窗截图对比色彩层级、圆角、边框/阴影、间距。
6. **静态检查**：`package.json` 依赖中无第三方 UI 组件库。
7. **校验**：每轮 `python3 scripts/acceptance.py verify-browser <artifact-dir>`，非 passed 不记通过。
8. **回填**：主会话逐项更新 `acceptance.json`。
9. **收尾**：停服务 → `task.finish({ keep: [] })` → `cleanup-browser` → `summarize` → 长通知。

## 验证命令

```bash
python3 scripts/acceptance.py verify-browser <artifact-dir>
python3 scripts/acceptance.py summarize .trellis/tasks/10-25-thumb-expand-modal-acceptance
```

## 回滚点

- 无代码改动，回滚即丢弃本轮 `.tmp/` 产物。
- 若样本页数不足 100 无法构造分段场景，先记录 blocked 并回到用户确认样本来源。
