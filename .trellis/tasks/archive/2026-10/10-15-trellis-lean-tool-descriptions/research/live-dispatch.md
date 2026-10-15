# 当前磁盘扩展的真实派发验收

2026-10-15（本地日期；原始日志使用 UTC）。结论：复测 `attempt-2` 通过，真实 Pi 子进程完成一次 `trellis-research` 只读任务并以 exit 0 退出。首次 `attempt-1` 的子进程同样成功，但验收脚本错误地拼接 commentary 与最终 JSON，导致宿主断言失败；原始失败结果保留，没有改写为通过。

## 范围与环境

- 从当前磁盘 `.pi/extensions/trellis/index.ts` 读取完整源码，通过 Node `stripTypeScriptTypes` 加载，捕获其实际 `trellis_subagent` 注册定义；不使用本会话启动时的旧工具注册。
- 扩展 SHA-256：`81ed64d6f950dbffedf444ba132874b1a93ff80f7ee387cb618ea0e430a5e583`。两次执行前后的源码散列一致。
- `.pi/agents/trellis-research.md` SHA-256：`d452355609af3a89fac6a312b0a37d8aa86888c5381755024059d4a38ecef067`；交付时复核一致。
- Node `v24.18.0`；Pi SDK/CLI `1.2.0`；模型 `openai/gpt-6-astra`；显式覆盖 `thinking=low`。
- cwd：`/Users/warwick/claude/eHunter`；当前任务：`.trellis/tasks/10-15-trellis-lean-tool-descriptions`。
- 写入限于 `.tmp/trellis-lean-live/` 和本文；未修改运行文件、测试、acceptance、计数报告或配置，未执行提交。
- 两次测试前均执行 `notify-complete` 短通知。该技能的原命令在独立调用时成功；准备阶段一个含目录探查的组合命令被工具保护规则拒绝，拆分为只读探查与原通知命令后继续。

## 调用方式与契约证据

复用 `scripts/test-trellis-extension.mjs` 的宿主 API 加载方式，调用真实 Pi SDK `wrapToolDefinition` 与 `runToolCall`，由宿主依次执行参数预处理、schema 校验、`beforeToolCall`、扩展 `execute`。`execute`、`buildPrompt`、`runSubagent` 和 `runPi` 均为当前磁盘源码；spawn 的观测包装调用原始 Node spawn，没有伪造子进程或模型输出。

原始参数使用 `agent: "research"`、省略 `mode`、prompt 尾部包含空白。宿主 `beforeToolCall` 捕获的校验后参数为 `agent: "trellis-research"`、`mode: "single"`，prompt 尾部空白已去除；模型与 thinking 原样传递。派发 prompt 首行为：

```text
Active task: .trellis/tasks/10-15-trellis-lean-tool-descriptions
```

`TRELLIS_PI_CLI_JS` 指向验收桥接脚本。桥接只追加 `-e observer.mjs`，随后在同一进程导入真实 CLI。完整子代理正文包含磁盘研究角色、当前任务 PRD/design/implement 和派发正文，保存在 `child-prompt.txt`。未新增或改变任务上下文选择机制。

外层 harness 注册时运行于父进程身份；真实子进程通过原扩展的 `buildChildEnv` 获得 `TRELLIS_SUBAGENT_CHILD=1`、`PI_SUBAGENT_CHILD=1` 和原父会话关联，继承的 `PI_SESSION_ID` 已清除。子进程禁用 Trellis 再派发入口，工具白名单保留原样。

可复现命令（在仓库根目录执行；新执行必须换未使用的 attempt 名，脚本拒绝覆盖旧证据）：

```bash
env -u TRELLIS_SUBAGENT_CHILD -u PI_SUBAGENT_CHILD \
  TRELLIS_CONTEXT_ID=pi_01a13bbe-d4b8-7283-b736-c42b425180d1 \
  python3 .tmp/trellis-lean-live/supervise.py attempt-2
```

复现依赖当前有效任务指针和已有模型凭据；会话迁移后应使用指向本任务的当前 `TRELLIS_CONTEXT_ID`。原始 argv 是：

```text
node .tmp/trellis-lean-live/run-live.mjs attempt-2
node .tmp/trellis-lean-live/pi-wrapper.mjs --mode json -p --no-session --model openai/gpt-6-astra:low --tools read,write,bash,find,grep,compress,decompress,search_context,acp_status
node /Users/warwick/.nvm/versions/node/v24.18.0/lib/node_modules/@earendil-works/pi-coding-agent/dist/cli.js --mode json -p --no-session --model openai/gpt-6-astra:low --tools read,write,bash,find,grep,compress,decompress,search_context,acp_status -e /Users/warwick/claude/eHunter/.tmp/trellis-lean-live/observer.mjs
```

第一行启动验收宿主；第二行由原扩展真实 spawn；第三行是桥接后同一子进程使用的 CLI argv，并非另起一个进程。机器可读记录保留全部绝对路径。

## 工具表与可核验输出

当前源码只注册 `trellis_subagent`；注册快照包含完整 name/description/schema/guideline 和 `prepareArguments: "function"`。schema 的 `prompts.maxItems` 为 6，六个参数均保持原类型与枚举。

两次派发各有 2 次真实 provider 请求。`before_provider_request` 捕获的 provider 工具名称与 `pi.getActiveTools()` 均为：

```text
read, write, bash, find, grep, compress, decompress, search_context, acp_status
```

完整 provider schema 保存在各次 `observer.jsonl` 的 `request.tools`，包括宿主序列化的 strict/nullable 处理。该表没有 `trellis_subagent`，与研究角色的子进程限制一致。外层新版工具注册证据和子进程 provider 工具表分别记录，不能混为同一层证据。

