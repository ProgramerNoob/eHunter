<!-- migration-note:start -->
> 迁移来源：`specs/001-add-pageview-magnifier/plan.md`（基线 `647ff26`）。正文保全，路径已重定位；命令与源码路径均从仓库根目录解释。
> 阅读顺序与状态：先读[功能索引](../index.md)及[已确认决策](../../decisions/2026-09-18-reader-behavior.md)；决策覆盖到的旧约定以决策为准。Draft、任务勾选、独立验收清单各自保留，不证明当前版本通过验收。
> 文中的 plan/research/tasks、原始 Input、日期及“本次/当前”描述均保留原记录时态；历史实现路径、代码示例、依赖版本和 `.tmp/` 证据不代表本轮已核实或可获取。迁移未执行产品验收，也未补造缺失产物。
> 历史计划：下文 Spec Kit 命令、模板、Constitution Check 及 agent-context 操作均为历史记录，不执行；当前开发流程见 [Trellis workflow](../../../../workflow.md)，稳定工程原则见 [AGENTS](../../../../../AGENTS.md)。保留当时状态，不将历史阶段门禁继续用于当前工作流。
<!-- migration-note:end -->

# Implementation Plan: PageView Magnifier Menu

**Branch**: `[001-add-pageview-magnifier]` | **Date**: 2026-02-24 | **Spec**: `.trellis/spec/frontend/features/001-add-pageview-magnifier/spec.md`
**Input**: Feature specification from `.trellis/spec/frontend/features/001-add-pageview-magnifier/spec.md`

**同步状态（2026-09-18）**：本计划已同步 [已确认决策](../../decisions/2026-09-18-reader-behavior.md) 第 3、4 节；实施与验收仍待完成。修改尺寸、存储或可视边界时先读该决策，历史研究与勾选不代表当前行为已通过验收。

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

为 `PageView` 提供上下文化菜单与桌面端放大镜，保留既有菜单手势、平台原图禁用提示、书页奇偶切换及翻页行为。放大镜尺寸与倍率走统一长期偏好，开关仅页面会话继承；设置与快捷菜单对齐整数尺寸范围和边界行为。几何实现以 PageView∩viewport 为可用区域，空间受限时同步缩小实际参考框与镜头、保持倍率，空间恢复即还原，详见 [data-model.md](data-model.md)。

## Technical Context

**Language/Version**: TypeScript 5.9 + Vue 3.5 SFC + SCSS\
**Primary Dependencies**: Vue runtime, existing core components (`PageView`, `BookPageView`, `MoreMenuPopover` pattern), existing store/actions and platform capability checks\
**Storage**: 尺寸/倍率使用现有统一偏好存储，GM 跨 EH/EX/NH 共享；GM 不可用时按 origin 降级 localStorage，迁移与重置遵循决策第 3 节。仅开关为当前页面会话内存态。\
**Testing**: 后续实施完成后执行类型检查及桌面/移动页面验收；存储共享在实际油猴环境验证，步骤与证据要求见 [quickstart.md](quickstart.md)。本次文档同步未执行测试。\
**Target Platform**: 浏览器油猴阅读器，放大镜仅桌面细指针环境；移动端保留原有菜单与阅读交互。\
**Project Type**: Single frontend project (Vite + Vue)\
**Performance Goals**: Pointer-follow magnifier interaction remains visually smooth during normal reading (target perceived 60fps on common desktop devices); menu open response within 100ms in normal page state\
**Constraints**: 自建 UI；flex 显式声明 `flex-direction`；保留卷轴/书页导航和中央留白区语义；后续实现优先在 `core/`、`src/` 复用现有设置与交互模块，共享存储依赖 D04 的权限和迁移工作。\
**Scale/Scope**: 一次页面会话可包含数百页，仅当前交互 PageView 显示镜头；尺寸/倍率跨会话恢复，开关仅翻页和模式切换继承。

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

以下 PASS 为原计划的设计检查记录；本轮文档同步不重新宣称实现或运行验收通过，当前实施完成标准见 Phase 7 任务。

