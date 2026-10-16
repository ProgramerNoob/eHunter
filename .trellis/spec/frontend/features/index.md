# 功能规范与验收导航

这里承接七组功能的当前需求、模型、契约与验收步骤。开发工作流统一使用 [Trellis workflow](../../../workflow.md)，产品方向见[产品目标](../product-goals.md)。

## 阅读顺序与权威

1. 涉及下载元数据、偏好、翻页默认值或放大镜时，先读[已确认行为决策](../decisions/2026-09-18-reader-behavior.md)，其覆盖到的旧约定以决策为准。
2. 按下表读取 spec、data-model、contracts 和 quickstart。OpenAPI 是逻辑 UI/状态契约，示例 URL 不是部署的 HTTP API。
3. spec、data-model 与 contracts 描述当前系统；与代码冲突时以代码为准，不能据此从零重写已有实现。
4. 从[未收口项](pending-work.md)发现后续工作，按 Trellis 另行规划。功能变更仍须按[浏览器验收](../browser-acceptance.md)或 [EH 生产包验收](../../../../.pi/skills/eh-test/SKILL.md)重测。

## 七组资料

| 功能 | 需求与模型 | 契约 | 验收 |
| --- | --- | --- | --- |
| 翻页动效 · `001-add-pageflip-toggle` | [spec](001-add-pageflip-toggle/spec.md) · [data-model](001-add-pageflip-toggle/data-model.md) | [page-turn-animation.openapi.yaml](001-add-pageflip-toggle/contracts/page-turn-animation.openapi.yaml) | [quickstart](001-add-pageflip-toggle/quickstart.md) |
| 页面放大镜 · `001-add-pageview-magnifier` | [spec](001-add-pageview-magnifier/spec.md) · [data-model](001-add-pageview-magnifier/data-model.md) | [pageview-magnifier.openapi.yaml](001-add-pageview-magnifier/contracts/pageview-magnifier.openapi.yaml) | [quickstart](001-add-pageview-magnifier/quickstart.md) |
| 可停靠面板布局 · `001-dockable-panel-layout` | [spec](001-dockable-panel-layout/spec.md) · [data-model](001-dockable-panel-layout/data-model.md) | [layout-contract.openapi.yaml](001-dockable-panel-layout/contracts/layout-contract.openapi.yaml) | [quickstart](001-dockable-panel-layout/quickstart.md) |
| 画集下载打包 · `001-gallery-download-bundle` | [spec](001-gallery-download-bundle/spec.md) · [data-model](001-gallery-download-bundle/data-model.md) | [gallery-download.openapi.yaml](001-gallery-download-bundle/contracts/gallery-download.openapi.yaml) | [quickstart](001-gallery-download-bundle/quickstart.md) |
| 平台注入 · `001-platform-injection` | [spec](001-platform-injection/spec.md) · [data-model](001-platform-injection/data-model.md) | [AlbumService.ts](001-platform-injection/contracts/AlbumService.ts) | [quickstart](001-platform-injection/quickstart.md) |
| 缩略图展开 · `001-thumb-expand-modal` | [spec](001-thumb-expand-modal/spec.md) · [data-model](001-thumb-expand-modal/data-model.md) | [thumb-expand-modal.openapi.yaml](001-thumb-expand-modal/contracts/thumb-expand-modal.openapi.yaml) | [quickstart](001-thumb-expand-modal/quickstart.md) |
| 更多设置 · `002-more-settings-modal` | [spec](002-more-settings-modal/spec.md) · [data-model](002-more-settings-modal/data-model.md) | [settings-modal.openapi.yaml](002-more-settings-modal/contracts/settings-modal.openapi.yaml) | [quickstart](002-more-settings-modal/quickstart.md) |

## 已知状态差异

- 平台契约及旧性能目标为 60 秒，`src/platform/initializer.ts` 当前为 `TIMEOUT_MS = 120000`。保留差异，改变行为前对齐，不能把旧契约当作当前实现事实。
- 下载 `spec.md` 要求 `downloadTime` 为用户本地时区，当前生产者为 UTC `toISOString()`；同一规格要求顺序抓取，当前实现为三个并发 worker。两处行为未改。
- NH 构造器把原生 `src` 改写为 `x-src`、`data-src` 改写为 `data-x-src`；`src/platform/nh/parser/IntroHtmlParser.ts` 的 `parseData()` 两者都接受，未改写的页面仍可解析。
- `.tmp/` 截图、日志、内存对照与下载产物是本机证据，可能不随仓库存在；缺失不补造，不声称本轮重跑。平台四份 `validation-us*.md` / `final-validation.md` 尚未产出。
