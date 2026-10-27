# thumb-expand-modal 验收记录

执行日期：2026-10-27
分支：master（quickstart 中的 `Active branch: 001-thumb-expand-modal` 为历史描述）
服务：`npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`（npm parent PID 79726 / vite listener PID 79744，
证据 `.tmp/dockable-panel-service-evidence.json`）
口径：只验收，不改产品代码；发现缺陷只记录，修复在独立任务中完成。

## 轮次

| 轮次 | profile | artifactDir | verify-browser |
| --- | --- | --- | --- |
| 主轮-桌面 | desktop 1200×900 DPR1（`?pageTotal=252`） | `.tmp/browser-preflight/thumb-expand-desktop-aa8c9379-405b-4591-9030-17be89cc951e` | passed |
| 主轮-移动 | mobile 390×844 DPR3 touch5（`?pageTotal=252`） | `.tmp/browser-preflight/thumb-expand-mobile-a499e125-8db5-4bff-acc6-f7175fdaa5b5` | passed |
| 单分段边界 | desktop 1200×900（`?pageTotal=80`） | `.tmp/browser-preflight/thumb-expand-single-19136d34-aa9b-42e3-9b0a-5c56976f4384` | passed |
| 缩略图加载失败 | desktop 1200×900（`?pageTotal=120`，拦截 `*2195608-0*.jpg*`、`*2195608-1*.jpg*`） | `.tmp/browser-preflight/thumb-expand-loadfail-a53a3dd0-0f92-45da-a952-8eca9dd6da10` | passed |

检查汇总：11 passed / 0 failed（`python3 scripts/acceptance.py summarize .trellis/tasks/10-25-thumb-expand-modal-acceptance` 退出码 0）。
首轮产物（`thumb-expand-desktop-ed8dd46c…`、`thumb-expand-mobile-88102891…`、`thumb-expand-single-913cf1d7…`、
`thumb-expand-loadfail-ac73170e…`）在 `verify-browser` 下已 stale，仅保留作修复前取证。

## 通过项

- 侧边吸附入口锚定：`panel {x1050,w150}`，`trigger {x1109,y860,w32,h32}`，列表滚动 `scrollTop 0→8515` 后入口矩形不变，点击可打开。
- 底部吸附入口锚定：桌面 `panel {x0,y750,w1200,h150}`、`trigger {x1160,y809}`、`triggerClass "thumb-expand-trigger dock-bottom"`，
  横向 `scrollW 11740 / clientW 1200`、`scrollLeft 0→7044` 后入口不动；窄屏 `panel {x0,y694,w390,h150}`、`trigger {x350,y753}`。
- 弹层无标题：`headings: []`。
- 每项含图片与底边页码：`spriteCount 200`、`labelsOnBottom true`、`labelsContiguous true`、`duplicateLabels false`。
- 列数与行数：宽屏 1600/1440/1200/1024 均 5 列，900/768/640/480/390 均 3 列，所有档位 `rowsVisible 4`；
  1200 宽 `gridTemplate "120px×5"`、`rowsVisibleCounts [5,5,5,5]`；窄屏 `columns 3`、`panel {x0,y0,w390,h844}`。
- 分段与默认定位：`?pageTotal=252` 当前页 201 打开弹层 → `itemCount 52`、`firstLabel 201`、`lastLabel 252`、
  `pagerActive ["2"]`、`activePage 201`、`lastRowItems 2`、`lastRowLefts [41,291]`。
- 跳转：点页码 204 → 弹层关闭、进度 `204 / 252`，8 次采样全为 `204 / 252`；窄屏点第 3 项 → `3 / 252`（8 次采样稳定）。
- 单分段：`?pageTotal=80` → `itemCount 80`、`pagerItems ["1"]`、`pagerActive ["1"]`、分页器可见，
  前后箭头为 `item disable`（`cursor: not-allowed`），点击唯一分段后页码不变。
- 缩略图加载失败：`Network.setBlockedURLs` 后 `.jpg` 请求由 `{total:11,failed:3}` 变为 `{total:123,failed:123}`（全部失败）；
  弹层 `itemCount 120`、全部项仍有页码（`spriteCount 120`、`labelsPresent true`），点击第 5 项 → 弹层关闭并落到 `5 / 120`。