- Principle I (Refactor-First Boundaries): PASS. Planned changes are confined to `core/` and `src/` refactor directories; no `core_old/` or `old/` modifications.
- Principle II (Behavior-Preserving Changes): PASS. Plan preserves existing book/scroll navigation semantics and adds explicit boundary handling for long-press/tap conflict, pointer leave, and page-switch state continuity.
- Principle III (Validation Before Completion): PASS. Plan includes mandatory `npm run dev` and `ego-browser` runtime verification for desktop/mobile.
- Principle IV (Story-Independent Delivery): PASS. Menu entry, desktop magnifier interaction, and context-based menu action visibility remain independently implementable and testable.
- Principle V (Built-in UI and Mode Consistency): PASS. Uses self-built repository UI only; mode-specific behavior is explicit in scope and acceptance.

Post-Design Re-check: PASS (Phase 1 artifacts preserve all constitution constraints and do not introduce violations)

## Project Structure

### Documentation (this feature)

```text
.trellis/spec/frontend/features/001-add-pageview-magnifier/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── pageview-magnifier.openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
core/
├── components/
│   ├── PageView.vue                    # primary magnifier + menu behavior
│   ├── BookPageView.vue                # central whitespace interaction integration
│   └── widget/
│       └── MoreMenuPopover.vue         # existing interaction pattern reference/reuse
├── store/
│   └── app.ts                          # existing reader actions (jump/parity/load-source hooks)
└── style/
    └── *.scss                          # shared tokens and local component styles

src/
├── platform/
│   ├── eh/
│   │   └── ...                         # capability path consumed (no broad refactor expected)
│   └── base/
│       └── ...                         # capability contracts consumed (no behavioral rewrite planned)
└── ...
```

**Structure Decision**: Keep implementation centered in `core/components/PageView.vue` with minimal integration touches in book-mode container and existing action/capability pathways; avoid cross-cutting platform refactors.

## Implementation Entry Notes

- Primary implementation entry: `core/components/PageView.vue`.
- Book mode odd/even action bridge: `core/components/BookPageView.vue` -> `core/store/app.ts`.
- Menu text and labels: `core/assets/i18n.ts`.
- Manual verification baseline and story checks: `.trellis/spec/frontend/features/001-add-pageview-magnifier/quickstart.md`.

## 当前实现偏差与实施顺序

以下为 2026-09-18 对允许只读文件的静态核对，不是运行结果：

| 位置 | 当前证据与偏差 | 后续任务 |
| --- | --- | --- |
| [PageView.vue](../../../../../core/components/PageView.vue) `menuAreaSizeOptions` / `changeMagnifierAreaSize` | 快捷尺寸使用 50/80/120/150 四档，按钮按 50/150 禁用；虽读取时钳制 20–300，仍不满足任意整数 ±10 和 20/300 边界。 | T033 |
| [app.ts](../../../../../core/store/app.ts) 尺寸设置、`setMagnifierAreaSize` / `setMagnifierZoom` | 设置元数据已声明 20–300、倍率四档，尺寸预设仍有旧四项；已有 setter 与统一偏好写入路径，需核对输入、快捷动作及恢复路径一致性。 | T033、T034 |
| `app.ts` `readUnifiedSettingsRaw` / `applyUnifiedSettingsPreference` | 已有 GM 优先读取和平台存储回退；恢复数值只检查有限数，未见按尺寸/倍率合法范围逐项合并多来源的逻辑。生产 GM 权限、平台回退与跨站结果本轮未核验。 | T034、T038 |
| [useMagnifier.ts](../../../../../core/components/composables/useMagnifier.ts) `focusBoxSize` / `lensSize` / `updateLensPosition` | 参考框与镜头直接取设定尺寸及其倍率乘积；定位使用容器边界，尚无交集受限的有效取样尺寸、同步缩小及空间恢复。 | T036、T037 |
| `PageView.vue` `__ehunterMagnifierSessionState__` | 已有页面全局内存开关，默认 false；需确认翻页/模式切换保留和刷新/新页面关闭，不能据此宣称运行验收通过。 | T035、T038 |

1. 先统一尺寸/倍率入口与合法值（T033），复用统一偏好路径；共享迁移依赖 D04 的生产权限与存储实现（T034）。本规格组只跟踪该依赖，不另建存储子系统。
2. 确认页面会话开关边界（T035），在既有 composable 中区分设定尺寸和临时尺寸、计算可视交集与定位（T036），接入指针/滚动/窗口及布局变化（T037）。
3. 实施固定版本后执行 T031/T032，并按 T038/T039 记录新规则证据；旧已勾任务不替代该轮验收。


## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitution violations identified; no complexity exceptions required.
