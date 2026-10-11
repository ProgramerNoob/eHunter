# 第一批 01/02 整合记录

日期：2026-10-11。分支 `chore/retrospective-checks`，实现基线 `24f0b80ab115752b6b3797ab21277a96f2df2748`。两子任务实现和正式只读审查均结束，待父任务最后证据核查及提交批次确认；未提交、归档或推送。

## 交付与来源

[原复盘](report.md) 覆盖本机 70 条历史 Pi 记录（12 主、58 子），加本轮初始清单共 71 条。原报告里的“现状”“未执行”是调查阶段快照；本批只落实其 01/02，03–08 仍不在范围内。用户对完整方案回复“确认”后依次启动两个子任务，父任务负责整合；没有扩大为产品修复。

| 交付 | 实现和审查证据 | 实际行为 |
| --- | --- | --- |
| 01 验收结果协议 | [实现](../../10-11-acceptance-result-gate/research/implementation.md)、[R1修复](../../10-11-acceptance-result-gate/research/fix-r1.md)、[最终复审](../../10-11-acceptance-result-gate/research/review-r1.md) | `scripts/acceptance.py` 保存原始退出码，验证 AC 与证据，计算逐项/逐AC/总状态；`run/summarize/archive` 接入现有流程 |
| 02 存储回归与检查 | [实现](../../10-11-storage-regression-check/research/implementation.md)、[正式审查](../../10-11-storage-regression-check/research/review.md) | 真实模块 VM 的 46 个用例覆盖十二场景族，`npm run check` 联通 type-check、37 个 Python 回归、存储回归及生产构建；新增 Actions 配置 |

质量规范为唯一协议/命令入口：[quality-guidelines.md](../../../spec/frontend/quality-guidelines.md)。没有增加 npm 依赖、修改锁文件、产品源码或公开导出，也没有改 Trellis 核心及模板 hash。四个接线文件仅承载项目流程；原始 `task.py archive` 仍能绕过包装器，证据语义与豁免授权仍需审查。

## 已完成验证

- 01 的三个历史反例都有机械回归：非零返回不能 passed；AC4 partial 不能全通过；ZIP 结构通过不能抵消内容 blocked。全通过与豁免分别汇总为 exit0/exit3；归档成功均 exit0，保留不同 acceptanceStatus。归档拒绝、仅委托一次及失败 exit4 由隔离桩验证，未归档真实任务。
- 01 初次审查发现命令组在直接子进程提前退出时可能遗留后代；修复后完整 **37 项测试通过**，原独立探针通过。原失败及修复记录均保留，未把最初失败改写成成功。
- 02 实际环境 **Node 22.23.3 / npm 10.9.9 / Python 3.12.14 / Darwin arm64**。干净副本 314 个明确输入，无 `.git`、旧 `.tmp`、node_modules，根锁 `npm ci --include=dev` 成功；完整 check 与独立第二次 npm test 成功。精确文件及哈希见 [snapshot.json](../../../../.tmp/storage-regression-check/snapshot.json)。
- 错误断言令 test/check exit1；类型错误令 type-check/check exit2；放宽历史 resetId 身份判断使 **6 个用例失败、exit1**；三阶段逐一注入 exit7 均原样传播且不运行后续阶段。副本全部恢复后 check 再次 exit0。外层负向审计成功不抹去被测命令失败。见 [执行元数据](../../../../.tmp/storage-regression-check/execution-metadata.json)。
- 官方 checkout/setup-node/setup-python v7 的 tag/README 已核实；CI 静态检查覆盖 push/pull_request、contents:read、Node22/Python3.12、根锁安装和统一命令。Actions 自身 Node24 与项目测试 Node22 分开。
- 两子任务正式审查均分别覆盖 Standards/Spec，检查工作区、暂存区和未跟踪交付。审查期间受审代码/测试/规范 hash 不变；02 进一步核对 01 脚本及接线保留。具体证据见各审查报告。

## 父任务接受标准映射

| AC | 证据与判断范围 |
| --- | --- |
| AC1 | session-inventory.json、原 validation.md：本机历史范围、主/子关系、平台分布和缺失限制 |
| AC2 | primary-evidence.json、四个分片研究、report.md：原始会话物理行、实际后果及现状核验 |
| AC3 / AC4 / AC6 | report.md：七个调查维度、按优先级候选、已修复/现存/假设及未验证范围；不将子会话数当事件数 |
| AC5 | 两项脚本/测试复用标准库与已有依赖，质量规范集中协议；没有新增平行标准文件或产品抽象 |
| AC7 | 01 的37项回归、R1复审及 acceptance.json，三个历史反例和两条合法收口状态 |
| AC8 | 02 的干净副本、重复测试、三类真实负向、原始返回码及314文件恢复证据 |
| AC9 | 两子任务 summarize、统一check成功日志、各自及父任务只读审查、此整合范围声明 |

父 acceptance.json 分别记录研究核查、脚本回归、干净安装/执行、负向门禁、统一检查、整合资料和正式审查。只有最后一项合入后才计算最终结论；本文件不手写覆盖机器结果。

## 未验证与限制

未推送或运行远端 GitHub Actions；Ubuntu 实机、required checks、分支保护未验证或配置。VM 是受控同步 GM/localStorage 模型，未验证真实油猴 grant/沙箱/序列化、EH/EX/NH 实际共享、移动/桌面 UI、浏览器调度、图片或下载。产品源码未变，本批对应功能验收为 CLI、测试入口和失败传播，不借用历史230条结果声称这些实机场景通过。

锁安装输出既有依赖审计提示，构建保留 Sass/punycode 提示；本批未审计定位或升级依赖，不增加范围外修复。仓库仍无 lint 配置，未报告 lint 通过。

## 资源与待办

没有创建浏览器或后台服务，无需释放服务端口。2026-10-11 已移除本任务 `toolchain/`、干净副本 `node_modules/` 和 `dist/`，以及本轮生成的 scripts/__pycache__ 字节码；保留干净源文件、原始日志、diff、命令元数据和哈希。执行记录的 cwd 仍存在；重跑副本需重新安装依赖/准备所选运行时。

剩余步骤：父任务最终证据审查、机器汇总；按现有 workflow 3.4 呈现一次具体工作提交批次，确认后提交；归档和 journal 属随后收口，不提前写 completed。
