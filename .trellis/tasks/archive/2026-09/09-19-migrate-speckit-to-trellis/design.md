# 迁移设计

## 边界与存放位置

沿用现有 `.trellis/spec/frontend/` 工程层与旧功能目录边界，不新增 Trellis package、运行时或规范加载机制。迁入后由 frontend 索引和 AGENTS 的按需读取入口发现。

| 旧来源 | 新位置/处理 |
| --- | --- |
| 根 `design.md` | `.trellis/spec/frontend/product-goals.md`，保留全文和目标状态说明 |
| `specs/decisions/2026-09-18-reader-behavior.md` | `.trellis/spec/frontend/decisions/2026-09-18-reader-behavior.md` |
| `specs/<feature>/**`（7 组、56 文件） | `.trellis/spec/frontend/features/<feature>/**`，保留目录名、契约、需求 ID、任务 ID、勾选、证据和历史解释 |
| `.pi/browser-testing.md` | `.trellis/spec/frontend/browser-acceptance.md`，完整保留操作流程，重算相对链接 |
| `.specify/memory/constitution.md` | 稳定原则映射并补齐到现有 AGENTS 与工程指南；Spec Kit 专用治理退役，逐条结果写入迁移报告 |
| `.pi/speckit-maintenance.md` | 人工维护上下文的边界并入 AGENTS；工具维护历史记录在迁移审计，旧文档移除 |
| `.specify/` 其余文件、15 个 speckit prompts | 移除，源清单逐个记录路径、基线哈希和退役理由 |

新建 `features/index.md` 作为 7 组功能的导航，列出每组需求、契约、验收和历史记录；新建 `features/pending-work.md` 汇总 114 个未勾 tasks 编号及 checklist/quickstart 的独立状态。它们是迁移记录与后续工作的发现入口，不自动创建 114 个新任务或在本次实现历史功能。

## 内容权威与状态

- 已确认行为决策对覆盖到的旧目标、规格和计划具有优先级。把决策入口放到产品目标、功能索引及相关规范的读取路径上。
- 产品目标和 Draft spec 不等于当前实现。代码事实与目标冲突时保留差异，后续改变行为前对齐。
- `plan.md`、`research.md`、`tasks.md` 作为迁移历史保留，在入口及必要文件前言明确其性质。任务勾选、未勾、实际验收和未修缺陷不更改。
- 仍有价值的 quickstart 成为当前功能验收参考；已完成操作保持历史时态。退役命令/模板引用标注“历史记录，不执行”，当前流程指向 `.trellis/workflow.md`。
- 保留历史来源路径用于追溯，不把历史来源当成当前可点击依赖。所有实际导航链接指向存在的新文件。
- 重点差异：平台 60 秒契约与当前 120000ms 超时、T043–T082/T098 的陈旧清单、T149 未修、放大镜和下载不同清单的勾选不一致。

## 引用与集成

更新 AGENTS 非托管区、frontend 相关指南、EH 技能的两个浏览器链接、README 双语目录及 `.npmignore`。保留 Trellis 托管块及 Trellis prompts/agents/extensions 原样。

`.pi/settings.json` 是被忽略的本机配置。只移除 `-prompts/speckit.*.md` 对应的 15 个已知禁用项；保留其余字段与条目，验证 JSON 可读且差异仅限该范围，保持忽略状态。

迁移不触碰 `core/`、`src/`、依赖、构建配置、用户脚本加载器、通用 Trellis 脚本与模板哈希。用户已要求删除的目录内 Finder 元数据和 Spec Kit 功能指针随目录清理。

## 保全与验收设计

源基线见 `research/source-inventory.json`：115 个受版本控制文件逐个映射，保留文件哈希、处理类型及目标。功能资料在规范化路径改写与历史注释之外保持内容；审查比较迁移前后正文、需求 ID、任务 ID/状态、契约内容和验收记录。特别验证所有未勾项目均可从 frontend 入口访问。

引用检查同时识别 Markdown 链接、仓库路径、命令、契约 `$ref`、历史记录与示例占位符；不存在的旧证据/计划产物应标明未产出或仅历史记录，不伪造文件来使检查通过。

文档范围验证包括：`git diff --check`、迁移清单全覆盖、文件/任务计数、有效链接与锚点、退役入口残留检查、任务 JSONL 验证、Trellis packages/context 发现、npm 发布排除清单及实际 diff 范围。独立审查在修改与检查结束后对固定版本启动。

不运行产品构建、类型检查或浏览器验收：本次仅迁移文档/工作流，命令只做静态核对及必要的开发工具读取验证。交付明确这些未运行范围。

## 回退与风险

全部受版本控制源文件位于 `647ff26`。在迁入内容及链接检查通过后才删除对应源文件；提交前可按迁移清单从该基线恢复单个文件，恢复前确认没有覆盖后续用户修改。无需改写 Git 历史。

本机 settings 在修改前生成本任务临时副本到 `.tmp/`，不打印内容、不提交；差异验证成功后清理该临时副本。无需启动服务或浏览器。

风险主要是目录层级变化导致相对链接错位，以及将历史状态误当成当前完成事实。采用一对一保全、明确状态前言、逐文件清单和独立审查控制这些风险；不把旧规范改写为未经验证的“当前事实”。
