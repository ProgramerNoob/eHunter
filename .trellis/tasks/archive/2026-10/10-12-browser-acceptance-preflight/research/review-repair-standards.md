# Standards 修复轮审查：仍有一项 P1，不能收口

本轮仅完成委派的只读 Standards 审查，未递归调用审查代理、未修改实现/测试/指南/任务状态/acceptance.json/冻结文件，未启动浏览器或服务。唯一写入是本报告。**结论：P1 一项，P0/P2 无新增发现。上一轮迟到 drain、同长度旧包/重复包、第三方正文或来源 URL 含 ehunter 的误归因问题已按各自范围修复；长度不同、来源可识别的旧生产包仍会被误当成可忽略的包装候选，且可绕过最终身份检查。** 浏览器验收另外仍 blocked，此报告不代替独立 Spec 审查。

## 冻结和审查范围

- Active task：`.trellis/tasks/10-12-browser-acceptance-preflight`。先读取 check.jsonl 全部五项上下文，再读 PRD、design、implement，及 AGENTS.md、frontend index/quality/browser-acceptance、EH 操作指南。
- 采用 trellis-check 的 Standards 检查流程，用户只读约束优先于技能中的自动修复/运行构建步骤。源码先浏览 `graft/scripts/browser-preflight.md`、`graft/tests/browser-preflight.test.md`，再读取目标定义范围；图卡仍为旧行数，精确位置以冻结源码为准。没有调用会刷新图索引的命令。
- 冻结依据：[review-freeze-repair.json](../../../../.tmp/browser-preflight/final-verification/review-freeze-repair.json)，createdAt `2026-10-12T19:34:23.376128+00:00`，branch `master`，base/HEAD `3b64ddf676b5cf0fe6e94c91de0e17c2abc0b4e1`。
- 冻结清单全部 **13** 个文件均匹配 SHA-256 与字节数。冻结文件自身 SHA-256 为 `0250914e83563bc26016bd953065ee1ce00e4b615a4bd6f63b4fe6e1c2724109`。实现 SHA-256 `f253286722bebdd2364f2d2957e69d715a654d8c280814a491ea6d352840b025`，测试 SHA-256 `ecac9dce5cf3a2fed5862e01daf28fb65dc9003989c286604638e5fed1f2419f`。
- 工作区：四个已跟踪修改（package、两个操作指南、quality）、新增 helper、测试及任务目录；暂存区为空。已核对工作区/暂存区 diff，`git diff --check` 和 `git diff --cached --check` 均 exit 0。未跟踪 helper/测试单独阅读，未用 diff 无输出代替审查。
- 本轮范围不含产品、loader 或锁文件修改；没有 src/core/core_old/old 的任务改动。无需声称完成 EH/NH 产品基础请求层回归。

## S1 · P1：长度不同的已执行旧生产包被排除，仍可返回 passed

**精确位置：`scripts/browser-preflight.mjs:409`、`scripts/browser-preflight.mjs:434`、`scripts/browser-preflight.mjs:449`；候选入口 `scripts/browser-preflight.mjs:386`，收尾调用 `scripts/browser-preflight.mjs:693`。** 对应规范：PRD R2/R5、AC2/AC5；`.trellis/tasks/10-12-browser-acceptance-preflight/design.md:36` 的“候选长度只用于筛选”；质量指南要求旧代码和不完整取证不能被放行。

关键代码：

```js
// scripts/browser-preflight.mjs:386：明确 eHunter URL 的不同长度脚本仍会被收进候选
? active.filter(s => s.length === bundle.length || /ehunter/i.test(s.url))
// scripts/browser-preflight.mjs:409：但仅凭长度把它判成非完整包
fullBundleCandidate: sourceRecord.kind === 'eh' && script.length === bundle.length,
// scripts/browser-preflight.mjs:434：随后只检查同长度子集
const bundleRows = rows.filter(row => row.fullBundleCandidate);
requireCondition(bundleRows.length === 1, 'Exactly one current production bundle candidate is required', bundleRows);
requireCondition(bundleRows[0].verified, 'Exact source or full-length top-level execution evidence missing', bundleRows);
// scripts/browser-preflight.mjs:449：最终身份库存也只考虑同长度子集
? current.filter(s => s.length === bundle.length)
```

来源明确的旧包虽已完整执行、全文不符，仍被排除在强制身份验证之外。非同长度不等于 loader 包装。收尾新出现的这类脚本连 `result.identity` 都不再刷新，`identityIsCurrent()` 仍为 true。当前包存在不能证明页面行为仅由当前包产生。

**只读受控复现（下方完整命令，实际 exit 0，断言确认缺陷）：** 复用冻结测试的 `PageFixture` 和 BUNDLE/LOADER，当前文档/context 不变；所有 fs 写入重定向到 Map，磁盘只读取两个冻结源文件。当前包 `BUNDLE.length=158`，旧包 `BUNDLE.replace('中文😀A','中文😀B') + '\n// old build'` 长度 **171**；同版本但内容不同，两者顶层 count=1。固定 desktop 预期、源码精确比较和 coverage 规则未放宽。

