# Standards 正式审查：两项缺陷阻止代码收口

本轮是主会话委派的只读 Standards 审查，遵循 trellis-check；没有修改冻结代码、测试、指南、任务状态或 acceptance.json，没有提交、归档、派发子代理或启动浏览器/服务。唯一新增内容是本报告和 `.tmp/browser-preflight/final-verification/review-standards-*` 审查证据。**发现 P1 一项、P2 一项，均待修复；完整浏览器验收另外仍为 blocked。** 本报告不代替独立 Spec 审查。

## 固定版本与范围

- 冻结依据：[review-freeze.json](../../../../.tmp/browser-preflight/final-verification/review-freeze.json)，branch `master`，HEAD `3b64ddf676b5cf0fe6e94c91de0e17c2abc0b4e1`。核对冻结清单全部17个文件哈希，审查前后无变化，暂存区为空。复核证据：[审查前](../../../../.tmp/browser-preflight/final-verification/review-standards-freeze-before.json)、[审查后](../../../../.tmp/browser-preflight/final-verification/review-standards-freeze-after.json)。
- 检查工作区和暂存区，涵盖新增 `scripts/browser-preflight.mjs`、`tests/browser-preflight.test.mjs`，已修改 `package.json`、`.trellis/spec/frontend/browser-acceptance.md`、`.trellis/spec/frontend/quality-guidelines.md`、`.pi/skills/eh-test/SKILL.md` 及任务产物。产品、loader、锁文件没有本轮任务改动。
- 已读取 check.jsonl 全部5项上下文、PRD、design、implement、final-runtime，并以已批准 design 区分 planning 研究建议与当前契约。源码先通过 graft 定位，再阅读返回的定义范围。
- `npm run check` 与70项工具测试沿用冻结前实际执行记录，不无理由重跑。另运行只读协议检查、指南语法/引用检查及针对新发现的受控复现，所有动作已结束。

## S1 · P1：读取超时释放消费者锁，迟到事件批次被丢弃

**位置：`scripts/browser-preflight.mjs:214`、`scripts/browser-preflight.mjs:222`；触发后续读取：`scripts/browser-preflight.mjs:626`、`scripts/browser-preflight.mjs:633`。**

`drain()` 的 `const events = await bounded('page.events', () => page.events());` 只等待 Promise.race 包装。超时没有取消底层 `page.events()`，但 finally 立即执行 `collecting = false`。外层 finally 随后再调用 `drain()`，产生同时进行的事件消费者；原 Promise 之后返回的批次没有继续执行 `pendingBatches.push(batch)` 或写盘，因此既不进入 `events.jsonl`，也不进入 `result.unsaved`。最终状态正确地保持 blocked，但关键错误现场丢失，违反本工具保存已获取事件的核心要求。

**可复现步骤与观察：**

1. 执行 `node .tmp/browser-preflight/final-verification/review-standards-probes.mjs`，其中 `late-drain` 场景使用受控 Page，不访问浏览器或原站。
2. helper `timeoutMs=50`；第一次 `page.events()` 在180ms后返回唯一标记 `late-drain-marker`，后续调用立即返回空数组。
3. 实测调用共3次，最大并发数 **2**。第一次调用确已返回批次（`delivered:true`），但文件中标记不存在（`savedMarker:false`），未保存批次中同样不存在（`retainedMarker:false`）。功能回调0，最终 blocked，错误为 `page.events timed out after 50ms`。

证据：[完整脚本](../../../../.tmp/browser-preflight/final-verification/review-standards-probes.mjs)、[原始结果 JSON](../../../../.tmp/browser-preflight/final-verification/review-standards-probes.json)、[stdout/stderr](../../../../.tmp/browser-preflight/final-verification/review-standards-probes.log)、[实际命令与 exitCode 0](../../../../.tmp/browser-preflight/final-verification/review-standards-probes.command.json)。退出0表示**缺陷已被断言复现**，不是对应契约通过。

**规范依据：** `.trellis/spec/frontend/browser-acceptance.md:166` 要求唯一消费者及所有捕获批次先保存；`.trellis/spec/frontend/browser-acceptance.md:170` 要求异常/超时后保留事件及采集错误；`.trellis/tasks/10-12-browser-acceptance-preflight/design.md:19` 规定单一收集。对应 PRD R4、AC4。

