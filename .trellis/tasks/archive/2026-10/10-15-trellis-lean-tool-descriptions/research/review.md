# Trellis lean 独立审查

结论：**发现 1 项 P2 阻塞问题，AC3、AC7 暂不能判通过**。其余已审查实现和证据未发现需要阻塞的回归。本轮没有修复实现、测试或验收记录；后续修复应另开一轮，并更新受影响计数后复核。

## 审查范围与方法

- 基线：`e7e5f280c95ee22b5cc8406cb7253d5a5f2ede8b`（当前 HEAD）。检查 `git diff e7e5f28`、工作区和暂存区；暂存区为空。21 个已跟踪修改文件均已阅读，另读 3 个未跟踪脚本、任务资料与报告。具体冻结散列见 [evidence-audit.json](../../../../.tmp/trellis-lean-review/evidence-audit.json)。
- Standards：以项目 AGENTS、`pi-context.md`、代码复用指南、验收协议为依据，核对权限、工具白名单、上下文预算、平台边界、错误处理、测试与证据。
- Spec：逐个比较基线与 lean 的 9 个 skills、3 个 prompts、3 个 agents、workflow；按照触发条件、动作、停止条件、权限、独立上下文可获得性判断，不把字数减少或关键词出现视为语义等价。
- 复用主会话冻结版本的测试记录，没有重复运行无变化回归、构建或浏览器。本轮新增执行仅为读取证据并交叉校验散列/计数/日志的审计，以及只读 `acceptance.py summarize`。
- 仅写入本报告和 `.tmp/trellis-lean-review/`。未修改 `acceptance.json`、未派发其他代理、未提交。

## 阻塞发现

### R1 · P2 · 七段规范输出的适用范围被收窄

位置：`.agents/skills/trellis-update-spec/SKILL.md:16`；同一限制在 `.agents/skills/trellis-update-spec/SKILL.md:49` 再次出现。影响 Spec 的 AC3、AC7，也违反 `pi-context.md` 中保留 skills 触发分支的约定。

基线 `.agents/skills/trellis-update-spec/SKILL.md:25` 列出四类触发条件：command/API signature、cross-layer request/response、database schema/migration、infra integration；随后 `.agents/skills/trellis-update-spec/SKILL.md:33` 明确要求：

> For triggered tasks, include all sections below:

lean 在 `.agents/skills/trellis-update-spec/SKILL.md:12` 保留四类触发条件，却在七段清单前改成：

> For the required infra/cross-layer cases, include:

这会让单层 command/API 签名变更或独立数据库迁移只满足泛化的“code-spec depth”，不再明确承担七段输出、错误矩阵、测试断言点和至少一组 wrong/correct 的完整义务。例如仅修改一个本地命令参数，无需跨层或基础设施集成，原版仍要求七段，lean 可以被合理理解为无此要求。文件最后的通用质量清单没有恢复完整七段结构的适用范围。

建议下一轮将清单前的范围恢复为“上述任一触发条件”，并让模板说明与之保持一致；无需增加新门槛或重复长段规则。修改后重算受影响 skill 正文/索引报告，针对四类触发条件重新做文本契约核对。本轮按派发要求不自动修复。

## 原规则 → lean 位置对照

以下“基线”均指固定提交 `e7e5f28`。表中列出具体义务及其保留方式；“保留”指静态规则核对结果，不宣称模型在所有输入下行为完全相同。

### 9 个 skills

