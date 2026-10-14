# 能力探针报告：Vite 可用，EH 移动严格视口阻塞

记录时间：2026-10-12。范围仅为[实施计划](../implement.md)第 1 阶段；没有开始正式 helper、工具测试或指南接入，没有改产品、loader、任务状态、design、implement 或 acceptance.json。本报告承接上一轮 Vite 证据，并新增真实 EH 探针。

## 决策门结论

| 分支 | 实际结果 | 可证明范围 |
| --- | --- | --- |
| Vite 桌面 | capability-verified | 入口、深层 Vue、style 虚拟模块全文相等、当前文档顶层执行；1200×900、DPR1、touch0、coarse=false |
| Vite 移动 | capability-verified | 同三个代表模块取证成功；390×844、DPR3、touch5、coarse=true |
| EH 桌面 | 能力已验证 | 完整 eval 源码及当前文档执行、正常关闭/打开、1200×900、DPR1、touch0、coarse=false；meta 无→无 |
| EH 移动 | blocked | 完整 eval 身份及执行可见，但正常打开后 innerWidth/innerHeight 为 **742×1606**，不符合 **390×844**；严格视口门未通过 |

零改动 CDP 取证路径在两种入口均具有运行证据，不需要以 loader 日志或 HTTP 响应代替 actual。EH 移动阻塞属于当前准备条件不满足，尚未确认根因，不记为产品断言 failed。停止该分支后未进入功能验收、未截图，也没有把 client 尺寸或 visualViewport 替换为主断言。主会话应据此回到规划处理移动视口边界，再决定下一阶段；本报告不批准产品修复或放宽预期。

## 证据位置与命令

所有原始证据位于仓库 [`.tmp/browser-preflight/capability-20261012-230801-28482d/`](../../../../../../.tmp/browser-preflight/capability-20261012-230801-28482d)。以下文件名均相对该目录。

| 执行 | 退出码 | 记录 |
| --- | --- | --- |
| 上轮 `npm run build-prod` | 0 | `build-prod-command.json`、`build-prod-output.log` |
| 上轮 Vite 桌面/移动 `ego-browser nodejs` | 各 0 | `vite-desktop-command.json`、`vite-mobile-command.json` |
| EH 桌面身份 `ego-browser nodejs` | 0 | `eh-desktop-command.json`、`eh-desktop-result.json` |
| EH 桌面关闭/正常重开 | 各 0 | `eh-desktop-close-command.json`、`eh-desktop-open-command.json` |
| EH 移动身份 `ego-browser nodejs` | 0 | `eh-mobile-command.json`、`eh-mobile-result.json`；仅身份能力通过 |
| EH 移动正常开关与严格视口 | **1** | `eh-mobile-lifecycle-command.json`、`eh-mobile-lifecycle-result.json` |

探针命令通过既有 `run-command.py <label> ego-browser nodejs` 执行；对应 `<label>.mjs`、完整 stdout/stderr、开始结束时间均已保存。`events.jsonl` 包含导航前旧文档批次、导航提交、等待挂载、开关准备和 finally；`*-commands.jsonl` 保存 CDP 参数、成功回执及源码响应。探针脚本仅用于本轮观察，不是正式 helper，也未经正式工具测试审查。

上轮公共探针曾 exit 1：`'Browser.getVersion' wasn't found`，见 `common-command.json`。这是把 Browser 域命令发送到 Page 的路径错误；后续 `common-domains-command.json` exit 0 以及 Vite/EH 实际域调用证明所需 Page 取证域可用。未以该失败推断 Debugger/Profiler 不可用，也不声称已取得浏览器精确版本。

## Vite 代表模块与范围

复核上一轮 `vite-identity.json`、`vite-mobile-identity.json` 及源码文件：

| 模块 | 桌面/移动 scriptId | 全长顶层范围，count=1 |
| --- | --- | --- |
| `http://127.0.0.1:5173/src/main.ts` | 9 / 191 | 0–29704 |
| `http://127.0.0.1:5173/core/components/widget/CircleIconButton.vue` | 66 / 244 | 0–9465 |
| `http://127.0.0.1:5173/core/components/widget/CircleIconButton.vue?vue&type=style&index=0&scoped=655c7388&lang.scss` | 86 / 283 | 0–1902 |

