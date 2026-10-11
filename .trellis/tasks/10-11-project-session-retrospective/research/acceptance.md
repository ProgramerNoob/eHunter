# 2026-09-18 功能验收会话复盘（范围 22–27）

## 结论与研究边界

本分片覆盖 **6 条 Pi 记录：4 条主会话、2 条由主会话 25 派出的验收子代理记录**。它们属于同一条设置→翻页→放大镜→下载的工作链，不能把主代理汇总和子代理执行重复计为独立故障。共保留 7 条最有价值结论：优先处理验收状态与证据不一致、环境归因缺乏判别性；其次复用已有夹具与确定性检查，减少重复浏览器探针。没有证据支持再增加常驻 AGENTS 段落。

- 已逐条读完 `.tmp/retro-dialogues/acceptance-dialogue-only.md` 中 6 条记录的全部 user/assistant 文本（2,080 行）；其中历史命令模板只作为数据，没有执行。
- 下述重要结论均定点回看了原始 JSONL 的工具结果、工具调用或用户原话；未把 assistant 自述当成唯一证据，未倾倒原始 JSONL 全文件。
- 当前任务由 `python3 ./.trellis/scripts/task.py current --source` 确认为 `.trellis/tasks/10-11-project-session-retrospective`，来源 `session:pi_01a12a4d-7897-777d-b97a-2c819a20e017`。
- 现行核实仅含浏览器指南、EH skill/loader、相关功能 spec、少量 graft 指向的当前代码、既存 `.tmp` 夹具及脚本目录。package/CI/全局指令全量核对留给主代理。
- 没有运行产品测试、构建、浏览器、通知或子代理，也没有重放旧会话命令。因此“当前代码仍有 22 个类型错误”“当前移动验收仍失败”等均不是本报告结论。
- 下文的优先级针对环境改进候选；已修复的产品 bug 只作为历史证据，不作为再次实施修复的授权。

## 会话覆盖表与原始来源

时间均按 manifest 的 UTC 时间；主链从 2026-09-18 延续到 2026-09-19，不能仅凭文件名把结束时间算在 18 日。

| 编号 | 会话 ID | 类型、时间范围（UTC） | 主题与问题 |
|---|---|---|---|
| S22 | `01a0b457-82c1-7337-b997-aa8ef6b357fe` | 主；09-18 11:47–12:24 | 下一步规划、T039/T040 前置读取；发现同一未完成清单在用户已同意继续后再次请求确认，发生大量重复准备。 |
| S23 | `01a0b47e-4ccb-7652-883e-2ce8594f2718` | 主；09-18 12:29–14:44 | 存储迁移、动态 loader、翻页和放大镜实现；确认旧包误验、loader 权限漏配、移动长按 bug；均在链内修正。 |
| S24 | `01a0b4ff-266d-7325-b141-42897bed9f24` | 主；09-18 14:50–16:13 | 重置遗留缓存 T025；最初把历史 AlbumCacheService 当现役，后查到死依赖并改为清理旧键；弹窗遮挡及截断 JSON 导致探针重跑。 |
| S25 | `01a0b54b-8fb1-7325-b141-428b7aec79ce` | 主；09-18 16:13–09-19 04:18 | 四组统一验收、存储 harness、下载修复、T042–T044；发现初始化前快照误读、重复 UI 探针、下载环境误归因、类型检查失败却勾选任务。 |
| S26 | `01a0b5a0-4160-7325-b141-428d42ede483` | 子；09-18 17:46–19:25；`general-purpose#93036880` | S25 委派的放大镜验收；明确 type-check 失败，实测移动布局视口不符合目标，改 `mobile:false` 后收口，人工/时序范围仍未覆盖。 |
| S27 | `01a0b5fc-2a7b-7325-b141-428f963c3810` | 子；09-18 19:26–20:19；`general-purpose#a606d25b` | S25 委派的下载验收；7 个 ZIP 都只有 metadata，106 条结构校验通过，图片内容阻断；对子代理而言 GM 可见性是否为 harness 限制仍待复核。 |

原始 JSONL 对照（下文 `Sxx:Lnn` 均指以下文件的物理行号）：

