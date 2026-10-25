# AGENTS.md

## 项目与实现边界

- eHunter 是面向 e-hentai/exhentai、nhentai 的油猴阅读器，支持书页模式和卷轴模式；界面文案与文档使用简体中文为主。
- `core/`、`src/` 是当前实现，新增和修复优先落在这两个目录；`core_old/`、`old/` 不被 `src/`、`core/` 引用，也不参与构建与脚本产物，仅作对照查阅，新增和修复不落在其中，也不复制其结构。
- 入口 `src/main.ts` 根据平台识别结果初始化，并通过 `src/platform/factory.ts` 创建 EH、NH 或 TEST 服务；不支持的平台跳过初始化。根组件目前名为 `core/TestApp.vue`，组件名不表示始终使用测试服务。
- 平台迁移优先保证 `src/platform/eh/` 链路，再处理 `src/platform/nh/`；改 `src/platform/base/` 时同步评估两端影响并记录评审结论。`src/` 与 `core/` 交叉依赖，import 调整取最小改动，重构须可读、可迁移、可回退。

## 技术与 UI 约束

- 使用 Vue 3、TypeScript、Vite；样式以 SCSS 为主，`old/` 下仍有 Less。
- 依赖和版本以 [package.json](package.json) 与锁文件为准；开发构建见 [vite.config.ts](vite.config.ts)，脚本注入产物见 [vite.config.prod.ts](vite.config.prod.ts)（IIFE、CSS 注入）。
- 所有 UI 组件自建，不使用第三方 UI 库；布局默认 flex 并显式指定 `flex-direction`；阅读设置和交互在书页/卷轴模式保持一致，明确限定模式的功能除外。

## 修改前按需读取

- 改变阅读模式、设置或平台设计时，读取[产品目标](.trellis/spec/frontend/product-goals.md)，从[功能索引](.trellis/spec/frontend/features/index.md)找到对应 spec、契约与 quickstart。涉及下载元数据、偏好、翻页默认值或放大镜时先读[已确认决策](.trellis/spec/frontend/decisions/2026-09-18-reader-behavior.md)；目标与当前实现有冲突时，先追溯决策，无法确定的用户可见行为须对齐后修改。
- 涉及 DOM 解析或渲染时，检查选择器稳定性、异步加载与页面结构变化容错；核对书页/卷轴模式一致性、图片加载与缓存、渲染性能和滚动体验，并显式处理异步加载、页码边界与快速连续输入。
- 涉及 EH 的 `ImgUrlListParser`（intro 页抓取与图片页 URL 解析；现役于 `src/platform/eh/service/AlbumServiceImpl.ts`）时，额外检查 `ReqQueue` 并发队列、`TextReq` 超时重试与 intro 页数/页码边界。

## 通知、调试与验收（强制）

- 每次测试开始前执行 [notify-complete](.pi/skills/notify-complete/SKILL.md) 的短通知；每次任务完成后执行长通知（实现、修复、排查、文档、测试、说明均适用）。只有用户明确要求静音或跳过通知时省略。
- 调试产物（日志、截图、trace、临时导出）统一放在仓库 `.tmp/`；功能新增或修改必须完成对应功能测试，纯文档修改验证引用、格式和所述命令，未运行的验收不得报告为通过。
- 非平台改动按[浏览器验收指南](.trellis/spec/frontend/browser-acceptance.md) 启动本地服务并用当前会话的 `ego-browser` 验收；平台改动（`src/platform/**`、注入链路、DOM 抓取、请求适配）使用 [reader-test](.pi/skills/reader-test/SKILL.md) 在 EH/NH 验证。开始调试或页面操作前必须读取对应文档。
- 验收的分类、视口 profile、日志归因、逐项回填与收尾以浏览器验收指南为唯一依据，reader-test 只补 EH/NH 差异、平台特有的准备阻塞与验收节奏和功能清单；基础请求层（`TextReq`、`ReqQueue`、`MultiAsyncReq`）改动优先回归 EH 与 NH 两条链路。
- 交付时说明已验证和未验证范围，清理本次创建且无需保留的服务和临时产物，核实进程退出与端口释放，保留交付物及用户已有资源。

## 技能分工

- 开发收口和提交前验收使用 `trellis-check`（默认自检，可就地修机械问题）；用户要求对分支、PR 或指定提交范围独立审查时使用 `code-review`，或向 `trellis-check` 派发 `review-only`——该模式只读返回 findings，受审代码与测试版本当轮冻结，修复留到下一轮。审查依据优先用对应 Trellis 任务产物与 `.trellis/spec/`，范围含未提交改动时显式检查暂存区与工作区。
- 需求澄清由 `trellis-brainstorm` 主导，压力测试或上层规则要求的追问使用 `grilling` 并回填当前 Trellis 规划；任务内研究交给 `trellis-research`，结论沉淀到 `.trellis/spec/`。Pi 子代理经 `trellis_subagent` 派发 `.pi/agents/` 中已定义的角色，零散探索、规划及独立审查由主会话完成。
- Pi 扩展与技能屏蔽配置见 [.pi/settings.json](.pi/settings.json)：扩展按 `packages` 过滤，屏蔽全局技能须同时列出其 `SKILL.md` 路径和排除规则以覆盖全局发现。

## 文档维护与提交

- 所有文档与代码注释只描述当前状态，不记录任何 AI 历史修改记录、已废止的决策或阶段规划；更新当前状态描述时，不得把尚未确认的实现偏差写成新的业务规则。
- 代码是唯一证据；不写注释，文字说明放在文档里。
- 本文件由人工审阅维护，只保留项目边界、稳定约束和按需读取入口：具体功能约定归 `.trellis/spec/frontend/features/`，版本与依赖归配置文件，操作步骤归上面的专项指南，验收记录留在功能资料或任务内。
- `reset --hard`、强制推送等破坏性 Git 操作仅在用户明确要求时执行。
- 提交前跑 `npm run check`；仓库提供 `.githooks/pre-commit` 自动执行同一命令，新 clone 需要先 `git config core.hooksPath .githooks` 启用（说明见 [工具规范](.trellis/spec/tooling/index.md#本地提交门禁)）。
- 提交信息建议标注作用域，例如 `refactor(core)`、`feat(src)`、`fix(platform-eh)`、`fix(platform-base)`、`fix(parser)`；迁移说明注明来源目录、目标目录和原因。
<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

This project is managed by Trellis. The working knowledge you need lives under `.trellis/`:

- `.trellis/workflow.md` — development phases, when to create tasks, skill routing
- `.trellis/spec/` — package- and layer-scoped coding guidelines (read before writing code in a given layer)
- `.trellis/workspace/` — per-developer journals and session traces
- `.trellis/tasks/` — active and archived tasks (PRDs, research, jsonl context)

If a Trellis command is available on your platform (e.g. `/trellis:finish-work`, `/trellis:continue`), prefer it over manual steps. Not every platform exposes every command.

If you're using Codex or another agent-capable tool, additional project-scoped helpers may live in:
- `.agents/skills/` — reusable Trellis skills
- `.codex/agents/` — optional custom subagents

Managed by Trellis. Edits outside this block are preserved; edits inside may be overwritten by a future `trellis update`.

<!-- TRELLIS:END -->
