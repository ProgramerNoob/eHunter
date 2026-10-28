# 使用 ego-browser 验收

本项目的浏览器验收统一使用 `ego-browser`。开始浏览器操作前，读取当前会话提供的 `ego-browser` 技能；API、连接排障和用户接管规则以该技能及其 `references/api.md` 为准。若技能缺失，先定位安装位置；必需能力不可用时报告具体阻塞项。

功能用例和完成标准见 [AGENTS.md](../../../AGENTS.md) 与对应 `.trellis/spec/frontend/features/**/quickstart.md`。EH/NH 生产包验收使用 [reader-test](../../../.pi/skills/reader-test/SKILL.md)。本文只维护通用浏览器操作。

## 本地开发服务器

从仓库根目录执行。开始本地页面调试前，先核对旧服务归属，再独立启动新服务；EH/NH 生产包验收按 `reader-test` 管理服务。

1. 创建日志目录：`mkdir -p .tmp`。检查 `.tmp/vite-dev.pid`（若存在）、目标端口的监听进程与命令，并通过 `lsof -a -p PID -d cwd` 核对工作目录。PID 文件只提供线索，需防止 PID 已被其他进程复用。
2. 已确认属于本任务的旧服务可以停止；用户已有或归属不明的服务先确认。对确认可停止的具体 PID 发送 `kill -TERM PID`，检查进程退出和端口释放后继续。没有旧服务时直接进入启动步骤。
3. 在可用端口启动后台服务。下面使用 5173；端口被其他服务占用时选择空闲端口并同步后续访问地址。`--strictPort` 让占用明确报错，避免静默换端口。

```bash
mkdir -p .tmp
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort > .tmp/vite-dev.log 2>&1 &
echo "$!" > .tmp/vite-dev.pid
```

4. 查看 `.tmp/vite-dev.log`，用 `lsof -nP -iTCP:5173 -sTCP:LISTEN` 核对监听进程，用 `lsof -a -p PID -d cwd` 核对本仓库目录，并用 `curl --fail --silent --show-error http://127.0.0.1:5173/` 确认可访问。将实际 origin、cwd、npm 父进程、Vite 监听 PID 和核实输出保存到 `.tmp/` 的服务证据文件，供下文 `source.service` 引用。日志出现错误或进程提前退出时先解决再打开页面。
5. 收尾时停止本次启动的具体服务进程（包括仍存活的 npm 父进程），再次确认归属、进程退出和端口释放；清理本次 PID 文件，保留需要交付的日志。

服务启动成功只证明本地页面可访问；功能是否通过仍须按下文完成浏览器验收。

## 1. 准备并创建任务空间

