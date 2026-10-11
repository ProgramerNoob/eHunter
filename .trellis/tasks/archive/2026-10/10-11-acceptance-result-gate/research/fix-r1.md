# R1 修复：直接子进程退出后的命令组清理

R1 的代码修复与本轮自检已完成，待主会话定向复审。最终完整 Python 测试 **37 项通过**，未经修改的原独立探针 **exit 0**；真实任务的 `acceptance.json` 保持原样，正式审查结论未由实现代理升级为通过。未派发子代理、提交或归档。

## 改动与原因

- `scripts/acceptance.py:322`、`scripts/acceptance.py:330`：保留原来的 `child.wait(timeout=3)`，将进程组 SIGKILL 移到等待之后，无论直接子进程提前退出还是等待超时都执行；组已消失时接受 `ProcessLookupError`，最后等待直接子进程并保存其原始 `returncode`。父进程退出 0 仍记录 `partial`，运行器保持 `128 + signal`。
- `scripts/test_acceptance.py:491`：新增 `test_interrupt_stops_grandchild_after_child_exits_zero`，以 SIGINT、SIGTERM 两个子场景启动真实运行器、父进程和同组孙进程。父进程收到信号退出 0，孙进程忽略信号并写心跳；断言记录保持 partial、原退出码为 0、汇总不通过，运行器退出后 0.2 秒内心跳不再增长，工作进程已停止。检查发生在测试 finally 兜底清理之前。
- `.trellis/spec/frontend/quality-guidelines.md:205`：说明直接子进程最多等待 3 秒，提前退出也清理剩余组成员；只回收直接子进程，离开该进程组的后代不在清理范围内。不再声称回收整个进程组。

完整本轮增量见 [fix-r1.diff](../../../../../../.tmp/acceptance-result-gate/fix-r1/fix-r1.diff)。其余三处流程文件、原探针、原失败结果及真实验收清单的前后哈希一致，暂存区保持空；检查记录见 [scope-and-cleanup.json](../../../../../../.tmp/acceptance-result-gate/fix-r1/scope-and-cleanup.json)。未改产品、Trellis 核心或模板 hash。

## 实际验证

测试前执行短通知。命令由 `subprocess.run` 实际执行，`argv/cwd/startedAt/endedAt/exitCode/log` 直接落盘于 [result.json](../../../../../../.tmp/acceptance-result-gate/fix-r1/result.json)，其中也保存最终三个变更文件的 SHA-256。

| 命令 | 实际结果 | 证据与范围 |
| --- | --- | --- |
| `python3 -m unittest discover -s scripts -p test_acceptance.py -v` | exit 0，`Ran 37 tests in 1.175s / OK` | [完整测试日志](../../../../../../.tmp/acceptance-result-gate/fix-r1/unittest-final.log)；含真实 CLI、信号、R1 两种信号回归及 mock 归档 |
| `python3 .tmp/acceptance-result-gate/review-process-group.py` | exit 0 | [探针日志](../../../../../../.tmp/acceptance-result-gate/fix-r1/original-probe-final.log)、[结构化观察](../../../../../../.tmp/acceptance-result-gate/fix-r1/probe-final-result.json)；原探针文件未修改 |
| `python3 .tmp/acceptance-result-gate/check-wiring.py` | exit 0 | [接线日志](../../../../../../.tmp/acceptance-result-gate/fix-r1/wiring-final.log)；4 份文档、14 个本地链接/锚点、活动块及规划/最终检查/提交前/归档接线、Python syntax/help、diff whitespace 和保护路径 |

原探针本次观察：运行器 **exit 143**，内部检查 **observed=partial / exitCode=0**；运行器退出后 0.2 秒，心跳 **0 → 0**，`descendantStillRunning=false`。这是中断清理断言通过，内部被中断检查仍未完成，不能将它改写成 passed。

### 保留失败事实

新增回归先在旧实现上执行，真实 exit 1，SIGINT 下心跳大小 **10 → 50**、SIGTERM 下 **5 → 40**；两项均报 `grandchild still working after runner exit`。见 [回归红灯记录](../../../../../../.tmp/acceptance-result-gate/fix-r1/regression-red-result.json) 和 [日志](../../../../../../.tmp/acceptance-result-gate/fix-r1/regression-red.log)。

首次修复尝试加入 `killpg(..., 0)` 轮询；其完整测试在既有 SIGTERM 用例出现 `[Errno 1] Operation not permitted`，运行器 exit 2，未计为通过。独立小型系统探针未再次复现该瞬时错误，不能宣称已确定其系统根因。最终实现去掉了这段新增轮询，直接复用既有等待并始终执行组清理；最终版本才得到上表结果。首次测试及代码哈希见 [attempt-1-result.json](../../../../../../.tmp/acceptance-result-gate/fix-r1/attempt-1-result.json)，小型观察见 [macos-group-probe.json](../../../../../../.tmp/acceptance-result-gate/fix-r1/macos-group-probe.json)。

正式审查时的失败结果、执行记录和日志另存为 `.tmp/acceptance-result-gate/fix-r1/pre-r1-review-process-group-result.json`、`pre-r1-review-process-group-execution.json`、`pre-r1-review-process-group.log`。原探针会写固定结果路径，本轮每次执行后将新观察复制到独立文件，再恢复原失败结果；真实验收清单仍引用的原文件内容不变。

## 建议主会话合并的验收条目

[proposed-checks.json](../../../../../../.tmp/acceptance-result-gate/fix-r1/proposed-checks.json) 提供三个完整检查条目，执行字段来自最终实际记录，可按 ID 合并：

| 检查 ID | 建议结果与范围 |
| --- | --- |
| `acceptance-cli-regression` | passed；更新为本轮 37 项测试及新增真实进程组回归，替换旧 36 项执行记录 |
| `interrupt-command-group` | passed；采用本轮原探针的 exit 0、心跳停止证据，保留原失败历史；内部被中断命令仍为 partial/exitCode 0 |
| `acceptance-flow-wiring` | passed；采用最终精确文档措辞后的静态接线检查，仍不表示真实归档或模板更新已验证 |

所有建议项 `waiver=null`。`formal-review` 不在替换建议内：实现代理仅修复 R1，正式复审需由主会话安排并核实后更新。不得因三条命令 exit 0 直接将全任务汇总写成 passed；合并后仍由 `summarize` 计算。

## 资源与边界

- 原独立探针最后一次的父进程 PID **43234**、孙进程 PID **43235** 均由该轮夹具管理；探针清理检查孙进程 `ps` exit 1、输出为空。最终进程检查无本轮夹具工作进程。
- 单元测试自有 `TemporaryDirectory` 已自动清理。两轮独立探针的唯一夹具目录保留作为执行证据，其中包含命令日志与实际保存的检查记录；不是运行中的服务。原有 `.tmp/` 资料和 `scripts/__pycache__/` 保持原样。
- 未启动浏览器、开发服务器或端口监听；未运行产品 lint/type-check/build、EH/NH、真实归档、Trellis update、Linux/Windows 实机检查。
- POSIX 命令组内清理是本轮验证范围；脱离组的后代、SIGKILL 直接杀死运行器时的孤儿清理由既有边界说明。本实现不能回收非直接子进程；测试允许已终止、等待其新父进程回收的 zombie，不允许其继续工作。

两分钟下一步：主会话查看本轮增量与 `result.json`，安排 R1 定向只读复审；核实后按建议条目合并并重新汇总，保留未通过的正式审查状态直到复审完成。