| 变体 | 旧包来源与到达阶段 | 实际结果 |
| --- | --- | --- |
| static-userscript-url | `chrome-extension://test/userscript.html?name=eHunter.user.js&id=static`，导航期间与当前包并存 | passed；callback **1**；screenshot **1**；旧项 exact=false、verified=false、fullBundleCandidate=false、count=1；持久化 result=passed |
| bundle-response-url | `http://127.0.0.1:8787/ehunter.iife.js`，导航期间与当前包并存 | 同样 passed/callback1/screenshot1；明确 bundle URL 的旧项仍被忽略 |
| late-named-stale | 同 static-userscript-url，在 `Profiler.stopPreciseCoverage` 收尾命令时产生 | passed/callback1/screenshot1；旧脚本事件已进入库存，但最终 identity 仅包含 current；持久化 result=passed |

静态安装前提由调用者如实核实；本复现与现有双包回归一样使用既有夹具声明，不声称真实安装错误已经发生。这里的发现是：实际脚本证据已经证明当前文档存在冲突，helper 仍忽略证据并放行。即使旧包经 loader 的另一条执行路径出现，完整包身份门也有相同问题。

**建议修复范围：** 统一 verifyIdentity 与 identityIsCurrent 的 EH 相关库存定义。对明确生产来源或可识别生产正文的候选，不能以长度不同作为包装豁免；只对有依据确认的 loader 包装单列记录，对冲突/无法区分的生产候选阻断。补充不同长度旧包共存、明确 bundle URL 冲突以及收尾出现的冲突回归。保留真实 loader 包装的正常对照，避免把所有名含 ehunter 的第三方脚本都当产品；不要扩大到产品或 loader 改动。实现策略由主会话与独立 Spec 审查核对，本报告未修改代码。

### 完整只读复现命令

以下命令只从磁盘读取源码，所有 mkdir/writeFile/appendFile/rename 都在 `mem` 对象中操作 Map，没有真实磁盘写入、浏览器、服务或网络。动态加载删除 export/import 包装，但不改变 helper 的业务代码；`import.meta.url` 对应原文件绝对 URL。命令 exit 0 表示准确复现并断言错误放行，并非验收通过。

```bash
node --input-type=module <<'JS'
import * as disk from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import assert from 'node:assert/strict';
const root=process.cwd();
const helper=await disk.readFile('scripts/browser-preflight.mjs','utf8');
const fixture=(await disk.readFile('tests/browser-preflight.test.mjs','utf8')).split('async function fixture(')[0];
function load(text,file,fs,returns){
  return new Function('fs','path','fileURLToPath','createHash','randomUUID','delay','console',
    text.replace(/^import .*;\r?\n/gm,'').replace(/\bexport (?=class|async function)/g,'')
      .replaceAll('import.meta.url',JSON.stringify(pathToFileURL(path.join(root,file)).href))
      +`\nreturn {${returns}};`)(fs,path,fileURLToPath,createHash,randomUUID,delay,{error(){}});
}
const results=[];
for(const variant of ['static-userscript-url','bundle-response-url','late-named-stale']){
  const files=new Map(),dir=path.join(root,'.tmp/browser-preflight/standards-memory',variant);
  const mem={
    async realpath(p){return path.resolve(p)}, async mkdir(){},
    async writeFile(p,v){files.set(p,Buffer.from(v))},
    async appendFile(p,v){files.set(p,Buffer.concat([files.get(p)??Buffer.alloc(0),Buffer.from(v)]))},
    async readFile(p,enc){const b=files.get(p);assert.ok(b,p);return enc?b.toString(enc):Buffer.from(b)},
    async stat(p){const b=await this.readFile(p);return {size:b.length,isFile:()=>true}},
    async access(p){assert.ok(files.has(p))},
    async rename(a,b){files.set(b,files.get(a));files.delete(a)}
  };
  const {withBrowserPreflight}=load(helper,'scripts/browser-preflight.mjs',mem,'withBrowserPreflight');
  const {PageFixture,BUNDLE,LOADER}=load(fixture,'tests/browser-preflight.test.mjs',mem,'PageFixture,BUNDLE,LOADER');
  const page=new PageFixture(),bundlePath=dir+'/bundle.js',loaderPath=dir+'/loader.js';
  const evidence=dir+'/prerequisites.json',artifactDir=dir+'/artifacts';
  const bundleUrl='http://127.0.0.1:8787/ehunter.iife.js';
  for(const [p,s]of [[bundlePath,BUNDLE],[loaderPath,LOADER],[evidence,'{}']])await mem.writeFile(p,s);
  const stale=BUNDLE.replace('中文😀A','中文😀B')+'\n// old build';
  const staleUrl=variant==='bundle-response-url'?bundleUrl:
    'chrome-extension://test/userscript.html?name=eHunter.user.js&id=static';
  page.onNavigate=()=>{
    page.addScript('current','',BUNDLE);
    if(variant!=='late-named-stale')page.addScript('stale',staleUrl,stale);
  };
  if(variant==='late-named-stale')page.onCommand=method=>{
    if(method==='Profiler.stopPreciseCoverage')page.addScript('stale',staleUrl,stale);
  };
  let callbacks=0;
  const result=await withBrowserPreflight({
    page,artifactDir,profile:'desktop',timeoutMs:100,
    source:{kind:'eh',bundlePath,loaderPath,bundleUrl,build:{exitCode:0,evidence},
      installation:{loggedIn:true,dynamicLoaderEnabled:true,staticScriptDisabled:true,evidence}},
    navigate:()=>page.goto(),prepareReader:()=>page.open()
  },async api=>{callbacks++;await api.screenshot('reader.png')});
  assert.equal(result.observed,'passed');assert.equal(callbacks,1);assert.equal(page.screenshotCount,1);
  results.push({variant,observed:result.observed,callbacks,screenshots:page.screenshotCount,
    currentLength:BUNDLE.length,staleLength:stale.length,staleExecutedCount:1,
    rows:result.identity.map(r=>({scriptId:r.scriptId,url:r.url,exact:r.exact,verified:r.verified,
      fullBundleCandidate:r.fullBundleCandidate,count:r.topLevel?.ranges[0]?.count})),
    persistedObserved:JSON.parse(await mem.readFile(artifactDir+'/result.json','utf8')).observed});
}
console.log(JSON.stringify({filesystem:'Only source reads reached disk; mutations stayed in memory',results},null,2));
JS
```

