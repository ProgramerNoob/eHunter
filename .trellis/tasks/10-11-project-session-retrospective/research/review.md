# 最近八提交审查与修复链复盘（会话 28–58）

本分片最值得优先处理的是：把已经验证过的偏好迁移／重置生命周期探针保留为受版本管理的确定性回归入口，并让失败断言真正返回非零退出码。历史产品问题最终已修复；当前缺口主要在回归能力的保存与执行，而不是再补一段“认真测试”的常驻指令。

## 范围、证据与限制

- 活动任务经 `python3 ./.trellis/scripts/task.py current --source` 确认为 `.trellis/tasks/10-11-project-session-retrospective`；仅写本文件。
- 覆盖主代理分配的 **31/31 条 Pi 记录**：28 为主会话，29–58 为其 30 条子代理记录。33、34 被用户更换复审模型后取消，无最终结论；不能计为审查通过或失败。
- 这是一条用户工作链，而非 31 次独立事故。范围起点为 `2026-09-19T04:32:55.157Z`，主会话最后更新时间为 `2026-09-19T12:10:43.097Z`，均 UTC；不得把约 7 小时 38 分钟的会话跨度解释成纯执行耗时或模型耗时。
- 已逐条读取这 31 条记录中全部 user/assistant text；thinking 不纳入研究。工具按发现定点回看原始 JSONL。每条记录的原始文件见覆盖表，文中 `S28:L256` 指表中该会话原始 JSONL 第 256 行，不是导出 Markdown 行号。
- 清单来源为 `.tmp/retro-dialogues/review-manifest.json`，完整对话导出为 `.tmp/retro-dialogues/review-dialogue-only.md`。对有工具证据的发现，以原始 JSONL 工具参数／返回为准，不以 assistant 总结代替。
- 当前实现使用 graft 定位，检查了偏好恢复、同次 reset 身份、快捷项和跨 schema 合并的实际代码；检查了现行质量规范、对应决策、设置 quickstart、Trellis check 入口、受版本管理文件清单及 `.tmp` 忽略状态。package／CI／全局指导文件由主代理统一核实，本分片不重复广搜。
- 本轮没有运行产品测试、浏览器、构建、通知、task start 或其他代理；历史测试结果是历史证据，不等于当前运行结果。

## 会话覆盖表

