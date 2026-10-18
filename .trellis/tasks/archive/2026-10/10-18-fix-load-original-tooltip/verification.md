# 验证记录

## 变更

- `core/components/PageView.vue:75`：`:title="loadOriginalEnabled ? undefined : loadOriginalDisabledReason"`。
- 提交：`9cdf253 fix(core): 移除加载原图启用时的误导提示`；归档：`eec9e50 chore(task): archive 10-18-fix-load-original-tooltip`。

## 检查

- `npm run type-check` exit 0。
- `npm run check` exit 0（acceptance 单测、storage、browser-preflight、reader-lifecycle、build-prod、docs），日志 `.tmp/10-18-fix-load-original-tooltip/check.log`。
- 浏览器轮：TEST 平台 `http://127.0.0.1:5173`，desktop profile 1200×900 DPR1。
  - 产物目录 `.tmp/browser-preflight/tooltip-32224701-e06e-481d-b140-e0bb9ba611af/`。
  - `result.json` 的 phase receipts：
    - `menu`：`{"menuOpen":true,"buttonFound":true,"disabled":false,"hasTitle":false,"title":null,"hasSmall":false,"text":"原图"}`
    - `click-original`：`{"clicked":true,"menuOpen":false}`
  - 截图 `tooltip-enabled.png`。
  - `python3 scripts/acceptance.py verify-browser <artifact-dir>` exit 0，日志 `.tmp/10-18-fix-load-original-tooltip/verify-tooltip.log`。
- 清理：5173 已停止、端口释放（`.tmp/10-18-fix-load-original-tooltip/service-stop.txt`）；ego space 8 已 `finish`；`cleanup-browser` 报告 `clean`（`.tmp/cleanup-browser-tooltip.json`）。

## 未覆盖

- NH 的禁用分支未跑运行时轮：`isSupportImgChangeSource()` 为 false，`disabled`/`title`/`<small>` 绑定保持原逻辑；本次仅做代码路径核对。

## 已知观察（不在本任务范围）

- 顶栏原图按钮（`core/components/PageView.vue:28`）用 `isSupportOriginImg()`，菜单项（`core/components/PageView.vue:204`）用 `isSupportImgChangeSource()`，语义不同、当前三平台返回值一致。
- 禁用态由 class 控制而非 `disabled` 属性，NH 下按钮仍可聚焦，点击由 `loadOriginalFromMenu()` 的前置判断拦截。
