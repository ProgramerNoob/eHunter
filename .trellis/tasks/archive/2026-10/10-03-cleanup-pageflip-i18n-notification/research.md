# 历史待办调研：T032 翻页清理 / T036 废弃 i18n key / T024 通知响应式样式

- 调研对象：`.trellis/spec/frontend/features/pending-work.md` 中三条原未勾的历史条目（迁移基线 `647ff26`）。
- 调研方式：只读代码与历史（`git log` / `git blame` / `git grep` / `git show`），不修改任何源码、规范或历史任务文件。
- 一次性脚本与中间产物：`.tmp/cleanup-pageflip-i18n-notification/extract-i18n-keys.mjs`、`.tmp/cleanup-pageflip-i18n-notification/i18n-refs.json`、`.tmp/cleanup-pageflip-i18n-notification/run3-stdout.txt`、`.tmp/cleanup-pageflip-i18n-notification/TopBar.before-4706853.vue`。
- 涉及的迁移基线条目位置：`.trellis/spec/frontend/features/pending-work.md:28`（T032）、`:44`（T024）、`:161`（T036）。

---

## 1. T032：`core/store/app.ts` 与 `core/components/TopBar.vue` 的「临时字段/分支」

### 1.1 结论

1. 「临时字段/分支」**在任何规格、计划、研究或任务文档中都没有被明确记录**。T032 是原 Spec Kit 流程里 Phase 6「Polish & Cross-Cutting Concerns」的通用收尾项（`.trellis/spec/frontend/features/001-add-pageflip-toggle/tasks.md:128-134`），写于实现开始前后，原文与基线 `647ff26` 中的 `specs/001-add-pageflip-toggle/tasks.md` 完全一致。因此只能按「实现期脚手架 vs 必要的历史迁移兼容」的判定标准，逐处用代码 + 历史证据反推。
2. 翻页动效功能由 `49fa828`（2026-02-18，`feat: page flip animation`）引入。该提交里最典型的实现期脚手架（app.ts 内直连 `GM_getValue`/`GM_setValue` 的 `readByUserscriptStorage()`/`writeByUserscriptStorage()`、`getSystemPreferredPageTurnAnimationMode()`、`parsePageTurnPreference` 内的静默回退、TopBar.vue 内联 `v-if="store.readingMode == 1"` 的动效下拉）**今天已经全部不存在**，后续 `4706853`（更多设置）、`cfc9eb8`（GM 共享存储与迁移）、`437c89e`（T035 合法值优先）已把它们重构掉。
3. 今天仍能对应到 T032 字面的残留是少量**死字段/死分支与调试残留**（见 1.2），以及一处**双写兼容（需要用户拍板，不建议当垃圾删）**（见 1.3）。偏好迁移、旧 key 兼容、reset 身份等大量分支仍保护老用户数据，属于必要兼容，**不是**实现期脚手架。

### 1.2 候选清单（`file:line` 来自实际读取）

