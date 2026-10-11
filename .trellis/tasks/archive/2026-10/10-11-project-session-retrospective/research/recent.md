# 最近阶段会话复盘（范围 59–70）

研究日期：2026-10-11。仅写本文件；未修改产品、配置、规范、任务状态，未启动子代理、浏览器、产品测试、通知或付费模型调用。

## 范围与证据方法

- 已执行 `python3 ./.trellis/scripts/task.py current --source`，解析到 `.trellis/tasks/10-11-project-session-retrospective`。
- 完整读取 `.tmp/retro-dialogues/recent-dialogue-only.md` 中 **12/12 条记录的全部 user/assistant 可见文本**；原始 JSONL 中的工具调用/结果按候选发现定点核查，未读取 thinking 内容，未把巨大 JSONL 整行倾倒为上下文。
- 输入清单为 `.tmp/retro-dialogues/recent-manifest.json`。12 条均为 Pi；6 条主会话、6 条子代理记录，不能称为 12 个独立用户事件。时间范围按 UTC：2026-09-19T12:22:57.146Z 至 2026-10-03T14:54:07.725Z。清单所列原始文件合计 13,701,710 字节、1,671 条 toolResult；这些是记录量，不是成本或独立事件数。
- 下文 `S70:L894` 表示覆盖表 S70 对应**原始 JSONL 的物理第 894 行**，不是导出 Markdown 行号；表后给出完整源路径。包含一手 toolResult/调用参数与现行文件核对，assistant 自述只用于定位。
- 使用 writing-for-agents 的单一来源、可检查完成条件原则。现行源码定位先看 Graft；文档、配置、Trellis 脚本与本机工具实现未被该图索引，定点读取。没有重复检索整个项目历史，package/CI/全局指令总审计留给主代理。
- 结论的 P1/P2/P3 是**代理环境改进优先级**，不表示已发现同级产品漏洞。P1：验收结论可信度；P2：重复失败或可确认的环境/资料缺口；P3：已退役路径的历史教训。

## 会话覆盖表

| 编号 | 会话 ID | 类型、主题 | 是否发现问题及状态 |
| --- | --- | --- | --- |
| S59 | `01a0b99e-a579-75a3-9b82-ab7d38a16771` | 主；NH 缩略图诊断、补 T149、提交同步 | 找到真实解析缺陷；后续 S68 已修复，当前源码也有回退，不能报为现存 bug |
| S60 | `01a0b9d8-99c7-7450-8133-de44faebbeb4` | 主；Trellis bootstrap、忽略规则、Spec Kit 迁移 | 首次出现未跟踪任务归档自动提交失败；迁移与导航保全已完成 |
| S61 | `01a0b9e1-c4d4-7450-8133-de4604283c1d` | 子；bootstrap 规范实现 | 未见独立新缺陷；如实区分工程规范、历史代码、未运行产品检查 |
| S62 | `01a0b9f4-346e-7450-8133-de48e63b136c` | 子；bootstrap 只读审查 | 未见独立新缺陷；该次明确只读且报告未改文件，作为有效做法保留 |
| S63 | `01a0ba18-a9f1-7450-8133-de4bf03c3de3` | 子；7 组功能资料迁移研究 | 找到历史勾选/实现差异；统计曾纠正，最终迁移保留原状态，不另计一次缺陷事件 |
| S64 | `01a0ba18-aa00-7450-8133-de4d18436b8f` | 子；Spec Kit 引用、浏览器指南迁移研究 | 找到旧入口依赖；后续 S60 已迁移，现有指南可达 |
| S65 | `01a0ba5d-1ab8-7423-8db8-2d76e7667e71` | 主；AGENTS 去重、技能/插件路由、提交整理 | 简单排除规则最初无效、子代理空交付；技能排除/插件替代已落地，当前配置仍在 |
| S66 | `01a0ba69-30da-7423-8db8-2d794bdfe2db` | 子；Trellis/Matt 规划研究实现职责比较 | 为 S65 提供输入，无独立新事件；不能把磁盘安装当自动加载 |
| S67 | `01a0ba69-30eb-7423-8db8-2d7ba7198a35` | 子；诊断、规范、历史类技能比较 | **无可见最终答复**；主调用返回 `No output.`，不认作完整交付；旧通用插件已屏蔽 |
| S68 | `01a0babd-b955-733c-ac3a-5f9e279d2b60` | 主；待办分诊、NH 修复、C2 规划 | NH 缺陷已修；最终审查直接改 3 处文档，与冻结审查边界冲突 |
| S69 | `01a0bb3c-aa5a-740e-bac8-ef1426e97089` | 主；Graft/Pi 安装、身份修正、deep 模型试跑 | 卡片命名碰撞仍在；模型对比混入缓存，根因断言过强，现存 smoke 脚本续跑说明与行为矛盾 |
| S70 | `01a10142-6362-7088-9a2a-273b37f5e88b` | 主；type-check 清理、浏览器验收、死字段与通知样式 | type-check/产品改动已完成；重复归档错误、验收判定矛盾、视口证据偏差、当前待办漏回填 |

