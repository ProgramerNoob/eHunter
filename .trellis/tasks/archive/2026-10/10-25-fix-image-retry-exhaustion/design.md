# 设计：图片加载失败的预算记账

## 现状

`core/components/composables/usePageImageLoader.ts` 同时存在两套「重试」概念：

- `autoRetryQueue`（`ImgSrcMode[]`）：由 `core/service/imageRetryPolicy.ts` 的 `buildRetryQueueAfterFailure` 生成，只在 `albumService.getImgSrc()` 返回 `Error`（HTML/接口层失败）时消费。
- `isAutoRetryExhausted`（boolean）：本意为「重试预算用完」。

`<img>` 元素加载失败的路径是第二类：`getImgSrc` 成功返回 URL，元素 `error` → `failLoad`。这个路径上预算从未被真正消耗，因为：

1. `getNewImgSrc` 每次进入都无条件执行 `isAutoRetryExhausted.value = false`（`usePageImageLoader.ts:107`），包括自动重试自身；
2. `runAutoRetryQueue` 在某个 `getNewImgSrc` 返回 `true` 时 `return`，跳过末尾的 `isAutoRetryExhausted.value = true`；即使队列已空也一样。

于是 `failLoad` 的 `!isAutoRetryExhausted.value && autoRetryQueue.value.length === 0` 恒为真，每次都重建满额队列。

队列的推进逻辑本身是对的：`Default → ChangeSource → Origin`，每阶段按 `attempts` 补足，`getNewImgSrc` 成功一次就等 `<img>` 的结果，队列余量自然成为剩余预算。缺的只是「队列排空时封账」。

## 决策

**D1 用队列余量作为唯一预算来源，不引入计数器。**
`imageRetryPolicy` 已经把「阶段 × 次数」编码成队列长度；再维护一个已用次数计数器会和队列重复记账，容易出现两处漂移。因此只需保证：队列非空 = 还有预算；队列排空 = 预算耗尽。

**D2 预算复位只发生在两个真实入口**：`loadImgSrc`（页面首次加载/激活）和 `getNewImgSrc(mode)` 的非自动重试分支（用户点「刷新」「换源刷新」「原图」）。自动重试（`isAutoRetry === true`）不再复位。

**D3 封账放在 `runAutoRetryQueue` 的 `finally`**：`if (autoRetryQueue.value.length === 0) isAutoRetryExhausted.value = true`。这样覆盖三条路径——队列自然跑空、最后一次成功返回、异常抛出；而队列仍有余量时保持未封账，后续 `failLoad` 可以接着消费剩余阶段（EH 三段策略共 6 次尝试即由此保证）。

**D4 不改 `core/service/imageRetryPolicy.ts`。** 策略层定义的阶段与次数是规格，缺陷在消费端的记账。

## 变更点

```ts
// runAutoRetryQueue 的 try/finally
finally {
    isAutoRetryRunning.value = false
    if (autoRetryQueue.value.length === 0) {
        isAutoRetryExhausted.value = true
    }
}

// getNewImgSrc 入口
if (!isAutoRetry) {
    autoRetryQueue.value = []
    isAutoRetryExhausted.value = false   // 从无条件执行移进用户入口
}
```

`loadImgSrc` 与 `loaded` 现有的复位保持不变。

## 影响面

- NH（`isSupportImgChangeSource() === false`）：预算 = `Default × 3`，第 4 次失败后停在 `ImgLoadStatus.Error`，`loadingInfo` 显示 `[重载-4] 加载图片失败, 请刷新`。
- EH / TEST（`isSupportImgChangeSource() === true`）：预算 = `2 + 2 + 2 = 6` 次，阶段推进顺序不变。
- 下载链路 `core/service/GalleryDownloadService.ts:232` 独立调用 `getImageRetryStages`，不经过本组合式函数，行为不变。
- 规格 `.trellis/spec/frontend/product-goals.md:56`「同源自动重试 3 次，若仍失败按配置链路继续尝试换源与原图」即为修复后的目标行为，无需改文本。

## 测试策略

- 单元测试（新增 `tests/use-page-image-loader.test.cjs`）：用 `tests/helpers/runtime-fixture.cjs` 隔离 `vue`（`ref`/`computed`/`nextTick` 最小实现）、`store`/`i18n`/`Utils`/`Logger`，加载真实 `usePageImageLoader.ts` + `imageRetryPolicy.ts` + `model.ts`。用「`getImgSrc` 成功但图片元素报错」的循环驱动 `failLoad`，断言 `getImgSrc` 调用次数等于预算、状态停在 Error、`loadingInfo` 含失败文案；再断言刷新入口重置预算、`loaded()` 后重新计数。
- 浏览器验收（reader-test NH）：`Network.setBlockedURLs(['*://i*.nhentai.net/galleries/*'])` 后打开画廊，统计 45 秒内整图请求次数应从 121 次收敛到 3 次，并出现可点击的「刷新」按钮与失败文案。
