<!-- migration-note:start -->
> 迁移来源：`specs/001-dockable-panel-layout/plan.md`（基线 `647ff26`）。正文保全，路径已重定位；命令与源码路径均从仓库根目录解释。
> 阅读顺序与状态：先读[功能索引](../index.md)及[已确认决策](../../decisions/2026-09-18-reader-behavior.md)；决策覆盖到的旧约定以决策为准。Draft、任务勾选、独立验收清单各自保留，不证明当前版本通过验收。
> 文中的 plan/research/tasks、原始 Input、日期及“本次/当前”描述均保留原记录时态；历史实现路径、代码示例、依赖版本和 `.tmp/` 证据不代表本轮已核实或可获取。迁移未执行产品验收，也未补造缺失产物。
> 历史计划：下文 Spec Kit 命令、模板、Constitution Check 及 agent-context 操作均为历史记录，不执行；当前开发流程见 [Trellis workflow](../../../../workflow.md)，稳定工程原则见 [AGENTS](../../../../../AGENTS.md)。保留当时状态，不将历史阶段门禁继续用于当前工作流。
<!-- migration-note:end -->

# Implementation Plan: Dockable Block Layout

**Branch**: `001-dockable-panel-layout` | **Date**: 2026-02-20 | **Spec**: `.trellis/spec/frontend/features/001-dockable-panel-layout/spec.md`
**Input**: Feature specification from `.trellis/spec/frontend/features/001-dockable-panel-layout/spec.md`

## Summary

Implement a reusable dock layout system for reader blocks so users can drag the thumbnail block between left/right/bottom slots and resize the split with mouse and touch (500ms long-press on touch). Persist layout globally per reading mode (scroll/book) and auto-apply the target mode layout on mode switch, while keeping non-overlap and stable reading behavior.

## Technical Context

**Language/Version**: TypeScript 5.9 + Vue 3.5 SFC + SCSS\
**Primary Dependencies**: Vue runtime (`vue`), existing eHunter components and store modules, no new UI library\
**Storage**: Userscript storage (`GM_getValue`/`GM_setValue`) preferred, fallback to `PlatformService.storageGet/storageSet`\
**Testing**: Manual runtime verification via `npm run dev` + `ego-browser`; static type-check via `npm run type-check`\
**Target Platform**: Browser userscript runtime on EH reader UI (desktop + touch-enabled browsers)
**Project Type**: Single frontend userscript app\
**Performance Goals**: Drag/resize visual response appears within one frame budget (target <=16ms per frame on common desktop); mode switch applies saved layout immediately with no visible flicker\
**Constraints**: Keep changes in `core/` and `src/`; no third-party UI components; preserve book/scroll behavior parity; enforce min/max panel size and non-overlap fallback\
**Scale/Scope**: Initial scope is one dock relationship (`ThumbScrollView` + main content), architecture must support adding more blocks without block-specific hardcode

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Pre-Phase 0 Gate Review**

- Principle I (Refactor-First Boundaries): PASS. Planned code touches are in `core/components`, `core/store`, and optionally `src/platform/base/service` only if storage adapter extension is needed.
- Principle II (Behavior-Preserving Changes): PASS. Plan keeps existing scroll/book rendering branches and only changes container layout orchestration; includes invalid drop and small viewport safeguards.
- Principle III (Validation Before Completion): PASS. Quickstart includes mandatory `npm run dev` and browser verification using `ego-browser`.
- Principle IV (Story-Independent Delivery): PASS. Work can be sliced by story: docking first, resize second, reusable registration + persistence third.
- Principle V (Built-in UI and Mode Consistency): PASS. Uses self-built Vue components/SCSS only; layout persistence explicitly independent per mode with auto-apply on switch.

**Post-Phase 1 Design Re-check**

- Principle I: PASS. Data model and contracts map to existing refactor paths only.
- Principle II: PASS. Data model defines mode-scoped layout state and boundary clamping to avoid rendering breakage.
- Principle III: PASS. Quickstart defines runtime verification steps and expected outcomes.
- Principle IV: PASS. Contracts and quickstart preserve independent validation slices for P1/P2/P3 stories.
- Principle V: PASS. No external UI library introduced; mode consistency captured in persisted keying and application rules.

## Project Structure

### Documentation (this feature)

```text
.trellis/spec/frontend/features/001-dockable-panel-layout/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── layout-contract.openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
core/
├── components/
│   ├── ReaderView.vue
│   ├── ThumbScrollView.vue
│   └── layout/
│       ├── DockWorkspace.vue
│       ├── DockHandle.vue
│       └── SplitHandle.vue
├── store/
│   └── app.ts
└── style/
    └── _variables.scss

src/
└── platform/
    └── base/
        └── service/
            └── PlatformService.js
```

**Structure Decision**: Keep a single frontend project structure and implement reusable dock/resizer behavior under `core/components/layout/`, integrating with `ReaderView.vue` and persisted preferences in `core/store/app.ts`.

## Complexity Tracking

No constitution violations requiring justification.

## Validation Log

> 历史验证记录：以下结果保留自原实施阶段，不代表当前 HEAD 的验收结果；涉及本功能的行为改动，须重新执行 [quickstart.md](quickstart.md)。

- `npm run type-check`: fails due to extensive pre-existing type issues outside this feature scope (legacy files in `src/platform/*`, widget typings, and historical strictness gaps). New feature files compile in dev runtime and do not introduce additional blocking runtime errors.
- `npm run dev`: passes and serves app on local Vite port (verified at `http://localhost:5175/`).
- Browser verification runtime check: page loads with dock handle, thumbnail panel, and reader content visible; manual flow validation can proceed per `quickstart.md`.
