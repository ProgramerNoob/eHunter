# 补齐会话复盘提出的环境改进

## Goal

把会话复盘里 7 条环境改进落成仓库里的代码与文档，减少下一次验收与修复的重复劳动。

## Background

本轮会话产出 36 个 `round-*.mjs` 与 138 个 `probe-*.mjs`，反复踩同一批坑（`timeoutMs` 上限、受保护动作不能嵌套、`taskState` 跨会话失效、弹窗遮挡下合成点击无效、`page.mouse.move({steps})` 每步约 1 秒）；`.tmp` 涨到 9.74 GB 无人察觉；验收记录协议错误只在 `summarize` 失败时暴露；`browser-acceptance.md` 超过上下文注入上限必然被截断；`npm run check` 输出 3905 行其中 272 条 Sass 废弃告警；`pending-work.md` 与 Trellis 任务两处记账；`task.py archive` 的内部提交连续三次失败只能手工收尾。

## Requirements

- R1 `.tmp` 体积与孤儿轮次可见：新增报告命令，列出未被任何 `acceptance.json` 引用的 browser-preflight 轮次目录及总体积；超过阈值时以非 0 退出。不自动删除。
- R2 浏览器交互 helper 入仓：把本轮反复手写、跨脚本复制的交互原语（真实鼠标点击、CDP 拖拽、关闭首开弹窗、确保顶栏/缩略图可见）作为 `scripts/browser-preflight.mjs` 的独立导出，不进入 `guarded()` 单飞序列，并有单元测试。
- R3 验收记录静态校验：`scripts/acceptance.py` 增加 `validate` 子命令，只校验任务目录的 `acceptance.json` 与 PRD 是否自洽，不执行、不改写任何东西。
- R4 验收指南可完整注入：`.trellis/spec/frontend/browser-acceptance.md` 体积降到 `.trellis/config.yaml` 的 `context_injection.max_file_bytes`（32768）以下，被其它文档引用的锚点全部保持可解析。
- R5 Sass 废弃告警静音：`vite.config.ts` 与 `vite.config.prod.ts` 统一静音 `color-functions`、`global-builtin`、`import` 三类，构建输出不再出现这些告警。不迁移 `@import`/`lighten()`（属大范围重构，超出本任务）。
- R6 未收口项收口：`pending-work.md` 改为指向 `.trellis/tasks/` 的入口，现有五处引用仍可用。
- R7 归档提交兜底：提供仓库自有回退脚本，在 `task.py archive` 内部提交失败时按归档范围补提交，并在工具规范里写明用法。

## Constraints

- 不改 `.trellis/scripts/**`（会破坏 `.trellis/.template-hashes.json` 与 `trellis update`）。
- 不改产品运行时行为（`core/`、`src/` 不在本任务范围）。
- 不引入新依赖。
- 破坏性操作（删除 `.tmp` 内容）不在本任务内自动执行。

## Acceptance Criteria

- [AC1] `npm run tmp:report` 输出未引用轮次目录与体积统计，默认阈值内退出码为 0，`--max-bytes` 设到当前体积以下时退出码非 0。
- [AC2] `scripts/browser-preflight.mjs` 导出交互 helper（真实鼠标点击、CDP 拖拽、关闭简单弹窗、确保顶栏与缩略图可见），`tests/` 下的单元测试覆盖其 CDP 事件序列。
- [AC3] `python3 scripts/acceptance.py validate <task-dir>` 对合法任务返回 0，对缺少字段或 AC 不匹配的任务返回非 0 并打印可定位原因。
- [AC4] `.trellis/spec/frontend/browser-acceptance.md` 体积小于 32768 字节，且 `npm run check:docs` 通过（`.pi/skills/reader-test/SKILL.md` 与 `.trellis/spec/tooling/index.md` 里的锚点仍能解析）。
- [AC5] `npm run build-prod` 日志中不再出现 `DEPRECATION WARNING [color-functions]`、`[global-builtin]`、`[import]`。
- [AC6] `pending-work.md` 只保留指向 `.trellis/tasks/` 的入口，五处既有引用仍能打开且内容不再与任务重复记账。
- [AC7] `scripts/archive-fallback.sh` 存在并可用 `--dry-run` 展示将要提交的路径；`.trellis/spec/tooling/index.md` 记录触发场景与用法。
- [AC8] `npm run check` 整体 exit 0。

## Notes

- 本任务只改工具与文档，不产生产品行为变更。
- R5 只做静音，不做 Sass 模块系统迁移。
