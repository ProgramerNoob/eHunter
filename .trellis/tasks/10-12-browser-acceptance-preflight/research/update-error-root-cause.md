# 更新请求阻塞：根因研究

日期：2026-10-14。范围：仅研究更新请求；EH 移动布局由主会话处理。唯一写入文件为本报告。活动任务经 `python3 ./.trellis/scripts/task.py current --source` 确认为 `.trellis/tasks/10-12-browser-acceptance-preflight`，来源 session `pi_01a136b5-9ca5-7063-99bb-95f9ed3b0ee8`。

本轮未运行浏览器、服务、远端网络请求或测试，未修改产品、spec、acceptance 或任务规划。以下“已复现”均引用主会话已有原始证据；所附测试入口尚未执行，不能报告 red/green 自动检查通过。

## 结论

真实失败链为：五秒后的远端通知检查 → 两个相同 URL 的 `TextReq` → 请求端报告失败 → `TextReq` 每次尝试无条件 `console.error` → 预检以已验证的当前文档脚本身份归因 eHunter → 后续阶段 blocked。通知上层虽然最终将请求失败转成 `null`，但无法撤销底层已经发出的错误日志。

现有证据支持“更新请求失败暴露为产品严重日志，阻断验收”，不支持“EH 阅读器初始化已失败”。两轮桌面记录均为 `preparation: verified`，随后才被阻断；EH 同轮有初始化成功事件。Vite 原生 fetch 捕获 `net::ERR_HTTP2_PROTOCOL_ERROR`，EH 的 GM 通道仅暴露 `GM_xhr error, 0`。这些信息不足以断言服务器、CDN、代理、证书、CORS 或浏览器扩展中的哪一方造成网络故障。

可以局部修复通知请求，不改通用 `TextReq` / `PlatformService`，不降低预检门禁，也不改更新源配置。推荐让通知层直接复用 `PlatformService.fetch`，明确承担可选请求的限时、状态/正文失败处理和诊断；验证失败后无远端弹窗、无成功存储写入、本地版本说明继续、实际阅读功能正常。仅把通用 `console.error` 改成 warn 不构成修复。

## 已有 red 反馈与归因边界

| 证据 | 实际记录 | 可得结论 |
| --- | --- | --- |
| `.tmp/browser-preflight/current-runtime/vite-desktop-command.json:1` | `ego-browser nodejs`，exitCode 1；2026-10-14T01:22:54.221220+00:00 至 01:23:03.978241+00:00 | 真实入口返回非零；不是新跑的测试 |
| `.tmp/browser-preflight/current-runtime/vite-desktop/result.json:9`、`.tmp/browser-preflight/current-runtime/vite-desktop/result.json:49` | observed/checks 为 blocked；preparation 为 verified；首个错误阶段 `screenshot:reader-book.png:after:identity` | 功能回调已经进入，后续检查阻断，不能写“整个回调未执行” |
| `.tmp/browser-preflight/current-runtime/vite-desktop/events.jsonl:34` | phase `screenshot:reader-book.png:waiting`；context 14、scriptId 280；两条 `TextReq: request error in https://jp.animesales.xyz/ehunter/update.json, retry:(1/3), error: TypeError: Failed to fetch`；两个 `Network.loadingFailed`，requestId `16681.304` / `16681.305`，`errorText: net::ERR_HTTP2_PROTOCOL_ERROR` | 当前文档同时发出两个更新请求；原生传输错误与产品包装日志均有证据 |
| `.tmp/browser-preflight/current-runtime/eh-desktop-command.json:1` | `ego-browser nodejs`，exitCode 1；2026-10-14T01:28:43.388313+00:00 至 01:28:54.727939+00:00 | 真实 EH 入口亦失败 |
| `.tmp/browser-preflight/current-runtime/eh-desktop/result.json:9`、`.tmp/browser-preflight/current-runtime/eh-desktop/result.json:29` | preparation 为 verified；已执行 `first-page`；首个错误阶段 `switch-book:before`，`PreflightBlocked: eHunter runtime/initialization error` | 切换前的检查阻断；并非产品模式切换断言 failed |
| `.tmp/browser-preflight/current-runtime/eh-desktop/events.jsonl:41` | phase `switch-book:before:checked`；context 14、scriptId 100；两条 `TextReq: request error in https://jp.animesales.xyz/ehunter/update.json, retry:(1/3), error: GM_xhr error, 0` | GM 通道错误已进入产品日志；status 0 本身不是服务器 HTTP 状态 |
| `.tmp/browser-preflight/current-runtime/eh-desktop/events.jsonl:25`、`.tmp/browser-preflight/current-runtime/eh-desktop/result.json:5363` | phase `prepare-reader:waiting`，context 14，`EH Platform initialized successfully`；对象记录 pageCount 136 / curPageIndex 0 / thumbCount 136 | 可排除“这一轮完全未初始化”；仍不能代替完整阅读验收 |
| `.tmp/browser-preflight/current-runtime/vite-desktop/result.json:475`、`.tmp/browser-preflight/current-runtime/eh-desktop/result.json:311` | `unsaved: []` | 本次阻断不是已记录的事件保存失败 |