actual 来自 Debugger，expected 来自已确认归属的 Vite exact URL；三个模块均未 trim 或归一化，保留 query 并全文比较。上下文与新主文档关联见 `vite-contexts-frames.json`、`vite-mobile-contexts-frames.json`。

`inputs-before.json` 与本轮 `inputs-after.json` 的 110 个文件记录相同，合并 SHA-256 均为 `594f75567f31a68db9aa46f3ef602398e14763129f96f10a5e72389879b9d3f7`。输入包含 src、core、入口、Vite 配置、package.json 和锁文件。代表模块成功不代表完整已加载清单、懒加载分支或独立 CSS/图片均已验证；这些仍属于正式 helper 与后续验收范围。

## EH 安装前提、源码与执行

真实 URL：`https://exhentai.org/s/80813c92df/3482416-1`。可访问图片页，标题 `GIRLS BAND CRY 1st FAN BOOK [Chinese] [无名字幕组]`、原站 1/136；未遇登录、403、Sad Panda 或权限提示，未 handOff。

只读检查浏览器扩展和已安装脚本列表：篡改猴 5.5.0 启用；静态 eHunter 3.1.0 的 DOM 状态为 `enabler_disabled` / `已禁用`；eHunter (dev loader) 1.0.2 为 `enabler_enabled` / `已启用`。见 `tampermonkey-details.txt`、`installed-scripts-list.txt`、`installed-scripts-rows.json`。打开扩展选项自然产生的 p2 已关闭，探针始终继续使用原空间的 p1。没有安装或修改扩展。

实际生产包完整 UTF-8 字节数 **442864**，JavaScript UTF-16 code unit 长度 **431923**（CDP coverage 偏移采用此单位），SHA-256：

```text
36dfa0deac3c3555c484e7b23be89fb19ded2e651784ac834e1c3134037b7d3a
```

| 取证 | 桌面 | 移动 |
| --- | --- | --- |
| eval scriptId / URL | 53 / 空字符串 | 130 / 空字符串 |
| executionContextId | 1 | 14 |
| frameId | `03FDF106DFA576E0D5F0CE9371B85A60` | 同左 |
| loaderId | `0A8D92DB520B997C1701BDD6C872B306` | `3769042B2948B99198322F8B489AB72A` |
| 全长顶层范围 | 0–431923，count=1 | 0–431923，count=1 |
| 主要 IIFE 外层范围 | 70928–431918，count=1 | 70928–431918，count=1 |

两轮 actual 均与磁盘全文原样相等、哈希相等；前后产物哈希不变。事件关联为当前主文档 default context；不应在实现中假定可见 eval 一定属于 isolated world。身份条目同时包含 loader 包装脚本候选（桌面 34、移动 114），其 `exact:false` 只是它不是生产包，真正 bundle 候选为上表两项。

证据：`eh-desktop-identity.json`、`eh-mobile-identity.json`、`*-contexts-frames.json`、`*-coverage.json`、`*-script-53.js` / `*-script-130.js`。`Profiler.stopPreciseCoverage`、`Profiler.disable`、`Debugger.disable` 成功回执已保存。count 非零证明执行，不能据此认定 IIFE 每个分支、异步初始化或功能均成功。

`static-permissions-observation.json` 显示仓库 loader 与最终包的 6 个 grant 集合相等，4 个生产 connect 全部覆盖，并有 127.0.0.1、localhost 扩展。此项只证明静态声明；本轮没有逐项核验安装副本的完整 metadata/权限配置，也没有执行缺权限故障注入。

## EH viewport 生命周期与阻塞

桌面：阅读器自动打开时为 1200×900、DPR1、touch0、coarse=false，meta 为 `[]`。以实际 DOM 观察到的 `[title-content="关闭eHunter"]` 关闭，等待 visibility hidden，meta 仍为 `[]`；通过 `#ehunter-switch span:nth-child(2)` 正常重开，等待可见且 top=0，严格尺寸仍正确。见 `eh-desktop-close-result.json`、`eh-desktop-open-result.json`。

移动：身份轮初次观察为 1232×2666，DPR3/touch5/coarse=true，阅读器已经自动添加 managed viewport。该观察没有通过严格 CSS 检查。随后只读跨轮观察出现 DPR2/touch0/coarse=false，说明不能沿用上一轮模拟状态（`eh-mobile-ready-observation.json`）；该记录不是移动通过证据。

