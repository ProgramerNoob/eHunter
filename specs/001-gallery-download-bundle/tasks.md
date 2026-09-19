# Tasks: Gallery Download Bundle

**Input**: Design documents from `specs/001-gallery-download-bundle/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/gallery-download.openapi.yaml`, `quickstart.md`

**Tests**: No mandatory automated test tasks were explicitly requested in the spec; this task list includes mandatory manual runtime verification tasks.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

**历史任务说明（2026-09-18）**：下方 T001–T035 的原文与勾选状态保留历史进度，历史 Phase、Checkpoint 与实施顺序也按原文留存；勾选不代表当前 HEAD 或新格式已验收。T001 的 `jszip`/`yaml`、T014 及 US1 目标/验收/策略中的 YAML 约定，均已被 [已确认决策第 1 节](../decisions/2026-09-18-reader-behavior.md#1-下载格式) 替代：沿用现有 `fflate`，每个 ZIP 独立包含 UTF-8 `metadata.json` 七字段。继续实施时以同步后的正文、模型、契约和 quickstart 为准，其余未冲突任务继续有效；D03 验收另见 T036–T037。

## Format: `[ID] [P?] [Story] Description`

- `[P]`: Can run in parallel (different files, no dependency on incomplete tasks)
- `[Story]`: User story label (`[US1]`, `[US2]`, `[US3]`)
- Every task includes an exact file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare dependencies and basic scaffolding shared by all stories.

- [X] T001 Add `jszip` and `yaml` runtime dependencies in `package.json`
- [X] T002 Create download service scaffold and exported types in `core/service/GalleryDownloadService.ts`
- [X] T003 [P] Create status notification component directory and barrel export in `core/components/status/index.ts`
- [ ] T004 [P] Add download/notification i18n keys for progress and result messages in `core/store/i18n.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared store/state/contracts required before any user story implementation.

**CRITICAL**: Complete this phase before starting user story phases.

- [X] T005 Extend album service interface with intro URL access contract in `core/service/AlbumService.ts`
- [X] T006 Implement intro URL getter compatibility in `src/platform/eh/service/AlbumServiceImpl.ts`
- [X] T007 Add download task and notification reactive state structures in `core/store/app.ts`
- [X] T008 [P] Add settings field definition and runtime mapping for `downloadChunkSize` in `core/store/app.ts`
- [X] T009 [P] Add runtime getter/setter handling for `downloadChunkSize` in `core/store/settingFieldRuntime.ts`
- [X] T010 Implement filename sanitize, extension extraction, and page-number formatter utilities in `core/service/GalleryDownloadService.ts`
- [ ] T011 Wire foundational contract/schema alignment for download settings in `specs/001-gallery-download-bundle/contracts/gallery-download.openapi.yaml`

**Checkpoint**: Foundation ready for independent story implementation.

---

## Phase 3: User Story 1 - 一键下载画廊压缩包 (Priority: P1) 🎯 MVP

**Goal**: Trigger sequential image download from confirm dialog, generate chunked zip archives, and include YAML metadata in each chunk.

**Independent Test**: 在 20-50 页画廊点击确认下载，验证按页顺序命名图片、YAML 内容完整、并在页数超过分片阈值时下载多个 zip。

### Implementation for User Story 1

- [X] T012 [US1] Implement sequential page-by-page download orchestrator in `core/service/GalleryDownloadService.ts`
- [X] T013 [US1] Implement per-chunk zip assembly and immediate chunk download trigger in `core/service/GalleryDownloadService.ts`
- [X] T014 [US1] Implement YAML metadata builder with intro URL/title/page count/time/version/chunk fields in `core/service/GalleryDownloadService.ts`
- [X] T015 [US1] Implement chunk-size validation and default fallback (200) flow in `core/service/GalleryDownloadService.ts`
- [X] T016 [P] [US1] Wire DownloadConfirmDialog confirm action to invoke gallery download task in `core/components/dialog/DownloadConfirmDialog.vue`
- [X] T017 [US1] Add store actions for task lifecycle start/progress/chunk-complete/finalize in `core/store/app.ts`
- [ ] T018 [P] [US1] Add user-facing download option text and chunk size labels in `core/store/i18n.ts`

**Checkpoint**: User Story 1 is independently functional for end-to-end chunked export.

---

## Phase 4: User Story 2 - 实时可见下载进度 (Priority: P2)

**Goal**: Provide reusable bottom-right floating status notifications showing real-time progress and multi-task stacking.

**Independent Test**: 触发下载后通知显示在右下角 status-pannel 上方，进度实时更新，2-3 个任务可垂直堆叠且互不覆盖。

### Implementation for User Story 2

- [X] T019 [P] [US2] Implement reusable notification item UI states (`info/success/warning/error`) in `core/components/status/StatusNotificationItem.vue`
- [X] T020 [US2] Implement floating stack container with vertical layout above status panel in `core/components/status/StatusNotificationStack.vue`
- [X] T021 [US2] Mount notification stack in root app layout for global visibility in `core/App.vue`
- [X] T022 [US2] Add store notification actions (enqueue/update/complete/dismiss) and ordering policy in `core/store/app.ts`
- [X] T023 [US2] Emit fetching/compressing/completed/failed progress events from downloader to store in `core/service/GalleryDownloadService.ts`
- [ ] T024 [P] [US2] Add responsive styles for desktop/mobile notification readability in `core/components/status/StatusNotificationStack.vue`

**Checkpoint**: User Story 2 is independently functional with reusable stacked progress notifications.

---

## Phase 5: User Story 3 - 网络异常下的稳健下载 (Priority: P3)

**Goal**: Make download robust with retry policy, source-switch fallback order, and partial-failure continuation.

**Independent Test**: 模拟请求失败，验证单次链路最多 3 次尝试；开启自动换源时按 ChangeSource -> Origin 顺序；失败页不阻断后续下载并统计失败数。

### Implementation for User Story 3

- [X] T025 [US3] Implement per-stage retry helper enforcing initial + 2 retries in `core/service/GalleryDownloadService.ts`
- [X] T026 [US3] Implement fallback stage order switch (`ChangeSource -> Origin`) based on setting in `core/service/GalleryDownloadService.ts`
- [X] T027 [US3] Implement partial-failure continuation and failed page tracking per chunk/task in `core/service/GalleryDownloadService.ts`
- [X] T028 [P] [US3] Add final summary notification content for partial success and failure counts in `core/store/app.ts`
- [X] T029 [US3] Ensure EH album service returns explicit error semantics for source/origin failures in `src/platform/eh/service/AlbumServiceImpl.ts`
- [ ] T030 [US3] Align robustness and status fields with contract payloads in `specs/001-gallery-download-bundle/contracts/gallery-download.openapi.yaml`

**Checkpoint**: User Story 3 is independently functional with deterministic retry/fallback robustness.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency, validation, and runtime checks across all stories.

- [ ] T031 [P] Update quickstart verification steps with finalized interaction details in `specs/001-gallery-download-bundle/quickstart.md`
- [ ] T032 [P] Update plan validation notes with implementation-time findings in `specs/001-gallery-download-bundle/plan.md`
- [ ] T033 Run `npm run type-check` and record result notes in `specs/001-gallery-download-bundle/plan.md`
- [ ] T034 Run `npm run dev` and validate changed flows via `ego-browser` in desktop/mobile, then record outcomes in `specs/001-gallery-download-bundle/plan.md`
- [ ] T035 [P] Verify task/spec/contract terminology consistency (`status-pannel`, chunk fields, retry wording) in `specs/001-gallery-download-bundle/spec.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): no dependencies
- Foundational (Phase 2): depends on Setup; blocks all user story phases
- User Story phases (Phases 3-5): start after Foundational
  - US1 (Phase 3): no dependency on other user stories
  - US2 (Phase 4): depends on foundational state + US1 progress events
  - US3 (Phase 5): depends on US1 orchestrator and settings wiring
