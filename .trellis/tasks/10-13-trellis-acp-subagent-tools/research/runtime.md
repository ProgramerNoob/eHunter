# 子代理 ACP 运行记录

2026-10-13，Node v24.18.0 / Pi 1.2.0 / 实际加载 billion-context 0.1.196 (`d64139f9`)，模型 `openai/gpt-6-astra:medium`，保留 `--mode json -p --no-session`。原始数据在 `.tmp/trellis-acp-subagent-tools/`。

## 工具与压缩证据

| 样本 | 真实观察 | 退出与耗时 |
| --- | --- | --- |
| before | 请求工具表只有 read,bash | exit 0，16.363 秒 |
| after | 请求表新增 compress,acp_status；状态调用成功 | 120.021 秒 SIGTERM，exit -15，timeout；仅工具验证成功 |
| compress-full | 合法范围 m00005–m00010；模型主动 compress 返回 outcome=applied、blocksCreated=1；随后正确回答三个事实 | exit 0，47.835 秒 |
| trellis-implement | 原业务工具及四项 ACP 工具，acp_status 成功 | exit 0，17.117 秒 |
| trellis-check | 原业务工具及四项 ACP 工具，acp_status 成功 | exit 0，28.593 秒 |
| trellis-research | 原业务工具及四项 ACP 工具，仍无 edit，acp_status 成功 | exit 0，30.917 秒 |

每个直接 CLI 样本都有同名 `.observe.jsonl` 记录实际请求工具表/工具返回，`.result.json` 保存真实退出；不只依赖模型自报。before 会话 `01a135ab-e233-7026-9c90-9741d384dd06`，after 会话 `01a135ab-e246-71de-bcd1-d783c75cc48a`。首次只读 20 行的样例没有合法范围，不能由此认定 no-session 不支持压缩。

compress-full 的事实为 `albumId=eh-731; expectedPages=96; checksum=7c92de41`，模型在压缩后准确使用。`compress` 短样本也成功，但 cat 返回受 50KB 上限截断，不能宣称消费了三份全文。相关交付 [native-delivery-final.md](native-delivery-final.md) 保留该限制和 search_context 恢复过程。

## 原生派发

首轮真实 trellis_subagent 派发 research，会话 `01a135b0-d44d-707b-a24a-1c3e43f64283`，代理日志 `.tmp/trellis-acp-subagent-tools/native-research-proxy.log` 记录实际 `compress m00012–m00017` 和成功折叠；[native-delivery.md](native-delivery.md) 字段准确。但调用端 120 秒超时取消，因此不将首轮派发的完整运行记为通过。

后续较短的 research 原生派发正常返回，交付 [native-exit.md](native-exit.md)：核对活动任务路径和来源会话，并成功调用 acp_status。主会话日志提取为 `.tmp/trellis-acp-subagent-tools/native-exit-return.json`，记录 `isError=false`、`runs[0].status=succeeded`、三项工具 succeeded，运行从 1791902773072 到 1791902931038（157.966 秒）。该样本没有合法压缩范围，不将其当作主动压缩证据。当前 AC3 的原生交付由此支持；压缩成功由独立原始调用/返回及正常退出样本支持。

联合运行补证见 [子二实验](../../10-13-trellis-acp-reread-loop/research/experiment.md)：同形 implement 子进程同时启用四项 ACP 工具和修复后的上下文规则，final 实际 compress、search_context、decompress、定向检索、正确 write，191.426 秒正常退出。它是直接 CLI 联合场景，不冒充 trellis_subagent 原生派发。

## 修改与回滚

只在 `.pi/agents/trellis-implement.md`、`.pi/agents/trellis-check.md`、`.pi/agents/trellis-research.md` 的 tools 行追加 `compress,decompress,search_context,acp_status`；不开放 acp_cache 或额外业务工具。没有修改启动器、项目设置、用户 ACP 配置、全局设置或安装包。子任务二另改这三个角色的上下文续接规则和 workflow。

仅回滚本子任务时移除四个新增工具名，保留子二文本规则；整体回滚另见子二记录。新白名单影响后续启动的子代理，已启动进程不会热更新。Trellis 模板更新时需保留此项目差异。

## 覆盖限制

三个角色都有实际工具表和状态调用证据；完整压缩覆盖直接 Pi 及 research 原生首轮（首轮完整退出未通过）；后续原生 research 短任务正常返回。最终 implement 同形 CLI 联合样本验证了压缩、搜索和恢复。未验证全部原生角色的完整压缩任务、其他模型、长期大窗口压力或产品阅读器。

usage 观测在 `.tmp/trellis-acp-subagent-tools/metrics.json`；不同样本不能承诺缓存收益。子二按 assistant message_end 去重重算前后 usage，作为本总任务的可比 token/cache 证据。退出诊断发现当前 pi-graft 的 120 秒引用计时器，但未对早期超时逐个采集 async_hooks，不能将它们全部归因为此。
