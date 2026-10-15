# 技术设计

## 边界与入口

目标为当前项目的 Pi/Trellis 集成，不另造子代理工具。主要入口为 `.pi/extensions/trellis/index.ts`、`.trellis/workflow.md`、`.trellis/scripts/common/workflow_phase.py`、`.trellis/scripts/common/session_context.py`、9 个 `.agents/skills/trellis-*/SKILL.md`、3 个 `.pi/prompts/trellis-*.md` 和 `.pi/agents/trellis-*.md`。

按需修改实际产生冗余的入口，不为清单中的每个文件强行制造改动。共享 Python 输出保留各平台语义；平台专属精简只作用于已识别的 Pi 输出。无关宿主规则、AGENTS.md、社区包和 TUI 功能不变。

## 文本精简

- 工具保留 name、description 和 parameters。删除无必要的参数描述；dispatch 首行协议集中在一条 promptGuidelines。移除重复 promptSnippet，不改变工具注册与 renderer。
- 工作流对照“原规则 → 唯一新位置”去重；保留规划批准、任务启动、派发、检查、规范更新、提交和故障处理。索引输出去除维护者 HTML 注释；保留源文件中解析器需要的状态标记。
- SessionStart 与 overview 使用紧凑格式，保留首条确认、语言选择、当前身份、git、任务、journal 和路径语义。
- skill description 只保留用途和全部独立触发条件。正文保留命令、条件分支、完成标准和引用；合并重复说明，不隐藏技能，不把必要内容移到默认不会读取的位置。
- 命令模板与角色正文检查相同规则是否重复。各入口仍需能独立获得必需契约；不能假设主会话读过的内容子代理也已获得。
- 任务资料与 curated specs 保持内容、预算、顺序和刷新机制；只精简固定包装。不同上下文必须重复的内容不作为可删除冗余。

## 校验前规范化

Pi 1.2.0 提供 ToolDefinition.prepareArguments，用于 schema 校验前兼容处理。实施时验证宿主调用顺序和当前扩展支持情况，再连接已有默认值/agent 短名称/trim 逻辑。

保留缺省 agent = trellis-implement、mode = single 和已有合法调用；不从 prompts 推断 mode，不猜 prompt 内容或代理。类型错误、未知 mode 和缺失必需内容给明确错误。数组数量等约束仍有效，不能先过滤超限数组使其绕过 maxItems。避免 execute 和 prepareArguments 形成两份冲突规则。

## 固定输入计数

已有候选与基线位于 `.tmp/trellis-lean/`，报告见 [盘点与提案](research/injection-inventory.md)。实施前固定原文、工具注册、skill 索引、任务状态和样本输入，保留可复现交付物。

分别统计：

1. 工具：实际注册的 name/description/parameters，经相同紧凑 JSON 序列化；不计 UI label/render。
2. system 文本：工具指导、Trellis 固定注入、skill 索引。汇总时避免重复计入已包含的子项。
3. 按需正文：skill、命令模板、子代理输入；与默认开销分开。
4. 实际请求：记录宿主序列化边界与原始 usage。计数器可用时记名称/版本；不可用时明确报告 Unicode 字符数和 ceil(chars / 4) 代理值。

不以任务规划文档自身变短或关闭功能制造收益；不把缓存命中当作上下文长度下降。

## 验证与回滚

先建立原规则/新位置表，再核对 schema 和参数行为。注入回归覆盖无任务、planning、in_progress、任务记录错误、同内容不重复更新、文件变化、会话恢复和项目切换。保留原有异常提示，实际无法覆盖的场景明确记录。

至少一次真实 Trellis 派发验证工具可见、返回及正常退出；只导入扩展或文本快照通过不等于功能验收。托管文件逐项记录定制位置；不修改全局安装或运行 trellis update。回滚恢复本次修改的局部文本与规范化入口，不重置用户工作区。