完整原始文件（均位于 `/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/`）：

| 编号 | 原始 JSONL 绝对路径 |
| --- | --- |
| S59 | `/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T12-22-57-146Z_01a0b99e-a579-75a3-9b82-ab7d38a16771.jsonl` |
| S60 | `/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T13-26-15-239Z_01a0b9d8-99c7-7450-8133-de44faebbeb4.jsonl` |
| S61 | `/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T13-36-16-084Z_01a0b9e1-c4d4-7450-8133-de4604283c1d.jsonl` |
| S62 | `/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T13-56-24-302Z_01a0b9f4-346e-7450-8133-de48e63b136c.jsonl` |
| S63 | `/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T14-36-13-681Z_01a0ba18-a9f1-7450-8133-de4bf03c3de3.jsonl` |
| S64 | `/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T14-36-13-696Z_01a0ba18-aa00-7450-8133-de4d18436b8f.jsonl` |
| S65 | `/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T15-50-59-001Z_01a0ba5d-1ab8-7423-8db8-2d76e7667e71.jsonl` |
| S66 | `/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T16-04-11-098Z_01a0ba69-30da-7423-8db8-2d794bdfe2db.jsonl` |
| S67 | `/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T16-04-11-115Z_01a0ba69-30eb-7423-8db8-2d7ba7198a35.jsonl` |
| S68 | `/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T17-36-31-061Z_01a0babd-b955-733c-ac3a-5f9e279d2b60.jsonl` |
| S69 | `/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T19-55-10-299Z_01a0bb3c-aa5a-740e-bac8-ef1426e97089.jsonl` |
| S70 | `/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-10-03T10-14-50-466Z_01a10142-6362-7088-9a2a-273b37f5e88b.jsonl` |

## 八条最有价值结论（按优先级）

### R1 · P1 · 验收总判定不能吞掉未执行的接受场景

**类别：审查规范、自动检查。状态：历史交付披露了限制，但判定缺口仍可确认。**

