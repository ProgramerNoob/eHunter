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

构建生产包，在 EH 图片页或 NH gallery 页验证脚本注入、控制台和阅读器功能。遵循仓库 [AGENTS.md](../../../AGENTS.md) 的验收要求。

## 在 pi 中调用

```text
/skill:reader-test
/skill:reader-test platform: nh
/skill:reader-test platform: nh url: https://nhentai.net/g/688467/1/
/skill:reader-test url: https://exhentai.org/s/80813c92df/3482416-1
/skill:reader-test platform: eh tests: book-mode, scroll-mode, thumbnail-expand
/skill:reader-test mode: quick
```

pi 将命令后的文本作为用户指令附在技能正文之后。解析其中的 `platform`、`url`、`tests` 和 `mode`；没有参数时按 `platform: eh` 执行完整流程。`platform` 只接受 `eh` 或 `nh`，其他值直接报错，不推测平台。`mode: quick` 只检查构建、注入、控制台和 DOM；功能改动仍需完成仓库要求的对应功能验收。

下文的命令和产物路径均相对于仓库根目录；先从本技能目录向上三级定位仓库目录，再执行命令。

## 平台差异

| 项 | `platform: eh` | `platform: nh` |
| --- | --- | --- |
| 页面形态 | `/s/<hash>/<gid>-<page>` | `/g/<id>/<page>/` |
| `source.kind` | `'eh'` | `'nh'` |
| 登录前置 | Ego 已登录 exhentai.org，`installation.loggedIn === true` | 不需要 `loggedIn` |
| 必填 installation 字段 | `loggedIn`、`dynamicLoaderEnabled`、`staticScriptDisabled` | `dynamicLoaderEnabled`、`staticScriptDisabled` |
| 默认页 | `https://exhentai.org/s/80813c92df/3482416-1` | `https://nhentai.net/g/688467/1/`；不可访问时现场选取其他 `/g/<id>/1/` 并记录实际地址 |
| 原图/换源 | 平台支持时验证 | N/A（`isSupportOriginImg()`、`isSupportImgChangeSource()` 返回 `false`） |
| 主要准备阻塞 | 登录页 / 403 / Sad Panda | Cloudflare 挑战、地区封锁、429 |
| 验收节奏 | 常规 | 单次加载会话内完成；重试前等待冷却，429 归为准备阻塞或准备失败，不记为产品断言失败 |

两种平台共用准备、构建、bundle server、准备门、证据与报告流程，差异以上表为准。

## 准备

1. 读取相邻的 [notify-complete](../notify-complete/SKILL.md)，在测试开始前执行短通知，任务完成后执行长通知；用户明确静音时跳过。
2. 读取当前会话的 `ego-browser` 技能和 [浏览器验收指南](../../../.trellis/spec/frontend/browser-acceptance.md)，通过 pi 的 `bash` 工具运行 `ego-browser nodejs`。按指南创建或复用同一任务空间；连接故障按技能排查，缺少必需能力时报告具体阻塞项。
3. 按平台确认浏览器前置，将本轮登录与安装检查依据保存到 `.tmp/reader-test-<platform>/` 可读文件；仓库 loader 声明与浏览器安装副本分别核实。
   - `platform: eh`：确认 Ego 已登录 exhentai.org。
   - `platform: nh`：不要求登录态，`installation` 不写 `loggedIn`；Cloudflare 挑战、地区封锁与 429 属于准备阻塞。
   - 两种平台都需 Tampermonkey 已启用动态加载脚本、停用所有静态 eHunter 脚本。
   - 动态脚本为相邻的 [ehunter-dev-loader.user.js](ehunter-dev-loader.user.js)，Tampermonkey 中名为 `eHunter (dev loader)`。它通过 HTTP 获取并 eval 生产包，沙箱权限来自安装的 loader；更新仓库文件不会自动更新安装副本。生产 metadata 变化时同步并核实安装副本，避免静态脚本双注入。
   - 默认 bundle URL 为 `http://127.0.0.1:8787/ehunter.iife.js`。server 每请求重新读盘并返回 `cache-control: no-store`，可达性只证明服务可访问，当前文档执行身份仍由预检确认。
   - 遇 `Access to this local file is forbidden` 使用 HTTP 动态加载；其他浏览器的扩展/登录状态不属于 Ego。页面访问不到 `GM_info` 不足以判定 Tampermonkey 未安装，结合扩展和安装脚本状态核实。
