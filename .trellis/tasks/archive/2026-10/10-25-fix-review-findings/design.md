# 设计

## D1 预算口径按「尝试次数」而非「getImgSrc 调用数」

审查指出用例名撒谎：`loaded()` 之后断言 5 次调用，看起来不是满额。实际语义是：图片失败一次（消耗新预算第 1 次）之后补 2 次重试，合计 3 次尝试即满额。因此不改实现，改用例名与断言表达方式——显式断言「成功后新增的调用数 = 预算 - 1」，让满额关系在断言里可直接读出。

被否方案：改实现让成功后补满 3 次调用。这会让 NH 每次恢复多发一次网络请求，且与「同源自动重试 3 次」语义（3 次尝试含首取）冲突。

## D2 i18n 词条取自真实模块

`tests/download-metadata.test.cjs` 的 `../store/i18n` stub 改为从 `core/assets/i18n.ts` 载入真实词条表后取 `cn` 一列，语言固定 `cn`（运行时不依赖 `navigator`）。这样词条改名、三语缺列、占位符被改都会让断言失败。

被否方案：在测试里 stub `core/store/i18n.ts`。该模块在导入期读 `navigator.language`，VM 里没有 `navigator`，需要在夹具里伪造浏览器环境，成本高于收益。

## D3 每页一条 fetching 事件

`GalleryDownloadService` 的抓取前推送与抓取后推送携带同一份 `processedPages`/`failedPages`/`message`，属于重复事件。删除抓取前那一次，只保留页面处理完成后的一次，语义仍是「已完成页数/总页数」。

影响面：`queued` 事件仍保证触发后立即有通知；单测的进度条数断言从「每页 2 条」改为「每页 1 条」；浏览器验收脚本的 `labelled.length >= 5` 下限不受影响（6 页 → 6 条）。

## D4 策略表返回副本

`getImageRetryStages` 改为 `return stages.map(stage => ({ ...stage }))`，杜绝调用方改到模块级常量。同时删除 `buildRetryQueueAfterFailure` 里 `Math.max(failedStage.attempts - 1, 0)` 的死防御——两张表所有 `attempts` 都大于 0，`Math.max` 只是掩盖了「表里出现 0 次尝试」这种本来就该显式暴露的配置错误。

## D5 预算标志改名

`isAutoRetryExhausted` → `isRetryBudgetClosed`。它表达的既不是「队列空了」也不是「次数用尽」，而是「在本次成功/手动刷新之前，预算不再重开」，命名与注释保持一致；行为零变化。

## D6 归档记录按实现改写

两个归档任务的 PRD 是已交付文档，本轮只做口径对齐，不重跑功能：

- `10-24-download-concurrency-spec-alignment/prd.md` 的 AC3 从「最终值等于总页数减去不可恢复失败页数」改为与 `spec.md` FR-009 一致的「失败页也计入已完成，最终达到总页数」；`acceptance.json` 的 `spec-concurrency-wording` note 补「偏离 PRD 决策」说明：原 PRD 写明不重命名 `currentPage`，实际在 `4d5b898` 改名为 `processedPages`，原因是实现与 `contracts/gallery-download.openapi.yaml` 早已用 `processedPages`，保留旧字段名会让规格与契约自相矛盾。
- `10-25-fix-image-retry-exhaustion/prd.md` 的 AC3 按 D1 口径重写；`verification.md` 补两条说明：`package.json` 新增两个 test 脚本属必要范围蔓延（AC5 要求新增单测通过，不注册脚本 `npm run check` 就覆盖不到），`.tmp/` 证据受 `.gitignore` 忽略，archived 记录不可脱离本机复现。

## 回滚点

D1–D5 都是单文件级小改动，逐个提交即可回退；D6 只碰归档 Markdown 与 JSON，回退无风险。
