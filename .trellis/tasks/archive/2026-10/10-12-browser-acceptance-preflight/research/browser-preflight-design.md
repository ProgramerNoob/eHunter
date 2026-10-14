# 浏览器验收前置检查：静态技术研究

## 结论与研究边界

建议只新增一个可由 `ego-browser nodejs` 导入的本地 ESM 辅助模块，统一承接准备检查、受保护的功能回调和阶段日志；继续由现有指南管理服务、任务空间与用户接管。EH 优先研究 **CDP 取得实际脚本源码、对完整 bundle 做 SHA-256 比对，再取得该脚本执行证据** 的零产品改动方案。实施第一步必须验证 Ego/Tampermonkey 沙箱中的 Debugger/Profiler 可见性；不可用即 blocked，不静默退化成 HTTP fetch 或挂载节点检查。loader 执行摘要是明确的替代设计，只有能力探针失败且规划调整后才实施，不同时维护两套自动 fallback。

本文件是 planning 阶段的研究建议，不是已批准设计或运行结果。本轮仅读取本地文件、graft 索引和 `ego-browser --help`；未启动浏览器、服务，未下载、构建或测试。当前任务通过 `python3 ./.trellis/scripts/task.py current --source` 确认为 `.trellis/tasks/10-12-browser-acceptance-preflight`。仅创建本研究文件。

来源：`.trellis/tasks/10-12-browser-acceptance-preflight/prd.md` 的 R1–R6、AC1–AC6；`.trellis/spec/frontend/browser-acceptance.md:13`、`.trellis/spec/frontend/browser-acceptance.md:46`、`.trellis/spec/frontend/browser-acceptance.md:110`、`.trellis/spec/frontend/browser-acceptance.md:134`；`/Users/warwick/.agents/skills/ego-browser/SKILL.md` 的 “Run browser scripts”“Page JavaScript and CDP”。

## 1. 现有链路已经提供什么

| 事实 | 对前置检查的含义 | 实际依据 |
| --- | --- | --- |
| `npm run build-prod` 使用专用 Vite 配置，入口 `./src/main.ts`，IIFE，并注入 CSS、追加 userscript banner | 对最终 `dist/ehunter.iife.js` 全文计算身份，包含 banner 与注入代码；不能只比较版本号 | `package.json:10`；`vite.config.prod.ts:38`、`vite.config.prod.ts:57`、`vite.config.prod.ts:65`、`vite.config.prod.ts:80` |
| bundle server 每次请求重新读盘，返回 no-store，默认 `127.0.0.1:8787` | 降低旧响应风险，但请求日志、HTTP 200、健康检查均不证明页面执行该响应 | `scripts/serve-bundle.mjs:12`、`scripts/serve-bundle.mjs:20`、`scripts/serve-bundle.mjs:32` |
| loader 使用 `GM_xmlhttpRequest`，带时间戳，再直接 `eval(res.responseText)` | 请求可能走扩展上下文；不保证出现在页面 target 的 Network 事件中。应寻找执行世界中的 eval 脚本 | `.pi/skills/eh-test/ehunter-dev-loader.user.js:28`、`.pi/skills/eh-test/ehunter-dev-loader.user.js:30`、`.pi/skills/eh-test/ehunter-dev-loader.user.js:44`；`.pi/skills/eh-test/SKILL.md:34` |
| loader 的 `已加载` 日志先于 eval；执行异常只被 catch 并输出 | URL、字符数和“已加载”不是执行成功回执；长度也不是唯一身份 | `.pi/skills/eh-test/ehunter-dev-loader.user.js:42`、`.pi/skills/eh-test/ehunter-dev-loader.user.js:45` |
| dev 使用 Vite 与 Vue/svg 插件；HTML 加载 `/src/main.ts` | dev 页面运行转换后的 ESM 模块图，不存在一个等同生产 bundle 的单文件身份 | `package.json:5`；`vite.config.ts:13`；`index.html:11` |
| dev/prod 都用包版本 `3.1.0` 定义 `__EHUNTER_VERSION__` | 同版本多次代码修改不能用版本号区分 | `package.json:3`；`vite.config.ts:20`；`vite.config.prod.ts:71` |
| 异步平台初始化在 Vue setup 中启动，内部捕获错误 | eval 同步完成或脚本执行计数都不能替代初始化成功与功能验收 | `src/main.ts:207`、`src/main.ts:216`、`src/main.ts:218`、`src/main.ts:231` |

