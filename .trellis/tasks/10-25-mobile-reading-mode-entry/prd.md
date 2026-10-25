# 阅读模式设置入口

## Goal

390 宽下顶栏快捷设置被重叠规则整体隐藏，平板的「更多设置」弹窗里也没有阅读模式这一项，窄视口无法在书页/卷轴模式之间切换。在「更多设置 → 通用」里补一行阅读模式下拉，让桌面与窄屏都从统一设置弹窗切换模式，并回归两个平台的两种模式。

## Background

- `core/components/TopBar.vue` 的 `checkOverlap()` 按字段与 `.float-content` 左边界重叠判定可见性，390 × 844 下所有 `.item` 都被判重叠并设 `display: none`（记录在 `.trellis/spec/frontend/browser-acceptance.md:204`）。
- 阅读模式是 `core/store/app.ts:222` 的 `fixed: true` 快捷项，也是 `core/store/app.ts:610` 的 `pinnedQuickSettingId`；它在 `settingFieldDefinitions` 里设 `showInDialog: false`，因此不进「更多设置」弹窗。
- `core/store/app.ts:251-263` 的 `shortcutActionDefinitions` 没有阅读模式切换项；`core/components/widget/MoreMenuPopover.vue` 只有「更多设置」「快速预览」「下载」三项。
- 三条现有入口在窄屏全部失效：顶栏字段被隐藏、弹窗无该字段、快捷键无该动作。

已对齐的决策：

- 入口位置：阅读模式作为「更多设置」弹窗「通用」分类的一行下拉，复用现有字段渲染；「更多」菜单保持三项不变。
- 视口范围：桌面与窄屏共用同一份弹窗入口，不按视口分支。

## Requirements

### R1 设置行

「更多设置 → 通用」新增一行阅读模式，控件为下拉框，选项为滚动模式（`readingMode = 0`）与书页模式（`readingMode = 1`）。展示值取自 store 当前值，选择后走已有 `storeAction.setReadingMode`。

### R2 文案归属

行标签与提示复用现有 `readingMode`、`readingModeTip` 词条，下拉选项复用 `scrollMode`、`bookMode` 词条，不新增词条。

### R3 菜单不变

「更多」菜单保持「更多设置」「快速预览」「下载」三项，不新增阅读模式项。

### R4 视口一致

桌面与 390 × 844 窄屏都能从「更多设置」弹窗完成切换；不修改 `checkOverlap` 的重叠规则，不新增按视口分支的入口。

## Constraints

- 改动限于 `core/store/app.ts` 的 `readingMode` 字段定义与相关测试/验收记录；不改快捷项定义（`quickSettingOptions`、`pinnedQuickSettingId`）、快捷键动作表、`showInTopBar`。
- 覆盖文档只描述当前状态；`core/` 内不写注释。

## Out of Scope

- 新增阅读模式快捷键动作。
- 让顶栏固定项在窄屏不隐藏。
- 修改 `storeAction.setReadingMode` 的持久化、布局切换或自动翻页重置逻辑。

## Acceptance Criteria

- [AC1] `core/store/app.ts` 的 `readingMode` 字段进入「更多设置」弹窗的通用分类（`showInDialog: true`、`dialogCategory: 'general'`），且控件为下拉、选项为滚动/书页；单测覆盖该定义与下拉列表值。
- [AC2] 下拉选项与标签文案来自 `core/assets/i18n.ts` 的 `readingMode` / `readingModeTip` / `scrollMode` / `bookMode` 词条，缺词条或写死文案会让单测失败。
- [AC3] 选择下拉值经 `setFieldValue('readingMode', ...)` 走 `storeAction.setReadingMode`，`store.readingMode` 随之为新值；单测覆盖双向切换。
- [AC4] 浏览器验收：TEST 平台桌面（1200 × 900）与移动（390 × 844）各一轮，在「更多设置 → 通用」切换后 `store.readingMode` 为切换值、阅读容器随模式变化，`verify-browser` 通过。
- [AC5] 平台验收：EH 与 NH 生产包各至少一轮，确认弹窗内该项可操作且切换后阅读容器随模式变化。
- [AC6] `npm run check` 全绿（type-check、全部单测、build-prod、check:docs）。

## Notes

- PRD 中「更多」菜单保持三项，是本轮对上一版的修正。
- 移动轮次需要先点 `.float-content` 的「显示/隐藏顶栏」再核对顶栏，规则见 `.trellis/spec/frontend/browser-acceptance.md:204`。
- 验收分类与证据格式按 `.trellis/spec/frontend/browser-acceptance.md` 与 `.pi/skills/reader-test/SKILL.md`。
