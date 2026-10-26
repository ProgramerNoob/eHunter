# 设计：修复复核发现的三组问题

## 背景

`aedd80f` 修完 7 个缺陷后，人工复核列出 11 条，实测核对后 10 条成立、1 条结论反转并暴露新的可见回归。本任务把成立项收成一个可回退的改动集。

## 边界

- 触点：`core/model/layout.ts`、`core/components/layout/DockWorkspace.vue`、`core/components/dialog/ThumbExpandDialog.vue`、`core/components/AlbumScrollView.vue`、`core/store/app.ts`、`core/store/event.ts`。
- 新增测试：`tests/layout-model.test.cjs`（transpile + VM，沿用 `tests/helpers/runtime-fixture.cjs`）。
- 文档：`.trellis/spec/frontend/features/001-dockable-panel-layout/data-model.md`、`.trellis/spec/frontend/features/001-thumb-expand-modal/spec.md`。
- 不碰：持久化格式、存储键、`src/platform/**`、`ThumbView`/`Pagination` 组件。

## D1 弹层网格间隙回归

现状：`.grid-wrap` 列数从 `repeat(auto-fit, minmax(120px, 120px))` 改成固定 `repeat(5, minmax(0, 120px))`，但 `shouldDistributeItems` 与 `.distributed { justify-content: space-between }` 保留。旧布局下轨道铺满容器，`space-between` 几乎无效果；新布局下轨道固定，剩余空间被当间隙均分——实测 1200 视口相邻项间隙 130/129px，1023 视口 303px。

方案：删除 `shouldDistributeItems`、`gridColumns`、`updateGridColumns` 及 `resize` 监听（列数由 CSS 决定后无人消费），模板去掉 `:class="{ distributed: shouldDistributeItems }"`，SCSS 删除 `.distributed` 块。

副作用与回退：`gridColumns` 无其它消费方（`rg` 确认），删除不影响逻辑；回退只需还原四处。

文档：`design.md` 里 `.distributed` 相关描述同步删除，窄屏列宽描述改为「`minmax(0, 120px)` 上限，窄视口自动收缩」。

## D2 注册表只接线一半

现状三处偏差：
1. `getThumbSizeRange` 对 `bottom` 走 `bottomMinSizePx`/`bottomMaxSizePx` 常量分支，注册表只有单一 `minSizePx`/`maxSizePx`，表达不了「侧 60–520 / 底 60–420」。
2. `getLayoutBlock`/`getDockAllowedSlots`/`getDockLongPressMs` 定义在 `layoutBlockRegistry` 之前，`createDefaultModeLayout()` 在模块级调 `clampThumbSize` 依赖 const 提升。
3. `DockWorkspace.vue` 的三个 `.drop-zone` 与 `detectPreviewSlot` 里每次 pointermove 的 `getDockAllowedSlots()` 复制。

方案：

```
export type LayoutBlockSizeRange = { minSizePx: number; maxSizePx: number }

export interface LayoutBlockRegistration {
    blockId: LayoutBlockId
    titleI18nKey: string
    dockable: boolean
    resizable: boolean
    allowedSlots: DockSlotId[]
    sizeRange: LayoutBlockSizeRange
    slotSizeRanges?: Partial<Record<DockSlotId, LayoutBlockSizeRange>>
    touchLongPressMs: number
}
```

- 注册表 `thumb` 条目：`sizeRange: { minSizePx: sideMinSizePx, maxSizePx: sideMaxSizePx }`、`slotSizeRanges: { bottom: { minSizePx: bottomMinSizePx, maxSizePx: bottomMaxSizePx } }`；`main` 条目 `sizeRange: { minSizePx: 320, maxSizePx: 2400 }`。
- `getBlockSizeRange(blockId, slot?)`：优先 `slotSizeRanges[slot]`，否则 `sizeRange`。
- `getThumbSizeRange(slot, viewportPx?)` 只调 `getBlockSizeRange('thumb', slot)`；保留 `viewportPx === undefined || viewportPx <= 0` 时返回基础范围（`store.viewportWidth=0` 的初始化瞬间不能被钳到最小值）。
- 把 `layoutBlockRegistry` 声明上移到 `computeMainMinSizePx`/`getThumbSizeRange` 之前，查询函数紧随其后。`createDefaultModeLayout` 仍在其后。
- `DockWorkspace.vue` 新增 `const allowedSlots = getDockAllowedSlots()`（setup 顶层常量），`detectPreviewSlot` 与 `onDragEnd` 复用；覆盖层改 `v-for="slot in allowedSlots"`，文案走 `dockSlotLabel(slot)` 映射 `i18n.dockLeft/dockRight/dockBottom`。

