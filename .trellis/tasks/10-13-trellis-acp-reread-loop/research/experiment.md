# ACP 重读循环有限对照证据

日期：2026-10-13。任务：`.trellis/tasks/10-13-trellis-acp-reread-loop`。

## 条件与版本来源

Pi 1.2.0；Node v24.18.0；模型 `openai/gpt-6-astra:medium`。Pi 从 `/Users/warwick/.pi/agent/npm/node_modules/billion-context` 加载的包为 0.1.196，运行期 `acp_status` 同样报告 `host=billion-context 0.1.196 (d64139f9)`；该包 `dist/index.js` SHA256 为 `c081b6bcf1b33c5f57de34759692dcd2a240f93a364f9bc94a05b0d22642f7db`。另一个全局 npm 安装路径 `/Users/warwick/.nvm/versions/node/v24.18.0/lib/node_modules/billion-context` 为 0.1.195，不能代替实际加载版本。

用户配置 `/Users/warwick/.config/billion-context/billion-context.json` 的 compress 只有 `promptPack: "lean"`。源码配置入口先看 `BILI_CONFIG_FILE`，否则使用 `$XDG_CONFIG_HOME/billion-context/billion-context.json`（默认 `~/.config`）；本次相关环境变量 `BILI_CONFIG_FILE`、`ACP_COMPRESS_NUDGE`、`ACP_COMPRESS_TOOL`、`ACP_MODEL_CONTEXT_LIMIT`、`ACP_MAX_CONTEXT_LIMIT` 均未设置。源码默认值为 `maxContextLimitPct=0.75`、`minContextLimitPct=0.45`、`growthFloor=50000`、`minCompressRange=5000`、`preserveRecentMessages=5`、`preserveRecentTokens=5000`，`injectNudge` 默认开启。原始来源在 `.tmp/trellis-acp-reread-loop/config-source.txt`。未新增项目 ACP 配置，也未改用户配置、全局设置或安装包。

四个样本均使用 `--mode json -p --no-session`、相同模型、fixture、注入任务内容及工具白名单。before 使用旧角色规则；after 与 after2 提示文本相同；final 仅将交付文件名改为 `final-delivery.md`，增加只读的 `agent_settled/session_shutdown` 观测。before/after/after2 的执行器总上限为 300 秒、20 请求；final 保留 300 秒模型执行上限和 20 请求，另设 130 秒退出清理上限，总上限 430 秒。final 实际总时长 191.426 秒，也低于原 300 秒限制。这些差异明确保留，不能声称所有执行器参数完全相同。

## 读取、压缩和交付

原始日志及结果均在 `.tmp/trellis-acp-reread-loop/`，每个样本有 `<name>.observe.jsonl`、`<name>.jsonl`、`<name>.result.json`。`verify_experiment.py` 直接解析工具调用、压缩结果、原始 write 内容、退出记录和 usage；`final-metrics.json` 是当前汇总。早期 `recheck/raw-consistency.json` 仅作当时审查记录，当前汇总以 final-metrics 为准。

| 样本 | fixture 组读取轮数 | 任务/规范读取 | 所有 read 调用 | compress 调用/块数 | 写交付 | 退出 |
| --- | ---: | ---: | ---: | --- | ---: | --- |
| before | 1（3 份各一次） | 6 | 10 | 1 / 1 | 1 | 0 |
| after | 1（3 份各一次） | 0 | 3 | 1 / 1 | 1 | 0 |
| after2 | 1（3 份各一次） | 0 | 3 | 1 / 3 | 1 | -15，timeout |
| final | 1（3 份各一次） | 0 | 3 | 1 / 1 | 1 | 0，无 timeout |

before 的 6 次任务/规范读取是 manifest、baseline、quality guidelines、PRD、design、implement：提示已经包含所需内容，旧角色规则仍要求重读。before 压缩后另有一次恢复临时文件的 read，因此总数为 10。它的恢复路径是 `search_context → decompress → read → grep → write`；after 和 final 为 `search_context → decompress → bash rg → write`；after2 压缩后直接 write。所有压缩都返回 `outcome=applied`。

修复后没有重新整组读取任务/规范或原始 fixture。三份 fixture 是新实验输入，各读一次不算空转；按具体缺失字段恢复摘要也不算空转。有限样本没有重现历史“8 次整组重读”的长循环，因而结论仅为消除了本样本的冗余上下文读取，且受测轨迹未出现 PRD 定义的连续两轮无推进循环。

