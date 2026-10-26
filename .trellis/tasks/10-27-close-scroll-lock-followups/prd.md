# 收口跳转锁余量常量与决策文档守卫入仓

## Goal

上一轮把跳转锁文档里的硬编码时长改成了按符号表述，但留下两处没收拾干净：代码里锁定期余量还是个裸 `200`，文档说的「一段余量」在代码中没有对应符号；用来防文档腐烂的 grep 断言只存在于 `.tmp/`，不受版本控制，下次谁再往文档里写死时长不会有任何检查拦住。

## Requirements

- R1 `core/components/AlbumScrollView.vue` 的锁定期余量提成具名常量，锁定期计算引用该常量。
- R2 把文档时长断言做成仓库内脚本 `tests/check-decision-doc-durations.sh`，可独立执行，违规时 exit 1、通过时 exit 0。
- R3 该脚本挂进 `npm test`（新增 `test:decision-docs` 子脚本并串入 `test` 链）。
- R4 决策文档按符号表述锁定期构成（`animationTime` + `scrollLockMarginMs`）。
- R5 不改运行时行为：常量值与原先的 `200` 相同，`npm run build-prod` 产物行为不变。

## Constraints

- 脚本只允许断言文档内容，不解析业务代码。
- 不新增依赖；脚本用 bash + grep。
- 文档只描述当前状态。

## Acceptance Criteria

- [AC1] `core/components/AlbumScrollView.vue` 中锁定期余量以具名常量出现，`scrollLockUntil` 的计算引用该常量，源码中不再有裸 `200` 参与该计算。
- [AC2] `tests/check-decision-doc-durations.sh` 纳入版本控制，对当前文档 exit 0。
- [AC3] 人为在决策文档追加一处裸时长后，该脚本 exit 1 并指出位置；还原后 exit 0。
- [AC4] `npm run test:decision-docs` 与 `npm run check` 均 exit 0。

## Notes

- 来源：用户对 `e11e0f0` 的三点复核（2026-10-27）。第 3 点（「重钳制不跳过」不补反向守卫）已确认按现状接受，不在本任务范围。
