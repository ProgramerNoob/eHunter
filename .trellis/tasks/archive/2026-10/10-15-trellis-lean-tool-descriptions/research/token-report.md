# Trellis lean 最终文本计数

由 `node scripts/measure-trellis-context.mjs` 生成；`--check` 重算并校验本报告和 JSON，不改写报告。

原版：`e7e5f280c95ee22b5cc8406cb7253d5a5f2ede8b`；lean：当前工作区的一次冻结读取。Node v24.18.0、Python 3.13.14、Pi 1.2.0。仓库路径：`/Users/warwick/claude/eHunter`。源码逐文件 SHA-256、固定输入与全部计数见 [token-comparison.json](token-comparison.json)。

## 口径

字符按 Unicode 码点计数，bytes 为 UTF-8 字节，代理值为 `ceil(字符数 / 4)`。本地 Node/Python 探测没有可用的固定词表模型 tokenizer，因此仅报告体积代理值，不称为真实 token。没有安装依赖、访问模型服务或读取计费 usage。百分比使用字符差额，避免逐项向上取整误差。

工具从两版实际注册函数获取；schema 使用相同紧凑 JSON 序列化，只含 name/description/parameters。调用指导使用当前 Pi 的 system formatter 生成的 snippet/guideline 行，共用宿主规则与标签排除。skill 索引使用 Pi loader/formatter，包含共享加载提示与 9 个条目；两版路径统一使用当前仓库，条目按 name 排序。

## 工具与默认文本

| 范围 | 原字符 | lean 字符 | 原 bytes | lean bytes | 原代理值 | lean 代理值 | 字符减少 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 工具定义 | 724 | 483 | 724 | 483 | 181 | 121 | 33.29% |
| 工具调用指导 | 309 | 117 | 309 | 117 | 78 | 30 | 62.14% |
| 9 个 skill 索引 | 5,049 | 3,327 | 5,085 | 3,327 | 1,263 | 832 | 34.11% |
| Pi workflow 索引 | 7,393 | 3,831 | 7,426 | 3,860 | 1,849 | 958 | 48.18% |
| 固定 overview fixture | 1,002 | 820 | 1,025 | 843 | 251 | 205 | 18.16% |
| 启动固定包装（含标签、分隔） | 1,103 | 686 | 1,105 | 688 | 276 | 172 | 37.81% |
| 任务固定包装 | 415 | 396 | 415 | 396 | 104 | 99 | 4.58% |
| 固定正文（PRD/design/implement/spec） | 284 | 284 | 301 | 301 | 71 | 71 | 0% |
| 任务整体注入 | 699 | 680 | 716 | 697 | 175 | 170 | 2.72% |
| system 固定部分（去任务正文） | 9,913 | 5,733 | 9,971 | 5,787 | 2,479 | 1,434 | 42.17% |
| Trellis system 整体注入 | 10,197 | 6,017 | 10,272 | 6,088 | 2,550 | 1,505 | 40.99% |
| 首次 runtime 消息 | 2,609 | 1,949 | 2,632 | 1,972 | 653 | 488 | 25.3% |

整体注入通过两版实际 before_agent_start hook 获取，上游 systemPrompt 固定为空。Python workflow/overview 使用对应版本真实 renderer；其文件、身份、任务、journal、git 输入为脚本内固定 fixture。仅在扩展的 Python subprocess 边界回放这些真实输出，未执行模型派发。sandbox 路径映射为当前仓库路径，因此搬动仓库会改变含绝对路径项的计数，但两版仍使用相同路径。

任务正文是脚本内冻结的四份小样本，两版逐字相同，不读取本任务持续更新的 PRD/research；因此不会把任务文档变化算成 lean 收益。这不是此前研究快照的任务体积，也不是生产请求的平均值。overview 使用非空任务、单仓库、一次工作区修改、两条提交和一个 journal；详细 fixture 见 JSON。

包含关系：system 整体 = system 固定部分 + 任务正文；system 固定部分包含启动包装、workflow 索引、overview 和任务包装。任务整体包含任务包装与正文。首次 runtime 消息再含 overview 和当前状态。表中的子项不能与包含它们的整体相加；工具 JSON、工具指导、skill 索引未包括在扩展 system 整体中。本报告不把不同序列化层拼成“整个请求 token 节省”。

## 按需读取与派发正文

skill 和命令正文使用 Pi frontmatter parser 返回值（去 frontmatter、trim）；agent 正文使用两版扩展自身的 stripFM（与派发一致）。完整 skill 文件另列，因为 read 工具通常返回含 frontmatter 的文件。JSON 还包含每个命令和 agent 的完整文件计数。合计先无分隔拼接正文，再计算代理值，不把各项已取整代理值相加。