为什么用 `slotSizeRanges` 而不是给注册表加 `min/maxWidthPx`+`min/maxHeightPx`：槽位是停靠概念，尺寸随槽位方向变化；按 `DockSlotId` 挂差异比按轴向挂更贴近现有 `clampThumbSize(slot, ...)` 签名，也不用引入第二个维度。

兼容与回退：`LayoutBlockRegistration` 是内部类型，`rg` 确认无外部构造点（只有注册表数组本身）。回退为还原 `minSizePx`/`maxSizePx` 两字段与 bottom 常量分支。

## D3 视口变化不重钳制

现状：`setViewportWidth`/`setViewportHeight` 只写 store，`initViewportSizeUpdater()` 在 resize 后只更新尺寸。实测 1200 拖到 520 → 缩到 390，侧栏仍 520、主区 0。

方案：`setViewportWidth`/`setViewportHeight` 写入后调用新增的 `reclampThumbSizes()`：

```
function reclampThumbSizes() {
    const slot = normalizeDockSlot(store.thumbDockSlot)
    store.thumbViewWidth = clampThumbSize(slot, store.thumbViewWidth, store.viewportWidth)
    store.thumbViewHeight = clampThumbSize('bottom', store.thumbViewHeight, store.viewportHeight)
    if (slot === 'bottom') {
        syncThumbVisualMetrics(store.thumbViewHeight)
    } else {
        syncThumbVisualMetrics(store.thumbViewWidth)
    }
}
```

只在值发生变化时赋值，避免每次 resize 触发无意义的响应式更新。重钳制是内存态修正，不写回偏好（与现有 `applyCurrentModeLayoutPreference` 的读取态一致，刷新仍按存储值 + 视口再钳一次）。

副作用：旋转到更大视口时不会自动放大到原存储值（内存里已被钳小）。这一点按用户口径「主区优先」接受，写入下一次交互时持久化新值。

## D4 极端视口主区被反压

现状：`max = Math.max(min, min(baseMax, viewportPx - computeMainMinSizePx(viewportPx)))`。视口 100 时 `computeMainMinSizePx=60`，`ceiling=40`，`max=60`，主区只剩 40。

方案：把 clamp 的下限也纳入视口约束——当 `ceiling < min` 时优先保证主区下限，把 `min` 一起下调：

```
const ceiling = Math.min(baseMax, viewportPx - computeMainMinSizePx(viewportPx))
if (ceiling < min) {
    return { min: Math.max(0, ceiling), max: Math.max(0, ceiling) }
}
return { min, max: Math.max(min, ceiling) }
```

即 `min/max` 同时压到 ceiling，主区保底不被反压。100 视口 → `{min: 40, max: 40}`，主区 60。

文档：`data-model.md` 的生效范围规则补一句「当主区下限本身超过可用空间时，主区下限让步，缩略图最小/最大尺寸同步下调」。

## D5 死代码

`core/components/AlbumScrollView.vue` 的 `if (cons) {` 紧接 `const cons = [...]`，恒真，删除包裹块并减少一级缩进。

## D6 测试

新增 `tests/layout-model.test.cjs`，用 `tests/helpers/runtime-fixture.cjs` 的 transpile + VM 加载 `core/model/layout.ts`，覆盖：

- `computeMainMinSizePx`：1200→320、500→300、390→234、100→60、0→0、负数→0。
- `getThumbSizeRange('left')`：无视口 `{60,520}`；1200 `{60,520}`；390 `{60,156}`；100 `{40,40}`。
- `getThumbSizeRange('bottom')`：无视口 `{60,420}`；900 `{60,420}`；400 `{60,160}`。
- `clampThumbSize`：非有限值回退（bottom 200 / 其它 150）、四舍五入、上下界。
- `getDockAllowedSlots()` 返回副本（修改返回值不影响注册表）、`getDockLongPressMs()` 为 500。
- 注册表自检：`blockId` 唯一、`dockable=true` 的块 `allowedSlots` 非空、每个 `sizeRange.minSizePx < maxSizePx`。

`package.json` 的 `test` 链加 `test:layout-model`。

## 验证

- `npm run type-check`
- `npm run test:layout-model` 与 `npm run test`
- 浏览器回归（Vite dev + browser-preflight）：dockable desktop/mobile、触点回归、thumb-expand desktop/mobile + 网格间隙采样（1200/1023/390）、旋转重钳制采样。
- `npm run check`

## 回滚

改动集中在 6 个源文件 + 1 个新测试 + 2 个文档；逐项独立，可按 D1/D2/D3+D4/D5 分批回退。
