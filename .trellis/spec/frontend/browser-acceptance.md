<!-- migration-note:start -->
> 迁移来源：`.pi/browser-testing.md`（基线 `647ff26`）。正文保全，路径已重定位；命令与源码路径均从仓库根目录解释。
<!-- migration-note:end -->

# 使用 ego-browser 验收

本项目的浏览器验收统一使用 `ego-browser`。开始浏览器操作前，读取当前会话提供的 `ego-browser` 技能；API、连接排障和用户接管规则以该技能及其 `references/api.md` 为准。若技能缺失，先定位安装位置；必需能力不可用时报告具体阻塞项。

功能用例和完成标准见 [AGENTS.md](../../../AGENTS.md) 与对应 `.trellis/spec/frontend/features/**/quickstart.md`。EH 生产包验收使用 [eh-test](../../../.pi/skills/eh-test/SKILL.md)。本文只维护通用浏览器操作。

## 本地开发服务器

从仓库根目录执行。开始本地页面调试前，先核对旧服务归属，再独立启动新服务；EH 生产包验收按 `eh-test` 管理服务。

1. 创建日志目录：`mkdir -p .tmp`。检查 `.tmp/vite-dev.pid`（若存在）、目标端口的监听进程与命令，并通过 `lsof -a -p PID -d cwd` 核对工作目录。PID 文件只提供线索，需防止 PID 已被其他进程复用。
2. 已确认属于本任务的旧服务可以停止；用户已有或归属不明的服务先确认。对确认可停止的具体 PID 发送 `kill -TERM PID`，检查进程退出和端口释放后继续。没有旧服务时直接进入启动步骤。
3. 在可用端口启动后台服务。下面使用 5173；端口被其他服务占用时选择空闲端口并同步后续访问地址。`--strictPort` 让占用明确报错，避免静默换端口。

```bash
mkdir -p .tmp
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort > .tmp/vite-dev.log 2>&1 &
echo "$!" > .tmp/vite-dev.pid
```

4. 查看 `.tmp/vite-dev.log`，用 `lsof -nP -iTCP:5173 -sTCP:LISTEN` 核对监听进程，并用 `curl --fail --silent --show-error http://127.0.0.1:5173/` 确认可访问。记录实际 URL、npm 父进程和 Vite 监听 PID。日志出现错误或进程提前退出时先解决再打开页面。
5. 收尾时停止本次启动的具体服务进程（包括仍存活的 npm 父进程），再次确认归属、进程退出和端口释放；清理本次 PID 文件，保留需要交付的日志。

服务启动成功只证明本地页面可访问；功能是否通过仍须按下文完成浏览器验收。

## 1. 准备并创建任务空间

