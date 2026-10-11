# 建议 01：验收状态一致性的最小设计

研究日期：2026-10-11。性质：只读调查与方案建议，供主会话选择；没有实施脚本、修改配置、启动任务或执行测试。唯一交付文件为本文件。

## 推荐结论

新增一个项目自有的 `scripts/acceptance.py`，使用 Python 标准库，读取每个任务的一份 `acceptance.json`，提供 `run`、`summarize`、`archive` 三个窄命令。逐项记录观察结果，豁免另存；AC 与总状态只能由条目计算。`archive` 在同一进程内先校验、汇总，再调用已有 `task.py archive`，失败时不调用归档。现有 finish-work、check agent 和 workflow 改为使用此入口。

不修改 `.trellis/scripts/**`、Pi 扩展、Trellis 核心或全局包；不引入审批系统、证据签名、CI 或 branch protection。配置收敛在任务自己的 `acceptance.json`；不增加仓库 YAML 配置、schema 包或插件注册层。

此方案提供的是**项目标准收口路径中的确定性阻断**。用户直接执行原生 `task.py archive` 仍可绕过，不能宣称是所有入口都无法绕过的强制门禁。在“不改核心”的边界内，应把该限制写清楚，而不是使用失败不阻断的生命周期钩子冒充门禁。

## 已确认事实与精确依据

### 1. 已有历史反例，不需再次遍历会话

本轮依照委派只复用现有研究，未重新打开原始会话。下表的会话 ID/行号来自 `.trellis/tasks/10-11-project-session-retrospective/research/report.md:29`、`.trellis/tasks/10-11-project-session-retrospective/research/report.md:30`、`.trellis/tasks/10-11-project-session-retrospective/research/report.md:31`。

| 反例 | 原始定位 | 后果与设计要求 |
| --- | --- | --- |
| 非零类型检查被勾成完成 | S26 `01a0b5a0-4160-7325-b141-428d42ede483` L608 `EXIT=2`、L653 T031 未通过；S25 `01a0b54b-8fb1-7325-b141-428b7aec79ce` L1517 勾选 T031，仍写 22 条历史错误未修 | 非零退出不得生成 passed；“既有问题”只能成为豁免理由，不能改写观察状态。历史类型错误后来已解决，不能当成当前编译失败。 |
| AC4 部分验证，却汇总 AC1–AC8 全通过 | S70 `01a10142-6362-7088-9a2a-273b37f5e88b` L879、L894 | 需要逐 AC 推导；未运行旧记录注入，静态检查或其他 AC 通过不能补足。最终说明曾披露限制，不应指控隐瞒。 |
| ZIP 结构绿，实际没有图片 | S27 `01a0b5fc-2a7b-7325-b141-428f963c3810` L288 | 106 条结构断言只证明结构；图片条目和有效内容需要另列必需项。子代理保留内容阻断，后来主链在真实 GM 环境修复。 |

### 2. 规范足够明确，缺的是结果协议与执行接线

- `.trellis/spec/frontend/quality-guidelines.md:21` 要求交付记录实际结果、平台/模式范围和未满足约束；历史勾选不满足新变更的 AC。
- `.trellis/spec/frontend/quality-guidelines.md:47` 明确当前没有根 lint/test 命令，不得凭空报告其结果；`.trellis/spec/frontend/quality-guidelines.md:98` 已要求逐项 `passed / failed / blocked / unrun`，构建与源码检查不能代替功能运行。
- `.trellis/spec/frontend/browser-acceptance.md:134` 已禁止将局部通过写成完整验收通过。新设计只扩充 `partial / waived` 与确定性汇总，不把该规范重新包装成新发现。
- `.pi/agents/trellis-check.md:47`–`.pi/agents/trellis-check.md:52` 要求读任务产物、审查、修复并运行适用检查；`.pi/agents/trellis-check.md:61`–`.pi/agents/trellis-check.md:63` 只要求自然语言输出，没有机器可读验收契约。
- `.pi/extensions/trellis/index.ts:1606`–`.pi/extensions/trellis/index.ts:1611` 以子进程 `code === 0` 设置 `succeeded`、`failed: false`，这是代理执行成功，不是 AC 成功。本方案不改该进程状态语义。

