<!-- migration-note:start -->
> 迁移来源：`specs/001-add-pageflip-toggle/plan.md`（基线 `647ff26`）。正文保全，路径已重定位；命令与源码路径均从仓库根目录解释。
> 阅读顺序与状态：先读[功能索引](../index.md)及[已确认决策](../../decisions/2026-09-18-reader-behavior.md)；决策覆盖到的旧约定以决策为准。Draft、任务勾选、独立验收清单各自保留，不证明当前版本通过验收。
> 文中的 plan/research/tasks、原始 Input、日期及“本次/当前”描述均保留原记录时态；历史实现路径、代码示例、依赖版本和 `.tmp/` 证据不代表本轮已核实或可获取。迁移未执行产品验收，也未补造缺失产物。
> 历史计划：下文 Spec Kit 命令、模板、Constitution Check 及 agent-context 操作均为历史记录，不执行；当前开发流程见 [Trellis workflow](../../../../workflow.md)，稳定工程原则见 [AGENTS](../../../../../AGENTS.md)。保留当时状态，不将历史阶段门禁继续用于当前工作流。
<!-- migration-note:end -->

# Implementation Plan: 书页模式翻页动效开关

**Branch**: `001-add-pageflip-toggle` | **Date**: 2026-02-18 | **Spec**: `.trellis/spec/frontend/features/001-add-pageflip-toggle/spec.md`
**Input**: Feature specification from `.trellis/spec/frontend/features/001-add-pageflip-toggle/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

提供拟真、平移、无动效三个选项，共用翻页状态流与持久化逻辑。已同步 [2026-09-18 决策](../../decisions/2026-09-18-reader-behavior.md) 第 2、3 节：先迁移合法偏好，无合法值才初始化为系统减少动态效果优先的无动效，否则桌面拟真、移动平移；保存实际结果，后续系统变化不重算。GM 在同浏览器同脚本安装内共享 EH/EX/NH 偏好，不可用时按 origin 降级。连续翻页与卷轴模式保持既有要求。

### 当前实现差异与后续顺序

代码核对基线为 `f3cd8a4`，本次只同步文档。`core/store/app.ts` 的 `getSystemPreferredPageTurnAnimationMode` 已优先检查系统减少动态效果，但否则统一返回拟真，尚未区分移动端平移；非法值归一化及统一设置恢复路径也未符合“逐项补缺后再默认”的完整规则。初始化结果的持久化、保存其他设置不改动动效，以及生产环境共享仍需实现核对和验收；不可从旧任务勾选推定通过。

1. 先按 [设置计划](../002-more-settings-modal/plan.md) 落实 GM 能力、逐项迁移和重置防复活。
2. 在现有 store 中统一动效初始化与恢复规则，保留所有合法旧值，包括旧默认值。
3. 执行 [quickstart](quickstart.md) 的设备/系统矩阵、用户选择及阅读回归；记录证据后更新后续任务。

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.9 + Vue 3.5 (Vite 6)\
**Primary Dependencies**: Vue 3 runtime, existing core widget components, existing i18n/store modules\
**Storage**: 浏览器端偏好存储（优先 userscript storage，降级 localStorage）\
**Testing**: `vue-tsc --noEmit` + 手动场景验收（书页模式交互）\
**Target Platform**: 桌面与移动浏览器中的 EH/EX/NH userscript 注入场景；先保证 EH 链路，跨站共享补验 EX/NH
**Project Type**: 前端单项目（userscript UI）\
**Performance Goals**: 翻页交互响应在 100ms 内触发可见结果；平移/拟真动效在常见桌面环境保持流畅（目标 55+ FPS）；无动效为即时切换\
**Constraints**: 仅变更书页模式；快速连续翻页不得产生页码错乱；设置为全局偏好；需支持 reduced-motion 策略\
**Scale/Scope**: 新增 1 个全局设置项、3 种动效策略、覆盖书页模式所有翻页入口（点击/滚轮/键盘/自动翻页）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- 当前 `.specify/memory/constitution.md` 仍为占位模板（无可执行条款），无法形成强制门禁。
- 采用替代门禁（来自仓库约束与 AGENTS.md）：
  - 仅在 `core/` 与 `src/` 重构目录内规划，不将旧目录实现直接搬运回新目录。
  - 明确限定本功能仅影响书页模式，不改变卷轴模式行为。
  - 动效相关设计需覆盖异步与高频交互容错（连续翻页、边界页、加载中）。
- **Gate 结果（Phase 0 前）**: PASS
- **Gate 结果（Phase 1 设计后复核）**: PASS（研究与数据模型已覆盖上述约束）

## Project Structure

### Documentation (this feature)

```text
.trellis/spec/frontend/features/001-add-pageflip-toggle/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── main.ts
└── platform/
   ├── eh/
   ├── nh/
   └── base/

core/
├── components/
│   ├── AlbumBookView.vue
│   ├── TopBar.vue
│   └── widget/
├── store/
│   ├── app.ts
│   └── event.ts
└── assets/
   └── i18n.ts
```

**Structure Decision**: 采用单仓前端结构，在 `core/` 内实现书页模式动效与设置入口，在 `core/store/` 内扩展全局偏好状态与校验逻辑；`src/` 保持平台注入链路不变。

## Complexity Tracking

无额外复杂度豁免项。
