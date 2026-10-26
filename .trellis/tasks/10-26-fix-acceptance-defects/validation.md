# 验收记录

修复 `10-25-dockable-panel-acceptance`（D1–D3）与 `10-25-thumb-expand-modal-acceptance`（D4–D7）两组验收发现的 7 个缺陷，并在修复后重跑两组的完整回归。

## 缺陷与修复

| 编号 | 现象 | 修复位置 | 修复方式 |
| --- | --- | --- | --- |
| D1 | 触摸设备长按面板头部后拖拽即被 `pointercancel` 打断，无法吸附 | `core/components/layout/DockHandle.vue` | `.dock-handle` 增加 `touch-action: none` |
| D2 | 侧栏可拖到 389px 把主内容压到 1px | `core/model/layout.ts`、`core/store/app.ts` | 新增 `mainSizeFloorRatio = 0.6` 与 `computeMainMinSizePx`，`getThumbSizeRange(slot, viewportPx)` 按视口降级上限；`app.ts` 传入视口尺寸 |
| D3 | `layoutBlockRegistry` 无任何消费方，槽位/尺寸/长按阈值硬编码 | `core/model/layout.ts`、`DockWorkspace.vue`、`DockHandle.vue`、`SplitHandle.vue`、`ReaderView.vue` | 新增 `getLayoutBlock`/`getDockAllowedSlots`/`getDockLongPressMs`/`getThumbSizeRange`，组件改为读取注册表；删除 `ReaderView.vue` 的 `:long-press-ms="500"` |
| D4 | 弹层列数随视口变宽无限增加（1600 宽 10 列） | `core/components/dialog/ThumbExpandDialog.vue` | 宽视口固定 `repeat(5, minmax(0, 120px))`，`max-width: 1023px` 下固定 3 列；删除 xxl 断点分支 |
| D5 | 规范写「每 100 页一段」，实现是 200 | `.trellis/spec/frontend/features/001-thumb-expand-modal/` | spec、data-model、quickstart、contracts 统一改为 200 |
| D6 | 跳转落点被改写：桌面点 204 落 247，窄屏点 3 落 4 | `core/components/AlbumScrollView.vue` | `scrollToCurIndex()` 用排序副本取目标；跳转后 `scrollLockUntil` 锁定反算，`wheel`/`touchstart` 释放 |
| D7 | 窄屏弹层高 846 超出 844 视口 | `core/components/dialog/ThumbExpandDialog.vue` | `max-width: 767px` 下 `.panel` 改 `height: auto; max-height: 100%; box-sizing: border-box` |

## 轮次

| 轮次 | profile | 产物目录 | 结论 |
| --- | --- | --- | --- |
| dockable 桌面回归 | desktop 1200×900 DPR1 | `.tmp/browser-preflight/dockable-desktop-931095ff-6ee6-452a-b070-e8654f211a7b` | passed |
| dockable 移动回归 | mobile 390×844 DPR3 touch5 | `.tmp/browser-preflight/dockable-mobile-final-6757ef87-6afd-44bb-93ad-aadf8778f356` | passed |
| D1 触摸停靠取证 | mobile | `.tmp/browser-preflight/dockable-touch-dock-ddb7ad29-145e-4ea0-aca3-f8a2af410cc7` | passed（修复前同场景 failed） |
| D2 主区下限取证 | mobile | `.tmp/browser-preflight/dockable-mobile-maxdrag-bfd6439f-6bbd-4af3-91ed-68649d259f62` | passed（修复前同场景 failed） |
| thumb-expand 桌面回归 | desktop | `.tmp/browser-preflight/thumb-expand-desktop-6145053c-6c05-4bcc-bdf6-07c3acef0f89` | passed |
| thumb-expand 移动回归 | mobile | `.tmp/browser-preflight/thumb-expand-mobile-ac9b679c-4956-4cc4-a731-d55deba0b019` | passed |
| 单分段边界 | desktop，80 页 | `.tmp/browser-preflight/thumb-expand-single-94eb98f8-698a-454c-963f-7cafbc0780e1` | passed |
| 缩略图加载失败 | desktop，拦截全部缩略图请求 | `.tmp/browser-preflight/thumb-expand-loadfail-271fe874-1349-4967-b3e9-436b294d6439` | passed |