| 文件与基线入口 | 原规则与适用条件 | lean 位置与核对结果 |
| --- | --- | --- |
| `.agents/skills/trellis-before-dev/SKILL.md:3`、`.agents/skills/trellis-before-dev/SKILL.md:6` | 编码前、切换包、刷新规范；先读任务资料，再识别 packages/indexes 与实际 guidelines/shared guides；非平凡改动先明确 owner、文件、边界和复用依据，不扩大任务。 | `.agents/skills/trellis-before-dev/SKILL.md:3` 保留全部索引触发；`.agents/skills/trellis-before-dev/SKILL.md:8` 起保留读取顺序、不能只读 index，以及非平凡定义和边界检查。删除的是重复开场和排版，未新增规模门槛。 |
| `.agents/skills/trellis-brainstorm/SKILL.md:8`、`.agents/skills/trellis-brainstorm/SKILL.md:16` | 任务创建同意不等于实施同意；实施前须由用户在后续回复明确认可最新最终方案，实质变化重新审阅；可查的事实自己查，产品/范围/UX/风险决策不能代猜。 | `.agents/skills/trellis-brainstorm/SKILL.md:8` 与 `.agents/skills/trellis-brainstorm/SKILL.md:14` 分别保留审批和证据规则。每轮只问一个最重要的未决问题后停止，选择题优先，完整当前注入可复用。 |
| `.agents/skills/trellis-brainstorm/SKILL.md:30`、`.agents/skills/trellis-brainstorm/SKILL.md:44`、`.agents/skills/trellis-brainstorm/SKILL.md:127`、`.agents/skills/trellis-brainstorm/SKILL.md:172` | 非空 title/description、slug、逐次回填 PRD、必要的 design/implement 与真实 manifests、inline 例外；一阶原理分析、收敛检查与最终摘要；PRD 改写不能丢失 ID、锚点、证据、AC 映射。 | `.agents/skills/trellis-brainstorm/SKILL.md:20`、`.agents/skills/trellis-brainstorm/SKILL.md:32`、`.agents/skills/trellis-brainstorm/SKILL.md:42`、`.agents/skills/trellis-brainstorm/SKILL.md:52`、`.agents/skills/trellis-brainstorm/SKILL.md:64`、`.agents/skills/trellis-brainstorm/SKILL.md:75` 各自保留对应命令、分支及完成条件。示例被压缩，审批条件没有改成模型自行判定。 |
| `.agents/skills/trellis-break-loop/SKILL.md:12`、`.agents/skills/trellis-break-loop/SKILL.md:114`、`.agents/skills/trellis-break-loop/SKILL.md:174` | 修复后分析根因、失败尝试、预防、同类扩展、知识沉淀；A–E 根因、行动优先级/状态；先验总和 100%、证据可靠性、90/70/50 置信区间；分析后写 spec、适用时同步模板并提交。 | `.agents/skills/trellis-break-loop/SKILL.md:10`、`.agents/skills/trellis-break-loop/SKILL.md:30`、`.agents/skills/trellis-break-loop/SKILL.md:54`、`.agents/skills/trellis-break-loop/SKILL.md:73` 保留五轴、输出字段、数值边界和后续动作。去掉的是哲理/重复解释；没有把“分析”替换成不落盘的总结。 |
| `.agents/skills/trellis-channel/SKILL.md:14`、`.agents/skills/trellis-channel/SKILL.md:31`、`.agents/skills/trellis-channel/SKILL.md:42`、`.agents/skills/trellis-channel/SKILL.md:63` | 实时协作/worker/review/progress/forum/log 各路由；指定线程先看内容，长文 stdin/file，稳定 `--as`，scope；完成事件用 `--kind done/turn_finished`，不是 `--tag`；interrupt 特例，CLI 负责状态，保留 raw audit；静态 review/自记日志/历史检索不走 channel。 | `.agents/skills/trellis-channel/SKILL.md:14`、`.agents/skills/trellis-channel/SKILL.md:31`、`.agents/skills/trellis-channel/SKILL.md:41`、`.agents/skills/trellis-channel/SKILL.md:54`、`.agents/skills/trellis-channel/SKILL.md:62` 保留路由和所有命令语义；多轮讨论与 durable event 区分仍在。 |
| `.agents/skills/trellis-check/SKILL.md:12`、`.agents/skills/trellis-check/SKILL.md:19`、`.agents/skills/trellis-check/SKILL.md:39`、`.agents/skills/trellis-check/SKILL.md:73`、`.agents/skills/trellis-check/SKILL.md:104` | 变更后、提交前、上下文漂移时核对 diff、task/spec、lint/types/tests；范围纪律、测试契约、三层以上数据流、按概念找复用、依赖与同层一致性；局部明确问题可修，设计判断/越界问题停下报告。 | `.agents/skills/trellis-check/SKILL.md:3`、`.agents/skills/trellis-check/SKILL.md:8`、`.agents/skills/trellis-check/SKILL.md:15`、`.agents/skills/trellis-check/SKILL.md:26`、`.agents/skills/trellis-check/SKILL.md:35`、`.agents/skills/trellis-check/SKILL.md:54` 保留相同覆盖与修复边界；没有借压缩赋予额外修改权限。 |
| `.agents/skills/trellis-meta/SKILL.md:22`、`.agents/skills/trellis-meta/SKILL.md:30`、`.agents/skills/trellis-meta/SKILL.md:64`、`.agents/skills/trellis-meta/SKILL.md:77` | 理解/定制本地 Trellis、平台配置、channel、模板、registry refresh、mem、bundled skills；本地规范优先，不改全局安装/npm/node_modules；保护用户改动、hash、`.new`；worker 与 platform agent 区别、事件日志不得手写。 | `.agents/skills/trellis-meta/SKILL.md:3`、`.agents/skills/trellis-meta/SKILL.md:10`、`.agents/skills/trellis-meta/SKILL.md:18`、`.agents/skills/trellis-meta/SKILL.md:36`、`.agents/skills/trellis-meta/SKILL.md:48` 保留配置键、平台特例、命令/资料路由、写入边界与更新关系。TUI 进度卡的人用介绍被删，不改变行为契约。 |
| `.agents/skills/trellis-session-insight/SKILL.md:18`、`.agents/skills/trellis-session-insight/SKILL.md:31`、`.agents/skills/trellis-session-insight/SKILL.md:38`、`.agents/skills/trellis-session-insight/SKILL.md:50` | 旧决策/重叠 brainstorm/熟悉 bug/续会话/finish review 等触发；当前代码/spec 可回答时不强行 recall，用户禁止历史时跳过，完整子代理注入可复用；本地 provider 路径与 cwd 相对 sessionDir；phase 切片；PRD/design 写回先提议，非强制落盘，无远程同步。 | `.agents/skills/trellis-session-insight/SKILL.md:3`、`.agents/skills/trellis-session-insight/SKILL.md:10`、`.agents/skills/trellis-session-insight/SKILL.md:14`、`.agents/skills/trellis-session-insight/SKILL.md:29`、`.agents/skills/trellis-session-insight/SKILL.md:49` 保留发现触发、跳过条件、命令和写回权限。未把 mem 变为每次任务的强制步骤。 |
| `.agents/skills/trellis-spec-bootstrap/SKILL.md:10`、`.agents/skills/trellis-spec-bootstrap/SKILL.md:18`、`.agents/skills/trellis-spec-bootstrap/SKILL.md:27`、`.agents/skills/trellis-spec-bootstrap/SKILL.md:35` | 从 GitNexus/ABCoder/源码建立或刷新具体规范；以真实包/层边界组织，单一 owner、跨平台文本、有代码证据、不留模板空洞；四份参考路由与完成检查。 | `.agents/skills/trellis-spec-bootstrap/SKILL.md:3`、`.agents/skills/trellis-spec-bootstrap/SKILL.md:10`、`.agents/skills/trellis-spec-bootstrap/SKILL.md:18`、`.agents/skills/trellis-spec-bootstrap/SKILL.md:27`、`.agents/skills/trellis-spec-bootstrap/SKILL.md:31` 保留来源、边界、引用与完成条件。 |
| `.agents/skills/trellis-update-spec/SKILL.md:25`、`.agents/skills/trellis-update-spec/SKILL.md:33`、`.agents/skills/trellis-update-spec/SKILL.md:44`、`.agents/skills/trellis-update-spec/SKILL.md:95` | 四类变化均需七段可执行规范；特性/设计/bug/模式/gotcha/约定/checklist 触发；先读目标、分类、具体示例+原因、更新 index，guide 与层规范区分。 | `.agents/skills/trellis-update-spec/SKILL.md:8`、`.agents/skills/trellis-update-spec/SKILL.md:12`、`.agents/skills/trellis-update-spec/SKILL.md:26`、`.agents/skills/trellis-update-spec/SKILL.md:43`、`.agents/skills/trellis-update-spec/SKILL.md:73`、`.agents/skills/trellis-update-spec/SKILL.md:77` 保留常规更新流程；**`.agents/skills/trellis-update-spec/SKILL.md:16` 把七段结构收窄为 infra/cross-layer，R1 未通过。** |

