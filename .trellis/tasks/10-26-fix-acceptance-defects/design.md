# 技术设计：修复 7 个缺陷

## 边界

- 修改范围：`core/model/layout.ts`、`core/model/thumbExpand.ts`（仅常量不变，不改）、`core/components/layout/DockHandle.vue`、`core/components/layout/DockWorkspace.vue`、`core/components/dialog/ThumbExpandDialog.vue`、`core/components/AlbumScrollView.vue`、`core/store/app.ts`、`core/components/ReaderView.vue`、`core/components/ThumbScrollView.vue`（按需）。
- 文档范围：`.trellis/spec/frontend/features/001-thumb-expand-modal/`（spec、data-model、quickstart、contracts）。
- 不动：`src/platform/**`、下载链路、设置弹窗、`layoutPreference` 的持久化 schema。

## D1 触摸停靠：`touch-action: none`

`core/components/layout/DockHandle.vue` 的 `.dock-handle` 补 `touch-action: none;`（与 `SplitHandle.vue` 的 `.split-handle` 对齐）。

- 理由：取证轮证实长按后第一步 `touchMove` 立刻 `pointercancel`，注入内联 `touch-action: none` 后同一手势成功吸附；浏览器把触摸判定为滚动手势才会取消 pointer 事件。
- 副作用评估：`.dock-handle` 是 `width:100%; height:100%` 的头部按钮，`touch-action: none` 会禁用该区域的原生滚动。头部区域本来就是拖拽手柄（点击无其他语义），缩略图滚动发生在 `.thumb-scroll-view`，不在头部，因此不会影响缩略图列表滚动。
- 回归点：移动端触摸滚动缩略图列表、书页模式触摸翻页仍正常。

## D2 主内容区最小尺寸

在 `core/model/layout.ts` 增加按视口计算的有效上限：

```ts
export function computeMainMinSizePx(viewportPx: number): number {
    const main = layoutBlockRegistry.find(b => b.blockId === 'main')
    const min = main ? main.minSizePx : 0
    return Math.min(min, Math.round(Math.max(0, viewportPx) * 0.6))
}
```

`clampThumbSize` 增加可选的上限覆盖参数（保持向后兼容，现有调用不变）：

- 侧栏：`maxSize = min(sideMaxSizePx, viewportWidth - computeMainMinSizePx(viewportWidth))`
- 底栏：`maxSize = min(bottomMaxSizePx, viewportHeight - computeMainMinSizePx(viewportHeight))`

落地位置：`core/store/app.ts` 的 `setThumbPanelSize`、`setThumbDockSlot`、`applyCurrentModeLayoutPreference`、`persistCurrentModeLayoutPreference` 四处调用点传入视口感知上限。

- 390×844：`computeMainMinSizePx(390) = min(320, 234) = 234`，侧栏上限 `390 - 234 = 156`，默认 150 不受影响。
- 1200×900：`computeMainMinSizePx(1200) = 320`，侧栏上限 `min(520, 880) = 520`（与现状一致）；底栏上限 `min(420, 580) = 420`（与现状一致）。
- 极端窄视口（如 200px）：主区下限 120，侧栏上限 80。

## D3 注册表接线

把 `layoutBlockRegistry` 变成唯一来源：

1. `core/model/layout.ts` 新增按 `blockId` 与槽位取配置的查询函数：`getLayoutBlock(blockId)`、`getDockAllowedSlots()`、`getThumbSizeRange(slot)`（返回 `{ min, max }`，max 已按视口降级）。
2. `DockWorkspace.vue`：
   - `props.longPressMs` 默认值改为从注册表读取（thumb 的 `touchLongPressMs`），并删除 `ReaderView.vue` 里写死的 `:long-press-ms="500"`。
   - `detectPreviewSlot` 的候选槽位改为遍历 `allowedSlots`，不再硬编码 `left/right/bottom` 三个分支。
   - `onDragEnd` 的落点也在 `allowedSlots` 内校验，非法落点回退当前槽位。