## 修复验证与未解决边界

### 单一事件消费者：本轮未发现残余阻塞缺陷

`startDrain()`（scripts/browser-preflight.mjs:217）让底层 page.events 的完成、批次保存和分析保持在同一 promise 中；仅在真正 settle 的 finally 清锁（scripts/browser-preflight.mjs:238）。`drain()`（scripts/browser-preflight.mjs:249）复用 activeDrain，等待超时不会启动另一消费者。底层错误 catch 后返回 outcome，因此迟到 rejection 不会成为未处理 promise。批次先追加待保存集合并写盘，再 consume；保存失败可保留原始批次。finally 有固定 **1000ms** 宽限并记录 unresolved，不能因此宣布成功。

除现有 `tests/browser-preflight.test.mjs:404` 的回归，本轮用内存 fs 和原 PageFixture 运行九个检查（实际 exit 0），监听 `unhandledRejection` 并在所有释放完成后检查为空：

| 场景 | 观察 |
| --- | --- |
| 请求 timeoutMs=25，60ms 后返回唯一 marker 批次 | blocked/callback0；最大 events 并发 **1**；eventsCalls **3**；返回前 marker 已保存，unresolved **0** |
| 同样超时，60ms 后底层 reject | blocked/callback0；最大并发 **1**；底层原始 `fixture late drain rejection` 保留于 errors；未处理 rejection **0** |
| 请求超过 finally 宽限，helper 返回后才释放 | blocked/callback0；最大并发 **1**；eventsCalls **2**，持久化 unresolved **1**；返回前 marker 未保存，释放后 marker 已追加；未处理 rejection **0** |
| 正常 named loader 包装 + 当前生产包 | passed/callback1，完整包候选恰一项，包装行 verified=false 不污染包身份 |
| 同长度旧包 + 当前包 | blocked/callback0，`Exactly one current production bundle candidate is required` |
| 两份当前包 | 同上 blocked/callback0 |
| 收尾出现第二份同长度当前包 | blocked/callback1；`New script/document arrived during final collection` |
| 第三方错误正文含 `https://ads.example/ehunter` | passed/callback1，host-or-third-party/retained-for-caller-review |
| 第三方错误来源 `https://ads.example/ehunter-ad.js` | 同上正确归因 |

**边界：** helper 返回时 unresolved 项不会被重写成 completed；其后迟到的已取得批次会追加，但已落盘 result 仍是返回时 blocked/unresolved 快照。进程退出/硬终止不能保证后来批次，CDP buffer 容量未知。本轮证明受控 Promise/保存路径，不声称真实 Ego 的 timeout 根因已解决或事件绝对无丢失。

### EH 双包修复：同长度范围通过，长度不同范围失败

`tests/browser-preflight.test.mjs:190` 的两项新回归分别覆盖当前+同长度旧包与当前+当前包，并断言两项已执行候选、UI 未打开。verifiedScriptIds 现在仅纳入已验证的完整包，修正了上轮将所有候选都加入集合的问题。identityIsCurrent 对新增同长度候选也会阻断。S1 的不同长度候选/明确来源/收尾场景未被这74项测试覆盖，修复后的存在性误放行仍未完全消除。

包装正常对照不仅使用夹具：旧真实 EH identity 记录中 loader scriptId **33**，URL `chrome-extension://dhdgffkkebhmkfjojejmpbldmpobfkfo/userscript.html?name=eHunter-dev-loader.user.js&id=38667d76-bcfa-4b5b-ab25-8f065c6c96e9`，actual.length **2659**；真正生产 eval scriptId **43**，空 URL，actual.length **431923**，UTF-8 **442864**，完整源码相等。这说明包装确实需要分列，但并不证明每个长度不同的 eHunter 脚本都属于包装。证据：[eh-desktop-recheck/identity.jsonl](../../../../.tmp/browser-preflight/final-verification/eh-desktop-recheck/identity.jsonl)。

### 第三方错误归因：本轮未发现原问题残留