- 一手证据：S70（`01a10142-6362-7088-9a2a-273b37f5e88b`）L879 的 write 结果将 AC4 标为“**部分验证**”，明确“**未执行**‘注入带遗留 `isReverseFlip` 的记录’”；L894 的 `trellis_subagent` 结果开头却是“**AC1–AC8 全部通过；AC4 的‘部分验证’标注属实**”，表格进一步写“通过（机械层面）／按实现标注为部分验证”。L923 最终说明保留了未验证项，因此不能说代理隐瞒限制，但“全部通过”与所验合同不一致。
- 现行核实：`.trellis/tasks/archive/2026-10/10-03-cleanup-reverseflip-dead-field/prd.md:63` 仍要求“真实浏览器中带遗留 `isReverseFlip` 的统一设置记录能正常读取”；`.tmp/reverseflip-dead-field/acceptance-evidence.md:23` 仍明确未注入该记录。`.trellis/spec/frontend/browser-acceptance.md:134` 已规定“不把局部通过写成完整验收通过”。规则存在，问题是收口判定没有执行它。
- 实际后果：该任务按 completed 交付，但特定存量记录场景未被直接验证；代码路径推导不能冒充该场景执行记录。本研究**未发现该兼容逻辑本身有 bug**。
- 最小建议：复用现有 AC 逐条表，区分 `passed / partial / blocked / unrun`；汇总由逐项状态生成。替代验证可被接受，但要明确记录修改了哪条验收口径及理由，不把静态推导直接改名为实机通过。无需新增 AGENTS 段落。
- 验证标准：含一个 `partial` 的样例不能生成“全部通过”；每条声称 passed 的实机场景能定位执行证据；当前 AC4 若保留原合同，状态仍为部分验证。
- 方法：**确定性汇总检查 + 人工判断替代验证是否等价**。不得用工具替用户自动变更合同。

### R2 · P2 · 将现有浏览器环境检查变成可失败的前置断言

**类别：自动检查、工具成本。状态：历史偏差已披露、部分轮次已补证；重复风险仍存。**

- S70 L591 的独立检查结果对 AC6 标“PASS（附偏差）”，同时写明“截图是 390×844 像素，即 DPR 1，非……DPR 3（1170×2532），触摸仿真亦无留痕”。L894 又发现命名为 `1200x900` 的三张截图实际为 1920×847 / 1908×869。L899/L903 修正了报告措辞，未补做这些视口。
- 同会话 L139 的工具结果明确为静态 `eHunter 3.1.0 enabled:true`、`eHunter (dev loader) 1.0.2 enabled:false`，直到用户改开关才加载本次产物。L1041 的检查报告再次指出通知样式验收事件落盘不符指南；后续 L1072 的真实工具结果已补齐 init 115 / idle 26 条事件、`initErrors:[]` / `idleErrors:[]`，L1075 回填证据，不能再报该轮日志仍缺失。
- 现行核实：`.trellis/spec/frontend/browser-acceptance.md:48` 起已有每轮 CDP 配方；`:77` 要求重设视口/DPR/触摸，`:79` 起的例子只打印实际环境；`:110` 已要求导航前启用 Runtime/Log、分阶段追加事件；`:126` 要求确认新生产包实际加载。`.pi/skills/eh-test/SKILL.md` 也已有 dev loader 与静态脚本切换要求。
- 实际后果：不符合视口的截图进入验收材料、静态版注入被误用为当前产物，需额外追查；NH 多次刷新触发 429（同会话已有记录）。不能仅凭图片物理像素推断所有浏览器环境；需要同时保存 CSS 视口、DPR、touchPoints 与截图方式。
- 最小建议：在**既有验收脚本/配方**中把“打印环境”升级为断言并保存结果；任何尺寸/触摸不符先停该轮交互。产物检查在首轮交互前核对请求和 bundle 标识；事件启用与落盘放在同一个入口，保留 `finally` 保存。只为机械条件加检查，不重建一套浏览器框架。
- 验证标准：故意错误 DPR、错误窗口尺寸、未加载本次 bundle 都会在交互前失败；报告附件有实际环境对象和各阶段事件，错误环境不再显示移动端通过。DOM 克隆只可证明隔离布局场景，仍与自然下载流程分列。
- 方法：**确定性前置检查**；噪声来源、CSS 替代场景的证明范围仍由审查判断。

### R3 · P2 · 未跟踪任务的归档自动提交存在重复、现存的 pathspec 错误

**类别：自动检查、工具可靠性。状态：两次历史失败手工补交，当前脚本缺陷仍在。**

