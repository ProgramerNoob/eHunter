# 执行计划：清理翻页临时分支、废弃 i18n key 与下载通知验收

约束：不执行 `git commit`，改动留在工作区；不派发其他 implement/check 子代理；日志与截图统一放 `.tmp/cleanup-pageflip-i18n-notification/`。

## Step 0 基线与证据目录

- 建目录 `.tmp/cleanup-pageflip-i18n-notification/`。
- `npm run type-check > .tmp/cleanup-pageflip-i18n-notification/before-typecheck.log 2>&1; echo "exit=$?"`（基线应为 0 错误）。
- `git status --short > .tmp/cleanup-pageflip-i18n-notification/before-status.txt`、`git rev-parse HEAD`。

**验出点**：基线 type-check 退出码 0。若不为 0，停下并回报，不继续删除。

## Step 1 逐项复查（R6 硬约束）

对 R1、R2、R3 的每一个目标，产出 `.tmp/cleanup-pageflip-i18n-notification/refs-before.txt`，逐条记录：

1. 全量检索符号：`grep -rn "<symbol>" core/ src/`（i18n key 另加 `'<key>'`、`i18nKey:`、`labelI18nKey:`、`tipI18nKey:`、`abbrI18nKey:`、`dropKey` 形态）。
2. 动态访问来源核对：`i18n[...]`、`settingConf`、`quickSettingOptions`、`settingFieldDefinitions`、`storeAction[...]`、`store[...]` 是否有指向该 key/字段的数据项。
3. 记录每条的命中数；命中数不为 0 或存在动态来源 → 从清单中剔除并说明。
4. 重点复核 `isReverseFlip`：`core/store/settingFieldRuntime.ts:18`、`:46` 为跨文件消费者，**必须保留** `isReverseFlip` 字段与 `toggleIsReverseFlip`，只在 `core/store/app.ts:1510` 补最小注释说明「无 UI 入口、由 `settingFieldRuntime` 引用、超出本次范围」。

**验出点**：`refs-before.txt` 中每个待删目标标注 `hits=0 / 无动态来源`。有争议项回报，不擅自删除。

## Step 2 删除 i18n 废弃 key（R3）

- 在 `core/assets/i18n.ts` 删除 13 个 key 的完整条目（含 cn/en/jp 三语）：`reverseFlip`(:162)、`reverseFlipTip`(:167)、`bookAnimation`(:127)、`bookAnimationTip`(:132)、`loadingImgUrl`(:227)、`githubTip`(:652)、`instructions`(:662)、`changingToSmallFailed`(:672)、`loadingTip`(:677)、`loadingFailedAndRefresh`(:687)、`failedMsg`(:692)、`version`(:697)、`ContractAuthor`(:702)。
- 保留同名的 `versionLabel`、`resetTip`、`infoTip`、`toggleMoreSettings` 等仍有引用的 key。
- `git diff -U0 core/assets/i18n.ts > .tmp/cleanup-pageflip-i18n-notification/i18n.diff`。

**验出点**：diff 只含 13 个 key 的删除，无其他行变化。

## Step 3 删除死字段与死 action（R1 + R2）

`core/store/app.ts`：

- 删 `:1489` `showMoreSettings: false,`
- 删 `:1694-1696` `toggleShowMoreSettings` action
- 删 `:1545` `// volumePreloadCount: 2,`
- 删 `:2217`、`:2221` 两行注释掉的 console.log
- 删 `:2091` `setThumbInfos`、`:2094` `setImgPageInfos`
- 删 `:1748-1751` `markBookInstructionShown`，并同步删 `hasShownBookInstruction` 的 `:1521` 字段、`:1108` 归一化、`:1192` 序列化
- 补最小注释：`toggleShowMoreSettingsDialog` 旁注明现役入口为 `core/store/event.ts:83-84`（Shift）；`isReverseFlip` 旁注明保留原因

`core/components/TopBar.vue`：

- 删 `:300-302` `&.icon-margin` 块；保留 `:296-298` `.less-margin`（`:21` 的 `field.id === 'lang'` 仍在用）

**验出点**：`git diff -U0` 只含上述位置，`core/store/app.ts:960-1010`、`:1322-1360`、`:1834-1847` 无任何变化（AC8 前置检查）。

## Step 4 静态检查

```bash
npm run type-check 2>&1 | tee .tmp/cleanup-pageflip-i18n-notification/after-typecheck.log; echo "exit=$?"
npm run build-prod 2>&1 | tee .tmp/cleanup-pageflip-i18n-notification/build-prod.log; echo "exit=$?"
```

**验出点**：两者退出码均 0；type-check 0 错误。类型检查报错说明有漏删消费者 → 回到 Step 1 复查清单。

