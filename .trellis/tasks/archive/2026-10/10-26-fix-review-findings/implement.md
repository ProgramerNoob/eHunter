# 执行计划：修复复核发现的三组问题

## 前置

```bash
cd /Users/warwick/claude/eHunter
python3 .trellis/scripts/task.py current   # 应为 10-26-fix-review-findings 且 in_progress
```

按 `notify-complete` 技能在开始测试前播放短通知。

## 步骤 1：布局模型（D2 注册表 + D4 极端视口）

文件：`core/model/layout.ts`

1. 把 `layoutBlockRegistry` 连同新增的 `LayoutBlockSizeRange` 类型上移到 `computeMainMinSizePx` 之前；`LayoutBlockRegistration` 用 `sizeRange` + `slotSizeRanges?` 取代 `minSizePx`/`maxSizePx`。
2. 新增 `getBlockSizeRange(blockId, slot?)`，`getLayoutBlock`/`getDockAllowedSlots`/`getDockLongPressMs` 紧随注册表。
3. `getThumbSizeRange` 改为只调 `getBlockSizeRange('thumb', slot)`，保留 `viewportPx` 缺省/非正数时返回基础范围。
4. `getThumbSizeRange` 的 `ceiling < min` 分支：`min`/`max` 同压到 `ceiling`，保证主区下限优先。
5. `computeMainMinSizePx` 保持现状（读 `main.sizeRange.minSizePx`）。

验证：

```bash
npm run type-check
node -e "const l=require('typescript')" # 仅确认 TS 可用，无实际断言
```

预期：`type-check` exit 0；`getThumbSizeRange` 不再出现 `bottomMinSizePx`/`bottomMaxSizePx` 字面分支（`rg 'bottomMinSizePx|bottomMaxSizePx' core/model/layout.ts` 只剩常量声明与注册表引用）。

## 步骤 2：停靠覆盖层（D2 后半）

文件：`core/components/layout/DockWorkspace.vue`

1. setup 顶层加 `const allowedSlots = getDockAllowedSlots()`。
2. `detectPreviewSlot` 与 `onDragEnd` 改用该常量。
3. 覆盖层改 `v-for="slot in allowedSlots"` + `dockSlotLabel(slot)` 函数映射 `i18n.dockLeft/dockRight/dockBottom`。
4. SCSS 的 `.drop-zone.left/.right/.bottom` 改成 `.drop-zone` + `:class="slot"` 的组合选择器（沿用现有定位规则，不改视觉）。

验证：`npm run type-check`；后续浏览器轮里断言 `.drop-zone` 数量为 3、类名为 `drop-zone left/right/bottom`。

## 步骤 3：视口重钳制（D3）

文件：`core/store/app.ts`

1. 新增 `reclampThumbSizes()`（见 design.md D3），只在值变化时赋值。
2. `setViewportWidth`/`setViewportHeight` 写入后调用。

验证：`npm run type-check`；浏览器轮里跑旋转采样（1200 拖到 520 → 390）。

## 步骤 4：弹层网格（D1）与死代码（D5）

文件：`core/components/dialog/ThumbExpandDialog.vue`

1. 删除 `gridColumns`/`shouldDistributeItems`/`updateGridColumns`、`onMounted`/`onBeforeUnmount` 的 resize 监听，模板去掉 `:class="{ distributed: ... }"`。
2. SCSS 删除 `.distributed` 块与 `@include responsive` 遗留（若已无引用）。

文件：`core/components/AlbumScrollView.vue`

3. 删除 `if (cons) {` 包裹层。

验证：`npm run type-check`；`rg 'shouldDistribute|distributed' core/` 应为空。

## 步骤 5：测试（D6）

新增 `tests/layout-model.test.cjs`（覆盖 design.md D6 列出的用例），`package.json` 的 `test` 链加 `test:layout-model`。

```bash
npm run test:layout-model
npm test
```

## 步骤 6：浏览器回归

```bash
pkill -f 'node .*node_modules/.bin/vite'
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort   # 记录 PID 到 .tmp/vite-dev.pid
```

改码后必须重启 Vite（HMR 的 `?t=` 查询参数会让 preflight 的 `requiredModules` 匹配失败）。

跑并 `verify-browser` 校验：

- `.tmp/round-dockable-desktop.mjs`（吸附/缩放/持久化/回归）
- `.tmp/round-dockable-mobile-final.mjs`（触摸缩放钳制）
- `.tmp/round-dockable-touch-dock.mjs`（触摸停靠）
- `.tmp/round-dockable-mobile-maxdrag.mjs`（D2/D4 主区下限）
- `.tmp/round-thumb-expand-desktop.mjs`（密度、分段、跳转、末行）
- `.tmp/round-thumb-expand-mobile.mjs`（窄屏 3 列、跳转、停靠）
- 网格间隙采样（新增 `.tmp/round-grid-gap.mjs`）：1200/1023/768/390 记录相邻项间距与最右列 right
- 旋转重钳制采样（新增 `.tmp/round-rotate-reclamp.mjs`）：1200 拖到 520 → 390，记录 side/main

## 步骤 7：文档与收口

1. `.trellis/spec/frontend/features/001-dockable-panel-layout/data-model.md`：`LayoutBlock` 字段改为 `sizeRange`/`slotSizeRanges`，补极端视口让步规则。
2. `.trellis/spec/frontend/features/001-thumb-expand-modal/spec.md`：Assumptions 补「跳转后短暂锁定目标页，用户滚动即释放」。
3. `validation.md`：记录 7 组浏览器轮产物、实测数值、未覆盖项。
4. `acceptance.json` 按 8 条 AC 回填，`python3 scripts/acceptance.py summarize .trellis/tasks/10-26-fix-review-findings`。
5. `npm run check`（type-check + test + build-prod + check:docs）。
6. `task.py finish` → 提交 → 归档。

## 回滚点

- 步骤 1–2 完成：`git checkout -- core/model/layout.ts core/components/layout/DockWorkspace.vue`
- 步骤 3 完成：追加 `git checkout -- core/store/app.ts`
- 步骤 4–5 完成：追加 `git checkout -- core/components/dialog/ThumbExpandDialog.vue core/components/AlbumScrollView.vue tests/ package.json`
- 浏览器轮失败时保留产物目录，不回退代码，先记录再决定。