旧文档数据不得混入：`.tmp/browser-preflight/current-runtime/vite-desktop/events.jsonl:1` 的 context 1 重试与 `.tmp/browser-preflight/current-runtime/eh-desktop/events.jsonl:1` 的 context 1 初始化属于 `before-navigation-old-document`；上述结论使用新文档 context 14 的事件。

预检证据：`scripts/browser-preflight.mjs:332-348` 的 `function checkLogs()` 以 `Runtime.exceptionThrown` / console error / Log error 定 severe，再以 verified scriptId 或 Vite URL 归因。关键门禁为 `scripts/browser-preflight.mjs:345`：

```js
requireCondition(!result.logs.some(l => l.document.loaderId === documentState?.loaderId && l.severe && l.attribution === 'ehunter'), 'eHunter runtime/initialization error', result.logs.filter(l => l.severe));
```

因此该错误字符串是泛化的严重日志标签，不是对 `init()` 抛错的专门判断。Vite 原生网络 Log 记录被保留为 `host-or-third-party / retained-for-caller-review`，产品 TextReq console 则明确归因 eHunter；不应把前者全部变成产品失败，也不能豁免后者。截图的 phase 为 executed 只表示截图动作发生，不代表后置检查或视觉验收通过。

## 三个可证伪假设

| 假设 | 预测与反证方法 | 当前判断 |
| --- | --- | --- |
| H1：请求传输失败是严重日志的触发输入，并非通知渲染异常 | 用真实 event/TextReq/PlatformService 模块，将 fetch reject / GM onerror 换成 status 200 且正文合法；若同样严重日志仍出现，H1 被推翻。反向用记录中的 TypeError / GM status 0 应触发同类日志。 | 现有两种传输证据支持；远端物理原因未确定，无需猜测即可测试产品失败处理 |
| H2：上层 catch-null 已处理拒绝，但底层先输出 error，因此预检仍阻断 | 保留真实 TextReq，虚拟时钟推进两次重试；预期没有由网络拒绝造成的未处理拒绝，远端通知与通知时间均不变，本地说明最终继续，但 console error 非空。若 catch-null 已抑制日志或由另外代码输出，H2 被推翻。 | `core/store/event.ts:267-273` 与 `src/platform/base/request/TextReq.ts:90-99` 直接支持；两份日志栈顶均为 printErrorLog |
| H3：阻断来自历史脚本/旧文档，或 EH 根本未初始化 | 检查错误 loaderId/context/scriptId 与当轮 verified identity；若只关联旧文档，不能归因当前产品。检查同轮初始化与首屏阶段。 | 当前记录反驳：context 14，Vite scriptId 280 / EH scriptId 100 归因已验证代码；EH 同文档初始化与 first-page 均有记录 |

这些假设互相区分“触发输入”“产品失败处理”“取证归因”，不会把请求失败等价为阅读功能失败。H1/H2 的自动回放入口见后文，尚未运行。

## 精确调用链与现有契约

