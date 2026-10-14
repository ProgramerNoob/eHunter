# 修复轮 Spec 审查：仍需修复，完整验收仍 blocked

本轮结论：**P1 一项、P2 两项；不能将本轮 Spec 审查或任务验收报告为通过。** 事件超时的既有晚返回复现已得到针对性修复，第三方错误的文字/URL 名称误归因已修复；EH 同长度双包被阻断，但不同长度的旧完整包与当前包同时执行仍可放行。四个真实功能场景均保留 blocked，尚无最终版本完整浏览器验收证据。

## 审查范围、版本与只读边界

- Active task：`.trellis/tasks/10-12-browser-acceptance-preflight`。按 `check.jsonl` 读取五份指定上下文，再核对 `prd.md`、`design.md`、`implement.md`、`acceptance.json`、通用浏览器及质量规范、EH 技能接入 diff。
- 本轮使用 trellis-check 的 Spec 轴。先读取现有 `graft/scripts/browser-preflight.md`、`graft/tests/browser-preflight.test.md` 定位；卡片仍是旧跨度，修复细节以当前文件带行号内容为准。为保持只读，没有调用会自动刷新图的 graft CLI。没有派发子代理，也没有替 Standards 轴给结论。
- 基线 `3b64ddf676b5cf0fe6e94c91de0e17c2abc0b4e1`，分支 master。工作区四个已跟踪修改为 `.pi/skills/eh-test/SKILL.md`、`.trellis/spec/frontend/browser-acceptance.md`、`.trellis/spec/frontend/quality-guidelines.md`、`package.json`；新文件 `scripts/browser-preflight.mjs`、`tests/browser-preflight.test.mjs` 及任务目录。暂存区为空；已检查工作区、暂存区和新增文件。`git diff --check` exit 0。
- 冻结依据：[review-freeze-repair.json](../../../../../../.tmp/browser-preflight/final-verification/review-freeze-repair.json)。开始审查及生成报告前，13 项 SHA-256 全部匹配。helper SHA-256 `f253286722bebdd2364f2d2957e69d715a654d8c280814a491ea6d352840b025`；测试 SHA-256 `ecac9dce5cf3a2fed5862e01daf28fb65dc9003989c286604638e5fed1f2419f`。
- 唯一文件写入为本报告。未改源码、测试、指南、任务状态、acceptance.json 或冻结记录；未启动/操作浏览器、服务；未重跑会写入产物的完整测试/build。额外复核仅在内存替换文件系统并复用现有 PageFixture，源码仅加载进内存，下面保存完整可复查命令与观察。

## 发现

### F1 · P1：不同长度旧生产包共存仍会通过身份门（R2/R5、AC2/AC5）

定位：`scripts/browser-preflight.mjs:386`、`scripts/browser-preflight.mjs:409`、`scripts/browser-preflight.mjs:434`、`scripts/browser-preflight.mjs:449`。新增回归位于 `tests/browser-preflight.test.mjs:190`，只覆盖同长度旧包和相同当前包重复执行。

当前关键逻辑：

```js
? active.filter(s => s.length === bundle.length || /ehunter/i.test(s.url))
fullBundleCandidate: sourceRecord.kind === 'eh' && script.length === bundle.length,
const bundleRows = rows.filter(row => row.fullBundleCandidate);
requireCondition(bundleRows.length === 1, 'Exactly one current production bundle candidate is required', bundleRows);
? current.filter(s => s.length === bundle.length)
```

`fullBundleCandidate` 用“长度相同”作完整包类别的最终判据。当前包为158个UTF-16 code unit、旧包为160时：有 eHunter URL 的旧完整包虽被取回全文，且全长顶层 count=1，但被标为 `fullBundleCandidate:false` 并排除于唯一性门；匿名 eval 则完全不进入候选。此时当前包相等且执行过就足以让 helper 返回 passed，回调执行1次。旧包可能同样参与挂载与交互，当前包存在不足以证明被测行为仅由当前代码产生。

本轮纯内存观察（命令 exit 0，表示探针执行结束，不是 AC 通过）：

| 场景 | 当前/旧长度 | observed | callback | 旧项 |
| --- | --- | --- | --- | --- |
| 当前 + 同长度旧包 | 158 / 158 | blocked | 0 | fullBundleCandidate=true、verified=false、topCount=1 |
| 当前 + 不同长度旧包，URL含ehunter | 158 / 160 | **passed** | **1** | exact=false、fullBundleCandidate=false、topCount=1 |
| 当前 + 不同长度旧包，匿名eval | 158 / 160 | **passed** | **1** | 不在身份清单中 |