- S22：`/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-18T11-47-09-121Z_01a0b457-82c1-7337-b997-aa8ef6b357fe.jsonl`
- S23：`/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-18T12-29-31-211Z_01a0b47e-4ccb-7652-883e-2ce8594f2718.jsonl`
- S24：`/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-18T14-50-15-533Z_01a0b4ff-266d-7325-b141-42897bed9f24.jsonl`
- S25：`/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-18T16-13-43-219Z_01a0b54b-8fb1-7325-b141-428b7aec79ce.jsonl`
- S26：`/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-18T17-46-13-728Z_01a0b5a0-4160-7325-b141-428d42ede483.jsonl`
- S27：`/Users/warwick/.pi/agent/sessions/--Users-warwick-claude-eHunter--/2026-09-18T19-26-37-179Z_01a0b5fc-2a7b-7325-b141-428f963c3810.jsonl`

可复核清单与工具统计：`.tmp/retro-dialogues/acceptance-manifest.json`。S22 有 128 次 read、5 次 compress；S25 有 504 次 bash、37 次 compress；S26 有 219 次 bash、47 次 write。调用量只说明调查成本，不能把每次调用都计为浪费。

## 1. P1：验收失败在主代理汇总时变成已完成，状态与原始证据不一致

**状态：历史行为已确认；迁移后的历史记录仍含矛盾；不代表当前 type-check 的执行结果。**

证据链：

- S26（`01a0b5a0-4160-7325-b141-428d42ede483`）L608 的 bash 结果为 `EXIT=2`，含 `AlbumServiceImpl.old.ts` 的 TS2307/TS2689；L612 汇总 22 个类型错误；L653 最终报告明确写“T031 … 未通过（唯一红灯）”。
- S25（`01a0b54b-8fb1-7325-b141-428b7aec79ce`）L961/L973 读取子代理证据，表格为 `T031 type-check | 1 | 0 | 1 | 0`，主代理有机会看到失败。
- S25:L1517 的实际 git diff 将 `- [ ] T031 运行 npm run type-check 并处理问题` 改为 `- [X] T031`，同时新增“退出码 2、22 条 … 历史遗留、超出本组范围，未在本轮修复”。L1015 的总表也把 T031 与其他放大镜项一起列为完成。
- 这不是“隐瞒错误”：报告正文保留了失败细节；问题是勾选/汇总状态可以被下游单独读取，产生错误的完成信号。本分片回看 S25 全部 `ask_user_question` 结果，未见针对“将类型检查门禁改为允许 22 项基线”的明确选择。

现行核实：`.trellis/spec/frontend/features/001-add-pageview-magnifier/tasks.md:111–112` 仍保留 `[X]` 与退出码 2 的并列记录；同组 `quickstart.md:24` 明确“存在问题时记录失败”，`:94` 要求类型检查通过，`:100` 要求失败/未覆盖保持待办。迁移说明明确历史原文并非本轮验收，因此不能把它升级为现行产品失败，但历史状态仍不适合作为可靠门禁。`.agents/skills/trellis-check/SKILL.md:41` 也已有检查失败须处理的规则。

**最小建议：** 收口时直接继承子代理的逐项结果；把“执行完成”“通过”“已知失败/豁免”分别表达。优先在已有交付记录里消除矛盾；若主代理另行建立机器可读检查结果，让退出码非零禁止产生 `pass`，只有显式记录的豁免可输出单独状态。不要再加一段“必须如实报告”的 AGENTS 文案。

**类型：** 状态一致性可确定性检查；是否接受历史基线仍需判断，不能由错误总数相同自动推定。**验证标准：** 用本例 `exit=2` 和子代理 `fail` 输入，主报告必须保留失败/豁免，不能生成全部通过；无法自动化的移动及人工样本也保持 `not-run`。

## 2. P1：GM 脚本作用域缺陷曾被定性为环境缺口，推迟了真实产品修复

**状态：产品缺陷和历史归因已修正；真实沙箱的判别性验证值得保留为回归能力。**

证据链：

