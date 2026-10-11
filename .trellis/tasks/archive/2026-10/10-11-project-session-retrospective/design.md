# 第一批落地设计

## 边界与依据

依据 [复盘报告 01/02](research/report.md)、[验收接线研究](research/acceptance-gate-design.md)、[存储夹具研究](research/storage-gate-design.md)。研究是备选与证据；最终实现以两个子任务的设计为准。

当前差距：AC 结果可被自然语言汇总升级；高风险回归在被忽略的 .tmp/ 中，现有检查没有仓库自动执行入口。产品存储修复已经存在，不重新实现。

## 分工

1. 01 采用 Python 标准库的项目脚本，逐项结果存入任务 acceptance.json。run 捕获命令真实返回码，summarize 校验并计算结果，archive 校验后委托原任务归档。
2. 02 采用 Node 内置 test/assert、已有 TypeScript/Vue 和独立 VM，测试当前真实存储模块。新增 npm run check 与 GitHub Actions 本地配置；同时执行 01 的 Python 回归。
3. quality-guidelines.md 是状态/检查的项目规范入口，两子任务顺序修改。Trellis workflow、Pi check/finish 仅作短接线，不修改核心脚本或公共 bundled skill。

01 不依赖 02，可由标准库独立验证；02 在 01 后集成，父任务不并行派发这两个写入任务。无需另建父任务产品实现。

## 关键决定

- 不依赖 fail-open 的 after_* hook。归档包装器在本项目默认收口路径中确定性阻断，但原生 task.py archive 仍可被手动绕过；不宣称全局不可绕过。
- 豁免是派生状态，保留实际 failed/partial 等和原 exitCode。依据来自已有用户决定或规范，脚本不判断截图真实性或替代证据是否等价。
- 原任务归档已知 pathspec 问题属于报告 05，包装器准确传播失败而不顺带修复。归档失败可能发生在已移动之后，禁止自动重试。
- CI 采用 Node 22、Python 3.12；使用根 npm 锁文件，零新依赖。只配置 push/pull_request 检查；远端运行与 required checks 单独列未验证。
- VM 保留共享 GM、分站 local、独立故障开关与重建页面状态，复用产品公开入口。不把 VM 与真实 EH/EX/NH 油猴行为等同。
- 不为测试额外导出私有产品函数。若夹具实施揭示当前产品缺陷，先固定反例并评估范围，不通过改断言掩盖，也不自动扩成平台修复。

## 整合与回退

最后核对 npm run check 顺序包含类型检查、验收脚本回归、存储回归、生产构建；以 acceptance.json 记录每个子任务实际结果和父任务整合结果。不可将文档校验或旧230条报告用作新运行证据。

每个子任务单独提交，配置/测试可以独立 revert；不做数据迁移。回退只针对本批自己的 diff，不覆盖用户其他改动。未推送时 CI 配置只有本地可审阅状态。
