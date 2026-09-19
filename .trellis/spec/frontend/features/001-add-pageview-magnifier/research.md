<!-- migration-note:start -->
> 迁移来源：`specs/001-add-pageview-magnifier/research.md`（基线 `647ff26`）。正文保全，路径已重定位；命令与源码路径均从仓库根目录解释。
> 阅读顺序与状态：先读[功能索引](../index.md)及[已确认决策](../../decisions/2026-09-18-reader-behavior.md)；决策覆盖到的旧约定以决策为准。Draft、任务勾选、独立验收清单各自保留，不证明当前版本通过验收。
> 文中的 plan/research/tasks、原始 Input、日期及“本次/当前”描述均保留原记录时态；历史实现路径、代码示例、依赖版本和 `.tmp/` 证据不代表本轮已核实或可获取。迁移未执行产品验收，也未补造缺失产物。
<!-- migration-note:end -->

# Phase 0 Research - PageView Magnifier Menu

**历史研究保留（2026-09-18）**：下文原文作为演进记录保留。修改或验收时以 [已确认决策](../../decisions/2026-09-18-reader-behavior.md) 第 3、4 节及已同步的 [spec.md](spec.md) 为准；Decision 3、5 中冲突取舍已被决策替代，历史研究本身不构成实施或验收结果。

## Decision 1: Desktop-only magnifier activation scope

- Decision: 放大镜能力限定为桌面端（细指针设备）可用，移动端菜单不展示放大镜开关和倍率项。
- Rationale: 规格已澄清为桌面端专用；放大镜依赖鼠标焦点框与指针跟随，移动端会与滚动/长按手势冲突。
- Alternatives considered:
  - 移动端也支持放大镜（拒绝：交互冲突高，验收复杂度显著上升）
  - 移动端展示但提示不可用（拒绝：引入冗余噪音，不符合已确认范围）

## Decision 2: Long-press detection guardrails

- Decision: 移动端长按阈值固定 500ms；若按压位移超过 10px、触发滚动、抬起、取消事件或出现多指触控，则取消长按判定。
- Rationale: 500ms 为移动 Web 长按通用稳定阈值，可平衡误触与响应速度；明确取消条件可降低滚动场景误触。
- Alternatives considered:
  - 400ms（拒绝：误触风险更高）
  - 跟随系统默认时长（拒绝：设备差异会导致行为不可预测）

## Decision 3: Magnifier overlay placement and boundary strategy

> **已被决策替代（冲突部分）**：可用边界为 PageView∩viewport，受限时同步缩小取样与镜头、保持倍率；避焦点为优先级而非绝对限制。空间恢复即还原设定，见决策第 4 节。下文保留原取舍。

- Decision: 放大镜默认显示在鼠标右侧并保持不遮挡鼠标；当右侧超出 PageView 边界时切换到左侧，必要时进行容器内钳制；鼠标离开 PageView 即隐藏放大镜和焦点框。
- Rationale: 与规格要求一致，且该策略在边缘场景下可保持可见性与操作稳定性。
- Alternatives considered:
  - 始终钳制不翻侧（拒绝：边缘体验突兀，易贴边抖动）
  - 居中覆盖鼠标（拒绝：直接遮挡焦点，影响阅读）

## Decision 4: Unsupported "Load Original" menu behavior

- Decision: “加载原图”菜单项始终显示；平台支持换源刷新时可用，不支持时置灰禁用并提供不可用原因文案。
- Rationale: 用户已澄清选择保留禁用项；该方式在可发现性和能力透明度上优于直接隐藏。
- Alternatives considered:
  - 不支持时隐藏（拒绝：降低功能可发现性）
  - 点击后再提示不支持（拒绝：引入无效操作路径）

## Decision 5: Session-level magnifier state inheritance

> **已被决策替代（冲突部分）**：尺寸与倍率长期保存，按决策第 3 节共享、降级及迁移；仅开关属于当前页面会话，翻页/模式切换保留，刷新或新页面关闭。下文“不长期持久化”及其理由仅为历史原文。

- Decision: 在同一阅读会话内跨 PageView 继承放大镜开关状态与倍率，初始默认值为关闭 + 3x，不进行长期持久化。
- Rationale: 已在澄清中确认；可减少跨页重复操作，且满足“仅在当前会话有效”的范围约束。
- Alternatives considered:
  - 每页重置（拒绝：与澄清结果冲突）
  - 持久化到本地设置（拒绝：超出当前功能范围）

## Decision 6: Book mode central trigger zone definition

- Decision: 书页模式菜单触发区域完全复用现有“中间留白区”定义，不新增新的几何规则。
- Rationale: 已澄清选 C；复用既有规则可最大程度保证翻页机制行为保持。
- Alternatives considered:
  - 固定像素宽度中央区（拒绝：多尺寸适配风险）
  - 按比例重新定义中央区（拒绝：可能破坏现有翻页肌肉记忆）

## Decision 7: Validation baseline for delivery

- Decision: 交付验收必须覆盖 `npm run type-check`、`npm run dev`，并使用 `ego-browser` 在 1200x900 与 390x844 双视口完成关键交互与视觉检查。
- Rationale: Constitution Principle III 与 AGENTS.md 明确要求运行时验收；本功能包含强交互和视觉定位逻辑，需真实浏览器验证。
- Alternatives considered:
  - 仅类型检查（拒绝：无法覆盖运行时手势与边界行为）
  - 仅桌面端验收（拒绝：滚动模式移动端长按同属核心路径）
