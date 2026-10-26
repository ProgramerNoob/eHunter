# 去掉跳转锁文档的时长硬编码并补重钳制不写存储的守卫

## Goal

`10-26-fix-spec-reclamp-gaps` 写入的文档里有两处不受任何检查保护：跳转锁决策文档把「800ms 动画 / 50ms 采样 / 约 1s 锁定」写成了硬编码数字，`animationTime` 一改就与代码脱节；`001-dockable-panel-layout/data-model.md` 声明了「重钳制不写回持久化偏好」这条 MUST，但没有对应测试。本任务把前者改成按符号表述，给后者补一条函数体级守卫断言。

## Requirements

- R1 决策文档不再出现会随代码变化的时长字面量，改为按符号或按关系描述（`animationTime` 定义的平滑滚动时长、锁定期为「动画时长 + 余量」）。
- R2 新增守卫测试：`core/store/app.ts` 中 `reclampThumbSizes` 的函数体内不得调用 `persistCurrentModeLayoutPreference`，形态与已有的 registry-order 源码断言一致。
- R3 守卫测试挂进 `test:layout-model`，随 `npm run test` 执行。
- R4 守卫必须先能失败：人为在 `reclampThumbSizes` 里加一行调用，确认测试报错，再移除。
- R5 不改产品行为：`core/`、`src/` 的运行时代码只在 R4 的临时验证里被改动，且验证后必须还原。

## Constraints

- 只改 `.trellis/spec/` 下的决策文档与 `tests/layout-model.test.cjs`。
- 文档只描述当前状态，不写修改历史。

## Acceptance Criteria

- [AC1] 决策文档中不再出现 `800`、`50ms`、`约 1s` 之类与实现绑定的字面时长。
- [AC2] `tests/layout-model.test.cjs` 新增一条测试，断言 `reclampThumbSizes` 函数体内不含 `persistCurrentModeLayoutPreference`。
- [AC3] 该测试在人为注入违规调用时失败、还原后通过。
- [AC4] `npm run test` 与 `npm run check:docs` 均 exit 0。

## Notes

- 两条问题来自用户对 `ef0d099` 的复核（2026-10-27）。
