# 验收记录：002-more-settings-modal

执行日期 2026-10-28。只验收不改产品代码；本轮发现并修复了一个弹窗分类跳转缺陷（独立修复任务 `10-28-fix-more-settings-category-jump`，已归档），修复后按新产物重跑全部相关轮次。

## 环境

| 项 | 值 |
| --- | --- |
| 本地服务（127） | `http://127.0.0.1:5173`，`npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`，npm parent PID 92137 / vite listener PID 92155，证据 `.tmp/pageflip-panel-service-evidence.json` |
| 本地服务（localhost） | `http://localhost:5174`，`npm run dev -- --host localhost --port 5174 --strictPort`，npm parent PID 16176 / vite listener PID 16194，证据 `.tmp/pageflip-panel-service-evidence-5174.json` |
| 生产包 | `npm run build-prod` exit 0（`.tmp/reader-test-eh/build-prod.log`），`dist/ehunter.iife.js` 445279 B |
| bundle server | `http://127.0.0.1:8787/ehunter.iife.js`，`npm run serve:bundle`，npm parent 67522 / node listener 67543，`curl` 200（`.tmp/reader-test-eh/bundle-server.log`） |
| 浏览器 | ego-browser，profile `desktop`（1200×900 DPR1）与 `mobile`（390×844 DPR3，touch5，coarse），任务空间 `eHunter 验收` |
| EH/EX/NH 前置 | exhentai.org 已登录（`loggedIn true`、无登录表单、无 Sad Panda）；Tampermonkey `eHunter 3.1.0 enabler_disabled` + `eHunter (dev loader) 1.0.2 enabler_enabled`（`.tmp/reader-test-eh/pageflip-prep-check.log`） |
| 迁移矩阵夹具 | `.tmp/pageflip-matrix.test.cjs`，`node --test` 11/11 通过，日志 `.tmp/more-settings-matrix.log` |
| 校验命令 | `bash .tmp/more-settings-verify-browser.sh`（50 个产物逐个 `python3 scripts/acceptance.py verify-browser`），exit 0，日志 `.tmp/more-settings-verify-browser.log` |
| 类型检查 | `npm run type-check` exit 0，日志 `.tmp/more-settings-type-check.log` |

## 轮次与产物

全部 50 份产物 `verify-browser` 为 `passed`（非 stale）。其中 36 份为翻页专项复用的 pageflip 轮，14 份为本组弹窗与放大镜轮。

| 组 | 产物目录（`.tmp/browser-preflight/`） | 数量 |
| --- | --- | --- |
| 弹窗打开/关闭与阅读位置 | `modal-open-desktop-24012a8d-…`、`modal-open-mobile-d151a840-…` | 2 |
| 分类跳转（修复后复跑） | `catjump-fix-desktop-ac051502-…`、`catjump-fix-mobile-42d3c0dd-…` | 2 |
| 字段覆盖与重开/刷新保持 | `modal-fields-desktop-925ac077-…`、`modal-fields-mobile-f8d93c66-…` | 2 |
| 中英日文案 | `modal-i18n-desktop-7c92e53c-…`、`modal-i18n-mobile-6c459027-…` | 2 |
| 快捷项 pinned/拖拽/两模式过滤 | `modal-pinned-desktop-cc1f68fc-…`、`modal-pinned-mobile-e35a3a93-…` | 2 |
| 链接、版本号与重置 | `modal-links-desktop-9335edea-…`、`modal-links-mobile-453f5002-…` | 2 |
| 放大镜专项 | `magnifier-desktop-5c954ca9-…`、`magnifier-mobile-0a26d95e-…` | 2 |
| 翻页专项（复用） | 4 init + 1 stability + 18 预设/坏值/重置 + 2 effects + 4 origin + 7 platform | 36 |

## AC1 弹窗交互

### 打开、关闭与旧入口

