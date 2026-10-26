# 执行计划：去掉跳转锁文档的时长硬编码并补重钳制不写存储的守卫

## 前置

```bash
cd /Users/warwick/claude/eHunter
python3 .trellis/scripts/task.py start .trellis/tasks/10-27-fix-scroll-lock-doc-drift
```

本任务不涉及浏览器验收（无运行时行为改动），因此不需要起 Vite、不需要 `notify-complete` 的测试前短通知序列以外的准备；收尾仍按技能播放完成长通知。

## 步骤 1：确认代码里时长与采样间隔的符号

```bash
grep -n "animationTime\|scrollLockUntil" core/components/AlbumScrollView.vue
grep -n "setInterval(watchPosition" core/components/widget/AwesomeScrollView.vue
```

预期：`core/components/AlbumScrollView.vue:34` 为 `const animationTime = 800`，`:77` 为 `scrollLockUntil = Date.now() + animationTime + 200`，`core/components/widget/AwesomeScrollView.vue:83` 为 `setInterval(watchPosition, 50)`。

## 步骤 2：改决策文档（R1）

文件：`.trellis/spec/frontend/decisions/2026-10-26-jump-scroll-lock.md`

| 行 | 现状 | 改成 |
| --- | --- | --- |
| 11 | 「用 800ms 平滑滚动」「50ms 采样触发」 | 「用 `animationTime` 定义的平滑滚动」「按固定采样间隔轮询触发的进度反算」 |
| 23 | 「设为『动画时长 + 200ms 余量』」 | 「设为动画时长加一段余量（余量由代码内常量决定）」 |
| 30 | 「需等锁自然到期（默认约 1s）」 | 「需等锁自然到期」 |

改完 `grep -n "800\|50ms\|1s" 该文件` 应无输出。

## 步骤 3：加守卫测试（R2/R3）

文件：`tests/layout-model.test.cjs`，追加一条测试，复用同文件里 registry-order 测试的源码断言写法：

```js
test('layout: reclamping must not persist the clamped size', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '..', 'core/store/app.ts'), 'utf8');
    const start = source.indexOf('function reclampThumbSizes');
    assert.ok(start > 0, 'reclampThumbSizes must exist');
    const bodyEnd = source.indexOf('\n}', start);
    assert.ok(bodyEnd > start, 'reclampThumbSizes body must be found');
    const body = source.slice(start, bodyEnd);
    assert.ok(!body.includes('persistCurrentModeLayoutPreference'),
        'reclampThumbSizes must not persist the clamped size; the stored value keeps the user requested size');
});
```

注意：断言范围是**函数体**，不是整个 `app.ts`，因为文件里其它函数会合法调用 `persistCurrentModeLayoutPreference`。

## 步骤 4：验证守卫能失败（R4）

```bash
cp core/store/app.ts .tmp/app.ts.bak
# 在 reclampThumbSizes 的 store.thumbViewHeight = nextHeight 之后插入一行 persistCurrentModeLayoutPreference()
node --test tests/layout-model.test.cjs   # 预期 FAIL
cp .tmp/app.ts.bak core/store/app.ts
node --test tests/layout-model.test.cjs   # 预期 PASS
git status --short core/                  # 预期空
```

## 步骤 5：全量校验（AC4）

```bash
npm run test > .tmp/scroll-lock-doc-drift-test.log 2>&1; echo "test=$?"
npm run check:docs > .tmp/scroll-lock-doc-drift-docs.log 2>&1; echo "docs=$?"
```

## 步骤 6：回填与收口

回填 `acceptance.json`（4 条 check）与 `validation.md`，`task.py finish`，提交（`test(core)` + `docs(spec)` 合并为一条 `fix(core)` 或分开），归档（`task.py extend-scope` 加 `spec ".trellis/spec/**"`、`tests "tests/**"`，`--skip-branch-validation`，归档后手动 `git commit`，因为内部自动提交在本仓库已知会因 `docs/readme.md` 的索引对象问题失败）。

## 回滚点

- 文档：`git checkout -- .trellis/spec/frontend/decisions/2026-10-26-jump-scroll-lock.md`
- 测试：`git checkout -- tests/layout-model.test.cjs`
- 步骤 4 的临时注入必须还原，`git status --short core/` 为空才算完成。
