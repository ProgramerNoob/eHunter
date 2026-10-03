# 清理翻页临时分支、废弃 i18n key 与下载通知响应式样式

## 背景

本任务收尾 `.trellis/spec/frontend/features/pending-work.md` 迁移基线中 A 类三条历史未勾条目（原属 9-20 期间积压的「未勾 ≠ 待开发」清单）：

- `001-add-pageflip-toggle/tasks.md:133` **T032**：在 `core/store/app.ts` 与 `core/components/TopBar.vue` 清理临时字段/分支并补充最小注释
- `002-more-settings-modal/tasks.md:135` **T036**：清理与被移除的第二行设置相关的废弃 i18n key 与引用（`core/assets/i18n.ts`）
- `001-gallery-download-bundle/tasks.md:86` **T024**：`[US2]` 桌面/移动通知可读性响应式样式（`core/components/status/StatusNotificationStack.vue`）

调研（`.trellis/tasks/10-03-cleanup-pageflip-i18n-notification/research.md`）已确证两点与原文表述不符的事实，构成本任务的前提：

1. T032 的「临时字段/分支」在任何规格、计划、研究文档中都无留痕，是原 Spec Kit 的通用收尾项。当年真正的实现脚手架（`49fa828` 直连 `GM_getValue/GM_setValue`、`getSystemPreferredPageTurnAnimationMode`、TopBar 内联动效下拉）已被 `4706853`、`cfc9eb8`、`437c89e` 重构掉，现存能对应原文的只剩少量零引用死字段/死分支。
2. T024 点名的响应式样式在实现 T019/T020 的同一提交 `0d7e4c4`（2026-02-22）中已经落地（`StatusNotificationStack.vue:47-52`、`StatusNotificationItem.vue:156-161`）。**T024 是验收缺口，不是代码缺口。**

## 需求

### R1 清理翻页/更多设置语境的零引用死代码

只删零引用、且不承载历史迁移语义的残留：

| 目标 | 位置 | 依据 |
| --- | --- | --- |
| `showMoreSettings: false` 字段 | `core/store/app.ts:1489` | 全仓仅声明处；现役同类字段是 `showMoreSettingsDialog`（`core/components/MoreSettingsDialog.vue:4` 使用） |
| `toggleShowMoreSettings` action | `core/store/app.ts:1694-1696` | 无调用点；现役入口是 `toggleShowMoreSettingsDialog`（`core/store/event.ts:83-84` Shift 快捷键） |
| `// volumePreloadCount: 2,` 死注释 | `core/store/app.ts:1545` | 仅此一处，滚动模式历史残留 |
| 两行注释掉的调试日志 | `core/store/app.ts:2217`、`:2221` | 仅注释，无运行时代码 |
| `.icon-margin` 未命中样式 | `core/components/TopBar.vue:300-302` | 全仓仅定义处；同类 `.less-margin`（`:296-298`）仍被 `:21` 的 `field.id === 'lang'` 使用，保留 |

补最小注释（不改行为）：说明 `toggleShowMoreSettingsDialog` 的现役入口，以及 `isReverseFlip` 字段为何保留。

### R2 顺带清理 `core/store/app.ts` 内其它零引用死代码

同文件、同性质、可静态证明零引用（逐项复查后删除，见 R6）：

| 目标 | 位置 | 依据 |
| --- | --- | --- |
| `setThumbInfos` / `setImgPageInfos` action | `core/store/app.ts:2091`、`:2094` | 全仓无 `storeAction.setThumbInfos` / `setImgPageInfos` 调用；`init()` 直接赋值 `store.thumbInfos` / `store.imgPageInfos` |
| `markBookInstructionShown` action | `core/store/app.ts:1748-1751` | 仅写入 `hasShownBookInstruction`，该字段无任何读方（对比 `hasShownWelcomeInstruction` 被 `core/store/event.ts:210` 读取） |
| `hasShownBookInstruction` 字段及其序列化 | `core/store/app.ts:1521`、`:1108`、`:1192` | 同上，读写方均在上述死 action 内 |

### R3 清理废弃 i18n key（T036，13 个零引用 key）

`core/assets/i18n.ts` 共 162 个顶层 key，零引用 13 个，全部删除并删除对应三语言条目：

- 第二行设置移除直接相关（`4706853` 移除旧二层展开区）：`reverseFlip`(`:162`)、`reverseFlipTip`(`:167`)、`githubTip`(`:652`)
- 更早历史死 key：`bookAnimation`(`:127`)、`bookAnimationTip`(`:132`)、`loadingImgUrl`(`:227`)、`instructions`(`:662`)、`changingToSmallFailed`(`:672`)、`loadingTip`(`:677`)、`loadingFailedAndRefresh`(`:687`)、`failedMsg`(`:692`)、`version`(`:697`)、`ContractAuthor`(`:702`)

