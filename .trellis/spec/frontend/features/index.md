# 功能规范与验收导航

这里承接七组功能的完整需求、模型、契约和历史资料。开发工作流统一使用 [Trellis workflow](../../../workflow.md)，产品方向见[产品目标](../product-goals.md)。

## 阅读顺序与权威

1. 涉及下载元数据、偏好、翻页默认值或放大镜时，先读[已确认行为决策](../decisions/2026-09-18-reader-behavior.md)，其覆盖到的旧约定以决策为准。
2. 按下表读取 spec、data-model、contracts 和 quickstart。七组 spec 的 Draft 状态不代表实现完成；OpenAPI 是逻辑 UI/状态契约，示例 URL 不是部署的 HTTP API。
3. plan、research、tasks 与 checklist 保留历史进度、原勾选和证据。历史代码示例及目录树须结合[当前工程指南](../index.md)核对，不能据此从零重写已有实现。各文档中“当前/本次”保留记录时态。
4. 从[待办与独立清单](pending-work.md)发现后续工作，按 Trellis 另行规划；迁移不自动建历史任务，也不修改其状态。功能变更仍须按[浏览器验收](../browser-acceptance.md)或 [EH 生产包验收](../../../../.pi/skills/eh-test/SKILL.md)重测。

## 七组资料

| 功能 | 需求与模型 | 契约 | 验收 | 历史资料 |
| --- | --- | --- | --- | --- |
| 翻页动效 · `001-add-pageflip-toggle` | [spec](001-add-pageflip-toggle/spec.md) · [data-model](001-add-pageflip-toggle/data-model.md) | [page-turn-animation.openapi.yaml](001-add-pageflip-toggle/contracts/page-turn-animation.openapi.yaml) | [quickstart](001-add-pageflip-toggle/quickstart.md) · [requirements](001-add-pageflip-toggle/checklists/requirements.md) | [plan](001-add-pageflip-toggle/plan.md) · [research](001-add-pageflip-toggle/research.md) · [tasks](001-add-pageflip-toggle/tasks.md) |
| 页面放大镜 · `001-add-pageview-magnifier` | [spec](001-add-pageview-magnifier/spec.md) · [data-model](001-add-pageview-magnifier/data-model.md) | [pageview-magnifier.openapi.yaml](001-add-pageview-magnifier/contracts/pageview-magnifier.openapi.yaml) | [quickstart](001-add-pageview-magnifier/quickstart.md) · [requirements](001-add-pageview-magnifier/checklists/requirements.md) | [plan](001-add-pageview-magnifier/plan.md) · [research](001-add-pageview-magnifier/research.md) · [tasks](001-add-pageview-magnifier/tasks.md) |
| 可停靠面板布局 · `001-dockable-panel-layout` | [spec](001-dockable-panel-layout/spec.md) · [data-model](001-dockable-panel-layout/data-model.md) | [layout-contract.openapi.yaml](001-dockable-panel-layout/contracts/layout-contract.openapi.yaml) | [quickstart](001-dockable-panel-layout/quickstart.md) · [requirements](001-dockable-panel-layout/checklists/requirements.md) | [plan](001-dockable-panel-layout/plan.md) · [research](001-dockable-panel-layout/research.md) · [tasks](001-dockable-panel-layout/tasks.md) |
| 画集下载打包 · `001-gallery-download-bundle` | [spec](001-gallery-download-bundle/spec.md) · [data-model](001-gallery-download-bundle/data-model.md) | [gallery-download.openapi.yaml](001-gallery-download-bundle/contracts/gallery-download.openapi.yaml) | [quickstart](001-gallery-download-bundle/quickstart.md) · [requirements](001-gallery-download-bundle/checklists/requirements.md) | [plan](001-gallery-download-bundle/plan.md) · [research](001-gallery-download-bundle/research.md) · [tasks](001-gallery-download-bundle/tasks.md) |
| 平台注入 · `001-platform-injection` | [spec](001-platform-injection/spec.md) · [data-model](001-platform-injection/data-model.md) | [AlbumService.ts](001-platform-injection/contracts/AlbumService.ts) | [quickstart](001-platform-injection/quickstart.md) · [requirements](001-platform-injection/checklists/requirements.md) | [plan](001-platform-injection/plan.md) · [research](001-platform-injection/research.md) · [tasks](001-platform-injection/tasks.md) |
| 缩略图展开 · `001-thumb-expand-modal` | [spec](001-thumb-expand-modal/spec.md) · [data-model](001-thumb-expand-modal/data-model.md) | [thumb-expand-modal.openapi.yaml](001-thumb-expand-modal/contracts/thumb-expand-modal.openapi.yaml) | [quickstart](001-thumb-expand-modal/quickstart.md) · [requirements](001-thumb-expand-modal/checklists/requirements.md) | [plan](001-thumb-expand-modal/plan.md) · [research](001-thumb-expand-modal/research.md) · [tasks](001-thumb-expand-modal/tasks.md) |
| 更多设置 · `002-more-settings-modal` | [spec](002-more-settings-modal/spec.md) · [data-model](002-more-settings-modal/data-model.md) | [settings-modal.openapi.yaml](002-more-settings-modal/contracts/settings-modal.openapi.yaml) | [quickstart](002-more-settings-modal/quickstart.md) · [requirements](002-more-settings-modal/checklists/requirements.md) | [plan](002-more-settings-modal/plan.md) · [research](002-more-settings-modal/research.md) · [tasks](002-more-settings-modal/tasks.md) |

## 已知状态差异

- 平台 T043–T082/T098：EH/NH parser、service 与 factory 已存在，旧计划未按此清单验收；保持未勾，不要求从零重写。
- 平台 T149：NH 构造器把原生 `src` 改为 `x-src`，parser 只读 `data-x-src`，曾导致 45 页缩略图为空；2026-09-20 已修复（`parseData()` 增加 `x-src` 回退）并完成 T113 的真实 NH 验收，`ImgHtmlParser.ts:38` 依真实图片页证据判定无需改动。记录见 [001-platform-injection/tasks.md](001-platform-injection/tasks.md) 的 T149/T113 与 Trellis 任务 `09-20-nh-thumb-src-parser`。
- 平台契约及旧性能目标为 60 秒，`src/platform/initializer.ts` 当前为 `TIMEOUT_MS = 120000`。保留差异，改变行为前对齐，不能把旧契约当作当前实现事实。
- 翻页/设置旧勾选不证明新决策已通过；放大镜 tasks 全勾但 requirements/quickstart 仍有未勾；下载 T036/T037 有历史证据但 requirements 仍有未勾。详情见[独立状态表](pending-work.md#独立状态表)。
- `.tmp/` 截图、日志、内存对照与下载产物是历史本机证据，可能不随仓库存在；缺失不补造，不声称本轮重跑。平台四份 `validation-us*.md` / `final-validation.md` 是未产出的历史计划文件名。

迁移前后逐文件去向、原 SHA-256 与保全方法记录于迁移任务 `09-19-migrate-speckit-to-trellis` 的 `research/source-inventory.json`、`research/migration-report.md`；归档后仍按任务名查找。旧框架原文可从基线 `647ff26` 追溯，旧路径仅作来源标识。