### 3. validate、finish、archive 是三个不同入口

| 入口 | 当前真实行为 | 不能据此推断 |
| --- | --- | --- |
| `task.py validate` | `.trellis/scripts/task.py:71` 导入 `cmd_validate`；`.trellis/scripts/common/task_context.py:157`–`.trellis/scripts/common/task_context.py:198` 只遍历 `implement.jsonl`、`check.jsonl`，汇总上下文文件错误 | `All validations passed` 不是功能验收通过。缺文件甚至被跳过，见 `.trellis/scripts/common/task_context.py:287`；存在但无有效条目则失败，见 `.trellis/scripts/common/task_context.py:388`。 |
| `task.py finish` | `.trellis/scripts/task.py:275`–`.trellis/scripts/task.py:293` 先清活动指针，随后运行 `after_finish`；不将任务改成 completed | 不能用它充当完成验收，也不应改变用户暂停会话/清指针的已有语义。 |
| `task.py archive` | `.trellis/scripts/task.py:60` 导入 `cmd_archive`；`.trellis/scripts/common/task_store.py:1299` 检查目标冲突，`.trellis/scripts/common/task_store.py:1337` 检查分支元数据，`.trellis/scripts/common/task_store.py:1351` 写 completed，`.trellis/scripts/common/task_store.py:1430` 清指针并移动，`.trellis/scripts/common/task_store.py:1439` 自动提交，`.trellis/scripts/common/task_store.py:1455` 执行 after_archive | 未检查验收 JSON、AC 或运行证据。归档自动提交失败会在移动后返回 1，见 `.trellis/scripts/common/task_store.py:1441`–`.trellis/scripts/common/task_store.py:1450`；包装器不能承诺所有失败都无副作用。 |

特别注意：`.trellis/scripts/common/task_utils.py:381`–`.trellis/scripts/common/task_utils.py:410` 实际从 `.trellis/config.yaml` 取生命周期命令，明确 `Fail-open by design`；`.trellis/scripts/common/task_utils.py:467` 只打印失败告警。`.trellis/config.yaml:39`–`.trellis/config.yaml:51` 同样说明失败不阻断。`.trellis/workflow.md:698` 所写 task.json hooks 与该实现不一致，不能据此设计 task 级前置门禁。本方案不顺带修这个文档差异。

### 4. 现有收口会跳过验收状态

- `.pi/prompts/trellis-finish-work.md:17` 写当前任务总会在 Step 3 归档；`.pi/prompts/trellis-finish-work.md:45`–`.pi/prompts/trellis-finish-work.md:51` 直接执行 `task.py archive`。只有其他任务需要选择是否一并归档。
- `.trellis/workflow.md:539`–`.trellis/workflow.md:568` 已有必需的 quality check 和提交前 full-scope 检查；`.trellis/workflow.md:604` 定义代码提交先于收口。这里应接入汇总，而不是另造一条工作流。
- `.trellis/workflow.md:236`–`.trellis/workflow.md:250` 的 `in_progress` 与 `in_progress-inline` 是实际阶段提示入口；`.trellis/workflow.md:131` 说明 completed 提示块当前不会在正常归档路径触发。只改 completed 块不会解决执行问题。

## 推荐设计：一份数据、两类状态、三条命令

以下文件名、字段、命令与退出码都是建议，当前尚不存在。

### AC 来源与覆盖范围