- S60（`01a0b9d8-99c7-7450-8133-de44faebbeb4`）L165：`[WARN] Auto-commit failed: 错误：路径规格 '.trellis/tasks/00-bootstrap-guidelines' 未匹配任何 Git 已知文件`。
- S70 L641：同样错误再次出现在 `.trellis/tasks/10-03-cleanup-pageflip-i18n-notification`；同时工具输出已归档、`Total: 0 task(s)`。这不是两轮复查同一事件，而是两个不同任务重复触发同一脚本分支。
- 现行核实：`.trellis/scripts/common/task_store.py:1491` 起计算 `source_was_tracked`；`:1530` 使用 `git rm --cached --ignore-unmatch` 正确照顾未跟踪旧路径；但 `:1555`–`:1556` 仍无条件 `['commit', '-m', commit_msg, '--', *paths, source_rel]`。`:1567` 对该失败返回 `not source_was_tracked`，未跟踪来源时外层甚至可以继续把归档看作成功。
- 实际后果：任务已移动、自动提交却失败，需要主代理手工补交，工作区/任务状态与提交状态暂时分离。
- 最小建议：修现有 `_auto_commit_archive`，提交 pathspec 只纳入确实需要提交源端删除的路径，保留当前显式提交范围、防止夹带用户暂存内容。优先形成可上游提交的最小修复；不加“报错后手动 git commit”的常驻绕行指令。
- 验证标准：隔离临时仓库覆盖“任务之前未跟踪”“任务已跟踪并搬迁”“有无关已暂存文件”三种情形；前两者归档提交成功，第三者不夹带，退出状态准确。**本轮没有执行该回归测试**，当前判断来自原始失败结果和现行代码分支。
- 方法：**确定性回归测试**。

### R4 · P2 · 正式只读审查与 trellis-check 的直接修复职责冲突

**类别：审查规范、常驻指令/无效指令。状态：现行指令冲突仍在；后续派发已有良好范例。**

- S68（`01a0babd-b955-733c-ac3a-5f9e279d2b60`）L226 派发最终审查时要求 `review and fix directly`、`Fix anything you find directly (code or docs)`；L227 返回 `PASS-with-findings`，并明确修了 tasks.md、quality-guidelines.md、design.md 三处。问题是主代理给了冲突派发，不应把责任推给子代理“擅自修改”。
- 现行核实：上层 `/Users/warwick/.pi/agent/AGENTS.md` 要求正式审查固定版本、修复留下一轮；`.pi/agents/trellis-check.md:39`/`:51` 却写直接修复；`.agents/skills/trellis-check/SKILL.md:104` 起的 Step 6 同样允许原地修。项目 AGENTS 区分 `trellis-check` 验收和 `code-review` 独立审查，但未消除当 trellis-check 被当作正式独立审查使用时的歧义。
- 实际后果：同一轮检查同时改变被检查版本并给最终 PASS-with-findings；文档实际发生变化，虽然没有产品代码变更，也不再是“固定版本的独立审查”。
- 最小建议：区分**实现阶段自检修复**与**正式审查报告**两种调用；正式派发明确只读、返回问题，主代理下一轮修复后复查。复用 S70 L893/L1039 已有“不要改文件”的派发方式，避免重复运行两套审查；若调整托管 agent，先评估更新覆盖边界。
- 验证标准：正式审查前后待审源码、规范和测试清单 hash 相同；允许单独新增审查证据。修复后产生新审查版本，旧 PASS 不自动沿用。
- 方法：**派发角色判断 + 确定性文件清单/hash 检查**。主代理负责统合全局规则，不建议继续堆 AGENTS 禁令。

### R5 · P2 · Graft Markdown 卡片覆盖不完整，但不能扩大成调用图丢失

**类别：导航、信息访问。状态：当前仍存，影响已收窄核实。**