1. `core/store/app.ts:2185-2211` 的 `init` 调用 `core/store/event.ts:327-336` 的 `export function checkVersion()`；后者由模块级 `hasStartedVersionCheck` 防止重复安排，`window.setTimeout(..., 5000)` 后 `await checkRemoteUpdateNotice()`，然后 `checkNewVersionNotice()`。远端检查不在 init 的同步完成路径上，但延后本地版本说明。
2. `core/store/event.ts:294-324` 的 `async function checkRemoteUpdateNotice()` 调用 `core/store/event.ts:260-274` 的 `async function fetchRemoteUpdateMessage(): Promise<UpdateMessage | null>`。
3. `core/store/event.ts:261-269` 的关键实现：

   ```ts
   const requestList = [config.updateServer1, config.updateServer2]
       .filter(url => typeof url === 'string' && url.length > 0)
       .map(url => new TextReq(url, true, true).setCredentials('omit').request())
   // 无有效 URL 时 return null
   const rawText = await Promise.race(requestList)
   const parsed = JSON.parse(rawText)
   ```

   `src/config.ts:5-6` 两项目前都是 `https://jp.animesales.xyz/ehunter/update.json`。代码未去重，实际是相同地址两条并发请求，不是独立备用服务。`Promise.race` 取最先 settle 的分支：若未来地址不同且一个先失败，另一个稍后成功也不会挽回本轮；这是现状，不宜顺手改成“首个成功”而不记录行为变化。
4. `src/platform/base/request/TextReq.ts:17-21` 的构造参数 `noCache=true, rejectError=true`；`src/platform/base/request/TextReq.ts:70-80` 为每次请求拼 `_t` 时间戳，GET，credentials omit，复用 `PlatformService.fetch`。
5. `src/platform/base/service/PlatformService.js:255-277` 的 `fetch(url, option)`：有 `GM_info.version` 时走 GM_xmlhttpRequest；onload 补 `text()` 并 resolve，onerror reject 字符串 `GM_xhr error, ${e.status}`；否则 `window.fetch(url, option)`。GM 分支只传 method/url，没有转发 credentials，也没有 timeout/abort/signal 适配。不得声称局部 timeout 能取消 GM 网络。
6. `src/platform/base/request/TextReq.ts:8-15` 默认 `retryTimes=3`、`timeoutTime=15` 秒、`retryInterval=3` 秒；`src/platform/base/request/TextReq.ts:75` 每次 deadline 为 `15 * curRetryTimes` 秒，即 15/30/45 秒。即时失败时每个源最多三次；完全悬挂时，正常调度下每个源约 `15 + 3 + 30 + 3 + 45 = 96` 秒后最终拒绝，不包含最初五秒。
7. `src/platform/base/request/TextReq.ts:64-66` 的 `private printErrorLog(err)` 无条件 `console.error`；`src/platform/base/request/TextReq.ts:90-99` 先打印再重试/最终 failureCallback。`enabledLog` 字段未被使用，没有现成静默选项。`rejectError=false` 在 `src/platform/base/request/TextReq.ts:55-59` 仍 error 且不 settle，不可用于“忽略可选失败”。
8. `core/store/event.ts:271-273` catch 返回 null；`core/store/event.ts:295-298` 无 message 立即返回，故请求/JSON 失败不显示远端通知，也不更新远端通知时间。当前默认 rejectError=true 的普通网络拒绝路径有 catch，不能称为未捕获拒绝。

成功分支必须保持：

- `core/store/event.ts:236-258` 的 `function normalizeUpdateMessage(data: any): UpdateMessage | null` 选择 cn/jp/en；过滤 operation 的 string name/url，保留 Markdown 文本与 time/duration 数值转换。
- `core/store/event.ts:299-307` 仅在 `message.version !== pkgJson.version`、`now > message.time`、`now - store.lastRemoteUpdateNoticeAt > message.duration` 全满足时显示并记录时间。当前是字符串不等比较，不是 semver 大小比较。
- `core/store/event.ts:308-323` 保留“稍后”、远端操作按钮和强制弹窗；URL 操作 `window.open(item.url, '_blank')`。
- `core/store/event.ts:276-292` 本地说明使用 `package.json:3` 的 `3.1.0`，`lastSeenVersionNotice` 已等于当前版本则不显示；只有确认按钮回调才 markVersionNoticeSeen。`src/config.ts:2` 的 `2.8.0` 不参与这里的版本判断，不应顺手修配置。
- `core/store/app.ts:1738-1745` 的 markVersionNoticeSeen / markRemoteUpdateNoticeShown 都调用 persistUnifiedSettingsState。网络失败不应写成功状态，更不能通过预先写存储使通知检查跳过。