八份产物逐个运行 `python3 scripts/acceptance.py verify-browser`，均返回 `valid: true`、`status: passed`，脚本 exit 0（`.tmp/fix-defects-verify-browser.log`）。

## 关键数值

- 触摸停靠：`touchAction` 为 `none`，长按 800ms 后 `armed` 为真、overlay 出现，触摸拖拽事件序列为 `pointerdown → pointermove ×3 → pointerup`，无 `pointercancel`；松开后 `slot right`，持久化 `thumbSlot: right`。
- 主区下限：390×844 拖到右缘后侧栏 156、主区 234（`min(320, 390×0.6)`），修复前同手势得到 389/1；1200×900 侧栏上限仍 520、主区 680；底栏上限 420、主区 480，下限 60。
- 弹层列数扫描：1600/1440/1200/1024 均为 5 列 4 行、模板 `120px ×5`；900/768/640/480/390 均为 3 列 4 行。
- 跳转落点：桌面点 label 204 得 `204 / 252`，8 次采样稳定；窄屏点 label 3 得 `3 / 252`，8 次采样稳定。
- 窄屏弹层：`panel {x0, y0, w390, h844}`，与视口一致；分页器底边 827 在视口内。
- 单分段：80 页时 `itemCount 80`、分页器仅 `1`，两侧箭头为 `item disable`。
- 加载失败：123 个缩略图资源全部失败时弹层仍有 120 项、页码连续，点击第 5 项跳到 `5 / 120` 并关闭弹层。

## 视觉复核

- `thumb-expand-desktop-6145053c…/modal-wide.png`：5 列 × 4 行满屏，首项绿色边框与页码，底部 `1 2` 分页器。
- `thumb-expand-mobile-ac9b679c…/mobile-modal.png`：3 列全屏，项内含图片与底边页码，底部 `1 2`。
- `thumb-expand-loadfail-271fe874…/broken-thumbnails.png`：图片全空但页码完整、网格对齐。
- `thumb-expand-mobile-ac9b679c…/mobile-bottom-dock.png`：底部停靠的缩略图条与左侧竖排 `EHUNTER` 手柄，入口按钮在右下角。

以上截图由主会话人工读图核对，未发现遮挡、错位或异常空白；`result.json` 中 `visualReview` 字段仍由 helper 保持 `unrun`。

## 命令校验

| 命令 | 日志 | 结果 |
| --- | --- | --- |
| `npm run type-check` | `.tmp/fix-defects-type-check.log` | exit 0 |
| `npm run check:docs` | `.tmp/fix-defects-check-docs.log` | exit 0 |
| `npm run test` | `.tmp/fix-defects-test.log` | exit 0 |
| `bash .tmp/fix-defects-registry-check.sh` | `.tmp/fix-defects-registry-check.log` | exit 0 |
| `bash .tmp/fix-defects-segment-size-check.sh` | `.tmp/fix-defects-segment-size-check.log` | exit 0 |
| `bash .tmp/fix-defects-verify-browser.sh` | `.tmp/fix-defects-verify-browser.log` | exit 0 |

## 未覆盖与说明

- 触摸停靠只在 Chromium 触摸模拟下验证，未在真实 iOS/Android 设备复核。
- 主区下限按视口比例降级后，窄屏最小主区宽度为 234px；这是本任务确认的口径，未新增可配置项。
- 加载失败轮使用 `Network.setBlockedURLs` 拦截图片请求，未构造 `ThumbInfo` 缺失的数据路径（测试图集全部为 `ThumbMode.SPIRIT` 背景图，无 `<img>` 元素）。
- 修复后 Vite 需重启以避免 HMR 查询参数导致预检模块清单不匹配；`.tmp/dockable-panel-service-evidence.json` 已记录新 PID。
