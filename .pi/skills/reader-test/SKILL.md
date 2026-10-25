---
name: reader-test
description: 验证 eHunter 在 EH（exhentai.org）与 NH（nhentai.net）平台的生产包端到端行为。用于平台代码变更后的回归、发布前验收，以及生产构建、脚本注入和初始化错误排查。
license: MIT
compatibility: "pi；需要 bash、Node.js/npm、ego-browser CLI，以及在 Ego 中配置 Tampermonkey 的测试环境；platform: eh 还需 Ego 已登录 exhentai.org。"
metadata:
  platform: exhentai, nhentai
  type: e2e-test
---

# EH/NH 平台测试

构建生产包，在 EH 图片页或 NH gallery 页验证脚本注入、控制台和阅读器功能。任务空间、固定 profile、证据采集、失败回填与收尾流程以 [浏览器验收指南](../../../.trellis/spec/frontend/browser-acceptance.md) 为准；本技能只维护 EH/NH 生产包特有的构建、bundle server、loader、准备门差异和功能清单。

## 在 pi 中调用

```text
/skill:reader-test
/skill:reader-test platform: nh url: https://nhentai.net/g/688467/1/
/skill:reader-test mode: quick tests: first-screen, mode-switch
```

pi 将命令后的文本作为用户指令附在技能正文之后。解析下列参数，并把 `platform` 的结果作为环境变量 `PLATFORM`（`eh` 或 `nh`）。每次 `bash` 调用都是新 shell，变量不会跨调用保留：bash 块内用 `export PLATFORM="${PLATFORM:-eh}"` 传给同一次调用的子进程，`ego-browser nodejs` 每次启动都要显式加 `PLATFORM=<eh|nh>` 前缀。下文不再重新判断平台。

| 参数 | 取值 | 缺省 |
| --- | --- | --- |
| `platform` | `eh`、`nh`；其他值直接报错并停止，不推测平台 | `eh` |
| `url` | 覆盖默认页；`eh` 优先可访问的 `/s/` 页，`nh` 需匹配 `/g/<id>/<page>/` | 见平台差异表 |
| `tests` | 功能清单的项名，逗号分隔；重点验证指定项并补齐本次改动涉及的强制验收 | 完整清单 |
| `mode` | `quick` 只检查构建、注入、控制台和 DOM | 完整流程 |

下文的命令和产物路径均相对于仓库根目录；先从本技能目录向上三级定位仓库根目录，再执行命令。

## 平台差异

| 项 | `platform: eh` | `platform: nh` |
| --- | --- | --- |
| 页面形态 | `/s/<hash>/<gid>-<page>` | `/g/<id>/<page>/` |
| `source.kind` | `'eh'` | `'nh'` |
| 登录前置 | Ego 已登录 exhentai.org，`installation.loggedIn === true` | 不需要 `loggedIn` |
| `installation` 必填字段 | `loggedIn`、`dynamicLoaderEnabled`、`staticScriptDisabled` | `dynamicLoaderEnabled`、`staticScriptDisabled` |
| 默认页 | `https://exhentai.org/s/80813c92df/3482416-1` | `https://nhentai.net/g/688467/1/`；不可访问时现场选取其他 `/g/<id>/1/` 并记录实际地址 |
| 原图/换源 | 平台支持时验证 | N/A（`isSupportOriginImg()`、`isSupportImgChangeSource()` 返回 `false`） |
| 准备阻塞 | 登录页 / 403 / Sad Panda | Cloudflare 挑战、地区封锁、429 |
| 验收节奏 | 常规 | 单次加载会话内完成；重试前等待冷却，进度放慢先归因到准备阻塞，不记为产品断言失败 |

两种平台共用构建、bundle server、准备门、证据与报告流程，差异以上表为准。

## 测试流程

### 1. 构建生产包

```bash
export PLATFORM="${PLATFORM:-eh}"  # eh | nh，来自解析参数
mkdir -p ".tmp/reader-test-$PLATFORM"
npm run build-prod > ".tmp/reader-test-$PLATFORM/build-prod.log" 2>&1
```