### “可选失败”期望的来源与强度

`.trellis/spec/frontend/product-goals.md:46` 仅要求通知弹窗支持接口 Markdown 文案，没有规定远端服务离线是否应视作非致命、重试次数、deadline 或日志级别。`.trellis/spec/frontend/features/002-more-settings-modal/spec.md:133` 要求版本号使用运行版本，没有新增独立维护流程。相关决策与质量规范未找到更强的更新失败契约；`.trellis/spec/frontend/features/001-platform-injection/tasks.md:225` 只是历史“更新检查失败非本次引入”的验收记录，不是放行规则。

所以：**已有明确的实现级降级行为（null → 不弹远端通知 → 本地说明继续），没有找到明确的文字化 optional 自动更新失败规范。** 本任务已授权修复更新请求阻塞，可据既有实现保持非致命路径；新增请求预算/重试策略必须在主会话实施方案与测试中明示，不能伪称已由旧 spec 确认。无需再次询问已获授权的修复范围。

附带风险但不是本轮网络 red 的原因：`src/platform/base/request/TextReq.ts:52-53` 只把 `res.text()` 的成功传给 resolve，正文读取 reject 未接到外层 reject；首层 timeout 只赛跑到 response。局部实现应覆盖正文阶段拒绝/悬挂，不能照搬这个缺口。不要据此扩大到通用请求层修复。

## 最小修复选项与用户影响

| 选项 | 需要更改 | 用户可见影响与判断 |
| --- | --- | --- |
| A，推荐：通知层使用现有 PlatformService.fetch，局部处理请求结果 | `core/store/event.ts:6` 导入与 `core/store/event.ts:260-274` 获取逻辑；增加通知专用测试。不改 PlatformService/TextReq 实现 | 更新源配置不变；失败无远端弹窗/无成功状态写入，本地说明继续。建议去重相同 URL，每唯一源一次尝试，使用现有单次基准 15 秒覆盖 fetch+text 总期限，finally 清理本地计时器；比现状减少重复请求和最长约 96 秒的等待。去重/单次/15 秒是建议的新局部策略，须由主会话记录采纳，并测试晚到成功不再弹窗 |
| B：给通用 TextReq 新增调用方错误报告/策略接口，更新调用单独使用 | `src/platform/base/request/TextReq.ts`、`core/store/event.ts` 与 EH/NH 请求回归 | 可以保留现有重试时序，但扩大公共请求层 API 与评审面；现有 enabledLog 没有生效路径。当前只有通知需求，增加接口不如 A；仅将全局 error 改 warn 不可接受 |
| C：屏蔽更新功能、改服务器、吞 console，或在预检中白名单更新 URL | 配置/全局日志/预检 | 改业务能力或门禁，隐藏真实异常，违反当前边界；不采用 |

A 的实施约束：

- 保留 `PlatformService.fetch` 的 GM/原生分流，不直接用 window.fetch 绕过 EH 所需通道，不改 grant/connect。
- HTTP status 仍要求 200，保持 GET 与原生 credentials omit；用标准 URL/searchParams 处理 `_t` 即可，不引入协议解析依赖或新的请求子系统。
- 对已识别的网络失败、非 200、限时失败、正文读取失败与 JSON/结构无效，返回 null，保留明确的“远端通知不可用，本轮跳过”诊断及原错误/地址/原因。它成为 warning 的依据应是该可选操作已完成降级，而不是预检只拦 error。现有不可用时静默的 UI 不新增错误弹窗。
- catch 范围限于该获取/解析操作。存储、弹窗等实际产品异常不要被大 catch 吞掉；真实严重错误仍应被预检阻断。
- 不采用猴子补丁 console、修改 TextReq 的 private 字段或子类覆写日志；不提前操作通知存储。
- 保持当前 first-settled 竞争和远端后本地的顺序，除非主会话另记行为调整。不必引入 Promise.any、退避调度或后台重试系统。
- local timeout 结束逻辑等待，不保证 GM 请求取消。晚到结果不能改变通知/存储；事件仍由原始预检采集。保留这一限制，不虚构已实现 abort。

