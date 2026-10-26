# 修复复核发现的注册表接线、网格间隙与视口兜底问题

## Goal

修复 `aedd80f` 复核中确认的三组问题：弹层网格 `.distributed` 间隙回归、`layoutBlockRegistry` 只接线一半、视口变化不重钳制与极端视口主区被反压；并补齐 layout 纯函数测试与规范文档口径。

来源：`.trellis/tasks/archive/2026-10/10-26-fix-acceptance-defects/` 提交后的人工审查（Standards 硬问题 1 条被实测反证、判断项 6 条成立，Spec 偏差 4 条成立）。

## Requirements

- R1 弹层网格：去掉列数固定后失效的 `.distributed` 均分逻辑，缩略图项在任意视口下按 `justify-content: start` + `gap: 12px` 左对齐；宽屏 5 列、窄屏 3 列不变。
- R2 注册表接线：`layoutBlockRegistry` 成为尺寸上下限、允许槽位与长按阈值的唯一来源。底栏差异化尺寸不再由 `bottomMinSizePx`/`bottomMaxSizePx` 在查询函数里硬编码分支取得；注册表结构须能表达「侧边 60–520 / 底部 60–420」。
- R3 注册表定义顺序：查询函数位于注册表之后，消除模块级调用依赖 const 提升的隐式时序。
- R4 停靠覆盖层：`.drop-zone` 由注册表的允许槽位渲染，不再硬编码三段；拖拽期间的允许槽位只在拖拽开始时解析一次。
- R5 视口兜底：视口尺寸变化触发当前尺寸重新钳制，旋转/缩放后阅读区不再被压成 0 宽。
- R6 极端视口：主区下限优先于侧栏最小尺寸，窄到主区下限本身超过视口可用空间时，主区下限让步而不是反过来挤掉阅读区。
- R7 死代码：删除 `AlbumScrollView.vue` 的恒真判断。
- R8 测试：`core/model/layout.ts` 新增/修改的纯函数有断言覆盖。
- R9 文档：规范文档描述当前实现，补齐 `scrollLockUntil` 跳转锁与极端视口口径；不给已归档任务补写历史。

## Constraints

- 不改变已验收通过的既有行为：侧边默认 150px、缩放钳制 60/520 与 60/420、长按 500ms、宽屏 5 列/窄屏 3 列、分段 200 页。
- 不改持久化格式与存储键；`thumbSizePx` 写入仍为整数。
- 不引入新依赖；测试沿用 `tests/helpers/runtime-fixture.cjs` 的 transpile + VM 方式。

## Acceptance Criteria

- [AC1] 弹层网格在 1600/1200/1023/768/390 视口下相邻缩略图项水平间距一致（差值 ≤ 2px），最右列不超出面板。
- [AC2] 弹层网格在宽视口为 5 列、390 视口为 3 列，每行首项左对齐面板内边距。
- [AC3] 注册表能表达侧边与底部的差异化尺寸范围，`getThumbSizeRange` 不再读取 `bottomMinSizePx`/`bottomMaxSizePx` 常量分支；侧边钳制 60/520、底部钳制 60/420 与现状一致。
- [AC4] `layoutBlockRegistry` 定义早于所有读取它的函数与常量初始化。
- [AC5] `.drop-zone` 数量与文案由注册表允许槽位决定；从注册表移除某槽位后该槽位不再渲染。
- [AC6] 1200×900 把侧栏拖到 520 后改为 390×844 视口，主区宽度 > 0 且侧栏不超过 `390 - min(320, 390×0.6)`。
- [AC7] 100px 视口下 `getThumbSizeRange('left', 100)` 返回的 `max` 使主区至少保留 `computeMainMinSizePx(100)`。
- [AC8] `npm run type-check` 与新增的 layout 纯函数测试均通过，`npm run check` 整体 exit 0。

## Notes

- 复核记录（实测反证与量化数据）见本任务 `validation.md`。
- 父级验收任务 `10-25-close-feature-quickstart-acceptance` 与本任务无依赖关系。
