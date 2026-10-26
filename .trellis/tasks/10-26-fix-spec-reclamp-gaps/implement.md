# 执行计划：补齐重钳制单向性、网格留白与跳转锁的规范记述

## 前置

```bash
cd /Users/warwick/claude/eHunter
python3 .trellis/scripts/task.py current   # 应为 10-26-fix-spec-reclamp-gaps 且 in_progress
```

按 `notify-complete` 技能在开始测试前播放短通知。

## 步骤 1：浏览器核实重钳制行为（先取证，再动笔）

先读 `.trellis/spec/frontend/browser-acceptance.md`，再起服务：

```bash
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort   # PID 写入 .tmp/vite-dev.pid
```

新增 `.tmp/round-reclamp-cycle.mjs`（desktop profile，`?pageTotal=120`，`timeoutMs 50000`，`page.cdp('Input.dispatchMouseEvent')` 发鼠标事件避免慢速 `page.mouse.move`）：

1. `prepare-ui`：清 `ehunter:reader:prefs:mode-layout`、`ehunter:reader:prefs:unified-settings`（注入脚本在首次 `goto` 后 `Page.removeScriptToEvaluateOnNewDocument` 移除），点 `#ehunter-switch`，`dismissNotice()`。
2. `widen-to-max`：把分界线拖到 520，记 `{side, main, stored}`。
3. `narrow-to-390`：`Emulation.setDeviceMetricsOverride({width:390,height:844,deviceScaleFactor:1,mobile:false})`，记 `{side, main, stored}`。
4. `widen-back-to-1200`：改回 1200×900，记 `{side, main, stored}`。
5. `reload-and-measure`：`page.reload()` + 重新点开阅读器，记 `{side, main, stored}`。
6. 顶层 `await check.screenshot('reclamp-cycle.png')`。

预期（需实测确认）：步骤 3 侧栏被钳到 156；步骤 4 侧栏**仍为 156**（单向）；步骤 5 重载后回到 520。

```bash
python3 scripts/acceptance.py verify-browser <artifactDir>
```

## 步骤 2：写入 R1（重钳制语义）

文件：`.trellis/spec/frontend/features/001-dockable-panel-layout/data-model.md`，`SplitBoundary` 校验规则段，在已有的「Clamps MUST be re-applied whenever viewport changes」之后补一条。

要写清三件事：只收不放、`reclampThumbSizes` 不写持久化、重载按当时视口再钳制。措辞以步骤 1 实测为准。

## 步骤 3：写入 R2（网格形态）

文件：`.trellis/spec/frontend/features/001-thumb-expand-modal/spec.md`。

- `FR-004` 后补一句：两类视口的轨道宽度都以 `120px` 为上限，`justify-content: start`，剩余空间留在右侧，不拉伸项宽。
- Assumptions 补一条：宽视口下 5×120 + 4×12 的网格宽度小于面板宽度属预期，不要在验收里把右侧留白判成布局缺陷。

## 步骤 4：写入 R3（跳转锁决策）

新建 `.trellis/spec/frontend/decisions/2026-10-26-jump-scroll-lock.md`，按 `2026-09-18-reader-behavior.md` 的体例写：确认日期、适用范围、使用规则、决策正文、完成标准。

正文需覆盖：问题（页高小于视口时滚动进度按视口底部反算，跳转后会多一页）、三个备选方案（锁定目标页 / 改全局判定为视口顶部页 / 只记录不修）与取舍理由、释放条件（`wheel`、`touchstart`）、已知不释放路径（键盘翻页、滚动条拖拽、程序化 `scrollBy`）。

并在 `001-thumb-expand-modal/spec.md` 的 Assumptions 那条后面加一句指向该决策文档的相对链接。

## 步骤 5：验收与收口

```bash
npm run check:docs
git status --short          # 确认 core/ src/ tests/ 无改动
python3 scripts/acceptance.py summarize .trellis/tasks/10-26-fix-spec-reclamp-gaps
```

回填 `acceptance.json`（5 条 check）与 `validation.md`，停掉 Vite，`task.py finish`，提交（`docs(spec): ...`），归档（`task.py extend-scope` 加 `spec ".trellis/spec/**"`，`--skip-branch-validation`）。

## 回滚点

- 仅文档改动，任一文件回退用 `git checkout -- <path>`。
- 浏览器轮失败时保留产物目录，不回退文档。

## 说明

- 归档任务目录（`.trellis/tasks/archive/`）不改。
- 本轮不新增测试，`layout-model.test.cjs` 的 7 条断言已覆盖数值逻辑；单向性属于运行时行为，由步骤 1 的浏览器证据承担。