注意：`changingToSmallFailed` 的最后消费者是 `src/platform/eh/service/AlbumCacheService.ts:117`，该文件已在 `3299da9` 删除，故本次可删。

### R4 T024：只做实机验收，不改代码

按 `001-gallery-download-bundle/quickstart.md:55-58` 复核通知栈在桌面 1200×900 与移动 390×844 下的表现（右下角、`.status-pannel` 上方、垂直堆叠不重叠、文本可读、无未捕获异常），记录当前版本证据后勾选 T024。**不新增** `overflow-wrap`、`max-height` 等无需求支撑的硬化。

### R5 文档与清单同步

- `002-more-settings-modal/tasks.md:135`、`001-add-pageflip-toggle/tasks.md:133`、`001-gallery-download-bundle/tasks.md:86` 勾选并注明结果与证据。
- `.trellis/spec/frontend/features/pending-work.md` 更新说明：三条已收口，标注本任务路径。
- 不在本次范围内的问题（见「非目标」）如需记录，写入 `pending-work.md` 的说明段落，不新建任务目录。

### R6 删除前逐项复查（硬约束）

删除任何符号前必须：① 在 `core/` + `src/` 全量检索该符号（含 `storeAction.` / 字符串字面量 / 模板引用）；② 检查动态访问来源（`i18n[...]`、`field.dropKey`、`settingConf`、`store[...]` 等）；③ 确认无 `core_old/`、`old/` 之外的活跃引用；④ 删除后重跑 `npm run type-check`，由类型检查兜底捕获漏删的消费者。

## 非目标

- 不修改 `core/store/settingFieldRuntime.ts`（`:18`、`:46` 仍引用 `isReverseFlip`，且文件不在点名范围内）。
- 不删除 `isReverseFlip` 字段与 `toggleIsReverseFlip`；不收敛动效偏好「双写」（`core/store/app.ts:1834-1847` 同时写独立键与统一键，属 `2026-09-18` 决议第 3 节的降级兼容，保留并补注释）。
- 不改动偏好迁移、reset 身份、GM 共享存储相关分支（`core/store/app.ts:960-1010`、`:1322-1360`）。
- 不新增依赖、不引入 lint/CI 脚本、不改 `tsconfig`。
- 不做 T024 的两处可选硬化，不为 `isReverseFlip` 恢复设置项入口。

## 验收标准

| 编号 | 验收点 | 判定方式 |
| --- | --- | --- |
| AC1 | 静态检查通过 | `npm run type-check` 退出码 0、0 错误；`npm run build-prod` 退出码 0 |
| AC2 | 引用清零 | 13 个 i18n key 与 R1/R2 全部符号在 `core/` + `src/` 中引用数为 0，且无动态访问来源指向它们 |
| AC3 | 顶栏与更多设置无回归 | EH 实机桌面 1200×900：顶栏正常渲染、Shift 打开更多设置弹窗正常、语言字段布局正常 |
| AC4 | 初始化链路无回归 | EH 实机：缩略图数量/标题/当前页正确，书页与卷轴切换正常，加载与首屏无异常 |
| AC5 | i18n 无缺失文案 | 切换 cn/en/jp 后顶栏、更多设置弹窗、状态面板均无 `undefined` 或空白标签 |
| AC6 | 移动视口验收 | 390×844 下 AC3/AC4/AC5 关键项复测通过并留截图 |
| AC7 | T024 通知样式已复核 | 2–3 个并发下载通知在 1200×900 与 390×844 下位于右下角、`.status-pannel` 上方、垂直堆叠不重叠、文本可读，控制台无未捕获异常 |
| AC8 | 兼容分支未被触碰 | `git diff` 中不出现 `core/store/app.ts:960-1010`、`:1322-1360`、`:1834-1847` 相关行 |
| AC9 | 清单与证据 | 三条历史条目已勾选并注明结果；浏览器证据与日志存于 `.tmp/cleanup-pageflip-i18n-notification/`（`.gitignore:44` 已忽略 `.tmp/`） |

## 约束

- 只动四个点名文件：`core/store/app.ts`、`core/components/TopBar.vue`、`core/assets/i18n.ts`、`core/components/status/StatusNotificationStack.vue`（后者仅用于验收取证，不预期改动）。
- 交付说明须区分已验证/未验证范围；UI 改动需桌面 + 移动双视口证据。
- 只覆盖本次要求与高风险逻辑，不新增单测；仓库无相关测试基建。
