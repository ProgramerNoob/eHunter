# 设计：补齐会话复盘提出的环境改进

## 边界

只改 `scripts/`、`tests/`、`package.json`、两份 Vite 配置与 `.trellis/spec/`。不碰 `core/`、`src/`、`.trellis/scripts/**`（Trellis 模板受 `.trellis/.template-hashes.json` 保护）。

## R1 `.tmp` 报告

`scripts/tmp-report.mjs`（Node 标准库）：
1. 遍历 `.trellis/**/acceptance.json`，收集 `checks[].evidence` 与 `execution.log` 里的 `.tmp/` 前缀路径。
2. 遍历 `.tmp/browser-preflight/*`，按目录聚合体积，标记被引用的轮次。
3. 输出未被引用的轮次数、体积、最大若干项；`--max-bytes` 默认 `3 GiB`，超阈值 exit 1。
4. 只读，不删除。

入口 `npm run tmp:report`，并串进 `test:acceptance` 之后不连锁（报告体积依赖本机状态，不能进 `check`）。

## R2 交互 helper

在 `scripts/browser-preflight.mjs` 追加**独立导出**（不经过 `guarded()`）：

- `dispatchMouse(page, { type, x, y })`：封装 `Input.dispatchMouseEvent`，`mousePressed/mouseReleased` 自动补 `button: 'left'`、`buttons`、`clickCount`。
- `clickAt(page, x, y, { settleMs })`：move → 短暂等待 → press → 释放，串行为真实点击；合成 `element.click()` 在弹窗遮挡下无效。
- `clickElement(page, selector, options)`：先 `scrollIntoView`，再读 rect 中心点走 `clickAt`。
- `dragBy(page, { from, to, steps, settleMs })`：CDP 逐点移动的长按拖拽。
- `dismissSimpleDialog(page, options)`：循环用真实点击关闭 `.simple-dialog` 的 `.operation-bar` 末尾按钮，直到数量为 0 或超轮数。
- `ensureTopBar(page)`、`ensureThumbPanel(page)`：分别处理 `.inner-content.hide` 与移动端缩略图默认隐藏。

不引入 `guarded`，因为这些 helper 是被 `check.phase()` 内部调用的原语；若进入单飞序列会立刻触发 `Protected browser actions must be awaited sequentially`。

测试 `tests/browser-interaction-helpers.test.mjs`：用最小假 page（记录 `cdp` 调用序列与 `evaluate` 返回值）断言事件顺序、坐标取整、`dismissSimpleDialog` 的重试次数与提前退出。

## R3 `acceptance.py validate`

在 `main()` 增加 `validate` 子命令，复用现有 `load()`（读 PRD criteria + acceptance.json）与 `validate(data, criteria, root)`，stdout 输出与 `summarize` 同形的单个 JSON 对象（`valid`/`task`/`checks`/`criteria`/`counts`/`observedStatus`），退出码 0 = 记录自洽、2 = 记录不自洽（与 `summarize` 的 2 同义）。不写盘、不执行 check、不移动任务目录。

## R4 验收指南瘦身

`browser-acceptance.md` 当前 33850 字节。拆出两节到 `browser-acceptance/` 子目录：

- `preflight-assertions.md`：现「4.5 预检断言覆盖清单」（含行号列表与未覆盖说明）。
- `resource-cleanup.md`：现「资源清理检查」。

主文档保留摘要与链接，锚点 `#45-预检断言覆盖清单`、`#资源清理检查` 改为指向新文件对应小节；`.pi/skills/reader-test/SKILL.md`、`.trellis/spec/tooling/index.md` 的链接同步更新。目标：主文件 < 32768 字节（`context_injection.max_file_bytes`，超过会被截断）；实际拆分后 25922 字节。

## R5 Sass 静音

`vite.config.ts` 与 `vite.config.prod.ts` 各加：

```ts
css: { preprocessorOptions: { scss: { silenceDeprecations: ['color-functions', 'global-builtin', 'import'] } } }
```

`sass` 1.97.3 支持该选项；不迁移 `@import` 与 `lighten()`。

## R6 pending-work 收口

改为三类入口：仍在排队的验收组（指向 `.trellis/tasks/` 下的任务目录）、已修复并归档的缺陷（指向归档路径）、平台注入记录缺失（指向对应任务）。不再逐条复述验收项。

## R7 归档兜底

`scripts/archive-fallback.sh <task-slug> [--dry-run]`：
1. 解析归档目标目录 `.trellis/tasks/archive/<YYYY-MM>/<slug>`（可用 `--dir` 覆盖）。
2. `--dry-run` 打印 `git status --short` 里落在 `.trellis/tasks/` 与任务 `meta.scope` 声明路径下的条目。
3. 实际执行时 `git add -- <paths>` + `git commit -m "chore(task): archive <slug>"`，不 `add -A`。

工具规范 `.trellis/spec/tooling/index.md` 增加「归档提交失败时的回退」小节，写明报错特征（`invalid object … for 'docs/readme.md'` / `无法创建树对象`）与命令。

## 回滚

逐项独立：删除新增脚本与 `package.json` 条目即可回退 R1–R3、R7；R4 把拆出的小节并回主文档；R5 删掉 `css.preprocessorOptions` 块；R6 还原 `pending-work.md`。
