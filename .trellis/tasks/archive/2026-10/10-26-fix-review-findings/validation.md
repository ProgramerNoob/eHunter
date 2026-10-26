# 验证记录：修复复核发现的三组问题

## 背景

上一轮 `10-26-fix-acceptance-defects`（提交 `aedd80f`）修完 7 个缺陷后，人工按 Standards / Spec 两轴复核出 11 条结论。本轮先逐条取证，其中「窄屏 3 列横向溢出」被实测反证，同时暴露出一个由该轮改动引入的新回归（`.distributed` 均分间隙），最终本轮覆盖三组问题：网格间隙回归、注册表只接线一半、视口兜底缺失。

## 缺陷与修复

| 编号 | 问题 | 取证 | 修复 |
| --- | --- | --- | --- |
| R1 | 列数从 `auto-fit` 改为固定轨道后，`.distributed { justify-content: space-between }` 把剩余空间均分成间隙；1200 宽实测相邻项间隙 130/129px、1023 宽 303px | `ThumbExpandDialog.vue` 仍保留 `shouldDistributeItems` 与 `gridColumns` 计算 | 删除 `gridColumns`/`shouldDistributeItems`/`updateGridColumns` 与 resize 监听，模板去掉 `:class="{ distributed }"`，网格回到 `justify-content: start` + `gap: 12px` |
| R2 | 底栏尺寸上下限仍走 `bottomMinSizePx`/`bottomMaxSizePx` 常量分支，注册表的单一 `minSizePx`/`maxSizePx` 表达不了「侧 60–520 / 底 60–420」 | `getThumbSizeRange` 里 `slot === 'bottom' ? bottomMinSizePx : block.minSizePx` | 注册表改为 `sizeRange` + `slotSizeRanges`，新增 `getBlockSizeRange(blockId, slot)`；`getThumbSizeRange` 只读它 |
| R3 | `layoutBlockRegistry` 定义在 `getLayoutBlock` 等查询函数之后，模块级 `createDefaultModeLayout()` 靠 const 提升才成立 | `core/store/app.ts` 的 `readerLayoutPreference` 是模块级初始化 | 注册表上移到所有查询函数与默认值工厂之前 |
| R4 | `DockWorkspace.vue` 三个 `.drop-zone` 硬编码，`detectPreviewSlot` 每次 pointermove 都复制一次 `allowedSlots` | 覆盖层与检测路径不同源 | `allowedSlots` 提升为 setup 顶层常量，覆盖层 `v-for="slot in allowedSlots"` + `dockSlotLabels` 映射 |
| R5 | 视口变化不重钳制：1200×900 拖到 520 后改 390×844，侧栏仍 520、主区被压到 0 | `setViewportWidth`/`setViewportHeight` 只写值 | 抽出 `reclampThumbSizes()`，在两个 viewport setter 里调用 |
| R6 | 极端视口下主区下限被侧栏最小值反压：100px 视口 `Math.max(min, ceiling)` 给 60，主区只剩 40 | 公式复算 100/140/150/200 四档 | `ceiling < min` 时把 `min`/`max` 同压到 `viewport − mainFloor`，主区优先 |
| R7 | `AlbumScrollView.vue` 的 `if (cons)` 紧跟 `const cons = [...]`，恒真 | 静态阅读 | 删除包裹层 |

## 浏览器回归（1 轮，通过）

产物：`.tmp/browser-preflight/fix-review-e079a532-8259-4e2a-84ca-be22e5d7035d`，`python3 scripts/acceptance.py verify-browser` → `valid: true`、`status: passed`，runId `4f659f05-5dcf-406c-937d-54d24f03fe92`，roundId `60be5883-35c9-4729-966d-1e354b09ef34`。脚本 `.tmp/round-fix-review-findings.mjs`，desktop profile 1200×900、`?pageTotal=252`、`timeoutMs 50000`。

实测数值：

- 初始布局 side 150 / main 1050，`dock-workspace slot-left`。
- 网格五档（1600/1200/1023/768/390）：`gapSpread` 全为 0，`horizontalOverflowPx` 全为 0；列数 5/5/3/3/3；首行 x 分别为 `216,348,480,612,744`、`41,173,305,437,569`、`29,159`、`29,159`、`1,131`；最右列 `overflowRightPx` 为 `-537/-487/-600/-345/-9`。
- 拖拽覆盖层：三个 `.drop-zone`，`slot` 为 `left,right,bottom`，文案 `停靠左侧/停靠右侧/停靠底部`，当前槽位带 `active`。
- 重钳制：`side 520 / main 680` → 视口改 390×844 后 `side 156 / main 234`（等于 `390 − min(320, 234)` 的上限）。
- 截图 2 张（`grid-wide.png`、`drop-overlay.png`，`visualReview` 字段为 `unrun`，由主会话人工读图）：宽屏弹层为 5 列均匀网格、首项绿色高亮、末行不满但左对齐、底部分页器 `1 2`；停靠覆盖层左/右/底三区虚线框与文案齐全。

## 命令校验

| 命令 | 结果 | 日志 |
| --- | --- | --- |
| `npm run type-check` | exit 0 | `.tmp/fix-review-type-check.log` |
| `node --test tests/layout-model.test.cjs` | 7/7 pass，exit 0 | `.tmp/fix-review-layout-test.log` |
| `node .tmp/extreme-viewport-check.cjs` | exit 0（100→{40,40}/60，140→{56,56}/84，150→{60,60}/90，200→{60,80}/120，390→{60,156}/234，1200→{60,520}/320） | `.tmp/extreme-viewport-check.log` |
| `.tmp/fix-review-registry-check.sh` | `RESULT: OK`，exit 0 | `.tmp/fix-review-registry-check.log` |
| `npm run check` | exit 0（type-check + test + build-prod + check:docs） | `.tmp/fix-review-check.log` |
| `npm run check:docs` | `check-docs: OK` | 同上 |

## 文档同步

- `.trellis/spec/frontend/features/001-dockable-panel-layout/data-model.md`：`LayoutBlock` 用 `sizeRange` + `slotSizeRanges` 描述尺寸范围并补校验规则；`SplitBoundary` 补「极端窄视口下停靠块让步」与「视口变化必须重钳制」两条。
- `.trellis/spec/frontend/features/001-thumb-expand-modal/spec.md`：Assumptions 补「跳转后短暂锁定目标页，用户主动滚动即解除」。

## 未覆盖与说明

- 浏览器回归只跑了 1 轮 desktop profile 的专项轮；历史轮次（dockable 桌面/移动、thumb-expand 桌面/移动/单分段/加载失败）在本轮改动后重跑通过，产物见各任务 validation.md，未在本任务重复登记。
- `390` 视口的网格采样在桌面 profile 下通过 `Emulation.setDeviceMetricsOverride` 完成，未使用移动 profile 的触摸与视口 meta 差异；窄屏列数规则本身与 profile 无关，但触摸滚动与旋转后的触摸手势未在本轮复测。
- R5 重钳制只在 `viewportWidth`/`viewportHeight` 变化时触发；若将来引入别的尺寸来源（如容器自身变化），需另行接线。