- 按 [notify-complete](../../../.pi/skills/notify-complete/SKILL.md) 在测试开始前执行短通知。
- 本地页面：按[本地开发服务器](#本地开发服务器)流程启动并确认实际端口可访问。EH：先按 `eh-test` 构建生产包并确认 Ego 中的油猴加载器配置。
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

下面的 JavaScript 示例放在 `ego-browser nodejs` 的 heredoc 中，接在恢复 `task`、`page` 之后。每轮按需重新声明变量；真实 URL 和绝对产物目录由当前任务提供。

先启用需要的事件域，再设置本轮视口。需要检查加载请求时加上 `Network.enable`：

```js
await page.cdp("Runtime.enable");
await page.cdp("Log.enable");
await page.cdp("Network.enable");

// 桌面端
await page.cdp("Emulation.setDeviceMetricsOverride", {
  width: 1200, height: 900, deviceScaleFactor: 1, mobile: false
});
await page.cdp("Emulation.setTouchEmulationEnabled", { enabled: false });
```

移动端改用下面两条命令，保持同一轮的操作和截图在该视口下完成：

```js
await page.cdp("Emulation.setDeviceMetricsOverride", {
  width: 390, height: 844, deviceScaleFactor: 3, mobile: true
});
await page.cdp("Emulation.setTouchEmulationEnabled", {
  enabled: true, maxTouchPoints: 5
});
```

**每轮重新设置视口、DPR 和触摸参数**，不能假定这些参数全部跨轮保留。截图或交互前可核对实际环境；发生意外尺寸变化时先解决，再记录验收结果：

```js
console.log(await page.evaluate(() => ({
  width: innerWidth, height: innerHeight, dpr: devicePixelRatio,
  touchPoints: navigator.maxTouchPoints,
  coarsePointer: matchMedia("(pointer: coarse)").matches
})));
```

这里模拟的是移动端视口、像素比例和触摸能力，浏览器仍为 Chromium。页面缺少 viewport meta 时，移动端布局视口可能宽于 390；记录实际布局及原因，勿修改被测页面来制造通过结果。

## 3. 导航、错误检查与交互

- 导航：`await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 })`。
- 普通刷新：`await page.reload()`；生产包需要忽略缓存刷新时：`await page.cdp("Page.reload", { ignoreCache: true })`，再用 `waitForSelector` / `waitForFunction` 等待本次加载完成。跨刷新等待元素时，结合导航事件确认新文档已提交，避免把刷新前的 DOM 当作新结果。
- DOM 精确检查：用 `page.evaluate()` 查询 `vite-error-overlay`、挂载节点等；语义快照不保证包含所有隐藏元素。发现编译错误先读取错误、修复后再继续。
- 页面结构：`console.log(await page.snapshot())`；需要视口外内容时用 `{ scope: "full_page" }`。
- 交互：依据快照使用 `page.click("@编号")`，或使用已观察到的稳定语义/CSS 选择器；输入、悬停、滚动、键盘等操作见技能 API。
- 等待：按预期结果使用 `waitForURL`、`waitForSelector` 或 `waitForFunction`。无页面参数时，后者的选项位于第三个参数，例如 `await page.waitForFunction(() => document.readyState === "complete", undefined, { timeout: 10000 })`。

原始 `page.cdp()` 调用会使旧快照的 ref 失效。顺序应为 **CDP 配置 → 快照 → 交互 → 等待结果**。页面变化后重新观察；一轮末尾打印快照，供下一轮选择目标。

## 4. 保存日志和截图

导航前启用 Runtime/Log；`page.events()` 返回并清空事件缓冲区。每次读取都将需要的事件追加保存，按导航阶段、来源和时间区分本轮记录。不能用最后一批事件代表全程日志。建议在导航/刷新前、加载完成后和关键交互后各收集一次；即使等待超时，也在 `finally` 中保存可获取的事件。

```js
const fs = await import("node:fs/promises");
// artifactDir 为本次任务在仓库 .tmp/ 下创建的绝对目录。
await fs.mkdir(artifactDir, { recursive: true });
const events = await page.events();
const relevant = events.filter(event => [
  "Runtime.consoleAPICalled", "Runtime.exceptionThrown", "Log.entryAdded",
  "Network.requestWillBeSent", "Network.responseReceived", "Network.loadingFailed",
  "Page.frameNavigated", "Page.loadEventFired"
].includes(event.method));
await fs.appendFile(`${artifactDir}/browser-events.jsonl`,
  JSON.stringify({ recordedAt: new Date().toISOString(), phase, events: relevant }) + "\n");
```

`phase` 使用当前阶段名，例如 `before-reload`、`after-load`。需要导航事件时先启用 `Page.enable`。检查 `Runtime.consoleAPICalled` 的 log/info/warning/error、`Runtime.exceptionThrown` 和 `Log.entryAdded`；区分 eHunter、原站、扩展或第三方来源，记录影响。验证新生产包时结合实际加载请求及响应内容/版本；仅有挂载节点不足以证明加载的是本次构建。

用 `await page.screenshot({ path: artifactDir + "/desktop.png" })` 保存桌面截图，移动端另存。截图后用当前会话的图片读取工具查看布局、颜色、间距、阴影、圆角、弹窗与可见状态。UI 改动必须完成桌面（1200 × 900、DPR 1、关闭触摸）和移动（390 × 844、DPR 3、开启触摸）两种视口的关键交互与截图，核对网格列数、尺寸和移动端操作；涉及断点时补测对应边界附近（如 767px、1023px）。

## 5. 收尾或交还用户

成功完成后，保存结果、日志和截图，在同一任务空间执行一次 `await task.finish({ keep: [] })` 并等待返回。仅在交付物需留在浏览器供用户继续操作时保留相应页面。清理本次创建且无需保留的服务和临时产物，保留用户已有资源，执行完成长通知。

遇到登录、浏览器权限提示或用户接管时，遵循 ego-browser 技能的 `handOff()` / 接管流程，说明用户需要完成的动作；恢复时继续使用同一空间。阻塞或报错时报告已验证与未验证部分，不把局部通过写成完整验收通过。
