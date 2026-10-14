# 阻塞修复后的最终浏览器验收

日期：2026-10-14。本记录替代[修复前结果](current-runtime.md)的当前验收结论，保留旧日志作为根因与失败证据。空间仍为获准替代空间3/p1；没有更换浏览器、修改预检门禁、原站meta或真实存储来放行。

## 最终版本与自动检查

- 修改仅包括预检工具/入口文档，以及获准的 `core/store/event.ts` 可选通知降级和 `src/main.ts` EH移动根节点溢出生命周期。通用TextReq/PlatformService、业务更新源、loader权限均未改。
- [冻结指纹](../../../../../../.tmp/browser-preflight/post-fix-runtime/frozen-inputs.json)列出代码、测试、规范与生产包。生产包443809字节，SHA-256 `e6e18cc2137d33aed3cfd6bdb84cac7ed2c67c60d091f4c0e8badb6fbd153bee`。
- [完整检查](../../../../../../.tmp/browser-preflight/post-fix-runtime/build-command.json)实际执行 `npm run check` 返回0：类型检查、37项Python、46项存储、96项预检、50项通知/入口生命周期，以及生产构建通过。实际环境Node24.18.0/Python3.13.14；未另行验证推荐的Node22/Python3.12或远端CI。
- [修复前失败与修复后50项回归](../../../../../../.tmp/browser-preflight/blocker-fix/implementation.md)覆盖原生/GM通知网络、HTTP、正文、解析、超时、晚到结果、成功门槛、真实UI/存储异常，以及普通/错误关闭、重复开关、根节点属性priority和桌面/非EH隔离。DOM夹具不声称证明真实CSS布局。

## 四轮真实运行

| 场景 | 当前执行与环境 | 实际操作及证据 |
| --- | --- | --- |
| Vite桌面 | 120个实际加载项目模块全文与执行通过；1200×900/DPR1/触摸0 | 打开、书页/卷轴、关闭重开、更新请求结束后继续阅读；[结果与5张截图](../../../../../../.tmp/browser-preflight/post-fix-runtime/vite-desktop-complete/result.json) |
| Vite移动 | 120个模块；390×844/DPR3/触摸5/coarse；mobile true回执 | 两模式、关闭重开、更新结束；[结果与4张截图](../../../../../../.tmp/browser-preflight/post-fix-runtime/vite-mobile-v2/result.json) |
| EH桌面 | 当前完整生产包唯一候选全文相等且执行；1200×900/DPR1/触摸0 | 标题与1/136、书页/卷轴、缩略图加载并定位第2页、关闭重开、更新结束；[结果与4张截图](../../../../../../.tmp/browser-preflight/post-fix-runtime/eh-desktop-complete/result.json) |
| EH移动 | 当前完整生产包唯一候选全文相等且执行；严格390×844/DPR3/触摸5/coarse；mobile true回执 | 标题与1/136、两模式、缩略图第2页、普通关闭与重开；根节点overflow值/priority和原站viewport恢复；[结果与4张截图](../../../../../../.tmp/browser-preflight/post-fix-runtime/eh-mobile-v3/result.json) |

四个命令均实际退出0、功能回调执行一次、helper最终passed，原始事件和finally已保存。每轮 `maxConcurrent:1`、`unresolved:[]`、`timeouts:[]`；没有当前产品severe或未捕获异常。EH移动修复前inner1232×2666，修复后打开及重开均为390×844，测试没有以client/visual尺寸代替inner断言。

远端更新服务仍不可用。四轮均观察到请求结束后的 `Remote update notice unavailable; skipping` 诊断（原生TypeError/GM_xhr error, 0），之后模式/开关仍可操作。Vite原生网络资源错误保留为外部请求影响，未白名单产品console.error。GM请求不可取消和晚到结果限制由测试与设计说明。

## 截图与测试脚本修正

主会话逐张读取了上表17张PNG；尺寸为1200×900或390×844、CSS scale，确认书页/卷轴、当前页和缩略图呈现，无Vite错误遮罩。移动视口下部分顶栏项会因空间不足隐藏，模式入口使用实际设置界面/正常缩略图开关使控件可见；临时设置在测试内恢复。没有以不可见元素强制点击或注入布局来替代用户操作。图像内容为实际EH首屏及TEST素材，不代表其余136页均已加载。

早期脚本存在重复文本选择器、移动顶栏隐藏和外层执行时间不足等问题，失败记录保留；最终通过使用上表四个目录。EH mobile-v2的外层90秒超时不能作为通过证据，最终v3扩大的是整轮脚本预算，产品请求15秒与每阶段严格检查不变。一次临时runner目录配置误用已留[说明](../../../../../../.tmp/browser-preflight/post-fix-runtime/runner-path-collision.md)，最终验收只引用明确核对过的新目录。

## 权限、异常与范围

[最终产物权限矩阵](../../../../../../.tmp/browser-preflight/post-fix-runtime/permissions-summary.json)通过：6项grant集合相等，4个生产connect及本地host覆盖；仅.tmp缺GM_download/缺hath.network的副本均在导航前blocked，callback0。浏览器安装状态另见[安装前提](../../../../../../.tmp/browser-preflight/post-fix-runtime/installation.json)，动态loader1.0.2启用、静态eHunter3.1.0停用。

预检本身未再修改，[受控浏览器异常矩阵](../../../../../../.tmp/browser-preflight/current-runtime/negative-v2-summary.json)的同一helper指纹仍有效：正常callback1；错误CSS、旧源码、导航超时均callback0、截图0，已捕获事件与finally保留。这是受控HTTP夹具，不冒充产品Vite。文件保存/采集失败、历史文档、严重日志等其余负例由96项工具回归覆盖。

未验证：物理移动设备/其他浏览器、NH真站、未触发懒加载分支、整个工作树执行覆盖、独立资源与JS同等级身份、严格手势时序。共享通知逻辑已用真实PlatformService的原生/GM分支回归；EH移动样式接管限定EH，NH/TEST及桌面无接管由入口测试覆盖。没有改基础请求层，因此不把本轮EH结果外推为NH实际平台通过。

[正式审查](../../../../../../.tmp/browser-preflight/post-fix-runtime/final-review/review.md)已完成Standards与Spec核对，未发现产品/测试缺陷；唯一P3规范函数名已由主会话改为实际`restoreEHViewportOnClose()`并补充索引入口。主会话重新验证文档与记录，不重跑未变化的产品测试。

[资源清理](../../../../../../.tmp/browser-preflight/post-fix-runtime/cleanup.json)确认Vite/npm及bundle/npm四个所属进程退出、5175/8787释放；[空间3已正常结束](../../../../../../.tmp/browser-preflight/post-fix-runtime/space-finished.json)，仅调用一次finish，保留用户资源与存储。研究、实现和正式审查代理均已结束。最终协议汇总由acceptance.py计算，详见任务acceptance.json。
