# Tasks: PageView Magnifier Menu

**Input**: Design documents from `specs/001-add-pageview-magnifier/`\
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/pageview-magnifier.openapi.yaml`, `quickstart.md`

**同步状态（2026-09-18）**：规格正文已同步 [已确认决策](../decisions/2026-09-18-reader-behavior.md) 第 3、4 节；本次仅编辑文档，未执行实现或验收。Phase 1–6 中的已勾条目、Checkpoint、并行示例与交付顺序保留历史原文，不表示当前版本满足新规则。
**已被决策替代**：T005/T018 的倍率仅内存继承、T015 的旧容器边界策略、T016 的固定 80×80，以及 Phase 4 的旧 Independent Test/并行示例，冲突部分按 Phase 7 重新实施与验收。T001/T020/T029/T030 的历史文档勾选也不证明新规则通过。未冲突的手势、桌面范围、菜单、样式和阅读要求继续有效。

**Tests**: 不新增自动化测试任务；本特性按规格要求执行 `npm run type-check` + `npm run dev` + `ego-browser` 手动验收。\
**Organization**: Tasks are grouped by user story for independent implementation and verification.

## Format: `[ID] [P?] [Story] Description`

- [P] = 可并行（不同文件且无未完成依赖）
- [Story] = 用户故事标签（`[US1]`, `[US2]`, `[US3]`）
- 每个任务都包含明确文件路径

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 准备本特性的开发与验收基线。

- [X] T001 对齐特性契约与验收基线并更新 `specs/001-add-pageview-magnifier/quickstart.md`
- [X] T002 记录页面菜单与放大镜实现入口说明到 `specs/001-add-pageview-magnifier/plan.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 提供所有用户故事共享的基础交互与状态框架。  
**⚠️ CRITICAL**: 完成前不得开始 US1/US2/US3 实装。

- [X] T003 在 `core/components/PageView.vue` 建立 PageView 菜单触发统一入口（scroll click / mobile long-press 500ms / book center click）
- [X] T004 [P] 在 `core/components/PageView.vue` 建立 `PageViewInteractionContext` 与 `PageMenuActionItem` 计算骨架
- [X] T005 [P] 在 `core/components/PageView.vue` 建立 `MagnifierState` 与 `MagnifierSessionPreference` 会话继承骨架（默认关闭 + 3x）
- [X] T006 在 `core/components/PageView.vue` 接入并统一 `MoreMenuPopover` 打开/关闭生命周期
- [X] T007 在 `core/components/PageView.vue` 增加平台能力判定桥接（用于“加载原图”可用态）

**Checkpoint**: 菜单触发、动作集合、放大镜状态、会话继承与平台能力判定基础均已可用。

---

## Phase 3: User Story 1 - 快速打开页面菜单 (Priority: P1) 🎯 MVP

**Goal**: 用户在滚动/书页模式下按设备习惯稳定打开 PageView 菜单，且不破坏原有翻页行为。  
**Independent Test**: 滚动桌面单击可开菜单；滚动移动端仅长按 500ms 触发；书页模式仅现有中间留白区命中时开菜单，非该区域维持翻页。

### Implementation for User Story 1

- [X] T008 [US1] 在 `core/components/PageView.vue` 实现滚动模式桌面端图片单击打开菜单
- [X] T009 [US1] 在 `core/components/PageView.vue` 实现移动端长按 500ms 打开菜单与取消条件（位移>10px/滚动/抬起/取消/多指）
- [X] T010 [P] [US1] 在 `core/components/BookPageView.vue` 复用现有中间留白区命中规则并仅在命中时触发 PageView 菜单
- [X] T011 [US1] 在 `core/components/PageView.vue` 处理菜单开关时的事件冲突（阻止误触发翻页与重复触发）
- [X] T012 [US1] 在 `specs/001-add-pageview-magnifier/quickstart.md` 补充 US1 独立验收步骤与预期结果

**Checkpoint**: US1 可独立演示并通过手势/区域触发验收。

---