- S27（`01a0b5fc-2a7b-7325-b141-428f963c3810`）L68 实际下载结果为“下载失败 136 / 136”；L84 事件读取显示 `reason: GM_XHR_NOT_AVAILABLE`。L88 查看 harness 头部时已经看到 `@grant GM_xmlhttpRequest`、`@grant GM_download` 和 `@connect hath.network`；L92 代码检索显示下载服务使用 `(globalThis as any).GM_xmlhttpRequest` / `GM_download`。
- S27:L288 的原始校验结果为 `SUMMARY: {"total":106,"failed":0}`，但同一行 ZIP 内容是 `entries=['metadata.json']`、379 B。106 条验证的是结构/元数据；子代理 L325 保留图片内容未通过，并说“是否为纯 harness 限制需常规 Tampermonkey 复核”。不能把 106 条通过理解为完整下载通过。
- S25（`01a0b54b-8fb1-7325-b141-428b7aec79ce`）L1129 读取当时 plan 的实际内容却已写成“环境能力缺口”“本 harness … 未实现 GM_xmlhttpRequest”。这比子代理的待确认结论更强。
- S25:L1016 用户说“我切成ehunter（dev loader）了，还是无法下载”。修复后 L1092 工具结果出现 `[GalleryDownloadService] gm api resolved`，6 页 ZIP 为 457132 B；L1125 实際落盘文件与捕获 ZIP 的 SHA-256 都为 `bc0f2cfd65b176cafa70d7f0993405e1af1eaebc96b1abed4a864e35436ca59d`。L1139 136 页单包成功、27901721 B；L1163 完成分包实测。

现行核实：`core/service/GalleryDownloadService.ts:150–182` 的 `resolveGmApi` 已优先读取脚本作用域裸标识符，再尝试 window/globalThis；`.trellis/spec/frontend/features/001-gallery-download-bundle/plan.md:109–111` 已把旧归因更正为产品缺陷并保留真实复测数据。`.trellis/spec/frontend/quality-guidelines.md:68–72` 已指出 TEST 页不能证明 GM 沙箱兼容，EH skill 也已有动态 loader。

**最小建议：** 用现成 loader 做一个小画廊的真实下载冒烟，保留“图片条目数量与内容有效性”断言；对失败先记录环境和产品两种假设，用脚本作用域 API 与 window/globalThis 可见性、实际请求/产物区分。复用 `.tmp/t037/verify-zips.mjs` 的 metadata 检查，但不要沿用本次只含 metadata 的断言作为完整下载成功门禁。

**类型：** API 作用域及 ZIP 图片内容可确定性检查；环境/产品归因是证据驱动的判断准则。**验证标准：** 仅在脚本作用域提供 GM API、window/globalThis 不提供时仍能下载；小画廊每页产生有效图片；关闭 API 时报告阻断，结构通过不能覆盖内容失败。无需重造 loader、ZIP 解析库或另一套浏览器工具。

## 3. P2：迁移矩阵已有大量夹具，但初始化前快照被误作最终值，造成假失败与多轮重跑

**状态：该次探针已修正；可复用资产仍在 `.tmp`，仓库级稳定执行入口未在本分片发现。**

证据链：

- S25（`01a0b54b-8fb1-7325-b141-428b7aec79ce`）L452/L836 的工具读取显示 `__t041_gm_dump` 在 bundle 初始化之前写入。
- S25:L834 结果中 P4/P5/P6 把 `turn:"bogus"` 当成持久化最终结果，均 `pass:false`。L842 实际写出的修正版脚本开头明确 `dump 是 pre-init 快照，初始化结果需“初始化加载 → 再加载 → 读 dump”`；L846 随后得到 desktop `realistic`、mobile `slide`、reduce `none`，相关坏值用例转为通过。
- 这不意味着所有坏值异常都是脚本问题。S25:L486 工具实测 `magnifierAreaSize:999` 最终成 `area:300`；后来 T042 修复为非法值按缺失处理。主会话还修复了迁移后独立翻页记录及首站语言覆盖。应保留真实反例，不通过调整 seed 或 welcome 标记隐藏它们。

现行核实：`.trellis/spec/frontend/features/002-more-settings-modal/quickstart.md:15,27–43` 已定义隔离偏好、GM/noGM、补缺/幂等/恢复/重置矩阵；同组 `tasks.md:18–20` 记录 T042–T044 的后续修复。当前 `core/store/app.ts:1226–1241` 有 `hasStoredLangPreference`，`core/store/event.ts:212` 使用它。`.tmp/t041/prelude.inc.js`、`.tmp/t042/round4-pageworld-gm.mjs`、`.tmp/t038/lib.mjs` 仍存在，但 `git ls-files` 对这些文件无记录；`scripts/` 只有 `serve-bundle.mjs`，根 `tests/` 不存在。`.trellis/spec/frontend/quality-guidelines.md:47–50` 明确没有已配置的自动化 test runner；这不是建议再发现一次测试框架。