研究代理每次只调用一次 `read`，目标为对应 attempt 的 `facts.json`，没有写文件或调用其他工具。随机 nonce 仅存在于事实文件，未出现在派发正文中。复测读取 `[17, 29, 11]` 后返回以下真实结果；它同时出现在最终 assistant `message_end` 与外层工具返回值中：

```json
{"nonce":"2221d3e2a52d3788cf5440c9","project":"eHunter","total":57,"marker":"copper-otter"}
```

首次返回值的 nonce 为 `661564a945b236916fa6bf88`，其他字段相同；也已逐字段核验。首次验收脚本在 `run-live.mjs:103` 报 `AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:`，`actual: null`，原因是把“我会读取指定验收文件，并按文件内容返回 JSON。”与最终 JSON 拼接后解析。修复仅限验收脚本：选择最后一个 `stopReason=stop` 的 assistant 消息。首次 `failure.json`、`summary.json`、进程退出码均保持原样，复测另存 `attempt-2`。

## 进程与 usage

每次派发的 AbortController 预算为 180 秒，监督进程预算为 210 秒，超时后保留结果并有 SIGTERM/SIGKILL 兜底。两次均未触发超时、取消或信号终止。

| 执行 | 监督进程 PID / exit | 验收宿主 PID / exit | 真实 Pi PID / exit | 实际派发耗时 | 判定 |
| --- | --- | --- | --- | ---: | --- |
| attempt-1 | 63773 / 1 | 63774 / 1 | 63775 / 0 | 32.146 秒 | 原生派发成功，验收脚本断言失败 |
| attempt-2 | 64255 / 0 | 64256 / 0 | 64257 / 0 | 约 8.4 秒 | 派发及验收通过 |

Pi 退出同时有 observer 的 `process_exit` 和父进程的 `close` 事件证据；未用 `agent_end` 或 `session_shutdown` 代替真实退出。交付前以 PID 探查确认上表 6 个进程均不存在。未创建后台服务或监听端口。

usage 仅累加 assistant `message_end`，排除流式更新、`turn_end` 和 `agent_end` 的重复快照：

| 执行 | provider 请求数 | input | output | cacheRead | cacheWrite | totalTokens |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| attempt-1 | 2 | 15,606 | 98 | 15,104 | 0 | 30,808 |
| attempt-2 | 2 | 15,841 | 95 | 14,848 | 0 | 30,784 |

这是当前配置下 SDK 返回的原始 usage 汇总，详细每条 usage（含 reasoning、cost）仍在原始事件中；没有原版相同输入的真实模型对照，不能据此声称 token 节省或模型行为完全等价。请求摘要只记录输入字符数、UTF-8 字节数、SHA-256 和角色序列；未记录请求头、密钥或 authorization。

## 证据与未验证范围

- [执行脚本](../../../../.tmp/trellis-lean-live/run-live.mjs)、[监督脚本](../../../../.tmp/trellis-lean-live/supervise.py)、[只读观测器](../../../../.tmp/trellis-lean-live/observer.mjs)、[CLI 桥接](../../../../.tmp/trellis-lean-live/pi-wrapper.mjs)。
- [复测宿主结果](../../../../.tmp/trellis-lean-live/attempt-2.process.json)、[复测摘要](../../../../.tmp/trellis-lean-live/attempt-2/summary.json)、[成功断言输出](../../../../.tmp/trellis-lean-live/attempt-2.stdout.txt)。
- [当前注册工具](../../../../.tmp/trellis-lean-live/attempt-2/registered-tool.json)、[原始调用](../../../../.tmp/trellis-lean-live/attempt-2/raw-tool-call.json)、[校验后参数](../../../../.tmp/trellis-lean-live/attempt-2/validated-arguments.json)、[工具返回](../../../../.tmp/trellis-lean-live/attempt-2/tool-result.json)。
- [完整子代理输入](../../../../.tmp/trellis-lean-live/attempt-2/child-prompt.txt)、[provider/工具/usage/退出观测](../../../../.tmp/trellis-lean-live/attempt-2/observer.jsonl)、[原始 CLI 事件](../../../../.tmp/trellis-lean-live/attempt-2/child.stdout.jsonl)、[实际加载源码](../../../../.tmp/trellis-lean-live/attempt-2/extension-source.ts)。
- [首次失败进程记录](../../../../.tmp/trellis-lean-live/attempt-1.process.json)、[首次失败原始断言](../../../../.tmp/trellis-lean-live/attempt-1/failure.json)、[交付前独立证据复核](../../../../.tmp/trellis-lean-live/evidence-verification.json)。

本次验证了 single 真实派发、agent 短名、缺省 mode、prompt trim、显式 model/thinking、任务正文注入、研究角色工具白名单、事实读取与返回、真实正常退出。原始 request schema 与 activeTools 两处均逐项核对，扩展和角色散列也已复核。

未执行：parallel/chain 的真实模型派发、非法参数矩阵、TUI 卡片渲染与快捷键、主动 ACP 压缩、其他两种角色、完整项目/任务切换、会话恢复和固定注入回归。本次外层调用由 SDK 显式发起，未让主模型自动选择 `trellis_subagent`，也未取得新版主会话 provider 请求工具表；不将子进程工具表当作这项证据。上述范围由主会话结合已有回归独立判断。

`git diff --check` 已通过。本文和脚本的链接/语法检查另存 `.tmp/trellis-lean-live/static-verification.json`。未改 acceptance 或计数报告，交由主会话收口。证据保留在 `.tmp/` 便于审计，清理前应先保存所需原始记录。