## Phase 4: User Story 2 - 使用放大镜查看细节 (Priority: P2)

**Goal**: 桌面端用户可在当前 PageView 内开启放大镜、跟随鼠标查看细节并切换倍率。  
**Independent Test**: 桌面端菜单可开关放大镜；显示 80x80 焦点框；倍率仅 2x/3x/4x/5x；靠边自动翻侧且不遮挡鼠标；跨页继承开关和倍率。

### Implementation for User Story 2

- [X] T013 [US2] 在 `core/components/PageView.vue` 实现放大镜开关动作与菜单文案联动（打开/关闭放大镜）
- [X] T014 [US2] 在 `core/components/PageView.vue` 实现放大镜鼠标跟随渲染与 PageView 内定位
- [X] T015 [US2] 在 `core/components/PageView.vue` 实现放大镜边界翻侧与容器内钳制逻辑（默认右侧，越界换侧）
- [X] T016 [P] [US2] 在 `core/components/PageView.vue` 实现 80x80 半透明白色焦点框显示/隐藏与位置同步
- [X] T017 [US2] 在 `core/components/PageView.vue` 实现倍率调整动作（2x/3x/4x/5x）与边界档位保护
- [X] T018 [US2] 在 `core/components/PageView.vue` 实现会话内跨 PageView 继承放大镜开关和倍率（仅内存态）
- [X] T019 [P] [US2] 在 `core/components/PageView.vue` 与 `core/style/_variables.scss` 完成放大镜主题绿色边框+阴影样式与焦点框透明度样式
- [X] T020 [US2] 在 `specs/001-add-pageview-magnifier/quickstart.md` 补充 US2 独立验收步骤与边界场景

**Checkpoint**: US2 可独立演示并完成放大镜核心交互验收。

---

## Phase 5: User Story 3 - 按上下文显示菜单操作 (Priority: P3)

**Goal**: 菜单仅展示当前场景可用动作，且“加载原图”在不支持时保留禁用态与原因。  
**Independent Test**: 书页模式显示奇偶切换；滚动模式隐藏奇偶切换；移动端隐藏放大镜相关项；加载原图始终显示并按平台能力切换可用/禁用。

### Implementation for User Story 3

- [X] T021 [US3] 在 `core/components/PageView.vue` 实现菜单动作可见性矩阵（模式/设备/放大镜状态）
- [X] T022 [US3] 在 `core/components/PageView.vue` 实现“加载原图”始终显示并按平台能力启用或禁用
- [X] T023 [P] [US3] 在 `core/components/PageView.vue` 实现“加载原图”禁用原因文案展示（禁用态说明）
- [X] T024 [US3] 在 `core/components/PageView.vue` 接入“加载原图”动作到当前 PageView 原图源加载流程
- [X] T025 [P] [US3] 在 `core/components/BookPageView.vue` 接入书页模式“奇偶切换”菜单动作并保持滚动模式隐藏
- [X] T026 [US3] 在 `core/store/app.ts` 对接/补齐奇偶切换与原图加载所需动作调用边界
- [X] T027 [US3] 在 `specs/001-add-pageview-magnifier/quickstart.md` 补充 US3 独立验收步骤（显隐、禁用态、动作可执行）

**Checkpoint**: US3 可独立演示并通过上下文动作显隐验收。

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 跨故事收尾、回归与交付质量确认。

- [X] T028 在 `core/components/PageView.vue` 清理交互分支与重复条件，统一术语（menu/magnifier/load-original/odd-even）
- [X] T029 [P] 在 `specs/001-add-pageview-magnifier/contracts/pageview-magnifier.openapi.yaml` 对齐最终动作行为与字段说明
- [X] T030 在 `specs/001-add-pageview-magnifier/quickstart.md` 完成最终回归清单（桌面 1200x900 + 移动 390x844）
- [ ] T031 运行 `npm run type-check` 并处理问题（仓库根目录）
- [ ] T032 启动 `npm run dev` 并用 `ego-browser` 完成端到端验收与截图记录（依据 `specs/001-add-pageview-magnifier/quickstart.md`）

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 (Setup): 无依赖，可立即开始。
- Phase 2 (Foundational): 依赖 Phase 1，且阻塞全部用户故事。
- Phase 3 (US1): 依赖 Phase 2；建议先作为 MVP 完成。
- Phase 4 (US2): 依赖 Phase 2；可在 US1 后增量交付。
- Phase 5 (US3): 依赖 Phase 2；与 US2 可并行，但建议在 US1 稳定后推进。
- Phase 6 (Polish): 依赖 US1/US2/US3 目标范围完成。