### 3 个 prompts 与 3 个 agents

| 基线入口 | 原规则 | lean 位置与核对结果 |
| --- | --- | --- |
| `.pi/prompts/trellis-start.md:7`、`.pi/prompts/trellis-start.md:16`、`.pi/prompts/trellis-start.md:25`、`.pi/prompts/trellis-start.md:36` | get_context、更新通知原样转达、phase/packages/indexes；无任务、planning、in_progress 分流；技能路由。 | `.pi/prompts/trellis-start.md:5`、`.pi/prompts/trellis-start.md:29`、`.pi/prompts/trellis-start.md:43` 保留命令顺序、通知与各分支；“创建同意不等于实施同意”复用原 workflow 规则，未增门槛。 |
| `.pi/prompts/trellis-continue.md:7`、`.pi/prompts/trellis-continue.md:23`、`.pi/prompts/trellis-continue.md:42` | 读取当前状态/索引，根据 artifacts 和 manifests 判断阶段；planning 不能跳过用户审阅/start；`required`/`once`/顺序/rollback，具体步骤 `--platform pi`。 | `.pi/prompts/trellis-continue.md:5` 起保留同样命令和全部状态分流；压缩表格没有合并 planning 与 in_progress 的授权。 |
| `.pi/prompts/trellis-finish-work.md:5`、`.pi/prompts/trellis-finish-work.md:19`、`.pi/prompts/trellis-finish-work.md:45`、`.pi/prompts/trellis-finish-work.md:73` | survey 当前及额外 completed tasks，额外归档一次确认默认否；分类脏路径/并行任务所有权，不能在此补提交；只用 acceptance archive wrapper，0/1/2/4 分流、失败不盲重试；waiver 原观察和权限公开；journal 使用工作提交 hash，不用 archive commit。 | `.pi/prompts/trellis-finish-work.md:5`、`.pi/prompts/trellis-finish-work.md:13`、`.pi/prompts/trellis-finish-work.md:21`、`.pi/prompts/trellis-finish-work.md:35` 完整保留。waived archive=0 与 summarize=3 区分、work→archive→journal 顺序仍明确。 |
| `.pi/agents/trellis-implement.md:8`、`.pi/agents/trellis-implement.md:39`、`.pi/agents/trellis-implement.md:47`、`.pi/agents/trellis-implement.md:56` | 路径按 dispatch 首行→current→询问；manifest 一次，跳过无 file 行，任务资料顺序、缺 PRD 停止、空 manifest 回退；压缩保留状态/证据/下一步，未变材料不重读；不再派 implement/check；范围/复用/根因/测试与用户改动保护；不 commit/push/merge。 | `.pi/agents/trellis-implement.md:5` 工具名单原样；`.pi/agents/trellis-implement.md:10` 和 `.pi/agents/trellis-implement.md:21` 独立包含加载和执行边界，没有假设主会话规则会自动传入。 |
| `.pi/agents/trellis-check.md:8`、`.pi/agents/trellis-check.md:39`、`.pi/agents/trellis-check.md:47`、`.pi/agents/trellis-check.md:63` | 相同上下文加载/压缩/递归限制；直接审查与范围内修复；所有 AC/场景映射，保留 partial/failed/unrun；只回传建议，由主会话写 acceptance；raw summarize/exit、waiver 权限不能自造。 | `.pi/agents/trellis-check.md:5` 白名单原样；`.pi/agents/trellis-check.md:10`、`.pi/agents/trellis-check.md:21`、`.pi/agents/trellis-check.md:27` 保留独立契约及 0/3/1/2 状态处理。本轮明确的只读 dispatch 优先于通用修复职责。 |
| `.pi/agents/trellis-research.md:11`、`.pi/agents/trellis-research.md:17`、`.pi/agents/trellis-research.md:25` | current 确定任务、每主题落盘、查内部与必要外部资料、返回路径+简述；只写 research；压缩后保留推进。 | `.pi/agents/trellis-research.md:5` 保留 9 个工具（不含 edit）；`.pi/agents/trellis-research.md:10` 起保留每主题保存、current 命令、压缩连续性和 research 写入边界。 |