- 顶栏 `.float-content` 首按钮打开的菜单只有 `['更多设置','快速预览','下载']` 三项，`nestedOptionGroups 0` —— 旧二层设置入口不再出现；点第一项后 `.ehunter-more-settings-modal` 出现。
- `×`（`.ehunter-close-btn`）关闭成功；点击遮罩（`.ehunter-more-settings-modal` 自身 click）关闭成功。
- 弹窗打开时视口中心 `elementFromPoint` 命中 `ehunter-more-settings-modal`，画布确实被遮住。

### 关闭后阅读位置保留

- 滚动模式（desktop）：`scrollTop` 0 → 1200 后开/关弹窗，仍是 `scrollTop 1200`、`progress 1 / 40`。
- 书页模式：desktop `1 / 40 → 6 / 40`、mobile `1 / 40 → 4 / 40` 后开/关弹窗，页码不变（`bookAfterClose` 与 `bookRound.advanced` 一致）。

### 分类跳转与高亮

修复前的缺陷（记录在 `10-28-fix-more-settings-category-jump`）：`onContentScroll` 用相对 `.ehunter-panel` 的 `offsetTop` 与 `.ehunter-content` 的 `scrollTop` 直接比较，导致高亮每次滞后一档；末组「其他」滚到 `scrollMax` 时组顶仍差 350px，永远无法对齐。修复把判定抽成 `core/model/settingsNavigation.ts` 的 `resolveActiveSettingsCategory` / `resolveSettingsCategoryScrollTop`（24px 激活阈值 + `scrollTop >= scrollMax - 1` 时归最后一组），组件改用 `getBoundingClientRect` 换算。

修复后实测（desktop `scrollMax 2836`）：

| 点击分类 | scrollTop | 组顶相对偏移 | 高亮 |
| --- | --- | --- | --- |
| 通用 | 16 | 0 | 通用 |
| 滚动模式 | 528 | 0 | 滚动模式 |
| 书页模式 | 852 | 0 | 书页模式 |
| 快捷设置 | 1553 | 0 | 快捷设置 |
| 快捷键 | 2334 | 0 | 快捷键 |
| 其他 | 2836（= scrollMax） | 349 | 其他 |

mobile（`scrollMax 2790`）：12 / 529 / 852 / 1554 / 2335 / 2790，高亮逐项正确；「其他」偏移 405。手动滚动 desktop 0 / 540 / 880 / 1600 / 2400 分别高亮通用 / 滚动模式 / 书页模式 / 快捷设置 / 快捷键，滚到底高亮「其他」。

### 窄屏布局

mobile panel `{x0,y0,w390,h844}`、`inViewport true`、`contentScrollable true`、`horizontalOverflow 0`、首行「阅读模式」label 与控件均完整可见（`labelFontPx 14`）。desktop panel `{x110,y80,w980,h740}`、`nav {x110,y131,w231,h689}`、`content {x341,y131,w749,h689}`。

## AC2 配置覆盖、文案与快捷项

### 字段修改立即生效并保持

desktop 12 项逐项修改全部即时生效：加载页数 `3P→5P`、自动换源重试 `on→off`、放大镜倍率 `3x→5x`、放大镜区域 `80px→150px`、页面比例 `80%→90%`、分卷页数 `100P→80P`、页间隔 `70px→100px`、滚动缩略图栏 `off→on`、同屏页数 `1P→3P`、翻页动效 `平移翻页→无动效`、滚轮翻页 `100→150`、翻页频率 `10 sec→30 sec`。关闭重开后 12 项全部保持（与修改后逐行比对无差异），刷新后再开仍无差异。落盘 `unified-settings.settings` 24 键与界面一致。

mobile 复用同一份偏好，逐项修改同样即时生效（`?pageTotal` 与 localStorage 在轮次间保留），重开与刷新后零差异。

### 中英日文案

| 语言 | 标题 | 分类 |
| --- | --- | --- |
| 简体中文 | 更多设置 | 通用 / 滚动模式 / 书页模式 / 快捷设置 / 快捷键 / 其他 |
| English | More settings | General / Scroll mode / Book mode / Quick settings / Shortcuts / Other |
| 日本語 | 詳細設定 | 一般 / スクロールモード / ページモード / クイック設定 / ショートカット / その他 |