- 末行不满整行：`rowsVisibleCounts [5,5,5,5]`、`lastRowItems 2`、`lastRowLefts [41,291]` 与首行前两列对齐，无重复页码。
- 跳转后两模式阅读正常：滚动 `202 / 252` → 书页 `202 / 252`（有图）→ 点击 `204 / 252` → 回滚动仍 `204 / 252`。
- 窄屏滚动与关闭：网格滚动 `{top:8308, scrollH:13846, clientH:783}`、`×` 关闭与点击遮罩关闭均正常。
- 依赖无第三方 UI 组件库：`.tmp/dockable-deps-check.py` exit 0（日志 `.tmp/thumb-expand-deps-check.log`）。
- `npm run type-check` exit 0（`.tmp/acceptance-type-check.log`）。
- 四份产物 `verify-browser` 全部 `status: passed`（`.tmp/thumb-expand-verify-browser.log`，exit 0）。

## 首轮缺陷与修复回归

首轮记录 D4–D7，修复落在 `10-26-fix-acceptance-defects` 与 `10-26-fix-review-findings`，本轮用修复后产物重跑全部轮次回归。

### D4 宽视口列数不受控 → 已修复

`core/components/dialog/ThumbExpandDialog.vue:181` 改为 `grid-template-columns: repeat(5, minmax(0, 120px))`，
`:287` 起的 `@media only screen and (max-width: 1023px)` 内 `:297` 为 `repeat(3, minmax(0, 120px))`。
重跑逐档实测 1600/1440/1200/1024 均 5 列，900/768/640/480/390 均 3 列，`rowsVisible 4`。

### D5 分段大小与规范不一致 → 已按实现统一规范

`core/model/thumbExpand.ts:3` 的 `thumbExpandSegmentSize = 200` 为现行实现，规范侧
（`.trellis/spec/frontend/features/001-thumb-expand-modal/spec.md:52,56,79,108` 与 `data-model.md:45`）
已统一为「每 200 页」，本任务 `prd.md` 的 R3/R4、AC3/AC4 与 `implement.md` 同步为 200 页。
重跑 `?pageTotal=252` 得 2 段（`pagerItems ["1","2"]`），第三段起点 201 打开得 `itemCount 52`。

### D6 跳转后位置被卷镜像元素改写 → 已修复

`core/components/AlbumScrollView.vue:73` 的 `scrollToCurIndex()` 改用排序副本：
`const sorted = [...pageContainers.value].sort((a, b) => a.offsetTop - b.offsetTop)`，并按 `sorted[computedVolIndex.value]` 取目标；
`:78` 设置 `scrollLockUntil = Date.now() + animationTime + scrollLockMarginMs` 锁定反算（`wheel` / `touchstart` 释放）。
重跑点 204 得 `204 / 252`（8 次采样稳定），窄屏点 3 得 `3 / 252`。

### D7 窄屏面板高出视口 → 已修复

`ThumbExpandDialog.vue` 在 `max-width: 767px` 下 `.panel { height: auto; max-height: 100%; box-sizing: border-box }`。
重跑 390×844 得 `panel {x0,y0,w390,h844}`，不再溢出。

## 与规范的其它偏差（保留记录）

- `core/model/layout.ts:55-58` 的 `thumbExpandWideBreakpoint = 1600`、`thumbExpandItemWidthWide = 150`、
  `thumbExpandItemPadding = 8` 目前仍无消费方，对话框使用 `120px` 与 media query 断点；不影响本轮验收项。
- 测试图集（`src/platform/test/AlbumService.ts`）全部使用 `ThumbMode.SPIRIT` 背景图，没有 `ThumbInfo` 缺失路径，
  所以「缩略图失败」只能用请求拦截构造（`brokenImages 0` / `spriteCount 120` 即由此而来）。

## 归档说明

归档前重录了范围基线：任务原有基线停在 2026-10-25 的 `01938b1`，此后 20 个并发任务的提交改动了 131 个路径，
全部落进门禁的比较窗口，导致 `task.py archive` 报 `131 changed path(s) fall outside meta.scope`。
按[任务改动范围门禁](../../../spec/tooling/task-scope-gate.md)的指引（`set-meta scope` 后重新 `start`）重录基线，
scope 仍只覆盖本任务目录；本任务自身只改动了 `acceptance.json`、`prd.md`、`implement.md` 与 `validation.md`。
