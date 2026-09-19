<!-- migration-note:start -->
> 迁移来源：`specs/001-gallery-download-bundle/checklists/requirements.md`（基线 `647ff26`）。正文保全，路径已重定位；命令与源码路径均从仓库根目录解释。
> 阅读顺序与状态：先读[功能索引](../../index.md)及[已确认决策](../../../decisions/2026-09-18-reader-behavior.md)；决策覆盖到的旧约定以决策为准。Draft、任务勾选、独立验收清单各自保留，不证明当前版本通过验收。
> 文中的 plan/research/tasks、原始 Input、日期及“本次/当前”描述均保留原记录时态；历史实现路径、代码示例、依赖版本和 `.tmp/` 证据不代表本轮已核实或可获取。迁移未执行产品验收，也未补造缺失产物。
<!-- migration-note:end -->

# Specification Quality Checklist: Gallery Download Bundle

**Purpose**: Validate specification completeness and quality before proceeding to planning\
**Created**: 2026-02-22\
**Feature**: [`spec.md`](../spec.md)

**历史验收说明（2026-09-18）**：下方既有勾选与 “Validation pass 1” 原文保留初版规格审查记录，不代表当前实现或新格式已验收。YAML 与 `jszip`/`yaml` 旧约定已由 [已确认决策第 1 节](../../../decisions/2026-09-18-reader-behavior.md#1-下载格式) 替代；本轮有效要求以同步后的 `spec.md`、模型、契约与 quickstart 为准。

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Validation pass 1: all checklist items passed.

## 2026-09-18 D03 验收（待执行）

- [ ] 单包和每个多包均可解压并独立读取根目录的 UTF-8 `metadata.json`，恰含 `introUrl`、`galleryTitle`、`totalPages`、`downloadTime`、`eHunterVersion`、`totalChunks`、`chunkIndex` 七字段，类型和值与模型及契约一致。
- [ ] 单包的分片字段为 1/1；300 页、分片 200 时每包 `totalChunks=2`，`chunkIndex` 分别为 1 和 2，任务级字段一致，非 ASCII 标题可正确解析。
- [ ] 确认实际 ZIP 生成沿用 `fflate`，元信息为 JSON 单格式；按 `../quickstart.md` 完成本轮验证并在 `../plan.md` 记录证据，再更新 `../tasks.md` 的 T036–T037。
