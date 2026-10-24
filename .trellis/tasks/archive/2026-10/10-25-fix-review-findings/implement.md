# 执行计划

## S1 加载器预算口径（D1 + D5）

1. `core/components/composables/usePageImageLoader.ts`：`isAutoRetryExhausted` 全量改名为 `isRetryBudgetClosed`（声明、`loadImgSrc`、`runAutoRetryQueue` 的 `finally`、`getNewImgSrc` 入口、`failLoad`、`loaded`、返回值解构不需要改——它不在返回对象里）。
2. `tests/use-page-image-loader.test.cjs` 第三条用例改名为 `a successful load restores the full retry budget, and a manual refresh restores it again`，断言改为表达「预算 - 1 次补试」：
   - 首次 `loadImgSrc` + 耗尽 → 3 次；
   - `loaded()` 后再失败 → 新增 2 次（`3 + 2 = 5`），并断言新增数等于「预算 - 1」；
   - `getNewImgSrc(Default)` 成功后再失败 → 新增 3 次（`5 + 3 = 8`）；
   - 再失败不再新增。

## S2 下载单测用真实 i18n 词条（D2）

`tests/download-metadata.test.cjs`：

1. 去掉 `['../store/i18n', { i18n: { value: { downloadFetching: '…' } } }]` 这个 stub。
2. 在 `realModules` 里加 `core/assets/i18n.ts`，用 `createRuntime({ stubs: new Map([...]), realModules: [...] })` 加载后取 `default.cn` 组出 `{ value: dict }`，再作为 stub 传回——由于 `createRuntime` 只能一次，改为先建一个小 runtime 读词条，再用第二个 runtime 跑下载服务。
3. 断言消息时用 `dict.downloadFetching.replace('{{current}}', …).replace('{{total}}', …)` 从真实模板生成期望值，而不是硬编码中文。

## S3 去重复推送（D3）

`core/service/GalleryDownloadService.ts` 的 `runWorker`：

1. 删除抓取前那次 `options.onStatus({ phase: 'fetching', … })`。
2. 保留 `processedPages += 1` 之后的推送。
3. `tests/download-metadata.test.cjs` 的进度断言：`progress.length >= 10` 改为 `progress.length >= 5`，并新增「每个 `processedPages` 值只出现一次」的断言。

## S4 策略表副本 + 删死防御（D4）

`core/service/imageRetryPolicy.ts`：

1. `getImageRetryStages` 返回 `stages.map(stage => ({ ...stage }))`。
2. `buildRetryQueueAfterFailure` 里 `const retriesForCurrentStage = Math.max(failedStage.attempts - 1, 0)` 改为 `const retriesForCurrentStage = failedStage.attempts - 1`。
3. `tests/image-retry-policy.test.cjs` 增加一条用例：修改 `getImageRetryStages(...)` 返回数组的 `attempts` 后再次调用，内容不变。

## S5 归档记录口径（D6）

1. `.trellis/tasks/archive/2026-10/10-24-download-concurrency-spec-alignment/prd.md` AC3 改写。
2. 同目录 `acceptance.json` 的 `spec-concurrency-wording.note` 补改名偏离说明；把 `processedPages` 的 evidence 指向 `4d5b898`。
3. 同目录 `prd.md` 的 Out of Scope Risk 段落（若存在「不重命名 currentPage」的原文）改成已发生事实的说明。
4. `.trellis/tasks/archive/2026-10/10-25-fix-image-retry-exhaustion/prd.md` AC3 按尝试次数改写。
5. 同目录 `verification.md` 的 `## 未覆盖` 与新增 `## 已知范围蔓延`（或合并进现有章节）写明 `package.json` 脚本注册与 `.tmp` 证据。

## S6 回归与验收

1. `npm run type-check`。
2. `npm run test:image-retry-policy`、`npm run test:use-page-image-loader`、`npm run test:download-metadata`、`npm run test:download-time`。
3. `npm test`（覆盖 Lua 侧 `scripts/test_cleanup_browser.py` 等）。
4. `npm run check`（含 build-prod 与 check:docs）。
5. 浏览器验收：`ego-browser nodejs < .tmp/round-download-concurrency.mjs`（desktop）——脚本里 `labelled.length >= 5` 与 `counts` 单调断言需要复核是否受 S3 影响；必要时改脚本下限并重跑，再 `verify-browser`。
6. 归档任务口径改动后重跑 `python3 scripts/acceptance.py summarize <archive-dir>`，确认仍为 passed。

## S7 收口

1. 写 `verification.md`（变更清单、检查、浏览器轮次、未覆盖）。
2. 写 `acceptance.json` 并 `python3 scripts/acceptance.py summarize .trellis/tasks/10-25-fix-review-findings`。
3. 提交：`fix(core): 预算标志更名并去掉重复的进度推送`、`test: 下载单测改用真实 i18n 词条`、`docs(spec): 归档记录对齐字段改名与预算口径`。
4. `python3 .trellis/scripts/task.py archive .trellis/tasks/10-25-fix-review-findings`。

## 验证命令汇总

```bash
npm run type-check
npm run test:image-retry-policy
npm run test:use-page-image-loader
npm run test:download-metadata
npm test
npm run check
ego-browser nodejs < .tmp/round-download-concurrency.mjs
python3 scripts/acceptance.py verify-browser <artifact-dir>
python3 scripts/acceptance.py summarize .trellis/tasks/10-25-fix-review-findings
```

## 不做

- 不重回 NH/EH 真机轮次（图片重试行为不变，只改命名与断言表达）。
- 不改 `.trellis/spec/` 下已对齐的并发与重试文本。
- 不为 `.tmp` 证据补可复现脚本副本。