- S69（`01a0bb3c-aa5a-740e-bac8-ef1426e97089`）L59 的工具结果列出两个源文件 `core/utils/Logger.js`、`core/utils/logger.ts`，而 `graft/core/utils/Logger.md` 内容只覆盖后者。历史 INDEX 声称 191 个逐文件卡，实物为 190 张卡 + INDEX。
- 当前仍有两个源文件；`graft/core/utils/Logger.md:1` 为 `# core/utils/logger.ts`。`graft/INDEX.md:14` 当前声称 185 张逐文件卡，但实测 Markdown 共 185 个，含 INDEX，即逐文件卡只有 184 个。
- **重要纠偏**：当前 `graft/.graph/wiring.json` 仍含 `core/utils/Logger.js` 的 6 个节点、`core/utils/logger.ts` 的 4 个节点。因此能证明的是**卡片路径碰撞/覆盖**，不能复述历史 assistant 所说“符号整块丢了”来声称底层图、grep/callers 都漏掉 JS 文件。本轮未专门调用每种查询工具复测。
- 实际后果：通过 INDEX/Markdown 浏览代码的 agent 会漏掉 JS 版本细节，卡片计数也误导覆盖判断。
- 最小建议：图构建工具将完整源扩展名纳入卡片名或在写入前检测规范化文件名碰撞；当前项目先将该情况明确为卡片导航限制，已有 AST 查询可继续用。不要为绕过工具命名而贸然改产品文件名。
- 验证标准：JS/TS 两个来源各有唯一卡片，INDEX 数量与实际逐文件卡数一致；大小写不敏感路径碰撞可确定性失败或被唯一化；保留底层图节点数核对。
- 方法：**确定性覆盖/命名碰撞检查**。Graft 自报节省 token 以“读全文件”为比较基准，不能据此证明真实任务成本降低。

### R6 · P2 · Graft deep 实验混入跨模型缓存，smoke 脚本又会删掉续跑缓存

**类别：工具成本、信息访问/实验判断。状态：历史结论需降级；脚本矛盾当前仍存。**

- S69 L283：flash 结果 `0 computed, 0 cached, ... 36 pending`；L289：pro 结果 `5 computed, 0 cached, ... 31 pending`；L293：gpt 结果 **`29 computed, 5 cached, 0 stale, 2 pending`**，概念层亦是 `0 read, 3 cached`。报告把累计 34/36 作为 gpt 单模型覆盖率，并称概念内容质量来自该模型，证据无法支持这样的独立比较。
- S69 L292 还为“无静默降级检查”再次执行完整 deep 命令后 grep 警告，可能重复调用剩余节点；L282 在 graft 后先 `echo` 再读 `$?`，L283 输出 `exit=0` 并不代表 deep 成功。不能据此得出实际请求次数或费用，原始账单未取。
- 根因断言也过强：S69 L302 称 `empty-parsed` 必定证明调用了工具、属于模型 schema 能力且“配置层面无解”。但同会话 L291 已读到 `argsFromResponse` 的文本恢复路径；当前 `/Users/warwick/.nvm/versions/node/v24.18.0/lib/node_modules/@nanonets/graft/dist/ai/crux.js:96`–`:108` 仍会从 `res.text` 恢复 `symbols`。该分类只证明**解析后存在 id 而无可用 summary**，没有原始脱敏响应就不能断言 tools 一定成功或模型是唯一根因。
- 当前脚本 `.tmp/graft-deep.sh:19`–`:22` 仍固化该选型表；`:24` 声称“重跑自动从缓存续算，不会重复烧钱”，但 smoke 分支 `:76`–`:77` 先提示续算、随后删除整个 `$SMOKE_OUT`，再 build。`:31` 的目录仍为 `/tmp/graft-smoke`，也未遵守仓库 `.tmp/` 的产物位置约定。S69 L304/L305 是该脚本原始写入/回读证据。
- 实际后果：选型依据混入别的模型结果；再次运行 smoke 会清缓存，存在重复调用成本，续跑承诺错误。**未证明有人实际重复运行造成了费用损失**。
- 最小建议：保留现有脚本，修正注释与 smoke 缓存策略；模型横向比较使用各自独立缓存，续跑保留同模型缓存；记录 `computed/cached/pending` 和真实命令退出码。配置预检不要再次执行付费 deep。对 `empty-parsed` 保留响应样本后再判断根因；不要再跑一轮付费比较来“补证”历史推荐。
- 验证标准：stub CLI 即可验证重复 smoke 不删除已完成结果、不同模型不共用结果、失败退出码不被 echo/管道掩盖；报告的单模型成果不含其他模型缓存。真实成本与模型优劣仍标未验证。
- 方法：**确定性脚本检查 + 实验归因准则**，不是新增模型测评系统。

