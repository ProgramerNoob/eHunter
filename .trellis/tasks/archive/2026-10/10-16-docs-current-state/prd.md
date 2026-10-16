# 文档与注释只描述当前状态

## Goal

为项目提示词增加两条硬要求，并让当前仓库符合这两条要求：文档与代码注释只描述**当前**状态，不保留 AI 修改历史、已作废决策或阶段规划；代码是唯一证据，行为约束写进 `.trellis/spec/`，不写进注释。

动机：过时信息会让 agent 把已废止的规则当成现行规则（例如把某次开发的 `Phase 1`–`Phase 5` 规划、被决策 B 取代的决策 A 当作现状），既误导实现，也降低文档可读性。

## Background and constraints

- 仓库现有的 `.trellis/spec/frontend/features/001-*/` 是 spec-kit 迁入的完整产物：每个功能都有 `plan.md`、`research.md`、`tasks.md`、`checklists/requirements.md`，内容含 `Phase 1`–`Phase 6`、`T001`–`T149` 编号、`<!-- migration-note:start -->` 块、"历史实现状态"等记录时态文字。
- 代码注释含两类：叙述性/历史性（描述演进、已被取代的做法、迁移来源）与结构性指令（`/// <reference types="vite-svg-loader" />`、SCSS 注释、`.vue` 的 `<style>` 内分隔注释）。只有前者属于本次清理范围。
- `core/store/app.ts` 的 `legacyMigrationPreferenceKey`、`LegacyImportState`、`legacyImportStatusBlocked` 等是**现役**兼容机制，不是历史叙述；其行为与数据形状属于当前契约。
- `AGENTS.md` 第 53–73 行是 Trellis 托管块，不得手工编辑；本次新增要求写在第 52 行之前。
- `.trellis/tasks/archive/**` 与 `.trellis/workspace/**` 是 Trellis 的历史记录载体，按设计保留历史，不在清理范围。
- `scripts/check-docs.mjs` 会校验 `.trellis/spec/` 树内的链接与锚点；删除文件后必须同步引用，否则 `npm run check:docs` 失败。

## Requirements

- R1 项目提示词新增两条要求，写进 `AGENTS.md` 非托管区：
  - R1.1 所有文档和代码注释均描述当前状态，不得记录任何 AI 历史修改记录；更新当前状态描述时，不得把尚未确认的实现偏差写成新的业务规则。
  - R1.2 代码是唯一证据；不写注释，文字说明放在文档里。
- R2 删除 `.trellis/spec/frontend/features/` 下的 spec-kit 计划型产物：7 组 × `plan.md`/`research.md`/`tasks.md` 共 21 个，加 7 个 `checklists/requirements.md`，合计 28 个文件。
- R3 保留并改写保留下来的功能资料，使其只描述当前状态：每组 `spec.md`、`data-model.md`、`quickstart.md`、`contracts/*`；删掉指向已删文件的链接与"历史勾选/记录时态"说明。
- R4 重写 `.trellis/spec/frontend/features/index.md` 与 `pending-work.md`：前者只做当前实现与契约的导航，后者只保留仍未收口的工作项，不再引用已删清单，不再保留"迁移基线口径"的计数表。
- R5 删除 `.trellis/spec/` 内其余文档中的历史叙述：`<!-- migration-note:start -->` 块、"历史不变量/后续另行处理"这类记录时态段落；把"已确认决策"改写成当前生效的行为契约指针（不含演进史）。
- R6 清理 `core/`、`src/platform/` 现役代码中的叙述性注释；结构性指令（`/// <reference>`、SCSS 注释、Vue SFC 段注释）保留。`core_old/`、`old/` 不参与本轮。
- R7 删除注释前，先把其中承载的行为约束补进 `.trellis/spec/frontend/state-management.md` 的当前行为描述；不得只删不补。
- R8 改写 `AGENTS.md` 中 `core_old/`、`old/` 的表述：从"历史实现"改为当前用途描述（不被引用的参考实现、不参与构建、不复制其结构）。
- R9 同步 `README.md`、`README_CN.md` 的文档导航表述，去掉"历史待办/实现历史"这类按记录时态组织链接的说法。

## Acceptance Criteria

- [AC1] `AGENTS.md` 非托管区包含 R1 两条要求，且表述不引入"记录演变过程"的例外口子；Trellis 托管块未被改动。
- [AC2] `.trellis/spec/frontend/features/` 下不再存在 `plan.md`、`research.md`、`tasks.md`、`checklists/requirements.md`。
- [AC3] `npm run check:docs` 退出码 0（无断链、无坏锚点）。
- [AC4] 全仓库（不含 `.trellis/tasks/archive/**`、`.trellis/workspace/**`、`core_old/`、`old/`）不再出现 `Phase 1`–`Phase 6` 阶段规划、`T0xx` 任务编号、"迁移基线"、"migration-note"、"历史实现状态"等字样。
- [AC5] `core/`、`src/platform/` 中不再有叙述性/历史性注释；`vue-tsc --noEmit` 退出码 0，`npm run build-prod` 退出码 0，`npm test` 通过。
- [AC6] 被删注释承载的关键约束已出现在 `.trellis/spec/frontend/state-management.md`，覆盖：共享通道读取与本地降级的边界、reset 身份的构成与不能比较墙钟的原因、旧副本按缺失处理的规则、schema 规范化的先后顺序。
- [AC7] 代码行为零改动：`src/`、`core/` 的改动仅限于注释删除，无语句、类型、导出或运行时行为变化。

## Out of scope

- 不改 `core_old/`、`old/` 的任何文件。
- 不改 `.trellis/tasks/archive/**`、`.trellis/workspace/**`（Trellis 的历史记录载体）。
- 不改 `.trellis/workflow.md`、`.agents/skills/**`、`.pi/**`（Trellis 与平台托管内容）。
- 不做 `.trellis/spec/frontend/features/**/spec.md` 的需求重写；只清掉记录时态文字与失效链接，正文契约保持。
- 不为新增的 28 个删除补写替代文档，不补造缺失的验收产物。

## Notes

- 本轮属于文档与注释治理，产品行为不变，不需要浏览器验收；验收依据是 `check:docs`、`type-check`、`build-prod`、`test` 与文本扫描。
