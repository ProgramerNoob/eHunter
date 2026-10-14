# 第 4 阶段真实浏览器验收报告

记录时间：2026-10-12 16:45–17:01 UTC。完整功能验收仍有阻塞，不能宣告 AC1–AC6 全部完成。本子代理只运行冻结版本，新增运行脚本、证据与本报告；没有修改 helper、tests、package、指南、loader、产品、任务配置或 acceptance.json，没有 commit、重建、重复自动测试或嵌套代理。

所有运行文件位于 [runtime-verification](../../../../.tmp/browser-preflight/runtime-verification/)。可直接回填的七个建议条目见 [proposed-checks.json](../../../../.tmp/browser-preflight/runtime-verification/proposed-checks.json)，包含每项 observation、完整 execution、evidence、note；它不是 acceptance.json，也没有手写整体状态。主会话仍是 acceptance.json 唯一写入者。

## 逐项结论

| planned check | 建议 observed | 实际退出码 | 结果与未验证范围 |
| --- | --- | --- | --- |
| vite-desktop | blocked | 1 | 收集 120 个当前文档项目模块，116 个全文及执行通过，4 个 source map 全文不一致；功能回调0、截图0，开关恢复及模式切换未执行 |
| vite-mobile | blocked | 1 | 同上四个身份差异；功能回调0、截图0，严格环境和功能验收未执行 |
| eh-desktop | blocked | 1（完整功能轮） | 首轮身份、环境、标题、1/136、截图读取通过部分检查；第二轮正常打开后在 switch-book 的事件采集超时，模式切换、缩略图定位/完成加载及关闭恢复未验证 |
| eh-mobile | blocked | 1 | 完整 eval 与执行通过；打开后 CSS 实际1232×2666，不符合390×844；回调0、截图0 |
| browser-negative | passed | 0（外层矩阵断言） | 真实浏览器正常对照 callback1；错误 CSS、旧文本、导航超时都 blocked，callback0、截图0，finally 已保存 |
| permissions | passed | 0（外层差异断言） | 仓库声明匹配；临时 loader 副本少 GM_download 或 hath.network 均在导航前阻断；未全面核验安装副本 metadata |
| cleanup | passed | 0（最终核实） | 本轮全部服务/PID退出、三端口释放；113 个冻结文件哈希不变；空间保留 |

`eh-desktop/result.json` 的 passed 只代表首轮较小回调（首屏、截图、菜单观察）完成，不能覆盖完整 eh-desktop planned claim。完整功能轮的 `eh-desktop-functional/result.json` 为 blocked，建议条目引用这一真实非零 execution。没有出现明确 ProductAssertion 失败；工具事件超时与准备门失败没有被写成产品 failed。

## 冻结版本与执行记录

沿用主会话提供的 16:43:09Z `npm run check` 成功产物与日志 [tmp2kx488mf.log](../../../../.tmp/acceptance/10-12-browser-acceptance-preflight/tmp2kx488mf.log)，本轮没有重新 build/check。前轮 Node 自测日志 [tmprzuq_vbi.log](../../../../.tmp/acceptance/10-12-browser-acceptance-preflight/tmprzuq_vbi.log) 仅引用，不重跑或重新声称本子代理执行。

[frozen-before.json](../../../../.tmp/browser-preflight/runtime-verification/frozen-before.json)、[frozen-after.json](../../../../.tmp/browser-preflight/runtime-verification/frozen-after.json) 和 [freeze-verification.json](../../../../.tmp/browser-preflight/runtime-verification/freeze-verification.json) 对比 113 个文件，全部相等。包括 helper、测试、package/lock、接入指南、loader、dist 和 src/core 全部文件：

- helper SHA-256：`a5a872b6a8b9ea8ee01169db6745b602b7614d50fbea802aab24d256192fe9f2`
- tests SHA-256：`a61e1c94eb478cb3326c7ea0cb07a14adfd269e3ae008ee0561e80c1bdb93fab`
- dist SHA-256：`36dfa0deac3c3555c484e7b23be89fb19ded2e651784ac834e1c3134037b7d3a`

每个浏览器 invocation 均由临时 `run-command.py <label> ego-browser nodejs` 记录，真实 argv 为 `["ego-browser", "nodejs"]`，cwd 为 `.`，对应 `<label>-command.json` 包含 startedAt/endedAt/exitCode/log 及 stdin 脚本路径；完整输出在 `<label>-output.log`。建议条目的 execution 只保留协议要求的六字段，stdin 路径在额外 command 证据中。