### R7 · P2 · 当前待办仍把已完成的通知硬化列为未做

**类别：导航、信息访问、单一来源。状态：明确现存；历史基线计数本身不是错误。**

- S70 L952 的 PRD write 结果确立通知标题换行和列表限高任务；L1033 的验收证据 write 结果记录 `overflow-wrap`/限高的前后测量；L1041 独立审查复核 +81 字节构建差异及测量；L1107 是最终交付定位点。
- 当前代码：`core/components/status/StatusNotificationItem.vue:68`–`:69` 有 `min-width: 0; overflow-wrap: anywhere;`；`core/components/status/StatusNotificationStack.vue:44`–`:45` 有 `max-height: calc(100vh - 48px); overflow-y: auto;`。`.trellis/tasks/archive/2026-10/10-03-harden-notification-stack-layout/task.json:14` 为 `completedAt: 2026-10-03`，同文件状态为 completed。
- 但 `.trellis/spec/frontend/features/pending-work.md:24` 仍写“仍有一处遗留：T024 的两处可选硬化……未做”，且同段引用多个归档前任务路径。这是当前事实错误，可能让下一会话重复推荐已经完成的工作。
- 该页 `366 / 252 / 114` 已明确标为**迁移基线口径**，不能简单建议把原始历史计数全重算覆盖；需要改的是当前状态前言/遗留条目。
- 最小建议：修一处现行状态与归档链接，原始迁移清单原样保留；任务收口复用已有 pending-work 回填动作，检查当前遗留与本次 completed 项是否矛盾。不要新建第二套 backlog。
- 验证标准：从 pending-work 进入时，通知硬化显示已完成并链接归档证据；当前待办筛选不再推荐它。文件存在性与归档路径可机械检查，正文“已做/未做”矛盾仍需有上下文的核对。
- 方法：**链接确定性检查 + 状态判断准则**。

### R8 · P3 · 子代理空交付是实际历史损耗，现行已换路由，避免重复造轮子

**类别：工具成本、信息访问。状态：历史问题，当前通用插件已退役；新路由是否仍复现未验证。**

- S65 L69 的一手 subagent 工具结果为 `Agent completed in 163.3s (35 tool uses, 91.8k token).` 后接 **`No output.`**；对应 S67（`01a0ba69-30eb-7423-8db8-2d7ba7198a35`）有 35 个工具结果，原始 L55 最终 assistant 无 text。因此不能因进程 completed 就当研究已交付，也不能把 91.8k 当本研究独立测得的计费数；它是插件自报量。
- 同一父会话已随后屏蔽通用插件。当前 `.pi/settings.json` 的 `npm:@ssk_dev/pi-subagents-lean` 为 `autoload:false`、`extensions:["!**/*"]`；Trellis 扩展仍配置于 `./extensions/trellis/index.ts`。当前研究 agent 已要求落文件、仅回路径，正好减少仅靠聊天返回的丢交付风险。
- 最小建议：保留现行 Trellis 路由与研究落盘规则。父代理检查“声明交付文件存在、有内容、可读取”，空返回按未完成处理；不建议为已经屏蔽的旧插件新增重试系统或再次调整 AGENTS。
- 验证标准：正常退出但无文本/无文件的样例不会被父代理宣告完成；不能自动无上限重试。是否需要实现额外运行时检查，须在现行 trellis_subagent 上先确认能力缺口。
- 方法：**确定性交付物检查**；当前运行时缺口标为待确认。

## 已有能力与已解决事项：不应重新包装为建议