| 编号 | 会话 ID（链接到原始 JSONL） | 主题／角色 | 是否发现问题／覆盖结论 | 原始行号 |
| --- | --- | --- | --- | --- |
| S28 | [01a0b7f0-5175-757e-b5aa-62c5f84f6dd9](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T04-32-55-157Z_01a0b7f0-5175-757e-b5aa-62c5f84f6dd9.jsonl:5) | 主会话：八提交审查→多轮修复→提交 | 是；五类起始问题、多轮独立复现；最终七组 230 项通过，提交 887c30e | 5、256、592、875、960 |
| S29 | [01a0b7f2-47a7-757e-b5aa-62c6f164bb07](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T04-35-03-720Z_01a0b7f2-47a7-757e-b5aa-62c6f164bb07.jsonl:6) | 初审 Standards | 是；布局未迁移、显式空快捷键丢失、done 阻断补缺 | 6、102 |
| S30 | [01a0b7f2-47b3-757e-b5aa-62c8623839b6](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T04-35-03-731Z_01a0b7f2-47b3-757e-b5aa-62c8623839b6.jsonl:6) | 初审 Spec | 是；迁移、GM 降级、范围校验、重置失败反馈 | 6、99 |
| S31 | [01a0b873-9d9d-757e-b5aa-62cb57996958](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T06-56-19-869Z_01a0b873-9d9d-757e-b5aa-62cb57996958.jsonl:6) | 首轮 core 修复 | 有；92 项通过后仍漏旧 schema／数值边界等组合；6 个初始夹具期望修正 | 6、89–93、108 |
| S32 | [01a0b873-9dab-757e-b5aa-62cc35aa894b](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T06-56-19-883Z_01a0b873-9dab-757e-b5aa-62cc35aa894b.jsonl:6) | 首轮 platform 修复 | 有；26 项绿、HEAD 9 项红；单侧故障的组合仍在后续暴露 | 6、54 |
| S33 | [01a0b884-706e-757e-b5aa-62cfc1abc318](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T07-14-42-414Z_01a0b884-706e-757e-b5aa-62cfc1abc318.jsonl:6) | 首轮 Standards 复审（取消） | 无最终结论；主会话按用户更换模型取消，不能计通过 | 6 |
| S34 | [01a0b884-7078-757e-b5aa-62d162cbdcf7](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T07-14-42-424Z_01a0b884-7078-757e-b5aa-62d162cbdcf7.jsonl:6) | 首轮 Spec 复审（取消） | 无最终结论；同上 | 6 |
| S35 | [01a0b887-c8ca-757e-b5aa-62d36418f3e3](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T07-18-21-642Z_01a0b887-c8ca-757e-b5aa-62d36418f3e3.jsonl:6) | 默认模型 Standards 复审 | 是；严格重置标记与数值业务边界 | 6、70 |
| S36 | [01a0b887-c8d8-757e-b5aa-62d44ebe7a0a](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T07-18-21-657Z_01a0b887-c8d8-757e-b5aa-62d44ebe7a0a.jsonl:6) | 默认模型 Spec 复审 | 是；四类剩余问题，后经主会话探针确认 | 6、85 |
| S37 | [01a0b893-ee2f-757e-b5aa-62d6f3f8ccce](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T07-31-37-647Z_01a0b893-ee2f-757e-b5aa-62d6f3f8ccce.jsonl:6) | 第二轮 core 修复 | 有；74 项绿，旧成功重置探针前提变化需拆分 | 6、130 |
| S38 | [01a0b893-ee3a-757e-b5aa-62d8db9183d0](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T07-31-37-658Z_01a0b893-ee3a-757e-b5aa-62d8db9183d0.jsonl:6) | 第二轮 platform 修复 | 有；27 项绿，建立页内一致降级与严格共享写 | 6、44 |
| S39 | [01a0b8a7-aca0-757e-b5aa-62db241ae041](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T07-53-11-584Z_01a0b8a7-aca0-757e-b5aa-62db241ae041.jsonl:6) | 第二轮 Standards 复审 | 未报新违规；冻结 hash／patch 一致，0 项 | 6、42 |
| S40 | [01a0b8a7-acac-757e-b5aa-62dd0dd6265b](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T07-53-11-596Z_01a0b8a7-acac-757e-b5aa-62dd0dd6265b.jsonl:6) | 第二轮 Spec 复审 | 是；重置后写失败复活旧值、坏本地尺寸使合法共享初始化抛错；探针无失败退出 | 6、43、46、53、62 |
| S41 | [01a0b8b3-185a-757e-b5aa-62dfeb5edfe1](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T08-05-40-058Z_01a0b8b3-185a-757e-b5aa-62dfeb5edfe1.jsonl:6) | 第三轮 reset 修复 | 有；19 项通过；后续整合发现无 GM 重置后新值被永久屏蔽 | 6、96 |
| S42 | [01a0b8b3-1863-757e-b5aa-62e125cc2664](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T08-05-40-067Z_01a0b8b3-1863-757e-b5aa-62e125cc2664.jsonl:6) | 第三轮 layout 修复 | 有；尺寸／schema 显式类型验证，51 项通过；报告曾重写旧 round2 结果 | 6、60 |
| S43 | [01a0b8b7-32f4-757e-b5aa-62e3b6bc0a12](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T08-10-09-012Z_01a0b8b7-32f4-757e-b5aa-62e3b6bc0a12.jsonl:6) | 第三轮本地重置后保存补修 | 有；16 项通过，使用 migratedAt 信任关系；后续多刷仍有缺口 | 6、187 |
| S44 | [01a0b8c7-e5ef-757e-b5aa-62e538666206](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T08-28-23-407Z_01a0b8c7-e5ef-757e-b5aa-62e538666206.jsonl:6) | 第三轮 Standards 复审 | 未报新违规；0 项，冻结一致 | 6、49 |
| S45 | [01a0b8c7-e5f9-757e-b5aa-62e7fd6b25a1](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T08-28-23-417Z_01a0b8c7-e5f9-757e-b5aa-62e7fd6b25a1.jsonl:6) | 第三轮 Spec 复审 | 是；新值刷新丢失、已见重置失效、坏 schema 中断初始化 | 6、43、64、77 |
| S46 | [01a0b8cf-a5b5-757e-b5aa-62e9819951a7](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T08-36-51-253Z_01a0b8cf-a5b5-757e-b5aa-62e9819951a7.jsonl:6) | 第三轮 followup 修复 | 有；时间戳归属方案；两条旧夹具失败未静默忽略；无 marker 路径后续仍失败 | 6、311 |
| S47 | [01a0b8e3-bd36-757e-b5aa-62eb816c00a2](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T08-58-47-990Z_01a0b8e3-bd36-757e-b5aa-62eb816c00a2.jsonl:6) | 无本地 marker 的观察记录补修 | 有；18 项新增、29 项旧回归通过；尚未解决时钟／恢复边界 | 6、72 |
| S48 | [01a0b8ed-e52c-757e-b5aa-62ec254e9bfa](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T09-09-53-580Z_01a0b8ed-e52c-757e-b5aa-62ec254e9bfa.jsonl:6) | 恢复与时钟 Spec 复审 | 是；真实 setter 复现 GM 恢复丢新值、回拨后旧值复活；探针无失败退出 | 6、44、49、80 |
| S49 | [01a0b8ed-e536-757e-b5aa-62eeca844ea5](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T09-09-53-590Z_01a0b8ed-e536-757e-b5aa-62eeca844ea5.jsonl:6) | 对应 Standards 复审 | 未报新违规；0 项，不含 Spec 结论 | 6、78 |
| S50 | [01a0b8f3-e554-757e-b5aa-62f10391d4b1](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T09-16-26-836Z_01a0b8f3-e554-757e-b5aa-62f10391d4b1.jsonl:6) | resetId 身份方案修复 | 有；44 项新探针通过；核实 7 处测试改动与 4 个旧夹具差异 | 6、408、417、458 |
| S51 | [01a0b911-7b43-757e-b5aa-62f2590d7999](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T09-48-45-763Z_01a0b911-7b43-757e-b5aa-62f2590d7999.jsonl:6) | 身份方案 Standards 复审 | 0 阻塞；重复 schema 校验函数为非阻塞维护建议 | 6、69 |
| S52 | [01a0b911-7b4d-757e-b5aa-62f494ffc91d](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T09-48-45-773Z_01a0b911-7b4d-757e-b5aa-62f494ffc91d.jsonl:6) | 身份方案 Spec 复审 | 是；共享非空仍缺项时不补同代 local，21 中 6 失败；旧四差异合理 | 6、65、70、86 |
| S53 | [01a0b917-31c0-757e-b5aa-62f6369315c4](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T09-55-00-161Z_01a0b917-31c0-757e-b5aa-62f6369315c4.jsonl:6) | 同代逐字段恢复修复 | 有；影子源码红 20/31、绿 31/31；后来快捷数组／混合 schema 仍漏 | 6、98 |
| S54 | [01a0b925-c63a-757e-b5aa-62f89f89bba1](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T10-10-55-674Z_01a0b925-c63a-757e-b5aa-62f89f89bba1.jsonl:6) | 逐字段恢复 Standards 复审 | 0 阻塞；保留重复函数建议 | 6、65 |
| S55 | [01a0b925-c644-757e-b5aa-62fae21b9857](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T10-10-55-684Z_01a0b925-c644-757e-b5aa-62fae21b9857.jsonl:6) | 逐字段恢复 Spec 复审 | 是；6 例中 5 例失败，归为快捷数组与重复 schema 迁移两项；探针无失败退出 | 6、58、61、71 |
| S56 | [01a0b92a-3a75-757e-b5aa-62fc3fb4306a](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T10-15-47-573Z_01a0b92a-3a75-757e-b5aa-62fc3fb4306a.jsonl:6) | 快捷项／快捷键两块修复 | 有；23 项红 9 失败→绿全过；仅 app.ts 两处 | 6、91、98、111 |
| S57 | [01a0b937-87a8-757e-b5aa-62ffb7427740](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T10-30-19-304Z_01a0b937-87a8-757e-b5aa-62ffb7427740.jsonl:6) | 最终 Standards 增量复审 | 0 新阻塞；保留既有非阻塞重复函数建议 | 6、27 |
| S58 | [01a0b937-87b2-757e-b5aa-6300107bf22b](/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-19T10-30-19-314Z_01a0b937-87b2-757e-b5aa-6300107bf22b.jsonl:6) | 最终 Spec 增量复审 | 0 finding；两项 P2 关闭，读取七组历史结果并核对冻结版本 | 6、59 |

