---

description: "Task list for 书页模式翻页动效开关"
---

# Tasks: 书页模式翻页动效开关

**同步状态（2026-09-18）**：正文、模型、契约与验收步骤已同步 [已确认决策](../decisions/2026-09-18-reader-behavior.md) 第 2、3 节。本次仅更新文档；Phase 1–6、Checkpoint 及交付示例保留历史原文与勾选，不能证明新规则已实现或验收。T004/T006/T010/T025 的默认/回退规则、US1 默认拟真与 US3 无效回退的旧验收描述均以新决策为准；其他未冲突要求继续有效。

## 2026-09-18 后续任务（当前）

先完成设置组 T039–T040 的存储基础，再实现动效规则，最后统一验收；其余历史未完成任务仍需处理。

- [ ] T035 在 `core/store/app.ts` 落实合法偏好优先、逐项补缺后按系统/设备初始化并保存实际值；保留合法旧默认，系统变化和保存其他设置不重算。
- [ ] T036 按 `specs/001-add-pageflip-toggle/quickstart.md` 验证首次矩阵、所有合法旧值、坏值补缺、重开、用户选择与两个阅读模式回归；跨站存储用设置组矩阵，记录证据后更新任务。

**Input**: Design documents from `specs/001-add-pageflip-toggle/`
**Prerequisites**: `specs/001-add-pageflip-toggle/plan.md`, `specs/001-add-pageflip-toggle/spec.md`, `specs/001-add-pageflip-toggle/research.md`, `specs/001-add-pageflip-toggle/data-model.md`, `specs/001-add-pageflip-toggle/contracts/page-turn-animation.openapi.yaml`

**Tests**: Spec 未显式要求先写自动化测试；本任务以类型检查 + 运行时手动验收为主。

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 对齐规格、计划与现有代码入口，准备任务执行上下文。

