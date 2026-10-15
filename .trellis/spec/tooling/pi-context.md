# Pi 子代理上下文与压缩

## 1. 适用范围

修改 `.pi/agents/trellis-*.md`、`.pi/extensions/trellis/index.ts` 的工具/上下文传递或 `.trellis/workflow.md` 时使用。角色规则与工作流是执行入口，本文件定义可验证边界。此规则不配置用户级 ACP，也不保证主会话外部代理的压缩行为。

## 2. 命令与入口

`resolveRunCfg` 取角色 frontmatter 的 `tools`，`buildPiArgs` 生成：

```text
pi --mode json -p --no-session --tools <comma-separated-tools>
```

`--tools` 是替换白名单，不能假设扩展注册的工具自动保留。派发 prompt 首行为 `Active task: <task.py current 返回的路径>`。启动器通过 `buildContext/buildPrompt` 注入角色所需 curated specs 与 PRD/design/implement；单独 CLI 调用是否注入由调用方决定。

## 3. 契约

- implement/check 原工具为 `read,write,edit,bash,find,grep`；research 为 `read,write,bash,find,grep`。各角色另有 `compress,decompress,search_context,acp_status`，不能借此放开全部业务工具。
- manifest 核对一次；完整且当前的注入内容可复用。缺失、截断、源文件变化、证据失效或需要新编辑锚点时，读取对应内容；无注入时走角色完整加载序列。
- 压缩前保留任务路径、批准范围、已完成动作、证据路径、未决项和下一动作；压缩后继续下一动作。只对具体缺失事实搜索/恢复，不因发生折叠重读全部未变文件。
- `acp_status` 有合法范围后，实际模型 `compress` 调用及工具成功结果才证明主动压缩；`fold=` 日志、工具声明或模型口述都不足。
- 交付事实正确与宿主正常退出分别验证；`agent_end`/`session_shutdown` 不等于 exit 0。超时或信号终止保留原始状态，复测结果单独记录。

## 4. 验证与错误边界

| 观察 | 结论与动作 |
| --- | --- |
| 请求工具表没有 ACP | 先检查角色白名单，再检查扩展加载/过滤；不直接改全局包 |
| 工具可见但没有合法范围 | 检查消息数、保护区和最小范围；不能据此断言 no-session 不支持压缩 |
| 压缩成功但关键事实缺失 | 按需 search_context，再恢复对应块；交付后核对实际事实 |
| 相同未变整组文件连续两轮读取且无推进 | 记录循环，停止该样本并检查角色/工作流规则 |
| 模型完成但执行器超时 | 交付可正确，运行仍是 partial；定位退出资源并保留证据 |

## 5. 基础、正常与异常场景

基础：没有可压缩范围，状态查询成功，不强行压缩。正常：有已消费内容，压缩成功，按摘要或定向恢复取得事实，写交付并正常退出。异常：压缩失败、事实错误或超时，验收不能只凭文件存在判通过。

## 6. 必要验收

保持模型、cwd、输入及工具条件可比；有意差异逐项列出。记录真实请求工具表、调用/返回、原始 write 内容、退出码/超时、读取路径及压缩后的推进。三角色核对限制，至少一个真实原生派发完成代表任务。工具名称变动用真实派发验证；启动器逻辑变动另加对应参数回归。

只累加 assistant `message_end` 中 usage，排除流式更新和 agent_end 的重复快照。零 usage 失败仍计入请求数。cacheRead 比例口径明确，短样本不用于承诺长期收益。测试夹具中的合成“passed”文字不是产品验收证据。

