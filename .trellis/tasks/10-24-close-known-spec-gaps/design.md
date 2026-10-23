# 设计：收口三处已知 spec 差异

## 边界

| 项 | 触及文件 | 不动的东西 |
| --- | --- | --- |
| R1 downloadTime | `core/service/GalleryDownloadService.ts` | 七字段结构、字段顺序、分片逻辑、并发 worker 数量 |
| R2 初始化超时 | `src/platform/initializer.ts` | `InitializationError` 结构与 steps 上报、`markCurrentPendingStepFailed` 语义 |
| R3 NH 属性 | `src/platform/nh/parser/IntroHtmlParser.ts`（+ `ImgHtmlParser.ts` 视需要） | EH 侧 `x-src` 改写（阻止资源加载，与本项无关）、`ThumbInfo` / `ImgPageInfo` 结构 |

## R1 downloadTime 本地时区

现状 `new Date().toISOString()` 产出 `2026-10-24T12:00:00.000Z`（UTC）。规格要求用户本地时间且带显式时区偏移。

取值约定：本地时间 + 显式偏移，形如 `2026-10-24T20:00:00.000+08:00`。

实现要点：

- 用 `getTimezoneOffset()` 求偏移（分钟，UTC−本地，东八区为 `-480`），按分钟级补齐 `±HH:MM`。
- 用本地 getter（`getFullYear/getMonth/getDate/getHours/getMinutes/getSeconds/getMilliseconds`）逐段格式化，避免 `toISOString().slice()` 这类"先用 UTC 再改后缀"的写法——后者在跨时区时会悄悄截断日期。
- 偏移为 0 时输出 `+00:00`，不输出 `Z`：字符串形态保持单一，解析方无需两套分支。
- `downloadTime` 仍在 `run()` 起始处取一次，天然满足"同任务所有分片一致"。
- 注意 `getTimezoneOffset()` 的符号方向是最容易写反的地方：`offset = -new Date().getTimezoneOffset()` 得到"本地相对 UTC 的偏移分钟数"。

## R2 初始化超时 60 秒

- `TIMEOUT_MS` 由 `120000` 改为 `60000`，注释同步。
- 同文件:74 的错误文案 `'Platform initialization timed out after 120 seconds'` 改为由 `TIMEOUT_MS / 1000` 插值，避免下次改阈值再次脱节（`failCurrentStep` 的文案已经是插值形式）。
- 规格里 state-management.md 的 120000 描述、features/index.md 与 pending-work.md 的差异条目同步更新。

风险：真实站点慢网下 60 秒是否够用。当前 `TextReq` 有超时重试，EH intro 页抓取受 `ReqQueue` 限流但单步超时独立；60 秒为原始契约值，且失败时已有完整 failCurrentStep 上报（错误视图显示具体步骤），可接受。

## R3 NH 属性改写精确化（已与用户对齐）

选"保留改写但精确化"而非"取消改写读原生"：改写存在的意义是解析 HTML 时不触发 45 张缩略图加载；取消后每次进图集都会真实请求这些图。真实样本 `.tmp/nh-thumb-src-parser/nhentai-intro-631366.html` 中 `data-src=` 出现 0 次、` src=` 102 次，当前站点只有原生 `src`。

契约定稿：

- 构造器只改写裸 `src=`（词边界），`data-src=` 保持原样：`html.replace(/\ssrc=/g, ' x-src=')`。
- 解析顺序：`data-src` → `x-src`，与改写后的 DOM 一一对应。
- 输出不变：当前站点（只有 `src`）→ 读到 `x-src`；旧格式（`data-src`）→ 读到 `data-src`。两种情况解析结果与改动前完全一致。

顺带确认 `ImgHtmlParser.ts`：它同样有 `/src=/g` 的全量替换与 `getAttribute('x-src')`。其输入是图片页 HTML，`#image-container img` 只有原生 `src`，无 `data-src` 影响；但为一致性把替换改为同一精确形式，读取保持 `x-src`。这一处若改动会让 `data-src` 不再被误改写——图片页不存在该属性，行为等价。

## 规格更新点

- `001-gallery-download-bundle/data-model.md:74`：删除"current producer uses UTC"整句，改为"本地时间 + 显式偏移，例 `2026-10-24T20:00:00.000+08:00`"。
- `001-platform-injection/spec.md` / `data-model.md` / `quickstart.md`：60 秒契约与实现恢复一致，不需改文字（原本就写 60），只确认无残留 120 描述。
- `state-management.md:234`：把"实现值 120000 为准"改回 60 秒契约与实现一致。
- `features/index.md:26-28` 与 `features/pending-work.md`：移除 R1/R3 两项差异，R2 从差异中删除；保留下载并发一项。

## 验证策略

1. 静态：`npm run type-check`、`npm run test`、`npm run build-prod`、`npm run check:docs`。
2. R1：Node 脚本在固定 `TZ` 下对比新旧实现输出，断言带偏移且 `Date.parse` 可还原。
3. R3：用真实样本 HTML 跑改写前后解析对比（`.tmp/nh-thumb-src-parser/` 两份样本）。
4. 非平台链路（R1/R2）：按 `browser-acceptance.md`。
5. 平台链路（R3）：按 `.pi/skills/reader-test/SKILL.md` 的 `platform:nh`。
