# 验收 001-thumb-expand-modal

## Goal

执行 [001-thumb-expand-modal quickstart](../../spec/frontend/features/001-thumb-expand-modal/quickstart.md) 的全部验收步骤，覆盖浮动展开入口（P1）、弹窗密度与样式（P2）、分段分页与跳转（P3）以及边界回归，产出可核验的验收记录。

## Background

该组的 quickstart 从未执行，`pending-work.md` 将其列为未收口项。功能已实现并在 `core/` 下，本轮只验收不改代码。

环境要求：本地 Vite（`npm run dev`）+ `ego-browser`，按 [browser-acceptance.md](../../spec/frontend/browser-acceptance.md) 使用 `withBrowserPreflight` 的 `desktop`（1200×900）与 `mobile`（390×844）两个固定 profile。该功能不涉及平台适配或 GM 存储，不需要 reader-test 生产包。

已知需注意的观察口径：

- 缩略图面板可吸附在侧面或底部，入口位置随吸附位置变化（侧边固定在可视右缘，底部固定在可视下缘），验证「固定在可视区域边缘」要滚动缩略图列表后重新测量。
- `DockWorkspace` 有两个槽位副本，`.thumb-container` 计数按可见性过滤（`getBoundingClientRect().width > 0`）。
- 测「5 列且首屏至少 4 行」与「窄屏 3 列」需要同时记录实际视口宽高与网格列数。
- 阅读器首次打开可能被版本更新说明弹窗遮挡，需先点击 `.simple-modal .flat-button.operation > a` 关闭。
- 分段按每 100 页一段，验证默认分段定位需要当前阅读页落在非首段。

## Requirements

- R1 执行 P1：缩略图面板分别置于侧边与底部，滚动到任意位置后入口仍锚定在可视右缘/下缘，点击可打开弹层。
- R2 执行 P2：弹层无标题；每项含图片与底部区域页码；宽屏 5 列且首屏至少 4 行；窄屏 3 列；弹层风格与现有设置对话框一致。
- R3 执行 P3：底部分页器按 100 页分段；当前阅读页在非首段时默认定位到对应分段；点击缩略图后弹层关闭并跳转到目标页。
- R4 执行 Edge & Regression：总页数 ≤100 时分页器仍可见且单分段；缩略图加载失败仍显示页码可跳转；末行不完整时网格对齐、无重复或错误页码；跳转后书页/卷轴两种模式阅读行为保持正常；未引入第三方 UI 库。
- R5 桌面与移动两个 profile 各跑一轮，关键交互配截图；每轮按 browser-acceptance 跑 `withBrowserPreflight` 并用 `python3 scripts/acceptance.py verify-browser <artifact-dir>` 校验。
- R6 不改产品代码；发现缺陷只记录。

## Acceptance Criteria

- [AC1] P1：侧边吸附与底部吸附两种布局下，滚动缩略图列表任意位置后展开入口仍固定在可视区域右缘/下缘，点击均能打开弹层。
- [AC2] P2：弹层无标题，每项含图片与底边页码；宽视口 5 列且首屏可见至少 4 行，窄视口 3 列；视觉风格与现有设置弹窗一致并有截图复核。
- [AC3] P3：分页器按 100 页分段；当前阅读页位于非首段时弹层默认定位到该分段；点击缩略图后弹层关闭且阅读器跳转到目标页。
- [AC4] 边界与回归：≤100 页仍显示单分段分页器；缩略图加载失败时保留页码与跳转能力；末行不完整时网格对齐无重复页码；跳转后两模式阅读正常，依赖中无第三方 UI 组件库。
- [AC5] 桌面与移动两轮均产出通过 `verify-browser` 校验的预检产物，`acceptance.json` 有对应 runtime/inspection 记录与证据路径，`summarize` 实际执行。

## Notes

- 父任务：`10-25-close-feature-quickstart-acceptance`。
- quickstart 里 `Active branch: 001-thumb-expand-modal` 是历史描述，当前在 `master` 上验收。
- 「缩略图加载失败」用例可用 CDP 请求拦截构造，需在轮次记录里写明构造方式。