- 按 [notify-complete](../../../.pi/skills/notify-complete/SKILL.md) 在测试开始前执行短通知。
- 本地页面：按[本地开发服务器](#本地开发服务器)流程启动并确认实际端口可访问。EH/NH：先按 `reader-test` 的对应平台构建生产包并确认 Ego 中的油猴加载器配置。
- 日志、截图、下载和报告保存到仓库 `.tmp/`；传给浏览器 API 的产物路径使用绝对路径。

通过 pi 的 `bash` 工具执行以下命令，每个用户任务只创建一次任务空间：

```bash
ego-browser nodejs <<'JS'
const task = await taskSpace("eHunter 验收");
const page = task.page("p1");
console.log({ spaceId: task.spaceId, page: page.label });
JS
```

记录返回的数字 `spaceId`，后续每轮都用 `await taskSpace(实际数字)` 恢复同一空间，再用 `task.page("p1")` 获取页面。已有空间时直接恢复；新空间自带 `p1`，用 `page.goto(url)` 导航它。每次 `ego-browser nodejs` 都是新的 Node.js 进程，JavaScript 变量不会跨轮保留。

## 2. 每轮先配置，再操作

每轮在 `ego-browser nodejs` 中导入 [browser-preflight.mjs](../../../scripts/browser-preflight.mjs)，用 `withBrowserPreflight(options, runChecks)` 包住导航、正常打开准备和功能检查。先确认服务或构建证据可读，再恢复同一 `task`、`page`；每次调用使用本仓库 `.tmp/` 内新的绝对 `artifactDir`，最后一级目录必须尚不存在，由 helper 创建。

helper 自己启用 Runtime、Log、Page、Network、Debugger、Profiler，启动 precise coverage，保存旧文档事件，重发以下固定 profile，并执行 `navigate`。调用方选择 `'desktop'` 或 `'mobile'`，预期独立于页面实测值：

| profile | 阅读器 CSS 宽×高 | 实际 DPR | mobile 命令参数 | 实际 touchPoints / coarse |
| --- | --- | --- | --- | --- |
| `desktop` | 1200×900 | 1 | false | 0 / false |
| `mobile` | 390×844 | 3 | true | 5 / true |

CSS 主断言是 `innerWidth` / `innerHeight`；DPR 容差固定为 `1e-6`。client 尺寸、visualViewport / scale、viewport meta 和 layout metrics 留作诊断。mobile 的证据是本轮完整命令参数与成功 CDP 回执，没有直接回读接口；窄屏、UA、触摸或截图像素不能替代这项回执。取证期间由 helper 独占模拟配置和 `page.events()`；配置需要变化时结束本轮，重新准备。

正常 UI 打开阅读器属于独立准备阶段。helper 先确认新主文档 frame / loaderId / context、代码身份与执行、日志、DPR 和触摸能力，保存关闭状态的原站环境，再调用 `prepareReader`。打开后等待挂载与可见 DOM，严格核对阅读器 CSS 尺寸，通过后才进入 `runChecks`。EH 缺 viewport meta 时打开前原站宽度可能大于390；保留该观察，按正常 UI 打开后检查。尺寸仍错误即 blocked，保持预期和 mobile 开关，不向页面补 meta。
### EH/NH userscript source 与动态脚本

EH 与 NH 都通过 userscript 生产包身份链路验收；NH 使用 `source.kind: 'nh'`，要求当前文档 URL 匹配 `https://nhentai.net/g/<id>/<page>/`，并复用 bundle、loader、权限、coverage 和单一生产候选检查，但不要求 EH 登录态。当前 `source.kind: 'nh'` 的准备证据仍须来自真实 NH 域注入，不得用 fixture 代替产品验收。

userscript 场景不把持续到达的非项目站点脚本当成 Vite 项目模块 inventory；helper 会在每个保护检查点检查并记录晚到脚本，晚到的 production-shaped bundle 仍阻断，非生产-shaped host/third-party 脚本保留归因供审阅。生产包、loader 或输入变化后，原轮次证据失效，必须新建 artifact 并重新导航。

### Vite source 与代码身份

服务归属由上面的启动流程核实，helper 只检查记录字段和证据文件可读性；外层负责记录真实性。以下示例中的 `root` 是当前仓库绝对路径，`origin`、`viteListenerPid`、`viteServiceEvidencePath` 来自本轮服务核实；`sceneVueUrl`、`sceneStyleUrl` 是当前场景应加载的深层 Vue 组件及 style 虚拟模块 exact URL，保留真实 query，可从当前场景已保存的模块请求核对：

```js
const source = {
  kind: 'vite',
  origin,
  service: { cwd: root, pid: viteListenerPid, origin, evidence: viteServiceEvidencePath },
  requiredModules: [`${origin}/src/main.ts`, sceneVueUrl, sceneStyleUrl],
  // inputs: ['additional-scene-input.json'], // 仅追加本场景实际需要的仓库输入
};
```

例如路径形如 `/core/components/widget/CircleIconButton.vue`；对应 style URL 必须带本轮实际的 `?vue&type=style&...`，从当前请求取值，不复制历史 query。必需模块缺失会阻断场景。默认输入指纹包含 `src/`、`core/`、`index.html`、两个 Vite 配置、`package.json` 和锁文件；追加 `inputs` 不能移除它们。

helper 比对当前文档**全部已加载项目模块**：Node 从已确认 origin 获取同一 exact URL 的转换全文作为 expected，actual 来自 `Debugger.getScriptSource`。每项保存 SHA-256、scriptId、当前文档/context 和同一脚本全长顶层非零 coverage 范围；Vue/style/query 与仓库内 `/@fs/` 模块均纳入。源码保持原样，只有解析、入口相符或 DOM 存在都不满足执行证据。

`inventory` 分列已加载、必需但缺失、未加载输入、非项目脚本及锁文件关联。第三方预构建脚本不属于项目源码比对；独立 CSS/图片/字体记录响应、本地同源 body 和页面应用观察，视觉检查仍由验收者完成。范围仅覆盖清单中的当前文档 JS，未触发分支、整个工作树和独立资源的视觉新鲜度须另列未验证。

源码 identity 报 `Exact source or full-length top-level execution evidence missing` 时，先看 details 里 `exact: false` 项的 `difference` 字段：它给出首个不等字符的 `offset`、所在 `line`、两边该行内容（`expectedLine` / `actualLine`）和 `lengthDelta`。如果两边只差一行已删的注释或几字节，通常不是陈旧产物（bundle）而是 Vite 浏览器缓存——浏览器保留了旧 transform 结果，而 `fetch` 走新 transform，两边全文因此不等。在 `navigate` 里先清缓存再导航：

```js
navigate: async () => {
  await page.cdp('Network.clearBrowserCache', {});
  await page.cdp('Network.setCacheDisabled', { cacheDisabled: true });
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
},
```

不要用改源码、重启 dev server 或换 origin 来绕过：这些都会改变本轮输入的指纹或归属记录。

### 当前页面 bootstrap

需要以页面真实初始状态（persisted 阅读模式、非起始页、已自动打开的 reader）验收时，用 `bootstrapReader` 作为功能断言前的准备步骤，不通过清 storage、改设置或注入脚本制造状态。它在本轮 `withBrowserPreflight` 内、`prepareReader` 之后调用，复用同一 `page`、`taskSpace` 和本轮 `artifactDir`；`page.events()` 仍只由 `withBrowserPreflight` 消费。

```js
const { bootstrapReader, comparePageBaseline } = await import(
  pathToFileURL(`${root}/scripts/browser-preflight.mjs`).href
);
const prep = await bootstrapReader({
  page, taskSpace, profile, artifactDir,
  closeReader: async () => page.click(closeSelector, { timeout: 15000 }),
  openReader: async () => page.click(openSelector, { timeout: 15000 }),
  // observe: 可选；缺省在页内执行内置 observeReaderState
});
```

`closeReader` / `openReader` 是无参回调，只在页面已自动打开、或仍关闭时按需各调用一次，全部串行；没有提供回调时只观察，helper 不猜 selector。`observe` 返回与内置 `observeReaderState()` 相同的页内对象。

调用不抛异常，返回 `{ status, prepFacts, evidence, errors, calls }`；`status` 取 `blocked` > `unknown` > `ready`。`prepFacts` 含 `taskSpace`、`page {label,spaceId}`、`url`、`profile {requested,expected,actual,matches}`、`readerOpen`、`readingMode`（`book`/`scroll`/`unknown`）、`scrollContainer`（真实 `.content.scroll-mode .awesome-scroll-view` 的 `scrollTop`/`scrollHeight`/`clientHeight`）、`pageBaseline`、`windowScroll`、`documentScripts {first,last}`、`readyState`、`calls`、`observedAt`（首次成功观察）。不能证明模式、容器或 baseline 时记 `unknown` 并附错误，不用 window/document 或默认页码补齐。

`errors[].code`：入参阶段为具体值 `invalid-artifact-dir`、`invalid-page`、`invalid-profile`、`invalid-task-space`、`invalid-timeout`；页内观察对象不可解析为 `observation-invalid`；其余观察/准备失败为 `vite-error-overlay`、`document-not-ready`、`reader-not-mounted`、`reader-not-open`、`mode-ambiguous`、`mode-unknown`、`scroll-container-unknown`、`baseline-unknown`、`host-script-late`、`profile-mismatch`、`page-navigated`、`observation-failed`、`close-reader-failed`、`open-reader-failed`、`bootstrap-failed`、`evidence-write-failed`、`close-reader-timeout`、`open-reader-timeout`。`closeReader`/`openReader` 成功后会在截止时间内轮询到目标开/关状态；每次观察自身最多再耗 `timeoutMs`，因此最坏总耗时约 `2× timeoutMs`。轮询期间观察失败按 `observation-failed` 记录，不再追加 timeout 码。超时记 blocked 并附对应 timeout 码，不重试。不要用 `invalid-*` 前缀判定入参失败：`observation-invalid` 也是观察失败码，却不在该前缀下。通过入参校验的调用把结果追加到 `<artifactDir>/reader-bootstrap.jsonl`（`artifactDir` 内子目录同样可用），目录必须解析到仓库 `.tmp/` 内；入参校验失败（任一 `invalid-*`）时不写证据并返回 `evidence: null`，此时 `artifactDir` 本身不可信。

`pageBaseline` 只是证据；断言用 `comparePageBaseline(before, after)` 的相对结果。`comparable` 为 false 时读取 `blockedReason`，按优先级取第一个：`navigated` > `incomparable-spread`（spread 总数不同）> `no-baseline`；页面导航会盖掉后两者。`comparable` 为 true 时该字段为 `null`。`status` 非 `ready` 时下游不得生成通过结论；`unknown` 表示观察不足，不是产品失败，也不是 prepared。fixture 只证明 helper 逻辑，真实初始状态仍须在本地 Vite 与 EH 场景实测。

### 一轮调用

以下为放在恢复 `task`、`page` 之后的 JavaScript 模板。每轮重新声明 `root`（真实仓库绝对路径）、`origin` 和上述 `source`；`profile` 为固定 profile 名，`openSelector`、`modeSelector`、`closeSelector` 是本轮快照已观察的稳定选择器。EH/NH 使用 [reader-test 的 source](../../../.pi/skills/reader-test/SKILL.md#4-准备-source)。所有方法顺序 `await`：

每次调用必须传入非空 `scenarioInputs`：本轮实际依赖的仓库相对路径数组（例如场景配置或输入快照），不能使用绝对路径或越出仓库的路径；helper 在导航前记录每项 SHA-256 与聚合值，并在轮次结束前复核，变化即 blocked。不要列入回填后必然变化的文件（如任务 `acceptance.json`）：`verify-browser` 会重算这些输入，内容一变即返回 `stale`（`scenario input changed since this round`），使已通过的轮次无法用于验收记录；声明场景脚本、输入快照等轮次结束后保持不变的路径。`taskSpace` 可选，用于把产物关联到用户任务空间。下面的模板先用 `fs` 写出一份输入快照再传入，照抄即可运行；实际场景替换成本轮真正依赖的仓库文件。

```js
const { pathToFileURL } = await import('node:url');
const { randomUUID } = await import('node:crypto');
const fs = await import('node:fs/promises');
const { withBrowserPreflight, BrowserPreflightError } = await import(
  pathToFileURL(`${root}/scripts/browser-preflight.mjs`).href
);
const scenarioInputs = ['.tmp/scenario-inputs/reader.json'];
await fs.mkdir(`${root}/.tmp/scenario-inputs`, { recursive: true });
await fs.writeFile(`${root}/${scenarioInputs[0]}`, JSON.stringify({ scene: 'reader', profile }) + '\n');
const artifactDir = `${root}/.tmp/browser-preflight/${profile}-${randomUUID()}`;
try {
  const result = await withBrowserPreflight({
    page, artifactDir, profile, source, scenarioInputs,
    timeoutMs: 15000,
    checksTimeoutMs: 120000,
    navigate: ({ timeoutMs }) => page.goto(`${origin}/`, {
      waitUntil: 'domcontentloaded', timeout: timeoutMs,
    }),
    prepareReader: async ({ signal, timeoutMs }) => {
      signal.throwIfAborted();
      console.log(await page.snapshot());
      await page.click(openSelector, { timeout: timeoutMs });
    },
  }, async check => {
    await check.phase('switch-mode', async ({ signal, timeoutMs }) => {
      signal.throwIfAborted();
      console.log(await page.snapshot());
      await page.click(modeSelector, { timeout: timeoutMs });
      // 在此按本功能契约等待状态，并用 check.assert(...) 检查产品结果。
    });
    const actual = await check.checkpoint('reader-visible');
    check.assert(actual.open, '阅读器应可见', actual);
    console.log({ screenshot: await check.screenshot('reader.png') });
    await check.closeReader(async ({ signal, timeoutMs }) => {
      signal.throwIfAborted();
      console.log(await page.snapshot());
      await page.click(closeSelector, { timeout: timeoutMs });
    });
    await check.openReader();
  });
  console.log(JSON.stringify(result)); // finally 和必要保存全部完成后才返回
  console.log(await page.snapshot());
} catch (error) {
  if (!(error instanceof BrowserPreflightError)) throw error;
  console.error(JSON.stringify(error.result));
  process.exitCode = error.exitCode;
}
```

该模板演示取证顺序，功能断言按对应 quickstart 补齐；执行点击或 helper 返回成功本身不证明模式正确。不要将准备检查的断言当成全部功能验收。

`navigate` 必须产生新文档导航或刷新，可换为 `page.reload({ timeout: timeoutMs })`，或 `page.cdp('Page.reload', { ignoreCache: true }, { timeout: timeoutMs })`；helper 等待并校验新提交，历史文档证据不放行。`prepareReader` 仅正常打开，不做功能检查。单条命令/动作默认15秒、最大60秒；整个功能回调默认120秒、最大600秒。回调接收 `signal` 和有限 `timeoutMs`，遵守中止信号。helper 的超时不能强制取消任意 Promise；超时后停止直接操作 `page`，处理可能仍在执行的动作，再开始下一轮。

## 3. 功能阶段与观察

| 方法 | 责任与通过条件 |
| --- | --- |
| `phase(name, action, { requiredModules?: [...] })` | 关键动作前后检查身份、日志与严格环境；动作完成后新增的必需懒加载 exact URLs 写在 options，检查通过前不记该功能通过 |
| `checkpoint(name, options)` | 重新检查；可追加 `requiredModules`，不执行功能动作 |
| `screenshot('name.png')` | 简单 PNG 文件名，固定 `scale: 'css'`；前后重新检查并确认文件保存，返回绝对路径。在 `phase` 回调里调用会报 `Protected browser actions must be awaited sequentially`：先 `await check.checkpoint('label:capture')`，再在 phase 之外单独截图 |
| `closeReader(action)` | 正常 UI 关闭；比较本轮打开前原站 viewport meta，保存恢复状态，不要求关闭后原站宽度390 |
| `openReader()` | 复用 `prepareReader` 正常打开，再通过严格环境门；关闭后下一阅读器操作先调用它 |
| `assert(condition, message, details?)` | 明确的产品断言；进入功能后的失败为 failed，其余操作/准备/取证异常为 blocked |

导航或新增模块触发身份复查；输入、bundle、loader 的变化或 Vite HMR 使本轮失效，停止相关分支并用新目录重新导航取证。不能在同轮修改代码后沿用旧结果。受保护方法失败后，即使调用者捕获异常，也不能继续后续受保护动作或取得通过结果。

若导航后阅读器已经自动打开，helper 没有本轮原站基线，`closeReader` 会 blocked；先在外层以已观察的正常 UI 关闭，再开始新的导航取证轮，让 helper 保存关闭状态基线。保留用户存储，不从 managed meta 构造原站基线。

使用 `page.snapshot()` 观察界面，视口外内容用 `{ scope: 'full_page' }`；用 `page.evaluate()` 精确查询 DOM。每个受保护动作在其前置 CDP 检查后取快照，再使用本轮观察的 ref 或稳定选择器；CDP 会使旧 ref 失效，页面变化后重新观察。输入、悬停、滚动、键盘等操作见技能 API。

等待按预期结果使用 `waitForURL`、`waitForSelector` 或 `waitForFunction`；无页面参数时选项位于第三个参数，例如 `await page.waitForFunction(() => document.readyState === 'complete', undefined, { timeout: 10000 })`。将功能等待和产品断言放在对应 `phase` 中，保留动作前后事件。

## 3.1 计数类断言与来源判定

DOM 计数、站点自带产物、日志归因、窄视口与过渡动画等容易误判的场景见[计数类断言与来源判定](./browser-acceptance/counting-assertions.md)。

## 4. 证据、截图和失败回填

helper 是本轮唯一 `page.events()` 消费者。所有捕获的原始事件先追加到 `events.jsonl`，再共同分析身份与错误；每批含 runId、roundId、page、phase、sequence、recordedAt 和完整 events。导航前旧文档、导航/加载、准备、关键动作及截图前后分阶段保存；不要另行 drain 或用最后一批替代全程日志。

每轮目录保存初始 `manifest.json`（incomplete）、`source.json`、指纹、身份、环境记录及源码副本；EH 另有权限记录，Vite 另有资源记录。`result.json` 在 finally 完成后原子保存。命令回执在内存中保留整轮，`observed` 定稿后才落盘：`passed` 只写汇总 `commands.json`（回执数、按方法聚合的次数；该轮既已通过，就不再记录失败计数），非 passed 把完整逐条回执写成 `commands.jsonl` 供事后排查；两者都直写而非原子写，写失败则将该轮改记为 blocked。回执不随每条命令即时落盘，因此进程被硬终止、或尚未进入 finally 写入阶段的轮次不会留下命令回执。读取其中的 `logs`，检查 console 的 log/info/warning/error、未捕获异常和 Log 事件；身份和 coverage 仅证明该文本执行，不能替代异步平台初始化及功能结果。

`python3 scripts/acceptance.py verify-browser <artifact-dir>` 只读校验该轮产物：重算 source bundle/loader 或 Vite 输入、`scenarioInputs` 与 Vite 聚合指纹，并复核 manifest/result 关联、`observed`、`checks`、`errors`、`eventCollection.unresolved` 与 source-specific identity。状态与退出码为 `passed` 0、`stale`/`blocked` 1、`invalid` 2、`legacy` 3（缺少 provenance 的历史产物）；输出 JSON 的 `errors` 给出可定位的不匹配事实，命令不修改产物或 `acceptance.json`。`verify-browser` 复核 source 与声明输入，不覆盖 `scripts/browser-preflight.mjs` 自身版本；helper 变更后必须重跑轮次，不能沿用旧产物。

超时或异常仍保存 finally 事件、原始错误及采集/写盘错误。`page.events()` 超时不取消底层读取：helper 保留唯一在途读取及原阶段，finally 额外有界等待1000毫秒；迟到批次仍先追加落盘，超时状态保持 blocked。`result.eventCollection.unresolved` 非空表示返回结果时读取尚未结束，外层须处理该在途调用后才开始下一轮；进程退出后的批次无法保证保存。drain 后保存失败保留内存批次，在 `BrowserPreflightError.result.unsaved` 与 stderr 给出诊断；result 保存失败也禁止成功。硬终止不能保证 finally，只有初始 incomplete manifest 或 `result.pending.json` 不表示完成；CDP buffer 容量未知，不承诺绝对无事件丢失。coverage 持续启用以覆盖新增模块，可能影响时序，不作为严格手势时间或性能验收证据。

截图用 `check.screenshot(...)` 保存，再用当前会话图片读取工具检查布局、颜色、间距、阴影、圆角、弹窗和可见状态；helper 的 `visualReview` 仍为 unrun，主会话记录实际视觉检查。PNG 使用 CSS scale，像素宽度不能推导 DPR。UI 改动完成桌面与移动两种固定 profile 的关键交互与截图；涉及断点时补测边界。helper 只支持两个固定 profile，其他断点须另记实际配置与证据，严格预检覆盖范围保持明确。

主会话依 [逐项验收协议](./quality-guidelines.md#acceptance-record-schemaversion-1) 唯一回填 `acceptance.json`。准备或必要取证/保存失败记 runtime/blocked，下游未执行功能与截图记 unrun；进入功能后的明确 `check.assert` 失败记 failed。若产品失败与 finally 保存失败并存，保留产品 failed 项及证据 blocked 项，不能互相覆盖。`result.observed` 只代表本次 helper 调用；`checks: 'executed'` 表示回调执行完，具体产品结果和视觉项仍据实回填。

同一场景跑过多轮时，回填只登记通过轮并不够：说明里要写清失败轮的存在、它的 `phase` 与错误文本、两次运行之间脚本的改动内容、以及失败轮产物是否保留。失败的 `check.assert` 轮要原样留在 `.tmp/browser-preflight/` 下作为反证——它证明断言真的会在产品出错时变红，删除后就只剩“一直绿”的断言。

失败抛出的 `BrowserPreflightError.result` 保留分项事实，外层保存调用日志并传播 `error.exitCode` 非零。`acceptance.py run` 会把普通非零命令记为 failed，不能自动映射浏览器准备 blocked；浏览器项由主会话读取真实结果回填，工具自测/静态断言可走 command。最后运行既有 summarize，由其计算结果，不手写整体 passed。

### 资源清理检查

收尾资源声明、`cleanup-browser` 输入字段与分类口径见[资源清理检查](./browser-acceptance/resource-cleanup.md)。

## 4.5 预检断言覆盖清单

`withBrowserPreflight` 的环境断言、已覆盖项与未覆盖项的完整清单见[预检断言覆盖清单](./browser-acceptance/preflight-assertions.md)。新增或移除预检断言时同步更新该清单与 `tests/browser-preflight.test.mjs`。

## 5. 收尾或交还用户

成功完成后，保存逐项结果、日志和已阅读的截图，按顺序完成收尾证据：停止本轮服务并确认进程退出、端口释放 → 对每轮产物运行 `verify-browser <artifact-dir>` → 在同一任务空间执行一次 `await task.finish({ keep: [] })` 并等待返回，关闭 agent-owned 页面 → 用 `cleanup-browser` 生成 `.tmp/` 资源报告（页面按关闭后的观察记为 `closed`）→ 由主会话回填并运行 `acceptance.py summarize`。交付物需留在浏览器供用户继续操作时保留相应页面，并把该页面显式记为 `open`；报告出现 residual 时人工核对并保留证据，不能为了退出码修改观察。helper 不创建/结束空间或管理服务；外层按服务归属核实并停止本次服务及 npm 父进程，确认退出和端口释放，清理本次创建且无需保留的临时产物，保留用户已有资源、存储和交付证据，执行完成长通知。资源报告只证明声明资源的收尾状态，不替代功能验收；residual/unknown 保留并人工核对归属后再处理。

遇到登录、浏览器权限提示或用户接管时，遵循 ego-browser 技能的 `handOff()` / 接管流程，说明用户需要完成的动作；恢复时继续使用同一空间。阻塞或报错时报告已验证与未验证部分，不把局部通过写成完整验收通过。
