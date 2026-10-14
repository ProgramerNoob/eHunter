# 修复前版本运行记录（尚未完成验收）

2026-10-12 17:18–17:37 UTC。主会话在修正 favicon 错误归因后复测；本报告对应修复前 helper SHA-256 `82b405f1568dcdc38adb783cc06bce3a6be24be73d1f558aa2fd1c55f4a6dcbc`，仅记录该版本的历史浏览器观察。后续 helper 已增加事件收集串行化、EH 全活动脚本识别和 metadata 名称边界；本报告不能证明修复后的真实浏览器回归。任务仍为 `in_progress`，没有验收豁免、提交或归档。

## 该历史版本的自动检查与改动

- `node --test tests/browser-preflight.test.mjs`：当时70项通过。后续96项固定版本检查见 [正式检查报告](../../../../../../.tmp/browser-preflight/formal-check-20261013/review.md)，不以本报告替代。
- `npm run check`：当时类型检查、37项Python、46项存储、70项preflight及生产构建通过，见 [历史日志](../../../../../../.tmp/acceptance/10-12-browser-acceptance-preflight/tmpczizk9iq.log)。没有 lint 脚本，未声称 lint 或远端 CI 通过。
- 新增 helper 与工具测试；修改 package 测试链、通用浏览器指南、EH 技能与质量指南。未修改产品、loader 或锁文件。
- 该轮修复了 Vite 同源 favicon 404 被归为 eHunter 的问题，并新增 favicon 与项目模块错误的区分测试。

## 真实入口与未满足范围

证据根目录：[final-verification](../../../../../../.tmp/browser-preflight/final-verification)。全部复用空间2/p1，没有替换浏览器、清用户缓存、改用户存储、注入 viewport 或放宽完整源码比较。

| 检查 | 历史观察 | 已验证及阻塞 |
| --- | --- | --- |
| Vite 桌面 | blocked | 当前服务5174的全部120个已加载项目模块完整文本及顶层执行通过；1200×900、DPR1、touch0/coarse false通过。截图后发现 eHunter 更新请求 `net::ERR_HTTP2_PROTOCOL_ERROR` / `TextReq: request error`，后续开关恢复和模式切换未验收。 |
| Vite 移动 | blocked | 同120个模块全部通过；390×844、DPR3、touch5/coarse true通过。初始截图已实际读取：窄屏 TEST 阅读器及顶栏可见。`select-book timed out after 15000ms`，finally还保留更新请求错误；模式切换、关闭恢复、重新打开未完成。 |
| EH 桌面 | blocked | 完整生产 eval SHA-256等于最终dist、同script全长执行count1；1200×900、DPR1、touch0/coarse false通过。真实标题与1/136断言通过。`switch-book:waiting:events` 再次出现 `page.events timed out after 15000ms`；缩略图定位、模式切换、关闭恢复及重新打开未验证。未确认该超时的根因，不把它写成产品断言失败。 |
| EH 移动 | blocked | 保留前轮完整eval及执行取证；严格CSS实际1232×2666，期望390×844，DPR3/touch5/coarse true与mobile true命令回执成立。前期另一次实测742×1606；两者均不通过，不用client/visual尺寸代替inner尺寸。功能回调0、截图0；本轮没有改产品以解除该阻塞。 |

Vite原5173的四个模块完整文本不一致来自旧的内联sourcesContent。在本任务独立新origin5174上，120/120全文与执行通过，不再出现这四处差异；没有trim、删除source map或其他归一化。由此仅能确认该历史新origin通过身份门，具体缓存机制仍未证明。

EH产物UTF-8为442864字节，SHA-256 `36dfa0deac3c3555c484e7b23be89fb19ded2e651784ac834e1c3134037b7d3a`。本轮实际源码身份、文档/context及coverage范围见 `eh-desktop-recheck/identity.jsonl`。安装前提沿用只读证据：Tampermonkey5.5.0、动态loader1.0.2启用、静态eHunter3.1.0停用；没有从磁盘文件推导安装副本完整metadata已核验。

桌面、移动和EH各轮保存了command execution、初始manifest、原始commands/events批次、全文副本、identity、environment及result。EH事件超时仍保存先前批次、错误、finally和停用后的批次；没有宣称所有缓冲事件无丢失。Vite桌面截图文件虽然已写入，但其后检查失败，本报告不记为截图验收通过。EH前轮截图的缩略图空白/等待提示仍只构成部分视觉观察。

## 该历史版本的异常与权限复测

[negative-recheck-summary.json](../../../../../../.tmp/browser-preflight/final-verification/negative-recheck-summary.json)：真实浏览器受控HTTP夹具正常对照passed/callback1；错误CSS、同长度旧文本及1500ms导航load超时均blocked/callback0/screenshot0，finally日志可读。矩阵断言实际退出0；HTTP夹具明确不是产品Vite服务。

[permissions-summary.json](../../../../../../.tmp/browser-preflight/final-verification/permissions-summary.json)：最终产物的6个grant与仓库loader完全相等，4个生产connect被覆盖，本地127.0.0.1/localhost扩展允许；副本少 `GM_download` 或 `hath.network` 时均在导航前blocked、navigate0、callback0。该结果仅证明仓库声明，浏览器安装副本完整声明及所有实际请求未验证。

## 资源与交付状态

[cleanup.json](../../../../../../.tmp/browser-preflight/final-verification/cleanup.json) 确认本轮Vite的npm/监听PID59172/59191、bundle的63124/63143及夹具64643全部退出；5173、5174、8787、8788均释放。用户资源和全部必要证据保留。空间2/p1为agent所有并回到about:blank；因浏览器验证blocked，遵守Ego的成功专用finish约束而保留空间。

主会话将按逐项协议回填真实执行信息；工具不写acceptance.json。运行blocked不经 `acceptance.py run` 自动映射。最终正式审查与gate结果另行记录；在必需浏览器项未满足前，任务不完成、不提交、不归档。

后续固定版本静态审查及原空间消失见 [空间检查](resume-space-check.md)；获准替代空间3的当前helper回归见 [当前运行记录](current-runtime.md)。本报告的历史资源状态不代表当前状态。