| label | UTC 开始—结束 | exit |
| --- | --- | --- |
| vite-desktop | 16:49:30.751582—16:49:32.720303 | 1 |
| vite-mobile | 16:49:59.318742—16:50:00.887434 | 1 |
| eh-desktop | 16:51:06.373799—16:51:14.255267 | 0 |
| eh-desktop-functional | 16:52:46.058217—16:53:27.227284 | 1 |
| eh-mobile | 16:53:46.412598—16:53:50.213045 | 1 |
| browser-negative-v2 | 16:56:30.521186—16:56:34.770229 | 0 |
| permissions | 16:57:54.865452—16:57:55.134926 | 0 |
| cleanup-final | 16:58:59.221977—16:58:59.381000 | 0 |

各产品 helper 轮目录均保存 manifest、commands.jsonl、events.jsonl、source.json、全文副本、identity.jsonl、指纹及 result.json；环境门到达后保存环境，EH 保存 permissions。没有把未到达环境门的 Vite 轮补写为环境通过。

## Vite：四处全文差异阻断两个视口

新服务：`npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`，npm PID51715，监听 PID51750，cwd `/Users/warwick/claude/eHunter`，origin `http://127.0.0.1:5173`。HTTP200、PID/cwd/父进程和日志见 [vite-service.json](../../../../.tmp/browser-preflight/runtime-verification/vite-service.json)。从本轮服务真实转换文本取得 style query，必需模块为：

- `/src/main.ts`
- `/core/components/widget/CircleIconButton.vue`
- `/core/components/widget/CircleIconButton.vue?vue&type=style&index=0&scoped=655c7388&lang.scss`

helper 没有只比这三个模块；两轮都比对当前文档全部120个项目模块。三项必需模块均通过，另四项 exact=false，均有当前文档全长 count=1 coverage：

| exact URL 路径 | browser actual UTF-8 字节 | Node expected UTF-8 字节 |
| --- | --- | --- |
| `/core/model/layout.ts` | 12669 | 12881 |
| `/core/components/TopBar.vue` | 33619 | 33587 |
| `/core/components/status/StatusNotificationStack.vue` | 6075 | 6167 |
| `/core/components/status/StatusNotificationItem.vue` | 13008 | 13096 |

差异只出现在内联 `//# sourceMappingURL=data:application/json;base64,...` 行，前面的 JavaScript 文本相同；这只是离线差异定位，没有作为放宽 exact 检查的依据，也不能据此断言旧产品代码或确定缓存根因。保存的源码未经 trim、删除 map 或其他归一化。详见 [桌面差异](../../../../.tmp/browser-preflight/runtime-verification/vite-desktop-source-differences.json)、[移动差异](../../../../.tmp/browser-preflight/runtime-verification/vite-mobile-source-differences.json) 和各轮 `source-<sha>.js`。

两轮错误均为 `Exact source or full-length top-level execution evidence missing`，发生在 `prepare-reader:identity`。桌面 loaderId `B8EB763D5FB1E7F9CC21846AD3F1C8F3`，移动 `DF25D430A111B2C42DA83EA8F33E6BBD`。功能回调均为0，无截图。未加载输入、第三方及 lockfile 关联在 result.inventory；不能声称整个工作树、懒加载分支或独立资源已执行。该分支按委派规则停止，未忽略缓存重试、改 helper 或做源码归一化。

## EH：桌面部分成立，事件超时与移动尺寸阻塞

bundle 服务 `npm run serve:bundle`，npm PID51718，监听 PID51754，URL `http://127.0.0.1:8787/ehunter.iife.js`，HTTP200、no-store、响应哈希等于本次 dist，见 [bundle-service.json](../../../../.tmp/browser-preflight/runtime-verification/bundle-service.json)。

同一空间只读复核 Tampermonkey：页面显示5.5.0，eHunter (dev loader)1.0.2 为 enabler_enabled，静态 eHunter3.1.0 为 enabler_disabled；当前 `/s/` 页面可访问，标题正确，未遇登录/403/Sad Panda/权限提示。见 [installation.json](../../../../.tmp/browser-preflight/runtime-verification/installation.json)、[installation-rows.json](../../../../.tmp/browser-preflight/runtime-verification/installation-rows.json)、setup-continued 输出及前轮扩展详情。首次进入设置页导致脚本列表等待超时，随后根据完整 snapshot 的“已安装脚本”入口正常访问，未修改设置、安装或启停脚本。浏览器安装副本完整 metadata 未核验。