## 测试入口与回归边界

### 现有能力

`tests/helpers/storage-fixture.cjs:98-129` 已使用 `typescript.transpileModule`、Node VM 和 CommonJS resolver；`package.json:12-16` 的命令链已用 Node test runner，TypeScript 是已有开发依赖。优先复用同样的加载方式，而非引入框架。

不能直接声称现有 storage 测试已覆盖：`tests/helpers/storage-fixture.cjs:78-85` 明确 stub 了 `core/store/event.ts` / `checkVersion()`。通知测试应真实加载 event、TextReq 与 PlatformService，只替换时间、传输和 store/UI 接缝；每用例新 VM，避免 `hasStartedVersionCheck` 串例。

### 可直接运行的最小离线 red 入口（未执行）

以下命令在仓库根目录执行；不启动浏览器/服务，不发网络请求，不写存储或文件。默认回放原生 fetch 失败；将第一行的 `fetch` 改为 `gm` 回放 GM status 0。它模拟既有真实失败输入，调用公开 `checkVersion()` 而不导出私有函数；真实请求层日志被记录，最后的非致命断言在当前代码预计失败。主会话运行前按项目要求执行短通知。

```bash
TRANSPORT=fetch node <<'NODE'
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = process.cwd();
const pkg = require(path.join(root, 'package.json'));
const timers = new Map(), errors = [], rejectedJobs = [], requests = [], dialogs = [];
let clock = 0, nextId = 0, remoteWrites = 0, versionWrites = 0;
const setTimer = (fn, ms, ...args) => {
  const id = ++nextId;
  timers.set(id, { at: clock + Number(ms || 0), fn: () => fn(...args) });
  return id;
};
const clearTimer = id => timers.delete(id);
const stubFetch = (url, options) => {
  requests.push({ url, options });
  return Promise.reject(new TypeError('Failed to fetch'));
};
const pageConsole = {
  error: (...args) => errors.push(args),
  warn() {}, log() {}, debug() {}, info() {},
};
const window = { setTimeout: setTimer, clearTimeout: clearTimer, fetch: stubFetch,
  location: { protocol: 'https:', host: 'fixture.invalid', href: 'https://fixture.invalid/' } };
const globals = { window, console: pageConsole, setTimeout: setTimer, clearTimeout: clearTimer,
  URL, URLSearchParams, AbortController };
if (process.env.TRANSPORT === 'gm') {
  globals.GM_info = { version: 'fixture' };
  globals.GM_xmlhttpRequest = options => {
    requests.push({ url: options.url, options: { method: options.method } });
    queueMicrotask(() => options.onerror({ status: 0 }));
  };
}
const context = vm.createContext(globals);
const stubs = new Map([
  ['core/store/app.ts', { hasStoredLangPreference: () => true,
    store: { lastSeenVersionNotice: '', lastRemoteUpdateNoticeAt: 0 },
    storeAction: {
      openInstructionDialog: dialog => dialogs.push(dialog),
      markRemoteUpdateNoticeShown: () => { remoteWrites++; },
      markVersionNoticeSeen: () => { versionWrites++; },
    } }],
  ['core/store/i18n.ts', { lang: { value: 'en' },
    i18n: { value: { versionUpdate: 'Version', confirm: 'Confirm', later: 'Later' } } }],
  ['core/assets/instructions.ts', { getWelcomeInstructionText: () => '' }],
  ['core/assets/versionNotes.ts', { getVersionNotesText: () => 'local notes' }],
  ['package.json', pkg],
]);
const real = new Set(['core/store/event.ts', 'src/config.ts',
  'src/platform/base/request/TextReq.ts', 'src/platform/base/service/PlatformService.js']);
const cache = new Map();
function load(relative) {
  if (stubs.has(relative)) return stubs.get(relative);
  assert.ok(real.has(relative), `Unexpected import: ${relative}`);
  if (cache.has(relative)) return cache.get(relative).exports;
  const filename = path.join(root, relative), module = { exports: {} };
  cache.set(relative, module);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      esModuleInterop: true, allowJs: true },
  }).outputText;
  const requireFromPage = specifier => {
    const base = path.relative(root, path.resolve(path.dirname(filename), specifier));
    const target = [base, base + '.ts', base + '.js']
      .find(candidate => real.has(candidate) || stubs.has(candidate));
    assert.ok(target, `Unexpected import ${specifier} from ${relative}`);
    return load(target);
  };
  vm.runInContext('(function(require,module,exports){\n' + output + '\n})', context,
    { filename })(requireFromPage, module, module.exports);
  return module.exports;
}
(async () => {
  const event = load('core/store/event.ts');
  event.checkVersion(); event.checkVersion();
  assert.equal(timers.size, 1, 'version check schedules once');
  for (let step = 0; timers.size && step < 50; step++) {
    const [id, timer] = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    timers.delete(id); clock = timer.at;
    try { Promise.resolve(timer.fn()).catch(error => rejectedJobs.push(error)); }
    catch (error) { rejectedJobs.push(error); }
    await new Promise(setImmediate); // flush promises without wall-clock waits
  }
  assert.equal(timers.size, 0, 'bounded timer workload');
  assert.equal(rejectedJobs.length, 0, 'network failure must be handled');
  assert.ok(requests.length > 0, 'exercise actual remote notice path');
  assert.equal(remoteWrites, 0, 'failure must not mark remote notice shown');
  assert.equal(versionWrites, 0, 'local notice is not acknowledged automatically');
  assert.equal(dialogs.length, 1, 'only the local version notice continues');
  assert.equal(dialogs[0].title, `Version v${pkg.version}`);
  console.log({ transport: process.env.TRANSPORT, requests: requests.length,
    severeLogs: errors, localNotice: dialogs[0].title });
  assert.equal(errors.length, 0, 'optional update failure must not emit product runtime errors');
})().catch(error => { console.error(error); process.exitCode = 1; });
NODE
```

