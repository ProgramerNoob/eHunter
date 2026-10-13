# 初始证据与验证边界

日期：2026-10-13。用途：规划依据；不代表功能验收通过。

## 历史交接
来源：[2026-10-13-agent-context-review.md](2026-10-13-agent-context-review.md)。
文档报告：
- Trellis 子代理白名单不含 ACP 工具，部分子会话发生 nudge 抑制、preflight 失败与输出预算缩减。
- S2：139 请求、20,099,357 input tokens、55.4% cache hit、23 次 zero-hit；对照会话 97.6% 命中。
- S2 收尾 16 分钟：零写入、同组 5 文件完整重读 8 次、compress 12 次。
本轮未重新解析日志；不同会话的缓存命中率不能独立证明压缩是全部差异的原因。

## 本轮静态核查
- `.pi/extensions/trellis/index.ts`：resolveRunCfg 返回 tools: agentCfg.tools；buildPiArgs 使用 ["--mode", "json", "-p", "--no-session"]，并传入 cfg.tools.join(",")。
- `.pi/agents/trellis-implement.md:5`、`.pi/agents/trellis-check.md:5`：read, write, edit, bash, find, grep。
- `.pi/agents/trellis-research.md:5`：read, write, bash, find, grep。
- `/Users/warwick/.pi/agent/settings.json`：npm:billion-context 的 extensions 包含 +dist/agent/pi-native.js。
- `.pi/settings.json`：当前 packages 中没有 billion-context 项；与交接文档中存在屏蔽项的描述不同。仍需验证实际子进程的加载结果。
- `/Users/warwick/.config/billion-context/billion-context.json`：compress 为 {"promptPack":"lean"}，pi.subagents 为 false，providers 为空。没有在本轮核查默认阈值或环境变量覆盖。
- Graft 查询确认 .pi/ 未被索引，因此本轮直接读取目标源码片段和配置。
- 项目验收 CLI 位于 `scripts/acceptance.py`，不是 `.trellis/scripts/acceptance.py`；后者调用返回文件不存在，后续使用正确入口。

## 后续实验必须区分
1. 模型声称有哪些工具，与实际请求中暴露的工具、成功调用的结果不是同一证据。
2. 日志出现 fold= 只能证明发生折叠；需要关联子会话中的 compress 调用与结果，才能证明模型主动压缩。
3. 加白名单后工具仍不可见，可能涉及加载、注册时机或过滤；不能直接断言扩展未加载。
4. --no-session 是否支持可压缩范围，尚未验证。
5. 不重放长时间空转；使用有限、可审计的任务输入和停止条件，日志放入 .tmp/。
6. 用户已同意创建任务，并选择仅当前项目内修复；保留用户级 ACP 配置、全局 Pi 设置及安装包。最新实施方案尚待审阅。

## 现有工作区边界
本轮开始前已有 .pi/skills/eh-test/SKILL.md、.trellis/spec/frontend/browser-acceptance.md、.trellis/spec/frontend/quality-guidelines.md、package.json 的修改，以及浏览器验收任务、scripts/__pycache__/、scripts/browser-preflight.mjs、tests/browser-preflight.test.mjs 的未跟踪内容。本任务创建阶段只新增当前任务树及 Trellis 会话指针。