真实 URL：`https://exhentai.org/s/80813c92df/3482416-1`。本地 TEST 页面准备时首次出现版本说明遮挡，已按快照点击“确定”；顶栏和开关均按正常 UI 操作，没有通过 evaluate/GM/localStorage 直接写入偏好或关闭 autoopen。正常 UI 自身可能持久化其状态，未伪称全部用户存储字节不变。

| 轮次 | 实际完整 eval scriptId | UTF-8 字节 / UTF-16长度 | 同 script 全长执行范围 |
| --- | --- | --- | --- |
| eh-desktop | 51 | 442864 / 431923 | 0–431923，count1 |
| eh-desktop-functional | 174 | 442864 / 431923 | 0–431923，count1 |
| eh-mobile | 283 | 442864 / 431923 | 0–431923，count1 |

三轮 actual SHA-256 均等于上述 dist 哈希，当前主 frame/context/loaderId 在 identity.jsonl 中。每轮 identity 还包含一个 loader 包装候选 exact=false；真正生产 eval 是上表匹配项，不能把包装候选误判为生产包不符。

桌面严格环境1200×900、DPR1、touch0、coarse=false；标题 `GIRLS BAND CRY 1st FAN BOOK [Chinese] [无名字幕组]`、当前1/总136断言通过。首轮菜单可展开并观察到“滚动”“书页”，尚未构成切换验收。

[reader-initial.png](../../../../.tmp/browser-preflight/runtime-verification/eh-desktop/reader-initial.png) 已通过 `functions.read` 实际读取，1200×900 CSS scale：深灰阅读区、绿色 dock、标题和页码可见，红色封面正文已渲染；左侧缩略图仍为空白，仅显示序号，正文中央仍有“等待中..”及刷新/原图提示。视觉记录为 partial，见 [visual-review.json](../../../../.tmp/browser-preflight/runtime-verification/visual-review.json)。捕获日志没有明确加载错误，不能把缩略图空白归因于已确认网络错误或宣称加载完成。

正常 UI 在外层关闭后，原站 meta `[]` 已观察；新 `eh-desktop-functional` 导航取得本轮关闭状态，再经 `prepareReader` 正常打开。该轮通过准备门、首屏断言，在 switch-book 阶段停止：

```text
PreflightBlocked: page.events timed out after 15000ms
    at Timeout.<anonymous> (file:///Users/warwick/claude/eHunter/scripts/browser-preflight.mjs:137:41)
    at listOnTimeout (node:internal/timers:605:17)
    at process.processTimers (node:internal/timers:541:7)
```

首条错误 phase 为 `switch-book:waiting:events`，之后 `switch-book:after:events` 又超时。原脚本、commands、先前事件和 finally 已保留。具体可复现脚本为 `eh-desktop-functional.mjs`；未修改 helper、缩短动作或重复该分支。switch-book 内包含 snapshot、顶栏可见性观察及正常点击，尚未确认 CDP/动作并发的根因。模式切换、缩略图点击定位、关闭后的 helper 恢复断言、重开和后续截图都未完成。

移动严格门实际值：

| 字段 | 独立预期 | 实测 |
| --- | --- | --- |
| innerWidth × innerHeight | 390×844 | **1232×2666** |
| DPR | 3 | 3 |
| maxTouchPoints / coarse | 5 / true | 5 / true |
| client / visualViewport | 诊断字段 | 390×844 / 390×844，scale1 |
| mobile | true命令及成功回执 | 保留本轮完整参数、回执；不声称直接回读 |

meta 为产品写入的 `<meta name="viewport" data-ehunter-managed="1" content="width=device-width, initial-scale=1, viewport-fit=cover">`。错误 `Reader CSS viewport mismatch`，phase `prepare-reader:opened`，callback0、截图0。此次值不是前轮探针742×1606；两次观察均未满足严格门。本轮未改变预期、mobile、meta或存储，未进入后续移动功能。该轮自动打开，没有独立关闭基线，不补写关闭恢复通过。

## 受控异常与权限检查

[negative-v2-summary.json](../../../../.tmp/browser-preflight/runtime-verification/negative-v2-summary.json) 汇总真实 Page + 同一 helper 的四轮：

