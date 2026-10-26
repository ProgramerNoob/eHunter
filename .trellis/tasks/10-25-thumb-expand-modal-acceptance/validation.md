# thumb-expand-modal 验收记录

执行日期：2026-10-25
分支：master（quickstart 中的 `Active branch: 001-thumb-expand-modal` 为历史描述）
服务：`npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`（PID 49976，证据 `.tmp/dockable-panel-service-evidence.json`）
口径：只验收，不改产品代码；发现缺陷只记录。

## 轮次

| 轮次 | profile | artifactDir | verify-browser |
| --- | --- | --- | --- |
| 主轮-桌面 | desktop 1200×900 DPR1 | `.tmp/browser-preflight/thumb-expand-desktop-ed8dd46c-7bdd-4168-86c7-136cde405880` | passed |
| 主轮-移动 | mobile 390×844 DPR3 touch5 | `.tmp/browser-preflight/thumb-expand-mobile-88102891-bf95-43ca-97af-4caf0d0c559f` | passed |
| 单分段边界 | desktop 1200×900（`?pageTotal=80`） | `.tmp/browser-preflight/thumb-expand-single-913cf1d7-3179-448a-a390-56bcf80c0393` | passed |
| 缩略图加载失败 | desktop 1200×900（`?pageTotal=120`，拦截 `*2195608-0*.jpg*`、`*2195608-1*.jpg*`） | `.tmp/browser-preflight/thumb-expand-loadfail-ac73170e-5ec8-43b6-a5ea-7b905fb09501` | passed |

失败与无效轮次（保留证据）：`.tmp/browser-preflight/thumb-expand-desktop-2c09817f…` 等早期脚本迭代轮；`thumb-expand-mobile-58dd2fd1…` 与 `thumb-expand-mobile-88102891…` 为同脚本前后两版（前者截图被说明弹窗遮挡，后者修复后重跑）。

## 通过项

- 侧边吸附入口锚定：`panel {x1050,w150}`，`trigger {x1109,y860,w32,h32}`，列表滚动 `scrollTop 0→8515` 后入口位置不变。
- 底部吸附入口锚定：`panel {x0,y750,w1200,h150}`，`trigger {x1160,y809}`，`triggerClass "thumb-expand-trigger dock-bottom"`，横向 `scrollW 11740 / clientW 1200`。
- 弹层无标题：`headings: []`。
- 每项含图片与底边页码：`spriteCount 200`、`labelsOnBottom true`、`labelsContiguous true`、`duplicateLabels false`。
- 首屏行数：所有档位 `rowsVisible 4`。
- 窄屏 3 列：390 宽 `columns 3`、`horizontalOverflow 0`、`panel {y:-1,h:846}`、`panelRadius 0px`。
- 分段与默认定位：`?pageTotal=250` 在第三卷（`201 / 250`）打开弹层 → `itemCount 50`、`firstLabel 201`、`lastLabel 250`、`pagerItems ['1','2']`、`pagerActive ['2']`、`activePage 201`。
- 单分段：`?pageTotal=80` → `itemCount 80`、`pagerItems ['1']`、`pagerActive ['1']`、分页器可见，前后箭头为 `item disable`（`cursor: not-allowed`）。
- 缩略图加载失败：`Network.setBlockedURLs` 后 123 个 `.jpg` 请求全部 `transferSize 0`，弹层 `itemCount 120`、全部项仍有页码（截图 `.tmp/browser-preflight/thumb-expand-loadfail-ac73170e…/broken-thumbnails.png`），点击第 5 项 → 弹层关闭并落到 `5 / 120`。
- 末行不满整行：`columns 8`、`rowsVisibleCounts [8,8,8,2]`、`lastRowLefts [41,184]` 与首行左边界对齐，无重复页码。
- 跳转后两模式阅读正常：滚动 `249 / 250` → 书页 `249 / 250`（有图）→ 点击 `250 / 250` → 回滚动仍 `250 / 250`。
- 窄屏滚动与关闭：移动端网格滚动、`×` 关闭、点击遮罩关闭均正常。
- 依赖无第三方 UI 组件库：`.tmp/thumb-expand-deps-check.py` exit 0（`.tmp/thumb-expand-deps-check.log`）。
- `npm run type-check` exit 0（`.tmp/thumb-expand-type-check.log`）。
- 四份产物 `verify-browser` 全部 `status: passed`（`.tmp/thumb-expand-verify-browser.log`，exit 0）。