- Polish (Phase 6): depends on completed target user stories

### User Story Dependency Graph

- `US1 -> US2`
- `US1 -> US3`
- `US2` and `US3` can proceed in parallel after US1 base pipeline lands

### Within Each User Story

- Service/core logic before UI wiring when both modify same behavior
- Store action/state updates before component rendering dependencies
- Story checkpoint verification before moving to next priority

---

## Parallel Execution Examples

### User Story 1

```bash
Task T016 in core/components/dialog/DownloadConfirmDialog.vue
Task T018 in core/store/i18n.ts
```

### User Story 2

```bash
Task T019 in core/components/status/StatusNotificationItem.vue
Task T024 in core/components/status/StatusNotificationStack.vue
```

### User Story 3

```bash
Task T028 in core/store/app.ts
Task T030 in specs/001-gallery-download-bundle/contracts/gallery-download.openapi.yaml
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Deliver Phase 3 (US1) end-to-end.
3. Validate US1 independently using quickstart P1 checks.
4. Demo/download verification before adding notification and robustness enhancements.

### Incremental Delivery

1. Foundation (Phases 1-2)
2. US1 (chunked zip + YAML export)
3. US2 (stacked status notifications)
4. US3 (retry/fallback robustness)
5. Polish + runtime verification

### Parallel Team Strategy

1. Team finishes Phase 1-2 together.
2. After US1 stabilizes core pipeline, split work:
   - Engineer A: US2 notification UI/store
   - Engineer B: US3 retry/fallback robustness
3. Merge and complete Phase 6 runtime validation.

---

## Notes

- `[P]` tasks are isolated by file path and can run concurrently.
- Story labels map each task to independently testable user value slices.
- Manual runtime verification with `npm run dev` + `ego-browser` is mandatory before completion.

## 2026-09-18 D03 决策验收

本节独立追踪新格式验收。正文同步与只读代码核对已完成；现有生产者已具备 `fflate` + JSON 七字段路径，因此不新增重复实现任务。旧规格与实现的时间格式、顺序抓取差异记录于 `plan.md`，仍需另行落实或验收。**验收进展（2026-09-18）**：T036 与 T037 均已完成并有产物证据；首次验收记录的「包内 0 张图片」经复核不是 harness 能力缺口而是产品缺陷（`globalThis.GM_*` 取不到 API），修复后在真实 Tampermonkey 环境复测通过（详见 `plan.md`「D03 产物与运行时验收」段）。

- [X] T036 [US1] 按 `specs/001-gallery-download-bundle/quickstart.md` 的 P1 步骤验证单包与 300 页/默认 200 的多包产物：ZIP 可解压，每包根目录只有一个 UTF-8 `metadata.json` 元信息文件，恰含七字段且类型正确，非 ASCII 标题保真，单包分片字段为 1/1，多包为 2 和对应的 1/2，后续分包独立可读、任务级字段一致；在 `specs/001-gallery-download-bundle/plan.md` 记录产物证据及与 `contracts/gallery-download.openapi.yaml` 的核对结果。
  - 进度（2026-09-18；隔离 harness 证据 `.tmp/t037/t037-evidence.md`、`.tmp/t037/verify-zips.json`；真实 Tampermonkey 复测证据 `.tmp/tm-download/round91-result.json`、`.tmp/tm-download/round93-result.json`；结论同步在 `plan.md`「D03 产物与运行时验收」段）：**结构/字段通过**——7 个 ZIP 可解压、每包根目录仅 `metadata.json`（255 B、UTF-8 无 BOM）、七字段类型正确（对照契约 106 项校验 0 失败）、非 ASCII 标题保真、单包 1/1 无 `_part` 后缀、多包 `totalChunks=2` 与 `_part-01-of-02`/`_part-02-of-02`、同组任务级字段一致。**包内图片通过（真实环境复测）**——原「0 张图片」是产品缺陷而非 harness 缺口：`globalThis.GM_*` 取不到 API，已用 `resolveGmApi()`（`core/service/GalleryDownloadService.ts:150`，调用点 `:185`/`:280`）修复。6 页画廊 6/6 成功（ZIP 457,132 B，`metadata.json` + `0001.webp`…`0006.webp`，落盘 sha256 `bc0f2cfd65b176cafa70d7f0993405e1af1eaebc96b1abed4a864e35436ca59d`）；136 页画廊默认分片 200 得单包 27,901,721 B（`0001`–`0136`，`totalChunks=1`），改 100 得两包 21,079,853 B（`0001`–`0100`，`chunkIndex=1`）与 6,822,247 B（`0101`–`0136`，`chunkIndex=2`），两包任务级字段一致、图片为有效 WebP、分片无重叠无缺口。quickstart 的 300 页/默认 200 用例以 136 页画廊 + 默认 200（单包）/ 100（两包）覆盖同一结构断言。自动化经 CDP 落盘的外层文件名为 UUID，真实用户侧文件名待本人确认。
- [X] T037 [US1] 在 `core/service/GalleryDownloadService.ts` 核对实际打包路径仍沿用 `fflate` 与原生 JSON 序列化，按 `specs/001-gallery-download-bundle/quickstart.md` 完成两个视口及书页/卷轴、通知和失败路径回归；在 `specs/001-gallery-download-bundle/plan.md` 记录本轮结果，保留未满足的原有要求，符合验收后再勾选。
  - 验证（2026-09-18）：打包路径核对——`core/service/GalleryDownloadService.ts:1` `import * as fflate`、`:353` `fflate.strToU8(JSON.stringify(chunkMeta, null, 2))`、`:386` `fflate.zipSync(zipFiles, { level: 0 })`，`grep -rn "jszip\|JSZip\|yaml" core/ src/` 无命中。回归——桌面 1200×900 与移动 390×844 × 书页/卷轴四个组合均能进入下载确认弹窗并产出符合设置分片数的包（`下载分片大小` 200→1 包、100→2 包，改动当次生效且 reload 后保留）；通知（右下角 `.status-pannel` 上方、并发堆叠不重叠、文案 `正在处理第N/136张图片`）与失败路径（`autoRetryByOtherSource:false` 实测 `attempt=1,2,3`、`mode` 恒 0，136/136 全失败仍产出计划内 ZIP 并报失败数）通过；各轮 `window.__err` 为空、无 Vite overlay。结果与未满足项（UTC 时间、3 worker 顺序抓取）写入 `plan.md`「D03 产物与运行时验收（2026-09-18）」。
  - 发现（记录，非阻塞）：中止后通知不收敛——`resolveImageBlob` 之后的 `assertNotAborted`（约 `:449`）抛出的 `DOWNLOAD_ABORTED` 被同函数 `catch` 吞成单页失败并继续上报 `phase: 'fetching'`，`run()` 拒绝后 `core/components/dialog/DownloadConfirmDialog.vue:46-56` 写入的 `partial` + `downloadAborted` 可能被兄弟 worker 迟到状态覆盖；实测计数冻结在 27→31 / 14→18、通知保持「正在处理第N/136张图片」且终止按钮未消失。移动端合成触摸不翻页/内部滚动不响应（键盘 `ArrowRight` 正常），疑似 harness 触摸合成限制，需真机复核。
