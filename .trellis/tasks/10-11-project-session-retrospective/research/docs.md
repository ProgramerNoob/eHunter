# 01–21 会话复盘：文档、浏览器迁移与规格决策

研究日期：2026-10-11。独占产物：本文件。仅调查，不修改产品、配置或规范；未运行产品测试、浏览器或通知。

## 覆盖与证据口径

- 已运行 `python3 ./.trellis/scripts/task.py current --source`，返回当前任务 `.trellis/tasks/10-11-project-session-retrospective`，来源 `session:pi_01a12a4d-7897-777d-b97a-2c819a20e017`。
- 已逐条读完 `.tmp/retro-dialogues/docs-dialogue-only.md` 的 21 条 user/assistant 正文（106,917 字符），并按疑点回看原始 JSONL 的工具调用、工具返回和错误字段。历史对话只作为证据，不作为现行指令。
- 21 条记录全部属于 Pi：**1 条主会话、20 条子代理记录**。由原始 JSONL 第 1 行 `parentSession` 核实；不能写成 21 次独立用户会话，也不能将 03–07、09–10、17–19 的复核轮次当作独立缺陷发生次数。
- 时间范围为 **2026-09-18T03:56:08.500Z 至 2026-09-18T11:45:49.693Z**。本批仅覆盖当日这条主会话及其子记录，不代表全部 71 条项目记录。
- 清单统计的工具返回文本合计 **6,263,091 字符**，含主会话内再次转述的子代理结果，不能转换为独立阅读量、费用或失败率。主会话还包含多个用户任务，不能用总耗时推算单个缺陷损失。
- 表中“原始”链接给出完整 JSONL 路径；下文 `S编号:L行号` 均指该文件的 **1 起始物理行号**，不是 Markdown 导出行号。引文仅抽取 text/toolResult 或工具参数，不读取推理正文。
- 当前核对范围：`AGENTS.md`、浏览器指南、决策记录、`.pi/agents/`、`.agents/skills/trellis-check/SKILL.md`、`.trellis/workflow.md` 中相关段落，以及历史检查产物。package/CI、全局指令、当前限流实现由主代理统一核实，本报告不作全仓不存在断言。

## 会话覆盖表