旧包使用已有完整 BUNDLE 将 `中文😀A` 替换为 `中文😀OLD`，保留 metadata 和完整 IIFE；同文档/context、相同独立桌面环境，两个脚本均实际进入夹具 coverage 全长计数。没有修改身份算法、放宽条件或改用户资源。完整命令和原始输出见附录 A。夹具不能证明真实 EH 当前存在双注入，也没有验证磁盘落盘性能；它和静态分支共同证明误放行路径。

建议：区分已知 loader 包装来源与生产脚本，完整包冲突判断不能以当前长度相等为唯一分类依据；对已观察但无法排除的生产注入冲突应 blocked。至少补不同长度的命名/匿名旧完整包共存、正常 loader 包装候选对照。不要要求所有 `/ehunter/` 候选都等于生产包，那会误伤真实 loader；不能以外层声明静态脚本停用覆盖已观察的冲突。

### F2 · P2：受修复影响的旧浏览器负例仍称“当前 helper passed”（R4/R5、AC4/AC5/AC6）

定位：`.trellis/tasks/10-12-browser-acceptance-preflight/acceptance.json:284`（browser-negative 的 passed）、`.trellis/tasks/10-12-browser-acceptance-preflight/acceptance.json:302`（“当前helper”说明）；失效规则：`.trellis/spec/frontend/quality-guidelines.md:154`。

该项执行时间为 `2026-10-12T17:34:08.056695+00:00` 至 `2026-10-12T17:34:12.241668+00:00`。修复轮事件收集改变了超时后读取/保存、finally路径，冻结时间为 `2026-10-12T19:34:23.376128+00:00`，新增回归运行在19:20/19:21。17:34 的真实浏览器负例仍有历史价值，但不能作为修复后版本的真实事件超时/保存通过证据。现有文件 [negative-recheck-summary.json](../../../../../../.tmp/browser-preflight/final-verification/negative-recheck-summary.json) 证明当时正常对照callback1，错误CSS/旧文本/导航超时均blocked、callback0/screenshot0、finallySaved=true；它没有执行修复后的在途 drain 逻辑。

主会话应保留原始历史观察和执行记录，明确该检查当前版本待重验（建议 partial，并保留旧 execution/证据和已验证部分）；新运行前不能继续写“当前 helper passed”。本代理不写 acceptance.json。四个完整场景原本均 blocked，不应覆盖或改成 passed；EH移动1232×2666的原始观察也不能删掉。

这不否定静态权限集合的事实，也不要求重跑无关检查。受影响的 browser-negative 和 EH事件超时分支需重新取证；单元测试74/74不能替代它们。

### F3 · P2：当前任务说明仍混用70项及旧修复范围（AC6）

- `.trellis/tasks/10-12-browser-acceptance-preflight/research/final-runtime.md:7` 仍称70项且引用 acceptance 的 helper-contract-tests；该项现已是74项。`.trellis/tasks/10-12-browser-acceptance-preflight/research/final-runtime.md:8` 仍将70项和旧 `tmpczizk9iq.log` 称为当前结果。该报告可以保留17:18–17:37历史记录，但应显式说明被19:20/19:21修复轮自动检查更新，不能继续承担当前版本总报告。
- `.trellis/tasks/10-12-browser-acceptance-preflight/acceptance.json:269` 仍称“本轮helper仅改Vite日志归因”；当前 helper 还改了 EH双包和 drain 超时。EH移动产品/dist未变、环境阻塞仍为历史事实，但“仅改Vite”已不是当前版本复用论据。
- `.trellis/tasks/10-12-browser-acceptance-preflight/acceptance.json:317` formal-review 的“规划阶段，仅定义检查”没有反映首轮已发现问题及当前修复轮审查。保持未完成可接受；主会话应在合并本报告与Standards后写实际进度和结论。
- `.trellis/tasks/10-12-browser-acceptance-preflight/implement.md:8` 已正确更新为74项；`.trellis/tasks/10-12-browser-acceptance-preflight/implement.md:25` 和 `.trellis/tasks/10-12-browser-acceptance-preflight/implement.md:26` 测试链勾选重复，是附带的低严重度排版问题。

`research/browser-preflight-design.md` 的规划语气以及 `research/capability-probe.md` 的“未开始实现”均有明确历史阶段边界，不要求把历史研究改成当前实现。`prd.md:36` 的“规划状态”标题本身也不构成错误。需修正的是当前引用与当前范围的冲突。

