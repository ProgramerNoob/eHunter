# 执行清单

1. 复现：在 1200×900 与 390×844 下点击六个分类，记录 `scrollTop`、组顶相对内容起点的偏移与高亮结果。
2. 抽纯函数：新增 `core/model/settingsNavigation.ts`，导出 `resolveActiveSettingsCategory(scrollTop, sections, scrollMax)` 与 `resolveSettingsCategoryScrollTop(targetOffsetTop, scrollMax)`。
3. 改 `core/components/MoreSettingsDialog.vue`：`categorySections()` 用 `getBoundingClientRect()` 相对内容区顶部换算各分组偏移，`scrollToCategory()` 与 `onContentScroll()` 都改用纯函数。
4. 单元测试：`tests/settings-navigation.test.cjs` 用实测偏移（16/528/852/1553/2334/3185）与 `scrollMax 2836` 覆盖「每次点击落到自己」「边界末组优先」「手动滚动不滞后」「末组不可达只在边界触发」「空列表与负数边界」。
5. `package.json` 增加 `test:settings-navigation` 并挂进 `test` 串联链。
6. 回归：`npm run type-check`、`npm run test:settings-navigation`、`npm run check`。
7. 浏览器回归：`.tmp/round-modal-catjump-fix.mjs` 在 desktop 与 mobile 两个 profile 各跑一轮，产物用 `python3 scripts/acceptance.py verify-browser` 校验。
8. 回填本任务的 `validation.md`，并回到 `10-25-more-settings-modal-acceptance` 继续其余 check。
