# 验收逐项结果与收口门禁

## 目标与价值

落实复盘第 01 项，使子项未通过、部分验证或只验证结构的事实在 AC 汇总和任务收口时仍被保留，避免“进程成功”被解释为“全部验收通过”。

## 背景

[父报告](../10-11-project-session-retrospective/research/report.md) 的三条已确认反例：S26 L608 类型检查 EXIT=2、S70 L879/L894 的 AC4 partial 与全部通过矛盾、S27 L288 的 ZIP 结构通过但无图片。[研究](../10-11-project-session-retrospective/research/acceptance-gate-design.md) 核实 task.py validate 只校验上下文，finish 清指针，after_* 失败不阻断。

## 需求

- 复用 PRD 接受标准，逐项记录声明、范围、取证方式、实际结果与证据。机器计算 AC/总结果，不允许手写总状态覆盖。
- 保留 passed / failed / partial / blocked / unrun；豁免必须有依据，输出 waived 并保留原观察结果与退出码。
- 命令记录来自实际子进程返回码；非零、没运行、部分运行不得 passed。通过项必须关联可读取的证据。
- 漏 AC、重复/未知标识、输入矛盾要明确报错；结构验证与内容验证、静态推导与实际运行分别陈述。
- 接入项目现有检查、提交前检查及 finish-work；标准收口在验收不满足时不得调用归档。不会改变 task.py finish 的暂停语义。
- 新任务在规划时接入；尚未收口的旧任务需补齐原有 AC 与真实结果；不重写历史归档或凭历史勾选造通过。
- 本任务可独立于存储回归实施，完成后供第二子任务集成。

## 接受标准

- [AC1] EXIT=2 + passed 被拒绝；实际 failed 保留退出码。AC4 partial 以及 ZIP structure passed/content blocked 均不能输出全部通过。
- [AC2] 合法全 passed 得到 passed；有效豁免得到 waived 并保留原观察、理由及出处；未豁免失败不能被其他条目通过或豁免抵消。
- [AC3] 清单完整对应 PRD 标准；缺项、重复、未知 AC、空清单、变更后文本不一致、错误字段类型均非零报错。
- [AC4] 运行命令直接记录原返回码与日志；重跑/中断不会留下旧 passed；通过项的执行记录和证据符合协议。
- [AC5] 标准归档路径在 failed/partial/blocked/unrun 或无效输入下不委托归档、无任务移动/指针副作用；passed/waived 才委托，归档自身失败如实传播。
- [AC6] check、workflow、finish-work 的接线一致；旧任务不默认通过；标准库回归可独立运行，文档说明真实限制、状态及操作方法。

## 不在范围

产品代码、浏览器自动化、CI 配置（由02负责）、Trellis 核心/全局包/模板 hash 修改；通用证据签名或审批系统；拦截所有手工原生归档；修复原生归档已知 bug；正式审查职责的全面改造。

## 当前状态

需求与技术方案已收敛，待审阅。实现及本任务功能测试尚未执行。文件和命令设计见 [design.md](design.md)，执行与验证见 [implement.md](implement.md)。