工作流改动运行 `python3 -m unittest discover -s scripts -p 'test_acceptance.py'`；校验文档链接、manifest 及 acceptance.json。当前入口遵循 [项目验收协议](../frontend/quality-guidelines.md#acceptance-record-schemaversion-1)。

## 7. 错误与正确示例

错误：白名单只含原业务工具，认定“扩展已加载，所以 compress 可用”；或压缩后无条件读取整组任务资料。

正确：在原白名单追加所需 ACP 名称，用实际请求/调用确认；复用完整注入上下文，压缩后执行保留的下一步，只查缺失字段。

退出诊断示例（历史，pi-graft 已于 2026-10 从项目移除）：2026-10-13 的本地 pi-graft 在 `agent_settled` 后创建 120000 ms 的引用计时器，导致无模型请求时仍等待。此为特定版本观察，不是固定验收宽限值。按实际日志区分执行/清理预算，不以修改退出上限代替证明交付，也不改写此前超时结果。


## 8. Lean 文本与校验前规范化

本项目直接定制 `.pi/extensions/trellis/index.ts`、`.trellis/workflow.md`、`common/workflow_phase.py` / `common/session_context.py`、Trellis skills、Pi prompts 与 agents；没有额外 lean 开关，也不启用社区 `subagent`。`trellis update` 可能更新这些托管文件，更新前保存差异，更新后复查下列契约和测试；不要修改全局 Pi 安装。

工具名和参数类型/枚举/数量边界由注册 schema 保持。当前 Pi SDK 1.2.0 支持 `prepareArguments(args: unknown)`，顺序为 prepare → schema validation → beforeToolCall → execute。只在 execute 中修正类型不能补救宿主预校验失败。

| 输入 | 处理与边界 |
| --- | --- |
| agent/mode 缺省 | `trellis-implement` / `single` |
| agent 短名 | 加 `trellis-` 前缀；仍由现有 agent 校验拒绝未知角色 |
| prompt/prompts | trim，过滤空项；先检查原数组长度，再过滤，`maxItems = 6` 不被绕过 |
| 非对象或错误字段类型 | 清楚报错，不转换类型 |
| 未知枚举或缺所需正文 | schema/业务错误；不从 prompts 推断 mode，不猜代理或内容 |

基础例：`{prompt: " work "}` 得到默认 agent/mode 和 `prompt: "work"`。正常例：显式 parallel/chain 沿用原派发、顺序、失败及 model/thinking 覆盖。错误例：7 项含空字符串的 prompts 仍拒绝；不能先过滤为空项较少的数组再通过数量校验。

工具的 `promptSnippet` 与 `promptGuidelines` 属于系统提示，不是 provider schema。当前只在 guideline 保留派发首行协议；`label`、render、快捷键属于 UI，不计模型工具体积。skills 默认仅注入 name/description/path，正文按需读入；保留发现能力和各触发分支。

工作流源状态标记用于解析，输出索引去维护注释。任务正文、curated specs、预算、顺序及更新/恢复机制保留；不能靠降低预算、隐藏 skills 或改成仅传路径宣称等价精简。

`trellis-check` 角色为双模式（2026-10-15 起）：派发方未声明时为自检模式，可就地修范围内机械问题；派发 prompt 声明 `review-only` 时为正式审查，只读返回 findings，不修改受审文件、不更新 `acceptance.json`，受审代码与测试版本当轮冻结。模式由派发方显式选择，不由子代理推断；子代理工具白名单仍含 write/edit，该约束是 prompt 契约而非机械强制。`trellis update` 后复查 `.pi/agents/trellis-check.md`、`.agents/skills/trellis-check/SKILL.md` 与项目 `AGENTS.md` 技能分工段是否仍保留双模式表述。
验证命令：

```bash
node --test scripts/test-trellis-extension.mjs
python3 -m unittest discover -s scripts -p 'test_trellis_lean_context.py'
node scripts/measure-trellis-context.mjs --check
```

扩展测试使用真实 SDK 校验入口与受控子进程，覆盖三种 mode、失败和注入状态切换；另按第 6 节保留一次真实子进程派发。计量脚本从固定基线提交与工作区提取两版工具和文本，冻结任务/overview 输入；改变源文本后重新生成报告。Unicode 字符数及 `ceil(chars / 4)` 仅为体积代理，不是模型 tokenizer 或 provider 计费；整体与包含的子项不叠加，不能将任务文档变化算作 lean 收益。