### Workflow、固定注入与执行契约

| 原规则 / 基线位置 | lean 位置与核对结果 |
| --- | --- |
| `.trellis/workflow.md:155` 的 triage/creation consent；`.trellis/workflow.md:161` 的 PRD/design/implement/manifests；复杂任务审阅后 start。 | `.trellis/workflow.md:155`、`.trellis/workflow.md:161` 保留同一分工、轻量例外和审批条件；没有用文件存在代替用户批准。 |
| `.trellis/workflow.md:169` 的父子树与依赖；详细 1.1 规定无 direct work 不 start parent。 | `.trellis/workflow.md:171` 集中说明，`.trellis/workflow.md:358` 详细规则未变。最初怀疑“only”新增门槛，读完整原文后撤回；原规则已存在。 |
| `.trellis/workflow.md:179` no_task；`.trellis/workflow.md:187` task_error；`.trellis/workflow.md:203` planning 与 `.trellis/workflow.md:216` inline。 | `.trellis/workflow.md:177`、`.trellis/workflow.md:185`、`.trellis/workflow.md:200`、`.trellis/workflow.md:213` 保留无任务 consent、错误记录修复/无法确定时询问、规划/研究/批准/start、inline 的执行差异。状态标记仍在源文件。 |
| `.trellis/workflow.md:223`、`.trellis/workflow.md:236`、`.trellis/workflow.md:249` 的执行链、平台适配、dispatch 首行、子代理免再次派发与上下文复用。 | `.trellis/workflow.md:220`、`.trellis/workflow.md:241`、`.trellis/workflow.md:256` 保留 implement→check→update-spec 的顺序和 inline 分支；Grok/Kimi 专属说明移入对应平台标记，Pi 不再携带其专属说明。公共派发规则仍可获得。 |
| `.trellis/workflow.md:256`、`.trellis/workflow.md:272`、`.trellis/workflow.md:276`、`.trellis/workflow.md:285`、`.trellis/workflow.md:305` | `.trellis/workflow.md:264`、`.trellis/workflow.md:280`、`.trellis/workflow.md:284`、`.trellis/workflow.md:291`、`.trellis/workflow.md:307` 保留验收 summarize/archive wrapper、有效 waiver、提交与 finish、required/once/order/rollback、各状态路由和细节读取命令。详细 Phase 1/2/3 实施步骤保持不变。 |
| FIRST_REPLY_NOTICE / buildStartupContext 原有首条可见确认与语言优先级。 | `.pi/extensions/trellis/index.ts` 相同常量/函数只改文本：首次可见回复一次、请求语言→项目语言→精确 fallback `Trellis SessionStart ✓`，其余正常回复保留。没有改 TUI shortcut/renderer。 |
| buildContext 中 manifest 与 artifacts 的内容、字节预算与顺序；system snapshot/历史更新。 | `.pi/extensions/trellis/index.ts:1252` 仅改 `Task:` 和 `Curated specs/research` 包装；预算分配、正文读取、manifest 优先预算/文档先展示、重复抑制与会话/项目切换代码未改。回归覆盖同内容、任务/spec 更新、恢复及 A→B→A。 |
| get_phase_index 与 get_context_text 产生工作流索引/概览。 | `.trellis/scripts/common/workflow_phase.py` 只在输出移除 HTML 维护注释与多余空行，状态提取源标记保留；`.trellis/scripts/common/session_context.py` 压缩标题/字段布局，identity/git/task/journal/packages/paths 和 1800/2000 警告边界保留。共享 Python 输出仍保留各平台事实，不宣称只有 Pi 文案变化。 |
| 工具注册/schema、mode、agent、model/thinking、失败/取消、progress/renderer。 | `.pi/extensions/trellis/index.ts:1268` 新增 prepare；schema 字段/类型/枚举/可选性/maxItems=6 不变，只删冗余 description/snippet。`promptGuidelines` 集中派发首行；single/parallel/chain、runSubagent、失败传播、renderer 未改变。 |

