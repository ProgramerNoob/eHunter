# Trellis / Pi lean 上下文盘点与提案

本文保留实施前的盘点、候选数据和方案；用户已确认并进入实施。最终已安装 lean 的计数见 [token-report.md](token-report.md)，真实派发见 [live-dispatch.md](live-dispatch.md)。范围为当前项目的 Trellis；社区 `pi-subagents-lean` 保持未启用。

## 当前模型可见清单

| 内容 | 实际入口 | 进入上下文的时机 | 拟议精简 |
| --- | --- | --- | --- |
| `trellis_subagent` 工具定义 | `.pi/extensions/trellis/index.ts:1868` | 工具处于可见集合时随请求携带 | 保留字段、约束、用途；去除多余字段描述 |
| 工具调用指导 | 同文件的 `promptSnippet` / `promptGuidelines` | Pi system prompt | 合并重复的 dispatch 首行规则 |
| SessionStart 固定提示 | `buildStartupContext`、`FIRST_REPLY_NOTICE` | 首次建立 system snapshot，后续请求携带 | 缩短首条回复语言/一次性说明，保留行为 |
| 工作流 Phase Index | `.trellis/scripts/common/workflow_phase.py:get_phase_index`，经 `workflowOverview` | 启动 system snapshot | 输出时过滤维护者注释，精简重复规则；仅呈现当前平台适用说明 |
| session overview | `.trellis/scripts/common/session_context.py:get_context_text` | 启动 snapshot；运行时变化时再次进入历史 | 紧凑格式保留身份、git、任务、journal、包和路径信息 |
| 当前工作流状态 | `.trellis/workflow.md` 的状态块，经 `workflowBreadcrumb` | `before_agent_start` 检查；runtime 内容变化或项目切换时追加消息 | 缩短状态文案，保留审批、派发、检查与验收条件 |
| 任务和 curated specs | `buildContext` | 首次完整注入；内容变化或项目切换时追加整份更新 | 本轮保留正文和更新机制，仅整理固定包装 |
| 9 个 Trellis skill 索引 | `.agents/skills/trellis-*/SKILL.md` frontmatter，经 Pi `formatSkillsForPrompt` | 默认 system prompt 的 skill 名称、描述和路径 | 缩短 description，保留所有独立触发条件和技能可见性 |
| Trellis skill 正文 | 同一组 `SKILL.md` | 匹配后主动读取或显式调用；读取结果留在历史中 | 按技能合并重复规则，保留命令、分支、完成标准和引用 |
| 3 个 prompt template | `.pi/prompts/trellis-{start,continue,finish-work}.md` | 用户调用对应命令时展开 | 可精简重复的流程说明；不计入默认注入节省 |
| 子代理角色正文 | `.pi/agents/trellis-*.md`，经 `buildPrompt` | 每次派发进入子代理输入 | 纳入独立统计；角色职责、工具白名单和上下文契约不变 |

`session_start` 的 TUI 通知、`alt+o` 快捷键、进度 renderer 和 bash 环境变量桥接不属于模型提示词。移除这些不会带来所述 token 收益，且会改变功能。

Pi 自带工具、基础 system prompt、全局 skills、全局/项目 AGENTS.md 也会占上下文，但并非 Trellis 自有描述。本轮盘点说明归属，不修改宿主和这些全局契约。

## 已核实的加载机制