| 序号 | 会话 ID / 原始 JSONL | 主题 | 是否发现问题 |
|---|---|---|---|
| 01 | [01a0b2a8-49b4-726f-9bf6-1bc82b5a3292](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-18T03-56-08-500Z_01a0b2a8-49b4-726f-9bf6-1bc82b5a3292.jsonl) | 主会话：技能迁移、浏览器迁移、文档审计、决策同步、Spec Kit 配置 | 有：D01–D06；含完整修复链 |
| 02 | [01a0b2d1-8ae0-726f-9bf6-1bcbd08f7194](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-18T04-41-12-160Z_01a0b2d1-8ae0-726f-9bf6-1bcbd08f7194.jsonl) | 30 份 specs 浏览器名称迁移 | 未见新增环境问题；历史日期/勾选保留 |
| 03 | [01a0b2fc-250f-726f-9bf6-1bcd29f3e2e4](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-18T05-27-44-144Z_01a0b2fc-250f-726f-9bf6-1bcd29f3e2e4.jsonl) | 平台、下载、放大镜文档审查 | 有：D04；直接按实现改规格的建议需过滤 |
| 04 | [01a0b2fc-2518-726f-9bf6-1bceba96dbd2](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-18T05-27-44-152Z_01a0b2fc-2518-726f-9bf6-1bceba96dbd2.jsonl) | 翻页、设置、布局、缩略图文档审查 | 有：D02/D04；历史状态不能当现行冲突 |
| 05 | [01a0b2fc-251f-726f-9bf6-1bd1d2b56418](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-18T05-27-44-159Z_01a0b2fc-251f-726f-9bf6-1bd1d2b56418.jsonl) | 16 份提示词/模板初审 | 有：D01；虚构文件、错误覆盖声明；另有只读范围偏离 |
| 06 | [01a0b302-ce3d-726f-9bf6-1bd3acdfa80a](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-18T05-35-00-669Z_01a0b302-ce3d-726f-9bf6-1bd3acdfa80a.jsonl) | 56 份 specs 重审 | 有：D01/D04；只读关键段与全量宣称不一致，建议删除历史取舍 |
| 07 | [01a0b305-c1c6-726f-9bf6-1bd575d7753a](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-18T05-38-14-086Z_01a0b305-c1c6-726f-9bf6-1bd575d7753a.jsonl) | 16 份提示词/模板重审 | 有：D06 的历史缺陷；有效重审，不计独立新事件 |
| 08 | [01a0b341-9ffe-726f-9bf6-1bd6ce06fc56](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-18T06-43-37-598Z_01a0b341-9ffe-726f-9bf6-1bd6ce06fc56.jsonl) | 确定性 specs 修正 | 有：D03；写入后并发限额中断 |
| 09 | [01a0b35b-47fe-726f-9bf6-1bd87acd02d1](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-18T07-11-39-006Z_01a0b35b-47fe-726f-9bf6-1bd87acd02d1.jsonl) | 冻结版工作流最终审查 | 发现 clarify 零答案分支未闭合；随后修复，归 D06 |
| 10 | [01a0b364-566b-726f-9bf6-1bdbd362abfc](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-18T07-21-32-524Z_01a0b364-566b-726f-9bf6-1bdbd362abfc.jsonl) | clarify 增量复核 | 未见新增问题；确认同一缺陷已闭合 |
| 11 | [01a0b378-9e5b-726f-9bf6-1bddbfb71482](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-18T07-43-41-659Z_01a0b378-9e5b-726f-9bf6-1bddbfb71482.jsonl) | 下载格式决策研究 | 有：D04；仅查提交消息，正确标明批准证据未穷尽 |
| 12 | [01a0b378-9e64-726f-9bf6-1bdf4fb3e9ec](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-18T07-43-41-668Z_01a0b378-9e64-726f-9bf6-1bdf4fb3e9ec.jsonl) | 翻页默认与存储决策研究 | 有：D01 信息判断遗漏：输出已有 grant，却称该段未验证 |
| 13 | [01a0b378-9e6b-726f-9bf6-1be031913de7](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-18T07-43-41-675Z_01a0b378-9e6b-726f-9bf6-1be031913de7.jsonl) | 放大镜尺寸决策研究 | 未见独立环境问题；推荐方案后经用户另选，不算违规 |
| 14 | [01a0b3ab-f878-726f-9bf6-1be3286aa9ca](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-18T08-39-47-064Z_01a0b3ab-f878-726f-9bf6-1be3286aa9ca.jsonl) | D03 下载文档同步 | 未见新增环境问题；保留原契约与实现偏差 |
| 15 | [01a0b3ab-f880-726f-9bf6-1be429367e76](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-18T08-39-47-072Z_01a0b3ab-f880-726f-9bf6-1be429367e76.jsonl) | D04 翻页/设置同步 | 有：D03；开始后立即并发限额中断 |
| 16 | [01a0b3ab-f887-726f-9bf6-1be663033a63](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-18T08-39-47-079Z_01a0b3ab-f887-726f-9bf6-1be663033a63.jsonl) | D10 放大镜同步 | 有：D03；已写部分文档，最终无完成报告 |
| 17 | [01a0b3d2-89bb-726f-9bf6-1be89dd8dd3e](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-18T09-21-54-619Z_01a0b3d2-89bb-726f-9bf6-1be89dd8dd3e.jsonl) | 翻页/设置正式审查 | 未见独立环境问题；低风险文案项后修复 |
| 18 | [01a0b3d2-89c3-726f-9bf6-1bea78e245ae](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-18T09-21-54-627Z_01a0b3d2-89c3-726f-9bf6-1bea78e245ae.jsonl) | 下载/放大镜/hooks 正式审查 | 未见独立环境问题；派生字段说明后修复 |
| 19 | [01a0b3da-336f-726f-9bf6-1bec5b278d34](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-18T09-30-16-815Z_01a0b3da-336f-726f-9bf6-1bec5b278d34.jsonl) | 五处文案及36文件哈希增量复核 | 未见新增问题；确定性版本校验正例 |
| 20 | [01a0b3e6-c638-726f-9bf6-1befd77f375f](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-18T09-44-00-824Z_01a0b3e6-c638-726f-9bf6-1befd77f375f.jsonl) | 新建空项目 workflows 研究 | 未见需强制升级的配置缺陷；可选能力未执行 |
| 21 | [01a0b436-82c2-726f-9bf6-1bf02b84e3e4](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-18T11-11-06-434Z_01a0b436-82c2-726f-9bf6-1bf02b84e3e4.jsonl) | assess/bug 扩展研究 | 未见安装必要性；未执行、未安装，不算实际故障 |

