# 修复阅读模式设置行的单测证明力缺陷

## Goal

让 `tests/settings-reading-mode-row.test.cjs` 真正证明「设置行由真实 store 定义驱动、下拉文案来自 i18n 词条」，并让 spec 与验收记录里对该测试的描述与实现一致。

## Background

`10-25-mobile-reading-mode-entry` 的实现改动只有 `core/store/app.ts` 的两行（`showInDialog: false → true`、新增 `dialogCategory: 'general'`），随后被独立审查发现三处证明力/记录问题：

1. `tests/settings-reading-mode-row.test.cjs` 的 test 2/3 用 `stubs` 把 `core/store/app.ts` 整个替换掉，`settingFieldMap`、`settingConf`、`dialogSettingFieldIds` 全部由测试手抄。这与 test 1（用 `tests/helpers/storage-fixture.cjs` 加载真实模块）不一致，且违反 `.trellis/spec/frontend/quality-guidelines.md` 中「断言不得与生产代码同源」的要求：把 `readingModeList` 从 `core/store/app.ts` 删掉、或把 `dialogCategory` 改回其他值，test 2/3 仍全绿。
2. `.trellis/spec/frontend/quality-guidelines.md` 的命令表与归档任务的 `acceptance.json` 都写了「加载真实 store」，只有 test 1 成立，属于当前状态描述失真。
3. AC2「缺词条或写死文案会让单测失败」只对「i18n 字典里存在该 key」成立：`core/components/widget/DropOption.vue` 的渲染分支没人验证，模板写死文案不会被发现。

## Requirements

- R1：`tests/settings-reading-mode-row.test.cjs` 的 test 2/3 改为通过 `tests/helpers/storage-fixture.cjs` 的 `createPage({})` 取得真实 `core/store/app.ts` 导出（`store`/`storeAction`/`settingFieldMap`/`settingConf`/`dialogSettingFieldIds`），不再保留手抄的字段定义表。
- R2：新增一条挂载真实 `core/components/widget/DropOption.vue` 的用例：以哨兵 i18n 字典挂载，断言下拉当前值与展开项文本等于哨兵；模板写死文案会让该用例变红。
- R3：同步修正 `.trellis/spec/frontend/quality-guidelines.md` 中对该测试的描述，使其准确覆盖「真实 store 模块 + 组件渲染」两层。
- R4：把移动端失败轮（`settings-mode-mobile-dfa4f63b`，`ProductAssertion 下拉选项应展开`，`details {"options": [], "open": false}`）的性质与复核结论写进本任务记录，作为对归档任务遗留说明缺口的补齐。
- R5：`npm run check` 全绿。

## Constraints

- 不改产品行为：`core/`、`src/` 下不得有代码改动。
- 不改 `tests/helpers/storage-fixture.cjs` 与 `tests/helpers/runtime-fixture.cjs` 的既有契约；若需放行新模块，走 `realModules` 白名单并说明原因。
- 归档任务 `.trellis/tasks/archive/2026-10/10-25-mobile-reading-mode-entry/` 视为只读，不修改其 `acceptance.json`。
- `tests/` 与 `.trellis/` 内不写历史性叙述，只描述当前状态。

## Out of Scope

- 重跑 TEST/EH/NH 浏览器轮（审查复核时四轮 `verify-browser` 均已 passed，结论记录在本任务）。
- 修正 `.trellis/spec/frontend/state-management.md` 中 `core/store/app.ts:354` 行号引用（既有问题，与本次改动无关）。
- 为 `core/components/MoreSettingsDialog.vue` 整体挂载测试（行渲染由 R2 的 `DropOption` 用例与既有 test 1 的字段定义断言共同覆盖）。

## Acceptance Criteria

- [AC1] test 2/3 不再包含 `core/store/app.ts` 的 `stubs` 条目，直接使用 `createPage({}).app` 的真实导出；删除 `settingConf.readingModeList` 或把 `dialogCategory` 改成其他值，至少一条用例变红。
- [AC2] 新增的渲染层用例挂载真实 `DropOption.vue`，断言下拉文本为 `__sentinel_<key>__`；把模板文案写死后该用例变红。
- [AC3] `.trellis/spec/frontend/quality-guidelines.md` 对该测试的描述与实现一致，`npm run check:docs` 通过。
- [AC4] 移动端失败轮的性质与复核结论（首轮下拉展开时序未达，同一脚本改为等待 popover 可见后重跑通过；四轮 `verify-browser` 于复核时重跑均 passed）写入本任务记录。
- [AC5] `npm run check` 全绿。

## Notes

- 审查报告同时指出 AC4/AC5 的 runtime check 只靠 note 自述、`.tmp/` 不进仓库，因此复核时已对四轮产物重跑 `verify-browser`，结果记录进本任务。
- 移动端首轮失败与 NH 首轮 `PreflightBlocked` 属不同类别：前者是产品断言（下拉未展开），后者是准备阶段基线缺失，不能混为一类解释。
