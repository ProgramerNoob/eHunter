# 收敛分类跳转实现与类型契约 — 验收记录

## 环境

| 项 | 值 |
| --- | --- |
| 仓库 | `/Users/warwick/claude/eHunter`，分支 `master` |
| 基线 | `b80cafc`（HEAD），整改对象 `8cef307` |
| 浏览器 | ego-browser，profile `desktop` 1200×900 / `mobile` 390×844 |
| 本地服务 | Vite `http://127.0.0.1:5173`，listener pid `97066`，证据 `.tmp/pageflip-panel-service-evidence.json` |
| 页面 | `/?pageTotal=20`，`#ehunter-switch` 打开 reader |
| 执行日期 | 2026-10-28 |
| Node | 见 `package.json` / 锁文件 |

## 改动范围

| 文件 | 变更 |
| --- | --- |
| `core/model/settingsNavigation.ts` | `SettingsSectionOffset<T extends string>` 泛型化；`resolveActiveSettingsCategory<T>` 返回 `T \| null`，空列表返回 `null`；滚底分支加 `last.offsetTop > scrollMax` 前提 |
| `core/components/MoreSettingsDialog.vue` | 删 `getCategoryRef` 与六个分组 `ref`（声明 + 模板 `ref="…Ref"`）；`categorySections` 改由 `.ehunter-group[data-category]` 派生并用 `offsetTop - content.offsetTop`；`scrollToCategory(category: SettingsCategory['id'])` 只查一次目标；去掉两处 `any` |
| `tests/settings-navigation.test.cjs` | 删除全部注释；新增「末组可达时不强制点亮末组」用例；空列表断言由 `''` 改 `null` |

涉及文件之外的代码未改动，样式与交互（平滑滚动、点击高亮、手动滚动跟随）未变。

## AC1 实现收敛

命令 `.tmp/tighten-settings-navigation-check.sh`，日志 `.tmp/tighten-ac1.log`、`.tmp/tighten-check-all.log`：

- `grep -c "getCategoryRef" core/components/MoreSettingsDialog.vue` → `0`
- `grep -c "generalRef\|scrollRef\|bookRef\|quickRef\|shortcutsRef\|otherRef"` → `0`（声明与模板 `ref` 同时清零）
- `querySelectorAll<HTMLElement>('.ehunter-group[data-category]')` 命中 `core/components/MoreSettingsDialog.vue:352`
- `grep -c "getBoundingClientRect"` → `0`（滚动路径不再有同步布局读取）

分类只剩两处：`core/store/app.ts:242` 的 `settingsCategories`（导航渲染）与模板六处 `data-category`（分组标记），新增分类不必再改脚本逻辑。

## AC2 类型收紧

`npm run type-check`（`vue-tsc --noEmit`）exit 0，日志 `.tmp/tighten-ac2-type-check.log`。

- `resolveActiveSettingsCategory<T extends string>(scrollTop, sections: SettingsSectionOffset<T>[], scrollMax): T | null`
- 调用点 `scrollToCategory(category: SettingsCategory['id'])`、`onContentScroll()` 内 `setActiveSettingsCategory(active)` 无 `as any`
- 组件从 `../store/app` 引入 `type SettingsCategory`，从模型引入 `type SettingsSectionOffset`

## AC3 单元测试

`npm run test:settings-navigation` 5/5 pass，exit 0，日志 `.tmp/tighten-ac3-unit.log`：

| 用例 | 覆盖 |
| --- | --- |
| `every category click lands on its own section` | 六个分类点击后高亮为自身 |
| `an unreachable last section wins at the scroll boundary` | `offsetTop 3185 > scrollMax 2836` 时滚底点亮 `other` |
| `a reachable last section is not forced to win at the boundary` | 新用例：末组可达（`800 < 1600`）时按位置判定，不强制点亮 |
| `manual scrolling switches sections without a one-step lag` | 阈值 ±1 的边界判定 |
| `missing sections and empty lists stay inert` | 空列表返回 `null`，越界 clamp |

## AC4 浏览器回归

两 profile 均 `python3 scripts/acceptance.py verify-browser` → `status passed`：

| profile | artifactDir | 日志 |
| --- | --- | --- |
| desktop 1200×900 | `.tmp/browser-preflight/catjump-tighten-desktop-7005d3f1-34ab-46ae-922a-c6c13f1bfe51` | `.tmp/tighten-ac4-desktop.log`、`.tmp/rerun-catjump-tighten-desktop.log` |
| mobile 390×844 | `.tmp/browser-preflight/catjump-tighten-mobile-38bcc72d-d8f1-44c2-af52-c5ef66fc4a61` | `.tmp/tighten-ac4-mobile.log`、`.tmp/rerun-catjump-tighten-mobile.log` |

点击分类后 `scrollTop` / 高亮（`scrollMax` desktop 2836、mobile 2790）：

| 分类 | desktop 本次 | desktop `8cef307` | mobile 本次 | mobile `8cef307` |
| --- | --- | --- | --- | --- |
| 通用 | 16 | 16 | 12 | 12 |
| 滚动模式 | 528 | 528 | 529 | 529 |
| 书页模式 | 852 | 852 | 852 | 852 |
| 快捷设置 | 1553 | 1553 | 1554 | 1554 |
| 快捷键 | 2334 | 2334 | 2334 | 2334（旧记 2335） |
| 其他 | 2836（delta 349） | 2836（delta 349） | 2790（delta 405） | 2790（delta 405） |

逐值一致；mobile「快捷键」由旧记 2335 变为 2334，是 `scrollTop` 目标值改由 `offsetTop` 直接取得的取整差异（旧路径为 `getBoundingClientRect` 差值），高亮仍为「快捷键」。

手动滚动（`behavior: 'instant'` 定位后读取）：desktop `0→通用`、`540→滚动模式`、`880→书页模式`、`1600→快捷设置`、`2400→快捷键`；mobile 同值逐项一致。滚到底 `scrollTop === scrollMax` 且高亮「其他」。

`tests/settings-navigation.test.cjs` 无注释（`grep -c '//\|/\*'` → 0）。

## 回归中修正的问题

1. 首次运行 `categorySections` 用 `group.offsetTop - content.offsetTop + content.scrollTop`，`scrollTop` 被重复计入（`offsetTop` 本身是相对内容起点的坐标，不含滚动量），表现为点击「滚动模式」后高亮仍是「通用」、`delta -16`。去掉 `+ content.scrollTop` 后通过。
2. 原轮脚本 `timeoutMs` 默认 15000，六次分类点击的平滑滚动等待累计超时，报 `category-clicks timed out after 15000ms`。轮脚本改为 `timeoutMs: 30000`、`checksTimeoutMs: 240000`。
3. `manual-scroll` 相位原来用 `element.scrollTop = value`（受 `scroll-behavior: smooth` 影响，赋值后仍在滚动中读取），读数出现滞后。改为 `scrollTo({ top, behavior: 'instant' })` 并按目标值轮询。
4. Vite HMR 让模块 URL 带 `?t=` 版本串，preflight 报 `Required Vite modules are missing`；重启 Vite（pid 96553 → 97066）后恢复。

## 未覆盖

- 生产包（GM 注入）链路未重跑：本次只改 `core/` 内脚本逻辑，编译产物由 `npm run check` 的构建步骤验证（`dist/ehunter.iife.js 443.91 kB`）；`8cef307` 的四组 quickstart 归档结论不受影响。
- EH/NH 平台页面未回归：分类跳转只在本地 TEST 服务的 reader 弹窗内，不触达平台 DOM。
