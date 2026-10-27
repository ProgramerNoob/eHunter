# 验收记录：001-add-pageflip-toggle

执行日期 2026-10-27（本地 Vite 轮）与 2026-10-28 凌晨（生产包平台轮）。只验收不改产品代码，本轮未发现需要修复的缺陷。

## 环境

| 项 | 值 |
| --- | --- |
| 本地服务（127） | `http://127.0.0.1:5173`，`npm run dev -- --host 127.0.0.1 --port 5173 --strictPort`，npm parent PID 43756 / vite listener PID 43775，证据 `.tmp/pageflip-panel-service-evidence.json` |
| 本地服务（localhost） | `http://localhost:5174`，`npm run dev -- --host localhost --port 5174 --strictPort`，npm parent PID 67270 / vite listener PID 67288，证据 `.tmp/pageflip-panel-service-evidence-5174.json` |
| 生产包 | `npm run build-prod` exit 0（`.tmp/reader-test-eh/build-prod.log`），`dist/ehunter.iife.js` 445013 B |
| bundle server | `http://127.0.0.1:8787/ehunter.iife.js`，`npm run serve:bundle`，npm parent 67522 / node listener 67543，`curl` 200（`.tmp/reader-test-eh/bundle-server.log`） |
| 浏览器 | ego-browser，profile `desktop`（1200×900 DPR1）与 `mobile`（390×844 DPR3，touch5，coarse），任务空间 `eHunter 验收` |
| EH 前置 | exhentai.org 已登录（`loggedIn true`、无登录表单、无 Sad Panda），Tampermonkey：`eHunter 3.1.0 enabler_disabled` + `eHunter (dev loader) 1.0.2 enabler_enabled`（`.tmp/reader-test-eh/pageflip-prep-check.log`，截图 `pageflip-prep-home.png` / `pageflip-tampermonkey-dashboard.png`） |
| reduced-motion 手段 | CDP `Emulation.setEmulatedMedia({features:[{name:'prefers-reduced-motion', value:'reduce'}]})`，每轮在导航前设置，脚本内 `matchMedia` 复核为 true 后才继续 |
| 校验命令 | `bash .tmp/pageflip-verify-browser.sh`（36 个产物逐个 `python3 scripts/acceptance.py verify-browser`） |

## 轮次与产物

全部 36 份产物 `verify-browser` 为 `passed`（非 stale），`bash .tmp/pageflip-verify-browser.sh` exit 0，日志 `.tmp/pageflip-verify-browser.log`。

| 组 | 产物目录（`.tmp/browser-preflight/`） | 数量 |
| --- | --- | --- |
| 首次初始化矩阵 | `pageflip-init-desktop-ef7a26e9-…`、`pageflip-init-mobile-b9c594c3-…`、`pageflip-init-desktop-reduced-8c07cb1e-…`、`pageflip-init-mobile-reduced-7a18f1fb-…` | 4 |
| 初始化后稳定性 | `pageflip-stability-desktop-934f8831-…` | 1 |
| 预设/坏值/重置矩阵 | `pageflip-preset-<mode>-<env>-…` 共 12、`pageflip-preset-legacy-default-realistic-mobile-cc7c4fb6-…`、`pageflip-missing-unified-legacy-slide-3b497653-…`、`pageflip-bad-unified-legacy-none-bc553920-…`、`pageflip-bad-standalone-falls-back-to-matrix-b35e64d8-…`、`pageflip-reset-desktop-from-slide-aa139986-…`、`pageflip-reset-mobile-from-none-17e4be26-…` | 18 |
| 三档动效与阅读回归 | `pageflip-effects-desktop-6a95a535-…`、`pageflip-effects-mobile-c42487d7-…` | 2 |
| GM 不可用 origin 隔离 | `pageflip-origin-127-set-none-3a6d05b4-…`、`pageflip-origin-127-expect-none-d343800d-…`、`pageflip-origin-localhost-set-slide-8c34d366-…`、`pageflip-origin-127-still-none-e2fd3dee-…` | 4 |
| GM 可用 EH/EX/NH 共享 | `pageflip-platform-baseline-eh-b5433f8e-…`、`pageflip-platform-eh-set-slide-f4f27bc6-…`、`pageflip-platform-ex-reads-shared-9f6939ed-…`、`pageflip-platform-nh-reads-shared-f1c5e8aa-…`、`pageflip-platform-nh-set-none-8289ac37-…`、`pageflip-platform-eh-reads-shared-none-64ed6fee-…`、`pageflip-platform-eh-restore-realistic-e0b75014-…` | 7 |
| 迁移矩阵夹具 | `.tmp/pageflip-matrix.test.cjs`，`node --test` 8/8 通过，日志 `.tmp/pageflip-matrix.log` | — |

