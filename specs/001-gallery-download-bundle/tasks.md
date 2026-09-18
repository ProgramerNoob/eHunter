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

本节独立追踪新格式验收。正文同步与只读代码核对已完成；本次未运行测试，未以历史勾选代替产物验证。现有生产者已具备 `fflate` + JSON 七字段路径，因此不新增重复实现任务。旧规格与实现的时间格式、顺序抓取差异记录于 `plan.md`，仍需另行落实或验收。

- [ ] T036 [US1] 按 `specs/001-gallery-download-bundle/quickstart.md` 的 P1 步骤验证单包与 300 页/默认 200 的多包产物：ZIP 可解压，每包根目录只有一个 UTF-8 `metadata.json` 元信息文件，恰含七字段且类型正确，非 ASCII 标题保真，单包分片字段为 1/1，多包为 2 和对应的 1/2，后续分包独立可读、任务级字段一致；在 `specs/001-gallery-download-bundle/plan.md` 记录产物证据及与 `contracts/gallery-download.openapi.yaml` 的核对结果。
- [ ] T037 [US1] 在 `core/service/GalleryDownloadService.ts` 核对实际打包路径仍沿用 `fflate` 与原生 JSON 序列化，按 `specs/001-gallery-download-bundle/quickstart.md` 完成两个视口及书页/卷轴、通知和失败路径回归；在 `specs/001-gallery-download-bundle/plan.md` 记录本轮结果，保留未满足的原有要求，符合验收后再勾选。