| 候选 | 原文（摘要） | 引入提交 | 读写方 | 运行时是否生效 | 判定 |
| --- | --- | --- | --- | --- | --- |
| `core/store/app.ts:1489` | `showMoreSettings: false,` | `0d80b78` | 全仓 grep 仅此一处声明，无任何读方 | 否 | 实现期/历史遗留死字段，**可删**（它是被 `4706853` 移除的旧「二层更多设置」展开状态的遗留） |
| `core/store/app.ts:1694-1696` | `toggleShowMoreSettings: () => { storeAction.toggleShowMoreSettingsDialog() }` | `4706853` | 全仓无 `storeAction.toggleShowMoreSettings` 调用点 | 否 | 死分支，**可删**；对比 `:1697-1699` 的 `toggleShowMoreSettingsDialog` 仍被 `core/store/event.ts:83-84`（`case 'toggleMoreSettings'` 的 Shift 快捷键）使用，**必须保留** |
| `core/components/TopBar.vue:300-302` | `&.icon-margin { margin-left: 15px; }` | `0d80b78` | 全仓 grep 仅定义处；`.less-margin`（`:296-298`）仍被 `:21` 的 `field.id === 'lang'` 使用 | 否（仅 CSS 未命中） | 无用样式，**可删** |
| `core/store/app.ts:2217`、`:2221` | `// console.log('[init] thumbInfos:' …)` / `// console.log('[init] imgPageInfos:' …)` | `8167caa` | 注释 | 否 | 调试残留，**可删**（T032「补充最小注释」不在这些行） |
| `core/store/app.ts:1545` | `// volumePreloadCount: 2,` | `0d80b78` | 注释 | 否 | 死注释，**可删**（与翻页无关，属滚动模式历史） |
| `core/store/app.ts:2091`、`:2094` | `setThumbInfos` / `setImgPageInfos` action | — | 全仓无 `storeAction.setThumbInfos` / `storeAction.setImgPageInfos` 调用（`init()` 直接赋值 `store.thumbInfos`/`store.imgPageInfos`） | 否 | 死 action，可删（与翻页无关；列入仅供 T032 一并收口参考） |
| `core/store/app.ts:1748` | `markBookInstructionShown` action | — | 全仓无调用 | 否 | 死 action（与翻页无关） |
| `core/store/settingFieldRuntime.ts:46` | `case 'isReverseFlip': … storeAction.toggleIsReverseFlip()` | `4706853` | `settingFieldDefinitions`（`core/store/app.ts:354-603`）中已无 `id: 'isReverseFlip'`，该 case 不可达 | 否 | 死分支；文件不在 T032 点名的两个文件内，若要清理需扩大范围或另立条目 |

补充证据：`core/store/app.ts:1834-1847` 的 `setPageTurnAnimationMode` 里对 `mode === 'none'` 清理 `bookTurnSettleTimerID` / `isBookTurning` / `pendingBookTurn` 不是脚手架，而是「无动效必须立即结算，不留挂起翻页」的必要分支（对应 `49fa828` 引入的翻页串行化，`:2066` 使用）。`core/store/app.ts` 中针对 `PageTurnAnimationPreference`、`mergePageTurnPreferenceRecord`、`migrateLegacySettingsIfNeeded`（函数 `:1322` 起，动效补缺分支 `:1337-1354`）的所有注释与分支都在运行时生效，属于 `2026-09-18` 决议第 2、3 节要求的迁移兼容。

### 1.3 需要拍板的一点：动效偏好的「双写」

`core/store/app.ts:1834-1847` 在用户改档时同时写两个存储键：

- `:1837` `persistPageTurnAnimationMode(mode)` → 独立键 `ehunter:reader:prefs:page-turn-animation`（`core/store/app.ts:179`）；
- `:1846` `persistUnifiedSettingsState()` → 统一键 `ehunter:reader:prefs:unified-settings`（`core/store/app.ts:182`）。

读路径 `core/store/app.ts:988-1010` 以统一键为第一优先，独立键只作迁移/降级来源。已完成任务 `.trellis/spec/frontend/features/002-more-settings-modal/tasks.md:19`（T043，2026-09-19）已收敛「无来源时不再产生独立记录」的读路径语义，但**用户改档仍写独立键**。

- 它可能是刻意保留「旧版本脚本可读回退值」的兼容（决议 `.trellis/spec/frontend/decisions/2026-09-18-reader-behavior.md` 第 3 节：「保留本地旧数据用于回退」）；
- 也可能是 T032 想清理的重复写入。
- 两种解释都成立，**删除会影响降级读旧脚本/外部读取**，因此本文不把它列入「可删」，请用户决定：保留并补注释（最小改动），或作为独立任务收敛写入并回归迁移/降级矩阵。

### 1.4 建议动作

