# 修复两组验收发现的 7 个缺陷

## Goal

修复 `10-25-dockable-panel-acceptance` 与 `10-25-thumb-expand-modal-acceptance` 两组 quickstart 验收中记录的 7 个产品缺陷，使这两组功能的实际行为与 `.trellis/spec/frontend/features/` 中的规范一致，并让未被消费的布局注册表真正成为布局行为的唯一来源。

## Context

两组验收均在不改产品代码的前提下完成，缺陷已记录在各自任务的 `validation.md` 中（D1–D7），并已用对照实验定位到具体代码位置。本任务只做修复与回归，不重新规划功能。

## Requirements

- R1 触摸停靠可用：触摸设备上长按缩略图面板头部拖拽能完成吸附，不再被 `pointercancel` 打断。
- R2 阅读区不被压扁：侧栏/底栏拖到上限时主内容区保持可见，主内容区最小尺寸随视口按比例降级。
- R3 布局注册表生效：`layoutBlockRegistry` 成为可吸附槽位、尺寸上下限与触摸长按阈值的唯一来源，不再有硬编码副本。
- R4 弹层列数受控：宽视口每行最多 5 项、窄视口每行 3 项，不再随视口变宽无限增加列数。
- R5 分段规范对齐：把「每 100 页一段」的规范口径改为与实现一致的 200 页，代码不改。
- R6 跳转落点正确：从弹层、缩略图、键盘或滚轮触发的定位都落到目标页，不被卷切换后的元素顺序改写。
- R7 窄屏弹层不溢出：移动端弹层尺寸不超出视口。

## Constraints

- 只改 `core/`（必要时 `src/`），不触碰 `core_old/`、`old/`。
- 不引入新依赖、不引入第三方 UI 库。
- 保持书页与卷轴两种模式的布局与阅读行为一致。
- 持久化键与 schema 版本不变，已有用户数据必须继续可用。
- R5 只改文档，不改代码；其余六项以代码修复为准。

## Acceptance Criteria

- [AC1] 触摸设备长按缩略图面板头部 500ms 后拖到右/底槽位能完成吸附：拖动过程中 `pointercancel` 不再出现，`thumbDockSlot` 与持久化值随之更新。
- [AC2] 拖动分界线到视口边缘时主内容区仍可见：390×844 下侧栏不超过视口减主区下限，1200×900 下主内容区不小于 320px。
- [AC3] `layoutBlockRegistry` 被实际消费：可吸附槽位、尺寸上下限、触摸长按阈值均从注册表读取，`DockWorkspace`、`DockHandle`、`ReaderView` 中不再保留这些常量的硬编码副本。
- [AC4] 弹层网格列数：视口 ≥1024px 时每行 5 项且首屏可见至少 4 行，<1024px 时每行 3 项。
- [AC5] `001-thumb-expand-modal` 的 spec、data-model、quickstart 与契约统一写 200 页分段，与 `thumbExpandSegmentSize` 一致。
- [AC6] 跳转落点正确：在第三卷点击弹层页码 204 落到 `204 / 252`，窄屏点击页码 3 落到 `3 / 252`（用 252 页图集是为了同时覆盖末段不满整行）。
- [AC7] 390×844 下弹层不超出视口，宽高均不超过视口尺寸。
- [AC8] 两组功能的既有验收项在修复后仍然成立：吸附、缩放、按模式持久化、两模式阅读、单分段、末行对齐、缩略图失败、翻页与放大镜基本交互不受影响。

## Notes

- 缺陷来源与取证见 `.trellis/tasks/10-25-dockable-panel-acceptance/validation.md` 与 `.trellis/tasks/10-25-thumb-expand-modal-acceptance/validation.md`。
- AC5 是文档口径修正，不产生代码改动；验收证据为文档 diff。
