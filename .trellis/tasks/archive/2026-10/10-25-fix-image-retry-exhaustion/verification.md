# 验证记录

## 变更

- `core/components/composables/usePageImageLoader.ts`：`runAutoRetryQueue` 的 `finally` 在队列排空时封账（`isAutoRetryExhausted.value = true`）；`getNewImgSrc` 入口的 `isAutoRetryExhausted.value = false` 移入 `if (!isAutoRetry)` 分支，自动重试不再复位预算。
- 新增 `tests/use-page-image-loader.test.cjs`（3 条用例）；新增 `tests/image-retry-policy.test.cjs`（2 条用例，本任务前置产出的策略层断言）。
- `package.json`：新增 `test:image-retry-policy`、`test:use-page-image-loader` 并插入 `test` 链。

## 检查

- `npm run type-check` exit 0，日志 `.tmp/acceptance/10-25-fix-image-retry-exhaustion/type-check.log`。
- `npm run test:image-retry-policy` 2 passed，`npm run test:use-page-image-loader` 3 passed，日志同目录。
- `npm run check` exit 0（type-check、全部 `node --test`、`test_cleanup_browser.py` 28 条、build `dist/ehunter.iife.js` 443.27 kB、`check-docs: 39 md, 6 yaml, 220 本地链接, 0 外链(仅记录), 70 $ref`），日志 `.tmp/acceptance/10-25-fix-image-retry-exhaustion/npm-check.log`。
- 单测回归有效性：把 `usePageImageLoader.ts` 还原为修复前实现，三条用例全部失败（`calls` 为空 / 次数无限增长 / `11 !== 3`）；恢复修复后全过。

## 浏览器验收（reader-test NH，生产包）

- 平台 NH，gallery `https://nhentai.net/g/688467/1/`（18 页）。
- 构建 `npm run build-prod` exit 0，`dist/ehunter.iife.js` 444187 bytes，sha256 `8950eb988126fc69a0fb95f7131dfe30b0fbb57b19c8f3cd7a242eb2f4211d47`。
- 安装：Tampermonkey 动态 loader 启用、静态脚本禁用（`.tmp/reader-test-nh/installation.md`）；bundle server `http://127.0.0.1:8787/ehunter.iife.js`。
- 轮次脚本 `.tmp/round-nh-retry-budget.mjs`，`navigate` 前 `Network.setBlockedURLs(['*://i*.nhentai.net/galleries/*'])` 拦截整图。
- 产物目录 `.tmp/browser-preflight/retry-budget-nh-2f585184-2c3c-4729-9a15-3fff14970c59`：`result.json` 为 `observed: passed`、`checks: executed`、`preparation: verified`、`errors: []`。
- `python3 scripts/acceptance.py verify-browser <artifact-dir>` exit 0，`{"valid": true, "status": "passed"}`（日志 `.tmp/acceptance-verify-retry-budget-nh-2f585184-2c3c-4729-9a15-3fff14970c59.log`）。

phase receipts：

- `first-screen`：`{"current": 1, "total": 18, "hasReader": true}`。
- `retry-budget-exhausted`：`{"settled": true, "waitedMs": 20114, "total": 26, "counts": {"1": 8, "2": 4, "3": 4, "4": 4, "5": 3, "6": 3}, "counters": ["2"], "failing": 6, "panelCount": 6, "buttons": ["刷新"]}`。
- `retries-stopped`：`{"beforeTotal": 26, "afterTotal": 26, "beforeCounts": {...}, "afterCounts": {...}, "counters": ["2"]}`（再等 15 秒请求账目与计数器都不变）。
- `manual-refresh-resets-budget`：`{"settled": true, "gained": 3, "counters": [5, 2], "sample": ["[重载-5] 加载图片失败, 请刷新", "[重载-2] 加载图片失败, 请刷新", "[重载-2] …"]}`。

## 浏览器验收（reader-test EH，生产包）

