# 补齐四组功能 quickstart 验收

## Goal

执行 [pending-work.md](../../spec/frontend/features/pending-work.md) 列出的四组 quickstart 中尚未执行的验收步骤，为每组产出可核验的验收记录，并据实回填未收口项状态。

## Background

`pending-work.md` 当前列出两组缺口：

- `001-add-pageflip-toggle`（首次初始化矩阵、共享与重置防复活矩阵）、`001-dockable-panel-layout`、`001-thumb-expand-modal`、`002-more-settings-modal`（共享/补缺/降级/重置矩阵、翻页初始化与放大镜持久化的桌面与移动回归）的 quickstart 步骤未执行。
- `001-gallery-download-bundle` 的分片校验未执行。

本轮范围限定在四组浏览器可验收的功能；`001-gallery-download-bundle` 与 `001-platform-injection` 不在本轮，仍留在 `pending-work.md`。

四组的验收环境要求不同：

- `001-dockable-panel-layout`、`001-thumb-expand-modal` 依赖本地 Vite + `ego-browser` 的 desktop（1200×900）/ mobile（390×844）两个固定 profile。
- `001-add-pageflip-toggle`、`002-more-settings-modal` 的共享/迁移/重置矩阵要求真实油猴脚本环境（GM 可用/不可用、EH/EX/NH 跨站），quickstart 明确禁止用 localhost 或 localStorage 结果顶替，走 [reader-test](../../../.pi/skills/reader-test/SKILL.md) 生产包链路。

## Requirements

- R1 四个 child 任务各自执行对应 quickstart 的全部步骤，逐项登记 `acceptance.json`。
- R2 验收环境按 [browser-acceptance.md](../../spec/frontend/browser-acceptance.md) 与 reader-test 执行：本地 Vite 轮次使用 `withBrowserPreflight` 固定 profile，平台轮次使用当前生产包并记录 bundle/loader 证据。
- R3 未执行、被阻塞或失败的项目据实记为 `unrun` / `blocked` / `failed`，不得把局部通过写成整组通过。
- R4 验收执行不改变产品行为；验收过程中发现的产品缺陷单独记录，由用户决定是否另开修复任务，不在本任务内顺手改代码。
- R5 各 child 完成后按实际结果更新 `pending-work.md` 与对应 feature spec 的验收状态描述。

## Acceptance Criteria

- [AC1] 四个 child 任务各自的 `python3 scripts/acceptance.py summarize <task-dir>` 均被实际执行，结论按其返回 JSON 记录；存在非 passed 项时在任务记录中列出未通过项、失败轮 `phase` 与错误文本。
- [AC2] 每组验收记录含环境信息（浏览器与 profile、本地 Vite 或生产包版本/提交、执行日期）、截图与日志路径，以及实际执行了哪些 quickstart 步骤。
- [AC3] 失败轮产物保留在 `.tmp/browser-preflight/` 下作为反证，不被删除或覆盖。
- [AC4] `pending-work.md` 中四组对应条目按实际结论更新：已执行的删除或改写为剩余缺口，未执行/失败项保持可见。

## Notes

- Child 任务：`10-25-dockable-panel-acceptance`、`10-25-thumb-expand-modal-acceptance`、`10-25-pageflip-toggle-acceptance`、`10-25-more-settings-modal-acceptance`。
- 起手顺序由用户指定：先做本地两组（dockable-panel、thumb-expand-modal），二者无前置依赖，可各自独立验收；平台两组排在后面。
- 本任务不承担代码修复；验收发现缺陷时停在记录，回到用户确认。
