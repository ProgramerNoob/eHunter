# Design: 复盘遗留改进收口

来源：`.trellis/tasks/archive/2026-10/10-11-project-session-retrospective/research/report.md` 候选 03/04/05/06。四项互相独立，无依赖顺序；按 04 → 05 → 06 → 03 执行仅因改动量从小到大。

## 04 · 审查职责冲突

### 现状事实

- `.pi/agents/trellis-check.md:23`：`Review and fix directly.`（子代理角色定义）
- `.agents/skills/trellis-check/SKILL.md` 第 5 节 "Report and fix"：机械问题就地修，设计问题记录并停止——本身已是分层表述，但标题和入口没有区分"自检"与"正式审查"。
- 全局 `~/.pi/agent/AGENTS.md:20`：`正式审查在编码和相关测试完成后启动，期间固定代码与测试版本；新修复留到下一轮。`
- 项目 `AGENTS.md:40`：`开发收口和提交前验收使用 trellis-check；用户明确要求对分支、PR 或指定提交范围独立审查时使用 code-review`。
- 独立审查角色已存在：`code-review` skill（只读，Standards/Spec 双轴并行子代理，汇报不修改）。

### 方案

不新增角色，采用"一个角色、两种模式、入口选择"：

1. **`.pi/agents/trellis-check.md`**：把 `Review and fix directly` 改为模式化表述——默认自检模式（fix mechanical issues in scope）；当派发方在 prompt 中声明 `review-only`（正式审查场景）时，只读返回 findings，不修改受审文件。frontmatter description 同步更新。
2. **`.agents/skills/trellis-check/SKILL.md`** 第 5 节：明确两种模式的触发条件和行为差异。
3. **项目 `AGENTS.md`** 技能分工段：补一句正式审查的派发方式（`code-review`，或向 trellis-check 显式声明 `review-only`），与全局"冻结版本"规则呼应。
4. **`.trellis/spec/tooling/pi-context.md`**：记录该契约，列入 `trellis update` 后的复查清单（第 8 节已有此机制）。

### 边界与权衡

- 不改 code-review skill；不引入"审查代理自动检测模式"的魔法——模式由派发方显式声明，缺省为自检，保持向后兼容。
- 子代理无法强制自己不写文件（白名单含 write/edit），约束靠 prompt 契约 + 主会话派发时声明。这是现行架构下最小改动；机械强制（裁剪工具白名单）需要扩展启动器支持，超出本项范围，作为已知限制记录。

## 05 · 归档未跟踪路径提交错误

### 现状事实

`.trellis/scripts/common/task_store.py` `_auto_commit_archive()`：

- L1491-1495：已算出 `source_was_tracked`（`git ls-files -- source_rel` 非空）。
- L1528-1531：`git rm -r --cached --ignore-unmatch -- source_rel` 对未跟踪任务是 no-op，暂存区无 source 侧删除。
- L1555：`git commit -m msg -- *paths source_rel` **无条件**包含 `source_rel`。未跟踪任务归档时，`source_rel` 不匹配任何已知路径，commit 以非零退出，打 `[WARN] Auto-commit failed`；目录已移动，需手工补提交。
- 各失败分支已返回 `not source_was_tracked`（未跟踪时整体视为成功），问题只在 commit pathspec 本身。

### 方案

在 L1555 前构造 commit pathspec：`source_was_tracked` 为真才追加 `source_rel`。同时：

- L1540 `git diff --cached --quiet -- *paths source_rel` 同样条件化（未跟踪时 source_rel 对 diff 无害，但保持一致语义，统一用一个 `commit_paths` 变量）。
- `git rm --cached` 保留无条件执行（`--ignore-unmatch` 已保证安全）。
- 失败分支返回逻辑不变。

### 测试

新增 `tests/archive-autocommit.test.mjs`（node:test），在 `tests/helpers` 下的临时 git 仓库中注入 `git` PATH stub 记录参数并模拟行为，直接调用 `_auto_commit_archive` 等价路径；或更简单——抽不出纯函数时，用 stub git 端到端跑 `task.py archive` 太重。采用折中：把"构造 commit pathspec"提成模块级小函数 `_archive_commit_paths(paths, source_rel, source_was_tracked)`，单元测试覆盖三场景（未跟踪/已跟踪/含 modified_children），再用 stub git 做一次集成验证确认不再 WARN。纳入 `npm test` 链（`package.json` scripts 增加对应条目或并入现有 node --test 行）。

### 边界

- 不改 `safe_archive_paths_to_add` 的窄 scope 设计；不改 `session_auto_commit: false` 旁路。
- 适合上游 Trellis 的最小修复形态，不增加常驻手工绕过指令。

## 06 · 待办入口同步与文档检查

### 06A · pending-work.md 同步（小改动）

