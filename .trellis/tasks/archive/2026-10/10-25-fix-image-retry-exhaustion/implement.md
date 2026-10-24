# 执行计划：图片加载失败的预算记账

## 前置

- 基线：分支 `docs/download-concurrency-spec` @ `b375de8`，工作区已有 2 处未提交（`package.json` 加 `test:image-retry-policy`、`tests/image-retry-policy.test.cjs`），属于本任务的前置产出。
- 任务目录：`.trellis/tasks/10-25-fix-image-retry-exhaustion/`。

## 步骤

### S1 修复消费端记账

`core/components/composables/usePageImageLoader.ts`：

- `runAutoRetryQueue` 的 `finally` 追加封账：`if (autoRetryQueue.value.length === 0) { isAutoRetryExhausted.value = true }`。
- `getNewImgSrc` 入口把 `isAutoRetryExhausted.value = false` 从无条件执行移入 `if (!isAutoRetry) { ... }` 块，与 `autoRetryQueue.value = []` 同处。

验证：`npm run type-check` 退出码 0。

### S2 单元测试

新增 `tests/use-page-image-loader.test.cjs`，通过 `tests/helpers/runtime-fixture.cjs` 运行：

- stub `vue`：`ref` 用 `{ value }` 包装、`computed` 用带 `value` getter 的对象、`nextTick` 用 `async () => {}`。
- stub `../../store/i18n`（`i18n.value` 提供 `reload`/`loadingFailed`/`loadingImgFailed`/`imgLoaded`/`waiting`/`loadingImg`/`noOriginalImg`）、`../../store/app`（`store.autoRetryByOtherSource` 与 `storeAction.setImgPageInfoSrc` / `setImgPageInfoPreciseHeightOfWidth` 记录调用）、`../../utils/Utils`（`timeout: async () => {}`）、`../../utils/logger`（`logText` 记录）。
- realModules：`core/components/composables/usePageImageLoader.ts`、`core/service/imageRetryPolicy.ts`、`core/model/model.ts`。
- 三条用例：
  1. NH 口径（`isSupportImgChangeSource: () => false`）：模拟「`getImgSrc` 始终成功返回同一 src，元素每轮报错」（循环调用 `failLoad`），断言 `getImgSrc` 调用 3 次后停止、第 4 次 `failLoad` 不再触发加载、`curLoadStatus === ImgLoadStatus.Error`、`loadingInfo` 含 `加载图片失败`。
  2. EH 口径（`isSupportImgChangeSource: () => true`、`autoRetryByOtherSource: true`）：断言总调用 6 次，且 `getImgSrc` 收到的 mode 序列为 `[Default, Default, ChangeSource, ChangeSource, Origin, Origin]`。
  3. 预算复位：耗尽后调用 `getNewImgSrc(ImgSrcMode.Default)`（用户刷新入口）或 `loaded()` 再失败，断言重新获得满额（3 次）。

`package.json`：新增 `"test:use-page-image-loader": "node --test tests/use-page-image-loader.test.cjs"`，并插入到 `test` 链（`test:image-retry-policy` 之后）。

验证：`npm run test:use-page-image-loader`、`npm run test:image-retry-policy`。

### S3 回归验证

- `npm run type-check`
- `npm test`（含新增两套测试）
- `npm run check`（type-check + test + build-prod + check:docs）

### S4 浏览器验收（reader-test NH）

- bundle server 已在 `.tmp/reader-test-nh/`（PID 文件 `bundle-server.pid`，监听 8787），`npm run build-prod` 重新产出 `dist/ehunter.iife.js` 后刷新页面。
- `withBrowserPreflight` NH 轮次：`Network.setBlockedURLs(['*://i*.nhentai.net/galleries/*'])` 拦截整图，打开 `https://nhentai.net/g/688467/1/`，采样 45 秒内整图请求次数（`performance.getEntriesByType('resource')` 按 `/galleries\/\d+\/(\d+)(t?)\./` 分组），断言：整图请求次数 = 3；`.loading-info` 文本含 `加载图片失败`；`.flat-button > a` 可见项为 `['刷新']`（NH 无「换源刷新」「原图」按钮，属既有平台能力，不是本任务回归）。
- 产物与报告放 `.tmp/reader-test-nh/`，写 `.tmp/test-reports/reader-test-nh-<timestamp>.md`。

### S5 收口

- 写 `verification.md` 与 `acceptance.json`（AC1–AC6），`python3 scripts/acceptance.py summarize`。
- 提交：`fix(core): 图片加载失败按策略预算停止重试`（代码 + 测试 + package.json）与 `chore(task): archive 10-25-fix-image-retry-exhaustion`。
- 停 bundle server，确认端口 8787 释放；`task.finish({ keep: [] })` + `cleanup-browser`。

## 回退点

- S1 改动仅 2 处、无新状态变量；回退即恢复 `finally` 与 `getNewImgSrc` 入口的两行。
- S2/S3 与 S1 解耦，测试文件可独立删除；`package.json` 的 script 条目需同步移除。

## 不做

- 不改 `core/service/imageRetryPolicy.ts` 的阶段定义。
- 不改 `GalleryDownloadService` 的下载重试。
- 不改 `product-goals.md`（其表述即目标行为）。