- **改（低风险，最小）**：`core/store/app.ts:1489`、`:1694-1696`、`:2217`、`:2221`、`:1545`；`core/components/TopBar.vue:300-302`。删除后跑 `npm run type-check`，并在书页模式确认「Shift 打开更多设置」仍可用（走 `toggleShowMoreSettingsDialog`）。
- **不改/只补注释**：`core/store/app.ts:1834-1847` 的双写（等用户拍板），以及所有迁移/reset 相关分支。
- **丢弃**：无——没有发现「必须删但会改变用户可见行为」的项；`:2091/:2094/:1748` 与 `core/store/settingFieldRuntime.ts:46` 超出 T032 点名的文件范围，建议单列或不做。

### 1.5 不确定项与需用户确认

1. T032 的原始意图无从考证（无任何文档留痕），以上为基于 git 历史的推断；是否接受「只清死代码 + 补注释」作为 T032 的完成口径？
2. 动效偏好双写（1.3）保留还是收敛？（保留 = 兼容旧脚本回退；收敛 = 单一数据源，但要重测迁移与 GM 降级）
3. 是否允许把清理范围扩到 `core/store/settingFieldRuntime.ts` / 其它死 action（`setThumbInfos` 等）？

---

## 2. T036：与「被移除的第二行设置」相关的废弃 i18n key

### 2.1 结论

1. 「第二行设置」= 旧顶栏的二层「更多设置」展开区：旧 `core/components/TopBar.vue` 的 `.inner-content` 在 `store.showMoreSettings` 为真时高度翻倍并 `flex-wrap: wrap`，把放不下的设置项换行到第二行。证据：`.trellis/spec/frontend/features/002-more-settings-modal/tasks.md:71`（T011「Remove legacy second-row more-settings expand behavior」）、`spec.md:21`（「覆盖当前全部已有可配置项（包含旧二层更多设置中的高级项），并删除原先二层"更多设置"」）、`spec.md:44`、`spec.md:110`（FR-017）；实现提交 `4706853`（2026-02-19，`feat: add more settings`），该提交删除 `core/components/QuickActionList.vue`、重写 `core/components/TopBar.vue`（258 行变动）、新增 `core/components/MoreSettingsDialog.vue`。
2. 直接与这次移除挂钩、且现在**零引用**的 key 是 3 个：`githubTip`、`reverseFlip`、`reverseFlipTip`（证据见 2.2）。被移除的旧交互里其余文案（`toggleMoreSettings`、`resetTip`、`infoTip`、语言、各快捷设置项）今天仍被新弹窗或快捷键使用，不属于废弃。
3. `core/assets/i18n.ts` 共 162 个顶层 key，无重复定义；`core/store/i18n.ts`（34 行）只按语言展平，不做裁剪。全量零引用 key 共 **13 个**；其中只有 3 个属于上述「第二行」语境，其余 10 个是更早/其它功能的死 key（见 2.3）。**本次不删除任何 key。**

### 2.2 与「第二行设置」直接相关的废弃 key（建议 T036 的目标名单）

| key | 定义位置 | 最后一次使用 | 说明 |
| --- | --- | --- | --- |
| `reverseFlip` | `core/assets/i18n.ts:162` | `git show 4706853^:core/components/TopBar.vue:112`（`i18n.reverseFlip` 标签） | 旧顶栏的「反转翻页」开关；新弹窗的设置项定义（`core/store/app.ts:354-603`）已无 `id: 'isReverseFlip'`，`core/store/settingFieldRuntime.ts:46` 的 `case 'isReverseFlip'` 因此不可达。`store.isReverseFlip` 字段仍在 `core/store/app.ts:1510`、持久化在 `:1181`，但已无任何 UI/快捷键入口（`toggleIsReverseFlip` 见 `:1860`） |
| `reverseFlipTip` | `core/assets/i18n.ts:167` | 同上 TopBar.vue:112 | 同上 |
| `githubTip` | `core/assets/i18n.ts:652` | `git show 4706853^:core/components/TopBar.vue:176`（`i18n.githubTip` 图标 tip） | 新弹窗「其他」区直接渲染裸 URL 文本（`core/components/MoreSettingsDialog.vue:220`），不再使用该 tip |