### User Story Dependency Graph

- `US1 (P1) -> MVP`
- `US2 (P2) -> depends on Foundational only; can start after US1 baseline`
- `US3 (P3) -> depends on Foundational only; can run parallel with US2`

### Within Each User Story

- 先完成交互入口/状态，再补动作细节与边界处理。
- 先完成实现，再执行该故事独立验收更新到 `quickstart.md`。

## Parallel Opportunities

- Foundational: `T004` 与 `T005` 可并行。
- US1: `T010` 可与 `T008/T009` 并行。
- US2: `T016` 与 `T019` 可并行于 `T014/T015`。
- US3: `T023` 与 `T025` 可并行于 `T021/T022`。
- Polish: `T029` 可并行于 `T028`。

## Parallel Example: User Story 2

```bash
# Parallel track A (behavior)
Task: "T014 [US2] Implement pointer-follow lens rendering in core/components/PageView.vue"
Task: "T015 [US2] Implement boundary flip/clamp logic in core/components/PageView.vue"

# Parallel track B (visual + indicator)
Task: "T016 [US2] Implement 80x80 focus indicator in core/components/PageView.vue"
Task: "T019 [US2] Implement magnifier styles in core/components/PageView.vue and core/style/_variables.scss"
```

## Parallel Example: User Story 3

```bash
Task: "T023 [US3] Implement disabled reason text for Load Original in core/components/PageView.vue"
Task: "T025 [US3] Wire odd-even action for book mode in core/components/BookPageView.vue"
```

## Implementation Strategy

### MVP First (US1 Only)

1. 完成 Phase 1 + Phase 2。
2. 完成 Phase 3 (US1)。
3. 运行 `T031` + `T032` 验证 US1 独立可交付。

### Incremental Delivery

1. 交付 US1（菜单触发稳定）。
2. 交付 US2（桌面端放大镜完整体验）。
3. 交付 US3（上下文动作显隐与禁用态说明）。
4. 最后执行 Phase 6 跨故事回归与文档对齐。

## Phase 7: 2026-09-18 决策实施与验收（T033–T037 已实施，T038–T039 待验收）