## AC1 首次初始化矩阵

四种环境各起一轮，导航前清空 localStorage 并设置 reduced-motion：

| 环境 | 减少动态效果 | 初始 `animationMode` | 统一设置 | 书页容器类 | 首次翻页过渡类 |
| --- | --- | --- | --- | --- | --- |
| desktop 1200×900 | 关 | `realistic` | `realistic` | `album-book-view mode-realistic content book-mode` | `screen-flip-enter-active/-from/-to`、`screen-flip-leave-*` |
| mobile 390×844 | 关 | `slide` | `slide` | `album-book-view mode-slide content book-mode` | `screen-slide-next-enter-active/-from/-to`、`screen-slide-next-leave-*` |
| desktop 1200×900 | 开 | `none` | `none` | `album-book-view mode-none content book-mode` | `screen-none-enter-active/-from`、`screen-none-leave-active/-from`（无 `-to`） |
| mobile 390×844 | 开 | `none` | `none` | `album-book-view mode-none content book-mode` | 同上 |

四轮均落盘 `ehunter:reader:prefs:page-turn-animation`、`…:unified-settings`、`…:legacy-migration`（`legacyImport: 'done'`）、`ehunter:reader:open`；首翻进度均 `1 / 60 → 2 / 60`。设置行显示分别为 `拟真翻页` / `平移翻页` / `无动效` / `无动效`，选项集合均为 `['拟真翻页','平移翻页','无动效']`。与 quickstart 表格一致。

## AC2 初始化后稳定性、坏值与重置

### 稳定性（`pageflip-stability-desktop-934f8831-…`）

- 运行时切 `prefers-reduced-motion` 为 reduce：`reducedMotion` false→true，`storedAnimationMode` 仍 `realistic` —— 切换系统偏好不改当前动效。
- 通过「更多设置 → 语言」改 English 并落盘（`storedUnifiedLang: 'en'`）后动效仍 `realistic`。
- 刷新页面后 `realistic` + `en` 同时保留；换 `?pageTotal=30&round=2` 重新打开阅读器仍 `realistic`。

### 预设与坏值（12 + 3 轮）

- 三种合法值 `realistic` / `slide` / `none` × desktop/mobile × reduced 关/开 共 12 轮：全部保留预置值，未被矩阵覆盖（含 reduced 开启时也保留 `realistic`）。
- 旧记录 `{schemaVersion:1, animationMode:'realistic'}` 在 mobile 上保留 `realistic`，未回落到矩阵的 `slide`（`pageflip-preset-legacy-default-realistic-mobile-…`）。
- 统一设置缺 `pageTurnAnimationMode`、本站独立偏好为 `slide`：补齐为 `slide`，`lang` 仍 `cn`（`pageflip-missing-unified-legacy-slide-…`）。
- 统一设置里是坏值 `bogus`、本站独立偏好 `none`：得 `none`（`pageflip-bad-unified-legacy-none-…`）。
- 本站独立偏好坏值 `bogus`、无统一旧值、mobile：回落到矩阵 `slide`（`pageflip-bad-standalone-falls-back-to-matrix-…`）。

### 重置（2 轮）