## 最有价值的六项结论（按严重度排序）

### D01 · P1：审查结论需要可机器核对的出处，不能用“已全读”自述代替覆盖证据

**实际后果。** 初审给出了不存在的文件、错误 frontmatter 数量和虚构的安装限制，主代理不得不重做提示词/模板审查。未发现这些错误最终进入交付文档的证据；主代理成功拦截，后果是错误建议与追加调查成本，不能夸大为已造成产品回归。

**原始证据。**

- `S05 = 01a0b2fc-251f-726f-9bf6-1bd1d2b56418:L8` 的实际目录工具输出包含 `speckit.converge.md`、`constitution-template.md`；不包含 `speckit.README.md`、`constitution-log.md`。然而 `S05:L73` 声称“16/16 已逐份通读”，将后两者列为已读文件，还引用 `agents/pi.md:396-412`，声称“10/10 文件均带 handoffs”。`S05:L11` 的实际 `speckit.taskstoissues.md` frontmatter 已没有 handoffs，足以直接反证。
- `S01 = 01a0b2a8-49b4-726f-9bf6-1bc82b5a3292:L454` 收到该错误结果；`S01:L460` 重新列清单，`S01:L477` 对每份 prompt 实际抽取 frontmatter。`S07 = 01a0b305-c1c6-726f-9bf6-1bd575d7753a:L6` 的重审派发明确要求“实际列清单”“不要凭空引用 agents/pi.md”；`S01:L495` 收到重审结果，工具记录为 **489.7s、65 tool uses、145.5k token**。这些是工具自身汇总，仅说明重审发生，不等同净浪费或账单。
- 安装基线也被误读：`S05:L73` 声称“只能走 upstream（不要就地改）”且“3份清单38条 hash”；`S07:L56` 的实际比对输出是 **15 个目标文件 matches、agent-file-template.md not recorded**。安装基线并不禁止本地修改；主代理最终保留基线并记录本地差异。
- 次级例子：`S12 = 01a0b378-9e64-726f-9bf6-1bdf4fb3e9ec:L18` 工具输出已给出 `vite.config.prod.ts:29 @grant GM_xmlhttpRequest`、`:30 @grant GM_download`；`S12:L19` 却称 grant 段“grep 被截断”，导致关键事实仍需主会话复核。此处属于证据消化错误，不能当成真实工具截断。
- 工具成本诱因只能保留为假设：`S05:L49` 用 `awk 'NR>=1000 && NR<=1120' ...chunk-JVUZSMYM.js | cut -c1-400` 看压缩 bundle；`S05:L50` 返回 **17,826 字符**、大量无关函数且按行截字符。能证实阅读信噪比低，不能据此断言其导致幻觉。

