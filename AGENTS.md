# AGENTS.md

## 项目与实现边界

- eHunter 是面向 e-hentai/exhentai、nhentai 的油猴阅读器，支持书页模式和卷轴模式；项目仍处于重构阶段。
- `core/`、`src/` 是当前实现，新增和修复优先落在这两个目录；`core_old/`、`old/` 是历史实现，修改时须说明目的，参考时避免直接复制旧结构。
- 入口 `src/main.ts` 根据平台识别结果初始化，并通过 `src/platform/factory.ts` 创建 EH、NH 或 TEST 服务；不支持的平台跳过初始化。根组件目前名为 `core/TestApp.vue`，组件名不表示始终使用测试服务。
- 平台迁移优先保证 `src/platform/eh/` 链路，再处理 `src/platform/nh/`；修改 `src/platform/base/` 时同步评估两端影响并记录评审结论。
- `src/` 与 `core/` 存在交叉依赖，import 调整采用最小改动，避免一次性大迁移。重构需可读、可迁移、可回退。

## 技术与 UI 约束

- 使用 Vue 3、TypeScript、Vite；当前样式以 SCSS 为主，历史样式含 Less。
- 依赖和版本以 [package.json](package.json) 与锁文件为准；开发构建见 [vite.config.ts](vite.config.ts)，脚本注入产物见 [vite.config.prod.ts](vite.config.prod.ts)（IIFE、CSS 注入）。
- 所有 UI 组件自建，不使用第三方 UI 库；阅读设置和交互在书页/卷轴模式保持一致，明确限定模式的功能除外。
- UI 默认使用 flex 布局，显式指定 `flex-direction`。

## 修改前按需读取

- 改变阅读模式、设置或平台设计时，读取[产品目标](.trellis/spec/frontend/product-goals.md)，从[功能索引](.trellis/spec/frontend/features/index.md)找到对应 spec、契约与 quickstart。涉及下载元数据、偏好、翻页默认值或放大镜时先读[已确认决策](.trellis/spec/frontend/decisions/2026-09-18-reader-behavior.md)；目标、历史计划与当前实现有冲突时，先追溯决策，无法确定的用户可见行为须对齐后修改。
- 涉及 DOM 解析时，检查选择器稳定性、异步加载和页面结构变化的容错。
- 涉及渲染时，检查书页/卷轴模式一致性、图片加载与缓存、渲染性能和滚动体验；解析、缓存、请求队列和阅读交互须显式处理异步加载、页码边界与快速连续输入。
- 涉及 EH 的 `AlbumCacheService`、`ImgUrlListParser` 时，额外检查 Normal/Large 缩略图切换、缓存版本迁移与刷新、并发队列及超时重试。

## 通知、调试与验收（强制）

- 每次测试开始前执行 [notify-complete](.pi/skills/notify-complete/SKILL.md) 的短通知；每次任务完成后执行长通知（实现、修复、排查、文档、测试、说明均适用）。只有用户明确要求静音或跳过通知时省略。
- 日志、截图、trace、临时导出等调试产物统一放在仓库 `.tmp/` 下。
- 每次功能新增或修改后必须完成对应功能测试。纯文档修改验证引用、格式和所述命令；未运行的功能验收不得报告为通过。
- 非平台功能改动：按[浏览器验收指南](.trellis/spec/frontend/browser-acceptance.md) 启动本地后台服务并使用当前会话的 `ego-browser` 技能验收。指南集中维护服务归属与清理、任务空间、视口、控制台日志、刷新和截图流程；开始调试或页面操作前必须读取。
- 平台改动（尤其 `src/platform/**`、注入链路、DOM 抓取、请求适配）：使用 [eh-test](.pi/skills/eh-test/SKILL.md)，在 EH 场景验证实际表现。
- 浏览器验收须确认本次代码已加载、无 Vite 编译错误，检查控制台与未捕获异常，完成涉及的打开/关闭、切换、数据抓取、渲染和异常分支。
- UI 改动须按浏览器指南完成桌面和移动两种视口的关键交互、截图与视觉检查；涉及断点时补测边界。
- 抓取、解析、缓存改动至少验证首屏页数/标题/当前页、书页与卷轴切换、缩略图加载与定位，以及平台支持的原图/换源操作。
- 修改 `TextReq`、`ReqQueue`、`MultiAsyncReq` 等基础请求层时，优先回归 EH 与 NH 两条链路。
- 交付时说明已验证和未验证范围；清理本次创建且无需保留的服务和临时产物，核实进程退出与端口释放，保留交付物及用户已有资源。