- `reset-desktop-from-slide-…`：预置 `slide` 后点「重置全部设置」并确认，重开后回到 desktop 矩阵默认 `realistic`，`legacyImport: 'blocked'`，`reset-observation` 带新 `resetId`。
- `reset-mobile-from-none-…`：同样步骤在 mobile 回到 `slide`，`blocked` + 新 `resetId`。
- 两轮都验证了被重置的旧 `slide`/`none` 未被重新导入。

## AC3 三档动效与阅读回归

`pageTotal=40`。desktop `pagesPerScreen=2`、mobile `pagesPerScreen=1`，每档都测 pointer / wheel / keyboard（mobile 另加 touch），每次翻页用 MutationObserver 抓 `screen-` 前缀过渡类。

| 档位 | desktop 页码 | desktop 类名 | mobile 页码 | mobile 类名 |
| --- | --- | --- | --- | --- |
| 拟真 | 点击 `1→2`、`2→1`；滚轮 `1→4`；键盘 `4→6`、`6→4` | `screen-flip-*`（上一页用 `screen-flip-reverse-*`） | 点击 `1→2`、`2→1`；滚轮 `1→2`；键盘 `2→3`、`3→2`；触摸 `2→3` | 同上 |
| 平移 | 点击 `4→6`、`6→4`；滚轮 `4→8`；键盘 `8→10`、`10→8` | `screen-slide-next-*` / `screen-slide-prev-*` | 点击 `3→4`、`4→3`；滚轮 `3→4`；键盘 `4→5`、`5→4`；触摸 `4→5` | 同上 |
| 无动效 | 点击 `8→10`、`10→8`；滚轮 `8→14`；键盘 `14→16`、`16→14` | `screen-none-enter-active/-from/-leave-active`（无 `-to`） | 点击 `5→6`、`6→5`；滚轮 `5→6`；键盘 `6→7`、`7→6`；触摸 `6→7` | 同上 |

三档均记录 `others: []`（未混入其它档位的过渡类名）。

- 自动翻页：开关打开后 desktop `14 / 40 → 16 / 40`、mobile `7 / 40 → 8 / 40`，过渡类为当前档位（拟真 `screen-flip-*`），关闭后不再前进。
- 边界：两轮都先回到 `1 / 40`，首页按上一页仍 `1 / 40`；推进到 `40 / 40` 后按下一页仍 `40 / 40`。
- 快速连续输入：6 次间隔 60ms 的下一页，desktop `1 / 40 → 8 / 40`（elapsed 3317ms）、mobile `1 / 40 → 5 / 40`（elapsed 3327ms），随后补按一次仍能继续翻页（desktop `12 / 40`、mobile `7 / 40`），无卡死、无空白。
- 卷轴模式：切回滚动后 `.album-scroll-view content scroll-mode`，在 `.awesome-scroll-view` rect 中心派发 `mouseWheel` 后 `scrollTop` 变化（desktop `51407 → 51853`，mobile 因接近底部反向 `22341 → 21641`）；再切回书页得到 `album-book-view mode-slide content book-mode`，`stored: slide` 沿用偏好。

## AC4 共享/迁移/重置矩阵

### GM 可用（生产包，EH/EX/NH）

链路：`dist/ehunter.iife.js` 经 `ehunter-dev-loader` 注入，真实 GM 存储。以翻页动效为被测字段，通过「更多设置 → 翻页动效」读写，跨站重开阅读器核对。

| 轮次 | 站点 | 页面 | 读到的动效行 | 说明 |
| --- | --- | --- | --- | --- |
| `platform-baseline-eh-…` | exhentai | `/s/6c8e51e173/4285868-1`（`1 / 41`） | `拟真翻页` | 现状基线；本站镜像 `slide`、统一设置 `slide`、`legacyImport done` |
| `platform-eh-set-slide-…` | exhentai | 同上 | `平移翻页` | 经 UI 写入共享值 `slide` |
| `platform-ex-reads-shared-…` | exhentai | `/s/02dec79896/4285873-1`（`1 / 416`） | `平移翻页` | 另一站点读到同一共享值 |
| `platform-nh-reads-shared-…` | nhentai | `/g/688467/1/`（`1 / 18`） | `平移翻页` | 跨平台读到同一共享值 |
| `platform-nh-set-none-…` | nhentai | 同上 | `无动效` | 经 UI 写入共享值 `none` |
| `platform-eh-reads-shared-none-…` | exhentai | `/s/6c8e51e173/4285868-1` | `无动效` | 回到 EH，共享新值覆盖本站旧镜像 `slide` |
| `platform-eh-restore-realistic-…` | exhentai | 同上 | `拟真翻页` | 还原为基线的 `realistic` |

