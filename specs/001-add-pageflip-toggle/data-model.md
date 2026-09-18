# Data Model: 书页模式翻页动效开关

**当前约束**：已同步 [2026-09-18 决策](../decisions/2026-09-18-reader-behavior.md) 第 2、3 节。以下为逻辑模型，实际存储字段映射以 `core/store/app.ts` 为准；实现和验收见 [tasks.md](./tasks.md) 后续任务。

## Entity: PageTurnAnimationPreference

- Purpose: 存储书页模式翻页动效的全局偏好。
- Fields:
  - `animationMode` (enum, required): `realistic` | `slide` | `none`
  - `scope` (enum, required): `global`
  - `updatedAt` (datetime, required): 最近一次设置更新时间
  - `schemaVersion` (integer, required): 偏好结构版本号
- Validation Rules:
  - 合法共享值优先保留，缺失/无效项按决策第 3 节从本站旧统一设置、旧独立设置补缺；所有来源均无合法值时才初始化。
  - 初始化顺序：系统 reduced-motion 开启 → `none`；否则桌面 → `realistic`、移动 → `slide`。
  - `scope` 仅允许 `global`，表示同浏览器同脚本安装内 GM 共享；GM 不可用时按 origin 使用 localStorage，不包含跨设备同步。
  - `schemaVersion` 缺失时按初始版本处理并补齐，迁移保留合法项。
- State Notes:
  - 保存初始化所得实际值；旧记录即使恰为旧默认值，只要合法就保留。
  - 用户选择覆盖已存值；系统后续变化或保存其他设置不重算动效。
  - 旧副本保留供降级，GM 恢复时合法共享值优先；明确重置后旧副本不能复活。迁移应幂等。

## Entity: BookPageTurnAction

- Purpose: 描述书页模式一次翻页动作及其动效应用结果。
- Fields:
  - `source` (enum, required): `click` | `wheel` | `keyboard` | `autoflip`
  - `fromIndex` (integer, required): 当前页索引
  - `toIndex` (integer, required): 目标页索引
  - `direction` (enum, required): `next` | `prev`
  - `animationModeApplied` (enum, required): `realistic` | `slide` | `none`
  - `status` (enum, required): `accepted` | `coalesced` | `ignored_boundary`
- Validation Rules:
  - `toIndex` 必须在 `[0, pageCount-1]`，越界时标记 `ignored_boundary`。
  - 连续高频输入时允许将旧意图标记为 `coalesced`。
  - `animationModeApplied` 必须等于当前有效偏好。

## Entity: ReadingSession

- Purpose: 表示一次进入阅读器后的会话，用于验证设置持续生效与模式一致性。
- Fields:
  - `sessionId` (string, required)
  - `startedAt` (datetime, required)
  - `effectiveAnimationMode` (enum, required): `realistic` | `slide` | `none`
  - `readingMode` (enum, required): `book` | `scroll`
- Validation Rules:
  - `readingMode=scroll` 时不应用本特性动效逻辑。
  - 会话使用迁移后合法偏好；缺失时按上述初始化规则计算并保存。

## Relationships

- `ReadingSession` 使用 1 个 `PageTurnAnimationPreference`，包含多次 `BookPageTurnAction`。
- 每次翻页绑定当下 `effectiveAnimationMode`。

## State Transitions

- 三种合法动效可以相互切换，下一次翻页使用用户的新选择。
- 缺失/无效配置 → 逐项迁移补缺 → 仍无合法值时按系统/设备初始化；初始化结果持久化。
- 系统偏好变化 → 保持已存值；明确重置 → 下次初始化重新计算，阻止旧副本再导入。
- `accepted`：合法翻页并完成切换；`coalesced`：被最新意图替代；`ignored_boundary`：越界请求忽略、当前页不变。