- 平台 EH，图页 `https://exhentai.org/s/f9cb170d76/4257612-1`（画廊 4257612，69 页），profile desktop。
- 同一份 `dist/ehunter.iife.js`（444187 bytes，sha256 `8950eb988126fc69a0fb95f7131dfe30b0fbb57b19c8f3cd7a242eb2f4211d47`）；Tampermonkey 动态 loader 启用、静态脚本禁用，登录态已确认（`.tmp/reader-test-eh/installation.md`）。
- 轮次脚本 `.tmp/round-eh-retry-budget.mjs`，`navigate` 前 `Network.setBlockedURLs(['*hath.network*'])` 拦截整图。
- 产物目录 `.tmp/browser-preflight/retry-budget-eh-a0d17df5-74fd-46ab-ac6f-d21175bee9cf`：`result.json` 为 `observed: passed`、`checks: executed`、`preparation: verified`、`errors: []`。
- `python3 scripts/acceptance.py verify-browser <artifact-dir>` exit 0，`{"valid": true, "status": "passed"}`（日志 `.tmp/acceptance-verify-retry-budget-eh-a0d17df5-74fd-46ab-ac6f-d21175bee9cf.log`）。
- 报告 `.tmp/test-reports/reader-test-eh-retry-budget.md`。

phase receipts：

- `first-screen`：`{"current": 1, "total": 69, "hasReader": true, "host": "exhentai.org"}`。
- `retry-budget-exhausted`：`{"settled": true, "waitedMs": 20091, "total": 26, "counts": {"1": 6, "2": 4, "3": 4, "4": 4, "5": 4, "6": 4}, "counters": ["5"], "failing": 6, "panelCount": 6, "buttons": ["原图", "刷新", "换源刷新"]}`。
- `retries-stopped`：`beforeTotal 26 == afterTotal 26`，per-page 账目与计数器（`["5"]`）再等 15 秒不变。
- `manual-refresh-resets-budget`：点「刷新」后 `counters` 由 `["5"]` 变为 `[11, 5, 5, 5, 5, 5]`，即一整份三段预算 6 次；`gained 2`（EH 阶段可在发出图片请求前失败，故图片请求数小于重试次数）；刷新后再等 15 秒账目与计数器都不变。

平台对照：NH 面板只有「刷新」（`isSupportImgChangeSource() === false`），计数器 `[重载-2]`；EH 面板有「原图」「刷新」「换源刷新」，计数器 `[重载-5]`，与 `core/service/imageRetryPolicy.ts` 的单段 3 次 / 三段 6 次一致。

## 与修复前的对比

同一拦截条件下，修复前 `.tmp/reader-test-nh/nh-source-retry-probe.json` 记录第 1 页整图请求在 10 s / 20 s / 30 s / 45 s 分别为 30 / 56 / 82 / 121 次，持续线性增长且永不进入错误态；修复后首次预算用尽即冻结在 26 次总量（第 1 页 8 次），90 秒内不再增长，界面稳定显示 `[重载-2] 加载图片失败, 请刷新` 与可点击的「刷新」。

## 未覆盖

- EH 的「原图」「换源刷新」按钮本轮只确认存在且平台开关正确，未单独验证二者的实际取图路径。
- 运行时未单独统计「单个 loader 实例的 `getImgSrc` 调用次数」——页面同页存在多个 `<img>` 渲染位，网络层请求数不等于单实例预算；精确预算由 `tests/use-page-image-loader.test.cjs` 断言（NH 3 次、EH 6 次）。
- 移动视口未重跑：本次修复只涉及状态机记账，与视口无关。

## 证据口径

- 本文档引用的证据都在 `.tmp/` 下，该目录被 `.gitignore` 忽略（见 `.trellis/spec/frontend/features/index.md` 的免责说明），因此归档记录无法脱离本机复现；需要重跑时按 `## 浏览器验收` 两节的步骤重建环境。
- `package.json` 新增 `test:image-retry-policy` 与 `test:use-page-image-loader` 两个脚本并接入 `npm test` 链：AC5 与 AC6 要求新增单测被跑到，不注册脚本则 `npm run check` 不会调用它们，属必要范围蔓延。