首行文案同步切换（阅读模式 → Mode → モード；页面比例 → Page scale → ページの割合；重置缓存和数据 → Reset cache and data → Reset cache and data）。切回中文后分类文案与初始完全一致。落盘 `lang` 依次 `en` / `jp` / `cn`。

### 快捷项固定与排序

- 两条 lane 中都不含阅读模式（`pinnedInLanes 0`），但 `quickSelection` 恒含首位 `readingMode`；对阅读模式派发 dragstart 无任何效果，布局不变。
- 拖 `加载页数` 到已隐藏 lane 后从已启用列表移除并追加到隐藏列表末尾；拖 `页间隔` 回已启用列表后追加到末尾。
- 拖 `语言` 到 `页面比例` 前，已启用顺序变为 `['语言','页面比例','分卷页数',…]`，`quickOrder` 落盘 `['readingMode','lang','widthScale','volumeSize',…]`。
- 顶栏过滤：滚动模式显示 `['阅读模式','语言','页面比例','分卷页数','缩略图栏','页间隔']`，书页模式显示 `['阅读模式','语言','同屏页数','阅读方向','页目录','奇偶切换','缩略图栏']` —— 同一全局顺序 + 模式专属过滤，排序与过滤在刷新后保持。

## AC3 链接、版本号与重置

- `版本号 3.1.0` 与 `package.json` 的 `version` 一致（`versionRowMatchesPackage true`）。
- Github 行渲染为 `a.ehunter-link[href="https://github.com/hanFengSan/eHunter"][target="_blank"]`。
- 「查看说明和关于」打开 `.simple-dialog` 标题「版本更新说明 v3.1.0」，关闭后弹窗仍开。
- 重置弹窗标题「确认清空缓存并重置设置」，正文「该操作会清空缓存并恢复所有设置为默认值，且不可撤销。」，操作按钮 `取消 / 确定`（DOM 中每个 FlatButton 各渲染两次）。
- 取消：设置与存储完全不变（放大镜 `3x / 80px`、加载页数 `3P`），弹窗关闭、更多设置弹窗仍开。
- 确认：页面重载并重新出现 `#ehunter-switch`；重开后放大镜回到 `3x / 80px`、加载页数 `3P`、翻页动效按当前规则（desktop `realistic`、mobile `slide`）、快捷键回到 `← ↑ A` / `→ ↓ D` / `Shift` / `Q` / `T`；localStorage 只剩 5 个 `ehunter:` 键，`unified-settings` 为全新 schemaVersion 3 记录。desktop 与 mobile 结果一致。

## AC4 共享与迁移矩阵

### 九行矩阵结论

| quickstart 行 | 证据 | 结论 |
| --- | --- | --- |
| GM 有合法共享值，本站旧值冲突 | `.tmp/pageflip-matrix.test.cjs` row 1；`pageflip-platform-eh-reads-shared-none-…` | 合法共享值优先：EH 界面读到 NH 写的「无动效」而本站镜像仍是 `slide` |
| GM 为空，本站统一与独立旧值冲突 | row 3；`pageflip-preset-reset-desktop-from-slide-…` 的 `after-init` | 首站统一旧值先迁入并标记 `legacyImport: 'done'` |
| GM 部分缺失/无效，逐项补缺 | row 2、row 6、row 11 | 共享独立翻页偏好补统一缺口；坏值由本站独立旧值修复，其余合法值（`lang jp`、`magnifierZoom 4`、`magnifierAreaSize 137`）不受影响 |
| 所有来源都没有某项合法值 | row 9 | 仅该项回默认（`realistic`），其余项保留（`lang jp`） |
| 迁移已执行，再次执行 | row 5 | `settings` 深比较相等，仍为 `done` |
| GM 不可用，多 origin 不同偏好 | `pageflip-origin-127-set-none-…`、`pageflip-origin-127-expect-none-…`、`pageflip-origin-localhost-set-slide-…`、`pageflip-origin-127-still-none-…` | 127 设「无动效」后刷新仍 `none`；localhost 设「平移翻页」后刷新仍 `slide`；回 127 仍 `none`，无跨 origin 串值 |
| 降级期间本站修改，随后恢复合法共享 GM | row 7 | 恢复后取共享 `none`，本站降级期的 `slide` 被丢弃 |
| GM 可用，旧副本含非默认值，确认重置后重开 | row 8；`pageflip-reset-desktop-from-slide-…`、`pageflip-reset-mobile-from-none-…` | 重置后回到矩阵默认（desktop `realistic` / mobile `slide`），`legacyImport: 'blocked'` + `resetId`，旧副本不复活 |
| GM 不可用，本站旧副本，重置后重开 | row 10 | 本 origin 重置生效（`realistic`），另一 origin 保持自己 `none` |