## 缺陷（不改产品代码，仅记录）

**D4 宽视口列数不受控，违反 FR-004 / FR-005**
`core/components/dialog/ThumbExpandDialog.vue` 的 `.grid-wrap { grid-template-columns: repeat(auto-fit, minmax(120px, 120px)) }` 没有列数上限，`.panel { width: min(1200px, 100%) }`（xxl 断点 `min(1400px, 100%)`），所以视口越宽列数越多。实测逐档：1600→10、1440→8、1280→8、1200→8、1024→7、900→6、768→5、640→4、480→3、390→3；1200 宽下 `template "120px ×8"`、`rowsVisibleCounts [8,8,8,8]`。规范要求宽屏每行最多 5 项、5 列时首屏至少 4 行，当前未达成。

**D5 分段大小与规范不一致：实现 200 页，规范写 100 页**
`core/model/thumbExpand.ts` 的 `thumbExpandSegmentSize = 200`（`getThumbExpandSegmentCount = ceil(pageCount/200)`、`getThumbExpandSegmentByPage = floor(pageIndex/200)`），而 quickstart/spec/data-model 通篇写「每 100 页分段」，`ThumbnailSegment.segmentSize` 也标注恒等 100。实测 `?pageTotal=250` 只有 2 段（`pagerItems ['1','2']`），若按规范应为 3 段。

**D6 跳转后位置被卷镜像元素改写（桌面）**
`core/components/AlbumScrollView.vue` 的 `scrollToCurIndex()` 用 `pageContainers.value[computedVolIndex.value]` 按数组下标取元素，而切卷后该 ref 数组顺序变成倒序（`["250","249","248","247","246",…, "203","202","201"]`，DOM 顺序仍是正序）。点弹层页码 204（第三卷）时取到镜像元素 247 → `scrollTo(offsetTop - 100, 800)` → 落到 247，反算出 `247 / 250`。对照实验：手动 `pageContainers.value.sort((a,b) => a.offsetTop - b.offsetTop)` 复位后再点 204 得 `204 / 250`。影响面覆盖所有走 `scrollToCurIndex()` 的路径（键盘翻页、滚轮反算、缩略图点击、弹层跳转）。同类现象在窄屏表现为差 1 页（点 3 落到 `4 / 250`）。

**D7 窄屏面板高出视口 2px**
390×844 下 `.panel {y:-1,h:846}`，`bottom 845`，超出视口 1px。可见影响轻微（分页器仍在 `y800..828` 内），但属 `min-height: min(80vh, 760px)` 与全屏覆盖叠加的结果。

## 与规范的其它偏差

- `core/model/layout.ts` 的 `thumbExpandWideBreakpoint = 1600`、`thumbExpandItemWidthWide = 150`、`thumbExpandItemWidthNormal = 120`、`thumbExpandItemPadding = 8` 全仓库无消费方；对话框里是硬编码 `120px` / `206px` 与 media query。
- `.grid-wrap` 的 `min-height: 640px` 在窄屏（390×844，可视网格高约 760）不产生负面影响，但与 `.panel` 的 `max-height` 语义重复。
- 测试图集（`src/platform/test/AlbumService.ts`）全部使用 `ThumbMode.SPIRIT` 背景图，没有 `ThumbInfo` 缺失的路径，所以「缩略图失败」只能用请求拦截来构造。
