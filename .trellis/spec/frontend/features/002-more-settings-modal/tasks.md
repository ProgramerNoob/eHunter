<!-- migration-note:start -->
> 迁移来源：`specs/002-more-settings-modal/tasks.md`（基线 `647ff26`）。正文保全，路径已重定位；命令与源码路径均从仓库根目录解释。
> 阅读顺序与状态：先读[功能索引](../index.md)及[已确认决策](../../decisions/2026-09-18-reader-behavior.md)；决策覆盖到的旧约定以决策为准。Draft、任务勾选、独立验收清单各自保留，不证明当前版本通过验收。
> 文中的 plan/research/tasks、原始 Input、日期及“本次/当前”描述均保留原记录时态；历史实现路径、代码示例、依赖版本和 `.tmp/` 证据不代表本轮已核实或可获取。迁移未执行产品验收，也未补造缺失产物。
<!-- migration-note:end -->

# Tasks: 统一更多设置弹窗

**同步状态（2026-09-18）**：正文、模型、契约与验收步骤已同步 [已确认决策](../../decisions/2026-09-18-reader-behavior.md) 第 2–4 节。本次仅更新文档；Phase 1–6、Checkpoint 及示例保留历史原文与勾选。T005/T008 的回退/存储及 T024/T033 的重置须按新规则核对，旧勾选不证明 GM 跨站共享、逐项迁移及重置防复活已通过；其他未冲突要求继续有效。

## 2026-09-18 后续任务（当前）

下一步：T039–T044 均已完成；其余历史未完成任务（快捷设置/快捷键组交互细节等）仍需处理。

- [x] T039 在 `vite.config.prod.ts`、`src/platform/base/service/PlatformService.js` 与 `core/store/app.ts` 核对并补齐 GM 存储能力、生产权限与按 origin 降级，保留旧数据用于回退。（2026-09-18 完成：banner 补齐 GM 存储 grant；GM 优先、按 origin 降级与 `storageClear(prefix)` 已实现；EH↔EX 实测 GM 共享生效、两站点 localStorage 快照不再被改写。）
- [x] T040 在 `core/store/app.ts` 实现逐项迁移、合法共享优先、统一旧值与独立旧值补缺、GM 恢复规则、幂等及重置防复活；维持既有二次确认语义。（2026-09-18 完成：迁移标记与逐项补缺已实现；dev 页实测首站导入、幂等、重置防复活与无效值修复，EH 真实环境实测导入与幂等。）
- [x] T041 按 `.trellis/spec/frontend/features/002-more-settings-modal/quickstart.md` 完成 EH/EX/NH 真实脚本环境的共享/降级矩阵、桌面移动弹窗回归与相关设置专项；记录证据后更新任务。（2026-09-18 完成：EH/EX/NH 真实脚本环境覆盖共享与幂等、EX 冲突不覆盖、共享缺项补站内旧值、GM 恢复、无 GM 按 origin 降级与隔离、GM 可用与降级两态重置（含防复活、取消路径）、桌面与移动弹窗回归、左侧导航定位、关闭保留阅读位置、语言写入与跨站共享。证据：`.tmp/t041/t041-evidence.md` 与同目录 round17–round27 结果 JSON/截图。未覆盖：快捷设置/快捷键组交互细节，属各自功能专项。）
- [x] T042 修正共享值非法时的补齐语义：`core/store/app.ts` 原 `normalizeClampedInteger` 把越界整数 clamp 成合法值（如 `magnifierAreaSize: 999` → `300`）并视为已提供，导致不再从站点旧值补齐。（2026-09-19 完成：改为 `normalizeIntegerInRange`，仅接受范围内整数，越界返回 `undefined` 等同缺失；`magnifierZoom` 2–5、`magnifierAreaSize` 20–300。验收：`.tmp/t042/round4-notes.md` 第二节 T042-P1/P2/P3/P4，越界值从站点旧值补齐→`120`，无旧值→默认 `80`，合法值 `200/5` 与边界 `20/2` 保留。）
- [x] T043 收敛迁移后独立翻页记录的写入：原 `readPageTurnAnimationMode()` 在迁移完成后仍写 `page-turn-animation` 记录，与迁移进 `unified-settings` 的值并存不一致。（2026-09-19 完成：读取顺序改为共享 unified 合法值 → 共享独立记录 → 本站独立记录 → 计算默认并持久化。验收：T043-P5 unified 有值时不再产生独立记录；P6 无来源时仍计算并持久化且两侧一致。）
- [x] T044 修正首站语言被浏览器语言覆盖：欢迎提示未展示时 `checkInstructions()` 按浏览器 locale 设置 `lang`，使共享或迁移得到的 `lang` 首次不生效。（2026-09-19 完成：新增 `hasStoredLangPreference()`，已存合法 `lang` 时跳过浏览器 locale 初始化。验收：T044-P7 `jp` 保持、P8 迁移 `en` 生效、P9 无存储仍按浏览器语言取 `cn`；真实 TM 实测语言跨重载保持且复原，见 `.tmp/t042/round4-notes.md` 第三、四节。）

