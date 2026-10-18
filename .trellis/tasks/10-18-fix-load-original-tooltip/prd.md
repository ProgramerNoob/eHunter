# 修复加载原图菜单项在支持平台的误导提示

## 背景

页面菜单的“原图”项在支持换源的平台（TEST、EH）可点击启用，但按钮 `title` 始终绑定 `loadOriginalDisabledReason`，悬停仍显示“当前平台不支持”，与实际能力矛盾。来源：10-18 放大镜验收的运行时观察。

## 需求

- 支持加载原图时，菜单项不渲染 `title`，也不显示原因小字。
- 不支持时，保持现有禁用态、`title` 与原因小字。
- 不改变平台能力判断、文案或菜单结构。

## 非目标

- 不改 `isSupportImgChangeSource` 的平台实现。
- 不调整“原图”点击行为或菜单其他项。

## 验收

- `npm run type-check` 退出 0。
- TEST 桌面卷轴页打开菜单：“原图”可点击，DOM 无 `title` 属性、无原因小字；点击后菜单关闭并触发原图加载逻辑。
- 代码路径核对：不支持分支仍由 `loadOriginalEnabled=false` 控制 `disabled`、`title`、`<small>`。

## 风险与回滚

单行模板绑定变更；回滚即恢复 `:title="loadOriginalDisabledReason"`。
