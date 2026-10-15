# 实施交付与提交清单

实现已完成，用户批准的范围为 Trellis 工具、固定自动注入、9 个 skills、3 个命令模板和3个角色文本。当前分支 `feat/trellis-lean-context`，基线 `e7e5f280c95ee22b5cc8406cb7253d5a5f2ede8b`；尚未提交或归档。

## 结果

- 保留 `trellis_subagent` 的名称、字段、类型、枚举、maxItems=6、缺省值和执行/render 路径，去除冗余字段描述和重复 snippet。
- 在 Pi `prepareArguments` 中先检查原始类型/数组数量，再沿用默认 agent/mode、短 agent 名和 trim；未知枚举由 schema 拒绝，不猜模式、代理或正文。先检查原始长度，防止过滤空项绕过 maxItems。
- 工作流索引去掉维护者注释，按平台呈现专属说明；紧凑表达状态、overview 和包装。任务正文、curated specs、预算、显示顺序、快照/更新机制不变。
- 9 个 skill 继续可发现，触发分支与权限保留；角色工具白名单不变。社区 subagent 包保持未启用。
- 本地直接定制文件，没有新增 lean 开关或依赖。既有会话已加载的旧文本不会因此从历史消失；新会话加载当前文件。

## 计数与复现

详见 [token-report.md](research/token-report.md) 和 [token-comparison.json](research/token-comparison.json)。计数为 Unicode 字符及 `ceil(chars/4)` 代理值，不是 tokenizer/provider token。

| 范围 | 原代理值 | lean 代理值 | 字符减少 |
| --- | ---: | ---: | ---: |
| 工具定义 | 181 | 121 | 33.29% |
| 工具调用指导 | 78 | 30 | 62.14% |
| 9 个 skill 索引 | 1,263 | 832 | 34.11% |
| Pi workflow 索引 | 1,849 | 958 | 48.18% |
| Trellis system 固定部分（不含任务正文） | 2,479 | 1,434 | 42.17% |
| 9 个完整 skill 文件，按需读取合计 | 15,232 | 9,012 | 40.83% |

workflow 是 system 固定部分的子项，不能叠加。固定小样本的完整 system 为 2,550→1,505；实际任务正文更大时百分比会不同。按需正文不属于默认启动成本。

```bash
node scripts/measure-trellis-context.mjs --check
```

生成器使用固定基线与当前源码、真实 Pi 注册/formatter 及相同任务/overview fixture，不将本任务文档变化计作收益。Node 24+、Python 3、已有 Pi 和可读基线是复现前提。

## 验证和审查

- `node --test scripts/test-trellis-extension.mjs`：11/11，实际 Pi SDK 的 prepare→schema 校验→permission hook→execute；三模式、参数、失败、更新/恢复、项目切换、预算和 renderer 回调由受控子进程覆盖。
- `python3 -m unittest discover -s scripts -p 'test_trellis_lean_context.py'`：10/10，7 状态、22 平台及 inline 变体、overview 和错误边界。
- `python3 -m unittest discover -s scripts -p 'test_acceptance.py'`：37/37，项目验收协议回归。
- 计数重算/独立审计、manifest 校验和 `git diff --check` 通过。审计核对45组来源散列与106份文本快照。
- 真实 `trellis-research` single 派发读取随机 facts，正确返回 JSON，实际 Pi 子进程、宿主和监督进程均 exit 0；工具表与研究角色白名单一致。见 [live-dispatch.md](research/live-dispatch.md)。
- 全范围 Standards/Spec 审查发现 update-spec 七段输出的触发范围被缩窄；修复两句后定向复核关闭 R1。保留 [原审查](research/review.md) 与 [复核](research/review-followup.md) 两份记录。

首次真实测试的子进程成功，但验收脚本将 commentary 与最终 JSON 拼接，导致宿主断言失败；修复验收脚本后独立复测通过。两次原始结果均保留，没有改写失败观察。

未验证：模型在所有提示下的技能选择/理解等价性、真实 parallel/chain、主模型自动选择新版工具的 provider 请求、全量严格 TypeScript/lint、Windows/Linux、TUI 视觉、ACP 主动压缩及原版/lean 同任务真实 usage 对照。产品前端/平台未改，未运行浏览器和产品构建。上述未测项不记为通过；本轮通过的是已约定并实际执行的契约、状态与代表性派发验收。

## 本地维护与回滚

契约沉淀于 `.trellis/spec/tooling/pi-context.md`。`trellis update` 可能覆盖本地托管文本，更新前保存这些差异，更新后运行上述回归与计数并检查触发规则。未执行 update 或回滚验证。

回滚只撤销本次局部文本与 prepareArguments 改动；不 reset 工作区、不修改全局安装、不改变用户配置。`.tmp/trellis-context-measure/`、`.tmp/trellis-lean-live/`、`.tmp/trellis-lean-final/` 和审查 evidence 为本次保留的审计产物；原始日志不纳入提交，任务内报告与可复现脚本纳入提交。没有本次残留的后台服务或监听端口。

## 待确认的提交计划

一个工作提交：`refactor(tooling): 精简 Trellis 上下文并保留调用契约`。

完整范围如下；这些均为本任务改动，未发现无法归属的脏文件：

```text
.agents/skills/trellis-before-dev/SKILL.md
.agents/skills/trellis-brainstorm/SKILL.md
.agents/skills/trellis-break-loop/SKILL.md
.agents/skills/trellis-channel/SKILL.md
.agents/skills/trellis-check/SKILL.md
.agents/skills/trellis-meta/SKILL.md
.agents/skills/trellis-session-insight/SKILL.md
.agents/skills/trellis-spec-bootstrap/SKILL.md
.agents/skills/trellis-update-spec/SKILL.md
.pi/agents/trellis-check.md
.pi/agents/trellis-implement.md
.pi/agents/trellis-research.md
.pi/extensions/trellis/index.ts
.pi/prompts/trellis-continue.md
.pi/prompts/trellis-finish-work.md
.pi/prompts/trellis-start.md
.trellis/scripts/common/session_context.py
.trellis/scripts/common/workflow_phase.py
.trellis/spec/tooling/index.md
.trellis/spec/tooling/pi-context.md
.trellis/workflow.md
scripts/measure-trellis-context.mjs
scripts/test-trellis-extension.mjs
scripts/test_trellis_lean_context.py
.trellis/tasks/10-15-trellis-lean-tool-descriptions/（规划、清单、计数、审查和验收资料）
```

提交确认后按工作提交→任务归档→journal 顺序收口，各阶段不混入下一阶段文件。不推送远程。
