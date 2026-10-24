# 验证记录

## 变更

| 发现 | 位置 | 改动 |
| --- | --- | --- |
| Standards-1 + Spec AC3 | `tests/use-page-image-loader.test.cjs:113` | 用例改名为 `a successful load restores the full retry budget, and a manual refresh restores it again`，断言改为「尝试次数」口径：`loaded()` 后新增 `budget - 1` 次、`getNewImgSrc` 后新增 `budget - 1` 次、耗尽后不再增长 |
| Spec AC3 口径 | `.trellis/tasks/archive/2026-10/10-25-fix-image-retry-exhaustion/prd.md`、`acceptance.json` | AC3 改为「以尝试次数计，失败的那次加载本身算新预算的第 1 次，随后重试预算 - 1 次」 |
| Standards-2 | `tests/download-metadata.test.cjs:12` | 新增 `loadI18nTable()` 从真实 `core/assets/i18n.ts` 取 cn 词条；新增 `download progress template keeps both placeholders in every language`；进度用例的期望文案由真实模板替换占位符生成 |
| 判断题-重复推送 | `core/service/GalleryDownloadService.ts:496` | 删除抓取前那次 `phase: 'fetching'` 推送，每页只保留 `processedPages += 1` 之后的一条（`:511`-`:518`） |
| 判断题-返回引用 | `core/service/imageRetryPolicy.ts:27` | `getImageRetryStages` 返回 `stages.map(stage => ({ ...stage }))` 副本 |
| 判断题-死防御 | `core/service/imageRetryPolicy.ts:42` | `Math.max(failedStage.attempts - 1, 0)` → `failedStage.attempts - 1` |
| 判断题-布尔双语义 | `core/components/composables/usePageImageLoader.ts:33` | `isAutoRetryExhausted` → `isRetryBudgetClosed`，共 6 处（`:33`、`:65`、`:101`、`:109`、`:148`、`:161`） |
| Spec-越界 | `.trellis/tasks/archive/2026-10/10-24-download-concurrency-spec-alignment/prd.md` | 原 `## Out of Scope Risk` 改为 `## 偏离原决策`，记录 `currentPage` → `processedPages` 的改名与理由；AC3 措辞对齐实现 |
| Spec-AC 措辞 | 同上 `acceptance.json` | `criteria.AC3` 同步；`spec-concurrency-wording.note` 追加偏离说明 |
| 判断题-文档引用口径 | `.trellis/tasks/archive/2026-10/10-25-fix-image-retry-exhaustion/verification.md` | 新增 `## 证据口径`：`.tmp/` 被忽略不可复现、`package.json` 脚本注册属必要范围蔓延 |

## 检查

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 类型 | `npm run type-check` | exit 0 |
| 重试策略 | `npm run test:image-retry-policy` | 3 passed |
| 加载器预算 | `npm run test:use-page-image-loader` | 3 passed |
| 下载元数据与进度 | `npm run test:download-metadata` | 4 passed |
| 全量 | `npm run check` | exit 0（含 `build-prod` 443.13 kB 与 `check-docs: 39 md, 220 本地链接, 0 断链`） |
| 归档 `10-24` 验收 | `python3 scripts/acceptance.py summarize ...` | `valid: true` / `passed: 8` |
| 归档 `10-25` 验收 | 同上 | `valid: true` / `passed: 6` |

**断言有效性**（负向验证，已执行）：把 `core/assets/i18n.ts` 的 cn 模板改成 `已完成 {{done}}/{{total}} 张图片` 后，
`npm run test:download-metadata` 报 `AssertionError: cn template lost {{current}}: 已完成 {{done}}/{{total}} 张图片`；
用备份还原后恢复 4 passed。修复前实现下 `tests/use-page-image-loader.test.cjs` 三条全部失败（上一任务已记录）。

## 浏览器验收（本地 Vite，TEST 平台）

`npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`，Vite 监听 PID **78659**（npm wrapper 78641），
证据 `.tmp/vite-service-evidence.json`。两轮 `withBrowserPreflight`：

| profile | artifact | observed | verify-browser |
| --- | --- | --- | --- |
| desktop（1200×900） | `.tmp/browser-preflight/download-concurrency-desktop-cb853ae2-291a-4f43-882a-7b8adab8028f` | passed / checks executed / preparation verified | exit 0 passed |
| mobile（390×844） | `.tmp/browser-preflight/download-concurrency-mobile-18eca3a5-97a3-4482-8205-fcd6098337f1` | passed / checks executed / preparation verified | exit 0 passed |

两轮 `progress-monotonic` receipt：

- desktop：`sampleCount 275`、`fetchingSamples 103`、`distinctCounts [1,2,3,4,5]`、`lastCount 5`、`maxInflight 3`、`fetchedOrder [2,3,1,4,5,6]`、`finalCounter 6 / 6`、`finalMessage 下载完成`
- mobile：`sampleCount 275`、`fetchingSamples 104`、`distinctCounts [1,2,3,4,5]`、`lastCount 5`、`maxInflight 3`、`fetchedOrder [2,3,1,4,5,6]`、`finalCounter 6 / 6`

两轮 ZIP 产物一致：`title_part-01-of-02.zip` 719429 B `[metadata.json, 0001.jpg, 0002.jpg, 0003.jpg]`、
`title_part-02-of-02.zip` 620420 B `[metadata.json, 0004.jpg, 0005.jpg, 0006.jpg]`，六张图均 `jpegMagic: true`，
metadata 七字段齐全且 `chunkIndex` 分别为 1、2。

去重推送后的实测：`fetchingSamples` 从上一轮的 188（每条消息重复两次）降到 103/104，
`distinctCounts` 仍是 `[1,2,3,4,5]`——每页恰好一条 `fetching` 事件，`6/6` 由终态 `completed` 事件承担。
主会话已查看 `download-notification.png`：右下角通知 `title` / `下载完成` / `6 / 6`，进度条满格。

## 未覆盖

- 未重跑 EH/NH 生产包的换源预算轮次：本轮改动只涉及事件条数、策略表副本、标志改名与测试口径，
  预算行为已由 `npm run test:use-page-image-loader` 与上一任务的 NH 轮（`.tmp/browser-preflight/retry-budget-nh-*`、
  `retry-budget-eh-*`）覆盖。
- `firstCounts` 采样首尾没有出现 `6`，因为最后一个 worker 的 `fetching` 事件与 `completed` 事件之间没有 10 ms 采样窗口；
  终态计数由 `finalCounter` 断言。这是采样时序，不是产品缺口。

## 已知观察（不在本任务范围）

- `core/service/imageRetryPolicy.ts` 的阶段表数值未变（NH 单段 3 次、EH 三段各 2 次），属当前产品决策。
- `.tmp/` 下的全部证据被 `.gitignore` 忽略，克隆仓库后不可复现。
