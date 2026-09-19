<!-- migration-note:start -->
> 迁移来源：`specs/001-gallery-download-bundle/plan.md`（基线 `647ff26`）。正文保全，路径已重定位；命令与源码路径均从仓库根目录解释。
> 阅读顺序与状态：先读[功能索引](../index.md)及[已确认决策](../../decisions/2026-09-18-reader-behavior.md)；决策覆盖到的旧约定以决策为准。Draft、任务勾选、独立验收清单各自保留，不证明当前版本通过验收。
> 文中的 plan/research/tasks、原始 Input、日期及“本次/当前”描述均保留原记录时态；历史实现路径、代码示例、依赖版本和 `.tmp/` 证据不代表本轮已核实或可获取。迁移未执行产品验收，也未补造缺失产物。
> 历史计划：下文 Spec Kit 命令、模板、Constitution Check 及 agent-context 操作均为历史记录，不执行；当前开发流程见 [Trellis workflow](../../../../workflow.md)，稳定工程原则见 [AGENTS](../../../../../AGENTS.md)。保留当时状态，不将历史阶段门禁继续用于当前工作流。
<!-- migration-note:end -->

# Implementation Plan: Gallery Download Bundle

**Branch**: `001-gallery-download-bundle` | **Date**: 2026-02-22 | **Spec**: `.trellis/spec/frontend/features/001-gallery-download-bundle/spec.md`
**Input**: Feature specification from `.trellis/spec/frontend/features/001-gallery-download-bundle/spec.md`

## Summary

Implement confirm-to-download workflow in `DownloadConfirmDialog` that sequentially fetches gallery images, packages them into one or more standard ZIP files with a per-chunk UTF-8 `metadata.json` containing exactly the seven fields defined in `data-model.md`, and surfaces robust real-time progress via a reusable bottom-right floating notification stack. The design prioritizes deterministic ordering, bounded memory via chunking (default 200), and resilient retrieval with source-switch fallback and fixed retry policy (initial + 2 retries).

