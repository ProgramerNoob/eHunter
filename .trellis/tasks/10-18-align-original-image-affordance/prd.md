# 收口加载原图的能力判断与禁用语义

## 背景

- `core/components/PageView.vue:28` 顶栏“原图”按钮用 `albumService.isSupportOriginImg()`；`:204` 菜单“原图”的 `loadOriginalEnabled` 用 `albumService.isSupportImgChangeSource()`。三个平台（EH/NH/TEST）当前两个方法返回值一致，但语义分叉：一个是原图能力，一个是换源能力。
- 菜单按钮禁用只靠 `.disabled` class 与 `loadOriginalFromMenu()` 的函数 guard，没有原生 `disabled` 属性；NH 下按钮仍可聚焦，点击事件也仍会派发后被 guard 拦截。

## 需求

- 菜单“原图”的可用性改用 `albumService.isSupportOriginImg()`，与顶栏“原图”按钮同源。
- 菜单按钮增加原生 `:disabled="!loadOriginalEnabled"`；保留现有 `.disabled` class、`title`、`<small>` 原因和函数 guard。
- `isSupportImgChangeSource()` 继续用于换源刷新、下载与图片加载器路径，不改平台实现。

## 非目标

- 不改 EH/NH/TEST 平台的能力判断实现或 `AlbumService` 接口。
- 不改菜单其他项、顶栏按钮或换源刷新行为。

## 接受标准

- [AC1] `npm run check` 退出 0，包含 type-check、单测、生产构建与文档检查。
- [AC2] TEST 桌面卷轴页打开菜单：“原图”启用、无 `title`、无原因小字；点击触发原图加载并关闭菜单。
- [AC3] NH 生产包菜单：“原图”带原生 `disabled` 属性与原因提示，键盘不可聚焦，点击不触发加载。
- [AC4] 菜单能力判断引用 `isSupportOriginImg()`；`isSupportImgChangeSource()` 不再出现在菜单可用性判断中。

## 风险与回滚

单文件模板/计算属性改动；NH 下按钮由“可聚焦但被 guard 拦截”变为原生禁用，属预期可访问性改进。回滚即恢复 `isSupportImgChangeSource()` 并移除 `:disabled`。
