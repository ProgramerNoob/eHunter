# 两项修复集成记录

2026-10-13。仅当前项目内修改；用户级 ACP 配置、全局 Pi 设置、安装包与已有浏览器验收工作区保持原样。

## 修复和证据

子任务一在三个角色原工具白名单中追加 `compress,decompress,search_context,acp_status`；真实请求工具表及成功调用已核对，implement/check 保留 edit，research 没有新增 edit。直接 Pi 的 compress-full 样本压缩成功、事实正确并正常退出；真实 research 原生短派发交付任务路径及 ACP 状态并正常返回。详见 [运行记录](../../10-13-trellis-acp-subagent-tools/research/runtime.md)。

子任务二将角色与 workflow 的强制重复加载改为复用完整注入内容，缺失/截断/变化/新锚点才读；三个角色在压缩前后保留进度和下一动作。对照中任务/规范读取从 6 次降到 0 次；全部 read 从 10 次降到 3 次。三个新 fixture 仍各读一次；按缺失字段恢复摘要仍允许。历史长循环未重现，有限受测轨迹无连续两轮相同整组无推进读取。详见 [有限实验](../../10-13-trellis-acp-reread-loop/research/experiment.md)。

联合代表样本为 final：直接 CLI 加载 implement 角色规则和当前四项 ACP 白名单，使用同形 no-session 启动，读取三个 fixture 后实际压缩，再 search/decompress/定向检索，写出正确 `eh-731 / 96 / 7c92de41` 与任务路径，10 请求，191.426 秒自然 exit 0。它证明两项修改同时工作，不将直接 CLI 说成原生派发。原生链路的交付证据另见子一 research；最终正式审查也由真实 trellis-check 派发。

## 失败和范围

after2 在模型已写出正确交付后达到执行器上限，exit -15/timeout 保留为旧 partial；其一次 server_error 不计 token 但计请求数。final 是单独的正常退出复测，不改写旧结果、无豁免。退出探针定位当前 pi-graft 120 秒引用计时器，安装包未改；不能由它断言所有历史超时根因相同。

所有 token/cache 数字按 assistant message_end 去重，final cacheRead 比例 42.72%，before 45.19%；没有承诺缓存收益。未运行主会话长窗口、其他模型、全部原生角色完整压缩、产品浏览器、EH/NH、type-check 或构建。

## 项目差异与回滚

运行规则只改 `.pi/agents/trellis-implement.md`、`.pi/agents/trellis-check.md`、`.pi/agents/trellis-research.md` 和 `.trellis/workflow.md`。规范沉淀到 `.trellis/spec/tooling/index.md`、`pi-context.md`，三个任务各保存规划/验收/research。新启动的子代理读取新白名单；已运行子代理不会热更新。

回滚子一只移除四个新增工具；回滚子二撤销三个角色的上下文续接差异和 workflow 对应差异。整体回滚另撤销新增 tooling 规范及任务资料，保留本轮之前的工作区改动。基线 SHA256 对比覆盖用户 ACP 配置、全局 Pi 设置、启动器、项目 settings，以及已存在的四个浏览器相关修改文件，均保持原样；其余已有未跟踪浏览器文件未纳入修改或提交。

## 收口

各任务 acceptance.json 是当前验收状态来源，旧 after2 记录保存在 `.tmp/trellis-acp-reread-loop/acceptance-before-final.json`。原始日志仍保留在 `.tmp/` 供复查，不作为 Git 提交文件。最终审查结果单独记入 research/final-review.md；提交与归档尚未执行。