## 按优先级排序的环境改进候选

### R1 · P1：保存并执行已有生命周期回归，避免每次依赖多轮人工发现同一状态空间的下一条边

**实际后果与原始证据**

1. `S28:L256` 是主会话真实源码探针输出：`volumeSize:0` 导致 `firstIndexIsNaN:true`；GM 仅读失败时新写 211 后读出旧 137；GM 仅写失败时重置实际 `{status:"success",reloads:1,sharedBlocked:false}`，期望失败且不刷新。初轮 92＋26＋10 的通过数没有覆盖这些组合。
2. `S40:L46、L53`：A 重置后 B 遇 GM 写失败，实际 `137/bottom/300`，期望 `80/left/150`；共享合法 200、本地尺寸 `{toString:1}` 时修复版抛 `TypeError: Cannot convert object to primitive value`，HEAD 对照正常。这既有漏项，也有补丁新引入的初始化回归。
3. `S45:L64`：真实保存的新 `211/bottom/260` 刷新后丢为 `80/left/150`；已观察重置后下一次 GM 读失败又读回旧布局 `bottom/300`；损坏统一设置 schema 仍可让 `Number` 抛错。不能把“尺寸安全转换已修”当作全部同类字段已覆盖。
4. `S28:L592`：B 没有本地 migration marker、但已存 reset-observation 时，第一刷 `left/150`，第二刷 GM 失败恢复 `bottom/300`。观察记录落盘并不代表所有读取入口会使用它。
5. `S48:L49`：GM 恢复后真实新值 `137/bottom/260` 被拒为默认；系统时钟回拨后重置前 `211/bottom/275` 被当新值放行。旧方案用写入时间与观察时间比较来推断因果归属，墙钟不保证这个关系。
6. `S52:L70`：引入 resetId 后，GM 恢复且共享记录存在但缺项、非法或坏 JSON 时，6 条探针仍得到 80 而非同代本地 137。`S55:L61` 又确认非法快捷项数组挡住本地补缺、共享 schema2 把本地 schema3 的 `Escape/~` 再转为 `q/t`。