4. 本流程只使用生产 bundle server。先执行下文步骤1并保存成功构建记录，再按通用指南核对旧服务的具体 PID、命令和 cwd；保留用户已有或归属不明的服务。在仓库根目录后台启动并核实：

```bash
PLATFORM=${PLATFORM:-eh}  # eh | nh，与测试流程步骤1保持一致
mkdir -p ".tmp/reader-test-$PLATFORM"
npm run serve:bundle > ".tmp/reader-test-$PLATFORM/bundle-server.log" 2>&1 &
echo "$!" > ".tmp/reader-test-$PLATFORM/bundle-server.pid"
```

用 `lsof -nP -iTCP:8787 -sTCP:LISTEN`、`lsof -a -p PID -d cwd` 及 `curl --fail --silent --show-error http://127.0.0.1:8787/ehunter.iife.js` 核实监听者、目录和实际 URL，保存 npm 父进程、监听 PID 与核实输出。端口冲突时用 `PORT=<其他端口> npm run serve:bundle`，同步 loader 的 `EHUNTER_BUNDLE_URL` 与下文 `bundleUrl`，并核实浏览器安装副本；停止冲突进程按归属确认。

5. 日志、截图、安装记录、构建与服务证据均保存到仓库 `.tmp/reader-test-<platform>/`。按通用指南创建/复用同一任务空间；每轮在此基础上使用新的绝对产物目录，保存外层 `ego-browser nodejs` 调用的开始/结束时间、退出码及 stdout/stderr。同一轮内的准备、运行与收尾产物留在该平台目录下，不混用其他平台的目录。

## 测试流程

### 1. 构建生产包

用 `bash` 在仓库根目录执行：

```bash
PLATFORM=${PLATFORM:-eh}  # eh | nh，与准备第4步一致
mkdir -p ".tmp/reader-test-$PLATFORM"
npm run build-prod > ".tmp/reader-test-$PLATFORM/build-prod.log" 2>&1
```

保存本次命令、cwd、开始/结束时间及实际退出码。只有退出码0且 `dist/ehunter.iife.js` 存在、非空才继续启动/核实 server；失败停止后续浏览器验收。`source.build` 引用这份实际结果和可读日志，不能只填一个0。TypeScript 问题可用 `npm run type-check` 定位。

### 2. 准备 source

按 `platform` 选择页面与 `source`。变量 `root` 为真实仓库绝对路径；`buildExecution.exitCode`、`buildLogPath` 来自步骤1；`installationFacts`、`installationEvidencePath` 来自本轮登录和安装核实；`actualBundleUrl` 与 server 及安装 loader 的 URL 一致。

`platform: eh` 默认图片页为 `https://exhentai.org/s/80813c92df/3482416-1`，优先使用用户指定的可访问 `/s/` 页面。若给出 `/g/` 页，先通过正常页面进入一张图片，记录实际地址；默认地址失效时取得可访问图片页。登录页、403、Sad Panda 或权限提示属于准备阻塞，按 Ego 技能交还同一空间。

```js
const source = {
  kind: 'eh',
  bundlePath: `${root}/dist/ehunter.iife.js`,
  loaderPath: `${root}/.pi/skills/reader-test/ehunter-dev-loader.user.js`,
  bundleUrl: actualBundleUrl,
  build: { exitCode: buildExecution.exitCode, evidence: buildLogPath },
  installation: {
    loggedIn: installationFacts.loggedIn,
    dynamicLoaderEnabled: installationFacts.dynamicLoaderEnabled,
    staticScriptDisabled: installationFacts.staticScriptDisabled,
    evidence: installationEvidencePath,
  },
};
const navigate = ({ timeoutMs }) => page.goto(ehImagePageUrl, {
  waitUntil: 'domcontentloaded', timeout: timeoutMs,
});
```

