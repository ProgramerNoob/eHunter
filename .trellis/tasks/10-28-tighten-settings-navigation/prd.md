# 收敛分类跳转实现与类型契约

## Goal

按 code-review 对 `8cef307` 的结论整改更多设置弹窗的分类跳转实现：消除同一份分类信息的四份并存、去掉 `any` 类型逃逸、把滚动事件里的同步布局读取换成更廉价的属性读取，并清掉测试文件里的注释。

行为契约不变：点击分类后高亮落在被点击分类、内容滚到底时高亮为最后一组、手动滚动按可见分组更新高亮、平滑滚动保留。

## Background

`8cef307`（`10-28-fix-more-settings-category-jump`）修复了分类跳转的两处缺陷，但实现里留下了结构性债：

- 分类枚举存在于四处：`core/store/app.ts:242` 的 `settingsCategories`、`core/components/MoreSettingsDialog.vue:254-259` 的六个分组 ref、同文件 `getCategoryRef` 的六分支 switch、以及 `8cef307` 新增的 `categorySections` 六元素数组。新增一个分类要同步改四处。
- 模板里每个分组已有 `data-category` 属性（`MoreSettingsDialog.vue:21,51,81,111,165,208`），`categorySections` 完全可以从中派生。
- `scrollToCategory(category: any)` 与 `setActiveSettingsCategory(active as any)` 绕过了 `SettingsCategory['id']` 联合类型（`core/store/app.ts:146-149`）；`getCategoryRef` 在 `scrollToCategory` 里只剩非空判断作用，与 `categorySections` 构成同一分类的两套查找路径，ref 缺失时还会 `?? 0` 静默滚到顶部。
- `categorySections` 每次滚动做 1 次容器 `getBoundingClientRect` + 6 次分组 `getBoundingClientRect`，无节流。
- `tests/settings-navigation.test.cjs:15` 有一行解释偏移来源的注释，违反「代码不写注释」的仓库规则。
- 测试 `settings navigation: the last section wins at the scroll boundary` 把当前布局的「末组不可达」写死为前置断言，将来布局变化会让它误报。

## Requirements

- R1 `categorySections` 从 `.ehunter-content` 内的 `.ehunter-group[data-category]` 派生，按 DOM 顺序返回；`getCategoryRef` 与六个分组 ref 一并删除，模板里的 `ref="…Ref"` 同步移除。
- R2 `scrollToCategory` 只查一次目标分组；目标不存在时直接返回，不再 `?? 0` 兜底。
- R3 `resolveActiveSettingsCategory` 的分类 id 使用 `SettingsCategory['id']` 类型；空列表返回 `null`；`scrollToCategory` 与 `onContentScroll` 不出现 `any` 或 `as any`。
- R4 滚动路径改用 `offsetTop` 相对 `.ehunter-content` 定位，每个分组一次属性读取，不再对每组分做 `getBoundingClientRect`。
- R5 滚底强制点亮最后一组的规则改为条件化：仅当最后一组在最大滚动量下确实无法到达组顶时才生效；否则按位置判定。
- R6 清掉 `tests/settings-navigation.test.cjs` 里的注释；测试改用与实现无关的方式表达「末组不可达」。
- R7 不改其他弹窗行为，不改样式，不改 PRD 已确认的交互（平滑滚动、点击高亮、手动滚动跟随）。
- R8 `npm run check` 与桌面/移动两 profile 的分类跳转回归均通过。

## Acceptance Criteria

- [AC1] `core/components/MoreSettingsDialog.vue` 中不再出现 `getCategoryRef`、六个分组 `ref` 声明与模板 `ref="…Ref"`；`categorySections` 由 `querySelectorAll('.ehunter-group[data-category]')` 派生，新增分类只需在模板加一个分组。
- [AC2] `core/model/settingsNavigation.ts` 的 `resolveActiveSettingsCategory` 返回 `SettingsCategory['id'] | null`，空列表返回 `null`；`MoreSettingsDialog.vue` 两个调用点不再出现 `any`；`npm run type-check` 通过。
- [AC3] 滚动路径不再对每个分组调用 `getBoundingClientRect`；`resolveActiveSettingsCategory` 的单元测试覆盖「末组可达」「末组不可达」两种布局。
- [AC4] `tests/settings-navigation.test.cjs` 无注释；分类跳转在桌面 1200×900 与移动 390×844 两 profile 的 `verify-browser` 产物中均为 passed，数值与 `8cef307` 回归记录一致。