## 修复确认及测试边界

| 修复主题 | 当前实现和已有证据 | 本轮判定 |
| --- | --- | --- |
| 晚返回事件不丢批/不并发drain | `scripts/browser-preflight.mjs:217` 持有activeDrain；`scripts/browser-preflight.mjs:225` 的原Promise返回后先save再consume；`scripts/browser-preflight.mjs:250` 复用在途读取；`scripts/browser-preflight.mjs:680` 用1000ms宽限；`scripts/browser-preflight.mjs:695` 保存unresolved | 原250ms晚回执问题已在机制上修复；现有测试25ms超时/60ms返回检查外部maxEventsConcurrency=1、late-marker落盘和unresolved为空。支持局部修复通过，不证明真实EH超时根因或全量日志无丢失 |
| 同长度双完整包 | `scripts/browser-preflight.mjs:435` 唯一性断言，`scripts/browser-preflight.mjs:443` 只登记验证成功的完整包；`tests/browser-preflight.test.mjs:190` 两用例 | 当前+同长度旧包、重复当前包均blocked，测试通过；不同长度仍有F1 |
| 第三方错误 | `scripts/browser-preflight.mjs:325` 由verified scriptId或Vite exact URL归因，不再扫描错误文字或URL内的ehunter名称；`tests/browser-preflight.test.mjs:425` 覆盖文字/URL两个变体 | 现有日志通过；外部错误保存为host-or-third-party/retained-for-caller-review；无归因的严重错误仍blocked。该分类不会自动证明第三方错误不影响功能，影响仍由调用方检查 |
| 主会话单写 | `scripts/browser-preflight.mjs:98` 定义责任；helper只写artifactDir；通用指南及EH技能沿用主会话回填 | 未发现 helper/子代理写acceptance.json；本轮仅提交建议条目 |

新增晚回执测试只覆盖在1000ms宽限内返回的情况；没有“超过宽限仍未完成/永久不返回/返回后保存失败”组合的专门新测试。静态代码保留unresolved且超时stickyError阻止通过，晚返回仍绑定保存路径；本轮没有把这些未执行边界写成已通过。硬终止、进程退出后的未完成Promise和CDP缓冲容量仍是明确限制。

## R1–R6 / AC1–AC6覆盖

| 需求与AC | 已核对范围 | 尚未满足范围 / 结论 |
| --- | --- | --- |
| R1 / AC1 | `scripts/browser-preflight.mjs:8` 固定桌面1200×900/DPR1、移动390×844/DPR3；`scripts/browser-preflight.mjs:306` 核对mobile回执、实际touch、1e-6 DPR；`scripts/browser-preflight.mjs:489` 正常打开前后分阶段；`scripts/browser-preflight.mjs:557` 关闭meta恢复；截图前后checkpoint | 工具正负例成立；历史Vite两视口、EH桌面环境成立；EH移动严格门blocked，真实关闭恢复/重开完整矩阵未完成。当前保存AC1=blocked |
| R2 / AC2 | `scripts/browser-preflight.mjs:163` 当前文档/context；`scripts/browser-preflight.mjs:351` 原样全文及同script全长coverage；Vite exact query、全部项目模块、notLoadedInputs/第三方/锁文件边界；`scripts/browser-preflight.mjs:457` 独立资源声明 | 历史Vite120/120和EH全文相等有效为对应运行事实；F1仍违反旧包阻断。未加载分支/全部工作树/独立资源视觉新鲜度未证。保存AC2=blocked |
| R3 / AC3 | `scripts/browser-preflight.mjs:54` grant相等/connect超集/实际host；`scripts/browser-preflight.mjs:613` 构建与安装前提分开、evidence仅可读性检查 | 静态6 grants/4生产connect及缺GM_download/hath.network负例成立；安装副本完整metadata和所有实际请求未证。保存AC3=blocked |
| R4 / AC4 | 初始incomplete manifest、原始事件先存后分析、commands/environment/identity分阶段、异常/超时/写盘失败非通过；晚回执修复如上 | 受控测试支持修复；真实超时路径未重验，F2要求失效受影响旧pass；没有承诺绝对无丢失。保存AC4=blocked |
| R5 / AC5 | `scripts/browser-preflight.mjs:652` 准备及checkpoint后才runChecks；`scripts/browser-preflight.mjs:674` failed/blocked/unrun区分；`scripts/browser-preflight.mjs:700` 保存错误阻止passed且原始ProductAssertion仍保留；两个文档接同一helper | 四个真实场景保持blocked，下游范围在note/result中保留；F1仍会错误进入回调。命令exit0不等于功能验收。保存AC5=blocked |
| R6 / AC6 | helper不管理浏览器空间/服务，不改产品存储；指南保留ego-browser、同空间、观察后选择器、服务归属、用户接管；证据均在.tmp；74项及项目check现有日志核对完成 | F1/F2/F3、Standards结果合并、完整浏览器矩阵和成功finish仍未完成；清理partial符合实际。保存AC6=blocked |

