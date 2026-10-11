# 验收门禁正式只读审查

结论：发现 **1 个 P2 问题，尚未修复**。Standards 与 Spec 两条审查均已完成；本次只写本报告及 `.tmp/acceptance-result-gate/review-*` 证据，没有修改受审文件、真实任务 `acceptance.json`、提交或归档。现有验收记录的 `partial` 来自待合并的 `formal-review:unrun`，属于预期状态，不作为缺陷。

## 范围与冻结版本

基线 HEAD：`24f0b80ab115752b6b3797ab21277a96f2df2748`。已检查暂存区（空）、工作区四个接线文件的完整 diff，以及两个未跟踪新脚本的完整实现与测试。六个受审文件在审查前后 SHA-256 一致；见 [审查前快照](../../../../.tmp/acceptance-result-gate/review-freeze-before.json)、[审查后快照](../../../../.tmp/acceptance-result-gate/review-freeze-after.json)。

| 文件 | 实际审查范围 | SHA-256 |
| --- | --- | --- |
| `scripts/acceptance.py` | 1–401，全部实现 | `a130170b561c490d7d3979594f789326245c88186a7adc9c3038185d1e19471f` |
| `scripts/test_acceptance.py` | 1–557，全部测试 | `20b5208446adbe8e9ab083278bf86151b997036fbea406e6e4b6f52e2b3cec1f` |
| `.trellis/spec/frontend/quality-guidelines.md` | 1–258，既有约束与新增协议 | `5834634f55e34b6db6507828778bef82601353fafea07fc748803e7bbcd916f5` |
| `.pi/agents/trellis-check.md` | 1–77，角色及结果交付契约 | `9643c755e36bfe7f3b321d0b398037da7981542986cdfb9c6b5c0bfcb7860b52` |
| `.trellis/workflow.md` | 完整 diff；规划、两类活动块、最终检查、提交前检查及相邻流程 | `9fca392bcacb326238f2599d62ce06853976ac4caa030915a2b727b92891392a` |
| `.pi/prompts/trellis-finish-work.md` | 完整文件及 diff | `5fc5059fdf881db942f8b3f3dae8932d88e847cc15f7669bc5891238fb7c2990` |

已依次加载 `check.jsonl` 的四份资料和本任务 `prd.md`、`design.md`、`implement.md`。最终设计优先于父任务研究中的备选：`summarize` 豁免返回 3，`archive` 豁免归档成功返回 0。另读实际验收记录、36 项测试日志、接线检查脚本和日志；定点核对 `.trellis/scripts/common/task_store.py:1268` 接受绝对任务目录的既有契约。包发现返回单仓库、唯一 frontend 规范层。

审查前已存在的 `scripts/__pycache__/` 和其他未跟踪任务目录保持原样，未将其计入本次改动。

## R1 · P2：直接子进程先退出时，中断清理会留下同组孙进程

**位置：** `scripts/acceptance.py:330–334`，相关承诺 `.trellis/spec/frontend/quality-guidelines.md:204–207`；测试缺口 `scripts/test_acceptance.py:418–455`、`scripts/test_acceptance.py:458–489`。

关键逻辑：

```python
try:
    child.wait(timeout=3)
except subprocess.TimeoutExpired:
    os.killpg(child.pid, signal.SIGKILL)
    child.wait()
```

运行器先向进程组发送中断信号，但只有直接子进程在 3 秒内不退出时才升级 SIGKILL。若直接子进程退出，而同组孙进程忽略信号或继续清理，`child.wait()` 已成功返回，后续没有检查或终止仍存活的组成员。文档却声明 SIGINT/SIGTERM 会 “stops/reaps its command group”，只把孤儿进程限制列在 hard kill 情形。

**实际复现：** [独立探针](../../../../.tmp/acceptance-result-gate/review-process-group.py) 创建父进程和同组孙进程：父进程收到 SIGTERM 后退出 0，孙进程忽略 SIGTERM 并更新心跳。对运行器发送 SIGTERM 后，运行器返回 **143**，保存 **observed=partial / exitCode=0**；它退出后的 0.2 秒内，孙进程心跳从 **0 增至 4**。探针返回 **1**。完整实际结果见 [review-process-group-result.json](../../../../.tmp/acceptance-result-gate/review-process-group-result.json)。

**后果：** 命令经包管理器、shell 或测试工具启动子进程时，中断后仍可能继续运行、写日志或占用资源，影响下一次检查。旧 passed 已正确失效，不存在本探针证明了“中断伪通过”的情况；问题是进程组清理和文档承诺不一致。

**建议下一轮修复：** 分别处理直接子进程的原始返回码与进程组存活状态；即使直接子进程先退出，也在有限等待后终止剩余组成员。保留原 exitCode 和 partial。新增“父退出 0、孙进程忽略信号”的回归，断言运行器退出后无工作进程继续活动。不要只把直接子进程退出当作整组退出。

**清理：** 两次探针的 finally 均向自己创建的组发送 SIGKILL；孙进程 PID 39093、40191 的后续 `ps` 均返回 1、输出为空，已确认退出。没有启动浏览器或服务。

## Standards 与 Spec 结论

