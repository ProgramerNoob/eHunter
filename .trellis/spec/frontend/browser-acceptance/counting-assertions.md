# 计数类断言与来源判定

- **DOM 计数不等于可见数量**：`DockWorkspace` 的 `.thumb-panel.side` 与 `.thumb-panel.bottom` 各持一份槽位内容，45 页图集会出现 90 个 `.thumb-container`（一份可见面板 + 一份 `display:none` 的备用槽位）。断言前按可见性过滤（`getBoundingClientRect().width > 0`），别把备用槽位当成重复渲染缺陷。
- **站点自带产物不是 eHunter 缺陷**：nhentai 图集 HTML 自带双后缀（实测 49 处 `.webp.webp`，如 `<meta itemprop="image" content="https://t3.nhentai.net/galleries/3799533/cover.webp.webp">`），`src/platform/nh/parser/IntroHtmlParser.ts` 读未改写的 `data-src` 或改写后的 `x-src`，`core/components/ThumbView.vue` 直接 `:src="thumbInfo.src"`，都不拼接后缀；遇到这类可疑串先回站点原始 HTML 复核。
- **控制台报错按脚本来源归因**：NH 页面上的 `Uncaught (in promise)` 可能来自站点自身 bundle（实测 `https://nhentai.net/_app/immutable/chunks/C2ITVdkK.js`），另有广告拦截导致的 `net::ERR_BLOCKED_BY_CLIENT` 与 Cloudflare RUM 的 `net::ERR_CONNECTION_CLOSED`。结合 helper 的当前文档 scriptId/context、来源和原始事件判断；原站/第三方错误保留影响供审阅，无法归因的严重错误先 blocked，不归为产品断言失败。
- **顶栏字段在窄视口会整体隐藏**：字段按与 `.float-content`（`float-content` 左边界）的重叠规则设 `display:none`，390 × 844 下全部字段被判重叠，属预期行为。另外 `store.showTopBar` 为 false 时 `.inner-content` 带 `.hide`，字段被 translateY 顶出视口（`getBoundingClientRect().top` 为负，点击会落空），核对顶栏前先点击 float-content 的「显示/隐藏顶栏」按钮。
- **首开弹窗先关掉再断言**：版本更新说明（`core/store/event.ts` 的 `checkNewVersionNotice`，`store.lastSeenVersionNotice !== appVersion` 时以 `isCompulsive` 打开）会盖住阅读器。可用选择器是 `.simple-modal .flat-button.operation > a`（`FlatButton.vue` 的点击落在内层 `<a>`）；点外层 `.operation`/`.flat-button` 或对 `body` 发 Enter 都无效。
- **过渡动画期间不算可见**：`Popover` 用 `slide-fade`、阅读器用 `slow-horizontal-fade`，刚触发时 `opacity` 仍为 0。可见性判定要求 `opacity > 0` 且矩形非零，模式切换还要同时要求目标容器存在、另一模式容器不存在。
- **菜单点选后菜单会关闭**：断言菜单项文案要取点击前快照，或重新打开菜单再读。
- **站点限流要计入验收节奏**：反复重载 nhentai 会触发 429（表现为 `TextReq … : 429` → `Platform initialization failed`），一轮验收尽量在单次加载会话内完成，重试前等待冷却。
- **可重试 TextReq 日志**：当前文档内 eHunter 日志只有同时包含 `TextReq: request error`、`retry:`，以及 `timed out` 或 `: 429` 的记录才可标为 `retryableTextReqError` 并保留给调用方审阅、不阻断准备；其他 eHunter severe 日志仍阻断。豁免不是网络长期健康通过，报告须保留实际重试次数、URL 和后续未验证范围。