- `.pi/extensions/trellis/index.ts:2066` 的 `before_agent_start` 将启动和初始任务内容保存在 system snapshot；后续变更通过持久消息通知。不是每次工具调用都追加整份内容，但已有内容会随请求历史继续发送。
- `.pi/extensions/trellis/index.ts:2083` 组合当前 workflow 与 overview；任一项变化时发送该组合。任务内容单独比较，变化时发送完整 `freshTaskCtx`。
- `.pi/extensions/trellis/index.ts:1207` 的 `buildContext` 分配预算时先处理 manifest，再处理 PRD/design/implement；显示时任务文档在前、curated specs 在后。
- `.trellis/config.yaml:143` 的 `context_injection` 示例控制截断预算。降低预算会丢失默认可见内容，不等于无损 lean。当前检查的配置和 Pi 扩展没有覆盖上述内容的统一 lean 开关。
- Pi 1.2.0 的 `core/system-prompt.js:82` 仅为提供 `promptSnippet` 的工具添加 system 工具条目；`promptGuidelines` 单独进入 rules。删除重复 snippet 不会删除工具注册。
- Pi 1.2.0 的 `core/skills.js:278` 默认列出 skill 的 name/description/location，正文按需读取。不能将全部 skill 文件大小算作默认注入量，也不能靠隐藏技能宣称功能等价。
- 当前 `trellis_subagent` 会等待 `runSubagent` 返回，并没有社区工具的后台轮询/完成通知 API；不照搬社区工具规则。

## 工具清单与 schema

当前扩展只注册 `trellis_subagent`。原 description 为 `Run a Trellis project sub-agent with active task context.`。参数均无 required 声明：

| 字段 | 类型及约束 | 原描述 | lean 提案 |
| --- | --- | --- | --- |
| agent | string | Agent name, such as trellis-implement or trellis-check. | Name from .pi/agents/. |
| prompt | string | Task prompt for the sub-agent. | 删除描述 |
| mode | string；single / parallel / chain | 无 | 保持 |
| prompts | string[]；maxItems = 6 | 无 | 保持 |
| model | string | Optional Pi model override for the child sub-agent process. | 删除描述 |
| thinking | string；off / minimal / low / medium / high / xhigh / max | Optional Pi thinking level override for the child sub-agent process. | 删除描述 |

原 snippet 和 guideline 都要求 prompt 以 `Active task: <task path from task.py current>` 开头。提案只保留一条 guideline：

```text
Use trellis_subagent for task delegation. Start each prompt with "Active task: <task path from `task.py current`>".
```

原有缺省 agent/mode、短 agent 名、trim 与空 prompt 项处理保持兼容。Pi `core/extensions/types.d.ts:471` 提供 `prepareArguments`，用于在 schema 校验前做确定性补全；仅在 execute 内补全不满足“校验前”的要求。未知 mode、类型错误、歧义输入返回明确错误；不推断任务文本、模式或代理。实现前验证宿主实际调用顺序，并避免规范化使原本超出 `maxItems` 的输入绕过校验。

## 计数口径与结果

本次是文本体积基线与候选稿比较，尚非已安装 lean 的功能验收或 provider 计费 token。环境为本机 Pi 1.2.0、相同 cwd、固定任务快照、同一组 9 个 Trellis skills。计数为 Unicode 字符数以及 `ceil(characters / 4)` 字符代理值；另存 UTF-8 bytes，二者不混用。中文内容的代理误差可能较大。

工具定义只统计紧凑 JSON 的 `name` / `description` / `parameters`；UI label 和 render 回调不计入。工具 guideline 作为 system 文本单列，不能混称 schema token。所有候选稿都只在 `.tmp/trellis-lean/` 内生成，没有注册替代工具或改动源配置。

| 比较项 | 原字符数 | 提案字符数 | 原代理值 | 提案代理值 |
| --- | ---: | ---: | ---: | ---: |
| 工具定义 | 724 | 483 | 181 | 121 |
| 工具附加调用指导 | 309 | 117 | 78 | 30 |
| 9 个 Trellis skill 索引 | 5,049 | 3,385 | 1,263 | 847 |
| 工作流索引，仅去 HTML 注释与连续空行 | 7,393 | 5,738 | 1,849 | 1,435 |

这四项代理值之和为 3,371 → 2,433，减少 938（27.8%）。它们不含全部 system 包装、项目规则、任务正文或历史，因此不能表述为整个请求减少 27.8%。工作流完整精简、技能正文精简尚未计量，不预先承诺收益。

