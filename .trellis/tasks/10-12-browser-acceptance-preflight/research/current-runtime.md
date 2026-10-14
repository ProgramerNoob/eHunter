# 当前 helper 的真实浏览器回归（验收仍阻塞）

2026-10-14 01:22–01:34 UTC。用户允许建立替代空间后，主会话在空间3/p1完成了四个真实场景的回归尝试、受控异常矩阵和权限矩阵。原空间2消失的历史记录保留在 [空间检查](resume-space-check.md)，已不再是当前阻塞原因。任务仍为 `in_progress`，无豁免、提交或归档。

## 版本与证据范围

- helper SHA-256：`ea691ee3d9cd28170db75019f1a9208ba61c4d76c7c71627ceb0836ac6ba2ed6`。六个实施/入口文件与96项工具测试及正式审查的冻结版本相同，见 [freeze.json](../../../../.tmp/browser-preflight/current-runtime/freeze.json)。本轮未修改 helper、产品或 loader。
- `npm run build-prod` 实际退出0；产物442864 UTF-8字节，SHA-256 `36dfa0deac3c3555c484e7b23be89fb19ded2e651784ac834e1c3134037b7d3a`，与浏览器当前文档中的生产eval全文相同。见 [构建执行记录](../../../../.tmp/browser-preflight/current-runtime/build-command.json)。
- Vite独立origin为 `http://127.0.0.1:5175`；监听PID16822、npm父进程16785、cwd均核实。生产包服务端口8787、监听PID16820、npm父进程16786；响应全文等于本地产物。见 [Vite服务](../../../../.tmp/browser-preflight/current-runtime/vite-service.json) 与 [bundle服务](../../../../.tmp/browser-preflight/current-runtime/bundle-service.json)。
- 本轮只读核对Tampermonkey安装列表与动态loader编辑器：动态loader1.0.2启用，静态eHunter3.1.0停用，安装文本含6个grant、生产connect、本地host及实际bundle URL；EH页面可访问。见 [安装前提](../../../../.tmp/browser-preflight/current-runtime/installation.json)、[安装文本](../../../../.tmp/browser-preflight/current-runtime/installed-loader.txt)。没有更改安装脚本或扩展权限。
- 历史70项测试和空间2浏览器观察只保留在 [历史报告](final-runtime.md)。本报告采用新执行记录，不用历史结果补足当前未运行的功能。

## 四个真实场景

下表的 `blocked` 是 helper 实际结果，非零执行记录均以 `runtime` 写入验收协议。更新请求错误与严格视口错误都没有被改写为产品断言 `failed`。

| 场景 | 本轮已验证 | 阻塞与下游未运行 |
| --- | --- | --- |
| Vite桌面 | 当前文档120/120已加载项目模块全文及执行通过，含入口、深层Vue和style；1200×900、DPR1、touch0/coarse false；正常打开、首屏截图、切到书页DOM成功 | 书页截图保存后复检出现 `eHunter runtime/initialization error`，具体为更新请求 `net::ERR_HTTP2_PROTOCOL_ERROR` / `TextReq: request error`。该书页截图不计通过；后续卷轴切换、关闭恢复、重新打开未运行 |
| Vite移动 | 120/120模块全文及执行通过；390×844、DPR3、touch5/coarse true，mobile true命令回执；正常打开、首屏截图和关闭后原viewport恢复 | `reopen-reader:before` 检出同类更新请求错误；重新打开及后续书页/卷轴切换未运行 |
| EH桌面 | 当前活动脚本清单74项，恰好1个完整生产候选具有全文及自身执行证据；1200×900、DPR1、touch0/coarse false；标题和 `1 / 136` 断言通过 | `switch-book:before` 检出更新请求错误；书页/卷轴切换、缩略图加载定位、关闭恢复和截图未运行 |
| EH移动 | 当前活动脚本清单80项，恰好1个完整生产候选具有全文及自身执行证据；打开前原站1249×2703、无viewport meta；通过正常UI打开后由产品添加viewport meta；DPR3、touch5/coarse true、mobile true命令回执 | 严格inner尺寸1232×2666，不等于390×844，报 `Reader CSS viewport mismatch`。client/visualViewport为390×844不能替代inner断言；功能回调0，截图0，所有功能及关闭恢复未运行 |