1. 复用任务 `prd.md` 的接受标准；新接入任务将接受标准节中的顶层条目写为 `- [AC1] ...`、`- [AC2] ...`。每个接受标准必须有唯一标识，不另立内容相同的第二份需求清单。
2. 解析仅支持约定的 `## 接受标准` / `## Acceptance Criteria` 节与上述顶层条目格式，忽略 fenced code block。节内其他未标识的顶层标准条目、重复 AC、空节、多个候选节均报告输入错误。不要用扫描全文 `AC\d+` 的方式把普通引用误算为定义，也不要试图实现任意 Markdown 解析器。
3. `acceptance.json.criteria` 的键集合必须与 PRD 的 AC 标识集合完全相等；每个 AC 至少映射一个必需检查。检查可以服务多个 AC，但同一个 AC 下的所有检查必须满足，不能采取“任一通过即覆盖”。
4. 每个 check 有独立的 `id`、`ac`、`claim`、`scope`、`method`、`dimension`；必须在执行前按 AC 和 quickstart 拆好场景。结构和内容、桌面和移动、EH/NH、源码推导和真实运行需要分开的地方必须拆项，不靠一个自由文本“全平台”字段隐去未执行场景。
5. criteria 值保存对应 PRD 条目的原文（可含其续行），脚本核对规范化空白后的相等性。这样 AC 文本变更后旧映射不会悄悄继续通过。此机制只校验清单契约，不证明每个行为都已被合理拆分；主会话/check agent 仍负责核对 quickstart 的语义覆盖。
6. 所有列入清单的检查均为必需项；不加容易绕过的 `required:false`。不适用的通用检查无需列入（例如文档任务无需产品浏览器检查），但不能把 PRD 自己的 AC 删除为“不适用”。范围变更走既有 PRD 对齐流程。

### 单个 JSON 示例

使用单个 `<task-dir>/acceptance.json` 保存定义和结果，便于审查与随任务归档。不再生成一个供手改的总状态字段。例中只有 AC1，意在展示 ZIP 结构/内容分拆：

```json
{
  "schemaVersion": 1,
  "criteria": {
    "AC1": "下载 ZIP 包含元数据和可用图片"
  },
  "checks": [
    {
      "id": "zip-structure",
      "ac": ["AC1"],
      "claim": "ZIP 可打开且元数据符合约定",
      "scope": "EH/book/小画廊",
      "method": "command",
      "dimension": "structure",
      "observed": "passed",
      "execution": {
        "argv": ["node", "scripts/example-zip-structure.mjs"],
        "cwd": ".",
        "exitCode": 0,
        "startedAt": "2026-10-11T10:00:00Z",
        "endedAt": "2026-10-11T10:00:01Z",
        "log": ".tmp/example/zip-structure.log"
      },
      "evidence": [".tmp/example/zip-structure.log"],
      "note": "结构断言通过；不证明图片内容",
      "waiver": null
    },
    {
      "id": "zip-images",
      "ac": ["AC1"],
      "claim": "真实 GM 环境下载包含图片条目且可解码",
      "scope": "EH/book/小画廊",
      "method": "runtime",
      "dimension": "content",
      "observed": "blocked",
      "execution": null,
      "evidence": [],
      "note": "GM 环境未就绪，尚未取得含图片的 ZIP",
      "waiver": null
    }
  ]
}
```

示例命令、日志路径是未来夹具占位，不表示当前仓库存在这些文件或本轮已执行。`method` 建议固定为 `command | runtime | inspection`；`dimension` 固定为 `structure | content | behavior`。method 描述如何取证，dimension 描述证明什么，两者不能互相替代。命令执行的行为断言可以是 `command + behavior`，并不强迫所有行为验收使用浏览器。

### observed 与 waived 的关系

- 输入 `observed` 仅允许 `passed / failed / partial / blocked / unrun`：passed 表示该条 claim 在声明 scope 完成验证；failed 表示实际检查发现不满足；partial 表示只完成了部分；blocked 表示准备条件阻碍验证；unrun 表示未执行。没有实际执行该项检查不得写 passed；inspection 可以通过其静态 claim，但不能代替 runtime claim。
- `waived` 保留为**派生结果状态**：一项存在有效 waiver 时，输出 `status: waived`，同时原样输出 `observed`。不得将 observed 改成 waived、passed 或抹掉原 exitCode。
- `waiver` 最小为 `{ "reason": "...", "authority": "既有用户决定或规范引用，含可定位出处" }`；允许原观察为 failed/partial/blocked/unrun。没有依据或空理由即输入错误；对 passed 再豁免也拒绝，避免歧义。
- 不创建批准人数据库、待批准队列或新的批准流程。字段完整性由程序检查，依据是否确实授权仍由主会话核对；子代理无权自己填写“已批准”。没有既有豁免依据时保持原状态，不能为收口自动造豁免。
- 替代证据只有在其本身完成了原 claim 时才可以重新形成 passed；如果只接受缩小范围或跳过剩余项，仍是 waived。是否等价由人判断，脚本不判断截图语义。