**Input**: Design documents from `.trellis/spec/frontend/features/002-more-settings-modal/`
**Prerequisites**: `.trellis/spec/frontend/features/002-more-settings-modal/plan.md`, `.trellis/spec/frontend/features/002-more-settings-modal/spec.md`, `.trellis/spec/frontend/features/002-more-settings-modal/research.md`, `.trellis/spec/frontend/features/002-more-settings-modal/data-model.md`, `.trellis/spec/frontend/features/002-more-settings-modal/contracts/settings-modal.openapi.yaml`

**Tests**: Spec未要求先写自动化测试；本任务单以类型检查 + `npm run dev` + `ego-browser` 运行时验收为主。

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Descriptions include exact file paths

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 对齐统一设置弹窗的文档契约与实现入口，建立开发骨架。

- [X] T001 Create unified settings component scaffold in `core/components/MoreSettingsDialog.vue`
- [X] T002 [P] Add placeholder icon asset for more-settings entry in `core/assets/svg/more-settings.svg`
- [X] T003 [P] Add i18n keys scaffold for modal categories/actions in `core/assets/i18n.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 完成所有用户故事共享的数据结构、状态流和持久化约束。

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Define settings category and item metadata model in `core/store/app.ts`
- [X] T005 Implement schema-versioned preference snapshot and invalid-value fallback in `core/store/app.ts`
- [X] T006 Implement global quick-setting order data model with pinned reading-mode rule in `core/store/app.ts`
- [X] T007 Add modal open/close and active-category state/actions in `core/store/app.ts`
- [X] T008 [P] Wire userscript-first persistence fallback path for new settings keys in `src/platform/base/service/PlatformService.js`
- [X] T009 [P] Define factory-reset operation states and error feedback model in `core/store/app.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 打开并使用统一设置入口 (Priority: P1) 🎯 MVP

**Goal**: 顶栏新增统一“更多设置”图标并打开弹窗，支持左侧分类跳转、右侧平滑滚动与高亮，且删除旧二层更多设置交互。

**Independent Test**: 点击顶栏图标打开/关闭弹窗；点击左侧分类可平滑定位并高亮；确认旧二层更多设置区域不再出现。

### Implementation for User Story 1

- [X] T010 [US1] Add new more-settings icon button and click binding in `core/components/TopBar.vue`
- [X] T011 [US1] Remove legacy second-row more-settings expand behavior in `core/components/TopBar.vue`
- [X] T012 [US1] Mount `MoreSettingsDialog` from top bar and bind visibility state in `core/components/TopBar.vue`
- [X] T013 [US1] Implement two-column modal shell and section anchor layout in `core/components/MoreSettingsDialog.vue`
- [X] T014 [US1] Implement smooth category jump and active-category highlight sync in `core/components/MoreSettingsDialog.vue`
- [X] T015 [US1] Implement responsive behavior (desktop two-column, narrow-screen compact category jump) in `core/components/MoreSettingsDialog.vue`
- [X] T016 [US1] Update top-bar and modal interaction style rules in `core/components/TopBar.vue`
- [X] T017 [US1] Validate US1 runtime flow with dev server and browser checks in `.trellis/spec/frontend/features/002-more-settings-modal/quickstart.md`

**Checkpoint**: User Story 1 is fully functional and independently testable

---

## Phase 4: User Story 2 - 按分类配置阅读参数 (Priority: P2)

**Goal**: 将通用/滚动模式/书页模式/其他分组中的全部现有可配置项迁移至统一弹窗，并实现“清空缓存并重置全部设置”确认执行。

**Independent Test**: 在弹窗内逐分类核对和修改配置，变更可立即生效并持久化；“其他”中的 github/版本/重置流程按规格生效。

### Implementation for User Story 2

