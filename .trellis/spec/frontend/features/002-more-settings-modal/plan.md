<!-- migration-note:start -->
> 迁移来源：`specs/002-more-settings-modal/plan.md`（基线 `647ff26`）。正文保全，路径已重定位；命令与源码路径均从仓库根目录解释。
> 阅读顺序与状态：先读[功能索引](../index.md)及[已确认决策](../../decisions/2026-09-18-reader-behavior.md)；决策覆盖到的旧约定以决策为准。Draft、任务勾选、独立验收清单各自保留，不证明当前版本通过验收。
> 文中的 plan/research/tasks、原始 Input、日期及“本次/当前”描述均保留原记录时态；历史实现路径、代码示例、依赖版本和 `.tmp/` 证据不代表本轮已核实或可获取。迁移未执行产品验收，也未补造缺失产物。
> 历史计划：下文 Spec Kit 命令、模板、Constitution Check 及 agent-context 操作均为历史记录，不执行；当前开发流程见 [Trellis workflow](../../../../workflow.md)，稳定工程原则见 [AGENTS](../../../../../AGENTS.md)。保留当时状态，不将历史阶段门禁继续用于当前工作流。
<!-- migration-note:end -->

# Implementation Plan: 统一更多设置弹窗

**Branch（历史分支）**: `001-more-settings-modal` | **Date**: 2026-02-18 | **Spec**: `.trellis/spec/frontend/features/002-more-settings-modal/spec.md`
**Input**: Feature specification from `.trellis/spec/frontend/features/002-more-settings-modal/spec.md`

## Summary

新增一个统一“更多设置”弹窗入口，替代原顶栏二层“更多设置”展开区；弹窗采用左侧分类导航 + 右侧配置内容结构，覆盖现有全部可配置项（含旧二层高级项），并增加“快捷设置”可见项管理与拖拽排序。关键策略是复用现有配置模型与行为语义，新增统一分组与交互编排层，保证滚动/书页模式规则一致、配置持久化可回退、以及高风险操作（清空缓存并重置全部设置）具备二次确认。

**当前约束**：已同步 [2026-09-18 决策](../../decisions/2026-09-18-reader-behavior.md) 第 2–4 节；规格正文、模型、契约和 quickstart 使用同一规则，历史任务不作为新规则验收证据。

### 当前实现差异与后续顺序

代码核对基线为 `f3cd8a4`，本次只同步文档。`core/store/app.ts` 与 `PlatformService.js` 已有 GM 优先、本地降级入口，但 `vite.config.prod.ts` 只声明请求/下载权限，尚未声明 GM 存储权限。现有统一设置解析/应用不等于已满足逐项补缺、GM 恢复与重置防复活契约；须按新矩阵验证。

1. 在现有生产构建与存储路径补齐所需 GM 能力，验证同浏览器同脚本安装下 EH/EX/NH 共享，不可用时按 origin 降级。
2. 按项保留合法共享值，再从本站统一旧设置、独立旧设置补缺，最后采用默认；迁移幂等、保留旧数据供降级，GM 恢复后合法共享优先。
3. 重置继续二次确认，保证旧副本不会重导已重置偏好；复用现有 store/平台接口，不另建存储子系统。
4. 翻页仅初始化时应用系统/设备规则并持久化实际值；放大镜尺寸和倍率长期保存，开关仅当前页面会话继承。详见对应规格，避免分别定义默认值。
5. 执行 [quickstart](quickstart.md) 的共享与迁移矩阵、弹窗回归及专项验收，记录后再勾选后续任务。

## Technical Context

**Language/Version**: TypeScript 5.9 + Vue 3.5\
**Primary Dependencies**: Vue runtime, Vite 6, existing core widget components (`DropOption`, `NumDropOption`, `SimpleSwitch`, `SimpleDialog`, `Popover`, `CircleIconButton`)\
**Storage**: Userscript storage (`GM_*`) preferred with Platform storage/localStorage fallback; existing reader/cache storage keys\
**Testing**: `npm run type-check`, `npm run dev`, browser runtime verification via `ego-browser`\
**Target Platform**: Userscript-injected browser UI (Chrome/Firefox/Safari; desktop + mobile narrow screen)
**Project Type**: Single frontend userscript project\
**Performance Goals**: Settings modal open/close interaction feels immediate; category jump and active highlight update within one interaction frame under normal album sizes\
**Constraints**: No third-party UI library; preserve EH chain stability first; keep behavior parity for book/scroll mode; destructive reset must require explicit confirmation\
**Scale/Scope**: One reader settings surface; five categories; all existing configurable items consolidated; one global quick-action ordering model

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate

- Principle I (Refactor-First Boundaries): PASS - Planned changes stay in `core/` and `src/`; no new feature logic in `core_old/` or `old/`.
- Principle II (Behavior-Preserving Changes): PASS - Plan preserves existing setting semantics, mode constraints, and top-bar behavior while only changing entry/container UI.
- Principle III (Validation Before Completion): PASS - Plan includes mandatory `npm run dev` and `ego-browser` runtime verification in quickstart.
- Principle IV (Story-Independent Delivery): PASS - Stories remain independent slices: entry/modal shell, category setting migration, quick settings management.
- Principle V (Built-in UI and Mode Consistency): PASS - Uses self-built existing components only; explicitly defines mode-specific visibility rules.

## Project Structure

### Documentation (this feature)

```text
.trellis/spec/frontend/features/002-more-settings-modal/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── settings-modal.openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
core/
├── components/
│   ├── TopBar.vue
│   ├── [new] MoreSettingsDialog.vue
│   └── widget/
├── store/
│   ├── app.ts
│   └── i18n.ts
└── assets/
    └── i18n.ts

src/
├── platform/base/service/PlatformService.js
└── platform/eh/service/AlbumCacheService.ts
```

**Structure Decision**: Keep all feature implementation in existing refactor UI/state layers under `core/` and reuse storage/cache integrations via existing `src/platform/*` services. No new top-level modules.

## Phase 0: Research Output

- Completed in `.trellis/spec/frontend/features/002-more-settings-modal/research.md`.
- All technical unknowns resolved: navigation behavior, persistence model, reset semantics, mobile adaptation, and destructive action UX.

## Phase 1: Design & Contracts Output

- Data model defined in `.trellis/spec/frontend/features/002-more-settings-modal/data-model.md`.
- Contracts defined in `.trellis/spec/frontend/features/002-more-settings-modal/contracts/settings-modal.openapi.yaml`.
- Validation quickstart in `.trellis/spec/frontend/features/002-more-settings-modal/quickstart.md`.
- Historical agent context refresh recorded via `.specify/scripts/bash/update-agent-context.sh opencode`.

## Post-Design Constitution Re-Check

- Principle I (Refactor-First Boundaries): PASS - Data model/contracts reference only refactor directories.
- Principle II (Behavior-Preserving Changes): PASS - Contract explicitly keeps mode-filtered quick settings and existing setting semantics.
- Principle III (Validation Before Completion): PASS - quickstart mandates dev server + browser runtime verification.
- Principle IV (Story-Independent Delivery): PASS - API-like contract and model support incremental delivery by story.
- Principle V (Built-in UI and Mode Consistency): PASS - Design uses repository UI components only and codifies mode consistency rules.

## Complexity Tracking

No constitution violations requiring justification.