> 判定方式：用 `git grep <key> 4706853^ -- core src` 找出「被移除前最后一次使用」，再用脚本在**当前** `core/` + `src/` 中统计引用；三者在 4706853 之后均无任何引用。

### 2.3 全量零引用 key（13 个，供决定 T036 范围）

脚本模式：`i18n.X`、`i18n.value.X`、`i18n['X']`、`i18n.value['X']`，以及 `'X'`/`"X"` 字符串字面量（覆盖 `i18nKey:` / `labelI18nKey:` / `tipI18nKey:` / `abbrI18nKey:` 等字段值）；统计范围 `core/` + `src/`（86 个文件），排除 `core/assets/i18n.ts` 自身。

| key | i18n.ts 行 | 归类 |
| --- | --- | --- |
| `reverseFlip` | 162 | 第二行设置移除（2.2） |
| `reverseFlipTip` | 167 | 第二行设置移除（2.2） |
| `githubTip` | 652 | 第二行设置移除（2.2） |
| `bookAnimation` | 127 | 2022 Vue3 重写 `0d80b78` 起就无消费者；与 `49fa828` 新增的 `pageTurnAnimation*` 无关（`49fa828` 未删改这两个 key） |
| `bookAnimationTip` | 132 | 同上 |
| `loadingImgUrl` | 227 | 旧加载/状态文案，`0d80b78` 起无消费者 |
| `instructions` | 662 | 指引文案改由 `core/assets/instructions.ts` 提供（见 `core/store/event.ts:4`） |
| `changingToSmallFailed` | 672 | 最后消费者是 `src/platform/eh/service/AlbumCacheService.ts:117`，该遗留文件已在 `3299da9` 删除 |
| `loadingTip` | 677 | 旧加载文案 |
| `loadingFailedAndRefresh` | 687 | 旧加载文案 |
| `failedMsg` | 692 | 旧加载文案 |
| `version` | 697 | 新弹窗用 `versionLabel`（`core/components/MoreSettingsDialog.vue:211`）；`i18n.version` 无消费者 |
| `ContractAuthor` | 702 | 旧版权文案 |

说明：这 13 个 key 在 `core_old/`（及部分在 `old/`）中仍有同名引用，但它们不进入当前构建（`src/main.ts` → `src/platform/factory.ts` → `core/` 链路），因此不改变「当前实现零引用」的结论。

### 2.4 动态访问位置（零引用结论的误判边界）

- `core/components/MoreSettingsDialog.vue:17`：`{{ i18n[category.i18nKey] }}`
- `core/components/MoreSettingsDialog.vue:170`：`{{ i18n[action.labelI18nKey] }}`
- `core/components/TopBar.vue:25`：`:title-content="field.tipI18nKey ? i18n[field.tipI18nKey] : ''"`
- `core/components/TopBar.vue:26`：`{{ i18n[field.labelI18nKey] }}`
- `core/components/widget/DropOption.vue:9`：`{{ item.i18nKey ? i18n[item.i18nKey] : item.name }}`
- 另有两处二次转发：`core/components/MoreSettingsDialog.vue:324`（`i18n.value[i18nKey]`）、`:490`（`i18n.value.currentShortcut`），以及 `core/store/settingFieldRuntime.ts:59-64` 用 `field.dropKey` 取 `settingConf` 列表。

这 5+2 处都是「key 由数据里的字面量提供」：`settingFieldDefinitions`（`core/store/app.ts:354`）、`settingConf`（`:1629`）、`shortcutActionDefinitions`（`:258`）、`quickSettingOptions`（`:228`）、`settingsCategories`（`:249`）。脚本的字面量匹配已覆盖这些来源，所以 13 个零引用 key **不会**因此被误判；但如果未来出现「字符串拼接/模板变量」生成 key 的写法，需要重新检查（本次全仓未发现此类写法）。