### 原始退出码与执行记录

- `run <task-dir> <check-id> -- <argv...>` 用 `subprocess.run`（参数数组、`shell=False`）执行明确指定的单条检查，直接从 `returncode` 保存 exitCode，不通过 `echo` 后的 `$?`、管道最后一段或日志字符串推测。stdout/stderr 写仓库 `.tmp/` 下本次日志。
- `run` 只用于 `method: command`，零退出只证明该条命令定义的 claim；启动服务、浏览器自动化连接成功不能用作功能断言命令。运行命令本身必须在失败时非零，不能把观察型 `pass:false`、exit=0 的脚本当成断言。该问题与另一子任务的命令门禁可复用，不在此重做。
- 正常非零执行记录 `observed: failed`；启动失败、未执行到检查则记 blocked 并保存原因。重跑先将该条置为 unrun、清除已失效 waiver，再执行，防止中断保留上一轮 passed。替换当前记录，历史保留日志/Git 即可，不引入运行数据库。
- summarize 对任何已记录的非零 exitCode 与 observed=passed 组合报输入矛盾（exit 2），即使 waiver 存在也不能掩盖矛盾。正常的 failed+exit 2 可以汇总为失败，或在有有效依据时输出 waived+observed failed。
- `method: command` 的 passed 必须有完整 execution 且 exitCode 严格为整数 0；JSON `true` 不是 1/0，不能被 Python bool/int 的继承关系误放行。null、缺失退出码不可通过。
- `runtime` / `inspection` 的 passed 需要非空 evidence 和描述实际操作/观察的 note；partial/failed/blocked 需要说明未满足部分。若它们附带 execution，同样受退出码一致性约束。
- 脚本只验证字段、集合关系、退出码与声明的矛盾，不做通用证据真实性认证。证据存在不等于证明 claim；确认当前代码已加载、引用正确产物仍按现有验收规范执行。代码或测试继续变化时使受影响条目失效并重验；本轮不加全仓库哈希/自动依赖追踪系统。

### 汇总算法与错误码

先验证 schema、AC 完整覆盖、check id 唯一、引用存在、字段类型及退出码一致性；输入错误时输出 `valid: false` 和定位错误，不输出“通过”。不接受输入自带的 overall/AC status，避免手写结论覆盖计算值。

对每个 AC 及整个任务都使用同一算法。分别对原始 observed 和应用 waiver 后的 status 聚合，输出 `observedStatus`、`status`、六类计数和 `waivedChecks`：

1. 存在 failed → failed。
2. 否则存在 blocked → blocked。
3. 否则存在 partial → partial。
4. 否则存在 unrun：全是 unrun → unrun；与 passed 或 waived 混合 → partial。
5. 剩余仅有 passed/waived：存在 waived → waived；全部 passed → passed。

优先顺序只用于生成简明标题；所有逐项状态与计数必须保留，不能因 blocked 优先而隐藏 partial。空 AC、空检查清单在结构校验阶段拒绝，不能套用 all([]) 得到 passed。

| summarize 退出码 | JSON 结果 | 语义与收口动作 |
| --- | --- | --- |
| 0 | `valid:true, status:passed` | 全部通过，可进入已有收口流程。 |
| 1 | `valid:true, status:failed/partial/blocked/unrun` | 结果合法但验收未满足；停止宣告完成/归档。 |
| 2 | `valid:false` | 输入/协议错误、缺文件、矛盾、漏 AC 等；先修正记录，不能当产品失败或通过。 |
| 3 | `valid:true, status:waived` | 含有依据的豁免；只能报告“有豁免”，绝不是全通过。标准收口可继续，但必须保留原 observed 与豁免依据。 |

