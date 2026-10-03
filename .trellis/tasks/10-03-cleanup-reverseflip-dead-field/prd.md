# 清理反转翻页死字段与运行时路由

## 背景

上一个清理任务（`.trellis/tasks/archive/2026-10/10-03-cleanup-pageflip-i18n-notification/`）在收尾 T032 时发现 `isReverseFlip` 无 UI 入口，因超出点名文件范围而保留，并记入 `pending-work.md` 的遗留段落。本任务专门清掉这条遗留。

清理前必须先确认它不是「被下架的功能」，而是从来没有人读的死状态。现状（HEAD `f2df9b1`）全仓引用共 6 处，`grep -rn "isReverseFlip" core/ src/` 无一遗漏：

| 位置 | 内容 | 性质 |
| --- | --- | --- |
| `core/store/app.ts:1097` | `isReverseFlip: normalizeBooleanValue,` | 归一化表项 |
| `core/store/app.ts:1180` | `isReverseFlip: store.isReverseFlip,` | 序列化输出 |
| `core/store/app.ts:1507-1508` | 注释 + `isReverseFlip: false,` | 字段声明 |
| `core/store/app.ts:1850-1853` | `toggleIsReverseFlip` 动作（含 `persistUnifiedSettingsState()`） | 唯一写方 |
| `core/store/settingFieldRuntime.ts:18` | `case 'isReverseFlip': return store.isReverseFlip` | getFieldValue 路由 |
| `core/store/settingFieldRuntime.ts:46` | `case 'isReverseFlip': … toggleIsReverseFlip()` | setFieldValue 路由 |

**没有任何翻页/阅读逻辑读取该字段**：没有 `store.isReverseFlip ?` 形式的消费点，也没有取反方向、交换奇偶判定之类的中转。

git 历史进一步排除「功能被下架」的可能——它从来没有过行为：

- `0d80b78`（Vue3 重写）：唯一 UI 是 `core/components/TopBar.vue:104` 的 `:active="store.isReverseFlip"` 开关，无读方。
- `4706853`（更多设置）：有完整字段定义 `{ id: 'isReverseFlip', i18nKey: 'reverseFlip', modeScope: 'book-only' }`（该提交 `core/store/app.ts:73`），同期 `:542`/`:587` 只是序列化与路由映射，仍无行为消费。
- `732fc26`、`f6f43f9`、`cfc9eb8`：同样只有定义、持久化、路由与 toggle。

即：它是一个「存了但没人读」的布尔值。恢复成功能需要先实现行为，属新功能，不在本任务范围。

另有一项可静态判定的事实：`settingFieldDefinitions`（`core/store/app.ts:354`）内没有任何 `id: 'isReverseFlip'` 定义，因此没有数据驱动的 UI 能产生这个 id；`isReverseFlip` 是**唯一**在运行时路由表中存在、而定义表中不存在的 id（脚本核对：routed 22 / defs 21，`routed − defs = ['isReverseFlip']`，`defs − routed = ∅`）。

## 需求

### R1 删除死字段与死路由

| 文件 | 目标 |
| --- | --- |
| `core/store/app.ts` | 删除 `:1097` 归一化表项、`:1180` 序列化项、`:1507-1508` 字段声明与注释、`:1850-1853` `toggleIsReverseFlip` 动作 |
| `core/store/settingFieldRuntime.ts` | 删除 `:18`、`:46` 两条 `case 'isReverseFlip'` |

删除后运行时路由表与设置定义表必须严格同构：`routed − defs = ∅` 且 `defs − routed = ∅`。

不改动统一设置 schema 版本号：`schema 3` 的读取只按已知 key 归一化，存量记录里遗留的 `isReverseFlip` 字段应被静默忽略（与 `hasShownBookInstruction` 的处理一致），不做迁移代码。

### R2 修正引用该字段的文档表述

- `.trellis/spec/frontend/state-management.md:63-70`：该段落目前以 `isReverseFlip` 为实例说明「字段可被路由但无 UI 入口」。删除后必须改写为不带实例的维护规则：删除 store 字段时同时检查 `settingFieldRuntime.ts` 路由表，两侧一起删；并说明当前两张表已同构。**不得**留下去向已删字段的过期示例。
- `.trellis/spec/frontend/features/pending-work.md:24`：更新 2026-10-03 说明段落，把 `isReverseFlip` 遗留标记为已由本任务收口（带任务路径与结果），保留 T024 两处可选硬化这条遗留。
- 历史任务产物（`001-add-pageflip-toggle/tasks.md:133` 的 T032 完成注记、归档任务内的 prd/implement/research）是带日期的记录，**保持原样**，不追改。

## 非目标

- 不恢复「反转翻页」功能，也不为它重建设置项或 i18n key。
- 不收敛动效偏好双写（`core/store/app.ts:1834-1847`），不触碰偏好读路径 `:960-1010`、迁移 `:1322-1360`、reset 身份相关分支。
- 不改 `settingFieldRuntime.ts` 中其它 21 个 field id 的行为，不改 `settingFieldDefinitions`、`settingConf`、`quickSettingOptions` 等表。
- 不改统一设置 schema 版本、不加迁移分支、不新增依赖或测试基建。

## 验收标准

| 编号 | 验收点 | 判定方式 |
| --- | --- | --- |
| AC1 | 引用清零 | `grep -rn "isReverseFlip\|toggleIsReverseFlip" core/ src/` 命中 0（`core_old/`、`old/` 不计） |
| AC2 | 两表同构 | 脚本核对 `core/store/settingFieldRuntime.ts` 路由 id 与 `core/store/app.ts` 的 `settingFieldDefinitions` id：两侧差集均为空 |
| AC3 | 静态检查通过 | `npm run type-check` 退出码 0、0 错误；`npm run build-prod` 退出码 0 |
| AC4 | 存量记录兼容 | 真实浏览器中带遗留 `isReverseFlip` 的统一设置记录能正常读取：阅读器初始化成功、设置项取值正常、无 `undefined` 文案 |
| AC5 | 设置读写无回归 | 实机修改一个设置项后刷新，值保持；`reset` 之外的其它设置不受影响 |
| AC6 | 兼容分支未被触碰 | `git diff` 不出现 `core/store/app.ts:960-1010`、`:1322-1360`、`:1834-1847` 相关行 |
| AC7 | 文档无过期示例 | `state-management.md` 段落不再引用已删字段；`pending-work.md` 遗留段落更新为已收口；`grep -rn "isReverseFlip" .trellis/spec/` 仅剩历史任务产物中的带日期记录 |
| AC8 | 证据留档 | 引用核对、两表同构核对、静态检查与浏览器证据存于 `.tmp/reverseflip-dead-field/`（`.gitignore:44` 已忽略 `.tmp/`） |

## 约束

- 只动 `core/store/app.ts`、`core/store/settingFieldRuntime.ts`、`.trellis/spec/frontend/state-management.md`、`.trellis/spec/frontend/features/pending-work.md` 四个文件。
- 删除前按上文表格复查每个引用点，删除后由 `npm run type-check` 兜底捕获漏改的消费者。
- 浏览器验收按 `.trellis/spec/frontend/browser-acceptance.md` 与 `.pi/skills/eh-test/SKILL.md`，测试前后执行 notify-complete 通知；证据放 `.tmp/reverseflip-dead-field/`。
- 交付说明区分已验证/未验证范围。