## 参数与宿主顺序审查

`scripts/test-trellis-extension.mjs:173` 使用实际 Pi SDK `wrapToolDefinition` / `runToolCall`：探针 schema 要求已经补全的 agent、mode、trim 后 prompt；原始输入直接校验失败，真实宿主执行却成功，记录顺序为 prepare → beforeToolCall → execute。结合实际 SDK 校验入口，证明 prepare 位于 schema 校验之前，不是仅在 execute 中处理后宣称提前。

`.pi/extensions/trellis/index.ts:1279` 在 `.pi/extensions/trellis/index.ts:1289` trim/filter 前检查原 prompts 长度，因此 7 项即使含空项仍拒绝；测试覆盖这个绕过风险。原始非对象、字段类型、非字符串数组均不自动转换；未知 mode/thinking 留给 schema。缺省 agent=`trellis-implement`、mode=`single`，短 agent 名加前缀，不根据 prompts 推断 mode、不生成正文。

非法 agent 仍经现有文件存在性规则拒绝，不 dispatch。合法 single 的 prompt 优先、parallel/chain 的列表与 fallback、chain 前次输出/遇错停止、parallel 结果/并发、model/thinking 继承/覆盖/后缀和所有枚举都有受控子进程回归。多种无效字段同时出现时，新增前置校验可先报告类型/正文错误；未把这种错误优先级与合法派发语义混为一谈。

## 测量与真实派发证据

`scripts/measure-trellis-context.mjs` 以相同冻结 fixture、路径归一化、真实 formatter/renderer 及紧凑 JSON 比较两版；工具 schema、tool guidance、默认 skill 索引、固定 system、按需 skill/prompt/agent 正文分开统计。`completeSystem` 包含 `fixedSystem` 与 task bodies，不能再与这些子项相加。

本轮审计 `python3 .tmp/trellis-lean-review/audit-evidence.py` 返回 0，独立确认 45 组 source hash、106 份文本快照的字符/UTF-8/代理计数与 SHA-256 一致。四份任务正文在两版都为 284 Unicode 字符、301 字节；没有把本任务 PRD/research 的变化算作节省。工具 724→483 字符，完整 Trellis fixture system 10197→6017 字符（40.99%），9 个 skill 文件 60926→36055 字符（40.82%）。这些是有明确边界的小样本文本体积；`ceil(chars/4)` 不是实际 tokenizer/provider token，不能推出整个生产请求相同比例下降。

测量要求 Node 24+、Python 3、已有 Pi、可读基线；路径/版本/formatter 改变需要重算。macOS 当前环境已验证，未在 Windows/Linux 重跑。脚本从自身位置定位仓库并发现本地/global SDK，没有新增依赖；真实派发临时 harness 的绝对本机 SDK 路径属于记录的运行环境，不作为跨平台生产入口。

真实派发报告与原始日志交叉核对：

| 观察 | attempt-1 | attempt-2 |
| --- | --- | --- |
| 监督/验收宿主/真实子进程 exit | 1 / 1 / 0 | 0 / 0 / 0 |
| 请求与工具 | 2 次 provider 请求；一次 `read` | 2 次 provider 请求；一次 `read` |
| 交付事实 | 最终 JSON 与随机 facts 一致；harness 拼接 commentary 导致 actual=null/断言失败 | 最终 JSON 与 facts 一致；total=57，marker=copper-otter，nonce=2221d3e2a52d3788cf5440c9 |
| usage（仅 assistant message_end） | input=15606，output=98，cacheRead=15104，cacheWrite=0，total=30808 | input=15841，output=95，cacheRead=14848，cacheWrite=0，total=30784 |
| 退出证据 | observer process_exit + 父进程 child_close，无 signal | observer process_exit + 父进程 child_close，无 signal |

provider 工具表与 research 9 工具白名单相符；child prompt 未含随机 nonce；read 返回原 facts；返回值不是合成 fixture“passed”。源码 hash 与当前磁盘一致：extension `81ed64d6f950dbffedf444ba132874b1a93ff80f7ee387cb618ea0e430a5e583`，research role `d452355609af3a89fac6a312b0a37d8aa86888c5381755024059d4a38ecef067`。复核时 6 个已记录 PID 均不存在。

保留 attempt-1 原始 failed 观察；attempt-2 是独立复测，不覆盖失败。前者属于验收 harness 错误，不能推成产品派发失败，也不能删掉宿主 exit 1。审计只验证本地证据内部一致性和当前源匹配，没有独立重放网络请求。

## 复用的测试与未验证范围

原始执行信息为 `.tmp/trellis-lean-final/executions.json`，时间为 2026-10-14 21:46:28–21:46:29 UTC，六条命令 exit 均为 0；本轮逐一阅读实际日志：