**Decision sync (2026-09-18)**: [Confirmed download decision, section 1](../../decisions/2026-09-18-reader-behavior.md#1-下载格式) replaces the historical YAML and `jszip`/`yaml` plan. Reuse the existing `fflate` implementation and native JSON serialization; every single- or multi-chunk archive carries its own complete metadata. The documentation is synchronized; runtime acceptance is tracked separately in `tasks.md` (T036–T037).

## Technical Context

**Language/Version**: TypeScript 5.9 + Vue 3.5 SFC + SCSS\
**Primary Dependencies**: Vue runtime (`vue`), existing `AlbumService`/store modules, ZIP generation/UTF-8 encoding via existing `fflate`, native `JSON.stringify`\
**Storage**: Userscript storage preference via existing unified settings persistence (`GM_*` first, platform/local fallback)\
**Testing**: Manual runtime verification via `npm run dev` + `ego-browser`; static check via `npm run type-check` (non-blocking if pre-existing unrelated failures)\
**Target Platform**: Browser userscript runtime on EH reader UI (desktop + mobile viewport validation)
**Project Type**: Single frontend userscript app\
**Performance Goals**: First status notification appears within 1s after confirm; progress updates visible at least once per processed image; chunk finalization starts immediately after chunk fill/completion\
**Constraints**: Keep changes in `core/` and `src/`; no third-party UI component library; sequential image processing only; retry policy fixed at initial attempt + 2 retries; cross-platform safe filename sanitization; mode behavior must remain unchanged outside download flow\
**Scale/Scope**: EH path first; support galleries up to at least 1000 pages through chunked export; concurrent user-triggered download tasks up to 3 with independent notifications

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Pre-Phase 0 Gate Review**

- Principle I (Refactor-First Boundaries): PASS. Planned code changes are limited to `core/` and `src/platform/eh/` refactor paths.
- Principle II (Behavior-Preserving Changes): PASS. Download workflow is isolated from reading-mode rendering; retries/fallback integrate with existing image-source semantics.
- Principle III (Validation Before Completion): PASS. Quickstart includes mandatory `npm run dev` and browser runtime verification using `ego-browser` in desktop/mobile viewports.
- Principle IV (Story-Independent Delivery): PASS. Work is sliceable into (1) download pipeline, (2) notification system, (3) robustness/retry and settings integration.
- Principle V (Built-in UI and Mode Consistency): PASS. Notification UI is self-built Vue component(s), no external UI library introduced; scope explicitly keeps book/scroll behavior parity.

**Post-Phase 1 Design Re-check**

- Principle I: PASS. Data model and contracts map to `core/components`, `core/store`, `core/service`, and `src/platform/eh` only.
- Principle II: PASS. Data model defines sequential download state machine and non-blocking failure handling that avoids mode-specific regressions.
- Principle III: PASS. Quickstart captures required dev runtime and `ego-browser` validation workflow.
- Principle IV: PASS. Contracts and quickstart checks remain independently testable per story.
- Principle V: PASS. UI design uses repository-native components/SCSS and preserves mode-agnostic behavior.

## Project Structure

### Documentation (this feature)

```text
.trellis/spec/frontend/features/001-gallery-download-bundle/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── gallery-download.openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
core/
├── components/
│   ├── dialog/
│   │   └── DownloadConfirmDialog.vue
│   └── status/
│       ├── StatusNotificationStack.vue
│       └── StatusNotificationItem.vue
├── service/
│   ├── AlbumService.ts
│   └── GalleryDownloadService.ts
└── store/
    ├── app.ts
    ├── i18n.ts
    └── settingFieldRuntime.ts

src/
└── platform/
    └── eh/
        └── service/
            └── AlbumServiceImpl.ts
```

**Structure Decision**: Keep a single frontend userscript architecture. Add download orchestration in a dedicated core service, add reusable status notification UI under `core/components/status/`, expose required metadata getters through existing album service abstraction, and wire new setting(s) into existing unified settings flow.

## Implementation Baseline and Open Verification (2026-09-18)

Read-only inspection of `core/service/GalleryDownloadService.ts` confirms that `finalizeChunk` already builds the seven-field object, writes `metadata.json` with `fflate.strToU8(JSON.stringify(...))`, and generates ZIP bytes with `fflate.zipSync`. No new serialization subsystem or dependency migration is needed for D03. This is static evidence only; no download artifact or runtime acceptance was performed during this documentation sync.

The producer currently captures `downloadTime` once using `new Date().toISOString()` (UTC). The existing specification's user-local-time assumption remains unchanged by the format decision and is not yet satisfied for non-UTC users. The producer also starts three image workers, while the existing sequential-fetch requirement remains in force. These pre-existing gaps must remain visible during implementation/acceptance; this document sync does not approve either behavior change.

## Complexity Tracking

No constitution violations requiring justification.

## D03 产物与运行时验收（2026-09-18）

证据：`.tmp/t037/t037-evidence.md`（逐条实测 + 106 项字段校验明细）、`.tmp/t037/verify-zips.json`、ZIP 原件 `.tmp/t037/round72-single-0.zip`、`round76-multi-0/1.zip`、`round78-mobile-0/1.zip`、`round82-mobile-book-0/1.zip`。环境：生产脚本 bundle（`127.0.0.1:8787`）+ 隔离 GM harness，真实站点 EH 阅读页 `/s/80813c92df/3482416-1`（画廊 136 页）。

**结构 / 字段（通过）**：7 个 ZIP 均可用 `fflate.unzipSync` 与 `unzip -l` / `unzip -p` 解压；每个包根目录仅 `metadata.json`（255 B、UTF-8 无 BOM、首字节 `7b 0a 20`）；七字段 `introUrl, galleryTitle, totalPages, downloadTime, eHunterVersion, totalChunks, chunkIndex`，类型为 string×4 + integer×3，对照 `contracts/gallery-download.openapi.yaml`（`min:1`、`chunkIndex` 1-based、跨包任务级字段一致、无额外属性）共 **106 项校验 0 失败**；非 ASCII 标题 `GIRLS BAND CRY 1st FAN BOOK [Chinese] [无名字幕组]` 在 `galleryTitle` 与 ZIP 文件名中均保真；单包 `totalChunks=1, chunkIndex=1`（无 `_part` 后缀），多包场景 `totalChunks=2` 且文件名为 `_part-01-of-02` / `_part-02-of-02`；同组两包的任务级字段完全一致。

**包内图片内容（原先判定为环境能力缺口，实为产品缺陷，已修复并通过真实验证）**：2026-09-18 复核发现原结论归因错误。真实原因：`core/service/GalleryDownloadService.ts` 用 `(globalThis as any).GM_xmlhttpRequest` / `(globalThis as any).GM_download` 取 API，而 Tampermonkey 只把 `GM_*` 注入脚本作用域，`globalThis` 上恒为 `undefined`，每页抛 `GM_XHR_NOT_AVAILABLE`，ZIP 只剩 `metadata.json`（255–348 B）——真实用户环境同样如此（Chromium History 记录到 348 B / 423 B / 379 B 的 metadata-only 产物）。修复：新增 `type GmApi`（`:141`）与 `resolveGmApi(name)`（`:150`，依次尝试脚本作用域裸标识符 → `window` → `globalThis`，首次解析打日志 `[GalleryDownloadService] gm api resolved`），调用点 `:185` `const gmXhr = resolveGmApi('GM_xmlhttpRequest')`、`:280` `const gmDownload = resolveGmApi('GM_download')`，交付分支 `:283` `if (!isDevRuntimeForDownload() && typeof gmDownload === 'function')` 否则回落 anchor 下载。仓库内其他 GM 访问本就用裸标识符（`src/platform/base/service/PlatformService.js:22,28,40,58,59,72,73,91,92,121,122,156-169`），修复后 `grep -rn "globalThis.GM_" core/ src/` 无命中；`npm run build-prod` 产出 `dist/ehunter.iife.js`（439,662 B）含该日志字符串。

**真实 Tampermonkey 环境复测（通过，2026-09-18）**：真实 ego lite + Tampermonkey 加载 `.pi/skills/eh-test/ehunter-dev-loader.user.js`（v1.0.2，eval `http://127.0.0.1:8787/ehunter.iife.js`），任务空间「eHunter TM 下载复现」，证据 `.tmp/tm-download/round91-result.json`、`round93-result.json`。① 6 页画廊 `https://e-hentai.org/s/168b1852e6/4197820-1`：6/6 成功，ZIP 457,132 B（`metadata.json` 224 B + `0001.webp`…`0006.webp`），真实落盘 `downloads/263fa412-f7b2-4df8-adfd-d9969fb7c6a7.zip` 与页内捕获一致（sha256 `bc0f2cfd65b176cafa70d7f0993405e1af1eaebc96b1abed4a864e35436ca59d`）。② 136 页画廊 `/s/80813c92df/3482416-1` 默认分片 200：单包 27,901,721 B（`metadata.json` + `0001.webp`…`0136.webp`，`totalChunks=1, chunkIndex=1`）。③ 同画廊改分片 100：两包 21,079,853 B（`0001`–`0100`，`chunkIndex=1`）与 6,822,247 B（`0101`–`0136`，`chunkIndex=2`），两包任务级字段一致（`introUrl /g/3482416/a3e66d7d79/`、`totalPages 136`、`downloadTime 2026-09-18T22:16:47.901Z`、`eHunterVersion 3.1.0`），`fflate.unzipSync` 与 `unzip -l/-p` 校验通过、图片为有效 WebP，分片范围无重叠无缺口。未由自动化确认项：CDP `Page.setDownloadBehavior` 落盘的外层文件名为 UUID，真实用户侧文件名（修复前实测 `Elas and Ogre Ai generated.zip`）待本人确认。

**运行时回归（T037，通过）**：打包路径核对 `core/service/GalleryDownloadService.ts:1`（`import * as fflate`）、`:353`（`fflate.strToU8(JSON.stringify(chunkMeta, null, 2))`）、`:386`（`fflate.zipSync(zipFiles, { level: 0 })`），`grep -rn "jszip\|JSZip\|yaml" core/ src/` 无命中；桌面 1200×900 与移动 390×844 × 书页/卷轴四个组合均可进入下载确认弹窗并产出符合设置的包数（`下载分片大小` 200→1 包、100→2 包，改动当次即生效且 reload 后保留）；通知出现在右下角 `.status-pannel` 上方，并发任务垂直堆叠不重叠，实测文案 `正在处理第N/136张图片`；失败路径 `autoRetryByOtherSource:false` 下实测 `attempt=1,2,3`（初次 + 2 次重试）、`mode` 恒为 0，136/136 全失败仍产出计划内 ZIP 并报告失败数；各轮 `window.__err` 为空、无 Vite overlay。

**既有未满足要求（继续保持可见）**：`downloadTime` 仍为 UTC（非用户本地时间）、抓取仍为 3 个 worker（非顺序抓取），本轮未改动，仍按上文记录待另行落实。

**发现（记录，不在本轮修复范围）**：
- 中止后通知不收敛：`core/service/GalleryDownloadService.ts` 中 `resolveImageBlob` 之后的 `assertNotAborted`（约 :449）抛出的 `DOWNLOAD_ABORTED` 被同函数 `catch` 当作单页失败吞掉，worker 继续上报 `phase: 'fetching'`；`run()` 拒绝后 `core/components/dialog/DownloadConfirmDialog.vue:46-56` 虽写入 `partial` + `downloadAborted`，仍可能被兄弟 worker 的迟到 `fetching` 覆盖——实测计数冻结在 27→31 / 14→18、通知保持「正在处理第N/136张图片」且终止按钮未消失。
- 移动端合成触摸（swipe/tap）不翻页、内部滚动不响应，键盘 `ArrowRight` 正常（`1/136→4/136`），疑似 harness 触摸合成限制，需真机或真实触屏复核。
- quickstart 的「20–50 页 / 300 页画廊」用例以 136 页画廊 + 默认 200（单包）/ 100（两包）覆盖同一结构断言。
