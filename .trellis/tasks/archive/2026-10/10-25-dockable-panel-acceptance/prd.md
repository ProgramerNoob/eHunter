# 验收 001-dockable-panel-layout

## Goal

执行 [001-dockable-panel-layout quickstart](../../spec/frontend/features/001-dockable-panel-layout/quickstart.md) 的全部验收步骤，覆盖吸附（P1）、缩放（P2）、可复用注册与按模式持久化（P3）以及回归检查，产出可核验的验收记录。

## Background

该组的 quickstart 从未执行，`pending-work.md` 将其列为未收口项。功能已实现并在 `core/` 下（`core/model/layout.ts`、`DockWorkspace`、`core/store/layoutPreference.ts`、`core/store/app.ts`），本轮只验收不改代码。

环境要求：本地 Vite（`npm run dev`）+ `ego-browser`，按 [browser-acceptance.md](../../spec/frontend/browser-acceptance.md) 使用 `withBrowserPreflight` 的 `desktop`（1200×900）与 `mobile`（390×844）两个固定 profile。该功能不涉及平台适配或 GM 存储，不需要 reader-test 生产包。

已知需注意的观察口径：

- `DockWorkspace` 的 `.thumb-panel.side` 与 `.thumb-panel.bottom` 各持一份槽位内容，45 页图集会渲染两份 `.thumb-container`，断言前按可见性过滤（`getBoundingClientRect().width > 0`）。
- touch 长按阈值为 500ms（`core/model/layout.ts` 的 `touchLongPressMs`），短按不得触发拖拽。
- 阅读器首次打开可能被版本更新说明弹窗遮挡，需先点击 `.simple-modal .flat-button.operation > a` 关闭。

## Requirements

- R1 执行 quickstart 的 Validation Checklist 三组故事：P1 吸附（左侧→右侧、→底部、拖到无效目标后回退），P2 缩放（hover 出现 affordance、拖拽实时更新并钳制、touch 长按激活/短按不触发），P3 可复用与持久化（block-registry 驱动、模式切换应用目标模式布局、刷新后各模式恢复自身布局）。
- R2 执行 Regression Checks：吸附/缩放后卷轴模式内容可读可交互、书页模式翻页与分页正常、未引入第三方 UI 库。
- R3 桌面与移动两个 profile 各跑一轮，关键交互配截图；移动轮覆盖长按手势。
- R4 每轮按 browser-acceptance 要求跑 `withBrowserPreflight`，保存产物并用 `python3 scripts/acceptance.py verify-browser <artifact-dir>` 校验。
- R5 不改产品代码；发现缺陷只记录。

## Acceptance Criteria

- [AC1] P1 吸附：左侧→右侧、→底部两种目标均成功，拖到无效目标释放后布局回到上一稳定状态，且内容面板不重叠。
- [AC2] P2 缩放：hover 边界出现 resize affordance；水平/垂直拖拽实时更新并在最小/最大限制处钳制，主内容区始终可见；touch 短按不触发、500ms 长按激活拖拽或缩放。
- [AC3] P3 持久化：布局按模式独立保存，`book ↔ scroll` 切换自动应用目标模式布局，刷新后各模式恢复自身布局。
- [AC4] 回归：吸附/缩放后卷轴模式内容可读可交互、书页模式翻页与分页正常，依赖中无第三方 UI 组件库。
- [AC5] 桌面与移动两轮均产出通过 `verify-browser` 校验的预检产物，`acceptance.json` 有对应 runtime/inspection 记录与证据路径，`summarize` 实际执行。

## Notes

- 父任务：`10-25-close-feature-quickstart-acceptance`。
- quickstart 里 `Active branch: 001-dockable-panel-layout` 是历史描述，当前在 `master` 上验收。
