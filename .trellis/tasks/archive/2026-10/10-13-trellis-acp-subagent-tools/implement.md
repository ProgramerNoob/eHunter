# 执行计划

## 前置条件
总任务已确认项目内范围。收到最新规划批准后激活本子任务；先由主会话跑最小实验，再依赖修复后的子代理。
实现前读取相关项目规范和实际 agent/extension 文件；.pi/ 当前不在 Graft 索引，采用目标文件检索。

## 步骤
- [x] 记录实际 Pi/ACP 版本、模型、相关配置摘要及本轮文件基线，原始证据放 .tmp/trellis-acp-subagent-tools/。
- [x] 测试前执行短通知；为每次子进程实验设置 120 秒初始上限，捕获输出和退出状态，超时不自动重复。
- [x] 运行工具白名单对照，保存真实调用结果与可用的请求工具表证据。
- [x] 在 --no-session 子进程中验证合法范围、主动 compress 和压缩后事实保留。
- [x] 按 design.md 的证据分支选择最小修复；优先 frontmatter。涉及多文件启动逻辑时先追踪所有调用方。
- [x] 仅在需要修改实现代码时派发 trellis-implement；派发首行使用 task.py current 返回的活动任务路径。
- [x] 验证三个角色的工具声明与限制，运行真实 trellis_subagent 代表任务，核对实际交付物。
- [x] 编码与相关测试完成后固定版本，使用 trellis-check 审查规范、接受标准及回滚说明。
- [x] 更新 acceptance.json 和研究记录；明确未验证角色/模型，移交总任务。

## 白名单对照命令
从仓库根目录通过带超时、输出捕获的测试执行器运行：
```bash
pi --mode json -p --no-session --tools read,bash "只列出当前工具名；不要读取项目文件或执行其他操作"
pi --mode json -p --no-session --tools read,bash,compress,acp_status "先列出当前工具名，再调用一次 acp_status；不要读取项目文件或修改文件"
```
默认模型必须先核对一致；这些命令只是工具可见性实验，不是压缩通过证据。

## 校验命令
```bash
python3 .trellis/scripts/task.py validate .trellis/tasks/10-13-trellis-acp-subagent-tools
python3 scripts/acceptance.py summarize .trellis/tasks/10-13-trellis-acp-subagent-tools
```

## 失败与回滚
连续三次相同失败停止，汇总子代理状态、错误和可疑假设后再决定下一轮。
不通过放宽全局配置、开放全部工具或升级安装包绕过问题。回滚仅撤销本子任务的配置/源码差异。

最终审查记录：父任务 `research/final-review.md`，无阻塞项；验收以各任务 acceptance.json 的最终 summarize 为准。
