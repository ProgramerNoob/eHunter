# NH 移动视口验收补跑

## 背景

`.tmp/test-reports/reader-test-nh-20261017-140534.md` 的移动视口轮次未执行，未覆盖范围记为「移动视口（690×1044，`isMobile` + `hasTouch`）」。`scripts/browser-preflight.mjs` 只接受固定 `desktop`（1200×900）与 `mobile`（390×844、DPR 3、isMobile + hasTouch）两个 profile，690×1044 不属于严格预检覆盖范围。

## 目标

按 `.pi/skills/reader-test/SKILL.md`（`platform: nh`）在真实 NH gallery 上补跑移动视口验收，产出可逐项回填 `acceptance.json` 的证据。

## 需求

1. 严格轮：固定 `mobile` profile 走 `withBrowserPreflight`，覆盖首屏（标题、总页数、当前页）、书页/卷轴切换、翻页、缩略图跳转、设置面板、缓存行为、关闭与重开。
2. 补充轮：690×1044 + `isMobile` + `hasTouch`，不使用固定 profile 预检，显式记录下发与回读的实际 CDP 参数、`innerWidth`/`innerHeight`，取首屏与阅读模式的截图和观察。
3. 证据：每轮新的绝对产物目录，位于 `.tmp/reader-test-nh/`；报告写入 `.tmp/test-reports/reader-test-nh-<timestamp>.md`。
4. `origin-img` 按 NH 能力记 N/A。

## 约束

- 不改产品代码；发现缺陷只记录并留作后续任务。
- 一轮验收尽量在单次加载会话内完成；遇 429 先冷却并归因到准备阻塞。
- 不清空用户缓存与存储；保留用户已有页面和服务。

## 接受标准

- [AC1] 严格轮 `result.json` 为 `observed: "passed"`、`errors: []`，`python3 scripts/acceptance.py verify-browser <artifact-dir>` 返回 `passed`。
- [AC2] 690×1044 轮次记录实际视口回读、CDP 参数与截图，报告中注明不属于固定 profile 覆盖。
- [AC3] 功能项逐项回填 `.trellis/tasks/10-18-nh-mobile-acceptance/acceptance.json`，`failed`/`blocked`/`N/A`/`unrun` 显式区分。
- [AC4] 报告包含实际 URL、profile、控制台来源归因、截图路径与未验证范围。
- [AC5] 本轮 server 停止、端口释放、`cleanup-browser` 报告生成。