`platform: nh` 默认页为 `https://nhentai.net/g/688467/1/`，要求当前文档 URL 匹配 `/g/<id>/<page>/`；优先使用用户指定的可访问 gallery，默认地址不可访问时现场选取其他 `/g/<id>/1/` 并记录实际地址。NH 不需要 `loggedIn`，`installation` 只写下列字段；照抄 EH 模板的 `loggedIn` 会引入不必要的失败。Cloudflare 挑战、地区封锁或 429 属于准备阻塞，按 Ego 技能交还同一空间；一轮验收尽量在单次加载会话内完成，重试前等待冷却。

```js
const source = {
  kind: 'nh',
  bundlePath: `${root}/dist/ehunter.iife.js`,
  loaderPath: `${root}/.pi/skills/reader-test/ehunter-dev-loader.user.js`,
  bundleUrl: actualBundleUrl,
  build: { exitCode: buildExecution.exitCode, evidence: buildLogPath },
  installation: {
    dynamicLoaderEnabled: installationFacts.dynamicLoaderEnabled,
    staticScriptDisabled: installationFacts.staticScriptDisabled,
    evidence: installationEvidencePath,
  },
};
const navigate = ({ timeoutMs }) => page.goto(nhGalleryPageUrl, {
  waitUntil: 'domcontentloaded', timeout: timeoutMs,
});
```

