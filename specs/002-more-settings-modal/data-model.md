# Data Model: 统一更多设置弹窗

**当前约束**：已同步 [2026-09-18 决策](../decisions/2026-09-18-reader-behavior.md) 第 2–4 节。以下为逻辑模型；实现与新规则验收见 [tasks.md](./tasks.md)。

## 1) SettingsCategory

- Purpose: 定义弹窗左侧导航与右侧分组的分类模型。
- Fields:
  - `id` (string, unique): `general | scroll | book | quick | other`
  - `labelKey` (string): 多语言展示 key
  - `order` (number): 分类显示顺序（固定）
  - `anchorId` (string): 右侧滚动定位目标
  - `visible` (boolean): 当前会话是否展示
- Validation:
  - `id` 必须唯一且属于固定枚举。
  - `order` 不可重复。

## 2) SettingItem

- Purpose: 描述统一设置中的具体可配置项。
- Fields:
  - `id` (string, unique)
  - `categoryId` (SettingsCategory.id)
  - `labelKey` (string)
  - `descriptionKey` (string, optional)
  - `controlType` (enum): `select | number | toggle | action | readonly`
  - `valueType` (enum): `string | number | boolean | none`
  - `defaultValue` (string|number|boolean|null)
  - `currentValue` (string|number|boolean|null)
  - `modeScope` (enum): `both | scroll-only | book-only`
  - `isUserVisible` (boolean)
  - `isExperimental` (boolean)
- Validation:
  - 仅 `isUserVisible=true` 且非实验项进入统一弹窗。
  - `currentValue` 必须符合 `valueType` 与业务边界（如最小/最大值）。
  - 缺失/非法值先按第 4 节逐项迁移补齐，所有来源均无合法值才采用 `defaultValue`。
  - 翻页默认值在首次初始化根据系统/设备计算（减少动态效果 → 无动效，否则桌面拟真、移动平移），保存实际结果；已有合法旧值、系统后续变化及保存其他设置均不得触发重算。
  - 放大镜尺寸为 20–300 CSS px 的任意整数，默认 80；倍率为 2/3/4/5，默认 3。尺寸和倍率持久化；开关仅当前页面会话继承，刷新/新页面关闭，临时缩小取样的结果不持久化。

## 3) QuickSettingItem

- Purpose: 顶部快捷配置栏候选项与约束。
- Fields:
  - `settingItemId` (SettingItem.id)
  - `isPinned` (boolean)
  - `isSelected` (boolean)
  - `globalOrder` (number)
  - `modeScope` (enum): `both | scroll-only | book-only`
- Validation:
  - 固定项“阅读模式”满足：`isPinned=true`, `isSelected=true`, `globalOrder=0`。
  - 非固定项可拖拽排序，但不得占用固定项顺位。
  - 渲染时按 `globalOrder` 排序后再按 `modeScope` 过滤。

## 4) SettingsPreferenceSnapshot

- Purpose: 用户设置持久化快照（统一设置 + 快捷项偏好）。
- Fields:
  - `schemaVersion` (number)
  - `updatedAt` (ISO datetime string)
  - `settings` (map<string, string|number|boolean>)
  - `quickSelection` (array<string>)
  - `quickGlobalOrder` (array<string>)
- Validation:
  - `quickGlobalOrder` 必须包含固定项且固定项首位。
  - `quickSelection` 必须包含固定项。
  - 同浏览器、同脚本安装内 EH/EX/NH 通过 GM 共享；GM 不可用时按 origin 使用 localStorage，不包含跨设备同步。
  - 每项保留合法共享值，再依次从本站合法统一旧设置、独立旧设置补缺，最后才使用默认值；未知字段丢弃。
  - 共享为空时由首个站点迁入其合法值，后续站点仅补缺失/坏值；重复迁移须幂等。
  - 旧副本保留供降级；GM 恢复后合法共享值优先于降级期间本站值。明确重置后不得再次从旧副本导入已重置偏好。

## 5) ResetOperation

- Purpose: 描述“清空缓存并重置全部设置”操作状态。
- Fields:
  - `type` (enum): `factory-reset`
  - `requiresConfirmation` (boolean, fixed true)
  - `status` (enum): `idle | confirming | running | success | failed`
  - `errorMessage` (string, optional)
  - `confirmedAt` (ISO datetime string, optional)
- State transitions:
  - `idle -> confirming -> running -> success`
  - `idle -> confirming -> idle` (取消)
  - `running -> failed` (失败后可重试回 `confirming`)

## Relationships

- 一个 `SettingsCategory` 包含多个 `SettingItem`。
- 一个 `SettingItem` 可以映射为零个或一个 `QuickSettingItem`。
- `SettingsPreferenceSnapshot` 持久化 `SettingItem` 当前值与 `QuickSettingItem` 的可见性和全局顺序。
- `ResetOperation` 执行成功后会重建 `SettingsPreferenceSnapshot` 为默认值，并清空缓存域。
