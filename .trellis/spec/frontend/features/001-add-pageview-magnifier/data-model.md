<!-- migration-note:start -->
> 迁移来源：`specs/001-add-pageview-magnifier/data-model.md`（基线 `647ff26`）。正文保全，路径已重定位；命令与源码路径均从仓库根目录解释。
> 阅读顺序与状态：先读[功能索引](../index.md)及[已确认决策](../../decisions/2026-09-18-reader-behavior.md)；决策覆盖到的旧约定以决策为准。Draft、任务勾选、独立验收清单各自保留，不证明当前版本通过验收。
> 文中的 plan/research/tasks、原始 Input、日期及“本次/当前”描述均保留原记录时态；历史实现路径、代码示例、依赖版本和 `.tmp/` 证据不代表本轮已核实或可获取。迁移未执行产品验收，也未补造缺失产物。
<!-- migration-note:end -->

# Data Model - PageView Magnifier Menu

本模型已同步 [2026-09-18 决策](../../decisions/2026-09-18-reader-behavior.md) 第 3、4 节，描述目标行为；实现和验收待办见 [tasks.md](tasks.md)。修改偏好迁移或几何规则时先读决策，不以历史研究中的会话存储或固定尺寸为约束。

## 1. PageViewInteractionContext

- Purpose: 当前菜单/放大镜交互绑定的 PageView 上下文。
- Fields:
  - `pageViewId` (string): 当前目标的唯一标识。
  - `readingMode` (enum): `scroll | book`。
  - `deviceType` (enum): `desktop | mobile`。
  - `platformSupportsSourceRefresh` (boolean): 是否支持换源刷新。
  - `isInBookCenterWhitespace` (boolean): 是否命中书页模式现有中间留白区。
  - `menuOpen` (boolean): 当前菜单是否打开。
  - `visibleBounds` (rectangle): PageView 与 viewport 相交的矩形，使用统一的 CSS px 坐标系。
- Validation rules:
  - 中间留白区判定仅在 `readingMode=book` 时参与菜单打开。
  - 移动端隐藏全部放大镜操作；仅当前指针交互的 PageView 显示镜头。

## 2. MagnifierState

- Purpose: 当前 PageView 的派生显示状态，不作为长期存储载荷。
- Fields:
  - `enabled` (boolean): 当前页面会话开关，默认 `false`。
  - `zoomLevel` (enum): `2x | 3x | 4x | 5x`，来自长期偏好。
  - `sampleSize` (integer, CSS px): 用户设定取样边长，来自长期偏好。
  - `effectiveSampleSize` (number, CSS px): 实际临时取样边长，可小于 20px。
  - `lensSize` (number, CSS px): 实际正方形镜头边长。
  - `lensVisible`, `focusIndicatorVisible` (boolean): 显示层状态。
  - `lensSide` (enum): `right | left | above | below | clamped`，记录相对焦点位置或完整可视所需的钳制。
  - `isClamped` (boolean): 是否发生位置钳制；仅为内部派生字段，不进入逻辑契约。
- Geometry rules:
  - 可用区域为 `visibleBounds = PageView ∩ viewport`，镜头必须完整位于其中。
  - 对非空交集，令其可容纳的最大正方形边长为 `L`，所选倍率数值为 `z`：`effectiveSampleSize = min(sampleSize, L / z)`，`lensSize = effectiveSampleSize × z`。参考框同步使用 `effectiveSampleSize`，不是独立裁小镜头或降低倍率。
  - 优先右侧等焦点旁可用位置；位置调整优先避开焦点，空间不足允许覆盖部分焦点以保证完整可视。
  - 交集为空时隐藏镜头与参考框。几何值只在有可视空间时参与渲染。
  - 指针、滚动、视口或 PageView 布局变化时重算；空间恢复即恢复设定尺寸。临时值不写回偏好。
- State transitions:
  - 菜单中的“打开/关闭放大镜”动作改变会话 `enabled`；关闭放大镜时隐藏两种显示层。菜单自身开合不重置该开关。
  - 指针离开当前页时仅隐藏显示层；图片尚未可用时保留可理解的加载/占位状态，避免显示错误内容。
  - 翻页或阅读模式切换清理旧显示层，在当前页沿用会话开关和长期偏好。

## 3. MagnifierSessionPreference

- Purpose: 同一页面阅读会话跨 PageView 继承开关。
- Fields:
  - `sessionId` (string): 当前页面阅读会话标识。
  - `enabled` (boolean): 会话开关，默认 `false`。
- Lifecycle: 仅内存态；翻页和书页/卷轴切换保留。刷新或新页面重新为关闭，尺寸/倍率从长期偏好恢复。

## 4. PageMenuActionItem

- Fields:
  - `actionKey` (enum): `toggleMagnifier | loadOriginal | toggleOddEven | zoomIn | zoomOut | sizeIncrease | sizeDecrease`。
  - `visible`, `enabled` (boolean): 展示与可执行状态。
  - `disabledReason` (string | null): 禁用原因（例如平台不支持原图）。
- Validation rules:
  - 所有放大镜动作仅桌面端可见；倍率和尺寸快捷动作还要求 `MagnifierState.enabled=true`。
  - 倍率快捷动作每次相邻一档，2x/5x 时对应减小/增大按钮禁用。
  - 尺寸快捷动作使用 `clamp(sampleSize ± 10, 20, 300)`；20/300 时对应减小/增大按钮禁用。设置可直接输入范围内任意整数，两入口使用同一偏好。
  - `toggleOddEven` 仅书页模式可见。
  - `loadOriginal` 始终可见；不支持换源刷新时禁用且必须给出原因。

## 5. PointerFocusIndicator

- Fields:
  - `size` (number, CSS px): 等于 `effectiveSampleSize`；无空间限制时等于用户设定边长，首次默认 80px。
  - `opacity` (number): 约 `0.30` 的白色覆盖层。
  - `positionX`, `positionY` (number): 当前 PageView 内的位置。
- Validation rules: 仅桌面端放大镜开启且焦点有效时显示，位置保持在当前可视交集内，并标识实际取样区域；边长与镜头始终满足所选倍率关系。

## 6. MagnifierPersistentPreference

- Fields:
  - `sampleSize` (integer): 20–300 CSS px 任意整数，默认 80；实现映射到已有 `magnifierAreaSize` 设置。
  - `zoomLevel` (enum): `2x | 3x | 4x | 5x`，默认 `3x`；实现映射到已有 `magnifierZoom` 设置。
- Storage: 尺寸/倍率长期保存，同一浏览器、同一脚本安装下通过 GM 在 EH/EX/NH 共享；GM 不可用时降级为当前 origin 的 localStorage。
- Validation and migration: 合法共享值优先；缺失/无效项按决策第 3 节从本站合法旧偏好逐项补齐，所有来源均无合法值才使用默认值。整数与范围验证作用于保存和恢复路径；小数、越界数、非数值不能作为合法已存值。迁移幂等、GM 恢复及明确重置后的旧值防复活均遵循该节。
- Exclusions: `enabled`、`effectiveSampleSize`、`lensSize` 与显示位置不进入长期偏好。

## Relationships

- `PageViewInteractionContext` 1:1 `MagnifierState`（当前激活页）。
- `MagnifierSessionPreference` 1:N `MagnifierState`（同一页面会话的开关继承）。
- `MagnifierPersistentPreference` 1:N `MagnifierState`（跨页、跨会话恢复的尺寸/倍率）。
- `PageViewInteractionContext` 1:N `PageMenuActionItem`（每次菜单渲染动作集合）。