`summarize` stdout 输出唯一 JSON，stderr 输出诊断；主会话由该 JSON 渲染说明，不人工再推导一次。可读报告直接列 scope、observed、status、证据及各 AC 汇总；不另外维护易漂移的 acceptance.md 勾选表。

`run` 返回原命令正常退出码（包括 2），启动失败使用固定非零并在结果里注明未启动；与 summarize 的退出码命名空间分开，调用方通过子命令和 JSON 字段区分。信号终止保存原 returncode，并用常规非零 shell 退出值返回。

`archive` 内部调用相同的校验/汇总函数，只有 status passed 或有有效 waiver 的 waived 才调用原生 `task.py archive`，而不是 shell 中写 `summarize || true`。归档结果单独返回 `acceptanceStatus`、`archiveExitCode`：归档成功时 passed 返回 0、waived 返回 3；原生归档失败统一返回 4，并保留原生码及输出。返回 4 可能已移动目录，必须按现有脚本告警处理，禁止自动重跑。收口提示词必须显式处理 0/3 两类成功，不可用只接受 0 的 `&&` 串接所有步骤。

## 最少接入文件与避免“写了无人执行”

建议首个独立实施任务控制在 **2 个新脚本 + 4 个现有文件**，以及该任务自己的 acceptance.json/PRD AC 标识。测试夹具可内嵌标准库测试文件，避免增加 schema、配置和独立 fixture 目录。

| 文件 | 最小变更与当前定位 |
| --- | --- |
| 新增 `scripts/acceptance.py` | 单文件实现读 JSON、AC 定义校验、run/summarize/archive；归档委托现有 CLI，不复制任务移动/自动提交逻辑。不导入 Trellis 私有模块；要求显式任务目录，从仓库根调用。 |
| 新增 `scripts/test_acceptance.py` | Python unittest 负向与接入测试，使用临时目录/桩归档入口验证失败未调用归档；测试产物放 `.tmp/`。无需测试框架依赖。 |
| `.trellis/spec/frontend/quality-guidelines.md` | 在 `.trellis/spec/frontend/quality-guidelines.md:90` 的现有 Evidence and completion 节定义本协议、状态、证据及旧任务政策；这是协议唯一文档真源，不另建规范文件。 |
| `.pi/agents/trellis-check.md` | 在 `.pi/agents/trellis-check.md:61` 的 Output 节要求返回 acceptance.json 路径与 summarize 原始 JSON；逐项填结果，不能凭子代理进程成功宣称 AC 全通过。主会话负责统一写/合并，禁止多个 agent 同写同一个 JSON。 |
| `.trellis/workflow.md` | 规划阶段要求按 PRD 定义验收项；`.trellis/workflow.md:568` 的最终检查及 `.trellis/workflow.md:602` 的提交前置步骤实际调用 summarize；同步 `.trellis/workflow.md:236` 与 `.trellis/workflow.md:248` 的活动阶段提示。操作详情放已有 2.2/3.4，提示块只引用入口。 |
| `.pi/prompts/trellis-finish-work.md` | 移除 `.pi/prompts/trellis-finish-work.md:17` 和 `.pi/prompts/trellis-finish-work.md:51` 的无条件归档；Step 3 将 `.pi/prompts/trellis-finish-work.md:48` 改为包装器 archive。每个待归档任务单独检查；非通过不调用原 archive，记录该任务仍未完成。已有工作区分类、其他任务确认和 journal 次序保留。 |

两处执行点各有目的：check/提交前尽早暴露不一致；finish-work 的归档包装器防止“检查失败后继续归档”。归档命令本身必须重新计算，不能只相信较早的一份 stdout。实现验收要证明 prompt 确实引用包装器、workflow 确实要求运行、wrapper 对坏输入确实不委托归档；只测 reducer 不算完成接入。

不需要改 package.json：直接 Python 命令够用，避免把 AC 汇总混进 type-check/build-prod 脚本。现有 frontend index 已链接质量规范，见 `.trellis/spec/frontend/index.md:16` 与 `.trellis/spec/frontend/index.md:21`；共享 trellis-check skill 已要求按索引读 Quality Check，见 `.agents/skills/trellis-check/SKILL.md:31`。因此不必为 inline 路径再修改公共 skill。channel runtime 的 `.trellis/agents/check.md` 与 Pi agent 不同，本轮不扩到未被本方案主路径使用的 runtime。

