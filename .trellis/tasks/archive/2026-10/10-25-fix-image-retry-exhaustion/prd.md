# 修复图片加载失败时的无限重试

## Goal

页面图片 `<img>` 的 error 事件触发自动重试时没有真正的次数上限：NH 实测（屏蔽 `i*.nhentai.net/galleries/*` 后打开 `https://nhentai.net/g/688467/1/`）第 1 页在 45 秒内发出 121 次图片请求，约 2.6 次/秒线性增长，永不进入错误态。目标是让重试次数与 `.trellis/spec/frontend/product-goals.md` 声明的策略一致：同源自动重试 3 次，仍失败时按配置链路继续尝试换源与原图。

## Background

`core/components/composables/usePageImageLoader.ts` 里有两套重试概念混用：

- `autoRetryQueue`：由 `core/service/imageRetryPolicy.ts` 的 `buildRetryQueueAfterFailure` 生成，只在 `albumService.getImgSrc` 返回 `Error`（HTML/接口层失败）时消耗。
- `isAutoRetryExhausted`：本意是「重试预算已用完」，但只在 `runAutoRetryQueue` 正常跑空队列时置位。

实际失败路径是第二类：`getImgSrc` 成功返回 URL，`<img>` 元素加载时被网络拦截触发 `error` → `failLoad`。由于 `getNewImgSrc` 每次进入都无条件把 `isAutoRetryExhausted` 重置为 false，且成功分支 `return` 跳过置位，`failLoad` 每次都能重建队列，形成无限循环。队列本身已正确编码 `Default → ChangeSource → Origin` 推进，缺的是跨 `<img>` error 事件的预算。

平台差异：`src/platform/nh/service/AlbumServiceImpl.ts:37` `isSupportImgChangeSource() === false`，所以 NH 上策略退化为单段 `Default × 3`，表现为「同一 URL 无限重复」。

## Requirements

- R1 重试预算与 `imageRetryPolicy` 声明的阶段尝试次数对账：单段配置 3 次、三段配置 6 次（`Default 2 + ChangeSource 2 + Origin 2`），达到预算后停在该状态并展示失败信息，不再发请求。
- R2 用户主动触发的重新加载（页面「刷新」「换源刷新」「原图」按钮，以及进入页面时的 `loadImgSrc`）重新获得完整预算。
- R3 加载成功后预算复位，后续新的失败重新从满预算开始。
- R4 `core/service/imageRetryPolicy.ts` 的阶段定义不改；`GalleryDownloadService` 的下载链路不受影响。
- R5 不引入新的配置项、不新增开关；`product-goals.md` 已声明的策略是唯一口径。

## Non-goals

- 不改 NH/EH 的 `getImgSrc` 实现与平台能力开关。
- 不改下载链路的 `getImageRetryStages` 调用。
- 不处理「重试期间用户切页」等并发场景的额外优化。

## Acceptance Criteria

- [AC1] 图片加载失败时 `getImgSrc` 调用总次数等于策略预算（NH 单段 = 3，EH 三段 = 6），不再无限增长。
- [AC2] 预算耗尽后 `curLoadStatus` 为 `ImgLoadStatus.Error`，`loadingInfo` 显示失败文案，且不再发起新的加载请求。
- [AC3] 成功加载一次后再次失败，预算重新从满额开始（3/6 次）。
- [AC4] 用户点击「刷新」「换源刷新」「原图」按钮后预算重置。
- [AC5] `npm run type-check`、`npm run test:image-retry-policy`、新增的加载器单测通过。
- [AC6] `npm run check` 全绿（含 `build-prod` 与 `check:docs`）。

## Notes

- 复现证据：`.tmp/reader-test-nh/nh-source-retry-probe.json`（t10s 30 次 / t20s 56 / t30s 82 / t45s 121）。
- 规格依据在 `.trellis/spec/frontend/product-goals.md:56`（加载失败策略）与 `:120`（加载失败信息可见且交互可用），不需要改规格文本。