另外保留的原版样本：session overview 为 1,263 字符 / 316 代理值；任务和 curated specs 为 16,354 字符 / 4,089 代理值；完整 Trellis system 注入为 26,113 字符 / 6,529 代理值；首次 runtime update 为 1,836 字符 / 459 代理值。完整注入包含上述子项，不能相加。任务样本取自扩大范围前的固定规划快照，不将本次规划改写造成的长度变化归因于 lean。

9 个 skill 文件（含 frontmatter）合计为 15,232 代理值，但不会在启动时全量注入：

| skill | 文件代理值 | 保留的触发用途 |
| --- | ---: | --- |
| trellis-before-dev | 660 | 编码前、切换包、刷新规范 |
| trellis-brainstorm | 2,654 | 新需求、复杂/不清晰需求、方案选择与规划 |
| trellis-break-loop | 1,737 | 修复后的根因、失败尝试、预防与沉淀 |
| trellis-channel | 1,196 | 多代理协作、worker、审查、进度、forum 和日志 |
| trellis-check | 933 | 改动后、提交前、上下文偏移时验证 |
| trellis-meta | 3,210 | 本地 Trellis、平台集成、channel、模板、spec 刷新、memory 与 skill dispatch |
| trellis-session-insight | 1,675 | 历史方案/决策/任务回顾及相关 brainstorm、熟悉 bug、续会话、收口 |
| trellis-spec-bootstrap | 670 | 从代码证据创建/刷新规范及包/层拆分 |
| trellis-update-spec | 2,500 | 将调试、实现和讨论得到的契约/约定沉淀为规范 |

## 推荐方案与后续选项

本轮建议精简 Trellis 自有工具定义、固定注入文本、工作流规则和技能文本。以“原规则 → 唯一新位置”的对照审查保真；保留任务创建/实施审批、必读规范、派发方式、验收、提交、故障提示。技能继续自动发现，正文继续按需加载。用户没有要求改变流程门槛，不新增“几步以上才使用”的策略。

任务正文和 curated specs 保持原内容、预算和刷新机制。仅发送变更文件可能进一步减少重复，但涉及跨项目切换、恢复、压缩后的状态完整性；作为独立后续选项，不算入本轮收益。改为只有文件路径、隐藏技能或降低截断预算会改变模型默认拿到的信息，不作为功能等价方案。

需要在实现后验证：真实工具请求表、宿主预校验顺序、参数成功/失败分支、工作流各状态、相同任务不重复更新、文件变化更新、项目切换，以及至少一次真实子代理派发。文本核对和代理计数不能单独证明模型行为完全等价。

## 可复现资料

- `.tmp/trellis-lean/inventory.mjs`：加载实际扩展注册与 before_agent_start，调用宿主 skill formatter，输出原版快照。
- `.tmp/trellis-lean/inventory-baseline.json`、`original-tool.json`、`original-system-injection.txt`、`original-skill-index.txt`：本次固定基线。
- `.tmp/trellis-lean/compare-proposal.mjs`：从快照构造候选工具与 9 个 skill descriptions，调用相同 formatter；`node .tmp/trellis-lean/compare-proposal.mjs` 可复现已列候选值。
- `.tmp/trellis-lean/proposal-comparison.json`、`proposed-tool.json`、`proposed-skill-descriptions.json`、`proposed-skill-index.txt`：提案产物。
- 工作流去注释实验：从固定 system 快照提取 `<trellis-workflow>`，对内容执行 `replace(/<!--[\s\S]*?-->/g, '').replace(/\n{3,}/g, '\n\n')` 后用同一口径计数；只作输出提案，未更改工作流文件。

实现阶段固定并归档同一输入快照，分别报告 tokenizer 名称/版本（可用时）、实际请求序列化范围和 usage。当前没有模型专用 tokenizer 的精确计数，不将字符代理标为真实 token。
