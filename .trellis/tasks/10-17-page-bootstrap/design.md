# 设计：当前页面验收 bootstrap

## 1. 边界与依赖

本子任务只扩展现有 `scripts/browser-preflight.mjs` 验收载具并更新 `tests/browser-preflight.test.mjs` fixture，不新增 helper module、不修改 `core/`、`src/platform/**` 或产品 DOM。它依赖 browser-artifact-verification 子任务固定的 artifact/task-space 事实字段；与 resource-cleanup-check 没有代码依赖，但两者复用同一 task space/page 声明。父任务最后更新 browser acceptance spec 和 `eh-test` skill。

## 2. Bootstrap 数据流

1. 调用方在既有 task space/page 打开真实目标页面，bootstrap helper 先记录 URL、profile、space/page、时间及 reader 是否已打开。
2. helper 只通过正常 UI/页面观察判断状态；不清 storage、不设置 `readingMode`、不注入 debug bridge。若 reader 已自动打开而场景需要关闭状态基线，场景通过 `closeReader` callback 让 helper 正常 UI 关闭，再按需要调用 `openReader`；没有场景 callback 时只观察并记录，绝不猜测 selector。准备动作保持串行。`readerOpen` 只表示 DOM 挂载与可见性，不含 `prepareReader` 的视口贴合（`rect.top`）判据，两者不可互相替代。
3. helper 读取实际可见 mode 容器：`.content.book-mode` 或 `.content.scroll-mode`。scroll 场景从可见 `.awesome-scroll-view` 读取 `scrollTop`、scrollHeight 和 clientHeight；禁止默认读取 window/document。
4. helper 读取 `.status-pannel .progress` 作为可选页面事实，并结合场景提供的页身份或可见 `.page-container` 观察生成 baseline。baseline 保存绝对显示值只是证据，断言使用相对 delta 或前后身份；比较结果用 `blockedReason`（`navigated`/`incomparable-spread`/`no-baseline`）区分不可比原因。
5. helper 输出 `prepFacts` 和 `.tmp/` JSON 证据；后续场景消费同一对象并串行执行动作。导航、reader 未初始化、selector 不可见或动态脚本在两次观察之间晚到（`host-script-late`）时输出 blocked/unknown。

## 3. 接口与失败语义

在 `scripts/browser-preflight.mjs` 中导出 `bootstrapReader({ page, taskSpace, profile, observe, closeReader, openReader, artifactDir })`，返回 `{ status, prepFacts, evidence, errors }`。`prepFacts` 至少包含 `taskSpace`、`url`、`profile`、`readerOpen`、`readingMode`、`scrollContainer`、`pageBaseline` 和 `observedAt`。`readingMode`、scroll container 或 baseline 不可证明时使用 `unknown` 并带错误，不用默认值补齐。

`page.events()` 仍由 `withBrowserPreflight` 唯一消费；helper 不创建第二个 event drain。场景可以传入稳定 selector/观察函数和正常 UI callbacks，但 helper 不内置 EH/NH 站点入口。动态 host script 只作为准备状态/identity 证据，bundle 身份由 preflight provenance verifier 负责。

## 4. Fixture 与回归

- persisted book fixture：通过既有 UI 设置 book 状态，重新打开页面后观察 `.content.book-mode` 和相对页 baseline。
- persisted scroll fixture：通过既有 UI 设置 scroll 状态，证明 `.awesome-scroll-view.scrollTop` 改变而 window scroll 不作为依据。
- mobile/desktop fixture 使用 browser-acceptance 规定的 viewport、DPR、touch 和 coarse 参数；不扩展到物理设备。
- blocked fixture 覆盖自动打开未完成、动态脚本晚到、页面导航和不可见容器；每个 fixture 记录 blocked/unknown，不生成 passed。

## 5. 兼容与回滚

现有 preflight 调用和 product assertions 保持不变；helper 是可选准备步骤，旧场景没有 prepFacts 时不能被默认为 fresh passed。若观察契约误报，保留 artifact/fixture，停用 helper 调用并回滚验收载具改动，不改 reader 产品实现。