## Step 5 EH 实机验收（AC3/AC4/AC5/AC6）

前置：读 `.trellis/spec/frontend/browser-acceptance.md` 与 `.pi/skills/eh-test/SKILL.md`；测试开始前播放 notify-complete 短通知。

- 启动 bundle 服务（`node scripts/serve-bundle.mjs`，监听 `127.0.0.1:8787`），确认 Tampermonkey 中 dev loader 已启用、静态 eHunter 处于禁用（用户当前配置即为此状态）。
- 打开一个 EH 图集页，确认加载的是本次构建（服务日志出现下发记录）。
- 桌面 1200×900：
  - 顶栏渲染正常、语言字段布局正常（验证 `.less-margin` 保留生效、`.icon-margin` 删除无影响）
  - Shift 打开更多设置弹窗正常，关闭正常（验证 `toggleShowMoreSettingsDialog` 未受影响）
  - 缩略图数量与页数一致、标题与当前页正确、书页 ↔ 卷轴双向切换正常（验证 `setThumbInfos`/`setImgPageInfos` 删除无影响）
  - 依次切换 cn / en / jp，检查顶栏、更多设置弹窗、状态面板无 `undefined` 或空白标签（验证 13 个 key 删除无缺失）
  - 截图与 `browser-events.jsonl` 落盘
- 移动 390×844（DPR3 + 触摸，`mobile:false` 配方）：复测顶栏、更多设置弹窗、语言切换、书页/卷轴切换，留截图。
- 控制台：区分 eHunter 自身异常与站点/扩展噪声（EH 站点自身脚本报错、`update.json` GM_xhr 失败为既有噪声）；本任务不允许出现新增未捕获异常。

**验出点**：AC3–AC6 全部有截图与文字记录；出现 `undefined` 文案或新增异常即视为回归，回滚对应删除。

## Step 6 T024 通知样式验收（AC7）

- 触发 2–3 个并发下载通知：优先走 EH 页面真实下载流程；若下载链路在本轮不可用或明显超时，如实记录尝试过程与阻塞点，并改用能真实产生通知状态的路径（例如页面内触发应用自身的下载动作），**不得**只凭静态样式推断结论。
- 桌面 1200×900 与移动 390×844 各检查：消息位于右下角、在 `.status-pannel` 上方、多个通知垂直堆叠不重叠、文本可读、卡片不被裁切；无未捕获异常。
- 证据：`t024-desktop-1200x900.png`、`t024-mobile-390x844.png`、`browser-events.jsonl` 追加记录。
- 若真实下载路径不可用，明确标注「T024 未完成实机复核」，**不勾选** `001-gallery-download-bundle/tasks.md:86`。

**验出点**：AC7 有实测证据或明确标注未完成及原因。

## Step 7 清理与文档同步（AC9）

- 结束后释放 bundle 服务、核实进程退出与端口释放、`task.finish({ keep: [] })` 结束浏览器任务空间、播放 notify-complete 长通知。
- 勾选并注记：
  - `.trellis/spec/frontend/features/001-add-pageflip-toggle/tasks.md:133`（T032）
  - `.trellis/spec/frontend/features/002-more-settings-modal/tasks.md:135`（T036）
  - `.trellis/spec/frontend/features/001-gallery-download-bundle/tasks.md:86`（T024，仅当其确有实测证据）
- `.trellis/spec/frontend/features/pending-work.md`：更新说明段落，写明三条已收口、本任务路径、以及「`isReverseFlip` 管道与 `settingFieldRuntime.ts:18/46` 未处理，属跨文件遗留」与「T024 两处可选硬化未做」两条遗留。

**验出点**：文档改动只涉及上述四处；每条勾选都带结果与证据路径。

## Step 8 回报

回报内容：删除清单与 `hits=0` 证据、`type-check` / `build-prod` 实际退出码、`git diff --stat`、验收截图与事件日志路径、T024 实测结论、未验证范围与任何阻塞、以及确认未触碰 AC8 点名的三类兼容分支。

## 回滚点

- Step 2 与 Step 3 各自独立：`git restore --source=HEAD -- core/assets/i18n.ts` 或 `core/store/app.ts core/components/TopBar.vue` 可分别回退。
- Step 6 若 T024 验收失败或不可完成：只回退文档勾选，不动代码。
- Step 5 若出现回归：先回退 Step 3（死代码删除），再复测；其次回退 Step 2（i18n）。

## 审查门

- Step 1 完成后：待删清单需与 `research.md` 及 prd R1/R2/R3 一致，出现偏差先回报。
- Step 4 之后、浏览器验收之前：确认 diff 范围与 AC8 一致，再进入实机验收。
