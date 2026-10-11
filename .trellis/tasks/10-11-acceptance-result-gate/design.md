# 验收结果协议与接线设计

## 方案

采用 Python 标准库项目脚本 scripts/acceptance.py，与现有 Python 任务 CLI 共用运行时。新增 scripts/test_acceptance.py。取舍及现有实现定位见 [接线研究](../10-11-project-session-retrospective/research/acceptance-gate-design.md)；本设计覆盖研究的退出码建议。

仅修改四个接入文件：.trellis/spec/frontend/quality-guidelines.md 定义项目协议；.pi/agents/trellis-check.md 指向结果交付；.trellis/workflow.md 在规划/最终检查/提交前及活动提示中接线；.pi/prompts/trellis-finish-work.md 用包装器替换无条件归档。逻辑不放模板或 AGENTS；不修改 task.py/.template-hashes.json。

## 数据契约

一份任务 acceptance.json，schemaVersion=1：

- criteria：AC id 到 PRD 原文的映射。
- checks：非空数组；每条有唯一 id、ac（非空AC数组）、claim、scope、method、dimension、observed、execution、evidence、note、waiver。
- method 为 command/runtime/inspection；dimension 为 structure/content/behavior。
- observed 为 passed/failed/partial/blocked/unrun；waived 仅作为派生结果，不改写 observed。
- execution 为 null 或 argv/cwd/exitCode/startedAt/endedAt/log；command passed 必须有完整执行记录和严格整数0退出码。
- evidence 为仓库相对文件路径数组，通过项至少一项且文件存在；日志等临时产物限 .tmp/。runtime/inspection passed 另需 note 描述实际动作/观察；其余非通过状态写明未满足内容。
- waiver 为 null 或 reason/authority 两个非空字段。只允许豁免非 passed；出处须可定位既有用户决定或规范，由主会话核实真实性。新结果执行时旧 waiver 失效。

PRD 接受标准节使用本文件所属 prd.md 的 `- [AC1] ...` 格式。只解析唯一的“## 接受标准”或“## Acceptance Criteria”节，忽略 fenced code；顶层无标识条目、重复、空节报错。criteria 键集合和规范化空白后的原文须一致，checks 每个引用合法且全部 AC 至少有一项。所有列入的检查均必需，不设 required:false；不适用的检查不列入，但不删除 PRD 的标准。跨场景覆盖是否充分由现有审查判断，不尝试从自由文本自动推导浏览器场景。

输入不能带 overall 等手写汇总字段。非零 exitCode + passed、null/true/"0" 冒充整数退出码、空 checks 等都属输入错误。证据存在只证明可读取，不证明它的语义正确；无截图认证或全仓哈希系统。

## 聚合

分别聚合 observed 与应用 waiver 后的 status；每个 AC 与全任务采用同算法：
failed 优先，然后 blocked、partial；剩余有 unrun 时全 unrun 则 unrun，与 passed/waived 混合则 partial；仅剩 passed/waived 时有 waived 则 waived，否则 passed。
输出六类计数、逐AC及逐检查明细与证据、原始 observed、豁免清单。顺序只决定简短标题，不隐去低优先级状态。

## CLI

从仓库根调用，要求显式任务目录，不自动猜活动任务。

- `python3 scripts/acceptance.py run <task-dir> <check-id> -- <argv...>`：只用于 command 检查；shell=False，实际子进程 stdout/stderr 落 .tmp/，直接捕获返回码。执行前原子保存 unrun/清除旧结果与waiver，执行完原子保存新结果；中断保留非通过。启动失败记 blocked；有正常非零返回码记 failed。返回原命令码；signal/启动失败转为非零，记录原事实。
- `python3 scripts/acceptance.py summarize <task-dir>`：输出唯一JSON（诊断用stderr）；exit 0=passed，1=有效但failed/partial/blocked/unrun，2=输入/文件/协议错误，3=waived。不得通过 `|| true` 抹去非零，也不得把exit3写成全通过。
- `python3 scripts/acceptance.py archive <task-dir>`：重新计算，仅passed/waived才委托当前解释器执行原task.py archive；不导入其私有模块、不复制移动/提交逻辑。拒绝沿用summarize的1/2；委托成功exit0，JSON同时明确acceptanceStatus（passed或waived）；委托失败exit4并保存archiveExitCode/原输出。与研究建议不同：不把已经归档成功的waived返回3，避免调用者因通用非零误判重试。原归档可能已移动后失败，任何失败都不自动重跑。

脚本不会执行清单中任意历史命令：run 只执行此次明确给出的argv。JSON由主会话单写，子代理返回条目供合并，避免并发覆盖。

## 接线与兼容

检查代理提交结果路径与summarize输出；workflow最终检查和提交前核实状态；finish-work 每个待归档任务调用archive，移除“当前任务总会归档”。有既有依据的waived必须在交付说明列出，其余非通过停止归档。用户直接原生命令仍可绕过，本方案不宣称是全局强制锁。

历史归档不追补；未归档旧任务缺协议时给出明确补齐提示，不默认通过。纯文档任务只记文档验收。三个模板文件本地改动会在Trellis更新时成为自定义；保持hash文件不动，未来更新保留接线。

## 回退与限制

独立revert本任务的脚本和接线即可；不迁移用户数据、不改产品存储。原归档bug属于报告05，不在此修。证据真实性、豁免授权与场景等价性仍需人/审查上下文判断。