## 技能分工

- 开发收口和提交前验收使用 `trellis-check`；用户明确要求对分支、PR 或指定提交范围独立审查时使用 `code-review`。审查依据优先使用对应 Trellis 任务产物和 `.trellis/spec/`，未配置 Issue tracker 时使用本地资料；范围含未提交改动时，显式检查暂存区与工作区。
- 常规需求澄清由 `trellis-brainstorm` 主导；压力测试或上层规则要求的追问使用 `grilling`，由它主导该轮提问，结论回填当前 Trellis 规划。
- Trellis 任务内的研究交给 `trellis-research`；规范、术语和决策沉淀到 `.trellis/spec/` 对应文档。
- Pi 子代理通过 `trellis_subagent` 派发 `.pi/agents/` 中已定义的角色；无活动 Trellis 任务的零散探索、规划及独立审查由主会话完成，独立审查仍分别覆盖 Standards 与 Spec。
- Pi 扩展与技能屏蔽配置见 [.pi/settings.json](.pi/settings.json)。扩展通过 `packages` 的项目覆盖筛选；屏蔽全局技能时须同时显式列出其 `SKILL.md` 路径和排除规则，使项目配置覆盖全局发现。

## 文档维护与提交

- 本文件保留项目边界、稳定约束和按需读取入口；具体功能约定归 `.trellis/spec/frontend/features/`，版本/依赖归配置文件，操作步骤归上面的专项指南。
- 本文件非 Trellis 托管区由人工审阅维护；只合入经当前实现核实的稳定约束，具体功能规则和验收记录留在功能资料或任务内。
- 用户故事须可独立实现、独立验收，包含接受场景与验证标准；交付记录涉及的书页/卷轴与 EH/NH 边界、实际检查结果和未验证项。
- `reset --hard`、强制推送等破坏性 Git 操作仅在用户明确要求时执行。
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

<!-- graft:start -->
## Graft — repo context graph

This repo is indexed in `graft/`: small linked markdown nodes that explain each
system and carry exact file:line spans, kept in sync with the code through git.

For ANY task here — understanding how something works, finding where code lives,
or scoping a change — get context from the graph before grepping or opening
source files. Re-ask freely (it's cheap) and reuse literal identifiers you
already have (symbol, error string, file name) as the query. New to this repo?
Run `graft map` first — a token-budgeted orientation (dir clusters, hubs,
hotspots), no LLM, no key.

- Run `graft ask "<your question>" --source` → ranked nodes with the relevant
  code spans inlined (each hit's ≤8-line crux by default; `--full` for whole
  definitions when the crux isn't enough). Match the tool to the task shape:
  for understanding or editing, the top node IS the answer — cite its
  `covers:` file:line spans and edit straight from `--source`. For
  exhaustive tasks ("every occurrence / every caller of this pattern"), ranked
  results are top-N, not complete — run `graft grep "<literal>"` instead
  (exhaustive over indexed files, grouped by enclosing symbol), falling back
  to raw `grep -rn` only for unindexed files.
- `graft skeleton <file>` → every definition's signature + span, ~10× cheaper
  than reading the file; use it to skim an API surface.
- `graft callers <symbol>` gives precomputed, exact edges — who calls this.
  Add `--direction out` for what it calls, or `--depth N` to walk
  transitively for the full blast radius. For structural questions, skip
  ranking and use this directly.
- Or browse: `graft/INDEX.md` lists every node; follow the links.
- Monorepos and folders of multiple repos rank fairly across sub-projects —
  hits carry `[scope/]` labels naming which one they're from. Narrow with
  `graft ask "<task>" --in <scope>/` once you know where you're working.

If a returned span is truncated ("+N more lines"), open the file at that exact
range before finalizing. Only open source files when a node genuinely lacks a
needed detail, and then at the exact file:line the node points to — never
re-read whole files.

After big code changes, refresh the graph with `graft build` (deterministic,
no API key, $0).
<!-- graft:end -->
