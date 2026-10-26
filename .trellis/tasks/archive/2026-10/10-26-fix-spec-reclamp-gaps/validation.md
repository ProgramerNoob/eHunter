# 验收记录：补齐重钳制单向性、网格留白与跳转锁的规范记述

## 结论

三条判断项均已按实测写成当前状态，未改动任何产品代码。浏览器轮 `.tmp/browser-preflight/reclamp-cycle-8f43bbd2-9c4c-49c5-bc08-835bebcda74d` 通过 `verify-browser`（`status: passed`，runId `c58759a9-15b6-4d19-a835-91042d873667`，roundId `76099b3a-56e8-4613-87e5-1b4aefb16605`）。

## 1. 重钳制实测（AC4）

`.tmp/round-reclamp-cycle.mjs`，desktop profile 1200×900，`?pageTotal=120`，Vite PID 29131。

| 阶段 | 侧栏 | 主区 | 存储 `scroll.thumbSizePx` |
| --- | --- | --- | --- |
| initial | 150 | 1050 | 无 |
| widen-to-max（拖分界线到 x=1180） | 520 | 680 | 520 |
| narrow-then-widen → 390×844 | 156 | 234 | 520 |
| narrow-then-widen → 回到 1200×900 | **156** | 1044 | 520 |
| reload-and-measure（1200×900 重载） | **520** | 680 | 520 |

结论：收窄把侧栏压到 156（`390 - min(320, round(390×0.6))`），放宽回 1200 后**停在 156 不恢复**，而持久化值始终是 520，重载后按当时视口重新钳制回 520。即「运行期单向、存储保留意图值」。

截图 `widened-back-1200.png`（侧栏 156，主区很宽）与 `after-reload-1200.png`（重载后侧栏 520）已人工复核，与测量值一致。

## 2. 文档写入

- `.trellis/spec/frontend/features/001-dockable-panel-layout/data-model.md`：`SplitBoundary` 校验规则补两条 —— 重钳制单向（收窄缩小、放宽不恢复，会话内保持钳制值，只有新的用户拖拽或重载才变），以及重钳制不写回持久化偏好（存储保留用户请求的尺寸，故放宽视口后重载可恢复）。
- `.trellis/spec/frontend/features/001-dockable-panel-layout/spec.md`：Edge Cases 补「先收窄再放宽」一条，与上面同一语义。
- `.trellis/spec/frontend/features/001-thumb-expand-modal/spec.md`：FR-004 补轨道宽度以 120px 上限、左对齐、不拉伸缩略图项、留白在右侧；Assumptions 补「固定 120px 上限的靠左网格不是自适应铺满，1200px 下右侧约 500px 留白属预期，不得判为布局缺陷」；Assumptions 的跳转锁一条补决策文档链接。
- 新建 `.trellis/spec/frontend/decisions/2026-10-26-jump-scroll-lock.md`：问题（页高小于视口时按视口底部反算多一页）、三个备选方案与取舍（锁定目标页 / 改全局判定为视口顶部页 / 只记录不修）、触发与释放（`scrollToCurIndex` 设到期时间，`wheel`/`touchstart` 清零）、已知边界（键盘翻页、滚动条拖拽、程序化 `scrollBy` 不释放；普通滚动仍可能多一页）。
- 归档任务目录未改动。

## 3. 命令校验（AC5）

`.tmp/spec-reclamp-docs-check.log`：

- `npm run check:docs` → `check-docs: 40 md, 6 yaml, 227 本地链接, 0 外链(仅记录), 70 $ref` / `check-docs: OK`。
- `git status --porcelain core src tests` 输出 0 行，`core/`、`src/`、`tests/` 无改动。

## 未覆盖

- 未在 EH/NH 真实脚本环境验证（纯文档任务，行为结论来自本地 Vite 轮）。
- 单向重钳制只验证了侧栏左侧停靠；底栏在 390 视口的高度钳制未单独取证，结论按同一 `reclampThumbSizes` 路径外推。