历史旧 bundle、漏 grant/connect、`mobile:false` 替代均有实际反例，但不能据此断言现版本仍有该缺陷。依据：`.trellis/tasks/archive/2026-10/10-11-project-session-retrospective/research/acceptance.md:88`、`.trellis/tasks/archive/2026-10/10-11-project-session-retrospective/research/acceptance.md:120`。

## 2. Ego/CDP 能力：可依赖的接口与 unknown

当前文档明确支持：

- `await page.cdp(method, params?, { timeout? })` 向本 Page 的 target session 发 CDP 命令；`task.cdp` 用于 Target/Browser 域。依据：`/Users/warwick/.agents/skills/ego-browser/references/api.md:42`、`/Users/warwick/.agents/skills/ego-browser/references/api.md:67`。
- `await page.events()` 读取并清空该 Page 缓冲的 CDP 事件，不是 EventEmitter。`page.waitForEvent` 只文档化了 popup/download，不能拿来等待 `Debugger.scriptParsed`。依据：`/Users/warwick/.agents/skills/ego-browser/references/api.md:58`、`/Users/warwick/.agents/skills/ego-browser/references/api.md:70`；`/Users/warwick/.agents/skills/ego-browser/SKILL.md` 的 “Action receipts, popups, and dialogs”。
- Node ESM 可动态导入 `node:fs/promises`、`node:crypto`；页面 evaluate 不能捕获 Node 变量。每轮新 Node 进程，任务空间和标签保留，变量不保留。依据：`/Users/warwick/.agents/skills/ego-browser/SKILL.md` 的 “Run browser scripts”“Spaces, rounds, and pages”“Page JavaScript and CDP”。

**Unknown，实施时必须验证：** 文档没有列出 CDP 域白名单、事件转发白名单、缓冲容量/溢出标识、Debugger 返回大源码的传输限制、跨 Node 轮次 session/domain 状态、扩展 isolated world 的 scriptParsed/coverage 可见性。因此“接口允许传方法名”不等于“该环境已验证支持 Debugger/Profiler”。`ego-browser --help` 只确认有 `nodejs` 执行入口，没有解答这些问题。

以下 CDP 命令名来自协议知识，尚未对当前 Ego 内置 Chromium 做运行核实。实施时可对照官方协议小节（本轮未联网读取）：