- 正常对照：全文/顶层执行与桌面环境通过，callback1，result passed。
- 错误 CSS：夹具原始 HTML 含800px溢出元素，实际800×1731，DPR3/touch5/coarse=true，strict CSS blocked，callback0/截图0。
- 旧代码：夹具服务对浏览器返回 `window.fixtureVersion = 'OLD'`，对 Node expected 返回同长度 `NEW`；actual 由 Debugger 从当前浏览器 script 取得，非 mock Page。exact=false，blocked，callback0/截图0。
- 导航超时：HTML 的图片响应故意不结束，goto 等load在1500ms超时，已提交文档处于interactive；提前执行的 `fixture-current-document-navigation-timeout` console 及 before/after/finally 批次保留，callback0/截图0。

这是任务专属8788 HTTP夹具，使用 helper 的 Vite协议模式，不冒称另一个真实 Vite/产品服务。夹具从未更改原站、真实扩展或用户存储。第一版对照由于内联脚本 actual 对上整页 HTML expected 而 blocked；错误证据留存，仅将任务夹具改为外部模块后第二版完成矩阵。本轮不借该事件修改产品或 helper 分类规则。

所有负例 helper 均抛出非零错误；矩阵外层按“应 blocked”断言全部事实后 exit0，不把负例功能记 passed。导航超时完整错误含 `EGO_NAVIGATION_TIMEOUT`，详见 `negative-v2-navigation-timeout/result.json`。

权限静态正例：6个grant完全相等，生产4个connect被覆盖，loader额外127.0.0.1/localhost允许。本任务目录创建两个临时 loader 副本，分别少 `GM_download` / `hath.network`；同一 helper 报 `Repository userscript permissions mismatch`，缺项精确输出，navigateCount0、callback0。见 [permissions-summary.json](../../../../.tmp/browser-preflight/runtime-verification/permissions-summary.json)。真实仓库loader和安装副本保持原状。

## 日志、资源与交接

[log-review.json](../../../../.tmp/browser-preflight/runtime-verification/log-review.json) 已复核每轮 result.logs 与原始事件，排除 `before-navigation-old-document` 用作当前文档证据。在捕获的新文档事件中未发现 Runtime.exceptionThrown、console error/warning、Log error/warning 或 Network.loadingFailed。日志区分 Vite client、eHunter loader/app 与 External Player；“已加载”没有替代 identity。EH完整功能轮发生采集超时，因此不能声称事件完整；CDP缓存容量未知，其他轮也不保证绝对无丢失。

本轮仅一张截图，已读取；Vite两视口和EH移动无截图，EH后续书页/重开截图未执行。独立资源应用/视觉、所有未加载分支、完整移动与桌面功能、NH、物理设备、保存失败等工具单测覆盖之外的真实故障均不在本轮通过范围。正式审查由主会话后续安排，本报告不替代。

服务证据与 [service-cleanup.json](../../../../.tmp/browser-preflight/runtime-verification/service-cleanup.json) 证明：

| 服务 | 本轮PID | 最终 |
| --- | --- | --- |
| Vite | npm51715 / listener51750 | 均退出，5173释放 |
| bundle | npm51718 / listener51754 | 均退出，8787释放 |
| fixture | 初版54210 / 第二版54577 | 均退出，8788释放 |

首次cleanup停止Vite listener后，npm父进程退出中导致cwd为空，脚本以 `AssertionError: (51715, '')` 停止，没有向未核实归属的进程发信号。第二次先批量核实所有PID/cwd再发送SIGTERM，最终实际退出码0，完整历史保留。未创建传统PID文件，无需删除；交付日志、源码副本和脚本保留。

[space-final.json](../../../../.tmp/browser-preflight/runtime-verification/space-final.json)：TaskSpace **2**、**p1**、ownership **agent**，page openedBy agent，最终 `about:blank`，没有新空间、新页面、finish或handOff。导航到blank用于结束本任务夹具未完成的加载，再停止其服务；空间按委派保留给主会话接续。没有触发用户接管、认证或浏览器prompt。

本子代理所有浏览器/验证命令均已结束，本轮服务已退出；未派发任何子代理，没有留下编码/测试后台任务。主会话提供的编码/测试冻结前提未被改变，113文件hash已核验。短通知已在浏览器阶段和独立故障阶段各触发；按委派不发长通知，由主会话最终统一。

两分钟下一步：主会话读取 proposed-checks.json 与 eh-desktop-functional/result.json，先回填四个 runtime/blocked 及下游unrun；再将 Vite inline source-map全文差异、EH阶段page.events超时、EH移动严格视口三个实证阻塞交回规划，冻结版本下不宣告第4阶段完成。