### 2.5 建议动作

- **改（如按 T036 字面最小口径）**：删除 `reverseFlip`（`core/assets/i18n.ts:162`）、`reverseFlipTip`（`:167`）、`githubTip`（`:652`）三个 key，并同步确认 `store.isReverseFlip` 的处置（保留字段但无 UI，或另行恢复设置项）。
- **待用户决定**：是否一并删除另外 10 个零引用 key（属更早历史，与「第二行设置」无直接关系）。
- **丢弃**：不要把「仍被新弹窗使用」的 key 当作废弃（如 `resetTip`、`infoTip`、`toggleMoreSettings`，均有现存引用）。
- **只验收/不改**：无需改动 `core/store/i18n.ts`；它不做 key 裁剪是既有设计。

### 2.6 不确定项与需用户确认

1. T036 的清理范围：只删 2.2 的 3 个（严格对应「removed second-row settings」），还是覆盖 2.3 的全部 13 个零引用 key？
2. `isReverseFlip` 功能本身是否已被有意下架？若是有意，i18n key 与 `store.isReverseFlip`/`toggleIsReverseFlip` 可一并清理；若不是，应作为功能缺口单独记录，而不是删 key。
3. 是否允许在 key 清理时同步删除 `core/store/settingFieldRuntime.ts:46` 的不可达 `case 'isReverseFlip'`（跨文件，超出 T036 点名文件）。

---

## 3. T024：桌面/移动通知可读性样式是真缺口还是验收缺口

### 3.1 结论

**是验收缺口，不是代码缺口。** T024 点名的响应式样式在实现 T019/T020 的同一个提交里就已经写好，只是任务清单未勾选：`git blame` 显示 `core/components/status/StatusNotificationStack.vue:47-52` 的移动媒体查询、以及 `core/components/status/StatusNotificationItem.vue:156-161` 的移动宽度/内边距都来自 `0d7e4c4`（2026-02-22，`feat(core): add gallery zip download workflow with progress notifications`），即 T019/T020 的实现提交。因此本任务**不应再改这段样式**；应走实机验收（`quickstart.md` 第 57-58 行的桌面 1200×900 / 移动 390×844 检查）后更新任务状态。

### 3.2 需求侧验收点与现有实现逐条对照

需求来源：`.trellis/spec/frontend/features/001-gallery-download-bundle/spec.md` FR-008、FR-014、US2 验收场景 1-2；验收步骤：`quickstart.md:41-44`（Story P2）与 `:55-58`（Responsive Verification）。

| 验收点 | 现有实现（`file:line`） | 判定 |
| --- | --- | --- |
| 悬浮于右下角 | `core/components/status/StatusNotificationStack.vue:32-36`（`position: fixed` :33、`right: 8px` :34、`bottom: 28px` :35） | 已有 |
| 位于 `.status-pannel` 上方、不遮挡 | `.status-pannel` 在 `core/components/ReaderView.vue:240-247`（`position: absolute; bottom: 0; right: 0; z-index: 10000`），通知栈 `core/components/status/StatusNotificationStack.vue:36` `z-index: 10020`，底部再抬 28px（移动 32px） | 已有 |
| 多个通知垂直排列、互不覆盖 | `core/components/status/StatusNotificationStack.vue:39-44`（`> .list { flex-direction: column; align-items: flex-end; gap: 8px }`），`store.downloadNotifications` 顺序渲染（`:2-11`） | 已有 |
| 桌面可读性（字号/对比度/进度） | `core/components/status/StatusNotificationItem.vue`：卡片块 `:47-56` 内 `width: 320px`（`:49`）、深色底 `:52-54`；`> header`（`:58`）标题 13px（`:65`）；`> p`（`:86`）正文 12px/16px（`:88-89`）；`> .actions`（`:93`）动作按钮 11px（`:101`）；`> footer`（`:114`）进度文本 11px（`:119`）+ 5px 进度条（`:126`，位于 `> .bar` `:123`）；`severity-error`/`severity-warning` 变体在 `:141-153` | 已有 |
| 移动视口（390×844）可辨识 | `core/components/status/StatusNotificationItem.vue:156-161`（`width: min(88vw, 320px)` :158、`padding: 10px` :159）+ `core/components/status/StatusNotificationStack.vue:47-52`（`right: 6px` :49、`bottom: 32px` :50） | 已有 |
| 实机验证记录 | `.trellis/spec/frontend/features/001-gallery-download-bundle/plan.md:113`（T037 运行时回归）：桌面 1200×900 与移动 390×844 × 书页/卷轴四个组合，「通知出现在右下角 `.status-pannel` 上方，并发任务垂直堆叠不重叠」 | 已有（历史证据，非本轮复跑） |

