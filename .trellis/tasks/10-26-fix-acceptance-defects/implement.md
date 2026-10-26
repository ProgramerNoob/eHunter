# 执行计划

## 前置

- 服务：`npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`（复用现有 PID，必要时重启并更新 `.tmp/dockable-panel-service-evidence.json`）。
- 测试前播放 notify-complete 短通知（COUNT=5），完成后播放长通知（COUNT=10）。
- 证据目录：`.tmp/`；缺陷修复前的基线产物已在 `.tmp/browser-preflight/dockable-*` 与 `thumb-expand-*`。

## 步骤

1. **D1 触摸停靠**（`core/components/layout/DockHandle.vue`）
   - 给 `.dock-handle` 加 `touch-action: none`。
   - 验证：移动端 390×844 长按 780ms 后拖到右侧，`pointercancel` 计数为 0，`thumbDockSlot` 变 `right` 且持久化写入。

2. **D2 + D3 布局约束与注册表接线**（`core/model/layout.ts`、`core/components/layout/DockWorkspace.vue`、`core/store/app.ts`、`core/components/ReaderView.vue`）
   - 新增 `computeMainMinSizePx`、`getLayoutBlock`、`getDockAllowedSlots`、`getThumbSizeRange`。
   - `clampThumbSize` 支持视口感知上限（新增可选参数，默认行为等价现状）。
   - `DockWorkspace` 的可吸附槽位与长按阈值改从注册表读取；删除 `ReaderView.vue` 的 `:long-press-ms="500"`。
   - 验证：390×844 拖分界线到右缘 → 侧栏 ≤156、主区 ≥234；1200×900 → 侧栏可到 520、主区 ≥320；底栏 60–420 不变。

3. **D6 跳转落点**（`core/components/AlbumScrollView.vue`）
   - `scrollToCurIndex()` 取目标前按 `offsetTop` 排序副本。
   - 验证：第三卷点弹层页码 204 → `204 / 250`；250 页点第 2 段首项 201 → `201 / 250`。

4. **D4 + D7 弹层**（`core/components/dialog/ThumbExpandDialog.vue`）
   - 宽视口固定 5 列、窄视口 3 列；删除 xxl 宽度分支。
   - 窄屏 `.panel` 改 `height: auto; max-height: 100%`，消除 2px 溢出。
   - 验证：1200×900 `columns 5`、`rowsVisible ≥ 4`；390×844 `columns 3`、`.panel` 高度 ≤ 844。

5. **D5 文档口径**（`.trellis/spec/frontend/features/001-thumb-expand-modal/`）
   - spec.md、data-model.md、quickstart.md、contracts 的 100 页改 200 页。
   - 验证：`npm run check:docs`。

6. **回归验收**
   - `npm run type-check`。
   - 桌面/移动两轮 `withBrowserPreflight`：吸附（左/右/底、无效目标）、缩放（hover affordance、钳制）、按模式持久化与刷新恢复、两模式阅读、弹层入口锚定、分段与默认定位、单分段、末行对齐、缩略图失败跳转、触摸停靠与触摸滚动。
   - `python3 scripts/acceptance.py verify-browser <dir>` 全部 passed。

## 验证命令

```bash
npm run type-check
npm run check:docs
python3 scripts/acceptance.py verify-browser .tmp/browser-preflight/<dir>
```

## 回滚点

- 步骤 1、3、4 各自独立可 revert。
- 步骤 2 涉及持久化读取路径，回滚需同时还原 `core/model/layout.ts` 与 `core/store/app.ts`。
- 步骤 5 仅文档。

## 完成标准

- AC1–AC8 全部通过，acceptance.json 有对应证据。
- 两组原验收任务中因缺陷判 failed 的检查项重新通过或据实更新。
- `npm run check` 通过。