复用 [通用指南的一轮调用](../../../.trellis/spec/frontend/browser-acceptance.md#一轮调用)，在 options 中使用对应平台的 `source, navigate`，并以正常 UI `prepareReader` 打开阅读器。需要构建后忽略缓存刷新时，将 `navigate` 换为 `({ timeoutMs }) => page.cdp('Page.reload', { ignoreCache: true }, { timeout: timeoutMs })`。每轮 helper 配置域/模拟、确认新文档，再取证，调用方不另调 `page.events()`。

helper 对**最终产物完整 UTF-8 字节**（含 banner、CSS 注入）与仓库 loader 留指纹；阶段间和 finally 复算，变化使本轮失效。它比较实际产物 metadata：`grant(loader) == grant(bundle)`、`connect(loader) ⊇ connect(bundle)`，并覆盖实际 `bundleUrl` 的 host；权限顺序/重复不影响集合，本地 connect 扩展允许，缺项输出精确差异并 blocked。这只证明仓库声明，安装副本权限和启用状态由上述证据单独确认。helper 检查 evidence 文件存在且可读，外层负责内容真实性。

### 3. 通过准备门

helper 对当前主文档的所有活动脚本读取 `Debugger.getScriptSource`，包含匿名 eval、static userscript 包装和普通站点脚本。通过 metadata 块内与当前产物相同的 `@name` 或全文相等识别生产候选；生产包与 loader 的 metadata 名称必须非空且不同。长度、URL 或正文中的 loader 标记不用于豁免旧包。必须恰好一个生产候选，且 actual 与最终包原样相等，具有同一 scriptId 的全长顶层非零 coverage；重复注入和不同长度旧包均 blocked。普通 host/loader 脚本记录为已检查，不冒称生产身份已验证。
新脚本在交互、截图前观察或收尾期间到达都会使清单过期并触发复查；coverage 停止后新生产脚本缺自己的执行证据也不能放行。SHA-256 按 UTF-8 留证，coverage 偏移按 JavaScript UTF-16 code unit，关联当前 frame / loaderId / executionContext。旧文档、仅解析、同版本/同长度或 loader 的“已加载”日志不能放行。

再按 [通用准备流程](../../../.trellis/spec/frontend/browser-acceptance.md#2-每轮先配置，再操作) 检查初始化、日志和正常打开后的严格环境，通过后才进入 `runChecks`。挂载/执行证据不等于异步平台初始化成功；打开前原站观察与打开后阅读器观察分别保存。打开后 CSS 不符时停止该视口分支，后续功能及截图 unrun，保持预期及页面原状。关闭/重开用通用接口，缺本轮原站基线时按指南正常关闭并重新导航取证。

准备完成标准是当前完整包执行证据、初始化与日志、严格环境均通过且必要事件已保存。必需取证能力不可用即 blocked，返回规划；不以 HTTP 响应、loader 日志或挂载 DOM 降级替代。异常、超时与写盘失败按 [通用证据/回填流程](../../../.trellis/spec/frontend/browser-acceptance.md#4-证据、截图和失败回填) 保存并传播非零；认证问题按 Ego 接管流程处理。

### 4. 验证功能与视觉效果

在 `runChecks` 内按 [通用阶段接口](../../../.trellis/spec/frontend/browser-acceptance.md#3-功能阶段与观察) 执行关键交互、产品断言及截图。完整流程默认覆盖下列项目；用户指定 `tests` 时重点验证指定功能，并补齐本次改动涉及的仓库强制验收项：

- 首屏标题、总页数和当前页正确。
- 缩略图正常加载，布局、展开和定位正确。
- 阅读器可以打开、关闭，书页模式与卷轴模式可以切换。
- 图片加载正常，上一页、下一页和跳页操作正确。
- 设置面板可以打开、修改和关闭。
- 缓存读写正常；优先通过页面行为或受支持的存储接口验证，不清空用户缓存。
- 涉及抓取、解析或缓存时，验证原图与换源功能（平台支持时）；`platform: nh` 该项为 N/A，记录为 N/A 而不是 failed。

UI 改动分别用通用指南的 desktop / mobile 固定 profile 运行预检、关键交互和截图；`mode: quick` 同样通过准备门，只缩小功能范围。响应式断点、截图读取和 NH 基础请求层回归按通用指南与仓库要求执行，实际覆盖范围据实记录。NH 页面自带的 `Uncaught (in promise)`、广告拦截或 Cloudflare RUM 错误按脚本来源归因，不上升为产品失败；无法归因的严重错误先记 blocked。

### 5. 输出报告

将报告写入 `.tmp/test-reports/reader-test-<platform>-<timestamp>.md`，包含：

- 时间、实际测试 URL、平台、测试模式和范围。
- 构建/服务/安装前提依据、helper 产物目录、当前文档身份、初始化、控制台来源及影响。
- 各项实际 passed、failed、blocked 或 unrun；失败附复现步骤，阻塞列明准备条件与下游未执行范围。
- 桌面端、移动端及相关断点的截图路径。
- 阻塞项与可执行的下一步；明确区分已验证结果和未验证部分。

主会话按通用指南回填逐项 `acceptance.json`，引用实际命令日志和 helper 证据；准备 blocked 与产品断言 failed 分开，不能经 `acceptance.py run` 的普通非零映射冒充浏览器分类，也不手写整体 passed。报告列出未验证范围，构建成功不能替代功能验收。

按 [通用收尾/接管流程](../../../.trellis/spec/frontend/browser-acceptance.md#5-收尾或交还用户) 处理同一空间；清理前核实本轮 server 的具体监听 PID 和 npm 父进程，确认退出及端口释放，清理本轮 PID 文件，保留用户资源、存储和交付证据。保存产物后关闭 agent-owned 页面：成功时在同一空间执行 `await task.finish({ keep: [] })`；需保留的页面显式保留并记录为 `open`。随后用 `python3 scripts/acceptance.py cleanup-browser <task-space> --pages <pages.json> --servers <servers.json> --output .tmp/reader-test-<platform>/cleanup-browser.json` 生成资源报告，`<task-space>` 是 Trellis 任务名：页面声明 `label`、`spaceId`（Ego 数字 id）、`pageId`、`owner`、`createdByTask`（等于任务名）、`state`、带时区 `observedAt`、`evidence`；服务声明 `label`、`pid`、`pidFile`、`port`、`expectedCwd`、`expectedCommand`、`processStartToken`、`owner`、`createdByTask`、`evidence`。user-owned 资源标 `user` 并保留。退出 `0` 表示所有声明项为 clean/preserved；residual/unknown 人工核对归属后处理，报告不替代功能验收。阻塞/接管保留同一空间并按 Ego 规则处理。最终回复前执行完成通知。
