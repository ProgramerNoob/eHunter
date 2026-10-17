# 当前页面验收 bootstrap

## Goal

提供基于真实页面当前状态的可复用验收准备步骤，覆盖持久化阅读模式、实际可滚动元素、相对页码基线和动态站点脚本；不通过修改 reader 产品代码来制造确定的初始状态。

## Background and constraints

- 真实页面会持久化 `readingMode`，不能假定每次进入都是书页或卷轴模式，也不能把固定绝对页码当成跨图集断言。
- 当前 reader 的模式容器是 `.content.book-mode` 与 `.content.scroll-mode`；卷轴模式实际滚动元素是 `AwesomeScrollView.vue` 渲染的 `.awesome-scroll-view`，通过 `scrollTop` 变化，不是 `window`/`document` 滚动。
- 当前页文本可从 `.status-pannel .progress` 观察，但它只是真实页面事实，不构成固定页码契约；书页/卷轴组件还可能有各自的分页和滚动定位。
- 验收必须复用同一 task space/page、正常 UI 和 `withBrowserPreflight` 的事件/身份边界；helper 不能自行消费 `page.events()` 或清空用户 storage。
- 本子任务只扩展现有 `scripts/browser-preflight.mjs` 验收载具并复用 `tests/browser-preflight.test.mjs` fixture；browser acceptance spec 和 `eh-test` skill 的共同文档收口由父任务负责，不修改 `core/`、`src/platform/**`、产品选择器或阅读状态逻辑。

## Requirements

- R1 bootstrap 在进入功能断言前观察当前页面，识别 reader 是否已经自动打开；必要时通过正常 UI 关闭/重开，保存当前 URL、task space/page、reader 可见状态和准备阶段结果。
- R2 从真实可见 DOM/页面观察输出实际模式 `book`、`scroll` 或 `unknown`，同时输出可见的 scroll container 身份和滚动位置；不得把 window/document 当作卷轴容器的默认替代。
- R3 输出当前页 baseline（可读页码、页身份或相对位置）及后续相对变化接口；翻页/跳页断言不得写死图集的绝对页码，书页 spread 与卷轴位置都能表达。
- R4 动态 host script、reader 初始化未完成、页面已导航或必要观察失败时，prep facts 必须明确记录 blocked/unknown，并阻止下游把准备成功当成产品通过；不把 host script 充当 eHunter bundle 身份。
- R5 覆盖 persisted book/scroll 两种初始状态和 desktop/mobile 固定 profile（desktop 1200×900/DPR1、mobile 390×844/DPR3/touch5/coarse），动作保持串行并保存 `.tmp/` 证据。
- R6 helper 提供可复用的场景接口：场景可传入本轮已观察的稳定 UI selector 或观察函数；通用 helper 不硬编码 EH/NH 专属入口，也不使用 debug bridge 或注入脚本替代正常 UI。

## Acceptance Criteria

- [AC1] persisted book 与 scroll 两种初始 fixture 均能输出实际 reading mode、reader open 状态和可见滚动容器；scroll fixture 证明读取的是 `.awesome-scroll-view` 的 `scrollTop`，不是 window/document。
- [AC2] bootstrap 能在当前页不是固定起始页时保存 baseline，并用相对页码/位置验证前后变化，不因绝对页码不同而误报失败。
- [AC3] 自动打开、初始化未完成、动态脚本晚到或页面导航变化等准备异常被记录为 blocked/unknown，下游不生成虚假的 passed prep fact。
- [AC4] desktop 与 mobile fixture 均覆盖，且 helper 不直接调用 `page.events()`、不清理 storage、不改 reader 产品代码；输出证据路径位于 `.tmp/`。
- [AC5] 使用同一 task space/page 的场景示例能消费 `prepFacts` 后再进入 book/scroll 功能阶段，既有 browser preflight 测试无回归。

## Out of scope

- 不修改 `core/components/ReaderView.vue`、`AlbumBookView.vue`、`AlbumScrollView.vue`、`AwesomeScrollView.vue` 或任何 `src/platform/**` 产品行为。
- 不实现 browser artifact provenance/verifier、任务范围门禁或资源关闭/杀进程逻辑。
- 不把场景 selector 扩展成全站通用 DOM 解析器，不做真实站点压力测试或物理设备矩阵。