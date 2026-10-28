# 实施清单

## 1. 模型层（`core/model/settingsNavigation.ts`）

- `resolveActiveSettingsCategory` 参数与返回值改用 `SettingsCategory['id']`，空列表返回 `null`。
- `SettingsSectionOffset` 的 `id` 改为 `SettingsCategory['id']`。
- 新增末组可达性判定：只有 `last.offsetTop > scrollMax` 时才在 `scrollTop >= scrollMax - 1` 走「点亮最后一组」分支。

## 2. 组件层（`core/components/MoreSettingsDialog.vue`）

- 删除 `generalRef` / `scrollRef` / `bookRef` / `quickRef` / `shortcutsRef` / `otherRef` 六个 `ref` 声明与模板上的 `ref="…Ref"`。
- 删除 `getCategoryRef`。
- `categorySections(content)` 改为遍历 `content.querySelectorAll<HTMLElement>('.ehunter-group[data-category]')`，用 `elem.offsetTop - content.offsetTop + content.scrollTop` 计算相对内容起点的偏移。
- `scrollToCategory(category: SettingsCategory['id'])`：先设高亮，再在 `categorySections` 结果里找目标；找不到直接返回（不再 `?? 0`）。
- `onContentScroll()`：套用 `null` 返回值，不再 `as any`。

## 3. 测试（`tests/settings-navigation.test.cjs`）

- 删除文件里的注释行。
- 分组偏移与 `SCROLL_MAX` 换成不含注释的常量；「末组不可达」改成用参数化布局表达：一组 `reachable` 断言按位置判定，一组 `unreachable` 断言走边界分支。

## 4. 验证

```bash
npm run test:settings-navigation
npm run type-check
npm run check
```

浏览器回归（Vite 5173 + ego-browser，desktop 1200×900 / mobile 390×844）：

```bash
ego-browser nodejs < .tmp/round-modal-catjump-fix.mjs > .tmp/rerun-catjump-fix.log 2>&1
python3 scripts/acceptance.py verify-browser <artifactDir>
```

判定：六个分类点击后的 `scrollTop` 与 `active` 与 `8cef307` 回归记录一致（desktop 16/528/852/1553/2334/2836，mobile 12/529/852/1554/2335/2790），手动滚动高亮逐组正确，滚到底为「其他」。

## 回滚点

改动集中在 3 个文件，无数据迁移；回退即 `git revert`。回归失败时先比对 `.tmp/browser-preflight/catjump-fix-desktop-ac051502-…` 的 measurements。