EX 轮的站点本地副本为 `migration: blocked`（该站未做迁移，直接按共享值渲染），NH 轮为 `done`；两站读到的有效值与 EH 写入值一致，说明共享值优先于各站旧副本。

### 迁移矩阵（Node 夹具，`.tmp/pageflip-matrix.test.cjs`）

复用 `tests/helpers/storage-fixture.cjs` 加载真实 `core/store/app.ts`，8 行全通过：

1. GM 有合法共享值、本站统一/独立旧值冲突 → 共享值保留。
2. GM 统一设置缺该字段、GM 有独立翻页偏好、本站统一旧值冲突 → 取共享独立偏好，优先于本站旧值。
3. GM 为空、本站统一旧值合法 → 首站统一旧值迁入，写回统一设置并置 `legacyImport: 'done'`。
4. 后续站点（nhentai）只补缺，不覆盖合法共享值。
5. 重复迁移幂等：两次初始化后统一设置 `settings` 深度相等，仍 `done`。
6. 共享值为坏值、本站独立旧值合法 → 站内合法值修复该项。
7. 降级期间（GM 读写抛错）本站改值，随后 GM 恢复且有合法共享值 → 共享值优先。
8. 确认重置后重开，被重置的旧副本不复活（回默认 `realistic`，`legacyImport` 不再为 `done`）。

### GM 不可用（双 Vite origin）

同一浏览环境两个 origin，页面内 `GM_getValue` / `GM_setValue` / `GM_listValues` / `GM_deleteValue` / `GM_xmlhttpRequest` 全为 `undefined`：

1. `http://127.0.0.1:5173` 清空后初始 `realistic`，经 UI 选「无动效」→ 本站落盘 `animationMode: 'none'`，刷新仍 `none`。
2. 不清存储重开该 origin：直接读到 `none`，刷新仍 `none`。
3. `http://localhost:5174` 清空后初始 `realistic`，经 UI 选「平移翻页」→ 本站落盘 `slide`，刷新仍 `slide`。
4. 回到 `127.0.0.1:5173` 重开：仍 `none`，未被 localhost 的 `slide` 覆盖 —— origin 隔离成立。

## AC5 产物校验

- 36 个产物逐个 `python3 scripts/acceptance.py verify-browser` 均为 `passed`，`bash .tmp/pageflip-verify-browser.sh` exit 0。
- 一次 `npm run type-check` 期间的产物 stale 事件已记录：改 `.tmp/pageflip-lib.mjs` 会让带 `scenarioInputs: [SCRIPT, LIB]` 的轮次失效，最终版本已重跑，保留的 36 份产物均与当前脚本指纹一致。

## 其它偏差与说明

- 「第二个干净 profile」方案不可行：ego-browser 只有一个 profile（`{id:"Default",name:"Warwick"}`），CLI 无创建入口。经确认改用两个 Vite origin 证明无 GM 时的 origin 隔离，与 `10-18-pageview-magnifier-acceptance` 的既有做法一致。
- `core/model/layout.ts` 的 `thumbExpandWideBreakpoint = 1600` / `thumbExpandItemWidthWide = 150` / `thumbExpandItemPadding = 8` 属 thumb-expand 遗留的未消费常量，与本组无关，已在前一组验收记录中标注。
- 平台轮读取的演示页面为随机选取的公开画集（`4285868` / `4285873` / `688467`），不涉及账号私有内容；共享值已还原为基线的「拟真翻页」。
