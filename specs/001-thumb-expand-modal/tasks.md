# Tasks: Thumb Expand Modal

**Input**: Design documents from `specs/001-thumb-expand-modal/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: 规格未要求先写自动化测试；本任务单以实现与手动验收为主，并保留 `npm run type-check`、`npm run dev`、`ego-browser` 验证任务。

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 建立本特性所需的最小代码骨架与共享模型

- [X] T001 Create modal component scaffold in `core/components/dialog/ThumbExpandDialog.vue`
- [X] T002 [P] Create thumb-expand shared model/types in `core/model/thumbExpand.ts`
- [X] T003 [P] Add dialog style token placeholders for thumb-expand in `core/style/_variables.scss`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 打通所有故事共用的状态与挂载链路

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Add thumb-expand modal state/actions (open, close, segment index, highlighted page) in `core/store/app.ts`
- [X] T005 [P] Mount `ThumbExpandDialog` in main reader tree and bind base props/events in `core/components/ReaderView.vue`
- [X] T006 [P] Implement segment clamp/default helpers (segment size = 100) in `core/model/thumbExpand.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 快速展开全部缩略图 (Priority: P1) 🎯 MVP

**Goal**: 用户在 ThumbScrollView 任意滚动位置都能通过浮动入口打开无标题弹层

**Independent Test**: 在纵向/横向 ThumbScrollView 中滚动到任意位置，验证入口固定在可视区域底部/右侧，点击后弹层可打开且无标题。

### Implementation for User Story 1

- [X] T007 [US1] Add floating expand trigger and click handler in `core/components/ThumbScrollView.vue`
- [X] T008 [US1] Add viewport-anchored placement styles for bottom/right dock in `core/components/ThumbScrollView.vue`
- [X] T009 [US1] Implement titleless modal shell (open/close/backdrop/close affordance) in `core/components/dialog/ThumbExpandDialog.vue`
- [X] T010 [US1] Wire trigger-to-modal open flow between thumb panel and reader container in `core/components/ReaderView.vue`

**Checkpoint**: User Story 1 should be fully functional and independently testable

---

## Phase 4: User Story 2 - 高密度浏览全部缩略图 (Priority: P2)

**Goal**: 弹层以高密度展示缩略图，满足 5/3 列规则和 5 列下至少 4 行可见规则，并贴合设置类弹窗风格

**Independent Test**: 打开弹层后，宽屏显示 5 列且首屏至少 4 行；窄屏显示 3 列；每项都显示图片和底部页码；风格贴合设置类弹窗。

### Implementation for User Story 2

- [X] T011 [US2] Render thumbnail grid item structure with bottom page index label in `core/components/dialog/ThumbExpandDialog.vue`
- [X] T012 [US2] Implement responsive grid rules (5 columns on wide, 3 columns on narrow) in `core/components/dialog/ThumbExpandDialog.vue`
- [X] T013 [US2] Enforce minimum 4 visible rows in five-column mode via modal layout sizing in `core/components/dialog/ThumbExpandDialog.vue`
- [X] T014 [P] [US2] Finalize settings-dialog visual tokens for modal shell in `core/style/_variables.scss`
- [X] T015 [US2] Apply settings-dialog style profile (backdrop, radius, spacing, states) in `core/components/dialog/ThumbExpandDialog.vue`
- [X] T016 [US2] Add thumbnail error placeholder while preserving page-number visibility in `core/components/dialog/ThumbExpandDialog.vue`

**Checkpoint**: User Stories 1 and 2 both work independently

---

## Phase 5: User Story 3 - 分页与跳转定位 (Priority: P3)

**Goal**: 支持每 100 页分段分页，点击缩略图后关闭弹层并跳转目标页

**Independent Test**: 在 >100 页内容中切换分页分段并点击缩略图，验证分段切换、弹层关闭、页码跳转和当前页高亮行为。

### Implementation for User Story 3