`.trellis/spec/frontend/features/pending-work.md:24` 末尾 `仍有一处遗留：T024 的两处可选硬化（标题 overflow-wrap、通知列表 max-height/overflow-y）未做` 与实现不符：

- `core/components/status/StatusNotificationItem.vue:69` 已有 `overflow-wrap: anywhere`
- `core/components/status/StatusNotificationStack.vue:44-45` 已有 `max-height: calc(100vh - 48px)` / `overflow-y: auto`

改为注明两项硬化已存在于实现（附文件:行号），保留历史基线计数口径不动。

### 06B · 文档检查脚本

复盘提到的 S19 检查是历史会话产物，脚本未留存（需先确认 `.tmp/` 无残留再决定从零写）。范围收敛到**当前 `.trellis/spec/` 树**的最小有区分力检查：

1. Markdown 相对链接目标存在（含跨目录）；`http(s)` 外链只记录不校验。
2. 链接锚点（`#fragment`）在目标文件中存在对应标题——复盘指出旧脚本去掉了 fragment 导致锚点未验，本次补上（GitHub 风格 slug 化）。
3. OpenAPI `$ref` 本地文件目标存在。

显式不做：T 编号/FR 编号交叉核验（历史计数口径敏感，误报成本高）、正文状态矛盾判断（归审查者）。

产物：`scripts/check-docs.mjs`，零依赖（Node 标准库），接入 `npm run check` 链尾。断链/坏锚点/坏 `$ref` 非零退出。历史计划中的未来产物文件名（如平台四份 `validation-us*.md`）若在链接中出现会误报——先跑一次看实际命中，必要时用最小允许清单并在脚本注释说明来源。

## 03 · 浏览器准备断言评估

### 现状事实（`scripts/browser-preflight.mjs`，757 行）

已覆盖（`requireCondition` 失败即 `PreflightBlocked`，结果记 blocked 不进入 checks）：

- DPR 精确匹配（L328）、touchPoints/coarse 匹配（L329）、严格模式 CSS 视口宽高匹配（L330）
- CDP Emulation 命令回执核对（L322-327）
- 产物指纹：源码输入指纹、EH bundle/loader 身份与 sha256、轮次内不变性（`unchanged()`）
- grant/connect 等价 + 本地地址覆盖（`permissions()`，L63-85）
- eHunter 运行时/初始化 severe 日志阻断、未归因 severe 阻断（`checkLogs()`）
- Vite HMR 失效阻断、vite-error-overlay 检测（`observePage().overlay`）
- 原站 viewport meta 恢复验证（L589-591）

复盘报告第 03 项列的缺口中，"DPR/mobile/旧包/权限断言、blocked 语义"实际上已被 2026-10-14 的浏览器预检落地覆盖（该工作在复盘之后完成）。剩余真实缺口：

1. **真实下载冒烟**：小画廊下载后检查 ZIP 内图片条目与有效内容（防"仅 metadata 的 ZIP 伪绿"）。涉及 GM 下载链路与真实 EH 环境，属 eh-test 场景而非 vite 预检。
2. **断言清单文档化**：预检能力分散在源码注释和测试里，没有一份"已覆盖/未覆盖"对照表供验收者引用。

### 方案

本任务只做 03 的**评估与收口**，不做下载冒烟实现：

1. 产出 `.trellis/spec/frontend/browser-acceptance.md` 增补一节（或独立 `preflight-coverage.md`，倾向并入 browser-acceptance.md 减少入口）：列出预检已覆盖断言清单（对照源码函数）、已知未覆盖项（下载冒烟、物理设备、Node22/Python3.12 矩阵）及各自归属场景。
2. 下载冒烟记录为后续独立任务候选（需要真实 EH 登录环境和小画廊样本，不适合与工具链改动混在一起）。
3. 若评估中发现清单与实现不符的低成本缺口（如某断言存在但未阻断），顺手修并回归 `npm run test:browser-preflight`。

这样 03 的验收标准"明确已覆盖/未覆盖清单、缺失项有实现或有不做的理由"即可达成，且范围可控。

## 兼容性

- 04 只改文档/prompt 文本，不影响派发器代码路径；lean 上下文契约（pi-context.md 第 8 节）的三条回归命令必须重跑。
- 05 改动局限于 `_auto_commit_archive` 与一个抽出的纯函数；归档 CLI 行为对未跟踪任务从"WARN + 返回真"变为"正常提交"，对已跟踪任务无变化。
- 06B 接入 `npm run check` 后成为 CI 门禁一部分，必须先在当前树上跑绿再接入。
- 03 只加文档，不动预检代码逻辑（除非发现低成本缺陷）。

## 回滚

四项各自独立 commit，可分别 revert。06B 若接入后发现误报，先从 `npm run check` 摘掉脚本再修。