这些证据应归为同一迁移／恢复链的递进修复，不按审查轮数重复计频。机制是多来源优先级、故障通道、重置身份、刷新、逐字段合法性与 schema 迁移的组合，早期局部修复和各自为绿的模块测试没有覆盖完整转换。

**历史收口与现行核实**

- `S28:L875` 的主会话工具输出明确列出七组结果：23＋31＋21＋44＋74＋27＋10＝**230**，各组 `exit:0`、`failed:0`；`S28:L877` 显示类型诊断 `previous_errors:22,current_errors:22,unchanged:true`。本报告不把旧类型错误作为这次回归。
- `S28:L957–L960` 记录提交 `887c30ef111f7b33415784a98ff35096089168f9`，只提交 `core/model/layout.ts`、`core/store/app.ts`、`core/store/layoutPreference.ts`、`src/platform/base/service/PlatformService.js`；没有回归脚本。
- 当前 `core/store/app.ts:880` 的关键接受条件仍为 `currentId !== null && raw.resetId === currentId`；`core/store/app.ts:920` 允许同代本地补共享坏记录；`core/store/app.ts:1280` 按各来源归一化后逐字段合并、返回当前 schema；`core/store/layoutPreference.ts:175` 按模式处理本地副本。已核到历史修复仍存在，未宣称现在仍有上述产品 bug。
- `git ls-files` 没有这批回归，也没有 `.test.ts/.spec.ts/.test.js/.test.cjs/.spec.js` 用例；`git check-ignore .tmp/fix-review-last8/round3-quick-shortcut-spec-probe.cjs` 返回该路径。当前 `.trellis/spec/frontend/quality-guidelines.md:47` 明确没有根 automated test script 或 unit/E2E runner。
- 现行 `.trellis/spec/frontend/features/002-more-settings-modal/quickstart.md:27` 已有共享／降级／恢复／重置矩阵，决策 `.trellis/spec/frontend/decisions/2026-09-18-reader-behavior.md:42` 已明确优先级和防旧副本复活。不是缺少原则规范。

