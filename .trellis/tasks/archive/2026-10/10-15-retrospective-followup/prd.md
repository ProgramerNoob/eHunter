# PRD: 复盘遗留改进收口

## 来源

`.trellis/tasks/archive/2026-10/10-11-project-session-retrospective/research/report.md` 中 8 项改进候选。经 2026-10-15 核对：

- **已完成**：01（验收状态汇总）、02（生命周期回归 + 门禁）
- **无需处理**：07/08（Graft 已移除）
- **本任务范围**：03、04、05、06

## 需求

### 04 · 审查职责冲突（P2）

**问题**：`.pi/agents/trellis-check.md:23` 仍写 "Review and fix directly"，与全局 AGENTS 的"正式审查冻结版本、修复留下一轮"矛盾。当 trellis-check 被用于正式审查时，职责歧义导致审查者直接修改受审文件。

**目标**：明确区分"自检允许修"与"正式审查只读返回问题"两种模式，消除歧义。

### 05 · Trellis 归档未跟踪路径提交错误（P2）

**问题**：`.trellis/scripts/common/task_store.py:1556` 无条件把 `source_rel` 放入 `git commit -- ...`，未跟踪任务归档时 commit 失败（`[WARN] Auto-commit failed`）。

**目标**：只在确有源端删除需要提交时加入旧路径，避免未跟踪任务归档失败。

### 06 · 待办入口同步与文档检查（P2）

**问题 A**：`.trellis/spec/frontend/features/pending-work.md:24` 仍写通知硬化"未做"，但 `StatusNotificationItem.vue:69` 已有 `overflow-wrap`，`StatusNotificationStack.vue:44-45` 已有 `max-height/overflow-y`——文档未同步。

**问题 B**：历史文档检查（链接/编号/引用校验，S19 曾核验 36 文件、90 个本地链接、53 个 `$ref`）没有持久化入口。

**目标**：修正遗留说明；把文档检查迁到当前 `.trellis/spec/` 路径并接入收口流程。

### 03 · 浏览器准备断言（P2）

**问题**：现有 `browser-preflight.mjs` 缺少交互前的 CSS 视口/DPR/mobile/产物断言、下载冒烟、grant 等价检查。准备失败时不阻断，导致误验。

**目标**：评估现有预检覆盖范围，补充缺失的前置断言，准备失败记 blocked 不继续。

## 接受标准

- [AC1] 04：trellis-check 的 agent 定义和 skill 文档不再包含"fix directly"指令；正式审查模式明确只读并返回问题列表，自检模式保留修复能力；两种模式的使用场景区分写入相关文档。
- [AC2] 05：未跟踪任务归档不再产生 `Auto-commit failed` 警告；已跟踪任务搬迁归档正常提交；无关已暂存文件不被夹带。
- [AC3] 06：`pending-work.md` 不再推荐已完成的通知硬化；文档检查脚本可运行且断链/坏锚点/坏引用返回非零；历史基线计数保留不被覆盖。
- [AC4] 03：明确当前预检已覆盖/未覆盖的断言清单；缺失断言有实现或有明确不做的理由；准备失败时阻断后续验收并记录 blocked。
## 约束

- 每项改进独立交付、独立验收
- 不引入新的大型工具链
- 复用现有入口和脚本