`scripts/browser-preflight.mjs:318` 的 checkLogs 只使用已验证 scriptId，Vite 再使用已验证模块 exact URL；不会以错误正文、任意 URL 含 ehunter 或同源为依据。`tests/browser-preflight.test.mjs:425` 覆盖正文与来源 URL 两条误归因回归，本轮独立内存场景也正确返回 host-or-third-party/retained-for-caller-review。缺来源的严重错误仍 blocked，有已验证 bundle scriptId 的错误仍按 eHunter 阻断；未把保留第三方错误解释为站点功能已通过。此结论不涵盖所有嵌套 error 对象/异步调用栈格式。

## 自动检查、指南和任务产物

本轮未重新执行会产生夹具/构建文件的原项目检查。核验的是冻结前原始日志与命令记录，且实现 mtime `2026-10-12T19:15:24.746472+00:00`、测试 mtime `2026-10-12T19:19:10.109448+00:00` 均早于下列执行。mtime仅是补充依据，源码身份以本轮冻结哈希为准。

- helper-contract-tests：19:20:21–19:20:26 UTC，exit **0**；[tmpsm_jtgnd.log](../../../../.tmp/acceptance/10-12-browser-acceptance-preflight/tmpsm_jtgnd.log) 原始结尾 `tests 74` / `pass 74` / `fail 0` / `cancelled 0` / `skipped 0` / `todo 0`。日志含同长度双包、迟到 drain 和第三方归因回归，不能覆盖 S1 的缺失场景。
- project-check：19:21:16–19:21:27 UTC，历史命令 `npm run check` exit **0**；[tmpsge9kg64.log](../../../../.tmp/acceptance/10-12-browser-acceptance-preflight/tmpsge9kg64.log) 记录 type-check、Python **37** 项、storage **46** 项、preflight **74** 项及生产构建成功。构建有既存 Sass 弃用提示和 punycode 浏览器 externalize 提示，未声称无 warning、lint 或远端 CI 通过。
- package.json 只增加测试入口与现有 test 链，仍由 `check` 顺序运行 type-check、test、生产构建。没有新增依赖、锁文件或旁路自动通过条件。
- 本轮实际只读检查：两个 Node 源文件语法检查 exit **0**；上下文 validate exit **0**（implement.jsonl三项、check.jsonl五项）；工作区/暂存区 diff 检查 exit **0**；35 个指南/质量/任务相对本地引用均存在；两个操作指南共四个 JS 示例和四个 bash 代码块以 Node `--check` / bash `-n` 仅解析，均 exit **0**。未执行示例中的服务、构建、浏览器操作。
- 指南统一 helper 单一 drain、固定 desktop/mobile profile、先身份/模拟/日志再正常打开、严格 inner 尺寸检查、截图视觉阅读及主会话唯一回填责任；blocked 与产品 assertion failed 分开，未改成弱证据放行。没有指南要求替换浏览器、注入 viewport、清用户存储或放宽实际值。
- implement.md 保留四个完整浏览器场景/正式收口未完成，与 acceptance.json 的 blocked/unrun 对应。final-runtime.md 的70项记录是本轮修复之前的执行史，本轮74项以上方日志为准，不能将该运行报告当成修复冻结版浏览器验收。

## 未验证范围与接受标准逐项映射

- **AC1/AC5**：工具的正确/错误环境及回调阻断有受控证据，但两个入口、两个视口完整开关/模式切换/截图未验收。Vite desktop 的更新请求错误、Vite mobile 的 `select-book timed out after 15000ms`、EH desktop 的 `page.events timed out after 15000ms` 仍是之前现场；本轮不声称重新验证或解除。
- **AC2**：Vite前轮120/120已加载模块与EH完整eval identity只证明各自运行范围，不证明未加载模块或独立资源视觉新鲜度。本轮 S1 使完整身份契约仍有实现失败；现有浏览器证据早于修复冻结文件，不能替代当前版运行验收。
- **AC3**：仓库6 grant/4生产connect、缺一项阻断有已有证据；浏览器安装副本完整声明及全部实际请求未核实。本轮未改权限或扩展。
- **AC4**：受控迟到/拒绝/未解决 drain 的日志与错误保存已验证；真实 Ego 超时根因、硬终止、buffer溢出及所有底层失败仍未验证。
- **AC6**：自动检查已有通过记录，但 Standards 有 P1，独立 Spec 结果尚待主会话合并。四个浏览器runtime项仍 blocked，cleanup partial、formal-review unrun，不能完成/提交/归档。
- EH mobile 严格 CSS 前轮实际 **1232×2666**（更早一次 **742×1606**）不符合 **390×844**；DPR3/touch5/coarse true/mobile true回执不代替CSS通过；功能callback0、截图0。本轮未操作浏览器/服务/用户资源，无新增资源需要清理。旧记录的服务退出与端口释放不等于本轮重新核实现场。

## 主会话待合并条目

被汇总记录路径：[acceptance.json](../acceptance.json)。本报告不写该文件。建议在独立 Spec 审查核验后，主会话合并正式审查条目；其他 runtime blocked、cleanup partial、既有 command 结果不得被此报告覆盖。可用的 Standards 检查建议如下（inspection，因此 execution=null；不是整体验收结论）：

