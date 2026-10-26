# 验收结果：001-dockable-panel-layout

环境：本地 Vite `http://127.0.0.1:5173`（TEST 服务，`?pageTotal=120`），`ego-browser` + `scripts/browser-preflight.mjs`。
分支 `master`，工作树干净，本轮未修改产品代码。

## 轮次

| 轮次 | profile | 产物 | verify-browser |
| --- | --- | --- | --- |
| 吸附/缩放/回归 | desktop 1200×900 DPR1 | `.tmp/browser-preflight/dockable-desktop-83ce4a3b-473d-4209-9e7c-18c284b9b172` | passed |
| 触摸手势/回归 | mobile 390×844 DPR3 touch5 | `.tmp/browser-preflight/dockable-mobile-final-6fdc7598-57a8-420e-9c95-47aeb77273e5` | passed |
| 按模式持久化 + 刷新 | desktop 1200×900 DPR1 | `.tmp/browser-preflight/dockable-refresh-73c06150-8ade-4ec1-ba07-c43e2b0236fc` | passed |
| 触摸停靠（失败取证） | mobile 390×844 DPR3 touch5 | `.tmp/browser-preflight/dockable-touch-dock-23feb3b7-a759-4a60-b574-2be577c3bc77` | blocked（observed failed） |
| 触摸放大上限（失败取证） | mobile 390×844 DPR3 touch5 | `.tmp/browser-preflight/dockable-mobile-maxdrag-fb1a48bd-d753-4d43-88e1-c0538479cc1f` | failed |

检查汇总：6 passed / 2 failed / 1 partial。

## 通过项

- 桌面吸附：左→右（`slot-right`，主面板 x=0 无重叠）、右→底（`slot-bottom`，全宽、主面板高 = 900 − 面板高）；拖到无效目标释放后只有一个 active 落点且仍指向当前槽位，`thumbSlot`/`thumbSizePx` 不变。
- 桌面缩放：hover 时 grip `rgba(46,204,113,0.16)` + `.main-panel.resizing`，离开恢复；侧边 150→320 实时跟随，钳制 60/520；底边 60→200，钳制 60/420；主内容区始终 >0。
- 按模式持久化：scroll 存 `bottom/222`、book 存 `right/333` 互不影响；刷新后各自恢复。
- 回归：桌面滚轮 scrollTop 0→900、书页点击翻页且分页控件可见；移动触摸上滑 scrollTop 0→188、点击翻页 1/120→4/120。
- 触摸缩放：短按不触发，长按 750ms 后用 `.split-handle .grip` 拖动 150→60 并钳制，存储写入 `thumbSizePx:60`。
- 依赖无第三方 UI 组件库；`npm run type-check` 退出码 0。

## 缺陷（未修复，仅记录）

### D1 触摸设备无法长按拖拽停靠

`core/components/layout/DockHandle.vue` 的 `.dock-handle` 未声明 `touch-action`（computed `auto`），浏览器把触摸拖拽判为页面滚动手势。取证：长按 800ms 后 `armed=true`、drop overlay 出现；第一个 `Input.dispatchTouchEvent` 的 `touchMove` 立即产生 `pointercancel`，overlay 消失、拖拽不提交、槽位与存储不变。事件序列 `pointerdown → pointermove → pointercancel`。
对照组：`SplitHandle.vue` 已声明 `touch-action: none`，同一手势下触摸缩放正常；给 `.dock-handle` 注入内联 `touch-action: none` 后，相同长按+拖拽可成功吸附到右侧，确认归因。

### D2 侧栏放大无主内容保底，可把阅读区压到 1px

mobile 390 宽视口下把分界线拖到右缘：侧栏 389px、`.main-panel` 仅 1px，未满足 AC2「主内容区始终可见」。`clampThumbSize` 固定上限 `sideMaxSizePx = 520`，与视口宽度无关，也没有 `main` 面板的最小尺寸保底（`layoutBlockRegistry` 里 `main.minSizePx = 320` 未被消费）。

### D3 block registry 未接线（检查项 failed）

`core/model/layout.ts` 的 `layoutBlockRegistry` 全仓库无消费方：`allowedSlots`/`minSizePx`/`maxSizePx` 不参与停靠与钳制；实际行为由 `clampThumbSize` 的硬编码常量和 `ReaderView.vue` 写死的 `:long-press-ms="500"` 决定。quickstart P3 要求的「block-registry 驱动、无缩略图专有分支」未达成。