静态检查未发现**阻塞性**缺口。仅有两处可选硬化（无需求文本支撑，按 YAGNI 建议不改）：

- `core/components/status/StatusNotificationItem.vue:62-67`（`> header > strong`，字体定义在 `:65`）未设 `overflow-wrap`/`word-break`：超长无空格标题理论上可能撑破 320px 卡片（EH 标题通常含空格或 CJK，风险低）。
- `core/components/status/StatusNotificationStack.vue:32-45` 无 `max-height` + `overflow-y`：通知很多时理论上可能顶出视口（`plan.md:29` 的并发上限为 3，单项约 90-120px，风险低）。

另注：`core/components/status/StatusNotificationItem.vue:2` 会输出 `phase-*` 类名，但样式表只定义了 `severity-error`/`severity-warning`（`:141-153`），`phase-*` 无对应样式；这属于 T019 的范围与既有设计（phase 只用于文案切换），不影响 T024 判定。

### 3.3 建议动作

- **只验收，不改代码（推荐）**：按 `.trellis/spec/frontend/features/001-gallery-download-bundle/quickstart.md:55-58` 在桌面 1200×900 与移动 390×844 触发 2-3 个并发下载，确认右下角位置、上方堆叠、换行/截断、无遮挡与未捕获异常，记录证据后勾选 T024。
- **改（可选，需用户同意扩大范围）**：补 `overflow-wrap: anywhere` 与通知列表 `max-height`/`overflow-y: auto`；但这属于新增需求，且 `plan.md:29` 已限定 3 并发，不建议在本任务做。
- **丢弃**：不需要新建通知样式组件或引入第三方 UI 库（仓库约束：UI 全部自建）。

### 3.4 不确定项与需用户确认

1. T024 是走实机验收勾选，还是允许顺带做 3.2 的两处可选硬化？
2. 验收需覆盖真实 Tampermonkey 环境还是开发服务器即可（仓库规则：涉及下载功能改动需按 eh-test 技能在 EH 场景验证；本任务若不改代码，可按现有 T037 证据 + 一次浏览器复核收口）。
3. `.trellis/spec/frontend/features/001-gallery-download-bundle/plan.md:113-121` 记录的两个已知问题（中止后通知不收敛、移动端合成触摸不翻页）不属于 T024，是否需要另立条目？

---

## 附：本次未验证的部分

- 未运行 `npm run dev` / `npm run type-check` / `npm run build-prod`，未做浏览器或真机验收；T024 的视觉结论来自静态样式与历史验收记录（`plan.md:113`），T032 的删除影响面来自静态调用点统计。
- 未在真实 GM/Tampermonkey 环境重跑动效偏好迁移与降级矩阵，因此「双写是否必须」只有文档依据（决议第 3 节「保留本地旧数据用于回退」），没有本轮实测。
- 未执行任何删除或修改；T036 的零引用名单基于脚本匹配 + 动态访问点人工核对，未覆盖未来可能新增的字符串拼接式 key 访问。
- 未检查 `.tmp/` 下历史证据（截图、`t037-evidence.md` 等）是否仍然存在，仅引用规格文档中对它们的结论性描述。
