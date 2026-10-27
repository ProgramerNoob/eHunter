# 验收结果：001-dockable-panel-layout

环境：本地 Vite `http://127.0.0.1:5173`（TEST 服务，`?pageTotal=120`），`ego-browser` + `scripts/browser-preflight.mjs`。
分支 `master`，本轮未修改产品代码。服务信息：`npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`
（npm parent PID 79726 / vite listener PID 79744，证据 `.tmp/dockable-panel-service-evidence.json`），
执行日期 2026-10-27。

## 轮次

| 轮次 | profile | 产物 | verify-browser |
| --- | --- | --- | --- |
| 吸附/缩放/回归 | desktop 1200×900 DPR1 | `.tmp/browser-preflight/dockable-desktop-586dd0a5-c567-48bd-bab3-b83fd3b48873` | passed |
| 触摸手势/回归 | mobile 390×844 DPR3 touch5 | `.tmp/browser-preflight/dockable-mobile-final-e19c7c9b-3e3e-456b-b1be-3396bfd44da4` | passed |
| 触摸停靠（D1 回归） | mobile 390×844 DPR3 touch5 | `.tmp/browser-preflight/dockable-touch-dock-372cd38d-88de-483d-981e-ab94e19dac4b` | passed |
| 触摸放大上限（D2 回归） | mobile 390×844 DPR3 touch5 | `.tmp/browser-preflight/dockable-mobile-maxdrag-215af20c-f060-4a14-865b-d8d2d9f7d010` | passed |
| 按模式持久化 + 刷新 | desktop 1200×900 DPR1 | `.tmp/browser-preflight/dockable-refresh-41cdba5c-d9eb-4645-ae76-97efd24f71a4` | passed |

检查汇总：9 passed / 0 failed / 0 partial（`python3 scripts/acceptance.py summarize .trellis/tasks/10-25-dockable-panel-acceptance` 退出码 0）。
首轮验收的失败轮 `dockable-touch-dock-23feb3b7-a759-4a60-b574-2be577c3bc77` 与
`dockable-mobile-maxdrag-fb1a48bd-d753-4d43-88e1-c0538479cc1f` 保留在 `.tmp/browser-preflight/` 作为缺陷取证。

## 通过项

- 桌面吸附：左→右（`slot-right`，侧栏 `{x1050,w150}`、主面板 x=0 无重叠、存储 `scroll.thumbSlot=right/150`）、
  右→底（`slot-bottom`，`{x0,y750,w1200,h150}`、主面板 `{w1200,h750}`）；拖到视口中心释放后仍停在当前槽位，
  唯一 active 落点指向底部，`thumbSlot`/`thumbSizePx` 不变（仅 `updatedAt` 刷新）。
- 桌面缩放：hover 时 grip `rgba(46,204,113,0.16)` + `.main-panel.resizing`，离开恢复 `rgba(0,0,0,0)`；
  侧边 150→320 实时跟随，拖到右缘钳制 520（主面板 680）、拖到左缘钳制 60（主面板 1140）；
  底边 60→200，上限钳制 420（主面板 480）、下限钳制 60（主面板 840）；主内容区始终 >0。
- 按模式持久化：scroll 存 `bottom/222`、book 存 `right/333` 互不影响；刷新后直接落在书页 `right/333`，
  切滚动恢复 `bottom/222`，再切回书页仍 `right/333`。
- 回归：桌面滚轮 scrollTop 0→900、图片 4→5、进度 1/120→2/120，书页点击 2/120→4/120 且分页控件可见；
  移动触摸上滑 scrollTop 0→188、图片 4→6、进度 1/120→3/120，点击书页 3/120→4/120。
- 触摸停靠：`touch-action: none` 生效，长按 800ms 后拖拽事件为
  `pointerdown → pointermove ×3 → pointerup`（无 pointercancel），松手切到 `slot-right` 并写入 `book.thumbSlot=right`。
- 触摸缩放：短按不触发，长按 750ms 后拖动 150→60 并钳制，存储写入 `thumbSizePx:60`；
  拖到 390 宽视口右缘钳制侧栏 156 / 主面板 234（= `min(320, 390×0.6)`）。
- 依赖无第三方 UI 组件库；`npm run type-check` 退出码 0。

## 首轮缺陷与修复回归

首轮记录 D1–D3，修复落在 `10-26-fix-acceptance-defects` 与 `10-26-fix-review-findings`，本轮用修复后产物重跑全部轮次回归。

### D1 触摸设备无法长按拖拽停靠 → 已修复

`core/components/layout/DockHandle.vue` 的 `.dock-handle` 现声明 `touch-action: none`。回归轮 `dockable-touch-dock` 实测
computed `touchAction "none"`，长按后拖拽事件为
`pointerdown{x75,y20} → pointermove{200,200} → pointermove{330,400} → pointermove{382,500} → pointerup{382,500}`，
无 pointercancel，松手后 `slot "right"`、侧栏 `{x240,y0,w150,h844}`、存储 `book.thumbSlot "right"`。

### D2 侧栏放大无主内容保底，可把阅读区压到 1px → 已修复

`core/model/layout.ts` 引入 `mainSizeFloorRatio = 0.6` 与 `computeMainMinSizePx`，
`getThumbSizeRange(slot, viewportPx)` 按视口降级上限。回归轮 `dockable-mobile-maxdrag` 在 390×844
拖到右缘得侧栏 156 / 主面板 234（`min(320, 390×0.6)`），主内容区始终可见；桌面 1200×900
上限仍为侧栏 520 / 主面板 680、底栏 420 / 主面板 480。

### D3 block registry 未接线 → 已修复

`core/model/layout.ts` 提供 `getLayoutBlock`（:88）、`getBlockSizeRange`（:92）、`getDockAllowedSlots`（:101）、
`getDockLongPressMs`（:106）、`computeMainMinSizePx`（:111）、`getThumbSizeRange`（:117）、`clampThumbSize`（:131），
全部从 `layoutBlockRegistry` 取元数据。消费点：`core/components/layout/DockWorkspace.vue:47,57,70`、
`core/components/layout/DockHandle.vue:19,28`、`core/components/layout/SplitHandle.vue:19,25`；
`core/components/ReaderView.vue` 已删除写死的 `:long-press-ms="500"`；`core/store/app.ts` 的 `clampThumbSize`
调用均传入视口尺寸。静态复核脚本 `.tmp/fix-defects-registry-check.sh` 输出 `RESULT: OK`。

## 复跑说明

- 首轮修复后产物在 `verify-browser` 下全部报 `stale`（`core/`、`package.json`、`vite.config*.ts` 与各
  `.tmp/round-*.mjs` 场景脚本在产物生成后又有改动），因此按仓库流程重跑全部轮次，仅采用重跑产物作为证据。
- 桌面轮底栏最小值的断言改为轮询等待过渡稳定（`.thumb-panel` 有 `transition: height 0.28s`）。
  首轮脚本固定等待 800ms 采样会落在过渡中段（读 129 / 112），settle 后稳定为 `h 60`（`minTrail [60,60,60]`）。
- 归档前重录了范围基线：任务原有基线停在 2026-10-25 的 `01938b1`，此后 20 个并发任务的提交改动了 131 个路径，
  全部落进门禁的比较窗口，导致 `task.py archive` 报 `131 changed path(s) fall outside meta.scope`。
  按[任务改动范围门禁](../../../spec/tooling/task-scope-gate.md)的指引（`set-meta scope` 后重新 `start`）重录基线，
  scope 仍只覆盖本任务目录；本任务自身只改动了 `acceptance.json` 与 `validation.md`。