## 现有自动检查证据

以下是只读复核既有运行，不是本代理重新执行测试或build；无lint脚本，不声称lint/远端CI结果。

| 检查 | 现有实际执行 | 证据 |
| --- | --- | --- |
| helper契约测试 | 2026-10-12T19:20:21.333378+00:00 至19:20:26.583866+00:00，exit0，tests74/pass74/fail0/skipped0 | [tmpsm_jtgnd.log](../../../../../../.tmp/acceptance/10-12-browser-acceptance-preflight/tmpsm_jtgnd.log)，新增双包第4/5行、晚回执第45行、第三方第46行、汇总第76行 |
| 项目check | 2026-10-12T19:21:16.304633+00:00 至19:21:27.810529+00:00，exit0；vue-tsc、Python37、storage46、preflight74、Vite6.4.1生产build（922ms） | [tmpsge9kg64.log](../../../../../../.tmp/acceptance/10-12-browser-acceptance-preflight/tmpsge9kg64.log)，第4/11/62/147/3653行；存在Sass等构建警告，不是零警告结果 |
| 本轮只读检查 | freeze13/13匹配、暂存区为空、git diff --check exit0、纯内存三场景probe exit0 | 本报告及冻结文件；probe成功输出包含两个误放行，不能标功能passed |
| acceptance汇总 | exit1；valid=true、observedStatus=status=blocked；passed5/failed0/partial1/blocked4/unrun1/waived0，全部AC blocked | 附录B保存完整原始JSON及命令信息；当前保存记录尚未合并本报告建议 |

日志存在/自动检查成功证明其限定范围。当前 helper 新缺陷F1不被74项覆盖，不能由74/74推断“全部契约满足”。本轮没有重跑类型检查或项目完整测试，也没有另建.tmp文件。

## 真实浏览器与资源证据复核

直接读取以下 result/summary/cleanup 文件，与报告和acceptance逐项对比：

- [Vite桌面result](../../../../../../.tmp/browser-preflight/final-verification/vite-desktop-recheck/result.json)：identity120/verified120、1200×900/DPR1/touch0，preparation verified、checks blocked；截图后的eHunter runtime/initialization error阻断。原始日志含更新请求 `net::ERR_HTTP2_PROTOCOL_ERROR` / `TextReq: request error`。开关恢复及模式切换未验收，截图未记完整通过。
- [Vite移动result](../../../../../../.tmp/browser-preflight/final-verification/vite-mobile-recheck/result.json)：identity120/verified120、390×844/DPR3/touch5；`select-book timed out after 15000ms`，finally还记eHunter错误。历史初始截图阅读只属部分视觉记录，完整模式/关闭/重开未验收。本轮没有重新打开图片做视觉检查。
- [EH桌面result](../../../../../../.tmp/browser-preflight/final-verification/eh-desktop-recheck/result.json)：两个候选（loader包装及完整包），一个verified；完整包442864 UTF-8字节，SHA-256 `36dfa0deac3c3555c484e7b23be89fb19ded2e651784ac834e1c3134037b7d3a`；桌面环境及历史标题/1/136局部断言后，`switch-book:waiting:events` 出现 `page.events timed out after 15000ms`。缩略图加载定位、模式切换和关闭恢复未验证；不把采集超时记成产品断言failed。
- [EH移动result](../../../../../../.tmp/browser-preflight/runtime-verification/eh-mobile/result.json)：实际1232×2666，期望390×844；DPR3/touch5/coarse true及mobile true回执不足以通过CSS门。preparation blocked、checks unrun，counts证据callback0/screenshot0；早期探针742×1606是另一轮值，不能混写。本次保留历史阻塞，未重跑移动产品功能。
- [权限summary](../../../../../../.tmp/browser-preflight/final-verification/permissions-summary.json)：静态集合与缺项阻断成立；登录/脚本启用状态来自历史只读安装证据，不能推导安装副本完整metadata。
- [cleanup](../../../../../../.tmp/browser-preflight/final-verification/cleanup.json)、[space-final](../../../../../../.tmp/browser-preflight/final-verification/space-final.json)：当时本任务PID59191/59172/63143/63124/64643退出，5173/5174/8787/8788释放；空间2/p1为agent所有、about:blank、finishCalled=false。blocked时未执行成功专用finish，与cleanup partial相符。本代理没有创建服务或任务空间，没有借历史清理记录宣称当前全机端口状态。

