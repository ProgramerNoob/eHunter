# 修复更多设置弹窗分类跳转高亮与末组对齐

## Goal

修复 002-more-settings-modal 验收中发现的分类跳转缺陷：左侧分类点击后右侧高亮停留在上一组；最后一组「其他」永远无法对齐到组顶。

## 现象与实测

桌面 1200×900，`.ehunter-content` `scrollHeight 3525 / clientHeight 689 / scrollMax 2836`，`.ehunter-panel` 中 header 高 51px。

| 点击分类 | 点击后 scrollTop | 组顶相对内容起点 | 分组高亮应到 | 实际高亮 |
| --- | --- | --- | --- | --- |
| 通用 | 16 | 16 | 通用 | 通用 |
| 滚动模式 | 529 | 528 | 滚动模式 | 通用 |
| 书页模式 | 852 | 852 | 书页模式 | 滚动模式 |
| 快捷设置 | 1553 | 1553 | 快捷设置 | 书页模式 |
| 快捷键 | 2334 | 2334 | 快捷键 | 快捷设置 |
| 其他 | 2836（= scrollMax） | 3185 | 其他 | 快捷键 |

## Requirements

- R1 左侧分类点击后，右侧高亮必须落在被点击的分类上；滚动结束时高亮与内容位置一致。
- R2 最后一组「其他」在内容无法再滚动时，高亮必须为「其他」。
- R3 手动滚动内容（不点分类）时，高亮仍按当前可见分组更新，行为不倒退。
- R4 分类跳转仍为平滑滚动，不折叠其他分组（与 spec 2026-02-18 Clarifications 一致）。
- R5 判定逻辑抽为可测试的纯函数，单位覆盖两条缺陷的真实数值。
- R6 不改动其他弹窗行为（字段读写、快捷项拖拽、快捷键编辑、重置、语言切换）。

## Acceptance Criteria

- [AC1] 分类点击后高亮等于目标分类：通用/滚动模式/书页模式/快捷设置/快捷键/其他六项逐一命中。
- [AC2] 内容滚到底部时高亮为「其他」，即使「其他」组顶无法到达容器顶部。
- [AC3] 手动滚动内容到各组位置时，高亮按阈值切换，且组间不再出现「永远差一组」的偏移。
- [AC4] `npm run type-check` 与新增单元测试通过，`npm run check` 通过。

## Notes

- 缺陷来源：`core/components/MoreSettingsDialog.vue` 的 `onContentScroll()` 用 `item.elem.offsetTop`（相对 `.ehunter-panel`，含 51px header）与 `.ehunter-content` 的 `scrollTop` 直接比较。
- 末组缺陷来源：`.ehunter-content` 无底部余量，`scrollTop` 上限不足以让最后一组到达容器顶部。