实际摘要见 [runtime-summary.json](../../../../.tmp/browser-preflight/current-runtime/runtime-summary.json)。完整证据分别在 [Vite桌面](../../../../.tmp/browser-preflight/current-runtime/vite-desktop/result.json)、[Vite移动](../../../../.tmp/browser-preflight/current-runtime/vite-mobile/result.json)、[EH桌面](../../../../.tmp/browser-preflight/current-runtime/eh-desktop/result.json)、[EH移动](../../../../.tmp/browser-preflight/current-runtime/eh-mobile/result.json)；相邻目录保留commands、events、identity全文和环境记录。前三轮进入功能回调1次，EH移动未进入。

Vite桌面与移动首屏截图均已实际读取。桌面可见滚动阅读器、顶栏与缩略图，移动为窄屏阅读器；这仅是对应首屏的视觉观察，不代表完整交互验收。书页截图虽落盘，截图后的门禁失败，不计截图通过；EH本轮没有截图。helper的 `visualReview: unrun` 由主会话记录补充，不修改原始结果。

本轮没有Vite编译overlay。更新URL为 `https://jp.animesales.xyz/ehunter/update.json`；原始网络日志归于host-or-third-party，调用栈指向eHunter `TextReq` 的console error被当前契约归为eHunter并阻断。已确认错误来源和阻塞机制，尚未确认远端网络故障根因，也未证明该错误影响阅读功能。所有这些结论与产品功能是否通过分开记录。

Vite身份范围只覆盖本轮已加载120个项目模块，不覆盖尚未加载模块、所有独立CSS/图片或物理移动设备。EH完整eval身份不等于全部请求成功。本轮未改用户存储、注入meta、关闭更新检查或放宽预期来通过验收。

## 受控异常与权限

[异常矩阵执行记录](../../../../.tmp/browser-preflight/current-runtime/browser-negative-command.json)退出0：真实Ego浏览器中的受控HTTP夹具以Vite协议模式运行，明确不是产品Vite服务。

- 正常对照 `passed`，功能回调1次。
- 错CSS（800×1731）、同长度旧源码、导航等待load超时1500ms均 `blocked`，功能回调0，截图0，finally批次可读。
- 超时分支保存了导航前后及 `fixture-current-document-navigation-timeout` 事件。完整结果见 [negative-v2-summary.json](../../../../.tmp/browser-preflight/current-runtime/negative-v2-summary.json)。

[权限矩阵执行记录](../../../../.tmp/browser-preflight/current-runtime/permissions-command.json)退出0：当前产物6个grant与仓库loader相等，生产4个connect及本地host被覆盖；临时副本分别去除 `GM_download` 或 `hath.network` 后，在导航前 `blocked`，导航0、功能回调0。仅修改 `.tmp/` 副本。见 [permissions-summary.json](../../../../.tmp/browser-preflight/current-runtime/permissions-summary.json)。

四个真实场景及四个异常场景的事件收集均记录 `maxConcurrent: 1`、`unresolved: []`、`timeouts: []`。本轮没有重现历史 `page.events` 超时；这些结果不证明未知CDP缓冲绝对无丢失，也不证明未实际触发的迟到drain分支。迟到/并发/写盘失败契约仍由96项工具测试覆盖。

## 清理、审查与下一步

[cleanup.json](../../../../.tmp/browser-preflight/current-runtime/cleanup.json)记录终止前的精确命令与cwd，确认本轮Vite、bundle、夹具及两个npm父进程共5个PID退出，5175/8787/8788释放。既有用户资源和必要证据保留。空间3/p1归agent所有，已返回about:blank；验收blocked未调用成功专用 `finish()`，见 [space-final.json](../../../../.tmp/browser-preflight/current-runtime/space-final.json)。

固定版本的96项工具测试、`npm run check` 和Standards/Spec静态审查仍有效；测试环境为Node v24.18.0、Python3.13.14，未声称推荐的Node22/Python3.12已验。[本轮最终核验](../../../../.tmp/browser-preflight/current-runtime/final-review.md)未发现新P0/P1，文档引用、任务清单及验收协议有效。汇总为7 passed、3 partial、4 blocked、4 unrun、0 failed、0 waived，退出1，整体blocked；不能提交或归档。

审查后主会话将任务 `branch` 从历史master更正为当前 `fix/trellis-acp-context`，HEAD为 `d2d81c48c5f893afdfa7baebef17772711ab5f87`，六项实施文件仍与冻结哈希相等。`scripts/__pycache__/` 在本次会话开始前已存在，保留用户已有工作区资源；没有将它加入提交。当前无运行中的编码/审查子代理。

下一步须处理两个独立阻塞：更新请求错误的影响/门禁归类，以及EH移动打开后的布局视口。当前设计明确不改阅读器功能；若需要产品修复或改变错误处理契约，先对齐范围和接受标准。不能通过忽略错误、改用clientWidth或降低移动期望来补绿。
