<!-- migration-note:start -->
> 迁移来源：`specs/001-dockable-panel-layout/quickstart.md`（基线 `647ff26`）。正文保全，路径已重定位；命令与源码路径均从仓库根目录解释。
> 阅读顺序与状态：先读[功能索引](../index.md)及[已确认决策](../../decisions/2026-09-18-reader-behavior.md)；决策覆盖到的旧约定以决策为准。Draft、任务勾选、独立验收清单各自保留，不证明当前版本通过验收。
> 文中的 plan/research/tasks、原始 Input、日期及“本次/当前”描述均保留原记录时态；历史实现路径、代码示例、依赖版本和 `.tmp/` 证据不代表本轮已核实或可获取。迁移未执行产品验收，也未补造缺失产物。
<!-- migration-note:end -->

# Quickstart: Dockable Block Layout

## Prerequisites

- Node.js environment compatible with current project toolchain
- Dependencies installed (`npm install`)
- Active branch: `001-dockable-panel-layout`

## Run

1. Start dev runtime:

```bash
npm run dev
```

2. Open the reader page and verify runtime behavior with [ego-browser](../../browser-acceptance.md); follow the linked guide for common operations.

## Validation Checklist

### Story P1: Docking

- Drag thumbnail header (`EHUNTER`) and dock from left -> right.
- Drag thumbnail header and dock to bottom.
- Drag outside valid target and confirm layout reverts to previous valid state.

### Story P2: Resizing

- Hover split boundary on pointer devices and verify resize affordance appears.
- Drag boundary to resize and verify clamp behavior (no invisible main content).
- On touch device, ensure short tap does not drag; long-press (500ms) activates drag/resize.

### Story P3: Reusability and persistence

- Confirm layout model is block-registry driven (no thumbnail-only logic branch for core behavior).
- Switch reading mode `book <-> scroll` and verify saved layout auto-applies for target mode.
- Refresh page and verify each mode restores its own global layout.

## Regression Checks

- Scroll mode content remains readable and interactive after docking/resizing.
- Book mode page turning and pagination remain functional after mode-specific layout apply.
- No third-party UI component library added.

## Future Block Onboarding

1. Register the block metadata in `core/model/layout.ts` (`blockId`, `allowedSlots`, `minSizePx`, `maxSizePx`, `touchLongPressMs`).
2. Provide a handle region in the block header and emit dock/resize start events compatible with `DockWorkspace`.
3. Mount the block through `DockWorkspace` slot projection in `core/components/ReaderView.vue`.
4. Ensure mode-scoped persistence is sanitized via `core/store/layoutPreference.ts` and applied from `core/store/app.ts`.

## Optional Static Check

```bash
npm run type-check
```