| 范围 | 原字符 | lean 字符 | 原 bytes | lean bytes | 原代理值 | lean 代理值 | 字符减少 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| skillBody.trellis-before-dev | 2,229 | 1,340 | 2,233 | 1,340 | 558 | 335 | 39.88% |
| skillBody.trellis-brainstorm | 10,237 | 6,107 | 10,245 | 6,107 | 2,560 | 1,527 | 40.34% |
| skillBody.trellis-break-loop | 6,675 | 3,751 | 6,693 | 3,765 | 1,669 | 938 | 43.81% |
| skillBody.trellis-channel | 4,582 | 3,886 | 4,670 | 3,892 | 1,146 | 972 | 15.19% |
| skillBody.trellis-check | 3,418 | 2,297 | 3,446 | 2,303 | 855 | 575 | 32.8% |
| skillBody.trellis-meta | 12,268 | 7,958 | 12,278 | 7,958 | 3,067 | 1,990 | 35.13% |
| skillBody.trellis-session-insight | 6,090 | 3,000 | 6,138 | 3,000 | 1,523 | 750 | 50.74% |
| skillBody.trellis-spec-bootstrap | 2,299 | 1,821 | 2,299 | 1,821 | 575 | 456 | 20.79% |
| skillBody.trellis-update-spec | 9,737 | 4,148 | 9,847 | 4,182 | 2,435 | 1,037 | 57.4% |
| promptBody.trellis-continue | 2,354 | 1,567 | 2,378 | 1,583 | 589 | 392 | 33.43% |
| promptBody.trellis-finish-work | 4,544 | 2,627 | 4,578 | 2,641 | 1,136 | 657 | 42.19% |
| promptBody.trellis-start | 2,430 | 2,030 | 2,438 | 2,030 | 608 | 508 | 16.46% |
| agentBody.trellis-check | 5,073 | 3,338 | 5,077 | 3,340 | 1,269 | 835 | 34.2% |
| agentBody.trellis-implement | 3,943 | 2,325 | 3,947 | 2,327 | 986 | 582 | 41.03% |
| agentBody.trellis-research | 1,167 | 877 | 1,167 | 877 | 292 | 220 | 24.85% |

| 范围 | 原字符 | lean 字符 | 原 bytes | lean bytes | 原代理值 | lean 代理值 | 字符减少 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 9 个 skill 正文合计 | 57,535 | 34,308 | 57,849 | 34,368 | 14,384 | 8,577 | 40.37% |
| 9 个 skill 完整文件合计 | 60,926 | 36,047 | 61,276 | 36,107 | 15,232 | 9,012 | 40.83% |
| 3 个命令正文合计 | 9,328 | 6,224 | 9,394 | 6,254 | 2,332 | 1,556 | 33.28% |
| 3 个 agent 正文合计 | 10,183 | 6,540 | 10,191 | 6,544 | 2,546 | 1,635 | 35.78% |

这些是按需加载成本，不是启动时全量发送量。未加载的 skill references、命令参数展开和子代理完整输入没有计入。

## 工作流状态正文

| 范围 | 原字符 | lean 字符 | 原 bytes | lean bytes | 原代理值 | lean 代理值 | 字符减少 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| no_task | 421 | 352 | 421 | 352 | 106 | 88 | 16.39% |
| task_error | 345 | 251 | 345 | 251 | 87 | 63 | 27.25% |
| planning | 449 | 363 | 449 | 363 | 113 | 91 | 19.15% |
| planning-inline | 439 | 348 | 439 | 348 | 110 | 87 | 20.73% |
| in_progress | 1,487 | 1,009 | 1,487 | 1,009 | 372 | 253 | 32.15% |
| in_progress-inline | 941 | 736 | 941 | 736 | 236 | 184 | 21.79% |
| completed | 80 | 80 | 80 | 80 | 20 | 20 | 0% |

状态项按源标记抽取并 trim，与 breadcrumb 的正文处理一致；不含 workflow-state 标签和任务状态标题。实际首次 runtime 消息另含当前 in_progress 状态、标题、overview 及标签。

## 复现与验证边界

`node scripts/measure-trellis-context.mjs` 生成报告；`node scripts/measure-trellis-context.mjs --check` 校验当前源文件是否仍产生相同报告。脚本要求 Node 24+、Python 3、已有 Pi 安装以及基线 commit 可读；从脚本位置解析仓库，从本地/global npm 位置发现 Pi，不硬编码用户安装路径。

每次运行核对 1 个注册工具、9 个可发现 skill、3 个命令、3 个角色；对每版新建两次扩展注册，确认 hook 输出相同；比较 overview 结构化事实、任务正文字节，并确认测量期间工作区源文件未变化。源码 snapshot 临时目录自动清理。原始工具注册 JSON、实际 host tools/rules、各计量文本保存于 `.tmp/trellis-context-measure/{original,lean}/`，未覆盖 `.tmp/trellis-lean/` 或 `.tmp/trellis-lean-context/` 的历史快照。

本报告只证明相同输入下的文本体积与可复现性；不替代参数回归、流程规则审查或真实子代理退出验收，也没有提供真实请求工具表、provider 序列化开销、usage 或缓存收益。更新 lean 文件或 Pi formatter 后需重跑；旧研究快照与本报告的 fixture、trim、格式化边界不同，数字不应直接混用。