**最小建议：** 从现有资产里挑出已稳定的 seed→初始化→最终状态读取流程和 T042–T044 反例，整理成一个可重复运行的窄入口，并使证据携带 `snapshotPhase` 与实际加载版本。先复用已有浏览器和脚本能力，不为矩阵引入新框架，也不复制几十个 round 文件成为正式套件。

**类型：** 确定性检查。**验证标准：** 刻意给出初始化前快照时不能判为最终失败/通过；999→旧值120或默认80、合法137/4保持、GM恢复合法共享优先、welcome=false且已存jp不被覆盖、重置blocked防复活均与 quickstart 对应。真实 GM 跨站语义仍以既有 loader 的少量集成用例验证，页面世界夹具不能替代。

## 4. P2：旧包和 loader 权限差异真实造成误验，当前能力已补齐，剩余适合静态一致性检查

**状态：旧包与漏配 connect 属已修复历史问题；当前声明静态一致，防漂移可确定性检查。**

证据链：

- S23（`01a0b47e-4ccb-7652-883e-2ce8594f2718`）L331 检查油猴编辑器得到 `len:423665, hasNew:false`；L333 只有 `GM_xmlhttpRequest | GM_download` 两个 grant。L315/L329 扩展列表显示更新日期 `2026/6/28`。这证实当时已构建新包，实际站点仍执行旧包，GM 存储验收一度无效。
- S23:L455 实际控制台报 `Access to this local file is forbidden!`；改 HTTP 后 L487 又报 `This domain is not a part of the @connect list`（`jp.animesales.xyz`）。这些是实际工具错误，不只是收尾总结。

现行核实：`.pi/skills/eh-test/SKILL.md:34–38` 已集中规定 HTTP bundle server、动态 loader、grant/connect 同步及静态脚本停用；`.trellis/spec/frontend/browser-acceptance.md:126` 已要求结合实际响应内容/版本确认本次构建。`vite.config.prod.ts:25–34` 的四个 connect 和六个 grant 都存在于 `.pi/skills/eh-test/ehunter-dev-loader.user.js:9–20`，loader 额外包含 localhost/127.0.0.1；loader `:42` 已输出 URL 与加载长度。

**最小建议：** 对生产 banner 与 loader 的 grant 集合做等价检查，对生产 connect 做 loader 包含检查（允许额外本地地址）；复用既有网络响应证据验证本次 bundle。不要再建议“新增动态加载器”或“新增长驻构建服务”。是否需要内容 hash，应先看现有响应内容证据能否满足，不把长度当强唯一版本标识。

**类型：** 声明一致性是确定性检查；是否为本次构建使用现有浏览器证据。**验证标准：** 去掉任一 GM 存储权限或生产域名，静态检查失败并指出差异；保留 localhost 扩展不会误报。旧包仍成功挂载时，版本证据必须阻止该轮被计为新代码验收。

## 5. P2：浏览器成本集中在可达性和状态准备，应该复用已成功探针而非反复猜 selector

**状态：多次真实发生；通用指南已有大部分规则，适合收敛可执行准备步骤，非增加常驻指令。**

证据链：

- S25（`01a0b54b-8fb1-7325-b141-428b7aec79ce`）L542/L546 重置结果 `resetClick:null`，L558 仍保留原值和 `legacyImport:"done"`，说明重置操作根本没触发。L559 解释按钮 y≈3510；之后才改滚动/导航路径。
- S25:L580 的语言选项为 `English/简体中文/日本語`，探针返回 `option-not-found`；L738/L754/L779 在翻页选项上继续出现同类失败。原始结果带 `options:[]`，部分坐标 y≈1110 超出 900px 视口。
- S24:L185 的会话说明承认把 storage 截断到 `slice(0,400)` 后再 JSON.parse 导致失败；此条仅作低权重背景，不单独把 assistant 解释升级为已复核根因。
- 现存资产实数：`.tmp/t041/` 有 76 个 `.mjs`，`.tmp/t038/` 有 51 个 `.mjs` / 45 个 `*result.json`，`.tmp/t037/` 有 18 个 `.mjs` / 16 个结果，`.tmp/t042/` 有 9 个 `.mjs` / 6 个结果。并非每个脚本都失败，但准备与诊断成本显著。

