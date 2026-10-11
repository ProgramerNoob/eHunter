# 验收门禁实现交付

实现日期：2026-10-11。实现与自测已完成，正式 Standards/Spec 审查待主会话派发。此记录不替代 acceptance.json 的机器汇总；acceptance.json 按委派由主会话单写，本子代理未创建或修改它，也未提交、归档、切换任务。

## 文件与行为

- `scripts/acceptance.py`：Python 标准库 CLI，提供 run/summarize/archive。严格校验唯一 PRD AC 节、原文、完整映射、重复键/标识、字段类型、执行码与证据；同一聚合算法生成逐 AC/总结果、原观察/有效状态、六类计数和豁免明细。
- `scripts/test_acceptance.py`：36 个 unittest 测试方法，含参数化子场景、真实 CLI 子进程、POSIX 信号与隔离归档 mock。测试夹具在 `.tmp/acceptance-result-gate/case-*` 创建并自动清理。
- `.trellis/spec/frontend/quality-guidelines.md`：协议唯一文档来源，包含字段、例子、退出码、旧任务补齐、单写者、证据/豁免真实性边界、POSIX/硬终止限制与模板更新边界。
- `.pi/agents/trellis-check.md`：要求返回建议条目、清单路径、原始 summarize JSON 和退出码；由主会话合并结果。
- `.trellis/workflow.md`：规划时创建 unrun 清单，两个 in_progress 活动提示接线，最终检查与提交前重新 summarize，命令速查改为包装器。
- `.pi/prompts/trellis-finish-work.md`：当前任务和额外任务分别走包装器，移除无条件归档；明确拒绝、成功和原生失败处理。

run 在日志准备/启动之前原子保存 unrun，清除旧 execution/evidence/waiver；实际 stdout/stderr 写入日志。正常返回码直接保存，启动失败为 blocked/null/exit127。SIGINT/SIGTERM 中断会停止并回收独立命令组，保留原返回码但记 partial；即使子进程处理中断后返回 0，也不能升级通过。SIGKILL 后保留 unrun，不能保证自动回收孤儿进程，规范明确要求检查清理。测试中的此类子进程均已清理。

archive 先重新读取并聚合；非通过/无效输入不委托且无任务或指针副作用。passed/waived 都只委托一次原 task.py，成功统一 exit0，以 acceptanceStatus 区分；失败 exit4 并保留原码/输出。没有修改或调用真实归档，没有修改 task.py finish 的暂停语义。

## 实际验证

| 实际命令 | 退出码 | 结果与证据 |
| --- | --- | --- |
| `python3 -m unittest discover -s scripts -p 'test_acceptance.py' -v` | 0 | 最终 36 tests，0 failures/errors，耗时 0.557s；`.tmp/acceptance-result-gate/unittest-final.log` |
| `python3 .tmp/acceptance-result-gate/check-wiring.py` | 0 | 四处文档、14 个本地链接/相关锚点、两个活动提示、规划/最终检查/提交前/归档接线、Python 语法和 CLI help、diff 空白及受保护路径检查；`.tmp/acceptance-result-gate/wiring.log` |
| `python3 scripts/acceptance.py summarize .trellis/tasks/10-11-acceptance-result-gate` | 2 | `valid:false`，明确提示 acceptance.json 缺失及旧任务补齐要求；`.tmp/acceptance-result-gate/task-summary.json` 与 `task-summary.stderr.log` |

测试过程的 argv、cwd、直接捕获的 exitCode、startedAt/endedAt、日志路径保存于 `unittest-final-result.json`、`wiring-result.json`；实际任务 summarize 的返回码保存于 `task-summary-result.json`，均在 `.tmp/acceptance-result-gate/`。

首轮 35 tests 已通过；实现自检随后发现日志路径 `.` 会触发未处理索引错误，已改为安全切片并加入负向场景。同时补充子进程处理中断后 exit0 仍为 partial 的测试，形成最终 36 tests。首轮 `git diff --check` 发现质量文档末尾多余空行，已修复；最终文档检查内的 diff 检查通过。没有通过削弱期望解决测试失败。

