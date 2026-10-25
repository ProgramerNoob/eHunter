# 移动端失败轮复核记录

对象：`10-25-mobile-reading-mode-entry` 归档任务遗留的那轮失败验收。

## 失败轮事实

- 产物目录 `.tmp/browser-preflight/settings-mode-mobile-dfa4f63b-a807-4870-a118-df102f00aec3`。
- `result.json`：`observed: failed`、`checks: failed`、`preparation: verified`；`startedAt 2026-10-25T11:09:14.681Z` → `endedAt 11:09:20.530Z`。
- 三条同样的错误：`ProductAssertion 下拉选项应展开`，`details {"options": [], "open": false}`，`phase open-mode-dropdown:after`。
- 该目录没有 `measurements.json`（断言在记录测量值之前就失败了），但保留了 `settings-dialog-mobile.png`。

## 性质：产品断言失败，不是准备失败

`preparation: verified` 说明登录态、视口、脚本身份、必需模块都已通过；失败发生在功能断言阶段。它与 NH 那轮 `PreflightBlocked: Original-site viewport baseline missing` 不是一类问题，不能用同一条解释覆盖。

## 原因

`core/components/widget/Popover.vue` 的根节点包在 `<Transition name="slide-fade">` 里，展开瞬间 `opacity` 仍为 0。失败轮在点击下拉、`page.evaluate(READ_OPTIONS)` 后立即取结果，拿到 `open: false`。

证据：

- `events.jsonl` 中 `open-mode-dropdown:before` 到 `open-mode-dropdown:after` 只跨约 0.4 秒（`11:09:19.869Z` → `11:09:20.277Z`），期间只有四次 `open-mode-dropdown:waiting`，没有任何等待可见性的循环。
- 脚本 `.tmp/10-25-mobile-reading-mode-entry/round-05-settings-mobile.mjs` 的修改时间是 `Oct 25 19:09:37 +0800`（= `11:09:37Z`），晚于失败轮结束（`11:09:20Z`）、早于通过轮开始（`11:09:37.180Z`）。两次运行之间脚本被改动。
- 改动内容正是第 244–256 行的 `page.waitForFunction`：找到通用分类里标签为「阅读模式」的行，并等待其 `.popover` 满足 `display !== 'none' && opacity > 0 && width > 0`。

## 复核结论

- 后续三轮（移动端重跑、EH 生产包、NH 生产包）都带着同一段等待逻辑，一次通过，没有再次出现该失败。
- 本轮复核时重跑 `verify-browser`，五份产物结果记录在 `.tmp/10-25-review-fix-settings-row-tests/verify-browser.json`：

| 产物 | 退出码 | 状态 |
| --- | --- | --- |
| `settings-mode-desktop-4322cb5e-6148-4733-854d-f98882020163` | 0 | passed |
| `settings-mode-mobile-dfa4f63b-a807-4870-a118-df102f00aec3` | 1 | blocked：`observed is 'failed'`、`checks is 'failed'`、`errors records 3 failure(s); first: '下拉选项应展开'` |
| `settings-mode-mobile-ed585613-200c-4ef7-8201-471166b8fa94` | 0 | passed |
| `.tmp/reader-test-eh/run-settings-mode-124f0992` | 0 | passed |
| `.tmp/reader-test-nh/run-settings-mode-ec8c68cd` | 0 | passed |

失败轮保持失败记录，不删除、不改写：它证明断言真的会在下拉未展开时变红，是这类断言有效性的反证。

## 该轮暴露的流程问题

归档任务的 `acceptance.json` 只登记了通过轮，没有交代失败轮与修复差异。本轮起，浏览器验收的说明要写清：哪几轮跑过、失败轮的原因与改动、失败轮产物是否保留。