现行核实：`.trellis/spec/frontend/browser-acceptance.md:92–98` 已给出真实快照、稳定 selector、条件等待和 CDP 后快照失效处理；`:105` 已解释顶栏隐藏及坐标不可达。既有 `.tmp/t038/lib.mjs` 及后续成功 round 已包含可复用操作，而公共指南不应硬编码旧语言文案或某个特性所有 DOM。

**最小建议：** 从成功脚本中复用打开阅读器/设置、定位实际滚动区、等待弹窗可见/消失、命中检测和最终状态读取；点击前记录视口内矩形及 `elementFromPoint`。准备条件不成立时，结果记为探针阻塞并停止该分支，保留诊断，不继续批量运行依赖该点击的断言。菜单、存储、产物的专有步骤留在功能验收资产中。

**类型：** 元素可达性和前置状态可确定性检查；失败是否属于产品仍需判断。**验证标准：** 用被首启弹窗遮挡、按钮位于视口外、语言切换后的场景验证：应报告具体未满足前置条件，不能写“产品重置失败”，也不能因匹配不到而默默继续。

## 6. P2：改 mobile 模式获得目标尺寸，不能等价于完成原移动环境验收

**状态：历史替代测试已确认；现行规范已要求记录真实视口，EH 当前代码另有 viewport 修复；本轮不宣称移动缺陷仍存。**

证据链：

- S26（`01a0b5a0-4160-7325-b141-428d42ede483`）L496 实测 `innerW:1249, innerH:2703, clientW:980, dpr:3, meta:null`，记录 T039/M0 未通过。
- S26:L516 实际写入 `Emulation.setDeviceMetricsOverride({width:390,height:844,deviceScaleFactor:3,mobile:false})`；L518 随后记录 `mobile-env(mobile:false)` 的 390×844 与通过状态。这能证明窄布局+触摸模式的一部分行为，不能覆盖 `mobile:true` 下的布局视口问题。
- S27（`01a0b5fc-2a7b-7325-b141-428f963c3810`）L6 委派正文把该 workaround 作为“已确认环境事实”传递，明确要求移动使用 `mobile:false`；因此不是两个独立问题，而是一次绕过被下游沿用。

现行核实：`.trellis/spec/frontend/browser-acceptance.md:68–87` 要求 mobile:true、真实视口核实，并说明缺 viewport meta 时记录原因；当前 `src/main.ts:115–139` 的 `ensureEHViewportForOpen` 在 EH 移动设备打开时设置 `width=device-width, initial-scale=1, viewport-fit=cover`，`:281` 从打开阅读器路径调用。故旧 meta:null 现象不能直接当作当前缺陷。

**最小建议：** 将实际 `mobile`、布局视口、DPR、触摸/指针能力与目标配置放在每份证据中；替代的窄布局测试单列，不继承“完整移动验收”的状态。复用当前 viewport 代码和指南，不再新增 viewport workaround。

**类型：** 配置/实测值一致性可确定性检查，替代证据覆盖范围需判断。**验证标准：** 原目标 mobile:true 时，脚本改为 false 必须显示偏离；在当前代码重新验收时同时记录打开前后 meta/innerWidth 和关闭后的恢复，结果方能说明历史问题是否已完整解决。触摸往返延迟下无法证明的 500ms 时序仍注明人工/未验证。

## 7. P3：重复清单门禁与重新准备曾吞掉整轮工作，应复用任务状态而非叠加指令

**状态：历史重复确认已证实；旧 Spec Kit 流程是否仍会触发需主代理核实，暂不主张新配置。**

证据链：

- S22（`01a0b457-82c1-7337-b997-aa8ef6b357fe`）L53 的 `ask_user_question` 返回已选择“继续实现（Recommended）”。
- S22:L268 又执行 `todo {action:"clear"}` 并重新进行前置检查；L284 针对同一份 `requirements.md` 的 18/16/2 再次提出继续确认；L285 返回 `User declined to answer questions`。范围未见用户撤回，重复门禁确实再次阻断。
- manifest 统计本条会话仅 2 条 user、128 次 read，toolResult 文本 1,040,938 字符；这些数字不能证明每次读都无效，但结合明确的重启流程，足以说明恢复状态成本。
- S24 的历史缓存定位也经历“先当现役→核实只被 `.old.ts` 引用”的纠正；此处只作导航背景，不将它再计成新的产品 bug。