未验证：修复后真实事件超时及完整浏览器矩阵、不同长度旧包修复、所有关键截图视觉、全部缩略图完成加载/定位、关闭meta恢复和重开、安装副本全部权限、尚未加载模块、独立资源视觉新鲜度、NH、物理移动设备和其他浏览器。未授予/推定任何waiver。

## 主会话合并建议

当前 `.trellis/tasks/10-12-browser-acceptance-preflight/acceptance.json` 汇总只描述已保存记录，尚未包含本轮新发现。只返回建议，不写该文件。主会话应核验Standards报告后合并正式审查结论；原四个runtime/blocked和cleanup partial保留。建议条目如下（inspection的execution为null；本报告内含纯内存复核命令与结果，不伪造.tmp命令日志）：

```json
[
  {
    "id": "repair-spec-eh-mixed-length",
    "ac": [
      "AC2",
      "AC5",
      "AC6"
    ],
    "claim": "修复后的EH预检阻断当前包与不同长度旧完整包共存",
    "scope": "仅Spec代码检查与纯内存PageFixture复核，不证明真实EH存在双注入",
    "method": "inspection",
    "dimension": "behavior",
    "observed": "failed",
    "execution": null,
    "evidence": [
      ".trellis/tasks/10-12-browser-acceptance-preflight/research/review-repair-spec.md",
      ".tmp/browser-preflight/final-verification/review-freeze-repair.json"
    ],
    "note": "F1：158/160长度完整包共存（命名及匿名）均observed passed/callback1；同长度对照blocked/callback0。需要修复及针对性回归。",
    "waiver": null
  },
  {
    "id": "repair-spec-evidence-currency",
    "ac": [
      "AC4",
      "AC5",
      "AC6"
    ],
    "claim": "浏览器异常证据与当前helper版本一致，受影响结果已失效并重验",
    "scope": "browser-negative及当前任务文档的证据版本审查；保留历史运行记录",
    "method": "inspection",
    "dimension": "content",
    "observed": "partial",
    "execution": null,
    "evidence": [
      ".trellis/tasks/10-12-browser-acceptance-preflight/research/review-repair-spec.md",
      ".trellis/tasks/10-12-browser-acceptance-preflight/research/final-runtime.md",
      ".tmp/browser-preflight/final-verification/negative-recheck-summary.json"
    ],
    "note": "74项与项目check有19:20/19:21证据；browser-negative仍用修复前17:34记录称当前helper passed，final-runtime仍70项，EH note仍仅改Vite。主会话须保留原观察并更正当前版本状态，相关真实分支未重验。",
    "waiver": null
  }
]
```

另建议主会话将既有 formal-review 合并为失败/待修复的实际结论，不能仅因本代理正常返回而填passed；Standards轴在本报告中为未核验。browser-negative 可改partial并保留历史execution/证据及未重验说明，而不是删除历史pass事实。以上不授予豁免，汇总exit1禁止完成/归档。

两分钟下一步：主会话先看F1的158/160对照结果，合并审查发现与旧证据失效说明；等所有审查代理结束后安排修复。不要在当前冻结审查期间改源码。

## 附录 A：只读、纯内存复核命令与原始输出

此命令只读取两份仓库文件。所有helper文件写入均进入Map，PageFixture的截图写入也为空操作；没有HTTP fetch、浏览器、服务、临时文件或源码修改。它检查EH流程逻辑，不验证真实fs或浏览器。可从仓库根目录执行：