- [X] T001 核对功能边界与验收标准 in `specs/001-add-pageflip-toggle/spec.md`
- [X] T002 对齐技术决策与实现范围 in `specs/001-add-pageflip-toggle/plan.md` and `specs/001-add-pageflip-toggle/research.md`
- [X] T003 记录任务执行基线与验收路径 in `specs/001-add-pageflip-toggle/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 建立所有用户故事共享的动效状态、配置和翻页管线基础。

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 在 `core/store/app.ts` 新增翻页动效全局状态、默认值与枚举配置（realistic/slide/none）
- [X] T005 [P] 在 `core/assets/i18n.ts` 新增翻页动效开关与三种选项的多语言文案键
- [X] T006 在 `core/store/app.ts` 新增翻页动效设置 action（读取、设置、无效值回退）
- [X] T007 在 `core/store/event.ts` 将点击/滚轮/键盘/自动翻页统一到同一翻页入口
- [X] T008 在 `core/components/AlbumBookView.vue` 建立统一动效模式映射（按模式输出 transition name）
- [X] T009 在 `core/components/TopBar.vue` 预留书页模式“翻页动效”设置项绑定（仅结构接入，不实现细节）

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - 拟真翻页阅读 (Priority: P1) 🎯 MVP

**Goal**: 在书页模式默认启用拟真翻页，并确保前后翻页行为正确。

**Independent Test**: 在书页模式保持默认设置连续翻页，确认始终为拟真翻页且页码变化正确。

### Implementation for User Story 1

- [X] T010 [US1] 在 `core/store/app.ts` 将默认翻页动效固定为 realistic 并保证初始化生效
- [X] T011 [P] [US1] 在 `core/components/AlbumBookView.vue` 实现 realistic 模式下的进入/离开动画类
- [X] T012 [US1] 在 `core/components/AlbumBookView.vue` 将翻页方向与 realistic 动效方向正确联动
- [X] T013 [US1] 在 `core/store/event.ts` 处理高频翻页时“最新意图优先”并避免页码错乱
- [X] T014 [US1] 在 `core/components/AlbumBookView.vue` 补齐首页/末页边界翻页保护与展示一致性
- [X] T015 [US1] 运行 `npm run dev` 并通过浏览器验收 US1 默认拟真翻页（覆盖点击/滚轮/键盘）

**Checkpoint**: User Story 1 is fully functional and independently testable

---

## Phase 4: User Story 2 - 动效模式切换 (Priority: P2)

**Goal**: 提供“拟真翻页 / 平移翻页 / 无动效”开关并在下一次翻页即时生效。

**Independent Test**: 在书页模式切换三种模式并翻页，动效表现与选项一致。

### Implementation for User Story 2

- [X] T016 [US2] 在 `core/store/app.ts` 补充翻页动效选项列表供 TopBar 下拉控件使用
- [X] T017 [US2] 在 `core/components/TopBar.vue` 完成“翻页动效”设置项 UI 与 store 绑定
- [X] T018 [P] [US2] 在 `core/assets/i18n.ts` 补全动效名称与提示文案（CN/EN/JP）
- [X] T019 [US2] 在 `core/components/AlbumBookView.vue` 实现 slide 模式动效（方向一致、过渡可见）
- [X] T020 [US2] 在 `core/components/AlbumBookView.vue` 实现 none 模式（直接切页无过渡）
- [X] T021 [US2] 在 `core/components/AlbumBookView.vue` 保证模式切换后从下一次翻页立即应用新模式
- [X] T022 [US2] 运行 `npm run dev` 并通过浏览器验收 US2 三档切换与边界行为

**Checkpoint**: User Stories 1 and 2 both work independently

---

## Phase 5: User Story 3 - 设置持续生效 (Priority: P3)

**Goal**: 将翻页动效作为全局偏好持久化，重进阅读后仍保持上次选择。

**Independent Test**: 修改动效后重进阅读，确认设置保持且无效值会回退默认拟真。

### Implementation for User Story 3

- [X] T023 [US3] 在 `src/platform/base/service/PlatformService.js` 确认并复用可用存储接口（userscript 优先，localStorage 降级）
- [X] T024 [US3] 在 `core/store/app.ts` 实现翻页动效偏好的读取、写入与 schema/version 字段管理
- [X] T025 [US3] 在 `core/store/app.ts` 实现非法值校验与回退到 realistic 的自愈逻辑
- [X] T026 [US3] 在 `core/store/app.ts` 初始化流程中接入偏好恢复，确保书页模式会话首次渲染即生效
- [X] T027 [US3] 在 `core/store/app.ts` 明确偏好作用域为 global，禁止按画集/会话拆分
- [X] T028 [US3] 运行 `npm run dev` 并通过浏览器验收 US3 持久化与回退场景

**Checkpoint**: All user stories are independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 完成文档、契约、性能与最终回归收口。

- [ ] T029 [P] 对齐实现与契约描述 in `specs/001-add-pageflip-toggle/contracts/page-turn-animation.openapi.yaml`
- [ ] T030 [P] 更新交付说明与验证步骤 in `specs/001-add-pageflip-toggle/quickstart.md`
- [X] T031 在 `core/components/AlbumBookView.vue` 清理无用过渡样式并统一命名
- [ ] T032 在 `core/store/app.ts` 与 `core/components/TopBar.vue` 清理临时字段/分支并补充最小注释
- [ ] T033 运行类型检查 `npm run type-check` in `.`
- [X] T034 运行 `npm run dev` 并通过浏览器验收完成全量功能回归（US1+US2+US3）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion; can run independently of US1 but建议在 US1 后执行便于回归
- **User Story 3 (Phase 5)**: Depends on Foundational completion;建议在 US2 后执行以减少集成冲突
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: 无业务依赖，MVP 最小可交付
- **US2 (P2)**: 依赖 Foundational 的动效模式映射与设置入口骨架
- **US3 (P3)**: 依赖 Foundational 的全局状态与设置 action，可独立于 US1/US2 验证持久化

### Within Each User Story

- 先完成 store/状态逻辑，再完成组件渲染与交互绑定
- 完成代码后必须执行 `npm run dev` + `ego-browser` 手动验收
- 每个故事通过独立验收后再进入下一个优先级

### Parallel Opportunities

- **Foundational**: T005 可与 T004/T006 并行；T008 可在 T007 后并行推进
- **US1**: T011 可与 T013 并行，之后汇合到 T012/T014
- **US2**: T018 可与 T016/T017 并行；T019 与 T020 可并行
- **US3**: T023 可与 T024 前置调研并行，T025/T026/T027 依次收敛
- **Polish**: T029 与 T030 可并行

---

## Parallel Example: User Story 1

```bash
Task: "T011 [US1] Implement realistic transition classes in core/components/AlbumBookView.vue"
Task: "T013 [US1] Implement latest-intent page-turn guard in core/store/event.ts"
```

## Parallel Example: User Story 2

```bash
Task: "T018 [US2] Add i18n labels in core/assets/i18n.ts"
Task: "T019 [US2] Implement slide transition in core/components/AlbumBookView.vue"
Task: "T020 [US2] Implement no-animation mode in core/components/AlbumBookView.vue"
```

## Parallel Example: User Story 3

```bash
Task: "T023 [US3] Confirm storage interface in src/platform/base/service/PlatformService.js"
Task: "T024 [US3] Implement preference persistence in core/store/app.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Run `npm run dev` + `ego-browser` and validate US1 independently
5. Demo MVP behavior (default realistic page turn)

### Incremental Delivery

1. Setup + Foundational
2. Deliver US1 (default realistic)
3. Deliver US2 (three-mode switch)
4. Deliver US3 (global persistence + fallback)
5. Complete Polish and full regression

### Parallel Team Strategy

1. One developer completes Setup + Foundational
2. Then split by story:
   - Developer A: US1
   - Developer B: US2
   - Developer C: US3
3. Merge and run Phase 6 full validation

---

## Notes

- All tasks follow required checklist format with ID, optional `[P]`, and story label where applicable
- User story tasks include concrete file paths and independently testable outcomes
- Runtime validation (`npm run dev` + `ego-browser`) is mandatory per constitution