重要用例实际覆盖：

- EXIT=2 + passed（包括附 waiver）输入错误；failed + EXIT=2 保留原码。真实 CLI 故意 exit2，同时验证 stdout/stderr 日志与保存 JSON，后续 summarize exit1。
- 八项 AC 中 AC4 partial 保持 partial；ZIP structure passed/content blocked 聚合 blocked。
- 全 passed、waived 保留原 failed/exit2/reason/authority、waived 与未豁免 failed/blocked/partial/unrun 混合；完整六类计数。
- 漏/未知/重复 AC，重复 check/JSON key，空清单、原文漂移、重复/空 PRD 节、fence 内伪定义、续行与错误类型；null/true/false/字符串/浮点退出码不能冒充 passed 的整数 0。
- 缺失或不可读证据/日志、未链接命令日志、runtime 无 note、运行时附带非零退出码矛盾。
- 子进程在启动后读取磁盘，确认旧 passed/waiver 已失效；启动失败、日志准备失败、无 argv/未知 check/非 command 拒绝；显式 argv 与 shell=False，不执行历史命令。
- 真实 SIGINT/SIGTERM/SIGKILL 和子进程自身信号终止，原码/失效状态保留；子进程处理中断后 exit0 仍 partial。
- summarize 的 0/1/2/3 均通过真实 CLI 验证 stdout 单一 JSON。归档拒绝零委托并逐文件比较任务/指针内容；passed/waived 成功 exit0 单委托；原生 1/2/-15 失败统一 exit4、保留输出且不重试；启动失败 exit4/null。

## 建议主会话合并的验收项

这些是基于实际执行的建议，不是手写任务总状态，也没有豁免。主会话核对后写 acceptance.json。

| 建议 check id | AC | method / dimension | claim 与范围 | 原观察 / 证据 |
| --- | --- | --- | --- | --- |
| `acceptance-cli-regression` | AC1、AC2、AC3、AC4、AC5、AC6 | command / behavior | Python 标准库隔离回归验证状态/协议/运行器/委托边界；归档为 mock，CLI 和信号为真实子进程 | passed；execution 直接取 `unittest-final-result.json`，evidence 使用 `.tmp/acceptance-result-gate/unittest-final.log` |
| `acceptance-flow-wiring` | AC6 | command / structure | 四处接线、引用和命令可用性静态检查；不声称已运行真实代理工作流、Trellis 更新或归档 | passed；execution 直接取 `wiring-result.json`，evidence 使用 `.tmp/acceptance-result-gate/wiring.log` |

正式审查仍需核对场景覆盖、证据与契约语义。当前任务 acceptance.json 尚未存在，机器总结果是输入错误；主会话合并记录后才可重新 summarize。本次未为缺失的主会话记录造 passed 或 waiver。

## 已验证边界与限制

本轮验证项目 CLI 和流程接线；没有运行产品 lint/type-check/build/browser、EH/NH、CI、真实任务归档、原生归档 bug 回归或 Trellis 模板更新。新增 Python 脚本没有独立配置的 lint/type-check 工具，已做语法编译检查和标准库回归。原生归档绝对路径支持已定点核实 `.trellis/scripts/common/task_store.py` 的 cmd_archive，未导入私有模块。

证据可读不等于语义正确；authority 非空不等于真实授权；命令 exit0 仅证明其所声明的断言；跨场景覆盖和豁免依据仍需主会话/审查核对。直接原生 archive 可绕过标准门禁，原生归档失败可能已移动目录。本实现不宣称全局锁、证据签名或自动依赖失效系统。

没有创建浏览器或后台服务。仅保留自测日志、命令记录、一次性接线检查脚本和冻结哈希供复核；本次 unittest 夹具目录及创建的脚本字节码已清理。工作区只改动上述六个实现文件和此交付记录；暂存区未写入。父任务与第二子任务目录为会话开始时已有未跟踪资料，未触碰。

两分钟下一步：主会话打开 `unittest-final-result.json` 和 `wiring-result.json`，核实并合并两条建议检查记录，再运行 summarize；之后按计划派发只读 Standards/Spec 审查。