**最小建议**

从现存真实源码 VM 夹具与最终七组用例中整理一个小的、受 Git 管理的 Node 回归入口，先复用现有转译依赖和真实模块加载方式，不引入浏览器测试框架。保留有区分力的场景：GM 仅读坏／仅写坏／双坏／恢复、A reset→B 保存→连续刷新、只保存一个 key／一个 mode、同代／异代副本、缺失／损坏／越界字段、混合 schema、同毫秒重置与时钟回拨。将该入口接到项目已有检查流程；具体 package／CI 连接由主代理核实后选择。

**检查类型与验收**：确定性回归。干净 checkout 能运行；各个原始故障或定点回退至少有一个用例失败；最后修复版通过；失败输出给出场景名、实际／期望和非零退出码；重复运行不依赖 `.tmp` 中上一轮产物，也不操作用户浏览器存储。

**状态**：历史产品缺陷已修；回归未进入版本管理与标准执行入口的缺口仍存。优先级 P1 指环境改进价值，不是当前线上漏洞等级。

### R2 · P2：观察型探针输出失败仍正常退出，不能直接充当自动门禁

**证据与后果**

- `S40:L43` 创建的 `round2-spec-lifecycle.cjs` 只打印并写 JSON，没有 `assert` 或 `process.exit`；`S40:L46、L53` 已含多个 `pass:false`。
- `S48:L44` 创建 `round3-final-review-spec-recovery.cjs`，结尾只有写文件和 `console.log`；`S48:L49` 输出 8 项中 3 项失败，toolResult 的 `isError:false`。
- `S52:L65` 创建的 `round3-identity-review-spec.cjs` 同样无失败退出逻辑；`S52:L70` 有 6 个 `pass:false` 且 `isError:false`。
- `S55:L58` 的 `round3-final-spec-probe-20260918.cjs` 只记录 `matchesContract`，`S55:L61` 的 6 项中 5 项为 false。
- 现存文件仍可读，结尾分别位于 `.tmp/fix-review-last8/round2-spec-lifecycle.cjs:36`、`.tmp/fix-review-last8/round3-final-review-spec-recovery.cjs:49`、`.tmp/fix-review-last8/round3-identity-review-spec.cjs:54`、`.tmp/fix-review-last8/round3-final-spec-probe-20260918.cjs:30`。本轮静态确认，没有重跑。

已发生的后果是工具“命令成功”与断言失败同时存在，必须人工解析结果；这次审查代理确实识别并上报了失败，不能称其虚报通过。风险在于未来把这些脚本原样接入 `&&` 或 CI，会得到伪绿。

**最小建议**：与 R1 一起复用 Node `assert` 或 `node:test`，或者先对现有 `failed/matchesContract/pass` 统一汇总并设退出码；只处理确实用于门禁的脚本，纯诊断观察输出明确标注。不要新增“看到红字要注意”的 AGENTS 规则。

**检查类型与验收**：确定性检查。故意让一条期望不匹配时命令必须非零；全部满足时为零；脚本抛异常也非零。输出目录用本次运行目录，避免 `wx` 已有文件错误与行为失败混为一谈。

**状态**：这些历史诊断脚本的缺口仍存；正式门禁尚不存在，与 R1 合并实施即可。已有更好的例子是 `S45:L43` 创建的探针末尾 `if(report.failed)process.exitCode=1`，无需重新发明结果协议。