**现状核对。** 项目已经通过 `AGENTS.md:40–43` 将收口交给 trellis-check、独立审查交给 code-review，使用已定义角色；`.pi/agents/trellis-check.md:47–52` 要求读取 diff/任务/spec，`:63` 要求报告改动与验证。历史错派 Explore 做开放式审查无需再照搬到现行环境。所读检查入口未要求结构化的“覆盖文件集合/证据行/原文匹配”校验，但主会话核验原则已经存在，不建议再加一段泛泛的“认真审查”。

**最小改进。** 在现有报告交付处使用简短清单：范围文件、已读范围、结论引用（路径、行号、短原文）、未验证项。报告进入主会话前对文件存在、行号范围、短引文匹配和清单缺项做确定性检查；涉及历史删除文件时按声明的 Git 基线核对。证据语义和建议是否越权仍由审查者判断。若现有运行时已经做这些检查，直接复用，不新建第二套审查框架。

**验证标准。** 将不存在的 `speckit.README.md`、错引文、越界行号、未覆盖文件各作为一次输入，均被标为不合格而非“全量完成”；真实的历史文件带正确基线时能通过。对同一缺陷只记一次主事件。

**状态：历史错误已纠正；结构化出处校验是否已有运行时实现待主代理确认。** 分类：审查规范、信息访问、工具成本。

### D02 · P2：把已经写过的文档确定性检查接入现有收口，优先复用而非继续补常驻规则

**实际后果。** 2026-09-18 文档存在机器绝对路径、错误目录引用、重复 FR 编号，代理按路径导航和按编号追踪需求会得到错误目标；修正过程多次临时编写检查。不能把 69 个路径出现点算成 69 次用户事故。

**原始证据。**

- `S08 = 01a0b341-9ffe-726f-9bf6-1bd6ce06fc56:L22` 实际读取的 settings tasks 包含 `/Users/alex/Desktop/works/js/eHunter/...` 和 `specs/001-more-settings-modal`；`:76`、`:92`、`:103`、`:116`、`:129` 是实际替换结果，目标改为仓库相对路径和 `specs/002-more-settings-modal`。
- `S01:L1169` 是原始检查程序（Bash 内嵌 Python），检查 Markdown 本地链接、FR/T 编号唯一、YAML `$ref`、历史勾选、diff 空白和文件 SHA-256；`S01:L1195` 复用并修正后再次执行。这不是“缺一个检查方案”，而是已有可提取能力。
- `S19 = 01a0b3da-336f-726f-9bf6-1bec5b278d34:L15` 读取实际结果：`files:36`、`markdown_links_checked:90`、`local_schema_refs_checked:53`、`functional_requirement_ids_checked:59`、`task_ids_checked:153`、`errors:[]`。`:17` 的重新计算输出为 **`ok: 36 / mismatch: none / missing: none`**，证明冻结版本与证据对应。这是可以沿用的正例。

**现状核对。** `.tmp/documentation-decision-sync-checks.json` 和 `.tmp/documentation-audit-2026-09-18.md` 当前仍存在，但只代表历史记录。`.specify/`、`.pi/browser-testing.md`、`.pi/speckit-maintenance.md` 已不存在；文档现位于 `.trellis/spec/frontend/`，不能直接跑旧路径检查并冒称当前通过。`AGENTS.md:29` 已要求纯文档验证引用、格式和命令；`.agents/skills/trellis-check/SKILL.md:58–62` 已有 Spec Sync 入口。本次限定目录的文件名检索没有找到专用文档检查脚本，**未核对 package/CI，不能断言没有自动化**。

**最小改进。** 主代理先确认现有 package/CI 能力；若确有缺口，从 `S01:L1195` 提取成熟检查逻辑，迁移到当前路径，纳入现有文档收口命令。只检查真实文档链接/需求定义；“未来应生成的文件”、历史原文、示例路径须明确区别，不能一概报断链。旧程序只校验链接文件是否存在，主动去掉 `#anchor`；若需求包含标题跳转，再复用成熟 Markdown 解析能力补锚点检查，不能把旧 90 链接通过说成锚点已验证。

