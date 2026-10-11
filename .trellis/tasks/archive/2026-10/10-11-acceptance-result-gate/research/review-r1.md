# R1 正式只读增量复审

结论：**R1 关闭；未发现剩余 Standards 或 Spec 问题。** 上一轮对六个实现/接线文件的完整 Standards/Spec 审查范围继续有效，本轮核对三个实际变化及相关证据。建议主会话将 `formal-review` 更新为 `passed`；当前保存的任务验收仍是 **failed / exit 1**，修后记录尚待主会话合并，不能据本复审直接宣告任务验收通过。

## 范围、基线与冻结

基线 HEAD：`24f0b80ab115752b6b3797ab21277a96f2df2748`。继承 [上一轮正式审查](review.md) 的完整覆盖；已读 [修复说明](fix-r1.md)、[最终执行记录](../../../../.tmp/acceptance-result-gate/fix-r1/result.json)，检查暂存区（空）及工作区四个接线文件 diff。新增脚本仍未跟踪，通过修复前副本与上轮冻结哈希逐字核对增量，不以 Git diff 遗漏未跟踪文件。

本轮依次读取 `check.jsonl` 四份资料、PRD、design、implement；最终任务设计优先于父研究的备选退出码。实际复审 `scripts/acceptance.py:288–348` 的完整运行/中断路径、`scripts/test_acceptance.py:417–556` 的既有及新增信号用例、`.trellis/spec/frontend/quality-guidelines.md:90–262` 的协议，连同三个文件的完整增量。其余内容复用上轮覆盖，通过冻结哈希与精确差异验证其未变；没有声称本轮重新通读或重跑无变化的全套。

| 受审文件 | 当前 SHA-256 | 相对上轮 |
| --- | --- | --- |
| `scripts/acceptance.py` | `085456767ce1da7f3ebd147c5d9bc86924556f9584e56108f9d2420ad6800c2d` | 仅 R1 中断清理分支及注释 |
| `scripts/test_acceptance.py` | `976363ccf035ea930e2fc16b857822cbefb06d0ba742f80df5a1614fe8b26e2d` | 仅新增一个回归方法；旧 36 项及辅助函数不变 |
| `.trellis/spec/frontend/quality-guidelines.md` | `84a11b9f73f91f1f89f49297b3aa0bb3fb060d9ea80e73c46fee01204108b555` | 仅中断清理的准确范围说明 |
| `.pi/agents/trellis-check.md` | `9643c755e36bfe7f3b321d0b398037da7981542986cdfb9c6b5c0bfcb7860b52` | 未变 |
| `.trellis/workflow.md` | `9fca392bcacb326238f2599d62ce06853976ac4caa030915a2b727b92891392a` | 未变 |
| `.pi/prompts/trellis-finish-work.md` | `5fc5059fdf881db942f8b3f3dae8932d88e847cc15f7669bc5891238fb7c2990` | 未变 |

[冻结前快照](../../../../.tmp/acceptance-result-gate/review-r1/freeze-before.json) 与 [冻结后快照](../../../../.tmp/acceptance-result-gate/review-r1/freeze-after.json) 覆盖以上六文件、任务原有资料与 acceptance、原探针/失败结果/执行记录/日志、最终修复执行记录及核心入口/hash，共 **23 个文件**；前后均未变。HEAD、暂存区及原工作区 diff 也未变。本轮只新增本报告和 `.tmp/acceptance-result-gate/review-r1/` 证据，不修改受审文件、acceptance、旧失败历史，不提交归档。

## R1 关闭依据与未削弱断言核对

- `scripts/acceptance.py:330–340`：`child.wait(timeout=3)` 后始终尝试 `os.killpg(child.pid, signal.SIGKILL)`，`ProcessLookupError` 表示组已消失；直接子进程提前退出不再跳过剩余组清理。随后保存 `child.returncode`。`scripts/acceptance.py:341–342` 仍记录 `observed="partial"` 并返回 `128 + signum`，不会将处理信号后返回 0 的子进程升级为通过。
- `scripts/test_acceptance.py:492–556`：新回归分别使用 SIGINT/SIGTERM；确认孙进程与父进程同组；父收到信号退出 0、孙忽略信号并写心跳。验证运行器返回码、原 `exitCode=0`、`partial`、落盘一致及 summarize exit 1；随后检查 0.2 秒无心跳增长、孙进程已停止、直接子进程已回收。所有关键断言均在 finally 清理之前；允许已停止的孤儿 zombie，未将继续运行视为通过。
- `.trellis/spec/frontend/quality-guidelines.md:205–210`：准确区分向同组成员发信号、直接子进程最多等待 3 秒、清理残留组成员，以及只回收直接子进程；主动离组的后代不在此范围。与实际实现一致。
- [独立证据审计](../../../../.tmp/acceptance-result-gate/review-r1/evidence-audit.json) 验证修复前副本等于上轮冻结版，重新生成的 [实际增量](../../../../.tmp/acceptance-result-gate/review-r1/verified-delta.diff) 与实现者交付 diff 完全相同。全部既有测试函数 AST 不变，仅增加新回归；运行器其他函数不变。不是改输入/期望以回避原失败。

## 已核验的真实执行结果

以下均读取既有真实命令记录、日志及对应版本核验，本轮未重复运行：