- [X] T017 [US3] Integrate `Pagination` for bottom segment navigation in `core/components/dialog/ThumbExpandDialog.vue`
- [X] T018 [P] [US3] Implement segment slicing and current-page default segment selection in `core/model/thumbExpand.ts`
- [X] T019 [US3] Sync modal segment/highlight state with reader current page in `core/store/app.ts`
- [X] T020 [US3] Emit thumbnail selection event with target page from `core/components/dialog/ThumbExpandDialog.vue`
- [X] T021 [US3] Handle thumbnail selection to close modal and jump page in `core/components/ReaderView.vue`
- [X] T022 [US3] Keep single-segment pagination visible for pageCount <= 100 in `core/components/dialog/ThumbExpandDialog.vue`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 收敛跨故事一致性与最终验收

- [X] T023 [P] Align `spec.md` and quick verification notes with final behavior in `specs/001-thumb-expand-modal/quickstart.md`
- [X] T024 Run static type validation with `npm run type-check` from project root using `package.json`
- [X] T025 Run `npm run dev` and perform browser verification of runtime flows, then record results in `specs/001-thumb-expand-modal/quickstart.md`
- [X] T026 Verify no unintended changes outside planned files using `specs/001-thumb-expand-modal/plan.md` as scope baseline

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion and can run after US1 baseline modal exists
- **User Story 3 (Phase 5)**: Depends on Foundational completion and modal/grid baseline from US1/US2
- **Polish (Phase 6)**: Depends on all selected user stories being complete

### User Story Dependencies

- **US1 (P1)**: Start first after Phase 2, no dependency on other stories
- **US2 (P2)**: Uses US1 modal shell but remains independently testable
- **US3 (P3)**: Uses modal/grid baseline and store wiring; independently testable once implemented

### Contract Mapping

- `/reader/thumb-expand/open` -> US1 (`T009`, `T010`)
- `/reader/thumb-expand/state` -> US1/US3 (`T004`, `T019`)
- `/reader/thumb-expand/segments/{segmentIndex}` -> US3 (`T017`, `T018`, `T022`)
- `/reader/thumb-expand/jump` -> US3 (`T020`, `T021`)

### Data Model Mapping

- `ExpandEntry` -> US1 (`T007`, `T008`)
- `ThumbnailModalState` -> Foundational + US3 (`T004`, `T019`)
- `ThumbnailItem` -> US2 (`T011`, `T016`)
- `ThumbnailSegment` -> Foundational + US3 (`T006`, `T017`, `T018`)

### Parallel Opportunities

- Phase 1: `T002` and `T003` can run in parallel after `T001`
- Phase 2: `T005` and `T006` can run in parallel after `T004`
- US2: `T014` can run in parallel with `T011`/`T012`/`T013`
- US3: `T018` can run in parallel with `T017`
- Polish: `T023` can run in parallel with `T024`

---

## Parallel Example: User Story 1

```bash
Task: "T007 [US1] Add floating expand trigger in core/components/ThumbScrollView.vue"
Task: "T009 [US1] Implement titleless modal shell in core/components/dialog/ThumbExpandDialog.vue"
```

## Parallel Example: User Story 2

```bash
Task: "T011 [US2] Render thumbnail grid item structure in core/components/dialog/ThumbExpandDialog.vue"
Task: "T014 [P] [US2] Finalize modal visual tokens in core/style/_variables.scss"
```

## Parallel Example: User Story 3

```bash
Task: "T017 [US3] Integrate Pagination in core/components/dialog/ThumbExpandDialog.vue"
Task: "T018 [P] [US3] Implement segment slicing helpers in core/model/thumbExpand.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2
2. Complete Phase 3 (US1)
3. Validate US1 independently with `npm run dev` + `ego-browser`
4. Demo/commit MVP

### Incremental Delivery

1. Deliver US1 (entry + open modal)
2. Deliver US2 (dense responsive grid + style parity)
3. Deliver US3 (pagination + jump close)
4. Execute Phase 6 polish and final validation

### Parallel Team Strategy

1. One developer completes Setup + Foundational
2. Then split work:
   - Dev A: US2 visual density/style tasks
   - Dev B: US3 pagination/jump tasks
3. Merge for final polish and manual runtime verification

---

## Notes

- [P] tasks = different files, no blocking dependency on incomplete tasks
- [USx] labels keep traceability to user stories and acceptance criteria
- Avoid changes to `core_old/` and `old/`
- Final completion requires runtime verification (`npm run dev` + `ego-browser`)