**依据**：以 [决策](../decisions/2026-09-18-reader-behavior.md) 第 3、4 节及本组同步正文为准；当前静态偏差见 [plan.md](./plan.md#当前实现偏差与实施顺序)。以下新增编号与历史 T001–T032 不重用。

**状态（2026-09-18）**：T033–T037 已实现并在 dev 页（Vite 127.0.0.1:5173、ego-browser）完成对应验证，证据见各条目；T038（US2-A/B/C 验收）与 T039（T031/T032 + 跨故事回归）仍待统一验收。

- [X] T033 [US2] 在 `core/components/PageView.vue` 与 `core/store/app.ts` 统一尺寸/倍率设置和快捷动作：任意整数 20–300px、默认 80/3x、倍率四档、快捷 ±10 跨界 clamp 及边界禁用；自由整数不吸附到旧四档，设置与菜单即时一致且仅桌面提供放大镜操作。
  - 实现（2026-09-18，`core/components/PageView.vue`）：删除旧四档 `menuAreaSizeOptions`，新增 `magnifierAreaMin = 20`、`magnifierAreaMax = 300`、`magnifierAreaStep = 10`；尺寸增减按钮改用新边界禁用；`changeMagnifierAreaSize(step)` 以 `clamp(设定值 + step × 10, 20, 300)` 写回统一偏好；`core/store/app.ts` 的 `setMagnifierZoom`（2–5）与 `setMagnifierAreaSize`（20–300）负责钳制与持久化。
  - 验证（dev 页，桌面 1200×900 DPR1，`.tmp/t033/` 事件与截图）：菜单文案「关闭放大镜/原图/增大放大镜倍率/缩小放大镜倍率/增大放大镜区域/缩小放大镜区域」；设置弹窗自定义输入 83 生效、19/301 被拒、80.5 → 80；快捷 83→93→83、27→20（缩小按钮禁用）→30、295→300（增大按钮禁用）→290；倍率 3→4→5（增大禁用）→4→3→2（缩小禁用）每次一档；设置与菜单即时一致；移动视口 390×844 DPR3 长按菜单仅「原图」，无放大镜项。
- [X] T034 [US2] 在 `core/store/app.ts` 复用统一偏好保存尺寸/倍率，补齐输入及恢复的逐项合法性；协调 D04 的 GM 权限、共享、origin 降级、旧值补缺/重复迁移、GM 恢复和重置防复活，确保临时几何与开关不被持久化。依赖 D04 存储工作就绪后验收。
  - 实现：尺寸/倍率沿用统一偏好快照（`magnifierZoom`、`magnifierAreaSize` 已纳入 `unifiedSettingsValueNormalizers`、`persistUnifiedSettingsState()` 与 `migrateLegacySettingsIfNeeded()` 的逐项补缺范围），临时几何与会话开关不落盘。
  - 验证：开关切换只改 `globalThis.__ehunterMagnifierSessionState__.enabled`，快照 `updatedAt` 不变，且键集合中放大镜相关仅 `magnifierZoom`/`magnifierAreaSize`（无会话、几何临时键）；刷新后恢复的仍是已存尺寸/倍率。GM 权限、共享、origin 降级、旧值补缺、重复迁移、GM 恢复与重置防复活矩阵见 `specs/002-more-settings-modal/tasks.md` T039/T040 条目（同一存储层）。
- [X] T035 [US2] 在 `core/components/PageView.vue` 核对并补齐页面会话开关：翻页/书页卷轴切换保留，刷新/新页面关闭；只让当前交互 PageView 显示镜头，显示层清理不误改开关。
  - 实现：会话开关仅存于内存 `globalThis.__ehunterMagnifierSessionState__`，各 PageView 在挂载与 `props.index` 变化时用 `setEnabledFromSession` 恢复；镜头显隐由当前实例的指针状态驱动。
  - 验证：开 → 滚动/书页切换 → `ArrowRight`/`ArrowLeft` 翻页 → 返回滚动，全程 `session.enabled === true`；书页模式可见 2 个 PageView 时仅 1 个 `.magnifier-lens`；`page.reload()` 后 `session.enabled === false`、无镜头、菜单回到「打开放大镜」；移动视口无放大镜项。
- [X] T036 [US2] 在 `core/components/composables/useMagnifier.ts` 区分设定与有效取样尺寸，以 PageView∩viewport 计算可用区域；镜头放不下时保持倍率，同步缩小参考框与镜头（可小于 20px），优先避焦点、必要时允许覆盖以确保完整可视。
  - 实现（`useMagnifier.ts` 重写 + `PageView.vue` 镜头样式）：新增 `effectiveSampleSize`/`effectiveLensSize` 与 `getIntersectionRect()`（PageView ∩ viewport）；`lensSide = min(设定尺寸 × 倍率, min(交集宽, 交集高))`、`sampleSize = lensSide / 倍率`，始终保持「镜头边长＝实际取样边长×倍率」（可小于 20px）；`resolveLensPlacement()` 依次尝试右/左/下/上并夹紧进交集，取与参考框重叠面积最小者（优先避焦点、必要时允许覆盖，交集足够时留 `viewportPadding = 8`）；`.magnifier-lens` 外边框改为内描边 `box-shadow`，使元素盒尺寸等于镜头边长，保证边界判定与 `getBoundingClientRect()` 一致。
  - 验证（dev 页，1200×900 DPR1，`.tmp/t036/browser-events.jsonl`）：卷轴 200px/5x，视口 900 → 交集 840×717.25、实际 143.45/717.25（不变量 143.45×5 = 717.25、镜头完整落在交集内、偏好仍 200/5）；视口 600 → 83.45/417.25；视口 420 → 79.08/237.25（不变量成立、镜头底边贴合交集底边）；视口 250 → 交集高 67.25 → 参考框 13.45（小于 20px）且镜头 67.25 完整可视；视口 110 → 交集为空、参考框与镜头隐藏；书页模式 200/5（单页 525×735）→ 105/525、镜头 525×525 位于页内；恢复空间后精确回到设定值（80/3 → 80/240，200/5 → 143.45/717.25）。
- [X] T037 [US2] 在 `core/components/composables/useMagnifier.ts` 与 `core/components/PageView.vue` 接入指针、滚动、窗口和布局变化后的重算及清理；交集为空隐藏，恢复空间即恢复设定，不写回临时尺寸，并保留加载/失败占位与既有样式。
  - 实现：`onViewportChange()` 统一重算；`onMounted` 绑定 `window.resize`、`window.scroll`（capture + passive）与 `ResizeObserver`（PageView 与图片），`onBeforeUnmount` 全部解除；`renderMagnifierCanvas()` 使用有效尺寸与实际取样坐标；交集为空时关闭参考框与镜头，pending 与加载失败占位保留。
  - 验证：滚动容器 `.awesome-scroll-view.scroll-view` 的 `scrollTop += 40`（不派发 mousemove）→ 交集 717.25 → 757.25 并跟随重算；`scrollTop += 2000`（指针离开页面）→ 镜头隐藏；回到原位并移动指针 → 恢复 143.45/717.25；视口 1200×900 → 600 → 420 → 900×900 → 1200×900 循环后精确恢复 80/240；书页↔卷轴切换 2s 后镜头实例归零（无残留），再悬停书页得 1 个 525×525 镜头；全程页面 `error`/`unhandledrejection` 收集 0 条、无 Vite overlay；临时尺寸未写回偏好。
- [ ] T038 [US2] 按 `specs/001-add-pageview-magnifier/quickstart.md` US2-A/B/C 完成两种桌面阅读模式的新规则验收，记录自由整数/边界、受限小于20px与恢复、长期共享/降级/迁移/重置、开关页面会话的实际版本与证据；保存结果前保持未勾选。
  - 进度（2026-09-18）：US2-A（自由整数、边界、倍率）与 US2-B（受限缩小与恢复、两种桌面阅读模式）已在 dev 页取得证据（见 T033–T037 条目，事件与截图位于 `.tmp/t033/`、`.tmp/t036/`）；US2-C 的长期共享/降级/迁移/重置部分复用设置组 T039/T040 的矩阵；真实脚本环境与移动真机回归待统一验收补测。
- [ ] T039 [US1] [US3] 在 T033–T037 完成且版本固定后执行 T031/T032，并按 `specs/001-add-pageview-magnifier/quickstart.md` 回归桌面/移动菜单手势、原图、奇偶切换、翻页和桌面限制；将实际证据与未覆盖项写入本组验收记录。
  - 进度（2026-09-18）：待 T038 完成后执行。本轮观察：桌面菜单、书页翻页与镜头联动正常；移动端长按在按住期间菜单显示「原图」（无放大镜项），松手时合成的 `click` 走非桌面分支 `clickBackground` 会关闭菜单——该路径不在 T036/T037 改动范围（`git diff` 未触及 `onClickBg`），列为待确认的既有交互行为。

**依赖顺序**：T033→T034；T035 依赖入口状态语义对齐；T036→T037；T038/T039 依赖实施完成及 D04 存储依赖就绪。涉及相同文件的任务串行处理，验收期间固定实现版本。