```bash
node --input-type=module <<'JS'
import * as realFs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
const root=process.cwd();
const source=await realFs.readFile('scripts/browser-preflight.mjs','utf8');
const tests=await realFs.readFile('tests/browser-preflight.test.mjs','utf8');
const prelude=tests.slice(tests.indexOf("const EH_URL ="),tests.indexOf('\nasync function fixture'));
const {PageFixture,BUNDLE,LOADER}=new Function('fs',`${prelude}; return {PageFixture,BUNDLE,LOADER};`)({writeFile:async()=>{}});
const main=source.replace(/^import .*;\n/gm,'').replace(/^const ROOT = .*;$/m,'const ROOT = taskRoot;').replaceAll('export class ','class ').replaceAll('export async function ','async function ');
for(const variant of ['same-length','different-length-named','different-length-anonymous']) {
 const files=new Map();
 const base=path.join(root,'.tmp','in-memory-spec-probe');
 const bundlePath=path.join(base,'bundle.js'), loaderPath=path.join(base,'loader.js'), evidence=path.join(base,'evidence.json');
 files.set(bundlePath,BUNDLE); files.set(loaderPath,LOADER); files.set(evidence,'{}');
 const fs={
  readFile:async(p,enc)=>{if(!files.has(p))throw Error(`Unexpected read ${p}`);return enc?files.get(p):Buffer.from(files.get(p));},
  writeFile:async(p,v)=>{files.set(p,String(v));},
  appendFile:async(p,v)=>{files.set(p,(files.get(p)??'')+v);},
  mkdir:async()=>{},realpath:async p=>p,
  access:async p=>{if(!files.has(p))throw Error('missing');},
  stat:async p=>({isFile:()=>files.has(p),size:files.get(p)?.length??0}),
  rename:async(a,b)=>{files.set(b,files.get(a));files.delete(a);}
 };
 const helper=new Function('fs','path','createHash','randomUUID','delay','taskRoot','console',`${main}; return withBrowserPreflight;`)(fs,path,createHash,randomUUID,delay,root,{error:()=>{}});
 const page=new PageFixture();
 const old=variant==='same-length'?BUNDLE.replace('中文😀A','中文😀B'):BUNDLE.replace('中文😀A','中文😀OLD');
 page.onNavigate=()=>{page.addScript('current','',BUNDLE);page.addScript('stale',variant==='different-length-named'?'https://example.test/ehunter.iife.js':'',old);};
 let callbacks=0;
 const result=await helper({page,artifactDir:path.join(base,'artifacts'),profile:'desktop',source:{kind:'eh',bundlePath,loaderPath,bundleUrl:'http://127.0.0.1:8787/ehunter.iife.js',build:{exitCode:0,evidence},installation:{loggedIn:true,dynamicLoaderEnabled:true,staticScriptDisabled:true,evidence}},navigate:()=>page.goto(),prepareReader:()=>page.open(),timeoutMs:250},async()=>{callbacks++;}).catch(e=>e.result);
 console.log(JSON.stringify({variant,observed:result.observed,callbacks,bundleLength:BUNDLE.length,oldLength:old.length,identity:result.identity.map(r=>({scriptId:r.scriptId,exact:r.exact,fullBundleCandidate:r.fullBundleCandidate,topCount:r.topLevel?.ranges?.[0]?.count,verified:r.verified})),errors:result.errors.map(e=>e.message)}));
}
JS
```

实际退出码：0。原始stdout：

```jsonl
{"variant":"same-length","observed":"blocked","callbacks":0,"bundleLength":158,"oldLength":158,"identity":[{"scriptId":"current","exact":true,"fullBundleCandidate":true,"topCount":1,"verified":true},{"scriptId":"stale","exact":false,"fullBundleCandidate":true,"topCount":1,"verified":false}],"errors":["Exactly one current production bundle candidate is required","Exactly one current production bundle candidate is required"]}
{"variant":"different-length-named","observed":"passed","callbacks":1,"bundleLength":158,"oldLength":160,"identity":[{"scriptId":"current","exact":true,"fullBundleCandidate":true,"topCount":1,"verified":true},{"scriptId":"stale","exact":false,"fullBundleCandidate":false,"topCount":1,"verified":false}],"errors":[]}
{"variant":"different-length-anonymous","observed":"passed","callbacks":1,"bundleLength":158,"oldLength":160,"identity":[{"scriptId":"current","exact":true,"fullBundleCandidate":true,"topCount":1,"verified":true}],"errors":[]}
```

## 附录 B：acceptance.py summarize 原始JSON

记录路径：`.trellis/tasks/10-12-browser-acceptance-preflight/acceptance.json`。命令只读：

```bash
python3 scripts/acceptance.py summarize .trellis/tasks/10-12-browser-acceptance-preflight
```

本次实际退出码：**1**。开始：`2026-10-12T19:40:54.457165+00:00`；结束：`2026-10-12T19:40:54.482295+00:00`。stderr：``。以下为原始stdout，未合并本报告建议：

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