- [X] T018 [P] [US2] Add missing category and setting labels/tips for CN/EN/JP in `core/assets/i18n.ts`
- [X] T019 [US2] Render General section controls (language, load number, auto source retry) in `core/components/MoreSettingsDialog.vue`
- [X] T020 [US2] Render Scroll Mode section controls from existing configurable set in `core/components/MoreSettingsDialog.vue`
- [X] T021 [US2] Render Book Mode section controls from existing configurable set in `core/components/MoreSettingsDialog.vue`
- [X] T022 [US2] Render Other section with github link and version display in `core/components/MoreSettingsDialog.vue`
- [X] T023 [US2] Implement confirm-before-execute factory-reset dialog flow in `core/components/MoreSettingsDialog.vue`
- [X] T024 [US2] Execute clear-cache plus reset-all-settings action and state refresh in `core/store/app.ts`
- [X] T025 [US2] 重置流程复用平台存储清理范围：`PlatformService.storageClear` 支持多前缀，`runFactoryReset` 同时清当前键与 2.x 遗留相册缓存键
  - 实现（2026-09-18，工作区版本）：`src/platform/eh/service/AlbumCacheService.ts` 存在，但只被同属历史文件的 `src/platform/eh/service/AlbumServiceImpl.old.ts` 引用，活链路无引用（[factory.ts](../../../../../src/platform/factory.ts) 用的是 `./eh/service/AlbumServiceImpl`）；该模块依赖 `core_old/service/storage/LocalStorage` → `core_old/service/storage/base/Storage.js` → `react-native-storage`（`package.json` 未声明、`node_modules` 未安装），因此不复活旧模块，只复用其键语义 `storageName = 'AlbumCache'`、`storageVersionName = 'AlbumCacheVersion'`。改动两处：`src/platform/base/service/PlatformService.js` 的 `storageClear(keyPrefix)` 扩展为接受 `string | string[]`（不传参/传 `''` 仍清空全部；数组空项被过滤，`[]` 不清任何键；传单个字符串行为与之前一致；补 JSDoc 供 TS 推断；EH/NH/TEST 共用，未改 NH 专属逻辑），`core/store/app.ts` 的 `runFactoryReset` 由 `storageClear('ehunter:')` 改为 `storageClear(['ehunter:', 'AlbumCache'])`。
  - 验证（dev 页，桌面 1200×900 DPR1 + 移动 390×844 DPR3 触摸，证据见 `.tmp/t025/`）：种子 `AlbumCache`、`AlbumCacheVersion`、`ehunter:reader:prefs:page-turn-animation__mirror`、`site_owned_key` 后走「更多设置 → 其他 → 重置缓存和数据 → 确定」，reload 后 3 个 eHunter/遗留键被删、`site_owned_key` 保留；设置回到默认（widthScale 95→80、loadNum 9→3、volumeSize 33→100 等）并写入 `legacy-migration = { schemaVersion: 1, legacyImport: 'blocked' }` 阻止旧副本复活；移动端 `page-turn-animation` 按移动默认回到 `slide`；取消路径键值与设置均不变；控制台仅第三方 `jp.animesales.xyz/ehunter/update.json` 检查失败，无 eHunter 异常、无 Vite overlay。截图 `mobile-10-other.png`、`mobile-11-confirm.png`、`mobile-12-after-reset.png`。
  - 验证（EH 真实脚本环境，`https://exhentai.org/s/80813c92df/3482416-1`，截图 `.tmp/t025/eh-desktop-21-other.png`…`eh-desktop-24-cancel.png`）：生产包（`npm run build-prod`，dist/ehunter.iife.js 438929 字节）经本机 bundle server 注入，滚动模式 1/136 页、缩略图正常；先用「自动换源重试」开关证明 GM 存储读写生效（关闭 → reload 仍关闭），再种 `ehunter:reader:prefs:unified-settings`、`ehunter:reader:prefs:page-turn-animation__mirror`、`AlbumCache`、`AlbumCacheVersion` 与站点键 `exhentai_test_marker`，重置后 4 个 eHunter/遗留键全删、站点键保留、开关回到默认开启（GM 分支被清）、首屏横幅回到默认值（滚动 / 80% / 3P / 100P）且相册仍可读；取消路径键值与设置不变；测试用站点键已清理，站点 localStorage 恢复为空。
  - 未覆盖：NH 链路实测（`storageClear` 为三平台共用，本次只扩展参数形式，未在 NH 站点回归）；真实 2.x 用户大体量 `AlbumCache` 数据的删除耗时未单独测量。
- [X] T026 [US2] Validate US2 runtime flow with category completeness and reset confirmation checks in `.trellis/spec/frontend/features/002-more-settings-modal/quickstart.md`

**Checkpoint**: User Stories 1 and 2 both work independently

---

## Phase 5: User Story 3 - 管理顶部快捷配置栏 (Priority: P3)

**Goal**: 在“快捷设置”分组实现快捷项可见性配置与拖拽排序，遵守“阅读模式固定第一位 + 全局排序 + 当前模式过滤”。