Standards：使用 Python 标准库、argv 数组及 `shell=False`；项目逻辑集中在脚本，四处流程只接线；单写 acceptance、证据放 `.tmp/`、不改核心和模板 hash、文档任务不跑产品检查等边界均符合。R1 违反新增协议的进程组清理承诺和资源清理要求。没有发现其他需修复的 Standards 问题。

Spec：逐条检查以下范围，未用检查代理进程成功替代 AC 通过。

| AC | 核实结果及证据边界 |
| --- | --- |
| AC1 | `scripts/acceptance.py:178–179` 拒绝非零退出码的 passed；36 项测试含真实 exit=2、AC4 partial、ZIP structure/content 拆分。未发现问题。 |
| AC2 | `scripts/acceptance.py:195–201` 校验 waiver，`scripts/acceptance.py:220–255` 分别聚合 observed/status，保留其他未豁免失败。未发现问题；授权真实性按约定由主会话核实。 |
| AC3 | 核对 AC 节、fence/续行、唯一标识、完整覆盖、文本归一化、字段与退出码严格类型、未知字段和重复 JSON key 的实现及负向测试。未发现问题。 |
| AC4 | 实际返回码与日志、重跑清旧结果/waiver、SIGINT/SIGTERM/SIGKILL 后非通过的原有测试有证据；本轮探针也确认 partial 保留。R1 补充暴露命令组清理缺口。 |
| AC5 | 拒绝状态在委托前返回；mock 测试断言零调用及任务/指针文件快照不变；passed/waived 只委托一次且成功返回 0，失败返回 4 并保留原码/输出。未发现问题；没有执行真实归档。 |
| AC6 | 四处接线、两个活动块、规划/最终检查/提交前/归档入口和旧任务补齐一致；POSIX 限制、原生归档绕过及证据语义限制已披露。文档的命令组清理承诺受 R1 影响。 |

正式审查期间没有修复；主会话应核实 R1 后进入下一轮修改与定向回归。

## 已核验、已执行与未执行

- **核验既有结果，未重复运行：** `.tmp/acceptance-result-gate/unittest-final.log` 为 `Ran 36 tests in 0.557s / OK`；实际 acceptance 执行记录为 exit 0。完整读取测试，确认包含真实 CLI、真实信号和 mock 归档，区分其证据能力。
- **核验既有结果，未重复运行：** `.tmp/acceptance-result-gate/wiring.log` 为四处接线、14 个本地链接/锚点、活动块及阶段入口、Python syntax/help、diff whitespace、保护路径未改的静态检查通过；已读实际 `check-wiring.py`，其结果不等价于真实归档或模板更新验证。
- **本轮实际执行：** 测试前短通知；`python3 .tmp/acceptance-result-gate/review-process-group.py` 两次均 exit 1，发现 R1。第二次仅因探针改为每次创建独立夹具目录而复验，完整命令记录见 [review-process-group-execution.json](../../../../.tmp/acceptance-result-gate/review-process-group-execution.json) 和 [日志](../../../../.tmp/acceptance-result-gate/review-process-group.log)；首次观察另存 [review-process-group-first-result.json](../../../../.tmp/acceptance-result-gate/review-process-group-first-result.json)。两次探针资源均已清理；执行一次真实任务 summarize，退出 1；审查前后六文件哈希一致。
- **未运行：** 全套 36 项重跑、产品 lint/type-check/build、EH/NH/浏览器、真实 task archive、Trellis update、Linux/Windows 实机测试。项目范围无产品变更，原生归档及模板更新明确不在本轮验收范围。Windows 不在文档声明的 POSIX 运行支持内。

## 待主会话合并的检查项

真实验收记录：[acceptance.json](../acceptance.json)，路径 `.trellis/tasks/10-11-acceptance-result-gate/acceptance.json`。仅主会话可修改。

建议条目保存于 [review-proposed-checks.json](../../../../.tmp/acceptance-result-gate/review-proposed-checks.json)：替换 `formal-review` 为 failed，保留已完成审查事实及 R1；新增 `interrupt-command-group` 的 command failed，记录已执行探针、真实执行记录与不满足内容。两项 waiver 均为 null；没有授权可豁免此问题。原来两个 passed 仅在其既有 scope 内保留，不能抵消新失败。本报告不代算合并后的总状态。

## 当前已保存记录的 summarize 原始结果

命令：`python3 scripts/acceptance.py summarize .trellis/tasks/10-11-acceptance-result-gate`

退出码：**1**；stderr 为空。当前 saved record 为 **valid=true / status=partial / observedStatus=partial / passed=2 / unrun=1**，这是审查结果尚未合并时的记录。其 partial 本身不是实现缺陷；新增失败和正式审查条目仍待主会话合并。

完整原始 stdout 以独立 JSON 文件交付：[review-summary.json](../../../../.tmp/acceptance-result-gate/review-summary.json)；命令与退出码见 [review-summary-command.json](../../../../.tmp/acceptance-result-gate/review-summary-command.json)。该文件直接保存 subprocess 的 stdout，没有重新序列化或手写替换。

两分钟下一步：主会话查看 R1 的实际探针结果，合并待交付检查项，再安排进程组清理修复与定向回归。