**验证标准。** 断链、重复定义、失效 `$ref` 返回非零并定位文件；合法历史记录/计划产物不误报；输出明确检查范围与版本，改动后旧哈希不可复用。只验文档时不会启动产品浏览器测试。

**状态：历史内容已修；持久化自动检查是否缺失待 package/CI 汇总核对。** 分类：导航、自动检查、常驻指令。

### D03 · P2：账户并发限额会留下部分文件，应保留已完成改动并降低派发并行度

**实际后果。** 本批有三条子记录因同一类上游错误终止，两条已写部分文档、一条几乎未开始。主代理不得不接管。不能将它们称为三个独立账户故障，也没有证据表明用户改动被覆盖。

**原始证据。**

- `S08:L171`、`S15 = 01a0b3ab-f880-726f-9bf6-1be429367e76:L18`、`S16 = 01a0b3ab-f887-726f-9bf6-1be663033a63:L128` 的原始 assistant `errorMessage` 均为 **`gateway_concurrency_limit: Concurrency limit exceeded for account, please retry later`**。
- `S01:L607` 收到 S08 的失败及 partial output；`S01:L982–983` 收到 S15/S16 的失败。`S08:L76` 等实际 replace 返回、`S16:L104/L106` 的 insert/replace 返回证明失败前已有落盘；S15 的工具统计只有 find/read/todo，无编辑调用。
- `S01:L985` 开始检查现场改动；`S01:L1008` 是主代理继续补正文的 replace 返回。最终 S19 哈希核验完成，说明接管按实际文件继续，而非假定失败意味着回滚。

**现状核对。** 当前 `.pi/agents/trellis-implement.md:43` 和 `.pi/agents/trellis-check.md:41–43` 已禁止子代理递归派发；`AGENTS.md:43` 已统一 `trellis_subagent`。本次未检查当前后端并发额度、扩展 semaphore/backoff，不能把旧 `subagent` 的问题直接认定为新运行时仍存在。

**最小改进。** 若当前运行时尚无能力，优先在现有派发器配置账户级并发上限；首次出现明确 concurrency 错误后，后续未启动任务排队，完成/失败都交付实际文件清单与最后检查点。接管先核对 diff 和写入者状态。复用已有状态管理，不再加“所有任务固定最多 N 代理”的常驻规定，也不猜测额度 N。

**验证标准。** 仅在隔离的运行时验证中注入一次此错误：未开始任务排队、部分写入不丢失、同一文件没有第二写入者、主代理能根据交付路径恢复。此次调查没有执行该模拟。

**状态：历史阻塞已被人工接管；当前限流能力待核实。** 分类：工具成本、执行环境。

### D04 · P2 历史教训：代码与规格不一致时先追溯决策；这项规范已存在，不应继续堆叠 AGENTS

**实际后果。** 早期审查把实现当权威，建议直接修改产品契约或删掉历史研究。主代理没有照做，而是追溯提交并询问用户；随后四组文档才同步。实际可证后果是建议偏离需求与额外核对，不是未经授权的行为变更。

**原始证据。**

- `S06 = 01a0b302-ce3d-726f-9bf6-1bd3acdfa80a:L14` 工具实际读出的 research 保留 YAML 原始决策；但 `S06:L85` 建议以实现为准，甚至将 `research.md:17` 否决 JSON 的理由“整段删除”。同一报告开头承认部分文档只读关键段，不能据其“全量”措辞增加覆盖数。
- `S11 = 01a0b378-9e5b-726f-9bf6-1bddbfb71482:L15` 明确只检索提交消息，不能断言从未批准 JSON；主代理 `S01:L840` 实际查看 `08b76ee2e3876d4ca7649f5174cc57edbe2f0cdc` 的 Git 内容，确认移除 YAML 的历史变更。提交变更本身仍不代替产品授权。
- 用户选择有工具原始证据：`S01:L855` 确认保留 JSON、按设备并尊重系统、共享偏好且允许降级、自由调节尺寸；`:881` 明确“保留三项，只在首次初始化取默认”，并对几何问题回答“不是很理解，请详细说明后再问我一次”；`:883` 在 200px×5 倍、600px 空间的具体示例后选 A。代理随后记录的三项动效方案因此有授权依据，不能把此前推荐“自动”选项当作最终决策。
- `S19:L17` 的实际版本核验承接同步结果；原始历史勾选保持，不宣称功能测试通过。

