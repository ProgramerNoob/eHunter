# 固定版本正式 Spec 审查

审查结论：**有两项阻止代码交付的实现缺陷，需要修复后重新审查；AC1–AC6 的完整验收也仍未满足。** 两种阻塞分别记录，不能将浏览器环境阻塞视为已确认的产品失败，也不能以120个模块或身份/环境通过替代全部功能。此审查未修复代码，没有写 acceptance.json、改任务状态、提交或归档。

## 范围与冻结版本

- Active task：`.trellis/tasks/10-12-browser-acceptance-preflight`。先按 check.jsonl 的五项上下文读取 index、quality-guidelines、静态研究、capability-probe、final-runtime，再核对 PRD、design、implement；已使用 trellis-check。
- 基线 HEAD：`3b64ddf676b5cf0fe6e94c91de0e17c2abc0b4e1`，分支 master；工作区含四个已跟踪修改、两个新实现/测试文件及新任务目录。暂存区为空，已同时检查 `git diff HEAD`、`git diff --cached` 与未跟踪文件。
- 冻结记录：[review-freeze.json](../../../../.tmp/browser-preflight/final-verification/review-freeze.json)。审查前核对17个文件全文 SHA-256，全部匹配；审查后记录：[review-spec-freeze-after.json](../../../../.tmp/browser-preflight/final-verification/review-spec-freeze-after.json)。本轮只新增此报告及 `.tmp/browser-preflight/final-verification/review-spec-*` 证据。
- 覆盖 `scripts/browser-preflight.mjs`、`tests/browser-preflight.test.mjs`、`package.json`、通用浏览器指南、EH技能、质量指南、任务产物与现有验收证据。没有评估未授权的 EH mobile 产品修复。

## 必须修复的发现

### S1 / P1：EH 的存在性放行会掩盖当前文档内已经执行的旧生产包

**定位：** `scripts/browser-preflight.mjs:389`、`scripts/browser-preflight.mjs:393`、`scripts/browser-preflight.mjs:398`、`scripts/browser-preflight.mjs:401`；候选形成于 `scripts/browser-preflight.mjs:343`。缺失契约：PRD R2/R5、AC2/AC5，以及 design 的完整生产包原样身份检查和“旧代码被阻断”要求。

关键逻辑：

`sourceRecord.kind === 'eh' ? rows.some(r => r.verified) : rows.every(r => r.verified)`

`verifiedScriptIds = new Set(candidates.map(s => s.scriptId));`

EH 只要求存在一个匹配且执行过的候选，随后把所有候选的 scriptId（包括明确不匹配的项）写入 verifiedScriptIds；identityIsCurrent 用“存在一个已执行匹配项”及“所有候选ID已被收集”作判断，没有排除同时运行的旧包。新包执行证据不能决定哪一份包产生了当前挂载 DOM，旧包仍可能参与阅读器行为。

**受控复现：** 复用当前测试的 PageFixture，在同一新 document/context 内依次发送当前 BUNDLE 与 `BUNDLE.replace('中文😀A', '中文😀B')`，两者版本/长度相同且顶层 count=1。未调整 profile、身份或覆盖率规则。实际结果：两个 identity 项中一个 exact/verified=true，另一个 exact/verified=false且有顶层执行；helper **observed=passed、功能回调1、截图1**，最终 result.json 同样 passed。正常单包对照 passed。

证据：[review-spec-probe-results.json](../../../../.tmp/browser-preflight/final-verification/review-spec-probe-results.json) 的 `current-and-same-length-old-eh-bundles`，执行脚本 [review-spec-probes.mjs](../../../../.tmp/browser-preflight/final-verification/review-spec-probes.mjs)，命令及输出见下表。

**修复方向：** 区分已知 loader 包装候选与完整生产包候选；对当前文档中已经执行但不匹配的完整包或重复完整注入明确 blocked，阻止回调/截图。verifiedScriptIds 不能把不匹配的生产包登记为已验证。补上“当前包+同长度旧包共存”和“当前包+重复注入”的回归；保留现有 loader 包装候选的正常场景。不可简单要求所有 /ehunter/ 候选均与生产包相等，因为真实 EH 的 loader 包装脚本也带该名称，全文正常与 bundle 不同（最终桌面候选33长2659、实际bundle候选43长431923）。