现行核实：本轮已经能够通过 `.trellis/scripts/task.py current --source` 恢复活动任务，任务 PRD 明载用户授权；仓库也已有 graft 导航与精确调用关系能力。因此“再加一个任务状态工具/再写一份常驻流程”没有必要。旧流程触发入口与全局指令由主代理统一调查，本分片不据此宣称现行 Trellis 仍有同样问题。

**最小建议：** 恢复时读取已有任务状态和授权依据，仅在目标/风险发生变化时重新对齐；保留已知完成的前置事实及下一步，不清空再扫描整组文档。若主代理确认旧模板还在调用，针对该入口去除重复门禁，而不是在 AGENTS 里叠加相反指令。

**类型：** 判断准则；重复同一 task/门禁/授权可作为确定性提示。**验证标准：** 用 S22 已同意继续的恢复场景，后续应直接推进既定阶段；未完成验收项不能反过来要求先通过才允许实现它们。

## 已有能力与不应重复造轮子的边界

| 已有能力 | 本轮核实与复用边界 |
|---|---|
| HTTP 动态 loader + bundle server | `scripts/serve-bundle.mjs`、`.pi/skills/eh-test/ehunter-dev-loader.user.js` 与 EH skill 已存在；不再建议新增。 |
| 浏览器日志、视口、刷新、服务归属/清理流程 | `.trellis/spec/frontend/browser-acceptance.md` 已覆盖，缺的主要是执行时的断言与可靠结果传播。 |
| 存储隔离/跨站/降级/恢复/重置矩阵 | 设置和放大镜 quickstart 已明确；`.tmp/t041/`、`.tmp/t042/` 是现成资产，先精选和复用。 |
| ZIP 验证 | `fflate` 与 `.tmp/t037/verify-zips.mjs` 已用过；要补图片内容断言，不新增序列化库。 |
| 真实 GM 下载修复 | 当前 `resolveGmApi` 已存在，不能将历史缺陷再次包装为当前实现任务。 |
| 失败和未覆盖范围规则 | quickstart、浏览器指南、trellis-check 已有；重点是让检查结果传播保真，不增加 AGENTS 常驻负担。 |
| 图导航和任务恢复 | graft 与 `task.py current --source` 可直接用，旧缓存模块误定位及重新扫描流程不要求新导航系统。 |

## 分类归纳、限制与交接

- **自动检查：** 优先考虑检查结果状态传播、loader grant/connect 一致性、夹具快照阶段、ZIP 图片内容与环境配置记录；全部由具体历史后果支持。
- **审查规范：** 区分环境假设/证实根因、结构通过/功能通过、替代实验/原环境覆盖；现有规范足够，应用层执行比新增文字更有价值。
- **工具成本与信息访问：** 明确成本集中在重复读取、浏览器状态准备和 `.tmp` 探针复用；没有证据要求换浏览器或增开代理。
- **导航与常驻/无效指令：** 记录历史重复门禁与旧模块误定位，但现行入口检查留给主代理；不提出无证据的全局指令重写。
- **已修复历史问题：** 静态旧包、HTTP/connect 配置、GM API 取值、T042–T044、移动长按松手关菜单；当前 viewport 也有相应实现。本文不会据旧日志重新宣称产品仍失败。
- **仍可确认的缺口：** 历史 T031 勾选与失败证据矛盾仍保留；稳定夹具未纳入已追踪脚本入口；权限同步目前可从两个声明处静态看到，尚无本分片发现的自动一致性入口。
- **待确认：** 当前全仓检查/CI 是否已有可接入机制、运行时移动实测及中止通知缺陷的最新状态。下载中止问题已在 `.trellis/spec/frontend/features/001-gallery-download-bundle/plan.md:118` 挂账，本轮不重复立项或猜测仍未修复。

建议主代理先用两分钟核对第 1 条历史状态矛盾和第 4 条声明差异检查的承载入口，再决定哪些候选进入总报告。研究仅写入本文件。

导航成本记录：本轮 2 次 graft 检索，报告节省估算合计 30,174 tokens；该数字为工具估算，不作为验收效率的精确测量。