## Python 标准库与 Node 标准库选择

| 维度 | Python 标准库 | Node 标准库 |
| --- | --- | --- |
| 当前可用性证据 | 本轮已用 `python3 ./.trellis/scripts/task.py current --source` 成功解析活动任务；现有生命周期即 Python | `package.json:12` 已有 Node `.mjs` 服务；`package.json:21`/`package.json:22` 有 Node 22 类型/配置，但不能据此证明实际 Node 版本 |
| JSON/进程/文件/测试 | json、argparse、pathlib、subprocess、unittest 足够 | JSON、fs、child_process、node:test/assert 足够 |
| 接入归档 | 同一 Python 解释器委托 task.py，文档任务不依赖 npm install | 仍需启动 Python，增加一个运行时边界 |
| 与另一子任务复用 | 可用 argv 执行 npm/Node 检查，不复写其断言 | 若另一路已决定一个 Node 统一检查入口，可同语言复用，但本任务不应因此引入它的产品依赖 |

推荐 Python；不需要 PyYAML、Pydantic、AJV 或 JSON Schema 依赖。本协议字段少且固定，用显式校验即可；JSON/命令执行仍用标准库，不手写协议解析。未来若主会话统一采用 Node，状态契约与负向样例保持相同，比语言一致更重要。

## 历史任务兼容

- 不批量给历史 task.json 加字段，不重写 archived 任务，不将既有 completed 反标为 failed；历史记录不是新验收通过的证明。
- 新任务从规划开始使用 AC 标识与 acceptance.json。活跃旧任务准备完成时，按原 PRD 逐项补标识、补当前结果；没有运行证据的历史勾选写 unrun，无法满足则保留 blocked 或有依据的 waiver。
- 缺 acceptance.json 不能默认 passed。标准 finish-work 对缺协议的活跃任务停止归档并提示补齐；这是收口入口的渐进接入，不是让旧脚本本身报错。
- 纯文档/研究任务同样可以使用协议，但检查内容是引用、结构、命令/config 事实；不得因此强制运行产品类型检查、构建或浏览器。旧模板中找不到 AC 节时明确报告输入错误，由主会话按原任务补齐，不自动猜测全部通过。
- 旧归档只读展示可以标记“历史未纳入此协议”（输出说明而非新增第七种状态）；不要自动造 acceptance.json。若之后另行要求历史清理，按既有用户决定处理，不为本方案加一个泛用 `--skip-acceptance` 开关。
- 本研究所在任务当前仍是 planning，见 `.trellis/tasks/10-11-project-session-retrospective/task.json:6`；本轮不启动、不替它补协议、不归档。

## 模板更新边界

本轮只读比较了当前内容 SHA-256 与 `.trellis/.template-hashes.json`：finish-work、Pi check agent、workflow、task.py 均与已登记模板一致；quality-guidelines 不在当前登记表内。

- 管理登记的精确位置：`.trellis/.template-hashes.json:6`（finish-work）、`.trellis/.template-hashes.json:50`（Pi check）、`.trellis/.template-hashes.json:84`（task.py）、`.trellis/.template-hashes.json:85`（workflow）。未来前三项的项目修改会成为用户自定义；不能改 hash 把本地补丁伪装成上游模板。
- `.agents/skills/trellis-meta/references/local-architecture/generated-files.md:52`–`.agents/skills/trellis-meta/references/local-architecture/generated-files.md:60` 说明 update 根据 hash 区分本地修改，并可保留或产出 `.new`；这是文档契约，本轮未实际执行 update 或验证冲突 UI。
- 推荐把实现放在当前未受模板登记的 `scripts/acceptance.py`，将稳定项目契约放在现有 quality-guidelines；三个受模板管理的流程文件仅保留短接线。未来更新需要合并时，保留项目接线，并检查新的归档步骤是否仍走包装器。
- `.trellis/workflow.md:683` 区分模板维护者运行 update 与项目自定义后重启会话。不得为了验证本方案而在工作仓库贸然执行 `trellis update`；后续实施可在隔离副本演练。不要仅改目前不触发的 completed 提示块。
- `.agents/skills/trellis-meta/SKILL.md:75`、`.agents/skills/trellis-meta/SKILL.md:80`–`.agents/skills/trellis-meta/SKILL.md:82` 的禁止事项要求避免改全局包、node_modules、公共 bundled skill 和管理状态。具体不修改这些文件；本研究引用该原则而不扩展实施范围。