**所需修复：** 让实际 drain Promise 拥有批次保存与消费者锁的生命周期；超时不能在底层读取仍未结束时发起第二个读取。finally 应有界等待或明确记录尚在进行的读取，保留迟到批次及其原始阶段关联；不能以第二次 drain 代替首次批次。新增“超时后成功返回批次”和“底层一直未结束”的区别用例，断言最大并发不超过1、迟到批次可追溯、未结束读取不能变成 passed。现有 `tests/browser-preflight.test.mjs:359` 的直接 reject 场景没有覆盖此竞态。

这可能影响已有 EH 事件超时后的证据质量，但本复现**没有证明真实 EH 超时的起因**，不能将该因果关系写成已确认结论。

## S2 · P2：任意文本中的 ehunter 覆盖已知第三方来源

**位置：`scripts/browser-preflight.mjs:278`、`scripts/browser-preflight.mjs:283`、`scripts/browser-preflight.mjs:285`。**

`const text = JSON.stringify(p)` 把正文、URL、调用栈全部串联，再以 `/ehunter/i.test(text)` 直接决定 `product=true`。因此即使调用栈明确属于第三方、scriptId 不匹配任何已验证项目脚本，仅正文参数或第三方文件名包含 `ehunter`，也会被归因为 `ehunter` 并抛出 `eHunter runtime/initialization error`。这使已经通过身份和环境的正常分支被无关错误误阻断，归因也与原始证据矛盾。

同一复现脚本提供两个场景：

- `foreign-text-contains-ehunter`：第三方脚本 `https://ads.example/script.js` 报错正文为 `Ad load failed at https://ads.example/serve?ref=ehunter`。
- `foreign-error-sourceurl-contains-ehunter`：正文 `remote service unavailable`，调用栈来自 `https://ads.example/ehunter-ad.js`。

两例均使用 `scriptId:'ad-provider'`，已验证包只有 `scriptId:'bundle'`，没有产品调用栈。实际却均为 attribution `ehunter`、preparation blocked、功能回调0。完整观察与执行证据同 S1 链接的两个后续 record。

**规范依据：** `.trellis/spec/frontend/quality-guidelines.md:124` 要求分开原站和阅读器错误；`.trellis/spec/frontend/browser-acceptance.md:160` 要求按当前文档脚本来源归因，原站/第三方错误保留影响供审阅；`.trellis/tasks/10-12-browser-acceptance-preflight/design.md:27` 同样分开来源与功能结论。

**所需修复：** 优先使用当前文档已验证的 scriptId/exact URL 和已确认 loader 来源；已知第三方来源不能被任意子串覆盖。缺少来源时保持 unattributed/blocked，文本标记至多作辅助依据，不能单独认定产品。补入与既有 host、favicon、项目脚本错误相对照的测试。`tests/browser-preflight.test.mjs:248` 的 host 用例及 `tests/browser-preflight.test.mjs:263` 的 favicon 用例均未包含此误判条件。

现有 Vite 更新请求的真实错误仍保留原始 blocked 记录；本次受控复现不自动推翻它的归因，也不声称更新请求已经恢复。

## 其余 Standards 检查结果与边界

- 最小实现：仅 Node 标准库，无新依赖、E2E框架、产品 API、平台实现或存储协议变更。package 的串行测试链保留现有 acceptance/storage，新增 preflight，check 继续以类型检查和生产构建收口。
- 身份/环境：固定 desktop/mobile 预期；DPR、触摸、mobile 命令回执分开；EH 完整字节/精确文本与当前文档 coverage；Vite exact URL 全部已加载项目模块及必需清单；输入变化/HMR失效；未加载模块和独立资源范围明示。未见为既有移动阻塞放宽尺寸、改 meta 或改 mobile 的实现。
- 错误传播：准备/取证异常 blocked，显式产品断言 failed；最终保存失败拒绝成功；原始错误、保存错误分别保留；受保护 API 失败后不能继续。正常返回之前完成 finally/result 原子落盘。S1是其中独立的读取超时缺口。
- UI 任意回调 Promise 无法强制取消：额外超时探针观察到30ms超时、44ms左右拒绝后180ms回调继续；这是 `.trellis/spec/frontend/browser-acceptance.md:135` 已明确交给调用方处理的限制，不单独列为缺陷。它与 S1 的 helper 自有消费者生命周期问题分开。[观察日志](../../../../.tmp/browser-preflight/final-verification/review-standards-timeout-repro.log)只作边界说明。
- 指南：两入口均接同一 helper、回调不另行 drain、正常 UI 准备与关闭基线分开；service/space/存储归外层所有，静态权限与浏览器安装副本分别核实；示例变量明确来自本轮观察，源码执行与功能完成没有混同。7个 bash/JS 代码块语法检查 exit0，40个相对文件引用均可解析；这不证明运行成功。[语法证据](../../../../.tmp/browser-preflight/final-verification/review-standards-doc-syntax.json)、[引用及diff检查](../../../../.tmp/browser-preflight/final-verification/review-standards-inspection.json)。未发现需要独立列出的文档语法/链接缺陷；S1/S2修复后需同步核对所述契约。
- 原70项测试对同长度旧全文、仅解析、旧context、独立环境错误、权限名字、写盘失败、懒加载、HMR有区分力；新增两项竞态/归因反例仍未覆盖。原类型检查、37项Python、46项storage、70项preflight及生产构建通过记录已核对；没有 lint 工具，不报告 lint 通过。本轮不重跑全套测试。

