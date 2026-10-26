# 执行计划：验收 001-dockable-panel-layout

## 范围

只验收，不改 `core/`、`src/` 代码。所有产物落 `.tmp/`。

## 依赖

- `npm run dev` 本地服务（按 [browser-acceptance.md](../../../spec/frontend/browser-acceptance.md#本地开发服务器) 归属核实、后台启动、收尾停止）
- `ego-browser` 会话与 `scripts/browser-preflight.mjs`
- 一个页数足够（≥45 页）的图集页面用于拖拽与缩放；若用本地 TEST 服务，需在轮次记录里写明来源与页码数

## 步骤

1. **准备**：按 notify-complete 发短通知；读 `ego-browser` 技能；启动 Vite 并保存服务证据（origin、cwd、pid、证据文件路径）。
2. **任务空间**：用 `taskSpace("eHunter 验收")` 创建或复用页面 `p1`，记录 `spaceId`。
3. **desktop 轮（1200×900）**：
   1. `withBrowserPreflight` + `profile: 'desktop'`，`prepareReader` 正常打开阅读器。
   2. P1 吸附：记录初始槽位 → 拖 `EHUNTER` 头部到右侧目标 → 断言槽位与内容区几何不重叠 → 拖到底部 → 断言；再拖到无效区域释放，断言布局回到上一稳定状态。
   3. P2 缩放：hover 分界线截图确认 affordance → 水平拖拽到最小/最大并各截图 → 越界拖拽断言钳制 → 底部吸附后垂直拖拽同理。
   4. P1 视觉：拖拽过程中截取 drop indicator 截图。
   5. 回归：切卷轴模式滚动与交互，切回书页模式翻页，断言页码变化。
   6. 退出 `withBrowserPreflight`，记录 `result.json` 与 `check.screenshot` 路径。
4. **mobile 轮（390×844，DPR3/touch5/coarse）**：
   1. 同源重新导航，`profile: 'mobile'`。
   2. 断言短按头部不改变布局（前后槽位一致），500ms 长按后拖动可吸附。
   3. 长按分界线拖动改变尺寸，越界钳制。
   4. 布局后两种模式阅读回归。
5. **静态检查**：`no-third-party-ui-library` 用 `npm ls --depth=0 --json` 或读 `package.json` 的 dependencies/devDependencies 断言，命令需在非零时失败。
6. **结构核对**：`layout-block-registry` 检查 `core/model/layout.ts` 的块元数据与 `DockWorkspace` 交互入口无 thumbnail 专有分支。
7. **刷新持久化**：P3 在 desktop 轮内完成——先设置书页模式布局，切卷轴模式设置不同布局，刷新页面断言两模式各自恢复。
8. **校验**：对每轮 `python3 scripts/acceptance.py verify-browser <artifact-dir>`，非 `passed` 不记通过。
9. **回填**：主会话按 `result` 与截图逐项更新 `acceptance.json` 的 `observed`/`note`/`evidence`。
10. **收尾**：停服务并确认进程退出与端口释放 → `task.finish({ keep: [] })` → `cleanup-browser` 生成资源报告 → `acceptance.py summarize` → 长通知。

## 验证命令

```bash
python3 scripts/acceptance.py verify-browser <artifact-dir>
python3 scripts/acceptance.py summarize .trellis/tasks/10-25-dockable-panel-acceptance
```

## 回滚点

- 无代码改动，回滚即丢弃 `.tmp/` 本轮产物。
- 服务启动失败或预检 blocked：保留 blocked 证据，不进入功能断言，回到用户确认环境。