保存命令、cwd、起止时间及实际退出码。只有退出码 0 且 `dist/ehunter.iife.js` 存在、非空才继续；失败停止后续浏览器验收。`source.build` 引用这条实际结果和可读日志，不能只填一个 0。TypeScript 问题用 `npm run type-check` 定位。

### 2. 启动并核实 bundle server

本流程只使用生产 bundle server。先按通用指南核对旧服务归属（保留用户已有或归属不明的服务），再在仓库根目录后台启动：

```bash
export PLATFORM="${PLATFORM:-eh}"  # eh | nh，来自解析参数
mkdir -p ".tmp/reader-test-$PLATFORM"
npm run serve:bundle > ".tmp/reader-test-$PLATFORM/bundle-server.log" 2>&1 &
echo "$!" > ".tmp/reader-test-$PLATFORM/bundle-server.pid"
```

用 `lsof -nP -iTCP:8787 -sTCP:LISTEN`、`lsof -a -p PID -d cwd` 和 `curl --fail --silent --show-error http://127.0.0.1:8787/ehunter.iife.js` 核实监听者、目录和实际 URL；保存 npm 父进程、监听 PID 与核实输出。端口冲突时改用 `PORT=<其他端口> npm run serve:bundle`，同步 loader 的 `EHUNTER_BUNDLE_URL` 与模板的 `bundleUrl`，并核实浏览器安装副本；停止冲突进程按归属确认。

默认 bundle URL 为 `http://127.0.0.1:8787/ehunter.iife.js`（`scripts/serve-bundle.mjs` 的 `HOST`/`PORT` 环境变量可改，默认端口 8787）。server 每请求重新读盘并返回 `cache-control: no-store`，可达性只证明服务可访问，当前文档执行身份仍由准备门确认。

### 3. 确认浏览器前置

读取当前会话的 `ego-browser` 技能，按通用指南创建或复用同一任务空间；连接故障按该技能排查，缺少必需能力时报告具体阻塞项。每轮用 `PLATFORM=<eh|nh> ego-browser nodejs <<'JS'` 启动——每次 `bash` 调用都是新 shell，「构建生产包」与「启动并核实 bundle server」两段里的 `export` 不会留到下一轮，必须逐次带上平台前缀。按平台把本轮登录与安装检查依据保存到 `.tmp/reader-test-<platform>/`：仓库 loader 声明与浏览器安装副本分别核实。

- `platform: eh`：确认 Ego 已登录 exhentai.org。
- `platform: nh`：不要求登录态，`installation` 不写 `loggedIn`。
- 两种平台都需 Tampermonkey 已启用动态加载脚本、停用所有静态 eHunter 脚本。
- 动态脚本为相邻的 [ehunter-dev-loader.user.js](ehunter-dev-loader.user.js)，Tampermonkey 中名为 `eHunter (dev loader)`。它通过 HTTP 获取并 eval 生产包，沙箱权限来自安装的 loader；更新仓库文件不会自动更新安装副本。生产 metadata 变化时同步并核实安装副本，避免静态脚本双注入。
- 遇 `Access to this local file is forbidden` 使用 HTTP 动态加载；其他浏览器的扩展/登录状态不属于 Ego。页面访问不到 `GM_info` 不足以判定 Tampermonkey 未安装，结合扩展和安装脚本状态核实。

日志、截图、安装记录、构建与服务证据都放在 `.tmp/reader-test-<platform>/`，每轮使用新的绝对产物目录，并保存外层 `ego-browser nodejs` 调用的起止时间、退出码及 stdout/stderr。同一轮产物留在本平台目录下，不混用其他平台的目录。

### 4. 准备 source

变量 `root` 为真实仓库绝对路径；`buildExecution.exitCode`、`buildLogPath` 来自构建生产包；`installationFacts`、`installationEvidencePath` 来自浏览器前置核实；`actualBundleUrl` 与 server 及安装 loader 的 URL 一致；`readerPageUrl` 按平台差异表的默认页或用户指定的可访问页。

`source` 模板只有一份，平台差异由平台差异表承载：`installation` 的 `loggedIn` 只在 `eh` 出现，`kind` 与默认页按平台取。