3. `ThumbScrollView.vue` 的 `DockHandle` 同样不再依赖默认值，由 `DockWorkspace` 下传阈值（保持现有 prop 链路）。

保留 `clampThumbSize` 作为纯函数入口，但内部改为读注册表 + `getThumbSizeRange`。

## D4 弹层列数上限

`core/components/dialog/ThumbExpandDialog.vue` 的 `.grid-wrap`：

- 宽视口（≥1024px）：`grid-template-columns: repeat(5, 120px)`，`justify-content: start`，5 列固定。
- 窄视口（<1024px）：`repeat(3, minmax(0, 1fr))`，3 列自适应。
- 删除 `@include responsive($breakpoint-xxl)` 下的 `.panel { width: min(1400px, 100%) }`（列数受限后加宽面板无意义，保留 1200px 上限）。

首屏 4 行校验：1200 高 900 − 面板 padding 48/12 − 分页器 ~58 = 可用约 751px；4 × (206 + 12) - 12 = 860 > 751。当前 8 列时 4 行也放不下（实测 `rowsVisible 4` 是因为面板 `max-height: min(90vh, 900px)` 下网格可滚动，可见行按网格可视高度计算）。改为 5 列后行高不变，`rowsVisible` 仍为 4，满足 FR-005。

- 待运行确认：列数改 5 后 `rowsVisible` 是否仍 ≥4；若不足则同步压缩 `.thumb-item height`（206 → 196）或 `gap`（12 → 10）。

## D5 分段规范对齐（文档）

`.trellis/spec/frontend/features/001-thumb-expand-modal/` 下把 100 页口径改为 200 页：`spec.md`（FR-007、US3、Independent Test、Thumbnail Segment 术语）、`data-model.md`（分段描述与 `segmentSize`）、`quickstart.md`、`contracts/thumb-expand-modal.openapi.yaml`（描述与 summary）。代码 `thumbExpandSegmentSize = 200` 不动。

## D6 `pageContainers` 顺序

`core/components/AlbumScrollView.vue`：

- `scrollToCurIndex()` 取目标前先按 `offsetTop` 排序（与 `watch(scrollPosition)` 内一致），不再依赖 ref 数组当前顺序：

```ts
const sorted = [...pageContainers.value].sort((a, b) => a.offsetTop - b.offsetTop)
const target = sorted[computedVolIndex.value]
```

- `watch(scrollPosition)` 里现有的 `pageContainers.value.sort(...)` 就地排序保留（其它分支依赖），但改为对副本排序后再引用，避免在渲染过程中改动 ref 数组触发额外重排。

- 根因说明：`ref` 数组元素由 `v-for` 重建，切卷后顺序变成倒序；按 `computedVolIndex` 直接下标取值会命中镜像元素。排序后取值与 `computedVolIndex` 语义一致。

## D7 窄屏面板溢出

`core/components/dialog/ThumbExpandDialog.vue` 的 `@media (max-width: 767px)` 分支：

- `.panel` 增加 `box-sizing: border-box`（当前 `height:100%` + 边框 1px 导致 846 > 844）。
- 或把 `height: 100%` 改为 `height: auto; max-height: 100%;`。选择后者更稳：`min-height: 100%` 与 `max-height: none` 同时存在时，边框仍会溢出。

## 数据流与兼容

- 持久化：`ehunter:reader:prefs:mode-layout` 的写入值可能因新的视口上限变小（例如 390 视口存过 389 会被钳到 156）。读取时 `clampThumbSize` 同样按当前视口钳制，不需要迁移。
- 风险：视口变化（旋转）后旧尺寸超过新上限，读取路径已兜底；`applyCurrentModeLayoutPreference` 会在模式切换时重算。

## 回滚

按 D1–D7 分组独立改动，每组一次提交；任一缺陷引入回归时可单独 revert，不影响其余。文档改动（D5）单独提交。