| 范围 | 实际观察及证据 |
| --- | --- |
| 最终完整回归 | [37 项日志](../../../../.tmp/acceptance-result-gate/fix-r1/unittest-final.log) 为 `Ran 37 tests in 1.175s / OK`，每个当前测试方法恰有一条 `ok`，执行 exit 0；[result.json](../../../../.tmp/acceptance-result-gate/fix-r1/result.json) 的三个 sourceHashes 全部匹配当前冻结文件。包含真实 CLI、信号、R1 双信号回归以及 mock 归档。 |
| 原探针修后 | [原探针](../../../../.tmp/acceptance-result-gate/review-process-group.py) 哈希与修复前相同；[日志](../../../../.tmp/acceptance-result-gate/fix-r1/original-probe-final.log) 与 [结构化结果](../../../../.tmp/acceptance-result-gate/fix-r1/probe-final-result.json) 一致，探针 exit 0。其实际夹具中的运行器副本等于当前源码，保存的 acceptance 检查与结果一致、执行日志可读。 |
| 中断的原始事实 | 同一探针内运行器返回 **143**，内部检查仍为 **partial / exitCode=0**；退出后 0.2 秒心跳 **0 → 0**，`descendantStillRunning=false`。外层清理断言通过与内部被中断检查未完成分别保留。 |
| 静态接线 | [最终接线日志](../../../../.tmp/acceptance-result-gate/fix-r1/wiring-final.log) exit 0；覆盖四处接线、14 个链接/锚点、活动块/阶段入口、Python syntax/help、空白与保护路径。其余三个流程文件与上轮相同，新增文案未改协议字段或退出码。 |

失败历史也核验并保留：原复审探针的 exit 1、心跳 **0 → 4** 仍在原路径，且与 `fix-r1/pre-r1-*` 副本逐字一致；[新增回归红灯日志](../../../../.tmp/acceptance-result-gate/fix-r1/regression-red.log) 保留 SIGINT **10 → 50**、SIGTERM **5 → 40** 两个失败；[首次修复尝试](../../../../.tmp/acceptance-result-gate/fix-r1/attempt-1-result.json) 完整测试 exit 1 未被最终通过覆盖。没有豁免，也没有将旧观察改写成通过。

## Standards / Spec 覆盖结论

Standards：标准库、显式 argv/shell=False、单写 acceptance、项目脚本与四处接线边界、`.tmp` 证据及清理要求继续满足。R1 修复没有增加依赖、改 Trellis 核心/模板 hash 或产品实现；新增回归有对应的原失败事实。**全部原审查范围继续有效，R1 已关闭，无剩余问题。**

| PRD AC | 本轮核实及原审查有效范围 |
| --- | --- |
| AC1 | 保留原退出码、拒绝 EXIT=2 + passed、AC4 partial/ZIP 内容阻断规则及原测试未变；37 项最终日志包含对应用例。 |
| AC2 | 聚合与 waiver 校验未变；原观察、依据及未豁免失败保留的原审查结论继续有效。 |
| AC3 | PRD/清单解析、完整性和严格字段校验未变；既有负向断言未改。 |
| AC4 | 原运行记录/重跑失效要求继续满足；R1 同组孙进程清理已修复，SIGINT/SIGTERM 回归与原探针提供实际证据，partial/原码保留。 |
| AC5 | archive 委托实现与 mock 用例未变；拒绝无副作用、正向单次委托、原生失败传播的原结论继续有效。没有实际归档。 |
| AC6 | 四处接线/旧任务策略未变；清理措辞修正且最终静态检查通过。标准库 37 项测试已有当前版本运行证据。 |

本轮实际执行证据审计（[执行记录](../../../../.tmp/acceptance-result-gate/review-r1/evidence-audit-command.json)，exit **0**），及下面的真实任务 summarize。测试/验证前已执行短通知。未运行产品 lint/type-check/build、浏览器/EH/NH、真实归档、Trellis update、Linux/Windows 实机检查；这些不在本次 R1 复审范围。未创建服务或工作进程夹具；已有探针的孙进程清理证据为 `ps` exit 1、空输出。已有 POSIX/主动离组及 hard kill 限制继续保留。

## 待主会话合并与当前保存状态

唯一真实验收记录为 [acceptance.json](../acceptance.json)，路径 `.trellis/tasks/10-11-acceptance-result-gate/acceptance.json`，本轮未写入。

- [本轮建议条目](../../../../.tmp/acceptance-result-gate/review-r1/proposed-checks.json)：以 `formal-review: passed` 更新正式审查结果，`method=inspection`、`execution=null`、`waiver=null`，关联本轮报告、冻结及核验证据。
- [实现轮建议条目](../../../../.tmp/acceptance-result-gate/fix-r1/proposed-checks.json)：`acceptance-cli-regression`、`interrupt-command-group`、`acceptance-flow-wiring` 的修后结果及实际 execution 已核实，可由主会话按 ID 合并。旧失败资料继续作为历史保留，不新增永远必需的旧失败项，不造 waiver。
- 本轮执行命令记录也已交付，主会话可引用于检查证据；子代理没有并发写真实验收 JSON。合并后须重新计算任务状态，不能手写总通过。

实际运行：

```bash
python3 scripts/acceptance.py summarize .trellis/tasks/10-11-acceptance-result-gate
```

**退出码 1，stderr 为空。** 原始 stdout 完整保存为 [summary.json](../../../../.tmp/acceptance-result-gate/review-r1/summary.json)，未重新序列化或人工覆盖；[命令与退出码](../../../../.tmp/acceptance-result-gate/review-r1/summary-command.json) 同时交付。该 JSON 描述当前已保存记录：`valid=true / status=failed / observedStatus=failed`，`passed=2 / failed=2`，其他四类计数为 0，`waivedChecks=[]`。其中仍是上一轮 `formal-review:failed` 和 `interrupt-command-group:failed`；pending 的上述四项尚未合并。因此当前标准收口仍被阻断，这是保留失败历史的预期状态，并非本轮发现的新实现缺陷。

两分钟下一步：主会话合并两份建议 JSON 的四个检查项，保留原失败证据，再运行 summarize，按真实 JSON 和退出码决定后续收口。
