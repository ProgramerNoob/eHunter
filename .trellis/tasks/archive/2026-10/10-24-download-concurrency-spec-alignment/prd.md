# 下载抓取并发对齐规格与进度语义

## Goal

承认画廊下载实际使用三个并发 worker，把规格、决策与数据模型改成当前行为，并让抓取进度通知与数据契约在并发下自洽：进度数字单调不减，文案不再声称"正在处理第 N 张"。

## Background

引入提交 `0d7e4c4`（2026-02-22，`feat(core): add gallery zip download workflow with progress notifications`）同批交付了规格与实现，两者从第一天就不一致：

- 规格 `spec.md:19`（用户故事）、`spec.md:27`（验收场景 1）、`spec.md:75` FR-001 都要求"按页顺序 / 逐张处理"。
- 同一提交的 `specs/001-gallery-download-bundle/research.md` **Decision 6** 写着 `Process images strictly in page order`，并把 `Parallel image fetches with ordered writeback` 列为被否掉的备选。
- 实现直接是三个 worker：`core/service/GalleryDownloadService.ts:531` `await Promise.all([runWorker(), runWorker(), runWorker()])`，`:486` 定义 `runWorker`，`:484` 用共享 `queue` 抢页。

后续 8 次提交都没碰这段，差异一直沿用至今，`pending-work.md` 与 `features/index.md#已知状态差异` 各记了一条。

产物顺序不受影响：`core/service/GalleryDownloadService.ts:416` `const sortedChunkImages = [...chunkImages].sort((a, b) => a.pageNumber - b.pageNumber)` 在打包前按页码重排，文件名零填充编号也取自 `image.pageNumber`。真正不一致的是抓取顺序、进度数字与文案。

进度存在实打实的缺陷：`:496` 在抓取**前**推送 `current: pageNumber`（队列里抢到的页号），并发下会乱跳；`:512` 在抓取**后**推送 `current: processedPages`（单调递增）。于是同一条通知的数字在 `1、3、2、4、5、5…` 之间来回，与 `data-model.md:23` `currentPage MUST never decrease during normal processing` 的规则冲突。

## Requirements

### R1 规格承认并发

- `001-gallery-download-bundle/spec.md` 的用户故事、Acceptance Scenario 1、FR-001 描述当前的三 worker 并发抓取，不再要求逐张顺序处理。
- 明确保留的约束：单页在压缩包内的顺序与页码一致（由打包前排序保证），分片仍按页码区间顺序切分并依次产出。
- FR-005 的"按顺序拆分为多个压缩包"保留原意（分片顺序），不改。

### R2 进度语义口径统一

- `001-gallery-download-bundle/data-model.md` 的 `currentPage` 语义改为"已完成页数"，并同步校验规则；契约与实现都以 `processedPages` 为准（`core/store/app.ts:2032` `task.processedPages = event.processedPages`、`:2046` `progressCurrent: event.processedPages` 已如此消费）。
- `contracts/gallery-download.openapi.yaml` 的 `processedPages` 增补语义说明，若字段描述与实际承载含义不符则一并校正。

### R3 文案改为已完成计数

- `core/assets/i18n.ts:522` `downloadFetching` 的 cn/en/jp 三语改为"已完成 N / M 张"口径，不再用"正在处理第 N 张"。
- `core/service/GalleryDownloadService.ts:496` 抓取前的推送改用已完成计数（`processedPages`，即尚未开始时为 0 或等价起点），使整条序列单调不减。
- `:512` 抓取后的推送保持不变。

### R4 清除未收口项

- `features/pending-work.md` 删除"下载图片抓取并发"一节。
- `features/index.md#已知状态差异` 删除对应条目。
- `decisions/2026-09-18-reader-behavior.md` 第 1 节末尾"抓取要求顺序执行，当前实现为三个并发 worker——该差异见…"改写为已确认的并发口径。

## 非目标

- 不改并发度（固定 3 个 worker），不引入可配置并发。
- 不改分片、`metadata.json` 七字段、ZIP 生成库、断点与重试链路。
- 不重跑 `001-gallery-download-bundle/quickstart.md` 里未执行的完整验收矩阵（分片校验等），该项仍留在 `pending-work.md`。
- 不重构 `GalleryDownloadService.run` 的循环结构。

## Acceptance Criteria

- [AC1] `spec.md`、`data-model.md`、`decisions`、`pending-work.md`、`index.md` 五处不再出现"按页顺序逐张处理""currentPage 单调""已知差异：3 并发"这类与实现相反的表述；grep `顺序` / `逐张` / `currentPage` 的结果均与并发实现一致。
- [AC2] `downloadFetching` 的 cn/en/jp 文案均为已完成计数口径，三语语义一致，占位符仍为 `{{current}}` / `{{total}}`。
- [AC3] 运行一次下载，抓取阶段的进度数字单调不减（不出现先大后小），失败页也计入已完成，最终值等于总页数。
- [AC4] `npm run type-check` 退出码 0。
- [AC5] `npm run test:download-metadata` 与 `npm run test:download-time` 通过。
- [AC6] `npm run check:docs` 通过（39+ md、本地链接 0 断链）。
- [AC7] 浏览器验收：本地 Vite 或生产包中触发一次多分片下载，通知显示已完成计数且数字不回退，压缩包内图片仍按页码顺序命名；书页与卷轴模式入口一致。

## 偏离原决策

`data-model.md` 与 `contracts/gallery-download.openapi.yaml` 的进度字段在实施中由 `currentPage` 改名为 `processedPages`（`4d5b898`）。原计划是保留字段名只改语义，但实现与契约早已统一使用 `processedPages`（`core/store/app.ts:2032` `task.processedPages = event.processedPages`、`:2046` `progressCurrent: event.processedPages`），保留旧名字会让规格与契约自相矛盾。语义不变：已完成页数（含失败页），单调不减。
