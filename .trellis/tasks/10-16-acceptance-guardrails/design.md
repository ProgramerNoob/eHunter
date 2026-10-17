# 设计：验收证据与浏览器收口护栏

## 1. 边界、子任务与依赖

父任务只维护共同契约、跨子任务集成、共同文档与 AC5/AC6；四个 child 分别实现可独立验证的护栏。不得修改 `src/platform/**`、reader 产品 UI、解析器、请求层或图集行为。

| 子任务 | 独立交付 | 主要文件边界 | 依赖与顺序 |
| --- | --- | --- | --- |
| `.trellis/tasks/10-17-browser-artifact-verification/` | provenance、fresh/stale/blocked/legacy verifier | `scripts/browser-preflight.mjs`、`scripts/acceptance.py`、preflight/verifier tests | 优先交付，先固定 artifact 契约 |
| `.trellis/tasks/10-17-page-bootstrap/` | persisted mode、真实滚动容器、相对页码、prep facts | `scripts/browser-preflight.mjs`、`tests/browser-preflight.test.mjs` | 消费 artifact/task-space 事实契约；不改产品 DOM，父任务负责共同文档 |
| `.trellis/tasks/10-17-task-scope-gate/` | `meta.scope` schema、start snapshot、变更匹配、native archive gate | `.trellis/scripts/task.py`、`.trellis/scripts/common/task_store.py`、归档 tests | 独立于 browser；acceptance archive 复用 native gate |
| `.trellis/tasks/10-17-resource-cleanup-check/` | 显式资源声明、owner 分类、JSON cleanup 证据 | `scripts/acceptance.py`、cleanup tests | 可独立实现；与 scope child 对共享 dispatcher 的编辑串行 |
| 父任务 | 接口集成、spec/skill/workflow、跨子任务验收 | `.trellis/spec/**`、`.pi/skills/eh-test/SKILL.md`、workflow | 四 child 完成后进行 |

任务树不自动表达顺序；建议先 artifact，再 page、scope、cleanup，最后父集成。scope 与 cleanup 的 dispatcher 修改不得并发写同一文件。

## 2. Browser artifact 与 verifier

`withBrowserPreflight` 保留 `manifest.json`、`source.json`、`result.json`、现有 identity/environment/fingerprint 和 `observed` 语义，新增 `artifactVersion: 1` 与 provenance：实际 URL、profile、viewport、可选 task space/page、artifactDir、result 关联、source kind/hash、caller-declared scenario/test input paths and hashes、run/round id 和时间。manifest 保留初始 `incomplete` 含义；最终执行状态只以原子写入的 `result.json` 为准，并要求 run/round/artifact 关联一致。

独立命令为 `python3 scripts/acceptance.py verify-browser <artifact-dir>`。verifier 读取 manifest/result/source，按 source kind 重算当前 freshness：EH/NH 检查 provenance 中记录的 bundle/loader 路径及 hash；Vite 检查 `source.json` fingerprint 覆盖的仓库输入；所有 source kind 都校验 caller-declared scenario/test input paths 的当前 hash。路径必须解析到当前仓库，缺失/不可读/内容改变判 stale 或 invalid 并列出字段。它不写 `acceptance.json` 或原始 artifact；JSON 输出只作为事实诊断。

只有 `result.observed == passed`、checks 已执行、errors 为空、`eventCollection.unresolved` 为空、manifest/result 关联完整、source-specific identity 符合现有 preflight 契约且 freshness 相符，才能判 fresh passed。blocked/failed/未执行/未决事件/身份缺失绝不由报告文本升级。缺少新 provenance 的旧 artifact 返回 legacy，不伪造通过结论；acceptance schemaVersion 1 保持可读。

## 3. Page bootstrap

helper 在同一 task space/page、真实页面和正常 UI 上工作。先观察 URL、reader open 状态、实际 mode、可见滚动元素和页 baseline；若场景要求关闭状态而 reader 已自动打开，通过场景提供的正常 UI close/open hooks 串行处理，不清理 storage、不覆盖 persisted preference。

固定 DOM 观察使用 reader 实际节点：`.content.book-mode` / `.content.scroll-mode`；scroll 使用 `.awesome-scroll-view` 的 `scrollTop`/尺寸，不假定 window/document scrolling；当前页文本可采 `.status-pannel .progress`，但只做 baseline。输出 `prepFacts` 和 `.tmp/` JSON，字段含 task space/page、URL/profile、readerOpen、readingMode、scroll container、pageBaseline、时间、status/errors。页断言以相对变化或前后身份为准；未知/导航/初始化失败/动态脚本准备未完成均为 blocked/unknown，不能进入 passed 功能结果。helper 不读取 `page.events()`，由 preflight 保持唯一消费者。