### R3 · P2：把“修改测试期望／故障输入”作为独立审查证据，区分合理修夹具与覆盖变弱

**逐项核查，未证实用弱断言掩盖最终产品缺陷**

- `S31:L89–L93`：首轮 6 个失败后改测试。原始 edit 证明其中包括把错误的 `app2.store.lang` 改为 `f2.lang.value`；把已有合法 `readingMode` 会触发写入的场景改查持久化内容；把 fixture 实际 `bottom/200` 对齐到期望。不能只凭“改了期望”定性作弊。
- `S37:L130` 自述旧探针前提已失效；原始创建代码 `S28:L253` 证实：同一 GM 写失败场景先断言 reset 应失败，随后无条件要求另一站旧值不可见，后一个期望没有建立成功重置的前提。主会话后来拆分失败 reset 与成功 reset；`S28:L330` 记录新集成 9 项与原集成 10 项结果。原失败产物继续保留，不能把这一处改期望本身当作掩盖回归。
- `S50:L408` 原始输出 38 项中 6 失败；`S50:L417` 原始 edit **实际移除了三处 reload 的 `gmThrows:true`**，将双故障改为只写坏。这是场景变窄，应在证据中显式标注。同时 edit 把非法 999 改为合法 277、把正常 GM 写结果从 local 改查 shared，并新增“健康写后 GM 双坏不得读回旧副本”及真实降级保存后恢复的对照；不能隐去这些补偿而指控其单纯削弱测试。
- `S46:L311` 报两条无 `updatedAt` 夹具失败，后续 `S48:L44、L49` 的独立源码探针用真实 setter 对照，两条对应降级恢复通过，同时另揭示 GM 恢复与回拨的真实缺陷。
- resetId 改造后，旧夹具 spread marker 只改 `migratedAt` 保留 `resetId`，不等于真实新 reset；`S52:L65、L70` 的独立探针验证真实两次 reset、新旧 ID 与旧无 ID 标记轮换。这四项旧差异最终被独立核验为合理变化，不应当作仍存回归。

**实际成本与当前能力**

多轮需要主会话与独立审查额外判断“失败是旧夹具假设还是新 bug”，通过总数并不能回答。现行 `.pi/agents/trellis-check.md:54` 已要求检查 missing/weak tests；现有冻结 patch＋源码 hash＋独立探针已发挥作用，原则无需再重复写入 AGENTS。

**最小建议**：在任务验收资料里保留一张很小的用例变更表：稳定场景 ID、旧输入／旧期望、新输入／新期望、契约依据、替代场景、原红结果路径。故障开关减少、断言删除、期望改写应呈现给审查者；根据规范与真实 setter 判断是否合理，不能机械禁止改测试，也不能以代码当前行为作为唯一预期。

**检查类型与验收**：测试文件纳入 Git 后，diff 和结果不可覆盖是机械保障；测试语义是否合理是判断准则。任取一个修正夹具的案例，审查者能在两分钟内判断原场景是否仍受覆盖、为何改变；旧失败产物继续可查。

**状态**：历史中已有独立核验和新增替代场景；没有证据支持“最终断言被改弱掩盖 bug”。仍可改进的是把这套有效做法从长对话与临时文件收成稳定、精简的交付字段。

### R4 · P3：沿用已成功的冻结增量复审，降低反复全范围探索成本

**证据与边界**

- `S54:L6`、`S55:L6` 的派发仍要求原八提交及累计补丁；`S57:L6`、`S58:L6` 后来明确比较 `round3-field-recovery-frozen.patch` 与 `round3-quick-shortcut-frozen.patch`，重点为 app.ts 两个 block 及其调用契约。
- `S57:L27`、`S58:L59` 记录两个 P2 关闭，冻结 diff／源码／生产包匹配，上一轮重复函数建议保持非阻塞。这里是审查结论数据，不是独立运行测试证据；通过数的工具证据另见 `S28:L875`。
- manifest 显示 S54/S55 分别有 40/49 个 toolResult，S57/S58 为 17/34。范围变小是主要混杂因素，**不能据此计算固定节省率，更不能归因模型**。
- 本分片合计 2,332 次工具调用、8,423,245 个 toolResult 文本字符，是此链工作规模指标；不是 token、费用或可节省预算。

