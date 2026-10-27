# 验收记录：修复更多设置弹窗分类跳转高亮与末组对齐

## 环境

| 项 | 值 |
| --- | --- |
| 执行日期 | 2026-10-28 |
| 前端服务 | 本地 Vite `http://127.0.0.1:5173`（`npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`，npm parent PID 92137 / vite listener PID 92155，证据 `.tmp/pageflip-panel-service-evidence.json`） |
| 浏览器 | ego-browser + `withBrowserPreflight`，desktop（1200×900 DPR1）与 mobile（390×844 DPR3 touch5 coarse） |
| 样本 | TEST 服务 `http://127.0.0.1:5173/?pageTotal=20` |
| 校验 | `python3 scripts/acceptance.py verify-browser <artifact>` |

## 缺陷与修复

| 缺陷 | 现象 | 修复位置 |
| --- | --- | --- |
| A 高亮滞后一档 | 点「滚动模式」高亮仍「通用」，点「书页模式」高亮「滚动模式」，逐项差一组 | `core/components/MoreSettingsDialog.vue` 的 `onContentScroll()` 用 `elem.offsetTop`（相对 `.ehunter-panel`，含 51px header）与 `.ehunter-content` 的 `scrollTop` 直接比较，阈值系统性偏低 |
| B 末组永远滚不到顶 | 点「其他」时 `scrollTop` 已到 `scrollMax 2836`，组顶仍差 349/405px，高亮停在「快捷键」 | `.ehunter-content` 无底部余量，末组无法对齐；`onContentScroll()` 也无边界兜底 |

修复：

- 新增 `core/model/settingsNavigation.ts`：`resolveActiveSettingsCategory(scrollTop, sections, scrollMax)` 在 `scrollTop >= scrollMax - 1` 时直接返回最后一组（缺陷 B），其余按 `scrollTop + settingsCategoryActivationOffsetPx(24) >= section.offsetTop` 取最后一个命中（缺陷 A）；`resolveSettingsCategoryScrollTop(targetOffsetTop, scrollMax)` 把目标钳制到 `[0, scrollMax]`。
- `MoreSettingsDialog.vue` 新增 `categorySections(content)`：用 `getBoundingClientRect().top` 相对内容区顶部换算每个分组的偏移（`rect.top - contentRect.top + content.scrollTop`），替换原先混用 `offsetTop` / `scrollTop` 的算法；`scrollToCategory()` 与 `onContentScroll()` 都改为调用纯函数。未改任何样式，未改其他弹窗行为。

## 回归结果

### 单元测试

`npm run test:settings-navigation` → 5 passed / 0 failed：

1. `every category click lands on its own section`（16/528/852/1553/2334 逐项命中）
2. `the last section wins at the scroll boundary`（`scrollTop === scrollMax` → `other`）
3. `manual scrolling switches sections without a one-step lag`
4. `an unreachable last section highlights only at the bottom boundary`
5. `missing sections and empty lists stay inert`

`npm run type-check` exit 0；`npm run check` exit 0（`dist/ehunter.iife.js 444.37 kB │ gzip: 144.09 kB`、`check-docs: OK`）。

### 浏览器回归

`desktop`：产物 `.tmp/browser-preflight/catjump-fix-desktop-f54aec0f-e5d5-437c-b2fd-f7cbaa79361c`，`verify-browser` → `status: "passed"`。

| 点击分类 | scrollTop | 组顶相对内容起点 | 高亮 |
| --- | --- | --- | --- |
| 通用 | 16 | 16 | 通用 |
| 滚动模式 | 528 | 528 | 滚动模式 |
| 书页模式 | 852 | 852 | 书页模式 |
| 快捷设置 | 1553 | 1553 | 快捷设置 |
| 快捷键 | 2334 | 2334 | 快捷键 |
| 其他 | 2836（= scrollMax） | 3185 | 其他 |

手动滚动 `0 / 540 / 880 / 1600 / 2400` → 高亮 `通用 / 滚动模式 / 书页模式 / 快捷设置 / 快捷键`，滚到底 `scrollTop 2836` 高亮「其他」。

`mobile`（390×844）：产物 `.tmp/browser-preflight/catjump-fix-mobile-48ec6123-392a-440f-80bf-60238ea234c1`，`verify-browser` → `status: "passed"`。

| 点击分类 | scrollTop | 高亮 |
| --- | --- | --- |
| 通用 | 12 | 通用 |
| 滚动模式 | 529 | 滚动模式 |
| 书页模式 | 852 | 书页模式 |
| 快捷设置 | 1554 | 快捷设置 |
| 快捷键 | 2335 | 快捷键 |
| 其他 | 2790（= scrollMax） | 其他 |

窄屏 `scrollMax 2790`，「其他」组顶相对偏移 3183，同样由边界规则兜底；手动滚动与滚到底结果与桌面一致。

## 结论

两项缺陷均已修复，六项分类点击在桌面与移动两种视口下都落在自身高亮，末组在滚到底时正确高亮「其他」；手动滚动行为未倒退，平滑滚动与分组结构未变。