所有原始 write 的交付包含正确事实 `albumId=eh-731`、`expectedPages=96`、`checksum=7c92de41` 和当前任务路径。final 的原始 write 内容与 `.tmp/trellis-acp-reread-loop/final-delivery.md` 完全一致；未由主会话改写 final 交付。早期 `delivery.md` 曾由主会话补正收口说明，故不再以它证明代理原始输出。

## 退出诊断与历史失败

after2 在 `2026-10-13T15:08:01.894262+00:00` 启动，`15:11:10.559Z` 出现最终 agent_end；执行器在 `15:13:01.922041+00:00` 终止，原始 `exitCode=-15, timeout=true` 保持不变。它还包含一次自动重试前的零 usage 错误：`server_error: An error occurred while processing your request. You can retry your request, or contact us through our help center at help.openai.com if the error persists.` 该请求计入总请求数；不将 server_error 断言为超时原因，也不把这次运行改报通过。

只读退出探针 `.tmp/trellis-acp-reread-loop/exit.resources.jsonl` 捕获了 `.pi/npm/node_modules/pi-graft/extensions/graft.ts:745` 的 `setTimeout(() => { syncing.delete(dir); }, BUILD_TIMEOUT_MS)`，delay=120000，保留事件循环引用。源码对子进程做了 unref，但该计时器没有 unref。探针从启动到自然 exit 0 为 135.955 秒；这定位了该诊断样本的 120 秒退出等待，没有修改安装包。历史 after2 没有同样的 async_hooks 证据，不能据此证明它所有等待的原因。

final 从 `2026-10-13T18:13:49.612230+00:00` 启动，`18:15:00.804Z` 到 session_shutdown（71.192 秒），`18:17:01.037769+00:00` 自然 exit 0（清理 120.234 秒），共 191.426 秒，无强制终止、无模型错误。final 的正确交付、真实压缩和正常退出共同作为当前 AC3 验收；after2 的 partial 历史在原始日志、本文和 `.tmp/trellis-acp-reread-loop/acceptance-before-final.json` 保留。验收记录的当前运行检查改为验证最终代表运行，不给旧失败添加豁免，也不声称消除了安装包的退出等待。

## token/cache

仅累加 assistant `message_end` usage，排除 message_update/agent_end 重复快照。所有样本 cacheWrite=0。

| 样本 | 请求数 | input | output | cacheRead | cacheRead / (input + cacheRead) | 总时长 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| before | 14 | 245881 | 1773 | 202752 | 45.19% | 246.750 秒 |
| after | 10 | 141068 | 1169 | 158464 | 52.90% | 221.286 秒 |
| after2 | 8（7 成功，1 server_error） | 73477 | 1528 | 148992 | 66.97% | 300.028 秒，超时 |
| final | 10 | 171626 | 1150 | 128000 | 42.72% | 191.426 秒 |

这是 Pi 上报 usage，不是独立计费审计。final 的 cacheRead 比例低于 before，也说明不能从读取减少推出缓存命中率必然提高。短样本不能证明长期缓存或性能收益。

## 精确变更、范围和回滚

- 子任务一：`.pi/agents/trellis-implement.md`、`.pi/agents/trellis-check.md`、`.pi/agents/trellis-research.md` 的原 tools 各追加 `compress,decompress,search_context,acp_status`，保留原业务工具限制。
- 子任务二：implement/check 复用完整且当前的注入内容，manifest 核对一次，仅在缺失、截断、已变更或需要新编辑锚点时读取；三个角色都保留压缩前后的任务路径、批准范围、进度、证据、未决项和下一动作。`.trellis/workflow.md` 的两个 in_progress 路由及 Rules 同步这些规则。无注入场景仍有完整加载 fallback。
- 规范沉淀：`.trellis/spec/tooling/index.md` 和 `pi-context.md`；任务 manifest 引入该规范，任务资料记录证据。它们不改变 ACP 配置。

只回滚子二时，撤销三个 agent 中上下文/压缩续接段落以及 workflow 的对应差异，保留四个 ACP 工具；整体回滚时再移除四个工具及本轮新增 tooling 规范/任务资料。回滚只处理本任务差异，保留已有浏览器验收文件。全局配置、项目设置和启动器的基线 SHA256 未变。

规则影响后续读取角色/工作流文本的会话；已运行子代理不会热更新白名单。主会话外部代理 nudge 不由子进程设置控制，本轮没有主会话长窗口验收。未验证其他模型、长期压力或全部原生角色的压缩任务；未运行产品浏览器、EH/NH、type-check、构建，因为没有产品实现改动。