**Independent Test**: 勾选/取消快捷项并拖拽排序后，顶部快捷栏按全局顺序展示；切换阅读模式仅显示该模式适用项，固定项始终第一位。

### Implementation for User Story 3

- [X] T027 [US3] Build quick-settings management section UI in `core/components/MoreSettingsDialog.vue`
- [X] T028 [US3] Enforce pinned reading-mode item constraints (always selected, fixed order 0) in `core/store/app.ts`
- [X] T029 [US3] Implement non-pinned item selection toggle persistence in `core/store/app.ts`
- [X] T030 [US3] Implement drag-and-drop reorder for selected quick items in `core/components/MoreSettingsDialog.vue`
- [X] T031 [US3] Apply global-order plus current-mode filter projection for top quick bar in `core/components/TopBar.vue`
- [X] T032 [US3] Sync quick-action display source with new preference model in `core/components/TopBar.vue` (`topBarFields` consumes `computedVisibleQuickSettingIds` from `core/store/app.ts`)
- [X] T033 [US3] Add reset/fallback handling for invalid quick-order snapshots in `core/store/app.ts`
- [X] T034 [US3] Validate US3 runtime flow for ordering/filtering/pinned-item rules in `.trellis/spec/frontend/features/002-more-settings-modal/quickstart.md`

**Checkpoint**: All user stories are independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 完成跨故事一致性、文档回填与最终验收。

- [X] T035 [P] Normalize modal visual spacing, typography, and responsive polish in `core/components/MoreSettingsDialog.vue`
- [ ] T036 [P] Clean up obsolete i18n keys/usages related to removed second-row settings in `core/assets/i18n.ts`
- [ ] T037 Run type validation for final changes with `npm run type-check` from `package.json`
- [X] T038 Run runtime verification with `npm run dev` and browser checks documented in `.trellis/spec/frontend/features/002-more-settings-modal/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies, starts immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1, blocks all story work.
- **Phase 3 (US1)**: Depends on Phase 2 completion.
- **Phase 4 (US2)**: Depends on Phase 2 completion; can run after US1 MVP validation.
- **Phase 5 (US3)**: Depends on Phase 2 completion; should integrate after US1 UI shell exists.
- **Phase 6 (Polish)**: Depends on selected story completion (US1 for MVP, US1+US2+US3 for full scope).

### User Story Dependencies

- **US1 (P1)**: Independent after foundational phase; no dependency on US2/US3.
- **US2 (P2)**: Independent functional slice after foundational phase; reuses US1 modal shell.
- **US3 (P3)**: Independent behavior slice after foundational phase; relies on modal presence and store primitives.

### Dependency Graph

- Setup -> Foundational -> US1 (MVP)
- Setup -> Foundational -> US2
- Setup -> Foundational -> US3
- US1 + US2 + US3 -> Polish

---

## Parallel Opportunities

- **Setup**: T002 and T003 can run in parallel.
- **Foundational**: T008 and T009 can run in parallel with T004-T007 once state model skeleton exists.
- **US2**: T018 can run in parallel with T019-T022.
- **Polish**: T035 and T036 can run in parallel.

## Parallel Example: User Story 1

```bash
Task: "T013 Implement two-column modal shell in core/components/MoreSettingsDialog.vue"
Task: "T016 Update top-bar and modal interaction style rules in core/components/TopBar.vue"
```

## Parallel Example: User Story 2

```bash
Task: "T018 Add missing category and setting labels in core/assets/i18n.ts"
Task: "T022 Render Other section with github/version in core/components/MoreSettingsDialog.vue"
```

## Parallel Example: User Story 3

```bash
Task: "T029 Implement quick-item selection persistence in core/store/app.ts"
Task: "T030 Implement drag-and-drop reorder in core/components/MoreSettingsDialog.vue"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1) and run T017.
3. Stop and validate: modal entry, category jump/highlight, and removal of old second-row settings.

### Incremental Delivery

1. Deliver MVP with US1.
2. Add US2 for full category migration and destructive reset flow.
3. Add US3 for quick-setting management and ordering/filtering rules.
4. Finish with Phase 6 cross-cutting polish and runtime verification.

### Parallel Team Strategy

1. One developer handles store foundational work (T004-T009).
2. After foundation:
   - Dev A: US1 (entry/modal shell)
   - Dev B: US2 (category migrations + reset flow)
   - Dev C: US3 (quick settings behavior)
3. Merge in priority order with checkpoint validation per story.

---

## Notes

- Every task line follows required checklist format with Task ID and file path.
- [P] tasks are parallel-safe by file/dependency separation.
- [USx] labels are used only in user story phases.
- Runtime validation (`npm run dev` + `ego-browser`) is mandatory before completion.