- `Debugger.enable`、`Debugger.scriptParsed`、`Debugger.getScriptSource`：[Debugger](https://chromedevtools.github.io/devtools-protocol/tot/Debugger/)。
- `Profiler.startPreciseCoverage`、`Profiler.takePreciseCoverage`：[Profiler](https://chromedevtools.github.io/devtools-protocol/tot/Profiler/)。
- `Emulation.setDeviceMetricsOverride`、`Emulation.setTouchEmulationEnabled`：[Emulation](https://chromedevtools.github.io/devtools-protocol/tot/Emulation/)。
- `Runtime.executionContextCreated`、`Runtime.consoleAPICalled`：[Runtime](https://chromedevtools.github.io/devtools-protocol/tot/Runtime/)；`Page.getLayoutMetrics`、`Page.frameNavigated`：[Page](https://chromedevtools.github.io/devtools-protocol/tot/Page/)。

## 3. EH：实际执行 bundle 的身份

### 3.1 推荐候选：完整源码比对 + 执行证据，先做能力探针

此路径不修改 `src/`、`core/`、生产配置或现有 loader。依据是 loader 当前直接 eval 原始响应文本（`.pi/skills/eh-test/ehunter-dev-loader.user.js:44`），以及 Ego 已提供 CDP 命令与事件缓冲入口（`/Users/warwick/.agents/skills/ego-browser/references/api.md:67`、`/Users/warwick/.agents/skills/ego-browser/references/api.md:70`）。建议实现步骤：

1. 在成功构建后读取最终 bundle，保存 UTF-8 字节数、SHA-256、构建命令/退出码、工作目录和本轮 runId。验收期间冻结产物；阶段结束再次计算身份，发生变化就使本轮证据失效。不能只凭 mtime 或 git HEAD：未提交改动也可能改变产物。
2. 在导航前启用 Runtime、Log、Page、Network、Debugger；如果以执行覆盖率作证明，再启用 Profiler 并启动 precise coverage。命令返回值、错误和时间必须落盘。启用过程失败归为准备 blocked。
3. 导航或刷新后，按当前主 frame 的新 document/loaderId 与 executionContext 信息圈定本轮脚本，排除旧文档和 enable 时补发的历史脚本。使用唯一的事件收集器提取 `Debugger.scriptParsed` 候选的 scriptId、URL、executionContextId、长度、栈；不能假设 eval 脚本有 `ehunter.iife.js` URL。
4. 在同一 CDP 轮次、同一 session 里对候选调用 `Debugger.getScriptSource({scriptId})`。先用完整长度等缩小范围，再比较完整文本的 SHA-256；不能只匹配脚本尾部、banner、函数名或版本字符串。保存 expected/actual/hash algorithm/scriptId/context/document 关联。
5. **源码相同只证明这段文本在该上下文被解析。** 再取该 scriptId 的 precise coverage，确认顶层/实际 IIFE 的执行范围有非零计数，才形成“本轮执行了这份文本”的证据。覆盖率不证明每条分支执行或异步初始化完成。若当前 CDP 无法提供可信执行证据，就 blocked，不能用另一个脚本产生的挂载 DOM补足这项证明。
6. 再单独等待初始化结果、检查当前文档 DOM、eHunter console/exception 与视口。这些是独立条件，不把 bundle identity passed 升格为功能 passed。
7. 收尾停用本轮启用的 coverage/debugger 能力（按实际 session 生命周期核实），保留取证日志；不要跨轮复用 scriptId/targetId。

**精确比较规则：** 当前 loader 没有附加 sourceURL，应先要求 `getScriptSource` 与最终文件 UTF-8 解码后的文本完全一致，并记录本地字节哈希与源码重编码哈希。若 Tampermonkey/Debugger 添加包装、BOM 或尾注，先保存差异并 blocked；只有确认固定转换后才在设计中明确其可逆规则，禁止用随意 trim/包含判断放宽比对。协议的 `scriptParsed.hash` 不直接当成自定义文件 SHA-256，避免误认不同算法/编码。

**代价与实施风险：** 导航前开启 Debugger/coverage 会增加脚本事件和采样成本；获取整个 bundle 有传输成本；coverage 可能影响时序，拿到身份证据后应关闭，不拿它来证明严格的手势时间阈值。是否能观察 Tampermonkey eval、事件结构与 context 关联、源码是否原样、Profiler 范围如何对应顶层，全部是 unknown。第一轮真实浏览器能力探针是本方案的明确决策门，失败后停止功能分支。

### 3.2 替代：loader 显式输出与 eval 绑定的执行摘要

若上述沙箱取证不可用，建议最小修改 `.pi/skills/eh-test/ehunter-dev-loader.user.js`，不改产品代码、不加产品公开 API。当前代码可作为接入点：`.pi/skills/eh-test/ehunter-dev-loader.user.js:33`、`.pi/skills/eh-test/ehunter-dev-loader.user.js:43`。

设计要求：

- 在 loader 沙箱捕获唯一的 `const source = res.responseText`，对该字符串 UTF-8 编码做 SHA-256，再对**同一个 source** 做直接 eval，保留原有 GM 沙箱语义。
- 先记 `eval-start`，只有 `eval(source)` 同步返回后才记 `eval-returned`；异常记 `eval-failed`。摘要至少含协议版本、loader 版本、每次加载唯一 id、完整请求 URL、SHA-256、UTF-8 字节数、时间。console 使用单个 JSON 字符串，避免 CDP RemoteObject 延迟展开导致证据丢失。
- 不将 `eval-returned` 称为“初始化成功”：异步初始化仍可能随后失败，见 `src/main.ts:207`、`src/main.ts:218`。
- 摘要必须关联当前导航、executionContext、请求 id 和本轮时间窗。前置检查不能接受旧日志、旧 DOM 属性或上轮相同哈希的回执。仅有 `eval-start`、请求成功或同长度文本都不通过。
- 先尝试 Runtime console 事件通道；不要默认页面世界 `window` 能读取 userscript 的沙箱变量。`.pi/skills/eh-test/SKILL.md:37` 已明确页面读不到 `GM_info` 不能证明扩展不存在。若考虑 CustomEvent/DOM 属性，需要另行验证跨世界可见性和时序，不在初版同时加多个通信通道。
- `crypto.subtle`/TextEncoder 在当前 Tampermonkey world 是否可用、console 是否完整转发、真实安装 loader 的版本是否已更新都是 unknown。摘要缺失或 hash 计算失败应 blocked，不引入自写 hash 或降为长度检查。
- 更新本地 loader 文件不会自动更新 Tampermonkey 安装副本。真实验收需要用户已有安装/明确更新步骤，保留版本与实际声明证据。不能由 Node HTTP fetch 代替该步骤。

此替代方案依赖受信任的测试 loader，面向防止误验，不提供对恶意站点伪造回执的安全认证。与 Debugger 相比，代码与数据量更小、同步执行返回语义明确，但需要安装更新和沙箱运行验证。**推荐顺序仍是先验证零修改 CDP 路径；若要切换，回填 design 决策，禁止弱证据自动兜底。**

### 3.3 权限集合与真实运行前提

静态检查应解析构建产物的 userscript metadata 块与仓库 loader metadata 块，做集合比较：`grant(loader) == grant(bundle)`；`connect(loader) ⊇ connect(bundle)`，并覆盖实际本地 bundle host。顺序和重复不影响集合，缺字段/metadata 无法解析直接报明确差异。不要用“至少六条权限”替代名字比对，也不要以此证明站点所有请求都实际成功。

当前核实：生产 6 个 grant 为 `GM_xmlhttpRequest`、`GM_download`、`GM_getValue`、`GM_setValue`、`GM_deleteValue`、`GM_listValues`；4 个 connect 为 `hath.network`、`nhentai.net`、`githubusercontent.com`、`jp.animesales.xyz`。loader 额外含 `127.0.0.1` 与 `localhost`，当前集合满足要求。依据：`vite.config.prod.ts:25`、`vite.config.prod.ts:29`；`.pi/skills/eh-test/ehunter-dev-loader.user.js:9`、`.pi/skills/eh-test/ehunter-dev-loader.user.js:15`。实施时比较实际产物，不只比较配置里的模板。

该静态检查证明仓库声明一致，**不证明浏览器安装副本一致**。真实验收还需：Ego 内已登录 exhentai.org，Tampermonkey 开启动态 loader、关闭静态 eHunter 以避免双注入，本任务 bundle server 可达，从可访问 `/s/` 图片页触发。遇登录/403/Sad Panda 或浏览器权限提示交还用户，不代登录、不清用户数据。依据：`.pi/skills/eh-test/SKILL.md:32`、`.pi/skills/eh-test/SKILL.md:35`、`.pi/skills/eh-test/SKILL.md:57`、`.pi/skills/eh-test/SKILL.md:61`；`/Users/warwick/.agents/skills/ego-browser/SKILL.md` 的 “User control and completion”。

## 4. Vite dev：证据分层，不能承诺整个工作树都已执行

`index.html:11` 只声明入口；`vite.config.ts:14` 含 Vue/svg 转换。浏览器实际脚本与原始 `.vue`、`.ts` 字节不同，不能直接对原始文件哈希再与 getScriptSource 比较。以下结论必须分开：

| 证据 | 可证明 | 不可证明 |
| --- | --- | --- |
| 当前工作目录的独立新 Vite 服务、端口与日志 | 服务归属、可达性 | 页面已经刷新，所有模块都新 |
| 新主文档导航、无 Vite overlay、当前挂载 DOM | 新文档初始化表象、无该类显式编译错误 | 每个依赖/懒加载模块、SCSS 都是当前源码 |
| 当前 `/src/main.ts` 请求或该单模块的 getScriptSource 比对 | 入口响应/脚本内容身份 | 深层 Vue 组件、动态 import、CSS、图片资源全部更新 |
| 本轮实际加载模块清单，每个转换结果与浏览器源码相等，并关联执行证据 | **清单内、当前阶段已加载代码**的身份 | 尚未加载的功能分支或完整仓库执行覆盖 |

来源：`.trellis/spec/frontend/browser-acceptance.md:15`、`.trellis/spec/frontend/browser-acceptance.md:25`、`.trellis/spec/frontend/browser-acceptance.md:92`、`.trellis/spec/frontend/browser-acceptance.md:93`、`.trellis/spec/frontend/browser-acceptance.md:126`；`/Users/warwick/.agents/skills/ego-browser/references/api.md:67`；上面的 Vite 配置与入口。

建议 dev 采用“实际加载模块清单”身份，不伪造单 bundle 身份。实施步骤：

1. 复用指南，从当前 checkout 独立启动、核对 cwd/监听 PID/端口的 Vite 服务，保存本轮服务记录与源码输入指纹（至少 `src/`、`core/`、入口、配置和锁文件）；验收期间冻结工作树，结束再比对。HMR 更新或输入变化使当前分支失效，重新导航取证。
2. 同样在导航前启用脚本/执行取证域并确认新文档。对本轮加载的本项目模块（包括 Vue 带 query 的 script/style 虚拟模块与 `/@fs/` 项目文件）保存 exact URL、scriptId、context、源码 hash、执行证据与来源分类；只观察入口不足以放行 R2。
3. Node 端从**已确认归属的当前 Vite 服务**取同一 exact URL 的当前转换文本，与浏览器 `getScriptSource` 文本比较。此 HTTP 取值只是 expected 一侧；actual 必须来自浏览器脚本取证。保留 query，不把不同 Vue 子模块合并。第三方 `/node_modules/.vite/` 依赖单列来源/锁文件关联，不声称它是本轮修改源码。
4. 首阶段只声明已加载清单。列出本次改动相关、该阶段应出现的模块；预期模块未加载不能默认为通过。懒加载模块在触发其用例后的加载阶段扩展清单并重新检查，检查完成前不截图/不记该功能 passed。若要求“任何交互前证明所有懒加载模块已执行”，本方式无法满足，须在规划明确范围，不能声称已做到。
5. Vue 样式通常转换成 JS 注入，应纳入对应虚拟模块；独立 CSS/静态资源没有 JS 执行覆盖率，需要另存本轮响应内容与页面应用/视觉证据。任何未覆盖部分在清单声明，不能从 JS 身份推导全部视觉资源新鲜。

**Unknown/最小方案边界：** 当前 Ego 是否返回所有所需模块事件，Vite 转换请求是否包含依请求状态变化的文本、sourceURL 注释、HMR 时间戳，CSS/依赖预构建怎样关联，都未实测。先以入口 + 一个深层 Vue 组件 + 一个 style 虚拟模块做能力探针，再补全实际加载清单；不得让这三个探针模块的成功冒充完整 R2。若零修改路径必须编写脆弱的源码归一化器才能匹配，就停止并重新设计 Vite 专用测试插桩，不引入新框架或产品 build-id API。仅凭现有指南的弱证据可以报告准备观察结果，不能标记严格 R2 passed。

## 5. 视口、DPR、mobile 与 touch 的不同证据强度

依据：`.trellis/spec/frontend/browser-acceptance.md:55`、`.trellis/spec/frontend/browser-acceptance.md:60`、`.trellis/spec/frontend/browser-acceptance.md:69`、`.trellis/spec/frontend/browser-acceptance.md:77`、`.trellis/spec/frontend/browser-acceptance.md:87`；`/Users/warwick/.agents/skills/ego-browser/references/api.md:55`、`/Users/warwick/.agents/skills/ego-browser/references/api.md:61`、`/Users/warwick/.agents/skills/ego-browser/references/api.md:67`。

| 项目 | 记录与判断 | 不能夸大的部分 |
| --- | --- | --- |
| CSS viewport | evaluate 读 `innerWidth/innerHeight`，附 `document.documentElement.clientWidth/clientHeight`、`visualViewport` 的宽高/scale、viewport meta；必要时用 `Page.getLayoutMetrics` 补充 CSS layout/visual viewport | screen 尺寸、命令 width、PNG 像素都不是布局视口。clientWidth 可能受滚动条影响，不要求它与 innerWidth 无条件相等 |
| DPR | 读 `devicePixelRatio`，与独立的预期 DPR 比对 | `deviceScaleFactor:3` 命令成功本身不代表实测 DPR3；截图默认 `scale:css`，PNG 宽390不能推出 DPR1 |
| mobile | 保存本轮 `Emulation.setDeviceMetricsOverride` 的完整参数、成功回执、时间、page/round；断言目标 mobile 与实际发送值一致 | 文档没有 `getMobileOverride` 回读 API；不能把自存的 `mobile:true` 字段伪称浏览器实测。innerWidth、UA、touch、coarse 都不能唯一反推 mobile 开关 |
| touch | 保存 `setTouchEmulationEnabled` 参数/回执，实测 `navigator.maxTouchPoints`、`matchMedia('(pointer: coarse)')`；可补充 hover/any-pointer 作诊断 | touchPoints/coarse 是能力信号，不证明真实触摸手势、长按时序或物理手机；`'ontouchstart' in window` 不是充分判断 |

默认目标：桌面 `1200×900`、DPR1、mobile false、touch false；移动 `390×844`、DPR3、mobile true、touch true/maxTouchPoints 5。预期目标由用例固定，不能从已观测值回填；否则把 mobile false 写进调用与预期即可伪绿。CSS 主断言用 innerWidth/innerHeight；辅助布局字段保留差异原因。DPR 若需浮点容差，在设计固定并说明，不在失败时临时扩大。桌面 touchPoints 0、移动 5 和 coarse 值的当前 Chromium 表现需在首轮探针核实。

每轮重新发配置命令，导航后、功能交互前、截图前重新实测；每个边界记录关联的命令回执。当前文档不保证所有模拟参数跨 Node 轮次持久化，见 `.trellis/spec/frontend/browser-acceptance.md:77`。若其他调用改写模拟状态，必须重新准备，不能沿用旧回执。`page.info().viewport` 没有文档化足以验证 mobile 的字段，不能猜。

### EH 关闭状态的 viewport 边界必须显式处理

当前 `const ensureEHViewportForOpen = (): void` 只有 EH 且 `isMobileLikeDevice()` 时设置 `width=device-width, initial-scale=1, viewport-fit=cover`；调用点在 `toggleEHunterView(show)` 的 show 分支。关闭路径恢复/移除原 viewport meta。依据：`src/main.ts:115`、`src/main.ts:116`、`src/main.ts:121`、`src/main.ts:138`、`src/main.ts:141`、`src/main.ts:268`、`src/main.ts:281`、`src/main.ts:290`。是否自动打开受既存状态影响，见 `src/main.ts:313`。

因此关闭状态的 EH 页面在 mobile true 下可能在打开阅读器前不满足 390 CSS px。**按当前 R1 的严格解释，先记录实际状态并 blocked，不能让 helper 注入 meta、改用户存储或改成 mobile false 来通关。** 也不能在被阻断后偷偷打开阅读器再声称“交互前已通过”。若主规划要把“正常打开阅读器”列为准备动作，应明确为独立阶段、记录打开前站点环境和打开后阅读器环境，并先对齐 R1 的行为边界。本研究没有授权该例外。关闭后的原站宽度恢复也不宜被错误解释为移动模拟失效；它需要自己明确的场景预期。

## 6. 一个本地 helper 的接入形状与失败传播

建议未来新增 `scripts/browser-preflight.mjs`（本轮未创建），使用 Node 标准库、接受已有 `task/page`，由指南和 EH 技能的 ego-browser heredoc 动态 import。不要让 helper 自行创建 TaskSpace、启动服务、安装 loader 或清理用户资源。用一个有保护边界的入口，例如设计签名 `withBrowserPreflight({ page, artifactDir, expected, source, navigate }, runChecks)`，包住整个准备与功能流程；它是本地脚本接口，不是产品 API。

最小职责顺序：

1. 创建 `.tmp/<task>/<runId>/`，先尝试写入 run manifest，明确初始 incomplete，保存独立 expected、模式、目标 URL、服务/构建证据路径。目录不可写即停止，不导航。
2. 只由 helper 启用域、记录配置命令、收集事件。采集 `before-navigation` → 导航/刷新 → `after-commit`/`after-load` → `preflight`，准备通过后才调用 `runChecks`。
3. 给回调提供受控的 `phase(name, action)` 和“截图前再次检查环境”操作。关键交互前后都落盘；新增模块/导航使代码身份按第4节重新检查。回调不能另调 `page.events()` 抢走缓冲。
4. `catch` 保存原始错误与所在阶段。准备条件失败的分支为 blocked，后续用例 unrun；进入功能后确认的产品断言错误为 failed。不要把所有 thrown error 都归产品失败。
5. `finally` 无条件尝试再 drain 事件并保存结果；只有全部必要落盘完成后才允许形成成功结果。保留原始异常及写入/收集异常，不能让 finally 的异常覆盖诊断，也不能吞错后退出0。
6. 按指南/skill 由外层处理服务归属、用户 handOff 和任务空间结束。用户接管时立即停止动作，不以另开空间恢复。失败不调用成功专用的 `task.finish()`，遵循 Ego 规则。

依据：`.trellis/spec/frontend/browser-acceptance.md:34`、`.trellis/spec/frontend/browser-acceptance.md:46`、`.trellis/spec/frontend/browser-acceptance.md:98`、`.trellis/spec/frontend/browser-acceptance.md:110`、`.trellis/spec/frontend/browser-acceptance.md:132`、`.trellis/spec/frontend/browser-acceptance.md:134`；`/Users/warwick/.agents/skills/ego-browser/SKILL.md` 的 “User control and completion”。

### 事件 drain 后无法重取：必须先保存，再分析

当前 `page.events()` 是读取即清空（`/Users/warwick/.agents/skills/ego-browser/references/api.md:70`）。建议每批记录 `{runId, roundId, pageLabel, phase, sequence, recordedAt, events}`，原始事件保留自身 method/params/time/context/frame。不要把同一批事件都当成 recordedAt 时发生，也不要把不同域的单调时间直接视为 UTC。

- 对每批先 append 到 `events.jsonl`，成功后才交给错误分类/源码候选提取；这些消费者共享已保存批次。
- 当前示例的 filter 未包含 `Debugger.scriptParsed`、`Runtime.executionContextCreated`、`Network.loadingFinished`；直接复制会丢掉本方案证据。初版保存所有已订阅域返回的批次，再生成较小摘要，或使用显式覆盖所需域的名单。依据：`.trellis/spec/frontend/browser-acceptance.md:117`。
- drain 成功而 append 失败时，批次仍在当前 Node 内存中；可作有界重试，但不能通过第二次 `page.events()` 找回前一批。最终失败打印结构化错误/未保存批次到调用日志，返回非零且 blocked/incomplete；stdout 备份不自动补成完整通过。
- `page.events()` 本身失败也要保存错误和先前批次；最终 summary 写入失败同样禁止成功。不能先输出 passed 再执行 finally。
- 缓冲容量和跨轮积累未知，不能许诺“一个事件不丢”；在有限阶段等待之间 drain，避免长时间只等最终状态。硬杀进程/SIGKILL 不运行 finally：以初始 incomplete manifest 和已落盘阶段记录表明中断，不伪造最后阶段。例外边界须写入交付说明。

### 与既有逐项验收协议接线

`.trellis/spec/frontend/quality-guidelines.md:149` 规定主会话单写 acceptance.json；helper 只生成 `.tmp/` 证据和建议条目。使用现有 `observed: passed/failed/partial/blocked/unrun` 与 `method: runtime/inspection`，不增加 handwritten overall 字段（`.trellis/spec/frontend/quality-guidelines.md:170`、`.trellis/spec/frontend/quality-guidelines.md:180`）。

一个容易遗漏的区别：现有 `acceptance.py run` 把正常非零子进程记为 failed（`.trellis/spec/frontend/quality-guidelines.md:239`、`.trellis/spec/frontend/quality-guidelines.md:245`）。因此不要把整个浏览器预检简单包进它后声称协议会自动得到 blocked。推荐主会话读取 helper 的准备阻塞事实，将实际浏览器项以 runtime/blocked 及真实非零 execution/证据回填；纯静态权限断言或 helper 自测可使用 command 条目。后续功能项为 unrun。最终 `acceptance.py summarize` 计算状态，不改验收 CLI 的退出码契约，不靠 helper 返回0制造 blocked。

## 7. 有区分力的验收矩阵（计划，未执行）

| 场景 | 必須观察到的结果 | 区分的伪证明 |
| --- | --- | --- |
| 正确 EH bundle + 实际执行 + 初始化成功 | expected/actual 完整 hash 相等，当前导航/沙箱执行证据存在，准备通过后才调用功能回调 | 本地文件/HTTP 存在不够 |
| 旧 bundle 仍挂载；版本与字符数可相同 | identity mismatch，blocked，功能回调次数0 | 长度、版本号、挂载节点不能证明新包 |
| 当前文本仅 fetch 或仅被解析，无 eval/执行计数 | 缺执行证据 blocked | scriptParsed/getScriptSource 本身不是执行成功 |
| 只有上轮匹配摘要或旧文档 scriptId | 当前导航关联失败，blocked | 哈希相同也不能沿用历史执行 |
| Debugger 或 Profiler 被拒、沙箱脚本不可见 | 能力 blocked，保留回执错误；不换弱检查继续 | CDP 方法可调用不等于可观测目标脚本 |
| 当前 bundle eval 开始但抛错；异步 init 随后失败 | 前者执行不完整/准备阻塞，后者单独保留初始化错误；不因源码相等通过 | 身份与功能健康是不同条件 |
| dev 入口最新，深层 Vue/style 仍旧 | 对应模块 mismatch 或 evidence missing；不能放行该分支 | 单入口证明不能覆盖图 |
| dev 懒加载模块未触发、验收中发生 HMR/源码修改 | 未加载范围未验证；修改导致本轮证据失效重取 | 首屏清单不能证明后续模块 |
| 错 CSS 宽高、DPR 分别独立注入 | 交互/截图前 blocked，报告 expected/actual | 配置值不能代实测 |
| 发送 mobile false，但实测宽390/DPR3/touch5 | 因预期 mobile true 与命令回执不符 blocked | 窄屏+触摸不是移动模拟等价物 |
| touch 命令拒绝，或 touchPoints/coarse 不合目标 | blocked，保留实际值与回执 | 只记 enabled:true 不够 |
| EH 缺 meta、关闭状态布局宽980等 | 保存 meta/布局/模拟证据并 blocked，不改 meta、不改 mobile | 历史 workaround 不得重现 |
| 正确 grant/connect；少任一生产 grant/域名 | 前者通过，后者输出精确 set diff；本地扩展允许 | 数量相等不证明集合一致 |
| 仓库 loader 正确但浏览器安装旧 loader | 缺实际执行/版本/权限证据而 blocked | 磁盘 loader 不等于安装副本 |
| 导航 timeout，之前已经有 console/exception | before/timeout/finally 可追溯，保留先前事件，不执行功能 | 最后一批事件不能代全程 |
| page.events drain 后写盘失败、final summary 写失败 | 非零，禁止 passed，保留原始与保存错误 | finally 不得吞错制造成功 |
| 中途用户接管/进程被杀 | 已保存阶段仍可读，结果 incomplete/blocked，不自动换空间 | 无 finally 不得宣称完整日志 |
| CSS 像素截图宽390、实测 DPR3 | 记录 screenshot scale 与环境对象，正确解释 | PNG 像素不能单独证明 DPR |

矩阵的行为依据：R1–R6、AC1–AC6；`.trellis/spec/frontend/browser-acceptance.md:77`、`.trellis/spec/frontend/browser-acceptance.md:87`、`.trellis/spec/frontend/browser-acceptance.md:110`、`.trellis/spec/frontend/browser-acceptance.md:126`；`.trellis/spec/frontend/quality-guidelines.md:174`、`.trellis/spec/frontend/quality-guidelines.md:191`。故障输入应在工具单元测试夹具/本任务受控环境注入，不修改真实站点、用户存储或真实扩展权限来制造通过。

## 8. 交给规划者的决策点与两分钟下一步

已可直接定下：单 helper、独立 expected、Runtime/Log/Page 等域先启用、每批事件保存、finally 失败传播、权限集合比较、任务/服务归属不变、准备阻塞不运行功能、按既有协议回填。以上不依赖浏览器未知能力。

实施前需在 design 中保留三项明确决策门：

1. CDP 是否能看到并取得 Tampermonkey eval 的完整源码与执行证据；失败后是否批准改 loader 输出摘要。当前为 unknown。
2. dev 身份声明限定为本轮实际加载清单；若要求整个模块图在任何交互前都已执行，必须另行设计，现有能力不能据实承诺。
3. EH 缺 meta 且阅读器关闭时，R1 是严格阻塞，还是允许正常打开作为独立准备阶段。当前建议严格阻塞，不擅自放宽已确认需求。

两分钟下一步：主规划将这三项写成 design 的显式边界/能力探针条件，并确认移动打开阶段的口径；本研究未改变任务状态、PRD、规范或实现。