## 已知浏览器阻塞与未验收范围

以 [final-runtime.md](final-runtime.md) 和已保存 acceptance.json 为准：Vite桌面更新请求错误、Vite移动选择书页超时（finally同时有更新请求错误）、EH桌面 `page.events timed out after 15000ms`、EH移动 strict innerWidth/innerHeight **1232×2666** 对 **390×844** 均仍 blocked；早期742×1606是另一轮观察。120个Vite模块/完整EH包身份通过及命令测试通过，不等于模式、开关恢复、缩略图、截图视觉完整通过。尚未完成的功能保持未执行/未验证，不借 Standards 审查补写 passed。

原任务服务/PID已退出和端口释放证据保持有效；空间2/p1因 blocked 保留、cleanup 为 partial。此次只读审查未操作该空间、用户扩展、存储或服务。没有豁免授权，也没有新增豁免。

## 协议命令、原始摘要与主会话合并建议

- `python3 ./.trellis/scripts/task.py validate .trellis/tasks/10-12-browser-acceptance-preflight`：**exit 0**，仅证明上下文清单合法。[原始日志](../../../../.tmp/browser-preflight/final-verification/review-standards-validate.log)、[execution](../../../../.tmp/browser-preflight/final-verification/review-standards-validate.command.json)。
- `git diff --check HEAD`：**exit 0**；暂存区 diff 为空。[execution](../../../../.tmp/browser-preflight/final-verification/review-standards-diff-check.command.json)。新增源码/测试另已人工审阅，不以 git diff 无输出覆盖未跟踪文件。
- `python3 scripts/acceptance.py summarize .trellis/tasks/10-12-browser-acceptance-preflight`：**原始 exit 1**。完整、未经改写的 stdout JSON：[review-standards-summarize.json](../../../../.tmp/browser-preflight/final-verification/review-standards-summarize.json)；[execution及原始退出码](../../../../.tmp/browser-preflight/final-verification/review-standards-summarize.command.json)、[日志](../../../../.tmp/browser-preflight/final-verification/review-standards-summarize.log)。该 JSON 描述**当前已保存记录**，尚未包含本轮待合并审查条目。
- 被汇总的记录路径：`.trellis/tasks/10-12-browser-acceptance-preflight/acceptance.json`（[原记录](../acceptance.json)）。原始摘要 `valid:true`、`observedStatus:'blocked'`、`status:'blocked'`，passed **5**、failed **0**、partial **1**、blocked **4**、unrun **1**、waived **0**；`formal-review` 当前仍 unrun。不得把 exit1 修成0或视为自动检查脚本自身失败。

提供主会话可合并的建议：[review-standards-proposed-checks.json](../../../../.tmp/browser-preflight/final-verification/review-standards-proposed-checks.json)。其中 `formal-review-standards` 为 inspection/content/**failed**，scope 只覆盖 Standards，note记录两项未修复缺陷；主会话需结合独立 Spec 审查合并既有 `formal-review`，不得把本报告单独作为两轴完成证明。主会话仍是 acceptance.json 唯一写入者。各命令实际 execution 已单独保存，命令复现 exit0不表示实现契约通过。

两分钟下一步：主会话先打开复现 JSON 的 `late-drain` record，核对 `maxConcurrent:2` 和丢失标记，并把两项发现合并进正式审查结果；等独立审查全部结束后安排修复轮，再失效并重跑受影响验收。当前代码和浏览器验收均不应宣告收口。