| 已有/已修事项 | 本范围证据与当前核实 | 本轮结论 |
| --- | --- | --- |
| NH 缩略图 `src` 兼容 | S59 L30 真实失败 `NH_THUMBNAILS_NOT_VISIBLE`，45 条 / withSrc 0 / loaded 0；L38 原 HTML 45 个 src、0 dataSrc；L41 内存对照 valid 0→45。S68 完成修复与验收；当前 `src/platform/nh/parser/IntroHtmlParser.ts:26` 已为 `data-x-src || x-src` | 历史缺陷已修；当前不再推荐重复修 T149 |
| type-check 的 22 条基线错误 | S68 记录发现；S70 L894 等真实工具结果有 type-check exit 0，且死文件清理完成 | 已修历史问题；本轮未重新运行，不冒充当前测试通过 |
| Spec Kit → Trellis 迁移 | S60 迁移保全/引用检查，S63/S64 是同一迁移的研究；当前产品目标、功能索引、浏览器指南已位于 `.trellis/spec/frontend/` | 不再建议“建一个统一规范目录”或重复迁移 |
| 技能排除与插件覆盖 | S65 验证后采用“显式全局 SKILL.md 路径 + !research / !domain-modeling”；当前 `.pi/settings.json` 保留该组合 | 不再建议只加 `!技能名`；磁盘上手动技能存在不等于自动加载冲突 |
| 浏览器指南 | `.trellis/spec/frontend/browser-acceptance.md` 已包含 CDP、日志、产物确认、DOM 计数、429、清理流程 | 缺的是机械执行与准确汇总，不是再加一长段测试规范 |
| 通知任务最终日志补证 | S70 L1041 审查发现事件记录不足，L1072/L1075 实际补充并回填 | 不把首次不足当最终交付仍无日志；R2 聚焦重复机械偏差 |
| `isReverseFlip`、i18n 死键、通知 CSS | S70 多个任务逐步完成并归档 | 不把中间时点的“待做”重报为当前产品问题；R7 是待办文字漏更新 |
| Git 身份归属 | S69 曾根据上游历史邮箱给出错误建议，后续通过 gh 账号核实并改为用户 noreply，重写历史有交互授权记录 | 历史建议有误但已纠正；本轮不改身份、不再改写历史，不在此扩展全局审计 |

## 分类覆盖与剩余限制

- 导航：R5 卡片覆盖、R7 待办；自动检查：R1/R2/R3；审查规范：R1/R4；常驻/无效指令：R4；工具成本：R2/R6/R8；信息访问：R5/R6/R7/R8。未为没有独立证据的类别凑新增规则。
- 已验证：全部 12 条可见对话；候选的一手工具结果、关键调用参数；归档脚本现行分支；现行浏览器规范/agent 职责；本机项目级屏蔽配置；Graft 卡片与 wiring 节点差异；smoke 脚本；待办与当前 CSS/归档状态冲突。
- 未验证：产品当前运行行为、最新 type-check/build、真实浏览器视口与下载、Graft 每个查询工具的完整覆盖、付费调用账单、模型独立优劣、当前 Trellis 空交付复现、全仓 CI/包脚本和全局规则的完整性。没有运行测试或浏览器来增加本次研究范围。
- 历史对话有 ask_user_question 的答案保存在工具结果而非 user 文本的情况；本报告不因纯对话导出里缺一句确认就指控未授权，也不把父/子代理对同一问题的多次描述计为独立事件。
- `.tmp/` 证据与本机工具路径是本机复核材料，不保证另一个 clone 可获取；关键历史结果已同时给出原始会话 ID/物理行号。S67 没有最终文本是覆盖限制，已明确列出。
- Graft 本轮只调用 `graft map` 一次，自报节省估计 195,430 tokens（对比读完整 185 文件）；这是工具估计，不是实际 token 账单或本任务节省量。

主代理下一步（2 分钟内）：优先将 R1、R3、R7 合并进总报告的高置信候选；R4 与全局指令核对合并，R6 保留费用未验证边界。