**最小建议**：继续复用已经采用的“上一冻结版＋本轮 diff＋受影响契约＋原失败场景”派发。状态／schema／跨层调用改变时扩大到相关累计链；只有两处局部修复时沿用已有全范围结论。保留正式审查前停止写入、哈希固定的现行规则，不另造审查框架。

**检查类型与验收**：主要是范围判断，哈希一致是确定性保障。审查输入能直接说明本轮改了哪两个块、涉及哪些契约、哪些历史结论继续有效；不得把增量复审冒充全新独立全量验证。

**状态**：历史后期已采纳的有效做法；属可选运行优化，不作为当前阻塞缺口。

## 已有能力，不应重新包装成建设建议

1. **规格和矩阵已存在**：现行决策第 3 节及设置 quickstart 已覆盖共享合法优先、逐项补缺、origin 降级、恢复、重置。需要补执行性的组合回归，不需要再写一套同义规则。
2. **真实源码 VM 夹具已存在**：历史 `integrated-run.cjs` 连接真实 core/layout/platform；后续独立探针复用其 prefix，故障注入及真实 setter 都已有实例。可以整理后复用，无须镜像业务实现或引入完整 E2E 框架。
3. **独立 Standards / Spec、停止写入与冻结 SHA 已存在并有效**：不能因为 Standards 多次 0 问题、Spec 后来仍发现 bug 就断言 Standards 失职；两轴职责不同。单份泛化 smell checklist 不能替代状态转换测试。
4. **红／绿证据和基线对照已出现**：例如 `S56:L91、L98` 23 项由 9 失败变为 0 失败；`S28:L875` 主会话独立复跑七组。这些应保留成可执行资产，而不是建议“开始测试”。
5. **类型基线比较已有**：`S28:L877` 明确 22→22 且内容相同。是否需要清理当前类型债由主代理统一核查，不把历史错误数量包装成本补丁的新问题。
6. **浏览器限制有明确披露**：主会话对 EH 缺 viewport 时实际 CSS 宽 980、真实多站 GM 故障未验、NH 未完整实站验证均有记录。这里没有证据支持把模拟视口通过扩大成物理手机或跨站故障通过；本轮也不重测这些范围。

## 最有价值的六条结论

1. 31 条记录是一条审查修复链；所有递进问题必须归并，不能当作模型在 31 个独立任务中反复失败。
2. 修复循环的可证实根因是遗漏状态转换组合：模块绿、初始化绿，并不能推出跨 origin＋GM 故障＋真实保存＋多次刷新正确；时间戳也不能代表重置因果身份。
3. 最优先环境改进是保存最终真实源码回归并提供统一命令。产品补丁已进入 Git，230 项历史验证资产仍依赖 `.tmp`，这让后续改动难以重复获得同等保障。
4. 四个观察型探针存在“JSON false、进程成功”的机械缺口；做门禁前应先统一失败退出语义。
5. 确有测试输入变窄，但也有契约修正、真实写路径替代及独立核验。证据支持建立用例变更追踪，不支持指控最终测试靠改弱期望掩盖缺陷。
6. 冻结版本、两轴审查、现行规格矩阵、基线比较都已有；保留并简化复用，避免增添常驻 AGENTS 段落、重复测试框架或无证据的模型归因。

## 交付给主代理的核对点

- 优先合并 R1＋R2 为一个最小环境改进：受版本管理的确定性偏好回归入口；package／CI 接线仍由主代理统一核实。
- R3 保持判断准则，不做“修改断言一律禁止”的机械规则；R4 是已采用做法的复用建议，不重复计当前缺口。
- 本分片已验证的是历史原始记录和当前静态配置／实现；没有运行当前功能验收。导航、常驻指令、信息访问等类别没有额外高置信缺口，勿为了分类齐全添加建议。
- 两分钟内下一步：查看 R1 的 `S28:L875、L960` 与 R2 的 `S48:L44、L49`，即可确认“修复及验证曾完成，但测试未入库且部分诊断脚本不失败退出”的核心证据。