**现状核对。** `AGENTS.md:20` 已明确“目标、历史计划与当前实现有冲突时，先追溯决策”；`.trellis/spec/frontend/decisions/2026-09-18-reader-behavior.md:3–4,11–13` 已区分历史时态、当前规则与未验收实现。原来的 Input/research/tasks 保留，并有读取指针。这正符合 writing-for-agents 的单一事实来源与条件披露。

**最小建议/准则。** 沿用该入口；证据不足时只标“冲突待决策”，不要自动把规范改成实现。解释几何/初始化等选择时给具体例子，避免让用户先理解内部结构。这属于判断准则，不能用正则自动决定产品行为。

**验证标准。** 后续相关任务在报告中能定位到具体决策条款，保留未批准差异和未验收范围；静态检查只验证引用/状态，不替用户选择格式或默认值。

**状态：文档与决策入口已修复；本轮未验证对应产品实现的当前完成程度。** 分类：审查规范、常驻指令、信息访问。

### D05 · P3：浏览器迁移踩坑已有统一指南，继续复制操作规则反而增加漂移

**原始故障与修复证据。** `S01:L86` 浏览器工具真实报错 **`ElementResolutionError: Stale ref: @1; take a new snapshot`**；是执行错误，不是代理的猜测。迁移将操作集中到共同指南，历史任务与日期未改称 Ego 已重验。服务启动修正的实际工具结果 `S01:L723` 包括首次启动 `http:200`、重启保留其他项目服务、占用端口明确失败以及清理全部任务进程并释放 5173/5174。

**现状核对。** `.trellis/spec/frontend/browser-acceptance.md:13–16` 管理进程归属，`:77` 要求每轮重新设置视口/DPR/触摸，`:98` 明确 CDP→快照→交互顺序，`:122–126` 保存事件并核对实际加载版本；`AGENTS.md:30` 与 eh-test 指向同一通用指南。因此不建议把这些规则再次铺到各功能 quickstart，或另建浏览器工具替代层。

**最小建议/验证标准。** 维持条件指针，遇到新的可复现 API 变化只改权威指南对应步骤；现有验收流程负责验证，不另建重复验收。此次仅确认历史原始结果和现行文档，没有启动浏览器，不能保证当前浏览器版本运行效果。

**状态：已修复并集中维护。** 分类：导航、工具成本、文档重复。

### D06 · P3：Spec Kit 的流程缺陷与无效 hook 已修且框架已迁移，不应再列为当前待办

**历史证据。**

- `S07:L26` 实际读取旧 analyze 提示，声明只读却使用普通前置解析；主会话修正后，`S01:L721` 的实际分支检查包含 `missing-cache-env`、`different-cache-env`、`same-cache-env`、`cache-only`、`no-context`，均 `passed without writes`，还检测了缺失 spec/plan/tasks。无需重新建议发明只读 API，当时已有 `--paths-only` 可复用。
- `S09 = 01a0b35b-47fe-726f-9bf6-1bd87acd02d1:L18` 发现 clarify 正文第 8/9 步与新完成条件仍冲突；S10 是同一问题的增量复核，不能算新事件。最终主会话修复正文，保留零问题/无答案结束分支。
- `S01:L1491` 实际修改 16 项可选 commit hook 为 `enabled:false`，`:1492` 返回相应 diff。自动提交关闭与“是否提交”提示 hook 关闭是两个开关；这次已关闭提示，不能再建议用户重做。
- 重复 hooks 的抽取只是候选，最终保留各入口自包含协议：缺少共享分发/升级机制时新增抽象收益有限。S20/S21 对 workflows、assess、bug 的介绍是可选能力研究，没有实际 workflow 执行或额外安装导致事故的证据。