平台轮（生产包 + GM）串联验证：EH 经 UI 写「平移翻页」→ EX 与 NH 打开都读到「平移翻页」（EX 本站 `storedAnimationMode null`、`migration blocked`，NH `null`/`done`）→ NH 经 UI 写「无动效」→ EH 读到「无动效」（EH 本站镜像仍 `slide`）→ EH 经 UI 还原「拟真翻页」。共享值在各站生效且压过本站旧镜像。

### GM 权限与重置能力

- 生产包 `dist/ehunter.iife.js` 头部声明 `@grant GM_xmlhttpRequest / GM_download / GM_getValue / GM_setValue / GM_deleteValue / GM_listValues` 共 6 项，`@match` 覆盖 `exhentai.org`、`e-hentai.org`、`nhentai.net`，`@version 3.1.0`；与 `vite.config.prod.ts:31-36` 的用户脚本头一致。
- 开发 loader `.pi/skills/reader-test/ehunter-dev-loader.user.js` 声明同样的 6 项 `@grant`，经 `GM_xmlhttpRequest` 取 bundle 后 `eval`，与被测脚本同沙箱共享 `GM_*`。
- `src/platform/base/service/PlatformService.js:198 storageClear(keyPrefix)` 只有在 `GM_listValues` 与 `GM_deleteValue` 都存在、`GM_listValues()` 返回数组、且每个匹配键 `GM_deleteValue` 不抛错时才判定 GM 通道清理成功；本地通道始终尝试清理；返回 `gmCleared && localCleared`。重置轮观察到 5 个 `ehunter:` 键被清空后由新记录重建，说明两条通道都实际执行。

## AC5 翻页专项（复用 pageflip 轮）

- 无合法迁移值时按环境取默认：desktop `realistic`、mobile `slide`，两者在 reduced-motion 开启时均为 `none`（4 轮 init）。
- 三种已有合法值 `realistic` / `slide` / `none` × desktop/mobile × reduced 关/开 共 12 轮全部保留预置值；旧记录 `{schemaVersion:1, animationMode:'realistic'}` 在 mobile 上仍保留 `realistic`，未回落到矩阵 `slide`。
- 初始化后切换系统 reduced-motion（false→true）不改当前 `realistic`；改语言为 `en` 后刷新、换参数重开仍 `realistic`。

## AC6 放大镜专项

### 桌面（desktop profile）