| 命令/证据 | 观察与可证明范围 |
| --- | --- |
| `node --test scripts/test-trellis-extension.mjs` / `.tmp/trellis-lean-final/extension.log` | 11/11；实际 SDK 校验入口，受控子进程的三种 mode、model/thinking、默认值/边界/失败/取消、注入快照/更新/恢复/项目切换、预算和 hooks。 |
| `python3 -m unittest discover -s scripts -p test_trellis_lean_context.py` / `.tmp/trellis-lean-final/context.log` | 10/10；各 workflow 平台分支/状态、CLI step 错误、概览事实/异常任务/journal 边界。 |
| `python3 -m unittest discover -s scripts -p test_acceptance.py` / `.tmp/trellis-lean-final/acceptance.log` | 37/37；既有验收协议回归。测试通过不代表当前任务 acceptance 已完成。 |
| `node scripts/measure-trellis-context.mjs --check` / `.tmp/trellis-lean-final/measurement.log` | 当前冻结输入重算与 token-report/JSON 匹配；不是 provider token 或行为等价验收。 |
| `python3 .trellis/scripts/task.py validate .trellis/tasks/10-15-trellis-lean-tool-descriptions` / `.tmp/trellis-lean-final/manifest.log` | implement/check 各 3 条 curated entries 校验通过。 |
| `git diff --check` / `.tmp/trellis-lean-final/diff.log` | 已跟踪差异空白检查通过；空日志与 exit 0 一并核对，不把它当语义证明。 |

未验证模型在所有提示下的理解/技能选择行为、主模型实际选择 `trellis_subagent` 的 provider 请求、真实 parallel/chain 多进程、真实 implement/check 工作任务、TUI 视觉/快捷键操作、实际 ACP 压缩调用及原版/lean 同任务真实 usage 对照。三模式调度逻辑由受控子进程覆盖，真实只覆盖一次 research single 正常退出。当前任务不改产品前端/平台，产品 build 和浏览器验收不适用；没有将其记为通过。

本轮使用的是冻结版本的已有回归结果，未单独运行全项目 TypeScript/lint；实际 SDK 导入/执行已通过，不将它称为完整静态类型检查。

## 回滚、更新与收口

`.trellis/spec/tooling/pi-context.md:58` 已列本地定制入口、`trellis update` 覆盖风险与更新前保存差异/更新后复查要求；任务 design/implement 保留局部回滚方式。核对范围包括 extension 的文本/prepareArguments、Python renderer、workflow、9 skills、3 prompts、3 agents。回滚应只恢复本次局部改动；不能 reset 用户工作区或改全局安装。没有执行回滚或 `trellis update`，因此不宣称更新后运行已验收。

PRD/implement/inventory 中“规划、待审阅”的历史状态文字还未收口，当前 acceptance 也尚未合并主会话执行结果。这是交付记录待同步项；本审查不据旧文字否定本轮已明确授权的只读检查，也不替主会话补造批准历史。AC1 的前置展示/批准时序由主会话已有会话证据核对。

## 建议的验收条目

机器可读建议见 [acceptance-proposals.json](../../../../.tmp/trellis-lean-review/acceptance-proposals.json)，只是待主会话合并的 entries，**不是已保存 acceptance 的结果**。命令 execution 从真实记录复用，cwd 转成协议要求的仓库相对 `.`；不改执行时间/退出码，不伪造 waiver。

- AC1：盘点/候选文件的内容检查可回填；前置展示时序未在子代理上下文独立核验，应由主会话结合原会话完成。
- AC2、AC4、AC5：对应 SDK/三模式受控回归可回填 passed，注明真实覆盖边界。
- AC3、AC7：规则保留检查为 failed，原因 R1；其他已核对的上下文/白名单证据保留。
- AC6：冻结计数与 hash/快照审计可回填 passed，保持代理值标签和统计边界。
- AC8：状态矩阵与真实复测拆开记录；attempt-1 另保留 failed，不覆盖为 passed、不自行加 waiver。主会话按原观察和既有权限决定如何处理重试历史。
- AC9：测试、manifest、diff 通过条目分别回填；记录收口仍 partial，待修正 R1、重算受影响报告并同步任务状态/验收证据。

## 当前已保存验收记录的原始摘要

记录路径：`.trellis/tasks/10-15-trellis-lean-tool-descriptions/acceptance.json`。

实际执行：`python3 scripts/acceptance.py summarize .trellis/tasks/10-15-trellis-lean-tool-descriptions`。退出码 **1**，`valid=true`、`status=unrun`、9 项 unrun、无 waiver。完整原始 stdout 见 [acceptance-summarize.json](../../../../.tmp/trellis-lean-review/acceptance-summarize.json)，下方逐字保留。该结果仅覆盖尚未合并建议的已保存记录；完成/归档当前应停止。

