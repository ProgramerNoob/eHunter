# 技术设计

## 当前链路
.pi/agents/trellis-*.md 的 tools → resolveRunCfg → buildPiArgs → pi --mode json -p --no-session --tools。
源码已确认原样传递白名单；具体 Pi 版本的过滤和扩展注册行为还需运行证据，不能只凭交接文档推断。

## 最小验证
主会话直接启动两组受限子进程：read,bash，以及 read,bash,compress,acp_status。
保持模型、工作目录和提示词一致，检查工具暴露并尝试调用 acp_status。模型口述工具名只作辅助证据。
之后构造小型多轮任务：读取带校验事实的受控文件、执行独立步骤，待出现合法可压缩范围再压缩已消费内容，最后核对保留事实和交付物。
--no-session 若没有范围，先区分轮数不足、ACP 接管失败与持久化依赖；不直接移除该参数。

## 修复分支
1. 白名单补充即可工作：优先修改三个角色 frontmatter，加入实际验证所需的 ACP 工具；从 compress、acp_status 起验证，按角色任务补足需要的恢复/检索能力。
2. 工具仍不可见：核查实际子进程扩展加载、注册时机和白名单过滤。只有确认项目配置或启动器是缺口时，修改 .pi/settings.json 或 .pi/extensions/trellis/index.ts 的相应局部。
3. 项目内无法恢复真实压缩：保留失败证据并回到规划，不改全局配置或安装包。

不关闭全部工具限制；工具可见不等于压缩成功。acp_cache 属于诊断能力，不作为压缩成功的必要条件。

## 兼容与证据
分别检查 implement/check/research 的角色白名单；至少一个代表性角色必须跑真实 Trellis 派发和完整压缩任务，其余覆盖范围如实记录。
直接 pi 实验不能替代真实 trellis_subagent 集成验收。
如果修改启动参数生成逻辑，为参数合并、去重及原工具保留增加针对性测试；纯 frontmatter 修改通过解析与真实派发验证。
升级覆盖风险与回滚差异写入交付记录。