预期当前代码：每通道两份配置 × 三次尝试，共六个传输调用/六条 error，网络拒绝被处理，remoteWrites/versionWrites 为 0，本地说明出现一次，最后日志断言失败。**这是源码预测，不是本轮执行结果。** 单一日志断言不足以验收修复；它只是紧密反馈入口，以下成功/异常/隔离矩阵必须一并覆盖。

### 实施后的必要自动回归

建议新建 `tests/update-notice.test.cjs`，以 `node --test tests/update-notice.test.cjs` 为独立入口；该文件本轮尚未创建。只有当前有需要才接入 `package.json` 默认 test 链。

- 原生 reject、GM onerror、非 200、fetch 悬挂、正文 reject/悬挂、无效 JSON/缺少对应语言：都按既定局部预算完成，无远端弹窗、无成功时间写入、无未处理拒绝，本地说明继续；断言诊断保留原因，不能只断言 error 数为零。
- 正常 JSON：语言选择、版本字符串差异、time/duration 门槛、一次通知时间写入、按钮和 Markdown 文本保持。通过禁用本地说明（fixture lastSeenVersionNotice 等于 package version）隔离远端显示，不改真实存储。
- 本地版本说明：确认前不写，点击确认写当前 package 版本；请求失败不能使它永久等待；第二次 checkVersion 不重复安排。
- 若采用 A：相同源只请求一次；成功/失败/timeout 均清理计时器；deadline 后返回的成功不得弹窗或写时间；异步旧分支拒绝无未处理拒绝。
- 守住失败边界：让 openInstructionDialog 或存储 stub 主动抛错，应保持可观察的真实产品异常，不能因可选网络 catch 一并吞掉。
- 通用 TextReq 控制例：普通 EH/NH 请求失败仍按现有次数、间隔、状态规则 reject 并保留错误诊断。若产品改动仅 event，此例用于防止意外修改共享行为；若改 TextReq，必须扩展请求层全面回归。
- 保持 `tests/browser-preflight.test.mjs` 的严重日志/身份/保存失败阻断检查，通过后再跑项目要求的 `npm run check`；工具测试不替代真实浏览器验收。