```js
const PLATFORM = process.env.PLATFORM; // 'eh' | 'nh'，来自 `PLATFORM=<eh|nh> ego-browser nodejs` 前缀
if (PLATFORM !== 'eh' && PLATFORM !== 'nh') throw new Error(`PLATFORM 未设置为 eh 或 nh（实际：${PLATFORM}）`);
const source = {
  kind: PLATFORM,
  bundlePath: `${root}/dist/ehunter.iife.js`,
  loaderPath: `${root}/.pi/skills/reader-test/ehunter-dev-loader.user.js`,
  bundleUrl: actualBundleUrl,
  build: { exitCode: buildExecution.exitCode, evidence: buildLogPath },
  installation: {
    ...(PLATFORM === 'eh' ? { loggedIn: installationFacts.loggedIn } : {}),
    dynamicLoaderEnabled: installationFacts.dynamicLoaderEnabled,
    staticScriptDisabled: installationFacts.staticScriptDisabled,
    evidence: installationEvidencePath,
  },
};
const navigate = ({ timeoutMs }) => page.goto(readerPageUrl, {
  waitUntil: 'domcontentloaded', timeout: timeoutMs,
});
```

EH 给出 `/g/` 页时，先通过正常页面进入一张图片并记录实际地址；默认地址失效时取得可访问图片页。复用 [通用指南的一轮调用](../../../.trellis/spec/frontend/browser-acceptance.md#一轮调用)，在 options 中使用本模板的 `source, navigate`，并以正常 UI `prepareReader` 打开阅读器。构建后需忽略缓存刷新时，将 `navigate` 换为 `({ timeoutMs }) => page.cdp('Page.reload', { ignoreCache: true }, { timeout: timeoutMs })`。每轮 helper 配置域/模拟、确认新文档，再取证，调用方不另调 `page.events()`。

helper 对最终产物完整 UTF-8 字节与仓库 loader 留指纹，核对实际 metadata 的 `grant(loader) == grant(bundle)`、`connect(loader) ⊇ connect(bundle)` 及 `bundleUrl` 的 host；这只证明仓库声明，安装副本的权限与启用状态由上一步证据单独确认。

### 5. 通过准备门

准备门即 helper 的预检：当前完整包执行证据、初始化与日志、严格环境（CSS 视口 / DPR / 移动能力、文档身份）全部通过，且必要事件已保存。通过判定标准是 helper 未 blocked，断言覆盖清单见 [指南 4.5 节](../../../.trellis/spec/frontend/browser-acceptance.md#45-预检断言覆盖清单)。

blocked 时按其输出的具体差异处理——重复注入、旧包候选、权限缺项、视口不符、vite-error-overlay 或必需模块缺失各有对应修法；不以 HTTP 响应、loader 日志或挂载 DOM 降级替代，也不再用自算的身份比对绕过。必需取证能力不可用时返回规划。异常、超时与写盘失败按 [通用证据/回填流程](../../../.trellis/spec/frontend/browser-acceptance.md#4-证据截图和失败回填) 保存并传播非零；认证问题按 Ego 接管流程处理。挂载/执行证据不等于异步平台初始化成功；打开前原站观察与打开后阅读器观察分别保存。

### 6. 验证功能与视觉效果

在 `runChecks` 内按 [通用阶段接口](../../../.trellis/spec/frontend/browser-acceptance.md#3-功能阶段与观察) 执行关键交互、产品断言及截图。完整流程默认覆盖下列项目（括号内为 `tests` 项名）；指定 `tests` 时重点验证指定项，并补齐本次改动涉及的仓库强制验收项：

- 首屏标题、总页数和当前页正确（`first-screen`）。
- 缩略图正常加载，布局、展开和定位正确（`thumbnail`）。
- 阅读器可以打开、关闭，书页模式与卷轴模式可以切换（`mode-switch`）。
- 图片加载正常，上一页、下一页和跳页操作正确（`paging`）。
- 设置面板可以打开、修改和关闭（`settings`）。
- 缓存读写正常；优先通过页面行为或受支持的存储接口验证，不清空用户缓存（`cache`）。
- 涉及抓取、解析或缓存时，验证原图与换源功能（`origin-img`）；`platform: nh` 该项为 N/A，记录为 N/A 而不是 failed。

UI 改动分别用通用指南的 desktop / mobile 固定 profile 运行预检、关键交互和截图；`mode: quick` 同样通过准备门，只缩小功能范围。响应式断点、截图读取和 NH 基础请求层回归按通用指南与仓库要求执行，实际覆盖范围据实记录。NH 页面自带的 `Uncaught (in promise)`、广告拦截或 Cloudflare RUM 错误按脚本来源归因，不上升为产品失败；无法归因的严重错误先记 blocked。

### 6.1 制造失败与等待状态

以下是平台验收常用的三种手法，都必须在 `withBrowserPreflight` 的 `navigate` 内、`page.goto` 之前完成设置，否则已有文档不受影响：

- **拦截图片请求**：`await page.cdp('Network.enable', {}); await page.cdp('Network.setBlockedURLs', { urls: [...] })`。EH 整图域为 `*.hath.network`（含带端口的主机，用 `*hath.network*` 匹配）；NH 整图域为 `i<n>.nhentai.net`（用 `*://i*.nhentai.net/galleries/*`，不要连带缩略图的 `t<n>` 域，否则阅读器起不来）。被拦截的请求在 `Network.loadingFailed` 里 `errorText` 为空、`blockedReason` 为 `inspector`。
- **统计抓取次数**：用 `performance.getEntriesByType('resource')` 按 URL 形状分组，不要用 CDP 事件条数。EH 形如 `/(\d{3})\.(?:webp|jpg|png|gif)/`，NH 形如 `/^https:\/\/i\d\.nhentai\.net\/galleries\/\d+\/(\d+)\./`；断言的数字是**图片请求数**，不等于 `getImgSrc` 调用次数——阶段可以在拿到新图地址前就失败，所以 `gained` 只做区间断言，用界面上的重试计数（`[重载-N]`）做精确口径。
- **等状态收敛**：不要在 phase 里用长 `page.waitForTimeout`，也不要 `page.cdp('Runtime.evaluate', { awaitPromise: true })` 等一个长 Promise——`page.events timed out` 与 `CdpRequestTimeoutError` 都会让整轮 blocked。改用短间隔轮询：连续多次采样结果完全一致且已过最小等待时间才返回，并用 `page.waitForFunction` 等具体 DOM 条件。轮询的总预算必须小于本轮 `options.timeoutMs`（上限 60000），否则同样超时。

单页可有多个 `<img>` 渲染位（卷轴模式下 `core/components/AlbumScrollView.vue` 的 `.preload` 区会预渲染下一页），所以运行时请求数不等于单个 `PageView` 实例的预算；按单页统计时用同一页 URL 的分组计数。

### 7. 输出报告与收尾

报告写入 `.tmp/test-reports/reader-test-<platform>-<timestamp>.md`，包含：时间、实际测试 URL、平台、测试模式和范围；构建/服务/安装前提依据、helper 产物目录、当前文档身份、初始化、控制台来源及影响；各项实际 passed、failed、blocked 或 unrun（失败附复现步骤，阻塞列明准备条件与下游未执行范围）；桌面端、移动端及相关断点的截图路径；阻塞项与可执行的下一步，明确区分已验证和未验证部分。

主会话按通用指南回填逐项 `acceptance.json`，引用实际命令日志和 helper 证据；准备 blocked 与产品断言 failed 分开，不手写整体 passed，构建成功不能替代功能验收。

随后按 [通用收尾/接管流程](../../../.trellis/spec/frontend/browser-acceptance.md#5-收尾或交还用户) 完成收尾：停止本轮 server 并确认进程退出、端口释放，关闭 agent-owned 页面（`await task.finish({ keep: [] })`，需保留的页面显式记为 `open`），用 `cleanup-browser` 生成资源报告并输出到 `.tmp/reader-test-<platform>/cleanup-browser.json`。页面、服务声明字段与分类见指南的资源清理检查；user-owned 资源保留不清理。阻塞/接管时保留同一空间并按 Ego 规则处理。最终回复前执行完成通知。
