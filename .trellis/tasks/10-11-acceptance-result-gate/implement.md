# 验收门禁执行计划

2026-10-11 执行结果：实现及 R1 修复完成，37 项回归通过，正式复审无剩余问题。详见 [修复记录](research/fix-r1.md)、[复审](research/review-r1.md) 和 acceptance.json；以下保留已批准的执行顺序，提交与归档尚未进行。

## 前置与范围

等待本轮最终规划审阅，随后 start 本子任务。无02依赖。只修改 design.md 的2个新脚本和4个接线文件，任务自己的 acceptance.json 为交付证据；实现前读取 trellis-before-dev、writing-for-agents、trellis-meta 的相关入口。研究已核实核心边界，不改Trellis核心。

## 开发顺序

1. 定义读取/校验/聚合与标准库测试，固定三条历史反例、完整覆盖、严格退出码类型、waiver保留实际结果。
2. 实现run的真实返回码/日志/中断状态，使用隔离的最小命令作为测试，不运行产品检查。
3. 实现archive窄委托，用unittest mock替换进程调用验证拒绝时无调用与无文件/指针修改，正向只委托一次、失败如实返回。不在测试里归档真实任务。
4. 修改四处接线与质量文档；更新唯一协议来源，检查workflow活动块和步骤详情一致，不扩写AGENTS。
5. 建本任务验收清单，先按自己的测试实际结果填写；不能因脚本进程成功即覆盖全部AC。

## 必要验证

测试开始前短通知。未来命令：

```bash
python3 -m unittest discover -s scripts -p 'test_acceptance.py'
python3 scripts/acceptance.py summarize .trellis/tasks/10-11-acceptance-result-gate
```

运行器的测试临时目录放 .tmp/，每个测试自有隔离目录。覆盖：

- EXIT=2 + passed 拒绝，failed保留退出码；AC4 partial；ZIP结构/内容分拆。
- 全绿、单豁免、混合豁免+未豁免失败；无依据豁免拒绝。
- 漏/重复/未知AC，空清单，PRD文本变动、重复节、fence内伪定义与错误类型。
- 通过项无证据/日志不可读，命令启动失败、中断/重跑后旧passed失效。
- summarize的0/1/2/3与JSON一致；archive拒绝不调用，passed/waived成功返回0并区别status，原命令失败返回4、保留原码、只调用一次。
- 以CLI子进程执行一条有意失败的检查，确认原码被保存，不只单测聚合函数。
- 文档引用/命令一致，四处接线无原无条件归档路径；不实际执行archive。

## 审查与完成

开发测试完成后冻结脚本、测试、规范和任务产物，派 trellis-check 做只读Standards/Spec核查（派发显式禁止直接修）；主会话核对反馈，修复留下一轮，重新验证受影响项。检查暂存与工作区。更新实际证据，确认02可引用稳定命令。

本任务只验项目CLI与流程，不启动浏览器、不跑无关产品构建。新增脚本未被package调用前用上面独立命令验证。提交按现有流程，归档前本次文件应已跟踪，已知原生未跟踪路径归档问题不在此修。保留证据，清理自有临时资源。