### 真实回归边界与需要更改的文件

| 文件/链路 | 计划影响 | 回归要求 |
| --- | --- | --- |
| `core/store/event.ts:260-336` | 推荐唯一产品修改点（含 import）；通知请求策略/非致命错误处理 | Vite 桌面与移动、真实 EH 桌面与移动的新构建/模块身份；至少观察到五秒触发及建议 deadline 后的事件，再检查开关、书页/卷轴、截图；更新服务仍不可用也须保留请求证据 |
| `src/platform/base/service/PlatformService.js:255-277` | 仅复用，不修改 | 自动回放 GM/原生两分支；EH 真实 GM 路径不可只靠 Vite 证明 |
| `src/platform/base/request/TextReq.ts:4-101` | 推荐不修改 | 保存普通抓取诊断/重试契约；不通过全局降级日志改变平台行为 |
| `src/platform/eh/service/AlbumServiceImpl.ts:204-259` | TextReq 用于图片与换源；不修改 | 若请求层被改，需原图/换源、首屏、缩略图与连续请求回归 |
| `src/platform/eh/parser/ImgUrlListParser.ts:17-45`、`src/platform/base/request/MultiAsyncReq.ts:43-51`、`src/platform/base/request/ReqQueue.ts:4-68` | EH intro 抓取/并发依赖通用请求层；不修改 | 请求层改动将扩大至超时重试、页数/页码边界和队列；本方案避开这些更改 |
| `src/platform/nh/service/AlbumServiceImpl.ts:91-146`、`src/platform/nh/service/AlbumServiceImpl.ts:156-186` | NH 初始化与图片抓取共享 TextReq；不修改 | 本次通知在共享 core 层，GM/原生单测均覆盖；NH 真站尚未验证，不能从 EH 推断通过。若改基础请求层，EH/NH 两条链必须优先真实回归 |
| `src/config.ts:5-6` | 保持两个业务配置地址 | 去重仅是使用策略，不新增/替换更新源 |
| `tests/update-notice.test.cjs`（建议新增）、`package.json:12-16`（按需） | 离线回归与测试链 | 无需新依赖，不复用会 stub 掉 event 的 storage 测试冒充覆盖 |
| `scripts/browser-preflight.mjs:332-348` | 不修改 | 继续阻断真实 eHunter severe/未归因严重异常，继续留存外部网络错误与诊断 |

EH 移动严格 390×844 仍由独立布局修复处理；更新请求局部修复不能证明它通过。主会话负责将实际命令、重新构建身份、完整事件和浏览器结果回填 acceptance；本报告不写整体 passed，不改原 blocked 记录。

## 研究限制、交接与 graft 记录

研究已完成，剩余为主会话实施：先将 A 的局部请求预算/去重策略写入方案，采用上述测试接缝取得实际 red，再局部修复与完整回归。两分钟下一步：核对 A 的 15 秒单次策略及新增测试入口，确定是否作为当前修复方案；无需重查远端根因才能实现已授权的错误处理。

未验证：最小入口实际运行结果、任何修复后的浏览器表现、NH 真站、远端物理故障原因、GM 请求取消。现有旧记录只能作为 red，不能作为修复完成证据。

交付静态核对：56 个去重后的文件行号引用均存在且未越界；内嵌 Node 命令已通过 `node --check` 语法检查，但未执行。报告以外没有产品/测试写入。

graft 完整追踪包括 fetchRemoteUpdateMessage 上游/下游、TextReq 上游至 depth all、配置引用、NH/队列影响及通知时间写入。首次误用 `graft trace-calls` CLI，随后改用正确的 `graft callers`；部分概念查询命中历史目录，未以旧实现作为修改目标。

11 次有节省统计的查询：3,429 + 5,507 + 3,767 + 10,370 + 22,494 + 33,697 + 1,243 + 11,013 + 5,468 + 22,491 + 10,938 = **130,417 tokens**（graft 工具逐次估算总和，查询范围有重叠，不是实际净节省）。
