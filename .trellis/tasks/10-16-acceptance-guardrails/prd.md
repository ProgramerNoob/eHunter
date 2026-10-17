# 验收证据与浏览器收口护栏

## Goal

为浏览器验收补充四类可复用护栏：证据新鲜度与语义一致性、真实页面状态 bootstrap、任务改动范围门禁、任务资源清理检查。目标是在不修改 reader/platform 产品行为的前提下，减少旧 artifact 被误报为通过、重复临时脚本调试，以及服务/浏览器资源残留。

## Background and constraints

- 本轮 NH 真站验收曾出现 `result.json` 为 `observed: blocked`、报告却写成 passed 的情况；T115 也曾发生验收编号与产品断言错位。
- 当前 acceptance 协议允许 runtime/inspection check 使用 `execution: null`，且只验证 evidence 文件可读；`.trellis/spec/frontend/quality-guidelines.md` 明确说明目前没有自动依赖追踪或源码 hash，文件可读不代表证据真实。
- 真实 Ego 页面会持久化阅读模式并持续注入站点脚本；验收脚本不能假定默认模式、固定 DOM 选择器或固定绝对页码。
- 只检查本任务创建的 agent-owned 页面、进程、端口和 PID 文件；不得关闭或覆盖 user-owned 浏览器资源。
- 不修改 reader/platform 产品代码；不把本任务变成 NH/EH 功能回归任务；既有 `npm run check` 的类型检查、测试、构建和文档检查保持不变。

## Requirements

- R1 证据 provenance：浏览器 artifact 保存 build/loader/source hash、调用方显式声明的 scenario/test input 路径与 hash、有效 URL、viewport/profile、task space/page、artifact 目录和 `result.json` 关联；声明输入变化后旧 artifact 能被识别为 stale。
- R2 acceptance 语义校验：由独立 `python3 scripts/acceptance.py verify-browser <artifact-dir>` 校验结构化 artifact；验证 result 的 `observed`、`checks`、`errors`、`eventCollection.unresolved` 与身份字段，并对照当前 build/loader/source 和 scenario/test inputs 判定新鲜度。`browser-preflight` 只生成事实证据，不导出 acceptance check；未声明 scenario input、或报告中的 passed 覆盖 artifact 的 blocked/failed 时不得作为 passed。
- R3 当前页面 bootstrap：复用现有 task space，打开前识别并处理自动打开的 reader、当前阅读模式和真实可见滚动容器；页码断言支持相对变化；输出可供后续场景使用的 prep facts。不得用 debug bridge 或页面注入替代正常 UI。
- R4 范围门禁：新任务在 `task.json` 的 `meta.scope` 声明允许的改动类别/路径；创建任务时预置仅含自身 task-evidence 路径的 enforce scope，其他改动路径须显式声明。`task.py start` 记录 tracked/index/worktree/untracked 的 scope-start 快照，归档只检查快照之后的变化；只在归档时检查变更是否符合声明，越界时阻断并指出需要拆任务或更新规划的位置。`task.py finish` 仍只负责清除当前任务指针，不运行范围门禁。
- R5 资源清理检查：提供 `python3 scripts/acceptance.py cleanup-browser <task-space> --pages <json> --servers <json> --output <path>` 收尾检查，核对本任务创建的 agent-owned Ego 页面、server PID、监听端口和 PID 文件；user-owned 页面保留，检查结果写入 `.tmp/` 证据。
- R6 兼容性：现有 acceptance schema、`npm run check`、EH/Vite 既有验收流程和历史归档记录不因新护栏失效；缺少新 provenance 的历史任务应明确报告为 legacy/需回填，而不是静默通过。
- R7 测试与文档：为 stale artifact、blocked result、动态 host script、持久化模式、范围越界、资源残留和 user-owned 页面保留分别增加回归测试或可执行 fixture；更新对应 `.trellis/spec/` 与 `eh-test`/浏览器验收操作说明。

## Acceptance Criteria

- [AC1] acceptance 工具能拒绝或标记与当前 build/loader/source 不匹配的旧 browser artifact，并能拒绝报告 passed 但 `result.json` blocked/failed 的检查。
- [AC2] 当前页面 bootstrap 在 persisted book/scroll 两种初始状态下都能输出真实模式、滚动容器和页码基线；至少有 desktop 与 mobile fixture/回归覆盖。
- [AC3] 任务范围声明能在直接归档与 acceptance 归档路径中对越界改动阻断，并在合法 tooling、测试、规范和任务证据改动时通过；`task.py finish` 不受范围门禁影响。
- [AC4] 资源清理检查能识别本任务残留的 agent-owned page、server、端口或 PID 文件，同时不触碰 user-owned 页面。
- [AC5] `npm test`、`npm run type-check`、`npm run build-prod`、`npm run check:docs` 与新增专项测试通过；既有 EH/NH/Vite preflight 测试无回归。
- [AC6] `.trellis/spec/`、`eh-test` skill 和 task workflow 文档记录新契约、失败分类、兼容策略和最小使用示例；任务可用一条收尾路径生成完整证据。

## Task decomposition

- `.trellis/tasks/10-17-browser-artifact-verification/`：交付 R1/R2 与历史兼容部分；对应 AC1。
- `.trellis/tasks/10-17-page-bootstrap/`：交付 R3；对应 AC2。
- `.trellis/tasks/10-17-task-scope-gate/`：交付 R4；对应 AC3。
- `.trellis/tasks/10-17-resource-cleanup-check/`：交付 R5；对应 AC4。
- 父任务保留 AC5/AC6：完成跨子任务集成验收、整体兼容性核对与共用文档收口。

## Confirmed decisions and dependencies

- R2 采用独立结构化 verifier；`browser-preflight` 只写事实 artifact，不写 `acceptance.json` 的 check。
- R4 的唯一范围声明来源是 `task.json.meta.scope`，只在 archive 检查；`task.py start` 保存 task-local scope-start 快照，归档只检查快照后的变化；`task.py finish` 保持纯 session-pointer 操作。直接 native archive 与 acceptance archive 必须最终经过同一 native 范围门禁。
- R5 采用 `cleanup-browser` 命令，调用方显式提供页面和服务 JSON；命令只核对、分类并写 JSON，不关闭页面、不杀进程、不删除 PID 文件。agent-owned 页面观察需显式时区且不超过 5 分钟（300 秒），缺失、无效或过期时为 unknown；归属/任务归属证据不足同样为 unknown，user-owned 始终 preserved。
- 子任务不是自动依赖系统。artifact 先固定 provenance/verifier 契约；page bootstrap 使用同一浏览器载具但不修改产品代码；scope gate 与 cleanup 可分别规划，但对 `scripts/acceptance.py` 的共享 dispatcher 必须串行集成；父任务最后完成跨子任务回归和文档收口。

## Out of scope

- 不修改 `src/platform/**`、reader UI、解析器、请求层或图集产品行为。
- 不增加真实站点压力测试、长期 429 稳定性测试、物理设备矩阵或新的第三方浏览器服务。
- 不自动关闭 user-owned Ego 页面，不自动删除用户已有临时证据，不强制历史任务重跑。
- 不替代产品断言、截图视觉检查或人工判断；自动化只负责证据一致性和收尾边界。
