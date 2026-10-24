# 收口分支审查发现

## Goal

处理 `docs/download-concurrency-spec` 分支相对 `master`（合并基 `c0cae52`）独立审查提出的全部发现：两条硬违规（用例名与断言不符、i18n stub 写死中文）、四条判断项（重复推送、策略表共享引用、预算标志命名、归档证据口径）、三条规格缺口（10-24 改名未记偏离、10-24 AC3 措辞、10-25 AC3 未闭环），以及 `package.json` 脚本的范围蔓延记录。

## Background

审查范围是 9 个提交：下载并发规格对齐（`dfc1816`/`5b09b25`/`5d6bda2`）、规格收口（`4d5b898`/`77f5b4f`/`b375de8`）、图片重试预算修复（`df9d0a3`/`ea55501`/`8b168f6`）。基线 `npm run type-check`、`npm test`、`npm run check:docs` 均通过，问题集中在证据与口径，不是功能崩溃。

已确认的事实：

- `tests/use-page-image-loader.test.cjs` 第三条用例名为 `a successful load or a manual refresh restores the full retry budget`，断言却是 `loaded()` 之后共 5 次 `getImgSrc`。按「尝试次数」口径，触发失败的那次 `<img>` 加载本身消耗新预算的第 1 次，随后补 2 次重试即满额 3 次，因此 5 次调用正确、用例名与断言表达错位。
- `tests/download-metadata.test.cjs` 把 `../store/i18n` stub 成写死的中文串，`core/assets/i18n.ts` 的词条与占位符改动不会让测试失败。
- `core/service/GalleryDownloadService.ts` 在抓取前与抓取后各推一次 `phase: 'fetching'`，两处都取 `processedPages`，同一页面因此发两条完全相同的事件。
- `core/service/imageRetryPolicy.ts` 的 `getImageRetryStages` 直接返回模块级常量数组，调用方可污染全局策略；`buildRetryQueueAfterFailure` 的 `Math.max(failedStage.attempts - 1, 0)` 对现有两张表均为死防御。
- `core/components/composables/usePageImageLoader.ts` 的 `isAutoRetryExhausted` 同时承担「预算耗尽」与「预算封账」两种语义。

## Requirements

- R1 加载器单测的用例名与断言一致，且预算以「尝试次数」表达：NH 单段 3 次、EH 三段 6 次；成功加载后再次失败时，失败的那次加载计入新预算。
- R2 下载链路的完成计数单测读取真实 `core/assets/i18n.ts` 词条，词条改名、三语缺失或占位符缺失都会让测试失败。
- R3 每页只推送一条 `phase: 'fetching'` 事件，语义保持「已完成页数/总页数」且单调不减；压缩、完成、失败阶段的事件不变。
- R4 `getImageRetryStages` 返回的策略表是副本，外部修改不污染后续调用；移除死防御后策略语义不变。
- R5 预算标志改名为能同时表达「耗尽」与「封账」的名字，行为不变。
- R6 归档任务 `10-24-download-concurrency-spec-alignment` 的 AC3 措辞与 `acceptance.json` 记录与实现一致；`currentPage` → `processedPages` 的改名按「偏离 PRD 决策」显式记录原因。
- R7 归档任务 `10-25-fix-image-retry-exhaustion` 的 AC3 按尝试次数口径改写，`verification.md` 记录 `package.json` 脚本注册属必要范围蔓延，并说明 `.tmp/` 证据不可复现。
- R8 不改 `core/service/imageRetryPolicy.ts` 的阶段表数值、不改 NH/EH 的 `getImgSrc`、不新增配置项。

## Non-goals

- 不重构 `usePageImageLoader` 的队列机制，不引入 `remainingAttempts` 计数器。
- 不改下载分片、ZIP 命名、元信息字段。
- 不改 `.trellis/spec/` 里已对齐的并发与重试描述。

## Acceptance Criteria

- [AC1] 加载器三条单测的名称与断言一致，第三条用例以「尝试次数」表达「成功后预算恢复满额」，且三条全部通过。
- [AC2] 下载单测使用真实 i18n 词条模块；把 `downloadFetching` 的 `{{current}}` 占位符删掉会让测试失败。
- [AC3] `GalleryDownloadService` 每页只推送一条 fetching 事件，下载单测的进度断言与浏览器验收同时通过。
- [AC4] `getImageRetryStages` 返回副本：修改返回值后再调用，策略表内容不变；`tests/image-retry-policy.test.cjs` 通过。
- [AC5] 预算标志更名后三条加载器单测仍通过，行为与更名前一致。
- [AC6] 归档任务 `10-24-download-concurrency-spec-alignment` 的 AC3 措辞与实现一致，`acceptance.json` 记录了字段改名的偏离原因，`acceptance.py summarize` 仍为 passed。
- [AC7] 归档任务 `10-25-fix-image-retry-exhaustion` 的 AC3 按尝试次数改写，`verification.md` 含脚本范围蔓延与 `.tmp` 证据说明，`acceptance.py summarize` 仍为 passed。
- [AC8] `npm run check` 全绿（type-check、全部单测、build-prod、check:docs）。

## Notes

- 审查结论原文见本轮会话记录；实测数据：NH 单段 `[重载-2]`、EH 三段 `[重载-5]`、成功后复位后 NH 补 2 次 `getImgSrc`、EH 补 5 次。
- 归档产物路径：`.trellis/tasks/archive/2026-10/10-24-download-concurrency-spec-alignment/`、`.trellis/tasks/archive/2026-10/10-25-fix-image-retry-exhaustion/`。
