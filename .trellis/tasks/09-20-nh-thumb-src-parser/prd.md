# 修复 NH 缩略图地址解析（T149）并完成 T113 验收

## Goal

恢复 nhentai 图集的缩略图显示：侧栏缩略图、缩略图展开面板、页面预览三处同时恢复，并在真实 NH 图集完成双视口验收。

## Requirements

- **R1**：`src/platform/nh/parser/IntroHtmlParser.ts` 对两类 HTML 输入都必须产出非空缩略图地址——当前 NH 页面（缩略图用原生 `src`）与旧格式页面（缩略图用 `data-src`）。判定：解析结果中每个 `ThumbInfo.src` 非空。
- **R2**：真实 NH 图集验收（历史 T113）——逐张确认 `img.complete && img.naturalWidth > 0` 且图片实际可见；覆盖书页/卷轴切换、缩略图点击跳页与当前页定位；桌面 1200×900 与移动 390×844 双视口；记录控制台输出、未捕获异常与截图。
- **R3**：不改变 `ThumbInfo` 数据结构、`AlbumService` 接口、调用链或缓存语义；不改动 EH 侧解析器。
- **R4**：`src/platform/nh/parser/ImgHtmlParser.ts:38` 的 `x-src` 单属性读取须给出**基于真实 NH 图片页证据**的结论：确认无缺陷则记录证据并保持不动，确认同类缺陷则一并修复。

## Acceptance Criteria

- [x] 两种输入均验证：真实 NH 页面 HTML（实时 DOM 与原始抓取各一遍）45/45 非空、构造 `data-src` 3/3、双属性并存 3/3 取 `data-src`；载具 `.tmp/nh-thumb-src-parser/harness.ts`（其 `real-page-html` 谓词曾把真实主机 `t1–t4.nhentai.net` 误判为失败，已改为 `.nhentai.net/` 匹配，解析数据未变）。
- [x] 真实 NH 图集（`nhentai.net/g/631366/1/`，45 页）：侧栏、展开面板、页面预览三处均 45/45 真实加载（`complete && naturalWidth>0`，空 `src` 0）。
- [x] 书页/卷轴切换正常；书页模式桌面点第 12 张定位 `12 / 45`、移动点第 15 张定位 `15 / 45`，滚动模式桌面点第 25 张定位 `25 / 45`。
- [x] 桌面 1200×900 与移动 390×844 完成关键交互与 12 张截图；eHunter 无新增报错与未捕获异常（原站异常与 NH 429 已单独归因，见报告 §3.2）。
- [x] `npm run build-prod` 退出码 0，`dist/ehunter.iife.js` 445524 字节（sha256 `4adcb273…a52ab17`），验收页面加载的即该产物。
- [x] R4：`nhentai.net/g/631366/1/` 原始 HTML 的 `#image-container img` 只有 `src="https://i3.nhentai.net/galleries/3799533/1.webp"`、全页 `data-src=` 0 次，判定无同类缺陷，`ImgHtmlParser.ts:38` 保持不动。
- [x] 未验证范围已列出：EH 侧回归、真实旧格式 NH 页面、其他 NH URL 形态、移动顶栏切换阅读模式、429 长期行为（报告 §七）。

## Out of Scope

- EH 平台解析器与缩略图链路。
- `AlbumCacheService`、请求队列、初始化超时的调整。
- 缩略图 UI 组件（`ThumbView.vue`、`ThumbScrollView.vue`、`ThumbExpandDialog.vue`、`PageView.vue`）的样式或布局改动。
- NH 图集导航类缺陷（T148 范围）。

## Notes

- 证据：`.tmp/nh-thumb-diagnosis.md`（2026-09-19，源码 887c30e，页面 `nhentai.net/g/631366`，45 页）。HEAD 之后仅两个纯文档提交，结论仍适用。
- 缺陷根因、修复方案与风险见同目录 `design.md`；执行清单见 `implement.md`。
- 父任务：`.trellis/tasks/09-20-backlog-nh-thumb-and-typecheck`。
