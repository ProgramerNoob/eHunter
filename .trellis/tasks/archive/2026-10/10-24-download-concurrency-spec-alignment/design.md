# 设计：下载抓取并发对齐规格与进度语义

## 决策记录

### D1 承认并发，而不是把实现改回顺序

- 选择：规格向实现对齐，保留三 worker。
- 理由：并发已运行 8 个月（`0d7e4c4` 2026-02-22 至今），产物顺序由 `core/service/GalleryDownloadService.ts:416` 的排序兜底，用户可见产物无误；改回顺序会让 300 页下载耗时约 3 倍，收益为零。
- 被否掉的备选：改实现为单 worker 顺序抓取——需要重新证明吞吐、内存与中断行为，且要重跑全部下载验收。

### D2 进度口径统一到 processedPages

- 选择：`processedPages` 是唯一权威进度；文案与数据模型都按"已完成页数"表达。
- 理由：`core/store/app.ts:2032` 与 `:2046` 早已只消费 `event.processedPages`，`currentPage` 只活在规格文档里，是实现与文档的对接点缺失。统一到已消费字段，改动面最小且无契约破坏。
- 被否掉的备选：重命名 `data-model.md` 的 `currentPage` 为 `processedPages`——会牵动契约文件与既有引用，收益不抵成本；本次只改语义描述。

### D3 文案改成"已完成计数"

- 选择：`core/assets/i18n.ts:522` `downloadFetching` 三语改为"已完成 N / M 张"。
- 理由：并发下"正在处理第 N 张"本身不成立——同一时刻有 3 张在处理。已完成计数是并发下的唯一单调量。
- 被否掉的备选：保留原文案只把数字改成 `processedPages + 1`——数字单调了，但"第 N 张"在并发下仍是错的说法。

### D4 抓取前的推送保留，数字改用 completed 口径

- 选择：`core/service/GalleryDownloadService.ts:493-501` 的抓取前推送保留，`current` 取 `processedPages`。
- 理由：删掉它会让通知在第一页完成前停在"下载任务已开始"，丢失"正在抓取"的阶段信号。保留并在 `current` 用已完成数，与抓取后推送（`:512`）同口径，序列天然单调。
- 代价：同一时刻会有两次相同数字的推送（开始抓取一张、完成一张各一次），状态更新是覆盖式的（`core/store/app.ts` 按 `notificationId` 覆盖），不会造成视觉抖动。

## 边界与契约

### 不变的部分

- 并发度固定 3，`runWorker` 结构、共享 `queue` 抢页、分片循环结构都不动。
- 分片切分仍按页码区间顺序（`chunkStart += chunkSize`），分片依次产出并依次触发下载。
- 压缩包内图片顺序由 `:416` 排序保证，文件名零填充编号来自 `image.pageNumber`。
- `metadata.json` 七字段、`fflate` ZIP、重试链路、中断语义不动。

### 变化的部分

| 位置 | 现状 | 目标 |
| --- | --- | --- |
| `.trellis/spec/frontend/features/001-gallery-download-bundle/spec.md:19` | 用户故事写"按页顺序抓取" | 并发抓取，产物仍按页码顺序 |
| 同文件 `:27` | 验收场景 1 写"顺序下载" | 并发下载 |
| 同文件 `:75` FR-001 | "按画廊页码顺序逐张处理" | 三 worker 并发抓取；单包内按页码排序 |
| `.trellis/spec/frontend/features/001-gallery-download-bundle/data-model.md:22-23` | `currentPage` + MUST never decrease | 已完成页数语义 + 并发说明 |
| 同文件 `:27` | "produced from sequential pages" | 改为按页码范围打包 |
| `.trellis/spec/frontend/features/001-gallery-download-bundle/contracts/gallery-download.openapi.yaml:164` | `processedPages` 无描述 | 补语义说明 |
| `.trellis/spec/frontend/decisions/2026-09-18-reader-behavior.md` 第 1 节 | "抓取要求顺序执行，当前实现为三个并发 worker——该差异见…" | 并发口径，删掉差异指路 |
| `.trellis/spec/frontend/features/pending-work.md` | 有"下载图片抓取并发"一节 | 删除该节 |
| `.trellis/spec/frontend/features/index.md` | `## 已知状态差异` 首条 | 删除该条 |
| `core/assets/i18n.ts:522` | "正在处理第{{current}}/{{total}}张图片" | "已完成 {{current}}/{{total}} 张" |
| `core/service/GalleryDownloadService.ts:496` | `current: pageNumber` | `current: processedPages` |

## 风险与回退

- 文案口径变化对三语都生效，`en`/`jp` 需要同步改到同等语义，不能只改 `cn`。
- 无数据写入与迁移，无不可逆操作；回退即 `git revert`。
- 不影响 `metadata.json`、ZIP 结构与下载产物，已归档的旧下载包不需要重做。

## 验收策略

- 静态：`npm run type-check`、`npm run check:docs`、`npm run test:download-metadata`、`npm run test:download-time`。
- 行为：浏览器触发一次多分片下载，观察进度数字单调不减且为已完成口径；解压核对图片仍按页码顺序命名。按 `.trellis/spec/frontend/browser-acceptance.md` 执行并保存证据。
