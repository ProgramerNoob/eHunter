<!-- migration-note:start -->
> 迁移来源：`specs/001-thumb-expand-modal/quickstart.md`（基线 `647ff26`）。正文保全，路径已重定位；命令与源码路径均从仓库根目录解释。
> 阅读顺序与状态：先读[功能索引](../index.md)及[已确认决策](../../decisions/2026-09-18-reader-behavior.md)；决策覆盖到的旧约定以决策为准。Draft、任务勾选、独立验收清单各自保留，不证明当前版本通过验收。
> 文中的 plan/research/tasks、原始 Input、日期及“本次/当前”描述均保留原记录时态；历史实现路径、代码示例、依赖版本和 `.tmp/` 证据不代表本轮已核实或可获取。迁移未执行产品验收，也未补造缺失产物。
<!-- migration-note:end -->

# Quickstart: Thumb Expand Modal

## Prerequisites

- Node.js environment compatible with current project toolchain
- Dependencies installed (`npm install`)
- Active branch: `001-thumb-expand-modal`

## Run

1. Start dev runtime:

```bash
npm run dev
```

2. Open reader page and validate runtime behavior with [ego-browser](../../browser-acceptance.md); follow the linked guide for common operations.

## Validation Checklist

### Story P1: Floating expand entry

- Set thumbnail panel to side dock and verify entry is fixed to visible right edge.
- Set thumbnail panel to bottom dock and verify entry is fixed to visible bottom edge.
- Scroll thumbnail list to random positions and verify entry remains viewport-anchored.

### Story P2: Full thumbnail modal density and style

- Click entry and verify modal opens without title.
- Verify each thumbnail item shows image + page number at bottom area.
- On wide viewport, verify 5 columns and at least 4 visible rows.
- On narrow viewport, verify 3 columns.
- Confirm modal shell style matches existing settings dialog style language.

### Story P3: Segmented pagination and jump

- Use bottom `Pagination` to switch 100-page segments.
- Open modal when current reading page is in a non-first segment and verify default segment focus is correct.
- Click a thumbnail item and verify modal closes and reader jumps to target page.

## Edge & Regression Checks

- Total pages <= 100: pagination remains visible with single segment state.
- Thumbnail load failure: item still displays page number and remains jumpable.
- Last row incomplete: grid alignment remains stable, no duplicate/invalid page labels.
- Scroll mode and book mode both preserve existing reading behavior after jump.
- No third-party UI component library introduced.

## Optional Static Check

```bash
npm run type-check
```

## Verification Record (2026-02-21)

> 历史验证记录：以下结果保留自 2026-02-21，不代表当前 HEAD 的验收结果；涉及本功能的行为改动，须重新执行本 quickstart。

- `npm run type-check`: PASS
- `npm run dev` + browser verification: PASS
- Runtime checks passed:
  - Expand button is visible in thumb viewport and opens modal.
  - Modal has no title and uses settings-dialog style language.
  - Thumbnail grid shows page numbers and supports click-to-jump with auto-close.
  - Bottom pagination is visible and functional (single-segment state confirmed at <=100 pages).