```json
{
  "id": "formal-review-standards-repair",
  "ac": ["AC2", "AC5", "AC6"],
  "claim": "冻结修复版完成只读 Standards 审查并核验修复与剩余缺陷",
  "scope": "仅 Standards；冻结13项、源码/测试/指南/任务产物、内存夹具，不含实际浏览器运行或独立Spec结果",
  "method": "inspection",
  "dimension": "content",
  "observed": "failed",
  "execution": null,
  "evidence": [".trellis/tasks/10-12-browser-acceptance-preflight/research/review-repair-standards.md", ".tmp/browser-preflight/final-verification/review-freeze-repair.json"],
  "note": "P1：明确eHunter生产来源但不同长度的已执行旧包被误排除；初始及收尾场景仍passed/callback1/screenshot1。迟到drain、同长度双包与第三方误归因按各自范围已修复。独立Spec及真实浏览器仍未完成。",
  "waiver": null
}
```

本轮只读命令结果和内存复现输出已内嵌记录；不发明 command 项的起止时间或另写临时 execution 产物。原74项及项目检查的 execution 仍由现有 acceptance 记录与日志提供。没有豁免授权或新增豁免。

两分钟下一步：主会话先核对 S1 表格的 `exact=false/fullBundleCandidate=false/count=1` 与 `passed/callback1/screenshot1`，将此发现与独立 Spec 结果合并；待审查任务全部结束后安排局部修复并重新冻结。

## acceptance.py summarize 原始 JSON 与退出码

以下是本轮重新读取当前已保存 acceptance.json 运行只读 summarize 的完整原始 stdout。**exit 1**：valid=true、observedStatus/status=blocked，passed5/failed0/partial1/blocked4/unrun1/waived0。本轮 Standards 建议尚未合并，因此 summary 不含 S1，formal-review仍unrun。exit1阻止完成/归档，不能当作代理执行失败或假定通过。

