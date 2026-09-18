# Spec Kit 本地维护

修改 `.pi/prompts/speckit.*.md`、升级 Spec Kit、考虑抽取 hooks 或启用 agent-context 扩展时读取本文。安装版本与原始文件哈希见 [integration.json](../.specify/integration.json) 和 [pi.manifest.json](../.specify/integrations/pi.manifest.json)；它们记录安装基线，不用本地修正后的哈希覆盖。

## hooks 取舍（2026-09-18）

保留十个命令各自完整的前后 hooks 协议。每个命令可独立调用，当前没有已配置的共享协议包。已核对本地 Spec Kit 1.0.8：模板 resolver 支持 override/preset，preset 内容可 replace/prepend/append/wrap；这些能力可以用于后续分发，但并不使任意共享 Markdown 自动成为所有命令的依赖。本次不新增 preset、helper 或安装逻辑。

这关闭文档审查 D12 的 hooks 研究项：接受有意重复，以保持入口独立可执行。D12 的 checklist 模板来源和 clarify 零问题结束分支已在 `f3cd8a4` 修正。

## 修改与升级核对

1. 比较本地差异与安装基线，保留 analyze 的只读前置检查及 hook 边界、taskstoissues 的 feature＋task 去重、checklist 的已解析模板来源、clarify 的零问题结束条件。
2. hooks 变更须核对十个入口的 `before_*` / `after_*` key 和执行顺序，以及不存在配置、无注册项、无效 YAML、显式 disabled、空/非空 condition、optional/mandatory 分支。保留现有错误报告和后续处理语义；mandatory 需要实际调用并等待完成，不能只输出提示。analyze 仍受只读边界约束。
3. 核对每个入口的主体步骤和完成标准仍可独立执行，保留 `$ARGUMENTS` 与 pi 调用方式；用隔离数据验证分支，记录实际执行与仅静态核对的范围。

以后只有在共享协议能随受支持的包安装、更新和恢复，且上述全部入口分支均通过验证时再抽取。抽取后各入口须保留读取触发条件、协议位置、阶段 key、顺序、失败处理及原有权限/只读约束；同时测试协议缺失或版本不兼容时的明确失败路径。

## agent-context 维护

当前手工维护 [AGENTS.md](../AGENTS.md) 的稳定约束和按需读取入口。旧 `.specify/scripts/bash/update-agent-context.sh` 及其 `agent-file-template.md` 已移除：它们不在 Spec Kit 1.0.8 安装清单内，当前核心命令也没有调用；历史 plan 中标为 Historical 的执行记录仅供追溯。

需要自动刷新上下文时，采用 Spec Kit 的 `agent-context` 扩展。启用前明确目标文件及受管理区块的起止标记，核对 `after_specify`、`after_plan` 可选 hooks 的触发方式；刷新后审阅差异，只将经当前实现核实的约束合入手工维护部分，保留具体功能规则和验收记录在对应 `specs/` 文档中。
