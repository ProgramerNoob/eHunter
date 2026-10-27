# 父任务验收记录：四组功能 quickstart 收口

执行日期 2026-10-28。本任务只做验收登记与状态回填，不改产品行为；验收中发现的三处产品缺陷分别由独立修复任务处理（见「缺陷处理」）。

## 四组 child 结论

| child | 归档位置 | check | summarize |
| --- | --- | --- | --- |
| `001-dockable-panel-layout` | `.trellis/tasks/archive/2026-10/10-25-dockable-panel-acceptance/` | 9 | exit 0 / `valid true` / `status passed` / 9 passed |
| `001-thumb-expand-modal` | `.trellis/tasks/archive/2026-10/10-25-thumb-expand-modal-acceptance/` | 11 | exit 0 / `valid true` / `status passed` / 11 passed |
| `001-add-pageflip-toggle` | `.trellis/tasks/archive/2026-10/10-25-pageflip-toggle-acceptance/` | 10 | exit 0 / `valid true` / `status passed` / 10 passed |
| `002-more-settings-modal` | `.trellis/tasks/archive/2026-10/10-25-more-settings-modal-acceptance/` | 12 | exit 0 / `valid true` / `status passed` / 12 passed |

合计 42 项 check，无 failed / partial / blocked / unrun。逐项结论与证据在各 child 的 `acceptance.json` 与 `validation.md`。原始 summarize 输出保存在 `.tmp/close-parent-summaries.json`（由 `.tmp/close-parent-summarize.py` 生成，日志 `.tmp/close-parent-summaries.log`）。

## 环境

| 组 | 环境 |
| --- | --- |
| dockable-panel-layout | 本地 Vite `http://127.0.0.1:5173`，ego-browser desktop（1200×900 DPR1）与 mobile（390×844 DPR3） |
| thumb-expand-modal | 同上 |
| add-pageflip-toggle | 本地双 Vite origin（`127.0.0.1:5173` / `localhost:5174`）+ 生产包 `dist/ehunter.iife.js` 经 `ehunter-dev-loader` 注入 EH/EX/NH，GM 可用；reduced-motion 用 CDP `Emulation.setEmulatedMedia` 模拟 |
| more-settings-modal | 同上一组，另加 `node --test` 迁移矩阵夹具 11 行 |

生产包与 bundle server 证据：`.tmp/reader-test-eh/build-prod.log`、`.tmp/reader-test-eh/bundle-server.log`、`.tmp/reader-test-eh/pageflip-prep-check.log`。本地服务 PID 证据：`.tmp/pageflip-panel-service-evidence.json`、`.tmp/pageflip-panel-service-evidence-5174.json`。

## 实际执行的 quickstart 步骤

- `001-dockable-panel-layout`：本地两 profile 的停靠（四向）、拖拽手势（桌面指针与触摸长按）、尺寸钳制、布局持久化与刷新恢复、阅读回归。
- `001-thumb-expand-modal`：入口锚定（侧栏/底栏）、弹层网格密度扫描、分段分页与跳转、边界（单分段/加载失败/末行不足）、阅读模式回归。
- `001-add-pageflip-toggle`：首次初始化矩阵 4 轮、初始化后稳定性、18 轮预设/坏值/重置、三档动效 × 输入类型 2 轮、首页末页边界与快速输入、卷轴模式回归、九行共享迁移矩阵（EH/EX/NH + 夹具）、GM 不可用双 origin。
- `002-more-settings-modal`：弹窗打开/关闭与阅读位置、分类跳转、字段覆盖与重开刷新、中英日文案、快捷项固定/拖拽/两模式过滤、链接与重置两条路径、九行共享迁移矩阵 + GM 权限审计、翻页专项、放大镜专项。

## 缺陷处理

| 缺陷 | 修复任务 | 状态 |
| --- | --- | --- |
| dockable D1–D3、thumb-expand D4–D7 | `.trellis/tasks/archive/2026-10/10-26-fix-acceptance-defects/` | 已修复并回归 |
| 修复轮暴露的 R1–R7 | `.trellis/tasks/archive/2026-10/10-26-fix-review-findings/` | 已修复并回归 |
| 弹窗分类跳转高亮滞后与末组无法对齐 | `.trellis/tasks/archive/2026-10/10-28-fix-more-settings-category-jump/`（提交 `8cef307`） | 已修复并回归 |

按用户决定：缺陷单独开修复任务处理，验收任务只登记修复后复跑的结论；修复前失败轮产物保留在 `.tmp/browser-preflight/`。

## 失败轮产物保留

`.tmp/browser-preflight/` 当前 342 个目录，每轮独立 UUID 目录、只新增不改写。抽查的代表性失败轮仍可读：`dockable-touch-dock-23feb3b7-…`（D1 `pointercancel`）、`dockable-mobile-maxdrag-fb1a48bd-…`（D2 主面板 1px）、`dockable-desktop-b709b30a-…`（bottom 最小值采样落在过渡中段）、`pageflip-init-mobile-a05d8fb5-…`（弹窗遮挡触摸）、`pageflip-reset-desktop-from-slide-6dfb6299-…`（重置确认点错对话框）、`catjump-fix-desktop-a4ca5743-…`（分类跳转修复首轮未对齐）。

## pending-work.md 更新

「仍在排队的验收」表现只剩 `001-gallery-download-bundle` 与 `001-platform-injection`（均不在本轮范围）；`001-add-pageflip-toggle` 与 `002-more-settings-modal` 两行已移除。「已收口的验收」段新增一段，写明这两组的验收范围、记录位置与分类跳转缺陷修复任务。