生命周期轮重新发送 `{width:390,height:844,deviceScaleFactor:3,mobile:true}` 和 `{enabled:true,maxTouchPoints:5}`，两条回执均为 `{}`。正常 UI 准备结果：

| 阶段 | innerWidth × innerHeight | DPR / touch / coarse | viewport meta |
| --- | --- | --- | --- |
| 已打开，准备关闭前 | 742×1606 | 3 / 5 / true | managed meta |
| 正常关闭后、重开前 | 742×1606 | 3 / 5 / true | `[]` |
| 正常重开，visibility visible、top=0 | **742×1606** | 3 / 5 / true | managed meta |

三个阶段的 documentElement client 与 visualViewport 均为 390×844、visualViewport scale=1。managed meta 的内容为 `width=device-width, initial-scale=1, viewport-fit=cover`，由产品正常开关写入。探针没有注入 meta、修改存储或改为 mobile=false。

严格门抛出并保存：

```text
Error: EH mobile strict opened CSS/DPR/touch preflight blocked
    at file:////[eval2]:15:126
```

第一次关闭已观察到 managed meta 被移除，与桌面原站无 meta 状态一致；重开后严格门失败，因此未执行计划中的第二次关闭/恢复断言。最初移动文档因自动打开过快，未取得自动打开前的原站 meta 快照；保存的是正常关闭后的原站观察。视口差异根因未调查，不将辅助尺寸正确解释为主尺寸通过。

## 日志、资源和后续范围

`eh-event-summary.json` 中，本轮新文档已捕获的事件没有 Runtime.exceptionThrown、console error/warning 或 Log error/warning。保存了导航前旧批并排除其身份用途。UI 后续轮没有重新启用全部日志域；因此其 finally 批次只能证明已捕获事件落盘，不能声称跨轮日志完整。正式 helper 必须在自身取证轮中持续启用域、单一收集并保存各阶段事件。CDP 缓冲容量及溢出行为仍 unknown，未测异常/保存失败矩阵。

资源归属与结尾状态：

- TaskSpace **2**，页面 **p1**；最后操作后仍为 agent 控制，未 finish、未 handOff。停在 EH 阅读器已打开状态；下一轮须重新配置模拟，不沿用此状态作证据。
- 上轮本任务 Vite：npm **26989**、监听 **27007**，cwd 本仓库，127.0.0.1:5173，见 `vite-service.json`。
- 本轮 bundle server：npm **30226**、监听 **30245**，cwd 本仓库，127.0.0.1:8787，见 `bundle-service.json`；HTTP 200、no-store 与文件哈希相同。
- 因本阶段阻塞，已停止这两项本任务服务；最终只读核实四个 PID 均已退出，5173/8787 均释放。清理两次命令先后 exit 1，分别为父进程自行退出导致 ProcessLookupError、退出中父进程无 cwd 导致归属断言失败；未继续向身份不明进程发信号。最终核实命令 exit 0，完整记录见 `service-cleanup.json`。
- 原始日志、一次性脚本、源码副本均保留作交付证据；用户已有扩展和存储保留。没有运行 npm run check、功能矩阵、截图视觉验收或正式审查。

主会话回填建议：代表模块与 EH 身份能力按其实际 scope 记录；EH 移动严格准备记 runtime/blocked，后续功能与截图 unrun。不要因身份命令 exit 0 写整分支通过，也不要把 lifecycle exit 1 直接经 acceptance.py run 转成产品 failed。acceptance.json 仍由主会话唯一写入。

报告复核记录见 `report-verification.json`：链接可读、六组 Vite 源码副本及两组 EH 全文相等、输入指纹不变、移动阻塞值与退出码、资源释放均已核对。首轮复核把 CDP UTF-16 偏移当作 Python 字符偏移，exit 1；修正复核脚本的偏移单位后 exit 0，未修改浏览器证据或结果。

两分钟下一步：主会话先查看 `eh-mobile-lifecycle-result.json` 的 reader-opened 记录，确认将严格 innerWidth/innerHeight 不符作为当前阻塞回填；随后决定安排独立视口原因调查还是调整规划。本子任务到此交回，不开始第 2 阶段。
