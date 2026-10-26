# 验收 001-add-pageflip-toggle

## Goal

执行 [001-add-pageflip-toggle quickstart](../../spec/frontend/features/001-add-pageflip-toggle/quickstart.md) 的全部验收步骤，覆盖首次初始化矩阵、三档动效与阅读回归、共享/迁移/重置，产出可核验的验收记录。

## Background

该组的 quickstart 从未执行，`pending-work.md` 将其列为未收口项。功能已实现并在 `core/` 下，本轮只验收不改代码。

环境要求分两层：

- 首次初始化矩阵、三档动效、阅读回归可在本地 Vite + `ego-browser` 的 `desktop` / `mobile` 两个固定 profile 上执行，但「系统减少动态效果」开关需按 browser-acceptance 记录实际使用的模拟手段（CDP `Emulation.setEmulatedMedia({features:[{name:'prefers-reduced-motion', value:'reduce'}]})`），不能只看 `matchMedia` 结果。
- 共享、迁移与重置矩阵依赖真实 GM 存储与 EH/EX/NH 跨站，必须走 [reader-test](../../../.pi/skills/reader-test/SKILL.md) 生产包链路，quickstart 明确禁止用 localhost 或 localStorage 结果顶替。GM 不可用场景需在不加载 GM 能力的环境下另跑。

决策依据：[2026-09-18 决策](../../spec/frontend/decisions/2026-09-18-reader-behavior.md) 第 2、3 节。

## Requirements

- R1 执行首次初始化矩阵：桌面/移动 × 系统减少动态效果开关共四种环境，期望分别为拟真/平移/无动效/无动效。
- R2 验证初始化后的稳定性：切换系统偏好后当前动效不变；保存语言等其他设置后刷新与重开画集仍使用已保存结果；预置三种合法偏好均保留（含恰等于旧默认「拟真」的旧记录）；预置缺失/坏值时先由本站合法旧值补齐，全部无合法值才用矩阵；明确重置后重新初始化不重导被重置的旧值。
- R3 执行三档动效及阅读回归：书页模式依次选拟真/平移/无动效，下一次翻页使用所选动效；点击、滚轮、键盘、自动翻页均使用同一有效设置；首页向前、末页向后不越界；加载未完成与快速连续输入不产生页码错乱或长时间空白；切到卷轴模式保持原滚动行为，返回书页仍用已确定偏好；两种视口检查布局与关键交互。
- R4 执行共享、迁移与重置矩阵（复用 `002-more-settings-modal` quickstart 第 3 节矩阵），动效作为被测字段并同时覆盖其他字段；GM 可用时在 EH/EX/NH 间重开阅读器检查一致性，GM 不可用时验证 origin 隔离。
- R5 桌面与移动两个 profile 各跑本地轮；平台轮按 reader-test 记录 bundle/loader 证据。每轮用 `python3 scripts/acceptance.py verify-browser <artifact-dir>` 校验并按结果回填。
- R6 不改产品代码；发现缺陷只记录。

## Acceptance Criteria

- [AC1] 首次初始化矩阵四种环境的结果与 quickstart 表格一致（桌面关/拟真、移动关/平移、两者开/无动效），且记录实际模拟 reduced-motion 的手段。
- [AC2] 初始化后稳定性成立：切换系统偏好不改当前动效；保存其他设置后刷新与重开画集仍用已保存结果；预置三种合法偏好（含旧默认拟真）保留；缺失/坏值按本站合法旧值优先补齐；重置后重新初始化不复活旧值。
- [AC3] 三档动效生效且点击、滚轮、键盘、自动翻页一致使用当前设置；首页/末页不越界；加载中与快速连续输入无页码错乱或长时间空白；卷轴模式滚动不受影响，返回书页沿用已确定偏好。
- [AC4] 共享/迁移/重置矩阵在 GM 可用的 EH/EX/NH 环境下跑通（合法共享优先、统一旧值优先于独立旧值、空共享首次迁入、后续站点只补缺、坏值修复、重复迁移、重置防复活），GM 不可用场景体现 origin 隔离。
- [AC5] 本地两 profile 与平台轮均产出通过 `verify-browser` 校验的预检产物，`acceptance.json` 有对应 runtime/inspection 记录与证据路径，`summarize` 实际执行。

## Notes

- 父任务：`10-25-close-feature-quickstart-acceptance`。
- 开工前确认环境依赖：GM 可用的 EH/EX/NH 登录态、GM 不可用环境的准备方式；不可用的场景先记录为 blocked 并回到用户确认，不伪造通过。
- 该组工作量大于本地两组，排在 `10-25-dockable-panel-acceptance` 与 `10-25-thumb-expand-modal-acceptance` 之后。