**边界：** 这是受控源码/coverage模型证明的 helper 放行路径，不是本轮真实 EH 存在双注入的断言。外层安装前提仍需真实核实；已有只读脚本状态记录不能消除 helper 对已观察冲突的错误放行。

### S2 / P1：page.events 超时后，晚返回的已捕获批次被丢弃，finally 又开始另一读取

**定位：** `scripts/browser-preflight.mjs:136`、`scripts/browser-preflight.mjs:214`、`scripts/browser-preflight.mjs:215`、`scripts/browser-preflight.mjs:222`、`scripts/browser-preflight.mjs:626`、`scripts/browser-preflight.mjs:633`。缺失契约：PRD R4、AC4、design 的单消费者、先保存再分析、异常/超时保留已捕获事件。

`bounded` 仅以 Promise.race 抛出超时，未终止 `page.events()`。超时会越过建立批次/保存的代码并释放 collecting；finally 随即再次 drain。旧 Promise 晚返回的事件数组没有落盘路径，也不进入 pendingBatches/unsaved，实际同时仍有两个读取处于未结束状态。Ego 文档 `/Users/warwick/.agents/skills/ego-browser/references/api.md:70` 明确 events 读取即清空，未提供 timeout/AbortSignal 参数；不能假定本地 Promise 超时等于底层操作已取消。

**受控复现：** 第2次 events 调用先 splice 取得新文档 commit/context/scriptParsed 批次，再延迟250ms才返回；helper timeoutMs=100，其余操作正常。实际 observed=blocked/callback0，已有旧批及finally已保存；但 maxActive=2、晚批确实返回且含 scriptParsed、events.jsonl 无该 scriptParsed、result.unsaved=[]。该缺陷没有导致本例误绿，却违反已捕获证据的保存契约；不能因 blocked 分类正确而认为 R4 满足。

证据：[review-spec-probe-results.json](../../../../.tmp/browser-preflight/final-verification/review-spec-probe-results.json) 的 `late-events-after-timeout`，脚本、输出与独立 artifacts 同上。真实 EH 桌面 `switch-book:waiting:events` 已出现 `page.events timed out after 15000ms`，因此该边界有实际验收关联；本次复现没有证明真实超时或真实丢批的根因。

**修复方向：** 明确持有唯一的在途 drain，超时后不能把它当作已结束并并发启动新 drain；为该 Promise 的成功晚回执绑定“先保存、禁止重新放行”的路径。若当前 Ego 不能取消/确认完成，应保留 pending/incomplete 的具体诊断、停止后续读取并交还外层处理，不声称结果覆盖已返回但丢弃的事件。有限等待/finally要继续有上限。补“读取已清空后延迟返回”回归；现有立即抛错与写盘失败测试没有模拟它。

## 契约核对与已确认范围

| 契约 | 实现与证据 | 结论 |
| --- | --- | --- |
| R1 / AC1 固定尺寸、DPR/touch、mobile回执 | helper:8/263使用固定profile和1e-6；prepare:435/checkpoint:455/screenshot:495检查实际inner尺寸，未修改meta；closeReader:503比较本轮原站meta | 受控正反例与本地两视口环境成立；EH移动严格门blocked，关闭恢复的真实完整矩阵未完成 |
| R2 / AC2 完整身份与当前文档执行 | consume:160排除导航前批；verifyIdentity:308关联主frame/loader/context；源码原样相等，coverage顶层0–length非零；Vite保留query并遍历全部项目模块 | 主路径有证据；S1是EH误放行；无尚未加载分支或整个工作树执行声明 |
| Vite 输入/HMR及新增模块 | mandatory INPUTS:12/fingerprint:38；unchanged:292；WebSocket update/full-reload/error/prune在consume:187失效；checkpoint:455通过identityIsCurrent补查新增模块 | 单测覆盖输入变动、HMR、懒加载及观测期间新增模块；真实四场景仍不能记为全部功能通过 |
| R3 / AC3 权限与安装 | permissions:53精确grant集合和connect超集/实际host；source安装事实与可读证据:561分开；指南说明外层对事实真实性负责 | 静态权限正例及缺GM_download/hath.network负例成立；安装副本完整metadata、所有实际请求未核验 |
| R4 / AC4 事件与finally | drain:210在consume前保存原始批；save:141及result原子rename:649传播失败；finally保留原始/保存错误 | 正常保存、立即抛错/写盘失败有测试；S2未满足晚回执及单消费者边界 |
| R5 / AC5 分类与回调 | prepare/checkpoint之后才调用runChecks:605；ProductAssertion单独failed，工具/保存异常blocked；严重未知错误blocked；主会话单写在两个指南中明确 | 已核对现有blocked记录，没有把命令成功或helper成功作为全部功能成功；S1回调隔离仍有漏洞 |
| R6 / AC6 空间、服务、UI选择器 | 两指南保留同空间/观察后交互/资源归属；helper不启动服务、不改存储、不结束空间；真实记录复用空间2/p1 | 服务清理证据成立；浏览器矩阵与成功finish未完成，正式审查有待修复缺陷 |