## 可独立验收的完成标准与最高价值负向样例

以下是未来实施任务的验收要求，**本轮没有运行**。完成不依赖另一子任务的真实产品检查、浏览器登录或 CI；通过标准库夹具即可验证协议和接线。

| 用例 | 必须得到的结果 |
| --- | --- |
| 原始命令 exit=2，同时填 observed=passed | summarize exit 2、明确定位 check；有 waiver 也拒绝矛盾。run 直接捕获原始 2。 |
| 原始命令 exit=2，observed=failed，理由为历史问题但无 waiver | exit 1、failed；理由不能升级状态。 |
| 同一失败条目附有效既有 waiver | exit 3、status waived、observed failed、exitCode 2 均保留；不得输出全通过。 |
| AC1–AC8 中 AC4 partial，其余 passed | AC4 与 overall 为 partial、exit 1。 |
| ZIP structure passed，content blocked | overall blocked、exit 1；106 条结构断言不能抵消内容项。 |
| 漏掉 AC4、空 checks、重复 check id、未知 AC、AC 有标识但未映射 | exit 2；不能以已记录子集全绿产生 passed。 |
| 修改 PRD AC 文本却保留旧 criteria；或将一个 AC 的第二个必需 check 留为 unrun | 前者 exit 2；后者 overall partial/exit 1。 |
| command passed 的 exitCode 是 null/true/字符串 "0" | exit 2，严格类型校验。 |
| runtime passed 无 evidence，或只有 inspection 条目却删掉计划的 runtime 条目 | 前者 exit 2；后者需要主会话/check 对计划差异审查，不夸称纯程序能判定行为覆盖充分性。 |
| 所有检查合法 passed | exit 0；各 AC 与 overall passed。 |
| 合法 waiver 与另一个未豁免 failed/blocked 混合 | exit 1、failed/blocked；不能因存在任何 waiver 就放行整个任务。 |
| wrapper 接收 failed/partial/blocked/unrun/非法 JSON/缺文件 | 不调用归档；任务目录、指针、task.json 保持不变。用桩归档入口检测调用次数 0。 |
| wrapper 接收 passed/waived；归档子命令返回 0 或失败 | 前两种仅调用一次原归档；返回 0/3 与报告一致。子命令失败返回 4，保留原码，不自动重试。 |
| 查看 finish-work 与 workflow 接线 | 原无条件归档指令移除；当前任务和额外任务都使用 wrapper；输出码 3 明确处理；未修改 Trellis 核心。 |

实施交付需展示：上述三条历史反例被机械拒绝、全绿与有豁免两条正向路径、归档委托被实际阻断的证据，以及模板接线的 diff。不要将 schema 单测通过写成产品 AC 通过。

## 已验证与未验证

已验证：当前活动任务、所列本地规范/流程/实现段落、归档钩子 fail-open、模板登记与文件哈希关系、现有 Python/Node 命令入口。graft 的一次检索只返回产品层无关命中，故针对未索引的 Trellis 配置与脚本采用定点读取，未重读项目源码或全部会话。

未验证：原始会话重放、任何新增 CLI 行为、产品检查、浏览器验收、模板更新冲突处理、外部 CI。状态算法和负向样例都是待实施契约，不能报告为已通过。证据语义真实性、场景拆分是否充分、直接原生归档绕过仍是明确的人机边界。

主会话两分钟下一步：确认采用 Python 单文件包装器及 `0/1/2/3` 汇总语义，把“2 新文件 + 4 接入文件”和三条历史反例抄入第一个子任务的 PRD；无需先创建任何审批或模板系统。