```json
{
  "valid": true,
  "observedStatus": "blocked",
  "status": "blocked",
  "counts": {
    "passed": 5,
    "failed": 0,
    "partial": 1,
    "blocked": 4,
    "unrun": 1,
    "waived": 0
  },
  "observedCounts": {
    "passed": 5,
    "failed": 0,
    "partial": 1,
    "blocked": 4,
    "unrun": 1,
    "waived": 0
  },
  "criteria": {
    "AC1": {
      "text": "正确桌面与移动准备产生实际环境记录；错误阅读器 CSS 尺寸、DPR、移动命令或触摸能力阻断功能验收与截图；正常打开的准备阶段与关闭后的原站 viewport 恢复分别留证。",
      "observedStatus": "blocked",
      "status": "blocked",
      "counts": {
        "passed": 2,
        "failed": 0,
        "partial": 0,
        "blocked": 4,
        "unrun": 0,
        "waived": 0
      },
      "observedCounts": {
        "passed": 2,
        "failed": 0,
        "partial": 0,
        "blocked": 4,
        "unrun": 0,
        "waived": 0
      },
      "checks": [
        "helper-contract-tests",
        "vite-desktop",
        "vite-mobile",
        "eh-desktop",
        "eh-mobile",
        "browser-negative"
      ]
    },
    "AC2": {
      "text": "EH 完整生产包及 Vite 本轮已加载项目模块具有当前文档的源码身份和执行证据；旧代码、缺失或历史证据被阻断，未加载模块和独立资源范围明确记录。",
      "observedStatus": "blocked",
      "status": "blocked",
      "counts": {
        "passed": 2,
        "failed": 0,
        "partial": 0,
        "blocked": 4,
        "unrun": 0,
        "waived": 0
      },
      "observedCounts": {
        "passed": 2,
        "failed": 0,
        "partial": 0,
        "blocked": 4,
        "unrun": 0,
        "waived": 0
      },
      "checks": [
        "helper-contract-tests",
        "vite-desktop",
        "vite-mobile",
        "eh-desktop",
        "eh-mobile",
        "browser-negative"
      ]
    },
    "AC3": {
      "text": "正确仓库 grant/connect 配置通过，缺一项生产权限被阻断，本地 connect 扩展允许存在，静态声明与浏览器安装前提分开记录。",
      "observedStatus": "blocked",
      "status": "blocked",
      "counts": {
        "passed": 2,
        "failed": 0,
        "partial": 0,
        "blocked": 2,
        "unrun": 0,
        "waived": 0
      },
      "observedCounts": {
        "passed": 2,
        "failed": 0,
        "partial": 0,
        "blocked": 2,
        "unrun": 0,
        "waived": 0
      },
      "checks": [
        "helper-contract-tests",
        "permissions",
        "eh-desktop",
        "eh-mobile"
      ]
    },
    "AC4": {
      "text": "导航、加载、关键交互及 finally 日志可追溯；异常分支保留先前事件，事件收集或保存失败不得报告通过。",
      "observedStatus": "blocked",
      "status": "blocked",
      "counts": {
        "passed": 2,
        "failed": 0,
        "partial": 0,
        "blocked": 4,
        "unrun": 0,
        "waived": 0
      },
      "observedCounts": {
        "passed": 2,
        "failed": 0,
        "partial": 0,
        "blocked": 4,
        "unrun": 0,
        "waived": 0
      },
      "checks": [
        "helper-contract-tests",
        "vite-desktop",
        "vite-mobile",
        "eh-desktop",
        "eh-mobile",
        "browser-negative"
      ]
    },
    "AC5": {
      "text": "本地与真实 EH 入口接入同一套准备检查；失败后不执行对应功能回调，逐项报告区分环境阻断、产品失败和未执行。",
      "observedStatus": "blocked",
      "status": "blocked",
      "counts": {
        "passed": 2,
        "failed": 0,
        "partial": 0,
        "blocked": 4,
        "unrun": 0,
        "waived": 0
      },
      "observedCounts": {
        "passed": 2,
        "failed": 0,
        "partial": 0,
        "blocked": 4,
        "unrun": 0,
        "waived": 0
      },
      "checks": [
        "helper-contract-tests",
        "vite-desktop",
        "vite-mobile",
        "eh-desktop",
        "eh-mobile",
        "browser-negative"
      ]
    },
    "AC6": {
      "text": "所需自动检查、桌面与移动浏览器验证和正式审查完成；交付说明已验证与未验证范围，并按归属清理任务资源。",
      "observedStatus": "blocked",
      "status": "blocked",
      "counts": {
        "passed": 2,
        "failed": 0,
        "partial": 1,
        "blocked": 4,
        "unrun": 1,
        "waived": 0
      },
      "observedCounts": {
        "passed": 2,
        "failed": 0,
        "partial": 1,
        "blocked": 4,
        "unrun": 1,
        "waived": 0
      },
      "checks": [
        "planning-artifacts",
        "project-check",
        "vite-desktop",
        "vite-mobile",
        "eh-desktop",
        "eh-mobile",
        "formal-review",
        "cleanup"
      ]
    }
  },
  "checks": [
    {
      "id": "planning-artifacts",
      "ac": [
        "AC6"
      ],
      "claim": "实施与验收文件、上下文清单及相对引用有效，当前任务状态与记录一致",
      "scope": "只覆盖文档结构、引用和验收记录合法性，不证明功能通过",
      "method": "command",
      "dimension": "structure",
      "observed": "passed",
      "execution": {
        "argv": [
          "python3",
          "-B",
          ".tmp/browser-preflight/validate-final-artifacts.py"
        ],
        "cwd": ".",
        "exitCode": 0,
        "startedAt": "2026-10-12T17:41:56.625591+00:00",
        "endedAt": "2026-10-12T17:41:56.726783+00:00",
        "log": ".tmp/acceptance/10-12-browser-acceptance-preflight/tmpj3yrta70.log"
      },
      "evidence": [
        ".tmp/acceptance/10-12-browser-acceptance-preflight/tmpj3yrta70.log"
      ],
      "note": "Command completed with exitCode 0; covers only this check's claim and scope.",
      "waiver": null,
      "status": "passed"
    },
    {
      "id": "helper-contract-tests",
      "ac": [
        "AC1",
        "AC2",
        "AC3",
        "AC4",
        "AC5"
      ],
      "claim": "受控工具测试覆盖身份、环境、权限、日志异常及回调阻断契约",
      "scope": "Node工具测试，不代替真实浏览器",
      "method": "command",
      "dimension": "behavior",
      "observed": "passed",
      "execution": {
        "argv": [
          "node",
          "--test",
          "tests/browser-preflight.test.mjs"
        ],
        "cwd": ".",
        "exitCode": 0,
        "startedAt": "2026-10-12T19:20:21.333378+00:00",
        "endedAt": "2026-10-12T19:20:26.583866+00:00",
        "log": ".tmp/acceptance/10-12-browser-acceptance-preflight/tmpsm_jtgnd.log"
      },
      "evidence": [
        ".tmp/acceptance/10-12-browser-acceptance-preflight/tmpsm_jtgnd.log"
      ],
      "note": "Command completed with exitCode 0; covers only this check's claim and scope.",
      "waiver": null,
      "status": "passed"
    },
    {
      "id": "project-check",
      "ac": [
        "AC6"
      ],
      "claim": "现有类型检查、测试及生产构建通过",
      "scope": "npm run check，使用最终代码版本",
      "method": "command",
      "dimension": "behavior",
      "observed": "passed",
      "execution": {
        "argv": [
          "npm",
          "run",
          "check"
        ],
        "cwd": ".",
        "exitCode": 0,
        "startedAt": "2026-10-12T19:21:16.304633+00:00",
        "endedAt": "2026-10-12T19:21:27.810529+00:00",
        "log": ".tmp/acceptance/10-12-browser-acceptance-preflight/tmpsge9kg64.log"
      },
      "evidence": [
        ".tmp/acceptance/10-12-browser-acceptance-preflight/tmpsge9kg64.log"
      ],
      "note": "Command completed with exitCode 0; covers only this check's claim and scope.",
      "waiver": null,
      "status": "passed"
    },
    {
      "id": "permissions",
      "ac": [
        "AC3"
      ],
      "claim": "实际产物和仓库loader的grant相等、connect覆盖生产及本地host",
      "scope": "静态集合比较；安装副本和实际请求另行记录",
      "method": "inspection",
      "dimension": "content",
      "observed": "passed",
      "execution": {
        "argv": [
          "ego-browser",
          "nodejs"
        ],
        "cwd": ".",
        "exitCode": 0,
        "startedAt": "2026-10-12T17:35:18.504952+00:00",
        "endedAt": "2026-10-12T17:35:18.750344+00:00",
        "log": ".tmp/browser-preflight/final-verification/permissions-recheck.log"
      },
      "evidence": [
        ".tmp/browser-preflight/final-verification/permissions-recheck.log",
        ".tmp/browser-preflight/final-verification/permissions-summary.json",
        ".tmp/browser-preflight/final-verification/eh-desktop-recheck/permissions.json"
      ],
      "note": "实际产物6个grant与仓库loader相等，4个生产connect及本地127.0.0.1包含；临时副本缺GM_download或hath.network均在导航前blocked/callback0。仅证明仓库声明，不推导安装副本完整声明。",
      "waiver": null,
      "status": "passed"
    },
    {
      "id": "vite-desktop",
      "ac": [
        "AC1",
        "AC2",
        "AC4",
        "AC5",
        "AC6"
      ],
      "claim": "本地桌面新代码身份与环境通过后完成开关、模式切换、阶段日志和截图",
      "scope": "Vite；1200×900、DPR1、mobile false、无触摸",
      "method": "runtime",
      "dimension": "behavior",
      "observed": "blocked",
      "execution": {
        "argv": [
          "ego-browser",
          "nodejs"
        ],
        "cwd": ".",
        "exitCode": 1,
        "startedAt": "2026-10-12T17:23:37.487851+00:00",
        "endedAt": "2026-10-12T17:23:47.549736+00:00",
        "log": ".tmp/browser-preflight/final-verification/vite-desktop-recheck.log"
      },
      "evidence": [
        ".tmp/browser-preflight/final-verification/vite-desktop-recheck.command.json",
        ".tmp/browser-preflight/final-verification/vite-desktop-recheck.log",
        ".tmp/browser-preflight/final-verification/vite-desktop-recheck/result.json",
        ".tmp/browser-preflight/final-verification/vite-desktop-recheck/events.jsonl",
        ".trellis/tasks/10-12-browser-acceptance-preflight/research/final-runtime.md"
      ],
      "note": "120个模块全文/执行及桌面环境通过；截图后的eHunter更新请求HTTP2错误阻断，模式切换与关闭恢复未验收，截图不记通过。",
      "waiver": null,
      "status": "blocked"
    },
    {
      "id": "vite-mobile",
      "ac": [
        "AC1",
        "AC2",
        "AC4",
        "AC5",
        "AC6"
      ],
      "claim": "本地移动新代码身份与环境通过后完成开关、模式切换、阶段日志和截图",
      "scope": "Vite；390×844、DPR3、mobile true、触摸5/coarse",
      "method": "runtime",
      "dimension": "behavior",
      "observed": "blocked",
      "execution": {
        "argv": [
          "ego-browser",
          "nodejs"
        ],
        "cwd": ".",
        "exitCode": 1,
        "startedAt": "2026-10-12T17:26:18.438819+00:00",
        "endedAt": "2026-10-12T17:26:42.432573+00:00",
        "log": ".tmp/browser-preflight/final-verification/vite-mobile-recheck.log"
      },
      "evidence": [
        ".tmp/browser-preflight/final-verification/vite-mobile-recheck.command.json",
        ".tmp/browser-preflight/final-verification/vite-mobile-recheck.log",
        ".tmp/browser-preflight/final-verification/vite-mobile-recheck/result.json",
        ".tmp/browser-preflight/final-verification/vite-mobile-recheck/events.jsonl",
        ".trellis/tasks/10-12-browser-acceptance-preflight/research/final-runtime.md"
      ],
      "note": "120个模块全文/执行及移动环境通过；初始截图已读取，选择书页操作超时且finally记录更新请求错误；完整模式/开关/恢复未验收。",
      "waiver": null,
      "status": "blocked"
    },
    {
      "id": "eh-desktop",
      "ac": [
        "AC1",
        "AC2",
        "AC3",
        "AC4",
        "AC5",
        "AC6"
      ],
      "claim": "真实EH桌面确认完整生产包执行、初始化及关键交互和截图",
      "scope": "EH图片页；1200×900、DPR1、无触摸；标题/页数/当前页/缩略图/开关/模式",
      "method": "runtime",
      "dimension": "behavior",
      "observed": "blocked",
      "execution": {
        "argv": [
          "ego-browser",
          "nodejs"
        ],
        "cwd": ".",
        "exitCode": 1,
        "startedAt": "2026-10-12T17:31:21.032873+00:00",
        "endedAt": "2026-10-12T17:32:00.935302+00:00",
        "log": ".tmp/browser-preflight/final-verification/eh-desktop-recheck.log"
      },
      "evidence": [
        ".tmp/browser-preflight/final-verification/eh-desktop-recheck.command.json",
        ".tmp/browser-preflight/final-verification/eh-desktop-recheck.log",
        ".tmp/browser-preflight/final-verification/eh-desktop-recheck/result.json",
        ".tmp/browser-preflight/final-verification/eh-desktop-recheck/events.jsonl",
        ".trellis/tasks/10-12-browser-acceptance-preflight/research/final-runtime.md"
      ],
      "note": "真实完整eval及桌面环境、标题和1/136通过；切换书页时page.events超时，缩略图、模式和关闭恢复未验证，保留先前批次与finally错误。",
      "waiver": null,
      "status": "blocked"
    },
    {
      "id": "eh-mobile",
      "ac": [
        "AC1",
        "AC2",
        "AC3",
        "AC4",
        "AC5",
        "AC6"
      ],
      "claim": "真实EH移动确认完整生产包执行、准备打开与关闭恢复及关键交互和截图",
      "scope": "EH图片页；390×844、DPR3、mobile true、触摸5；保留原站/阅读器两个阶段",
      "method": "runtime",
      "dimension": "behavior",
      "observed": "blocked",
      "execution": {
        "argv": [
          "ego-browser",
          "nodejs"
        ],
        "cwd": ".",
        "exitCode": 1,
        "startedAt": "2026-10-12T16:53:46.412598+00:00",
        "endedAt": "2026-10-12T16:53:50.213045+00:00",
        "log": ".tmp/browser-preflight/runtime-verification/eh-mobile-output.log"
      },
      "evidence": [
        ".tmp/browser-preflight/runtime-verification/eh-mobile-command.json",
        ".tmp/browser-preflight/runtime-verification/eh-mobile-output.log",
        ".tmp/browser-preflight/runtime-verification/eh-mobile/result.json",
        ".tmp/browser-preflight/runtime-verification/eh-mobile/events.jsonl",
        ".tmp/browser-preflight/runtime-verification/eh-mobile-counts.json",
        ".trellis/tasks/10-12-browser-acceptance-preflight/research/final-runtime.md"
      ],
      "note": "Exact eval/full coverage passed. Strict opened CSS actual1232x2666 differs from390x844 despite DPR3 touch5 coarse=true and client/visual390x844; callback0/screenshot0. Blocking behavior is established separately from full functional claim; earlier742x1606 probe is not this round value. 本轮helper仅改Vite日志归因；产品/dist/loader未变，该EH环境阻塞仍有效，未重跑移动产品功能。",
      "waiver": null,
      "status": "blocked"
    },
    {
      "id": "browser-negative",
      "ac": [
        "AC1",
        "AC2",
        "AC4",
        "AC5"
      ],
      "claim": "受控错误环境/旧代码/导航超时保存真实阶段事件并阻断功能回调",
      "scope": "仅任务夹具或本任务本地页面故障注入，不修改原站、用户存储或扩展权限",
      "method": "runtime",
      "dimension": "behavior",
      "observed": "passed",
      "execution": {
        "argv": [
          "ego-browser",
          "nodejs"
        ],
        "cwd": ".",
        "exitCode": 0,
        "startedAt": "2026-10-12T17:34:08.056695+00:00",
        "endedAt": "2026-10-12T17:34:12.241668+00:00",
        "log": ".tmp/browser-preflight/final-verification/negative-recheck.log"
      },
      "evidence": [
        ".tmp/browser-preflight/final-verification/negative-recheck.command.json",
        ".tmp/browser-preflight/final-verification/negative-recheck.log",
        ".tmp/browser-preflight/final-verification/negative-recheck-summary.json",
        ".trellis/tasks/10-12-browser-acceptance-preflight/research/final-runtime.md"
      ],
      "note": "当前helper真实浏览器受控HTTP夹具：正常对照callback1；错误CSS/同长度旧文本/导航超时均blocked、callback0、screenshot0且finally可读。矩阵断言exit0，夹具不是产品Vite服务。",
      "waiver": null,
      "status": "passed"
    },
    {
      "id": "formal-review",
      "ac": [
        "AC6"
      ],
      "claim": "固定最终代码和测试版本后完成trellis-check并核验所有结果",
      "scope": "Standards与Spec、工作区与暂存区、最终检查版本",
      "method": "inspection",
      "dimension": "content",
      "observed": "unrun",
      "execution": null,
      "evidence": [],
      "note": "规划阶段，仅定义检查；尚未实施或执行此项。",
      "waiver": null,
      "status": "unrun"
    },
    {
      "id": "cleanup",
      "ac": [
        "AC6"
      ],
      "claim": "结束本任务空间并核实本任务服务退出及端口释放，保留用户资源和交付物",
      "scope": "记录实际创建的服务/父进程/PID、空间及保留证据",
      "method": "inspection",
      "dimension": "behavior",
      "observed": "partial",
      "execution": null,
      "evidence": [
        ".tmp/browser-preflight/final-verification/cleanup.json",
        ".tmp/browser-preflight/final-verification/space-final.json",
        ".trellis/tasks/10-12-browser-acceptance-preflight/research/final-runtime.md"
      ],
      "note": "本任务服务及npm父进程全部退出，5173/5174/8787/8788释放，用户资源及必要证据保留。浏览器验收blocked，Ego规则禁止成功专用finish；空间2/p1保留并回到about:blank，空间结束部分尚未完成。",
      "waiver": null,
      "status": "partial"
    }
  ],
  "waivedChecks": []
}
```