helper 错误黏性在已经进入 protected 操作后的异常路径成立；本次另观察到并发调用的前置 `requireCondition(!activeGuard)` 位于 guarded 的 try/catch 外（helper:478）：调用方捕获该违规错误后仍可得到 helper passed/errors=[]。指南要求全部顺序 await，故本报告把它保留为 API 使用限制及可补测试项，不把违反已声明调用约束的脚本当作第三项交付阻塞。取证结果也保留在 probe-results 中。

通用指南及EH技能均通过同一 helper 接线，没有另行抢 drain 的示例；独立资源/视觉范围、预构建依赖/锁文件边界、mobile命令回执性质、原站/第三方归因、原始failed与证据blocked分项、acceptance.py普通非零不能自动映射blocked均有说明。已检查81个本地Markdown文件目标均存在：[review-spec-links.json](../../../../.tmp/browser-preflight/final-verification/review-spec-links.json)。这是链接可达检查，不是所有用例的实际执行。

## 自动检查与本轮取证

已有命令结果复核自 acceptance.json 及其真实日志，未重复完整测试：

| 检查 | 真实结果 | 边界 |
| --- | --- | --- |
| `node --test tests/browser-preflight.test.mjs` | exit0，70/70通过，2026-10-12T17:18:49.566021+00:00至17:18:54.839050+00:00 | 现有测试未包含S1/S2复现 |
| `npm run check` | exit0，type-check、37项Python、46项storage、70项preflight及生产build完成 | 构建有既有Sass弃用与punycode externalization警告；无lint脚本，未报告lint或远端CI |
| `node .tmp/browser-preflight/final-verification/review-spec-probes.mjs` | exit0，2026-10-12T17:54:56.519702+00:00至2026-10-12T17:54:57.108856+00:00 | 断言正常对照及缺陷可复现；exit0不是产品/AC通过 |
| `python3 .trellis/scripts/task.py validate .trellis/tasks/10-12-browser-acceptance-preflight` | exit0，implement.jsonl 3项/check.jsonl 5项合法 | 仅校验上下文manifest，不证明功能验收 |
| `python3 scripts/acceptance.py summarize .trellis/tasks/10-12-browser-acceptance-preflight` | **exit1，status=blocked，observedStatus=blocked** | 已保存当前记录，无写入/豁免/改通过 |

本轮命令原文与完整stdout/stderr：

- [review-spec-probes-execution.json](../../../../.tmp/browser-preflight/final-verification/review-spec-probes-execution.json)、[review-spec-probes.log](../../../../.tmp/browser-preflight/final-verification/review-spec-probes.log)。
- [review-spec-task-validate-execution.json](../../../../.tmp/browser-preflight/final-verification/review-spec-task-validate-execution.json)、[原始stdout](../../../../.tmp/browser-preflight/final-verification/review-spec-task-validate.stdout)、[原始stderr](../../../../.tmp/browser-preflight/final-verification/review-spec-task-validate.stderr)。
- [review-spec-acceptance-summary-execution.json](../../../../.tmp/browser-preflight/final-verification/review-spec-acceptance-summary-execution.json)、[原始JSON](../../../../.tmp/browser-preflight/final-verification/review-spec-acceptance-summary.json)、[原始stderr](../../../../.tmp/browser-preflight/final-verification/review-spec-acceptance-summary.stderr)。
- [review-spec-evidence-audit.json](../../../../.tmp/browser-preflight/final-verification/review-spec-evidence-audit.json) 核对现有日志及runtime result，不变更其结果；[review-spec-document-events.json](../../../../.tmp/browser-preflight/final-verification/review-spec-document-events.json) 保存真实commit/context事件的关联观察。