- 默认设置行 `3x / 80px`，与存储一致；菜单开启前为 `['打开放大镜','原图']`（书页模式另有「奇偶切换」）。
- 开启后参考框 80×80、镜头 240×240（3 倍），镜头阴影含主题绿 `rgb(40,175,96)` 2px 内描边 + `rgba(40,175,96,0.8)` 1px 外描边 + `rgba(0,0,0,0.35)` 投影，参考框 `rgba(255,255,255,0.3)` 背景 + `rgba(255,255,255,0.7)` 边框，镜头背景 `rgba(0,0,0,0.12)`，各 1 个元素 —— 与 spec 的视觉约束一致。
- 任意整数 20–300 原样生效：21 / 27 / 83 / 295 / 299 分别读到 `21px / 27px / 83px / 295px / 299px`。
- 快捷 ±10：83→93→83；27→20 时「缩小放大镜区域」禁用；295→300 时「增大放大镜区域」禁用，再缩回 290。
- 倍率 2/3/4/5 逐档推进；2 时「缩小放大镜倍率」禁用，5 时「增大放大镜倍率」禁用。
- 越界与非整数不落盘：`19`、`301` 回退到输入前值（`290px`），`80.5` → `80px`，`abc` → `80px`，`storedAfterInvalid` 仍是 `{zoom 5, area 80}`。
- 137/4：参考框 137×137、镜头 548×548；切书页后无镜头残留、进度 `1 / 40`；切回滚动后相机开启但无镜头（未 hover）。
- 刷新后 `enabled false`、`stored {4,137}`、设置行 `4x / 137px` —— 尺寸与倍率长期保存，开关仅当页会话。
- 离开 PageView（鼠标移到页面角）后镜头与参考框消失，开启状态保持。
- 视口受限（`area 200 / zoom 5`）：空间充足时镜头 717×717、参考框 143×143（受视口上限 717 约束，非 1000）；缩到 1200×560 后交集高度 377，镜头 377×377、参考框 75×75；恢复后回到 717×717 / 143×143，`constrainedStored` 与 `restoredStored` 均为 `{zoom 5, area 200}` —— 临时尺寸不写回。
- 桌面长按菜单（同一 profile 下模拟长按触发）显示 6 项且边界禁用正确（`增大放大镜倍率` 在 5 倍时禁用）。

### 移动（mobile profile）

- `pointer {fine:false, coarse:true, touch:true, maxTouchPoints:5}`。
- 滚动模式长按 700ms 弹出菜单只有 `['原图']`；书页模式中央单击/长按菜单为 `['原图','奇偶切换']` —— 移动端不暴露放大镜开关，与 `showMagnifierToggleAction = isDesktopPointer` 一致。
- 无镜头出现（`lens 0`）；滑动仍滚动（`scrollTop 0 → 365`，进度 `1 / 40 → 2 / 40`）；书页边缘单击仍翻页（`2 / 40 → 3 / 40`）；菜单关闭后位置保持。

### 已知差异

- `PopSlider` 越界输入会弹 `i18n.numberInputTip` 提示，自动化在读取前已把 `.simple-dialog` 关掉，因此没有留下提示弹窗的截图；读数回退到输入前值已证明越界被拒绝。
- 移动 profile 无法触发 `prefers-reduced-motion` 之外的放大镜入口，这与产品设计（桌面指针专属）一致，不视为缺陷。

## AC7 校验与类型检查

- `npm run type-check` exit 0（`.tmp/more-settings-type-check.log`）。
- `node --test .tmp/pageflip-matrix.test.cjs` 11/11 通过（`.tmp/more-settings-matrix.log`）。
- `bash .tmp/more-settings-verify-browser.sh` 对 50 份产物逐个 `python3 scripts/acceptance.py verify-browser`，全部 `"status": "passed"`，脚本 exit 0（`.tmp/more-settings-verify-browser.log`）。

## 其它偏差与处理

- **分类数量**：`core/store/app.ts:242-249` 的 `settingsCategories` 实为 6 类（通用、滚动模式、书页模式、快捷设置、快捷键、其他），spec FR-004 与 quickstart 原写「五个分类」。已在修复任务中把 `spec.md` 与 `quickstart.md` 同步为 6 类，验收按实际 6 类记录。
- **分类跳转缺陷**：本轮发现并修复，独立任务 `10-28-fix-more-settings-category-jump`（提交 `8cef307`），修复后 `catjump-fix-*` 两轮重跑通过。
- **NH 站 localStorage 污染**：nhentai 页面本身不暴露 `GM_*`，其 localStorage 中 `page-turn-animation` 与 `unified-settings` 的值是被写成字符串 `"[object Object]"` 的历史残留；读取时 JSON 解析失败回退到 GM，实际生效值以 GM 为准，不影响共享结论。