## 4. Task scope gate

唯一 allowlist 存在 `task.json.meta.scope`：`version: 1`、`mode: "enforce"`、`categories`（category 名到仓库相对路径规则数组）。`task.py create` 为新 task 预置自身 task-evidence 路径；category/路径规则由 task owner 显式配置，task-evidence 为必需项。路径支持精确 POSIX 路径或末尾 `/**`，拒绝绝对路径、`..` 和空 category。

`task.py start` 在改 task status/session pointer 前捕获当时工作区，写入 task-local `scope-start.json`，包含 HEAD/index tree、tracked dirty/untracked paths 的内容状态摘要和 scope policy digest；task JSON 的 `meta.scope.snapshot` 保存 snapshot 相对路径及 SHA-256。顶层 `scopePolicyVersion: 1` 只标记 gate 适用版本；scope-start 是运行证据，不是第二份 allowlist。启动前已有且未变化的用户修改不纳入本 task diff；启动后新增、删除、内容/类型/权限变化的 tracked、index/worktree、untracked 和 rename 两端路径才按 categories 匹配。快照/策略摘要无效或无法比较时 fail closed。task start 写入失败不激活任务，重复 start 不重置有效快照。

checker 输出每个新变更路径命中的 category/rule 与越界原因。native `task.py archive` 在 status、清 pointer、移动目录、修改 evidence、commit 或 hook 前执行；acceptance archive 委托同一 native gate。`task.py finish` 不接入，仍只清 active pointer。没有 marker 且没有 scope 的 rollout 前历史 task 显式 legacy；新版本首次启动的旧 planning task 迁移 scope/snapshot，marker=1 task 缺快照不得归档，已 active 的旧 task 只通过显式兼容诊断处理。checker 不改 allowlist、不拆任务、不覆盖用户改动。

## 5. Cleanup browser

命令固定为 `python3 scripts/acceptance.py cleanup-browser <task-space> --pages <json> --servers <json> --output <path>`；pages/servers 是显式 JSON 输入，wrapper 含 schemaVersion 1/taskSpace 且 taskSpace 匹配参数；页面 item 含 spaceId/pageId、owner、createdByTask、state、显式时区 observedAt 和 evidence，服务 item 含 PID/PID file/port/expected cwd/command/processStartToken、owner/task/start evidence。命令检查本地 PID/cwd/listener/PID-file，但不遍历资源猜归属，不发 close/kill/unlink。
逐项分类 `clean`、`residual`、`preserved`、`unknown`：agent-owned 页面观察相对 UTC checkedAt 必须为 0–300 秒（含边界），必须有匹配 task 的创建证据；有效 open 为 residual，closed 才 clean，缺失/无效/未来/过期或身份矛盾为 unknown。agent-owned 服务仍存活/监听/PID 文件残留且 identity 匹配为 residual；退出且端口释放、PID 文件由调用方清理，并由启动 evidence 证明 task ownership/identity 才 clean；PID 复用或身份不匹配为 unknown。user-owned 一律 preserved。JSON 含 schemaVersion、taskSpace、checkedAt、逐项 classification 和 diagnostics/evidence；写入 `.tmp/` 且拒绝覆盖。aggregate.status 在全项 clean/preserved（空列表也可）时为 clean，存在 residual 优先为 residual，否则 unknown；退出码 clean=0、residual/unknown=1、输入/输出错误=2。

## 6. 兼容、回滚和集成验收

- acceptance schemaVersion 1、旧 EH/NH/Vite preflight 与 native archive 现有 mutation/commit 语义保持兼容；无 provenance/无 scope 的历史数据走明确 legacy 诊断，不伪造 fresh 或 scope 声明。
- 各 child 只编辑自身路径；共享 acceptance dispatcher 串行接线，父任务最终统一更新 browser/quality/tooling spec、`eh-test` 和 task workflow。
- 若 verifier/bootstrap/cleanup 误报，保留原始 `.tmp/` 证据，关闭新调用入口并修复；若 scope gate 误拦，保留任务目录/status/用户改动，先调整 checker，不绕过归档保护。
- 父任务在真实回归中修复 `scripts/browser-preflight.mjs` 及其测试，超出初始 `meta.scope`。归档前显式新增 tooling category，并以当前 HEAD 重建 start 基线；交付说明记录该范围扩展，不把 helper 修复归入子任务。
- 父任务 AC5/AC6 仅在 child 专项 fixture 与现有 `npm test`、type-check、production build、docs checks 和临时任务生命周期演练通过后验收；真实浏览器功能是否通过仍以实际浏览器证据为准。