## 完整验收仍未满足的范围

本地Vite桌面/移动都具有120/120当前模块身份与执行、各自严格环境证据；桌面在截图后更新请求 `net::ERR_HTTP2_PROTOCOL_ERROR` / `TextReq: request error` 阻塞，移动在 `select-book timed out after 15000ms` 后还有更新请求错误。EH桌面完整包identity、桌面环境、标题及1/136通过部分断言，但 `switch-book:waiting:events` 的 `page.events timed out after 15000ms` 阻塞后续功能。EH移动原实测1232×2666，另一探针742×1606，均不符合390×844；callback0/screenshot0。以上沿用 [final-runtime.md](final-runtime.md)，没有推定为产品failed。

真实开关/关闭meta恢复/重开、模式切换、缩略图完成加载与定位、全部关键截图及视觉验收仍未完成；安装副本完整声明、未加载分支、独立资源视觉新鲜度、NH/物理设备/其他浏览器未验证。EH移动旧运行证据的保留边界也明确：产品/dist/loader未变，最终helper仅改Vite归因，因此原环境阻塞仍有效，但没有冒称最终helper下已重跑EH移动全部功能。

现有cleanup记录为partial：本任务服务/npm父进程退出、5173/5174/8787/8788释放；空间2/p1保留在about:blank，因为blocked时不得调用成功专用finish。审查没有启动或控制任何服务/浏览器空间，也没有后台编码/审查子代理。必要证据保留。

## 交给主会话的逐项建议

当前保存记录 `.trellis/tasks/10-12-browser-acceptance-preflight/acceptance.json` 的汇总counts为 passed5 / failed0 / partial1 / blocked4 / unrun1 / waived0，AC1–AC6均blocked；formal-review仍unrun。**该汇总描述主会话当前已保存记录，尚未合并本次Spec结论。** 不修改该记录，也不把本报告进程成功写成审查通过。

[review-spec-proposed-checks.json](../../../../.tmp/browser-preflight/final-verification/review-spec-proposed-checks.json) 提供保持既有formal-review字段的建议：observed=failed、method=inspection、execution=null、证据为本报告/复现/冻结记录，说明S1/S2未修复且仅覆盖Spec。主会话等Standards结果核验完成后合并，不能由本代理声称另一轴完成；其他四个runtime/blocked与cleanup partial保持实际观察。自动测试通过也不能取消新发现的缺失场景。

两分钟下一步：主会话先打开probe-results的两个复现项，确认S1/S2修复范围并合并formal-review建议；在审查代理都结束后安排修复，随后仅重跑受影响自动/浏览器检查，再固定新版本审查。当前gate exit1禁止完成或归档，无验收豁免。

## acceptance.py summarize 原始JSON（exit 1）

以下为此次命令的原始stdout，完整文件另存如上；这是审查期间尚未合并建议的记录。

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
        "startedAt": "2026-10-12T17:18:49.566021+00:00",
        "endedAt": "2026-10-12T17:18:54.839050+00:00",
        "log": ".tmp/acceptance/10-12-browser-acceptance-preflight/tmpp52_lsek.log"
      },
      "evidence": [
        ".tmp/acceptance/10-12-browser-acceptance-preflight/tmpp52_lsek.log"
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
        "startedAt": "2026-10-12T17:18:54.868183+00:00",
        "endedAt": "2026-10-12T17:19:06.954815+00:00",
        "log": ".tmp/acceptance/10-12-browser-acceptance-preflight/tmpczizk9iq.log"
      },
      "evidence": [
        ".tmp/acceptance/10-12-browser-acceptance-preflight/tmpczizk9iq.log"
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
