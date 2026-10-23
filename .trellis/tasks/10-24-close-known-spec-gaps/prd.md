# 收口下载元信息时区、初始化超时与 NH 属性双拼写

## Goal

消除 `pending-work.md` 与 `index.md#已知状态差异` 列出的三处 spec 与实现差异，让规格描述与代码行为一致，并把三处差异从"已知差异"清单移除。

## Background

三处差异都已存在一段时间，且当前代码是两个方向的偏差点：

1. **下载元信息时区**：`001-gallery-download-bundle/data-model.md:65,74` 要求 `downloadTime` 为用户本地时间，`core/service/GalleryDownloadService.ts:347` 用 `new Date().toISOString()` 产出 UTC。
2. **初始化超时**：`001-platform-injection/spec.md:94` FR-020 与 `SC-003`（spec.md:112）要求 60 秒超时，`src/platform/initializer.ts:14` 为 `TIMEOUT_MS = 120000`，且同文件:74 的错误文案写死 `'Platform initialization timed out after 120 seconds'`。
3. **NH 属性双拼写**：`src/platform/nh/parser/IntroHtmlParser.ts:12` 把原生 `src=` 全量改写成 `x-src=`（无空格匹配，`data-src=` 因此变成 `data-x-src=`），:23 用 `data-x-src || x-src` 兜底；`src/platform/nh/parser/ImgHtmlParser.ts` 同样依赖 `x-src`。规格只描述了"两种拼写都接受"这个现状，没有定稿。

## Requirements

### R1 下载元信息时区

- `metadata.json` 的 `downloadTime` 用用户本地时区表示，带显式偏移，可被 `Date.parse` 解析，且同一任务所有分片共用同一个值。
- 现有七字段与字段顺序不变。

### R2 平台初始化超时

- 初始化超时统一为 60 秒，超时提示文案与阈值一致。
- 已上报失败步骤时的行为不变（保留既有 failCurrentStep 分支）。

### R3 NH 缩略图属性

- 保留 `src` 改写（避免解析 HTML 时触发浏览器加载缩略图），只改写空白前缀的裸 `src=`：`html.replace(/\ssrc=/g, ' x-src=')`，`data-src=` 不再被连带改成 `data-x-src=`。
- 读取顺序为 `data-src` → `x-src`，与改写后的属性形态一一对应。
- Nhentai 图集页与阅读页解析结果与改动前一致（缩略图 URL、页面链接、标题）。

## Constraints

- 不改动 `core_old/`、`old/`；不改动非本任务范围的行为（下载并发 worker 数量、分片策略、通知栈等）保持现状。
- `src/platform/eh/**` 的 `x-src` 改写保持不动：那是为了阻止浏览器加载资源，与本项的双拼写问题无关。
- 规格更新只描述改动后的当前状态，不保留"双拼写都接受"之类的过期描述。

## Out of Scope

- 下载抓取的并发度（spec 要求顺序抓取、实现为 3 个 worker）——本次不动，仍留在已知差异清单。
- 各功能组 quickstart 的实机验收（放大镜、翻页、面板、缩略图放大、设置、分片校验、平台注入四份 validation 记录）。

## Acceptance Criteria

- [AC1] `core/service/GalleryDownloadService.ts` 产出的 `downloadTime` 带本地时区偏移；用固定时区构造的检查能证明它与 `toISOString()` 结果不同且 `Date.parse` 可解析。
- [AC2] `src/platform/initializer.ts` 超时为 60000ms，超时错误文案含 `60 seconds`，`grep 120` 在初始化链路无残留。
- [AC3] `src/platform/nh/parser/` 的改写在两份解析器里都是 `\ssrc=` → ` x-src=`（词边界），`IntroHtmlParser` 读取 `data-src` 后回退 `x-src`，`ImgHtmlParser` 读取 `x-src`。
- [AC4] NH 缩略图与图片页解析在真实样本 HTML 上的输出与改动前一致（同一份样本跑改动前后对比，或给出等价断言）。
- [AC5] `npm run type-check`、`npm run test`、`npm run build-prod`、`npm run check:docs` 通过。
- [AC6] `.trellis/spec/frontend/features/index.md` 与 `pending-work.md` 移除已完成差异，仅保留下载并发一项；`001-platform-injection/spec.md`、`data-model.md`、`quickstart.md` 与 `001-gallery-download-bundle/data-model.md` 的表述与实现一致。
- [AC7] 按 `browser-acceptance.md`（非平台改动）或 `reader-test` `platform:nh`（NH 解析属平台改动）给出与改动范围匹配的验收记录，明确已验证/未验证范围。

## Notes

- 三项目前彼此独立，可先落代码再统一跑一次 `npm run check`。
- R3 触及 `src/platform/nh/**`，按 AGENTS.md 必须以 `reader-test` 的 `platform:nh` 链路验收；R1/R2 属 core 与通用初始化，按浏览器验收指南走非平台路径。
