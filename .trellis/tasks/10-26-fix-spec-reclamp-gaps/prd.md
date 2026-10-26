# 补齐重钳制单向性、网格留白与跳转锁的规范记述

## Goal

上一轮 `10-26-fix-review-findings`（提交 `16fbb7f`）修复完成后，人工复核又提出三条判断项，均属文档记述缺口而非代码缺陷：尺寸重钳制只收不放的取舍、弹层固定轨道下的左对齐留白形态、`scrollLockUntil` 的设计来龙去脉。本任务把这三条写成可查的当前状态，并在写入前用浏览器核实重钳制的真实行为边界。

## Requirements

- R1 重钳制语义：明确 `reclampThumbSizes` 是单向的（视口收窄时缩小，变宽不恢复），并说明持久化值仍是用户拖拽的意图值、重新加载按当时视口再钳制一次。
- R2 弹层网格形态：明确宽屏 5 列与窄屏 3 列都用 `120px` 为上限的固定轨道，`justify-content: start`，剩余空间留在右侧；写明这与「列自适应铺满」是两种不同形态。
- R3 跳转锁：把 `scrollLockUntil` 的目的、备选方案、释放条件与已知不释放的输入路径写到决策文档，而不是只留一行 Assumptions。
- R4 浏览器核实：在写入 R1 的结论前实测「1200 拖到 520 → 390 → 1200」全过程，确认运行期侧栏停在 156、存储保持 520、重新加载后回到 520。
- R5 不改代码：本任务只改 `.trellis/spec/` 下的文档，不改 `core/`、`src/`、`tests/`。

## Constraints

- 不修改任何已归档任务目录下的文档。
- 文档只描述当前状态，不写 AI 修改历史。
- 结论必须与实测一致；实测与复核推断不一致时以实测为准并在文档里写明。

## Acceptance Criteria

- [AC1] `001-dockable-panel-layout/data-model.md` 写明重钳制单向性、持久化值与重新加载行为。
- [AC2] `001-thumb-expand-modal/spec.md` 写明固定轨道宽度上限与左对齐留白形态。
- [AC3] 决策文档记录 `scrollLockUntil` 的目的、备选方案、释放条件与已知不释放路径。
- [AC4] 浏览器实测覆盖 1200→390→1200 全程，验证期与重载后两种状态均有证据。
- [AC5] `npm run check:docs` 通过，且 `git status` 显示未改动 `core/`、`src/`、`tests/`。

## Notes

- 三条判断项来自用户对 `16fbb7f` 的复核（2026-10-26）。
- 归档任务不回改：`.trellis/tasks/archive/2026-10/10-26-fix-acceptance-defects/design.md` 里的 `1fr` 描述保持原样。