```json
{
  "valid": true,
  "observedStatus": "unrun",
  "status": "unrun",
  "counts": {
    "passed": 0,
    "failed": 0,
    "partial": 0,
    "blocked": 0,
    "unrun": 9,
    "waived": 0
  },
  "observedCounts": {
    "passed": 0,
    "failed": 0,
    "partial": 0,
    "blocked": 0,
    "unrun": 9,
    "waived": 0
  },
  "criteria": {
    "AC1": {
      "text": "实施前提供 Trellis 原版工具、自动注入和 skills 清单，以及具体精简方案和可复现的基线/候选计数。",
      "observedStatus": "unrun",
      "status": "unrun",
      "counts": {
        "passed": 0,
        "failed": 0,
        "partial": 0,
        "blocked": 0,
        "unrun": 1,
        "waived": 0
      },
      "observedCounts": {
        "passed": 0,
        "failed": 0,
        "partial": 0,
        "blocked": 0,
        "unrun": 1,
        "waived": 0
      },
      "checks": [
        "inventory-and-proposal"
      ]
    },
    "AC2": {
      "text": "仍只注册 trellis_subagent；字段名、类型、枚举、prompts.maxItems = 6、缺省行为、执行和渲染契约保持兼容。",
      "observedStatus": "unrun",
      "status": "unrun",
      "counts": {
        "passed": 0,
        "failed": 0,
        "partial": 0,
        "blocked": 0,
        "unrun": 1,
        "waived": 0
      },
      "observedCounts": {
        "passed": 0,
        "failed": 0,
        "partial": 0,
        "blocked": 0,
        "unrun": 1,
        "waived": 0
      },
      "checks": [
        "schema-and-registration"
      ]
    },
    "AC3": {
      "text": "精简文本遵循去重、去 schema 重复说明、去面向人的界面说明和强调语气；保留所有影响调用和流程的规则。",
      "observedStatus": "unrun",
      "status": "unrun",
      "counts": {
        "passed": 0,
        "failed": 0,
        "partial": 0,
        "blocked": 0,
        "unrun": 1,
        "waived": 0
      },
      "observedCounts": {
        "passed": 0,
        "failed": 0,
        "partial": 0,
        "blocked": 0,
        "unrun": 1,
        "waived": 0
      },
      "checks": [
        "rule-preservation"
      ]
    },
    "AC4": {
      "text": "合法 single、parallel、chain 和 model/thinking 覆盖可正常派发；缺省值、trim、非法 agent、缺 prompt、类型错误和数量边界有回归证据。",
      "observedStatus": "unrun",
      "status": "unrun",
      "counts": {
        "passed": 0,
        "failed": 0,
        "partial": 0,
        "blocked": 0,
        "unrun": 1,
        "waived": 0
      },
      "observedCounts": {
        "passed": 0,
        "failed": 0,
        "partial": 0,
        "blocked": 0,
        "unrun": 1,
        "waived": 0
      },
      "checks": [
        "execution-regression"
      ]
    },
    "AC5": {
      "text": "确定性参数补全在宿主 schema 校验前执行；不猜测代理、模式或内容，不绕过原约束；歧义输入返回清楚错误。",
      "observedStatus": "unrun",
      "status": "unrun",
      "counts": {
        "passed": 0,
        "failed": 0,
        "partial": 0,
        "blocked": 0,
        "unrun": 1,
        "waived": 0
      },
      "observedCounts": {
        "passed": 0,
        "failed": 0,
        "partial": 0,
        "blocked": 0,
        "unrun": 1,
        "waived": 0
      },
      "checks": [
        "prevalidation-normalization"
      ]
    },
    "AC6": {
      "text": "分别报告工具定义、固定注入、skill 索引和按需正文的原版/lean 计数；同输入、同序列化、同计数器，明确代理值与真实 token 的区别。",
      "observedStatus": "unrun",
      "status": "unrun",
      "counts": {
        "passed": 0,
        "failed": 0,
        "partial": 0,
        "blocked": 0,
        "unrun": 1,
        "waived": 0
      },
      "observedCounts": {
        "passed": 0,
        "failed": 0,
        "partial": 0,
        "blocked": 0,
        "unrun": 1,
        "waived": 0
      },
      "checks": [
        "token-report"
      ]
    },
    "AC7": {
      "text": "Trellis skills 保持可发现且触发条件、命令、权限及验收契约不丢失；任务正文、curated specs、注入预算和更新机制不变。",
      "observedStatus": "unrun",
      "status": "unrun",
      "counts": {
        "passed": 0,
        "failed": 0,
        "partial": 0,
        "blocked": 0,
        "unrun": 1,
        "waived": 0
      },
      "observedCounts": {
        "passed": 0,
        "failed": 0,
        "partial": 0,
        "blocked": 0,
        "unrun": 1,
        "waived": 0
      },
      "checks": [
        "skills-and-context-contract"
      ]
    },
    "AC8": {
      "text": "工作流各状态、重复请求、任务文件更新及项目切换的注入行为保持兼容，至少一次真实 Trellis 子代理派发完成且正常退出。",
      "observedStatus": "unrun",
      "status": "unrun",
      "counts": {
        "passed": 0,
        "failed": 0,
        "partial": 0,
        "blocked": 0,
        "unrun": 1,
        "waived": 0
      },
      "observedCounts": {
        "passed": 0,
        "failed": 0,
        "partial": 0,
        "blocked": 0,
        "unrun": 1,
        "waived": 0
      },
      "checks": [
        "injection-and-native-dispatch"
      ]
    },
    "AC9": {
      "text": "静态检查、相关回归和任务资料校验通过；记录未验证范围、回滚方法及本地定制与 trellis update 的关系。",
      "observedStatus": "unrun",
      "status": "unrun",
      "counts": {
        "passed": 0,
        "failed": 0,
        "partial": 0,
        "blocked": 0,
        "unrun": 1,
        "waived": 0
      },
      "observedCounts": {
        "passed": 0,
        "failed": 0,
        "partial": 0,
        "blocked": 0,
        "unrun": 1,
        "waived": 0
      },
      "checks": [
        "static-and-task-validation"
      ]
    }
  },
  "checks": [
    {
      "id": "inventory-and-proposal",
      "ac": [
        "AC1"
      ],
      "claim": "原版清单、精简提案与基线资料齐全。",
      "scope": "任务研究、注册快照和加载入口。",
      "method": "inspection",
      "dimension": "content",
      "observed": "unrun",
      "execution": null,
      "evidence": [],
      "note": "规划阶段；候选计数不代表实现后的功能验收。",
      "waiver": null,
      "status": "unrun"
    },
    {
      "id": "schema-and-registration",
      "ac": [
        "AC2"
      ],
      "claim": "工具注册、schema 和运行契约保持兼容。",
      "scope": "trellis_subagent 注册及渲染回调。",
      "method": "command",
      "dimension": "structure",
      "observed": "unrun",
      "execution": null,
      "evidence": [],
      "note": "规划阶段；候选计数不代表实现后的功能验收。",
      "waiver": null,
      "status": "unrun"
    },
    {
      "id": "rule-preservation",
      "ac": [
        "AC3"
      ],
      "claim": "去重后调用及工作流规则保留完整。",
      "scope": "原规则/新位置对照、工具提示与工作流文本。",
      "method": "inspection",
      "dimension": "content",
      "observed": "unrun",
      "execution": null,
      "evidence": [],
      "note": "规划阶段；候选计数不代表实现后的功能验收。",
      "waiver": null,
      "status": "unrun"
    },
    {
      "id": "execution-regression",
      "ac": [
        "AC4"
      ],
      "claim": "正常、异常和边界参数经过回归。",
      "scope": "模式、默认值、覆盖字段、非法 agent 和数量边界。",
      "method": "command",
      "dimension": "behavior",
      "observed": "unrun",
      "execution": null,
      "evidence": [],
      "note": "规划阶段；候选计数不代表实现后的功能验收。",
      "waiver": null,
      "status": "unrun"
    },
    {
      "id": "prevalidation-normalization",
      "ac": [
        "AC5"
      ],
      "claim": "确定性补全在校验前执行且不绕过约束。",
      "scope": "宿主 prepareArguments 路径及失败输入。",
      "method": "command",
      "dimension": "behavior",
      "observed": "unrun",
      "execution": null,
      "evidence": [],
      "note": "规划阶段；候选计数不代表实现后的功能验收。",
      "waiver": null,
      "status": "unrun"
    },
    {
      "id": "token-report",
      "ac": [
        "AC6"
      ],
      "claim": "同输入计数可复现且统计分层正确。",
      "scope": "注册 JSON、固定注入、skills 和按需正文快照。",
      "method": "command",
      "dimension": "content",
      "observed": "unrun",
      "execution": null,
      "evidence": [],
      "note": "规划阶段；候选计数不代表实现后的功能验收。",
      "waiver": null,
      "status": "unrun"
    },
    {
      "id": "skills-and-context-contract",
      "ac": [
        "AC7"
      ],
      "claim": "技能触发与上下文内容、预算和更新契约保留。",
      "scope": "9 个 skills、模板、角色和任务上下文。",
      "method": "inspection",
      "dimension": "content",
      "observed": "unrun",
      "execution": null,
      "evidence": [],
      "note": "规划阶段；候选计数不代表实现后的功能验收。",
      "waiver": null,
      "status": "unrun"
    },
    {
      "id": "injection-and-native-dispatch",
      "ac": [
        "AC8"
      ],
      "claim": "注入状态变化及真实子代理派发兼容。",
      "scope": "状态矩阵、更新、切换、工具请求与退出证据。",
      "method": "command",
      "dimension": "behavior",
      "observed": "unrun",
      "execution": null,
      "evidence": [],
      "note": "规划阶段；候选计数不代表实现后的功能验收。",
      "waiver": null,
      "status": "unrun"
    },
    {
      "id": "static-and-task-validation",
      "ac": [
        "AC9"
      ],
      "claim": "静态、回归、资料、回滚及更新说明齐全。",
      "scope": "本次改动与 acceptance 记录。",
      "method": "command",
      "dimension": "structure",
      "observed": "unrun",
      "execution": null,
      "evidence": [],
      "note": "规划阶段；候选计数不代表实现后的功能验收。",
      "waiver": null,
      "status": "unrun"
    }
  ],
  "waivedChecks": []
}
```