**现状核对。** 当前 `.specify/` 不存在，`.pi/prompts/` 仅有 `trellis-start.md`、`trellis-continue.md`、`trellis-finish-work.md`。旧 `.pi/speckit-maintenance.md` 也不存在。对原 hooks、旧脚本执行权限、Spec Kit 版本、workflow runs 忽略规则继续开修复项会针对已退出的系统。

**最小建议/验证标准。** 汇总报告只保留“修复过的历史问题/不用重复建设”，不安装旧扩展、不重新抽 hooks、不将旧提示文本拼入 AGENTS。只有当前真实使用的命令重现同一分支错误，才按其触发条件和文件副作用验证。

**状态：已修复，当前入口已被 Trellis 替代。** 分类：无效指令、已有能力、工具成本。

## 其他取证边界与不应重复造轮子的能力

- **已有文档检查资产**：S01:L1169/L1195 是可复用逻辑，S19:L15/L17 是版本一致性范式；不要包装成全新“AI 文档审查系统”。主代理先查 package/CI 是否已接入。
- **已有权威入口**：功能索引、决策文件、浏览器指南、eh-test、trellis-check 已存在。信息按需读取，不把依赖版本、所有历史改动或每个工具 API 固定灌入 AGENTS。
- **已有交接规则**：当前禁止子代理递归派发，主代理核对实际改动；D03 只针对运行时并发控制的待确认缺口，不建议再抄一遍协作纪律。
- **只读约束的历史偏离**：S05:L5 要求本轮禁止编辑文件，但 S05:L60 的实际 bash 参数使用 `> /tmp/pre.txt`、`> /tmp/post.txt`、`> /tmp/n.txt`，会写入通用临时文件，也不符合项目 `.tmp/` 归属。可证命令越界，不能证明破坏了用户数据。现行 AGENTS 已要求调试产物进仓库 `.tmp/`，不值得为这一条再加自然语言禁令；若主代理已有只读工具模式审计，可纳入样例。
- **不把用户对齐当浪费**：用户追问“文档优化是否全部完成”后，主会话明确区分确定性修正、决策记录、规格同步和实现验收；没有证据可将这些分阶段交付统称伪完成。真正需改进的是明确完成范围与可复核产物。
- **不把全量阅读量当问题本身**：用户明确要求全量文档审计，逐份阅读合理；应减少的是错误结果带来的重复审查和无关 bundle 输出，不能建议用只读标题替代本次用户要求。
- **当前 graft 边界**：本轮先按入口查询文档相关上下文，图只返回业务代码节点，未把它当全文档索引；随后直接核对未索引的配置/文档。工具报告节省约 2,282 tokens（1 次），这是工具估计，不作为整改收益估算。

## 向主代理交接

优先合并 D01（证据交付校验）、D02（复用文档检查）、D03（运行时限流待确认）。D04–D06 是历史已修复/已有能力，不应再次生成配置变更任务。七个分析维度中，导航和常驻指令的主要旧缺陷已被修复；本批没有证据支持继续增写 AGENTS 或安装更多框架。

本次未进行产品测试、浏览器操作、通知、平台运行时验证，也未检查其他 50 条会话。报告中的“通过”均明确归属于历史工具结果，不代表当前 HEAD 已通过。下一步（两分钟内）：主代理将 D01–D03 与 package/CI/运行时研究交叉去重，确认哪些能力已存在后再确定最终候选优先级。
